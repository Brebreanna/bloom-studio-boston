import "dotenv/config";
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import {
  emailConfigured,
  sendEmail,
  subscriptionConfirmationEmail,
  waitlistConfirmationEmail,
  newEventEmail,
  orderConfirmationEmail,
  inquiryConfirmationEmail,
  privateEventOwnerEmail,
  verifyEmailTransport,
} from "./emailService.js";
import {
  listProducts,
  productById,
  productBySlug,
  createCart,
  cartItems,
  cartExists,
  upsertCartProduct,
  upsertCartWorkshop,
  updateCartItem,
  deleteCartItem,
  clearCart,
  signupUser,
  userByEmail,
  userById,
  createAuthSession,
  userByToken,
  deleteAuthSession,
  addInquiry,
  subscribeNewsletter,
  subscribeEvents,
  activeEventSubscribers,
  listComingSoonEvents,
  comingSoonEventById,
  joinWaitlist,
  membershipInterest,
  healthcheck,
  listWorkshopSessions,
  sessionById,
  createWorkshopSession,
  updateWorkshopSession,
  cancelWorkshopSession,
  settingByKey,
  upsertSetting,
  workshopContentOverrides,
  upsertWorkshopContent,
  listPromoCodes,
  promoByCode,
  savePromoCode,
  disablePromoCode,
  listMembershipPlans,
  membershipForUser,
  activateMembershipForUser,
  createCreditReservation,
  finalizePaidCart,
  orderHistoryForUser,
  beginWebhookEvent,
  markWebhookEventProcessed,
  syncMembershipFromSquare,
} from "./db/store.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;
const DATA_DIR = path.join(__dirname, "data");

const PATHS = {
  workshops: path.join(DATA_DIR, "workshops.json"),
  business: path.join(DATA_DIR, "business.json"),
  membership: path.join(DATA_DIR, "membership.json"),
  policies: path.join(DATA_DIR, "policies.json"),
};



const squareEnvironment = () =>
  String(process.env.SQUARE_ENVIRONMENT || "production").toLowerCase() === "production"
    ? "production"
    : "sandbox";

const squareApiBase = () =>
  squareEnvironment() === "production"
    ? "https://connect.squareup.com"
    : "https://connect.squareupsandbox.com";

const squareWebSdkUrl = () =>
  squareEnvironment() === "production"
    ? "https://web.squarecdn.com/v1/square.js"
    : "https://sandbox.web.squarecdn.com/v1/square.js";

const requireSquareConfig = () => {
  const applicationId = String(process.env.SQUARE_APPLICATION_ID || "").trim();
  const accessToken = String(process.env.SQUARE_ACCESS_TOKEN || "").trim();
  const locationId = String(process.env.SQUARE_LOCATION_ID || "").trim();

  if (!applicationId || !accessToken || !locationId) {
    throw Object.assign(
      new Error("Secure checkout is temporarily unavailable. Please contact Bloom Studio if you need help completing your purchase."),
      { status: 503 }
    );
  }
  return { applicationId, accessToken, locationId };
};

const createSquarePayment = async ({ sourceId, amountCents, locationId, accessToken, referenceId }) => {
  const response = await fetch(`${squareApiBase()}/v2/payments`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Square-Version": "2026-09-16",
    },
    body: JSON.stringify({
      source_id: sourceId,
      idempotency_key: crypto.randomUUID(),
      amount_money: {
        amount: amountCents,
        currency: "USD",
      },
      autocomplete: true,
      location_id: locationId,
      reference_id: referenceId,
      note: `Bloom Studio Boston cart ${referenceId}`,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.payment) {
    const detail = payload?.errors?.map((error) => error.detail || error.code).filter(Boolean).join(" ");
    throw Object.assign(
      new Error(detail || "Square could not process that payment."),
      { status: response.status >= 400 && response.status < 500 ? 400 : 502 }
    );
  }
  return payload.payment;
};



const refundSquarePayment = async ({ paymentId, amountCents, accessToken }) => {
  const response = await fetch(`${squareApiBase()}/v2/refunds`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", "Square-Version": "2026-09-16" },
    body: JSON.stringify({ idempotency_key: crypto.randomUUID(), payment_id: paymentId, amount_money: { amount: amountCents, currency: "USD" }, reason: "Bloom Studio order could not be finalized" }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.errors?.map((e) => e.detail || e.code).join(" ") || "Square refund failed.");
  return payload.refund;
};

const membershipVariationEnvKey = (planKey, billingInterval) =>
  `SQUARE_MEMBERSHIP_${String(planKey).replace(/[^a-z0-9]/gi, "_").toUpperCase()}_${String(billingInterval).toUpperCase()}_ID`;

const membershipVariationMap = () => {
  const pairs = [
    ["petal","monthly"],["petal","annual"],
    ["bloom","monthly"],["bloom","annual"],
    ["full-bloom","monthly"],["full-bloom","annual"],
  ];
  return Object.fromEntries(pairs.map(([planKey,billingInterval]) => {
    const id = String(process.env[membershipVariationEnvKey(planKey,billingInterval)] || "").trim();
    return [id, { planKey, billingInterval }];
  }).filter(([id]) => id));
};

const createMembershipCheckoutLink = async ({ email, plan, billingInterval }) => {
  const { accessToken, locationId } = requireSquareConfig();
  const variationId = String(process.env[membershipVariationEnvKey(plan.key,billingInterval)] || "").trim();
  if (!variationId) throw Object.assign(new Error("This membership option is not available for checkout right now."), { status: 503 });
  const amount = Math.round(Number(billingInterval === "annual" ? plan.annualPrice : plan.monthlyPrice) * 100);
  const siteUrl = String(process.env.SITE_URL || "http://localhost:5173").replace(/\/$/, "");
  const response = await fetch(`${squareApiBase()}/v2/online-checkout/payment-links`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", "Square-Version": "2026-09-16" },
    body: JSON.stringify({
      idempotency_key: crypto.randomUUID(),
      description: `Bloom Club ${plan.name} ${billingInterval}`,
      quick_pay: { name: `Bloom Club — ${plan.name} (${billingInterval})`, price_money: { amount, currency: "USD" }, location_id: locationId },
      checkout_options: {
        subscription_plan_id: variationId,
        redirect_url: `${siteUrl}/membership?joined=1`,
        merchant_support_email: "Contact@bloomstudioboston.com",
      },
      pre_populated_data: { buyer_email: email },
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.payment_link?.url) {
    const detail = payload?.errors?.map((error) => error.detail || error.code).filter(Boolean).join(" ");
    throw Object.assign(new Error(detail || "Membership checkout could not be started."), { status: 502 });
  }
  return payload.payment_link.url;
};

const squareWebhookIsValid = (signature, rawBody) => {
  const key = String(process.env.SQUARE_WEBHOOK_SIGNATURE_KEY || "");
  const url = String(process.env.SQUARE_WEBHOOK_URL || "");
  if (!key || !url || !signature) return false;
  const expected = crypto.createHmac("sha256", key).update(url + rawBody).digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

const squareCustomerEmail = async (customerId) => {
  const { accessToken } = requireSquareConfig();
  const response = await fetch(`${squareApiBase()}/v2/customers/${customerId}`, { headers: { Authorization: `Bearer ${accessToken}`, "Square-Version": "2026-09-16" } });
  const payload = await response.json().catch(() => ({}));
  return String(payload?.customer?.email_address || "").trim().toLowerCase();
};

const allowedOrigin = process.env.CORS_ORIGIN || process.env.SITE_URL || "http://localhost:5173";
app.use(cors({ origin: allowedOrigin, credentials: true }));

app.post("/api/square/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const rawBody = req.body.toString("utf8");
  const signature = req.headers["x-square-hmacsha256-signature"];
  if (!squareWebhookIsValid(signature, rawBody)) return res.status(403).send("Invalid signature");
  let event;
  try { event = JSON.parse(rawBody); } catch { return res.status(400).send("Invalid payload"); }
  try {
    const isNew = await beginWebhookEvent({ id: event.event_id, provider: "square", eventType: event.type, payload: event });
    if (!isNew) return res.sendStatus(200);
    if (event.type === "subscription.created" || event.type === "subscription.updated") {
      const subscription = event?.data?.object?.subscription;
      if (subscription?.id && subscription?.customer_id && subscription?.plan_variation_id) {
        const planInfo = membershipVariationMap()[subscription.plan_variation_id];
        if (planInfo) {
          const email = await squareCustomerEmail(subscription.customer_id);
          if (email) {
            const statusMap = { ACTIVE:"active", PAUSED:"paused", CANCELED:"cancelled", DEACTIVATED:"past_due", PENDING:"inactive" };
            await syncMembershipFromSquare({ email, squareCustomerId: subscription.customer_id, squareSubscriptionId: subscription.id, planKey: planInfo.planKey, billingInterval: planInfo.billingInterval, status: statusMap[subscription.status] || "inactive" });
          }
        }
      }
    }
    await markWebhookEventProcessed(event.event_id);
    return res.sendStatus(200);
  } catch (error) {
    console.error("Square webhook processing failed", error);
    return res.sendStatus(500);
  }
});

app.use(express.json());

const readJSON = (file, fallback) => {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
};


const getWorkshopDefinitions = () => readJSON(PATHS.workshops, []);

const getWorkshopDefinitionsWithOverrides = async () => {
  const definitions = getWorkshopDefinitions();
  const overrides = await workshopContentOverrides();
  return definitions.map((definition) => ({
    ...definition,
    ...(overrides[definition.id] || {}),
  }));
};

const sessionStartsAt = (session) =>
  new Date(`${session.date}T${session.startTime || "00:00"}:00`);

const sessionEndsAt = (session) =>
  session.endTime
    ? new Date(`${session.date}T${session.endTime}:00`)
    : sessionStartsAt(session);

const hydrateWorkshopsFromDb = async ({ includeCancelled = false } = {}) => {
  const definitions = await getWorkshopDefinitionsWithOverrides();
  const sessions = await listWorkshopSessions({ includeCancelled });

  return definitions.map((definition) => {
    const workshopSessions = sessions
      .filter((session) => session.workshopId === definition.id)
      .map((session) => ({
        ...session,
        startsAt: sessionStartsAt(session).toISOString(),
        endsAt: sessionEndsAt(session).toISOString(),
      }))
      .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));

    return {
      ...definition,
      price: workshopSessions[0]?.price ?? definition.price,
      sessions: workshopSessions,
    };
  });
};

const getWorkshopById = async (id, options = {}) =>
  (await hydrateWorkshopsFromDb(options)).find((workshop) => workshop.id === id);

const promoIsUsable = (promo) => {
  if (!promo?.active) return false;
  const now = Date.now();
  if (promo.startsAt && new Date(promo.startsAt).getTime() > now) return false;
  if (promo.endsAt && new Date(promo.endsAt).getTime() < now) return false;
  if (promo.maxUses != null && promo.uses >= promo.maxUses) return false;
  return true;
};

const discountForLine = ({ lineSubtotal, itemType, membership, promo, fixedRemaining }) => {
  let membershipDiscount = 0;
  if (membership?.discountPercent > 0) {
    const eligible = membership.discountScope === "all" ||
      (membership.discountScope === "workshops" && itemType === "workshop");
    if (eligible) membershipDiscount = lineSubtotal * (membership.discountPercent / 100);
  }

  let promoDiscount = 0;
  if (promo && promoIsUsable(promo)) {
    const eligible = promo.appliesTo === "all" ||
      (promo.appliesTo === "workshops" && itemType === "workshop") ||
      (promo.appliesTo === "products" && itemType === "product");
    if (eligible) {
      promoDiscount = promo.discountType === "percent"
        ? lineSubtotal * (promo.amount / 100)
        : Math.min(lineSubtotal, fixedRemaining.value);
    }
  }

  // Vicky did not specify stacking. Use the best single eligible discount.
  if (promoDiscount > membershipDiscount && promo?.discountType === "fixed") {
    fixedRemaining.value = Math.max(0, fixedRemaining.value - promoDiscount);
  }
  return Math.max(membershipDiscount, promoDiscount);
};

const hydrateCart = async (cartId, { user = null, promoCode = "" } = {}) => {
  const rawItems = await cartItems(cartId);
  const workshops = await hydrateWorkshopsFromDb();
  const products = await listProducts();
  const taxes = await settingByKey("taxes") || { productTaxRate: 0.0625, workshopTaxRate: 0 };
  const membership = user ? await membershipForUser(user.id, user.email) : null;
  const promo = promoCode ? await promoByCode(promoCode) : null;
  const validPromo = promo && promoIsUsable(promo) ? promo : null;
  const fixedRemaining = { value: validPromo?.discountType === "fixed" ? Number(validPromo.amount || 0) : 0 };

  const items = rawItems.map((item) => {
    const quantity = Math.max(1, Number(item.quantity) || 1);
    let base;

    if (item.item_type === "product") {
      const product = products.find((p) => p.id === item.product_id);
      if (!product) return null;
      base = {
        id: item.id,
        itemType: "product",
        productId: product.id,
        slug: product.slug,
        title: product.title,
        image: product.image,
        unitPrice: product.price,
        quantity,
        stock: product.stock,
        category: product.category,
      };
    } else {
      const workshop = workshops.find((w) => w.id === item.workshop_id);
      const session = workshop?.sessions.find((ss) => ss.id === item.session_id);
      if (!workshop || !session) return null;
      base = {
        id: item.id,
        itemType: "workshop",
        workshopId: workshop.id,
        slug: workshop.slug,
        title: workshop.title,
        image: workshop.image,
        unitPrice: session.price ?? workshop.price,
        quantity,
        session,
      };
    }

    const lineSubtotal = Number(base.unitPrice) * quantity;
    const discount = discountForLine({ lineSubtotal, itemType: base.itemType, membership, promo: validPromo, fixedRemaining });
    const discountedLine = Math.max(0, lineSubtotal - discount);
    const taxRate = base.itemType === "product"
      ? Number(taxes.productTaxRate || 0)
      : Number(taxes.workshopTaxRate || 0);
    const tax = discountedLine * taxRate;

    return {
      ...base,
      lineSubtotal,
      discount,
      lineTotal: discountedLine,
      tax,
      taxRate,
    };
  }).filter(Boolean);

  const subtotal = items.reduce((sum, item) => sum + item.lineSubtotal, 0);
  const discount = items.reduce((sum, item) => sum + item.discount, 0);
  const tax = items.reduce((sum, item) => sum + item.tax, 0);
  return {
    id: cartId,
    items,
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal,
    discount,
    tax,
    total: Math.max(0, subtotal - discount + tax),
    promo: validPromo,
    promoRejected: promoCode && !validPromo ? "That promotion code is not currently valid." : null,
    membership,
    taxSettings: taxes,
  };
};
const hashPassword = (password, salt = crypto.randomBytes(16).toString("hex")) => {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
};

const verifyPassword = (password, user) => {
  const hash = crypto.scryptSync(password, user.password_salt, 64).toString("hex");
  return crypto.timingSafeEqual(
    Buffer.from(hash, "hex"),
    Buffer.from(user.password_hash, "hex")
  );
};

const isAdminUser = (user) => Boolean(user?.is_admin);

const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  isAdmin: isAdminUser(user),
  createdAt: user.created_at,
});

const getBearerToken = (req) => {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7) : null;
};

const currentUserFromRequest = async (req) => {
  const token = getBearerToken(req);
  if (!token) return null;
  return userByToken(token);
};

const requireUser = async (req, res, next) => {
  try {
    const user = await currentUserFromRequest(req);
    if (!user) return res.status(401).json({ error: "Please sign in first." });
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};


const requireAdmin = async (req, res, next) => {
  try {
    const user = await currentUserFromRequest(req);
    if (!user) return res.status(401).json({ error: "Please sign in first." });
    if (!isAdminUser(user)) {
      return res.status(403).json({ error: "Admin access is required." });
    }
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

app.post("/api/auth/signup", async (req, res, next) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!name || !email || !email.includes("@") || password.length < 8) {
      return res.status(400).json({
        error: "Enter a name, valid email, and password with at least 8 characters.",
      });
    }

    if (await userByEmail(email)) {
      return res.status(409).json({ error: "An account with that email already exists." });
    }

    const { salt, hash } = hashPassword(password);
    const user = await signupUser({
      name, email, passwordSalt: salt, passwordHash: hash
    });
    const token = await createAuthSession(user.id);
    res.status(201).json({ token, user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/login", async (req, res, next) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const user = await userByEmail(email);

    if (!user || !verifyPassword(password, user)) {
      return res.status(401).json({ error: "Email or password is incorrect." });
    }

    const token = await createAuthSession(user.id);
    res.json({ token, user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/auth/me", requireUser, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

app.post("/api/auth/logout", async (req, res, next) => {
  try {
    const token = getBearerToken(req);
    if (token) await deleteAuthSession(token);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.get("/api/membership", async (_req, res, next) => {
  try {
    const config = await settingByKey("membership") || readJSON(PATHS.membership, {});
    const plans = await listMembershipPlans();
    res.json({ ...config, plans });
  } catch (error) { next(error); }
});

app.post("/api/membership/checkout", async (req, res, next) => {
  try {
    const user = await currentUserFromRequest(req);
    const email = String(user?.email || req.body.email || "").trim().toLowerCase();
    const planKey = String(req.body.planKey || "");
    const billingInterval = req.body.billingInterval === "annual" ? "annual" : "monthly";
    if (!email || !email.includes("@")) return res.status(400).json({ error: "A valid email is required." });
    const plans = await listMembershipPlans();
    const plan = plans.find((item) => item.key === planKey);
    if (!plan) return res.status(404).json({ error: "Membership plan not found." });
    const url = await createMembershipCheckoutLink({ email, plan, billingInterval });
    res.json({ ok: true, url });
  } catch (error) { next(error); }
});

app.get("/api/membership/me", requireUser, async (req, res, next) => {
  try {
    res.json({ membership: await membershipForUser(req.user.id, req.user.email) });
  } catch (error) { next(error); }
});

app.get("/api/account/orders", requireUser, async (req, res, next) => {
  try { res.json({ orders: await orderHistoryForUser(req.user.id) }); }
  catch (error) { next(error); }
});

app.post("/api/member/reservations", requireUser, async (req, res, next) => {
  try {
    const { workshopId, sessionId, seats = 1, useFriendPass = false } = req.body;
    const quantity = Math.max(1, Math.floor(Number(seats) || 1));
    const bookingId = await createCreditReservation({
      userId: req.user.id,
      email: req.user.email,
      name: req.user.name,
      workshopId,
      sessionId,
      seats: quantity,
      useFriendPass: Boolean(useFriendPass),
    });
    res.status(201).json({ ok: true, bookingId, message: "Your Bloom Club reservation is confirmed." });
  } catch (error) { next(error); }
});

app.get("/api/policies", async (_req, res, next) => {
  try {
    res.json(await settingByKey("policies") || readJSON(PATHS.policies, {}));
  } catch (error) { next(error); }
});

// Health
app.get("/api/health", async (_req, res, next) => {
  try {
    const databaseTime = await healthcheck();
    res.json({ ok: true, service: "Bloom Studio API", database: "connected", databaseTime });
  } catch (error) {
    next(error);
  }
});

// Business / owner / map
app.get("/api/business", async (_req, res, next) => {
  try {
    res.json(await settingByKey("business") || readJSON(PATHS.business, {}));
  } catch (error) { next(error); }
});

// Workshops + live sessions stored in PostgreSQL
app.get("/api/workshops", async (_req, res, next) => {
  try {
    res.json(await hydrateWorkshopsFromDb());
  } catch (error) {
    next(error);
  }
});

app.get("/api/workshops/:slug", async (req, res, next) => {
  try {
    const workshop = (await hydrateWorkshopsFromDb())
      .find((w) => w.slug === req.params.slug);
    if (!workshop) return res.status(404).json({ error: "Workshop not found" });
    res.json(workshop);
  } catch (error) {
    next(error);
  }
});


// Admin content/settings
app.get("/api/admin/settings/:key", requireAdmin, async (req, res, next) => {
  try {
    const allowed = ["business", "policies", "membership", "taxes"];
    if (!allowed.includes(req.params.key)) return res.status(404).json({ error: "Unknown setting." });
    const fallback = req.params.key === "business" ? readJSON(PATHS.business, {})
      : req.params.key === "policies" ? readJSON(PATHS.policies, {})
      : req.params.key === "membership" ? readJSON(PATHS.membership, {}) : {};
    res.json(await settingByKey(req.params.key) || fallback);
  } catch (error) { next(error); }
});

app.put("/api/admin/settings/:key", requireAdmin, async (req, res, next) => {
  try {
    const allowed = ["business", "policies", "membership", "taxes"];
    if (!allowed.includes(req.params.key)) return res.status(404).json({ error: "Unknown setting." });
    res.json(await upsertSetting(req.params.key, req.body || {}));
  } catch (error) { next(error); }
});

app.get("/api/admin/workshop-content", requireAdmin, async (_req, res, next) => {
  try { res.json(await hydrateWorkshopsFromDb({ includeCancelled: true })); }
  catch (error) { next(error); }
});

app.put("/api/admin/workshop-content/:id", requireAdmin, async (req, res, next) => {
  try {
    const base = getWorkshopDefinitions().find((w) => w.id === req.params.id);
    if (!base) return res.status(404).json({ error: "Workshop not found." });
    const allowed = ["title","category","image","gallery","description","provided","skill","duration","location"];
    const content = Object.fromEntries(Object.entries(req.body || {}).filter(([key]) => allowed.includes(key)));
    res.json(await upsertWorkshopContent(req.params.id, content));
  } catch (error) { next(error); }
});

app.get("/api/admin/promos", requireAdmin, async (_req, res, next) => {
  try { res.json(await listPromoCodes()); } catch (error) { next(error); }
});

app.post("/api/admin/promos", requireAdmin, async (req, res, next) => {
  try {
    if (!req.body.code || Number(req.body.amount) <= 0) return res.status(400).json({ error: "Code and discount amount are required." });
    res.status(201).json(await savePromoCode(req.body));
  } catch (error) { next(error); }
});

app.delete("/api/admin/promos/:code", requireAdmin, async (req, res, next) => {
  try { await disablePromoCode(req.params.code); res.json({ ok: true }); }
  catch (error) { next(error); }
});

app.post("/api/admin/memberships/activate", requireAdmin, async (req, res, next) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const user = await userByEmail(email);
    if (!user) return res.status(404).json({ error: "That customer needs to create a Bloom account first." });
    const membershipId = await activateMembershipForUser({
      userId: user.id,
      email: user.email,
      planKey: req.body.planKey,
      billingInterval: req.body.billingInterval || "monthly",
    });
    res.status(201).json({ ok: true, membershipId });
  } catch (error) { next(error); }
});

// Admin workshop-session management
app.get("/api/admin/workshop-sessions", requireAdmin, async (_req, res, next) => {
  try {
    const workshops = await hydrateWorkshopsFromDb({ includeCancelled: true });
    res.json(workshops);
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/workshop-sessions", requireAdmin, async (req, res, next) => {
  try {
    const {
      workshopId, date, startTime, endTime,
      capacity, price, status = "published"
    } = req.body;

    const definition = getWorkshopDefinitions().find((w) => w.id === workshopId);
    if (!definition) return res.status(400).json({ error: "Choose a valid workshop." });
    if (!date || !startTime || !capacity || price === undefined) {
      return res.status(400).json({
        error: "Workshop, date, start time, capacity, and price are required."
      });
    }

    const id = crypto.randomUUID();
    const session = await createWorkshopSession({
      id, workshopId, date, startTime, endTime,
      capacity: Number(capacity), price: Number(price), status
    });
    res.status(201).json(session);
  } catch (error) {
    next(error);
  }
});

app.patch("/api/admin/workshop-sessions/:id", requireAdmin, async (req, res, next) => {
  try {
    const session = await updateWorkshopSession(req.params.id, req.body);
    if (!session) return res.status(404).json({ error: "Session not found." });
    res.json(session);
  } catch (error) {
    next(error);
  }
});

app.delete("/api/admin/workshop-sessions/:id", requireAdmin, async (req, res, next) => {
  try {
    const session = await cancelWorkshopSession(req.params.id);
    if (!session) return res.status(404).json({ error: "Session not found." });
    res.json({ ok: true, session });
  } catch (error) {
    next(error);
  }
});

// Ready-made studio pieces
app.get("/api/products", async (_req, res, next) => {
  try {
    res.json(await listProducts());
  } catch (error) {
    next(error);
  }
});

app.get("/api/products/:slug", async (req, res, next) => {
  try {
    const product = await productBySlug(req.params.slug);
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch (error) {
    next(error);
  }
});

// Calendar endpoint: published database sessions, optionally month-filtered.
app.get("/api/calendar", async (req, res, next) => {
  try {
    const { year, month } = req.query;
    const workshops = await hydrateWorkshopsFromDb();
    const all = workshops
      .flatMap((workshop) =>
        workshop.sessions.map((session) => ({
          ...session,
          workshopId: workshop.id,
          slug: workshop.slug,
          title: workshop.title,
          category: workshop.category,
          price: session.price,
          image: workshop.image,
        }))
      )
      .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));

    if (!year || !month) return res.json(all);

    const y = Number(year);
    const m = Number(month);
    res.json(
      all.filter((session) => {
        const [sy, sm] = session.date.split("-").map(Number);
        return sy === y && sm === m;
      })
    );
  } catch (error) {
    next(error);
  }
});

// Cart — persisted in PostgreSQL
app.post("/api/carts", async (req, res, next) => {
  try {
    const user = await currentUserFromRequest(req);
    const id = await createCart(user?.id || null);
    res.status(201).json(await hydrateCart(id));
  } catch (error) { next(error); }
});

app.get("/api/carts/:cartId", async (req, res, next) => {
  try {
    if (!(await cartExists(req.params.cartId))) {
      return res.status(404).json({ error: "Cart not found" });
    }
    res.json(await hydrateCart(req.params.cartId));
  } catch (error) { next(error); }
});

app.post("/api/carts/:cartId/items", async (req, res, next) => {
  try {
    const { itemType, workshopId, sessionId, productId, quantity = 1 } = req.body;
    const requested = Math.max(1, Number(quantity) || 1);
    const cartId = req.params.cartId;

    if (!(await cartExists(cartId))) {
      return res.status(404).json({ error: "Cart not found" });
    }

    if (itemType === "product" || productId) {
      const product = await productById(productId);
      if (!product) return res.status(400).json({ error: "That studio piece is no longer available." });
      const item = await upsertCartProduct(cartId, productId, requested, Number(product.stock || 0));
      if (!item) return res.status(409).json({ error: "That piece is sold out." });
      return res.status(201).json(await hydrateCart(cartId));
    }

    const workshop = await getWorkshopById(workshopId);
    const session = workshop?.sessions.find((item) => item.id === sessionId);
    if (!workshop || !session) {
      return res.status(400).json({ error: "That workshop session is no longer available." });
    }

    // Seats already purchased are counted from confirmed bookings.
    // The cart helper caps against the generated session capacity here;
    // Square payment finalization should re-check availability transactionally.
    const item = await upsertCartWorkshop(cartId, workshopId, sessionId, requested, session.spotsLeft);
    if (!item) {
      return res.status(409).json({ error: "There are not enough seats remaining for that session." });
    }
    res.status(201).json(await hydrateCart(cartId));
  } catch (error) { next(error); }
});

app.patch("/api/carts/:cartId/items/:itemId", async (req, res, next) => {
  try {
    const quantity = Number(req.body.quantity);
    if (!Number.isFinite(quantity)) return res.status(400).json({ error: "Quantity must be numeric" });
    if (!(await cartExists(req.params.cartId))) return res.status(404).json({ error: "Cart not found" });

    // Final stock/capacity validation also occurs at payment finalization.
    await updateCartItem(req.params.cartId, req.params.itemId, Math.floor(quantity));
    res.json(await hydrateCart(req.params.cartId));
  } catch (error) { next(error); }
});

app.delete("/api/carts/:cartId/items/:itemId", async (req, res, next) => {
  try {
    if (!(await cartExists(req.params.cartId))) return res.status(404).json({ error: "Cart not found" });
    await deleteCartItem(req.params.cartId, req.params.itemId);
    res.json(await hydrateCart(req.params.cartId));
  } catch (error) { next(error); }
});

app.delete("/api/carts/:cartId", async (req, res, next) => {
  try {
    if (!(await cartExists(req.params.cartId))) return res.status(404).json({ error: "Cart not found" });
    await clearCart(req.params.cartId);
    res.json(await hydrateCart(req.params.cartId));
  } catch (error) { next(error); }
});

app.get("/api/carts/:cartId/pricing", async (req, res, next) => {
  try {
    if (!(await cartExists(req.params.cartId))) return res.status(404).json({ error: "Cart not found" });
    const user = await currentUserFromRequest(req);
    res.json(await hydrateCart(req.params.cartId, { user, promoCode: req.query.promoCode || "" }));
  } catch (error) { next(error); }
});


app.get("/api/payments/config", (_req, res) => {
  try {
    const { applicationId, locationId } = requireSquareConfig();
    res.json({
      applicationId,
      locationId,
      environment: squareEnvironment(),
      sdkUrl: squareWebSdkUrl(),
      currency: "USD",
    });
  } catch (error) {
    res.status(error.status || 503).json({ error: error.message });
  }
});

app.post("/api/carts/:cartId/checkout", async (req, res, next) => {
  try {
    if (!(await cartExists(req.params.cartId))) {
      return res.status(404).json({ error: "Cart not found or already checked out." });
    }

    const { sourceId, promoCode = "", customerName = "", customerEmail = "" } = req.body;
    if (!sourceId) {
      return res.status(400).json({ error: "Square payment token is required." });
    }

    const user = await currentUserFromRequest(req);
    const email = String(customerEmail || user?.email || "").trim().toLowerCase();
    const name = String(customerName || user?.name || "").trim();
    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Please enter a valid email for your receipt." });
    }

    const hydrated = await hydrateCart(req.params.cartId, { user, promoCode });
    if (!hydrated.items.length) return res.status(400).json({ error: "Your cart is empty." });

    const amountCents = Math.round(Number(hydrated.total || 0) * 100);
    if (amountCents < 1) {
      return res.status(400).json({ error: "This cart does not require a card payment." });
    }

    const { accessToken, locationId } = requireSquareConfig();
    const payment = await createSquarePayment({
      sourceId,
      amountCents,
      locationId,
      accessToken,
      referenceId: req.params.cartId,
    });

    if (payment.status !== "COMPLETED") {
      throw Object.assign(
        new Error(`Square returned payment status ${payment.status || "UNKNOWN"}.`),
        { status: 502 }
      );
    }

    let orderId;
    try {
      orderId = await finalizePaidCart({
        cartId: req.params.cartId,
        userId: user?.id || null,
        customerName: name,
        customerEmail: email,
        pricedCart: hydrated,
        squarePaymentId: payment.id,
        squareOrderId: payment.order_id || null,
        promoCode: hydrated.promo?.code || null,
      });
    } catch (finalizeError) {
      try { await refundSquarePayment({ paymentId: payment.id, amountCents, accessToken }); }
      catch (refundError) { console.error("Automatic Square refund failed", refundError); }
      throw Object.assign(new Error("Your payment was reversed because availability changed before the order could be finalized. Please refresh and try again."), { status: 409 });
    }

    try { await sendEmail(orderConfirmationEmail({ email, orderId, total: hydrated.total, items: hydrated.items })); } catch {}

    res.json({
      ok: true,
      orderId,
      paymentId: payment.id,
      paymentStatus: payment.status,
      cart: hydrated,
      message: "Payment completed. Your Bloom order is confirmed.",
    });
  } catch (error) {
    next(error);
  }
});

// Private event inquiries
app.post("/api/inquiries", async (req, res, next) => {
  try {
    const { name, email, celebrationType, preferredDate, guestCount, notes = "" } = req.body;
    if (!name || !email || !celebrationType) {
      return res.status(400).json({ error: "Name, email, and celebration type are required." });
    }
    const inquiryId = await addInquiry({
      name, email, celebrationType,
      preferredDate: preferredDate || null,
      guestCount: Number(guestCount) || null,
      notes
    });
    try {
      await Promise.all([
        sendEmail(inquiryConfirmationEmail({ email, name, celebrationType })),
        sendEmail(privateEventOwnerEmail({ name, email, celebrationType, preferredDate, guestCount, notes })),
      ]);
    } catch {}
    res.status(201).json({ ok: true, inquiryId, message: "Your private event inquiry was submitted." });
  } catch (error) { next(error); }
});

// Newsletter
app.post("/api/newsletter", async (req, res, next) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "A valid email address is required." });
    }
    await subscribeNewsletter(email);
    res.status(201).json({ ok: true, message: "You're on the Bloom Studio list." });
  } catch (error) { next(error); }
});


// Event notification subscribers
app.post("/api/event-notifications/subscribe", async (req, res, next) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const categories = Array.isArray(req.body.categories) ? req.body.categories : ["All"];
    if (!email || !email.includes("@")) return res.status(400).json({ error: "A valid email address is required." });

    await subscribeEvents(email, categories);
    let confirmationEmailSent = false;
    try {
      const result = await sendEmail(subscriptionConfirmationEmail({ email, categories }));
      confirmationEmailSent = Boolean(result.sent);
    } catch {}

    res.status(201).json({
      ok: true,
      subscribed: true,
      confirmationEmailSent,
      message: confirmationEmailSent
        ? "You're subscribed. Check your inbox for confirmation."
        : "You're subscribed to Bloom Studio event notifications."
    });
  } catch (error) { next(error); }
});

app.get("/api/coming-soon-events", async (_req, res, next) => {
  try {
    res.json(await listComingSoonEvents());
  } catch (error) { next(error); }
});

app.post("/api/waitlist", async (req, res, next) => {
  try {
    const { eventId, email, name = "", notifyByEmail = true } = req.body;
    const cleanEmail = String(email || "").trim().toLowerCase();
    const event = await comingSoonEventById(eventId);

    if (!event) return res.status(404).json({ error: "That workshop idea could not be found." });
    if (!cleanEmail || !cleanEmail.includes("@")) {
      return res.status(400).json({ error: "A valid email address is required." });
    }

    const count = await joinWaitlist({
      eventId, email: cleanEmail, name, notifyByEmail
    });

    if (notifyByEmail) {
      await subscribeEvents(cleanEmail, ["All"], "waitlist");
      try {
        await sendEmail(waitlistConfirmationEmail({
          email: cleanEmail,
          eventTitle: event.title
        }));
      } catch {}
    }

    res.status(201).json({
      ok: true,
      interestCount: count,
      emailConfigured: emailConfigured(),
      message: notifyByEmail
        ? "You're on the interest list and signed up for email updates."
        : "You're on the interest list."
    });
  } catch (error) { next(error); }
});


// ---------- Email backend status ----------
app.get("/api/email/status", requireAdmin, async (_req, res) => {
  const status = await verifyEmailTransport();
  res.json(status);
});

// ---------- Broadcast a newly published event ----------
app.post("/api/event-notifications/send-new-event", requireAdmin, async (req, res, next) => {
  const {
    title,
    description = "",
    category = "All",
    slug = "",
  } = req.body;

  if (!title) {
    return res.status(400).json({ error: "Event title is required." });
  }

  if (!emailConfigured()) {
    return res.status(503).json({
      error: "Bloom's SMTP email service is not configured yet.",
    });
  }

  const subscribers = await activeEventSubscribers();

  const matchingSubscribers = subscribers.filter((subscriber) => {
    const prefs = subscriber.categories || ["All"];
    return prefs.includes("All") || prefs.includes(category);
  });

  const event = { title, description, category, slug };
  const results = [];

  for (const subscriber of matchingSubscribers) {
    try {
      const result = await sendEmail(newEventEmail({ subscriber, event }));
      results.push({
        email: subscriber.email,
        sent: Boolean(result.sent),
        messageId: result.messageId || null,
      });
    } catch (error) {
      results.push({
        email: subscriber.email,
        sent: false,
        error: error.message,
      });
    }
  }

  res.json({
    ok: true,
    recipients: matchingSubscribers.length,
    sent: results.filter((item) => item.sent).length,
    failed: results.filter((item) => !item.sent).length,
    results,
  });
});



const clientDist = path.join(__dirname, "../client/dist");
if (process.env.NODE_ENV === "production" && fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => res.sendFile(path.join(clientDist, "index.html")));
}


// Production frontend: serve the built Vite app from this same Express service.
// Keeping frontend + API on one origin means all existing /api calls work unchanged.
if (process.env.NODE_ENV === "production") {
  const clientDist = path.join(__dirname, "..", "client", "dist");

  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));

    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api/")) return next();
      res.sendFile(path.join(clientDist, "index.html"));
    });
  } else {
    console.warn("Production client build not found at", clientDist);
  }
}

app.use((error, _req, res, _next) => {
  console.error(error);
  const isDb = error?.code && String(error.code).length === 5;
  res.status(error?.status || 500).json({
    error: error?.message || (
      isDb
        ? "The database could not complete that request."
        : "The server could not complete that request."
    )
  });
});

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required. Copy server/.env.example to server/.env.");
  process.exit(1);
}

app.listen(PORT, () => {
  console.log(`Bloom Studio server listening on port ${PORT}`);
});
