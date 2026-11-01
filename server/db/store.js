import crypto from "crypto";
import { query, transaction } from "./client.js";

const rowProduct = (row) => ({
  id: row.id,
  slug: row.slug,
  title: row.title,
  category: row.category,
  price: Number(row.price_cents) / 100,
  stock: Number(row.stock),
  image: row.image,
  description: row.description,
  badge: row.badge,
});

export async function listProducts() {
  const { rows } = await query("SELECT * FROM products WHERE active = true ORDER BY created_at, title");
  return rows.map(rowProduct);
}

export async function productById(id) {
  const { rows } = await query("SELECT * FROM products WHERE id=$1 AND active=true LIMIT 1", [id]);
  return rows[0] ? rowProduct(rows[0]) : null;
}

export async function productBySlug(slug) {
  const { rows } = await query("SELECT * FROM products WHERE slug=$1 AND active=true LIMIT 1", [slug]);
  return rows[0] ? rowProduct(rows[0]) : null;
}

export async function createCart(userId = null) {
  const { rows } = await query(
    "INSERT INTO carts(user_id) VALUES($1) RETURNING id",
    [userId]
  );
  return rows[0].id;
}

export async function cartItems(cartId) {
  const { rows } = await query(
    "SELECT * FROM cart_items WHERE cart_id=$1 ORDER BY created_at",
    [cartId]
  );
  return rows;
}

export async function cartExists(cartId) {
  const { rowCount } = await query("SELECT 1 FROM carts WHERE id=$1 AND status='open'", [cartId]);
  return rowCount > 0;
}

export async function upsertCartProduct(cartId, productId, quantity, maxStock) {
  return transaction(async (client) => {
    const existing = await client.query(
      `SELECT id, quantity FROM cart_items
       WHERE cart_id=$1 AND item_type='product' AND product_id=$2 FOR UPDATE`,
      [cartId, productId]
    );
    const current = existing.rows[0]?.quantity || 0;
    const allowedTotal = Math.min(current + quantity, maxStock);
    if (allowedTotal <= current) return null;

    if (existing.rows[0]) {
      const updated = await client.query(
        "UPDATE cart_items SET quantity=$1 WHERE id=$2 RETURNING *",
        [allowedTotal, existing.rows[0].id]
      );
      return updated.rows[0];
    }
    const inserted = await client.query(
      `INSERT INTO cart_items(cart_id,item_type,product_id,quantity)
       VALUES($1,'product',$2,$3) RETURNING *`,
      [cartId, productId, allowedTotal]
    );
    return inserted.rows[0];
  });
}

export async function upsertCartWorkshop(cartId, workshopId, sessionId, quantity, maxSeats) {
  return transaction(async (client) => {
    const existing = await client.query(
      `SELECT id, quantity FROM cart_items
       WHERE cart_id=$1 AND item_type='workshop' AND workshop_id=$2 AND session_id=$3 FOR UPDATE`,
      [cartId, workshopId, sessionId]
    );
    const current = existing.rows[0]?.quantity || 0;
    const allowedTotal = Math.min(current + quantity, maxSeats);
    if (allowedTotal <= current) return null;

    if (existing.rows[0]) {
      const updated = await client.query(
        "UPDATE cart_items SET quantity=$1 WHERE id=$2 RETURNING *",
        [allowedTotal, existing.rows[0].id]
      );
      return updated.rows[0];
    }
    const inserted = await client.query(
      `INSERT INTO cart_items(cart_id,item_type,workshop_id,session_id,quantity)
       VALUES($1,'workshop',$2,$3,$4) RETURNING *`,
      [cartId, workshopId, sessionId, allowedTotal]
    );
    return inserted.rows[0];
  });
}

export async function updateCartItem(cartId, itemId, quantity) {
  if (quantity <= 0) {
    await query("DELETE FROM cart_items WHERE cart_id=$1 AND id=$2", [cartId, itemId]);
    return;
  }
  await query("UPDATE cart_items SET quantity=$1 WHERE cart_id=$2 AND id=$3", [quantity, cartId, itemId]);
}

export async function deleteCartItem(cartId, itemId) {
  await query("DELETE FROM cart_items WHERE cart_id=$1 AND id=$2", [cartId, itemId]);
}

export async function clearCart(cartId) {
  await query("DELETE FROM cart_items WHERE cart_id=$1", [cartId]);
}

export async function signupUser({ name, email, passwordSalt, passwordHash }) {
  const { rows } = await query(
    `INSERT INTO users(name,email,password_salt,password_hash)
     VALUES($1,$2,$3,$4)
     RETURNING id,name,email,created_at`,
    [name,email,passwordSalt,passwordHash]
  );
  return rows[0];
}

export async function userByEmail(email) {
  const { rows } = await query("SELECT * FROM users WHERE email=$1 LIMIT 1", [email]);
  return rows[0] || null;
}

export async function userById(id) {
  const { rows } = await query("SELECT * FROM users WHERE id=$1 LIMIT 1", [id]);
  return rows[0] || null;
}

export async function createAuthSession(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  await query(
    `INSERT INTO auth_sessions(token,user_id) VALUES($1,$2)`,
    [token,userId]
  );
  return token;
}

export async function userByToken(token) {
  const { rows } = await query(
    `SELECT u.* FROM auth_sessions s
     JOIN users u ON u.id=s.user_id
     WHERE s.token=$1 AND s.expires_at > now()
     LIMIT 1`,
    [token]
  );
  return rows[0] || null;
}

export async function deleteAuthSession(token) {
  await query("DELETE FROM auth_sessions WHERE token=$1", [token]);
}

export async function addInquiry(data) {
  const { rows } = await query(
    `INSERT INTO inquiries(name,email,celebration_type,preferred_date,guest_count,notes)
     VALUES($1,$2,$3,$4,$5,$6) RETURNING id`,
    [data.name,data.email,data.celebrationType,data.preferredDate || null,data.guestCount || null,data.notes || ""]
  );
  return rows[0].id;
}

export async function subscribeNewsletter(email) {
  await query(
    `INSERT INTO newsletter_subscribers(email)
     VALUES($1)
     ON CONFLICT(email) DO UPDATE SET active=true`,
    [email]
  );
}

export async function subscribeEvents(email, categories=["All"], source=null) {
  await query(
    `INSERT INTO event_subscribers(email,categories,source)
     VALUES($1,$2::jsonb,$3)
     ON CONFLICT(email) DO UPDATE SET
       categories=EXCLUDED.categories,
       active=true,
       source=COALESCE(event_subscribers.source, EXCLUDED.source),
       updated_at=now()`,
    [email, JSON.stringify(categories), source]
  );
}

export async function activeEventSubscribers() {
  const { rows } = await query(
    "SELECT email,categories FROM event_subscribers WHERE active=true ORDER BY created_at"
  );
  return rows.map(r => ({ email: r.email, categories: r.categories || ["All"] }));
}

export async function listComingSoonEvents() {
  const { rows } = await query(
    `SELECT e.*,
      (SELECT count(*)::int FROM waitlist_entries w WHERE w.event_id=e.id) AS interest_count
     FROM coming_soon_events e
     WHERE e.active=true
     ORDER BY e.created_at`
  );
  return rows.map(r => ({
    id:r.id, slug:r.slug, title:r.title, category:r.category, image:r.image,
    description:r.description, status:r.status, date:r.event_date, location:r.location,
    interestCount:Number(r.interest_count || 0)
  }));
}

export async function comingSoonEventById(id) {
  const { rows } = await query("SELECT * FROM coming_soon_events WHERE id=$1 AND active=true LIMIT 1",[id]);
  return rows[0] || null;
}

export async function joinWaitlist({eventId,email,name,notifyByEmail}) {
  await query(
    `INSERT INTO waitlist_entries(event_id,email,name,notify_by_email)
     VALUES($1,$2,$3,$4)
     ON CONFLICT(event_id,email) DO UPDATE SET
       name=EXCLUDED.name,
       notify_by_email=EXCLUDED.notify_by_email,
       updated_at=now()`,
    [eventId,email,name || "",Boolean(notifyByEmail)]
  );
  const { rows } = await query("SELECT count(*)::int AS count FROM waitlist_entries WHERE event_id=$1",[eventId]);
  return Number(rows[0].count);
}

export async function membershipInterest({email,userId=null,planKey=null,billingInterval=null}) {
  await query(
    `INSERT INTO membership_interest(email,user_id,plan_key,billing_interval)
     VALUES($1,$2,$3,$4)
     ON CONFLICT(email) DO UPDATE SET
       user_id=COALESCE(EXCLUDED.user_id,membership_interest.user_id),
       plan_key=COALESCE(EXCLUDED.plan_key,membership_interest.plan_key),
       billing_interval=COALESCE(EXCLUDED.billing_interval,membership_interest.billing_interval)`,
    [email,userId,planKey,billingInterval]
  );
}

export async function healthcheck() {
  const { rows } = await query("SELECT now() AS now");
  return rows[0].now;
}


const rowSession = (row) => ({
  id: row.id,
  workshopId: row.workshop_id,
  date: row.session_date instanceof Date
    ? row.session_date.toISOString().slice(0, 10)
    : String(row.session_date).slice(0, 10),
  startTime: String(row.start_time).slice(0, 5),
  endTime: row.end_time ? String(row.end_time).slice(0, 5) : null,
  capacity: Number(row.capacity),
  price: Number(row.price_cents) / 100,
  status: row.status,
  bookedSeats: Number(row.booked_seats || 0),
  spotsLeft: Math.max(0, Number(row.capacity) - Number(row.booked_seats || 0)),
});

export async function listWorkshopSessions({ includeCancelled = false } = {}) {
  const { rows } = await query(
    `SELECT s.*,
      COALESCE((
        SELECT SUM(b.seats)
        FROM bookings b
        WHERE b.session_id = s.id
          AND b.status IN ('confirmed','attended')
      ), 0)::int AS booked_seats
     FROM workshop_sessions s
     WHERE ($1::boolean = true OR s.status = 'published')
     ORDER BY s.session_date, s.start_time`,
    [includeCancelled]
  );
  return rows.map(rowSession);
}

export async function sessionById(id) {
  const { rows } = await query(
    `SELECT s.*,
      COALESCE((
        SELECT SUM(b.seats)
        FROM bookings b
        WHERE b.session_id = s.id
          AND b.status IN ('confirmed','attended')
      ), 0)::int AS booked_seats
     FROM workshop_sessions s
     WHERE s.id=$1
     LIMIT 1`,
    [id]
  );
  return rows[0] ? rowSession(rows[0]) : null;
}

export async function createWorkshopSession({
  id, workshopId, date, startTime, endTime, capacity, price, status = 'published'
}) {
  const { rows } = await query(
    `INSERT INTO workshop_sessions
      (id, workshop_id, session_date, start_time, end_time, capacity, price_cents, status)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [
      id, workshopId, date, startTime, endTime || null,
      Number(capacity), Math.round(Number(price) * 100), status
    ]
  );
  return rowSession(rows[0]);
}

export async function updateWorkshopSession(id, patch) {
  const current = await sessionById(id);
  if (!current) return null;

  const next = {
    workshopId: patch.workshopId ?? current.workshopId,
    date: patch.date ?? current.date,
    startTime: patch.startTime ?? current.startTime,
    endTime: patch.endTime ?? current.endTime,
    capacity: patch.capacity ?? current.capacity,
    price: patch.price ?? current.price,
    status: patch.status ?? current.status,
  };

  if (Number(next.capacity) < Number(current.bookedSeats)) {
    const error = new Error(
      `Capacity cannot be lower than ${current.bookedSeats} already-booked seats.`
    );
    error.status = 409;
    throw error;
  }

  const { rows } = await query(
    `UPDATE workshop_sessions
     SET workshop_id=$1, session_date=$2, start_time=$3, end_time=$4,
         capacity=$5, price_cents=$6, status=$7, updated_at=now()
     WHERE id=$8
     RETURNING *`,
    [
      next.workshopId, next.date, next.startTime, next.endTime || null,
      Number(next.capacity), Math.round(Number(next.price) * 100),
      next.status, id
    ]
  );
  return rowSession({ ...rows[0], booked_seats: current.bookedSeats });
}

export async function cancelWorkshopSession(id) {
  const { rows } = await query(
    `UPDATE workshop_sessions
     SET status='cancelled', updated_at=now()
     WHERE id=$1
     RETURNING *`,
    [id]
  );
  return rows[0] ? rowSession(rows[0]) : null;
}

export async function bookedSeatsForSession(sessionId) {
  const { rows } = await query(
    `SELECT COALESCE(SUM(seats),0)::int AS seats
     FROM bookings
     WHERE session_id=$1 AND status IN ('confirmed','attended')`,
    [sessionId]
  );
  return Number(rows[0]?.seats || 0);
}


export async function settingByKey(key) {
  const { rows } = await query("SELECT value FROM site_settings WHERE key=$1 LIMIT 1", [key]);
  return rows[0]?.value || null;
}

export async function upsertSetting(key, value) {
  const { rows } = await query(
    `INSERT INTO site_settings(key,value) VALUES($1,$2::jsonb)
     ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value, updated_at=now()
     RETURNING value`,
    [key, JSON.stringify(value)]
  );
  return rows[0].value;
}

export async function workshopContentOverrides() {
  const { rows } = await query("SELECT workshop_id, content FROM workshop_content_overrides");
  return Object.fromEntries(rows.map((row) => [row.workshop_id, row.content || {}]));
}

export async function upsertWorkshopContent(workshopId, content) {
  const { rows } = await query(
    `INSERT INTO workshop_content_overrides(workshop_id,content) VALUES($1,$2::jsonb)
     ON CONFLICT(workshop_id) DO UPDATE SET content=EXCLUDED.content, updated_at=now()
     RETURNING content`,
    [workshopId, JSON.stringify(content)]
  );
  return rows[0].content;
}

const promoRow = (row) => row ? ({
  code: row.code,
  label: row.label,
  discountType: row.discount_type,
  amount: Number(row.amount),
  appliesTo: row.applies_to,
  active: Boolean(row.active),
  startsAt: row.starts_at,
  endsAt: row.ends_at,
  maxUses: row.max_uses == null ? null : Number(row.max_uses),
  uses: Number(row.uses || 0),
}) : null;

export async function listPromoCodes() {
  const { rows } = await query("SELECT * FROM promo_codes ORDER BY created_at DESC");
  return rows.map(promoRow);
}

export async function promoByCode(code) {
  const { rows } = await query("SELECT * FROM promo_codes WHERE code=$1 LIMIT 1", [String(code || '').trim().toUpperCase()]);
  return promoRow(rows[0]);
}

export async function savePromoCode(promo) {
  const code = String(promo.code || '').trim().toUpperCase();
  const { rows } = await query(
    `INSERT INTO promo_codes(code,label,discount_type,amount,applies_to,active,starts_at,ends_at,max_uses)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
     ON CONFLICT(code) DO UPDATE SET
       label=EXCLUDED.label, discount_type=EXCLUDED.discount_type, amount=EXCLUDED.amount,
       applies_to=EXCLUDED.applies_to, active=EXCLUDED.active, starts_at=EXCLUDED.starts_at,
       ends_at=EXCLUDED.ends_at, max_uses=EXCLUDED.max_uses, updated_at=now()
     RETURNING *`,
    [code, promo.label || '', promo.discountType || 'percent', Number(promo.amount || 0), promo.appliesTo || 'all', promo.active !== false, promo.startsAt || null, promo.endsAt || null, promo.maxUses ? Number(promo.maxUses) : null]
  );
  return promoRow(rows[0]);
}

export async function disablePromoCode(code) {
  await query("UPDATE promo_codes SET active=false, updated_at=now() WHERE code=$1", [String(code).toUpperCase()]);
}

const planRow = (row) => row ? ({
  key: row.plan_key,
  name: row.name,
  monthlyPrice: Number(row.monthly_price_cents) / 100,
  annualPrice: Number(row.annual_price_cents) / 100,
  monthlyCredits: Number(row.monthly_credits),
  discountPercent: Number(row.discount_percent),
  discountScope: row.discount_scope,
  friendPassesPerYear: Number(row.friend_passes_per_year),
  benefits: row.benefits || [],
}) : null;

export async function listMembershipPlans() {
  const { rows } = await query("SELECT * FROM membership_plans WHERE active=true ORDER BY monthly_price_cents");
  return rows.map(planRow);
}

export async function membershipForUser(userId, email) {
  await query(
    `UPDATE memberships m SET
       workshop_credits=p.monthly_credits, credits_refresh_at=now()+interval '1 month', updated_at=now()
     FROM membership_plans p
     WHERE m.plan_key=p.plan_key AND m.status='active'
       AND (m.user_id=$1 OR lower(m.email)=lower($2))
       AND m.credits_refresh_at IS NOT NULL AND m.credits_refresh_at <= now()`,
    [userId || null, email || '']
  );
  await query(
    `UPDATE memberships m SET
       friend_passes_remaining=p.friend_passes_per_year, friend_passes_refresh_at=now()+interval '1 year', updated_at=now()
     FROM membership_plans p
     WHERE m.plan_key=p.plan_key AND m.status='active'
       AND (m.user_id=$1 OR lower(m.email)=lower($2))
       AND m.friend_passes_refresh_at IS NOT NULL AND m.friend_passes_refresh_at <= now()`,
    [userId || null, email || '']
  );
  const { rows } = await query(
    `SELECT m.*, p.name AS plan_name, p.monthly_credits, p.discount_scope, p.friend_passes_per_year
     FROM memberships m
     LEFT JOIN membership_plans p ON p.plan_key=m.plan_key
     WHERE m.status='active' AND (m.user_id=$1 OR lower(m.email)=lower($2))
     ORDER BY m.updated_at DESC LIMIT 1`,
    [userId || null, email || '']
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    planKey: row.plan_key,
    planName: row.plan_name || row.plan_key,
    status: row.status,
    billingInterval: row.billing_interval,
    workshopCredits: Number(row.workshop_credits || 0),
    discountPercent: Number(row.discount_percent || 0),
    discountScope: row.discount_scope || 'workshops',
    friendPassesRemaining: Number(row.friend_passes_remaining || 0),
    currentPeriodStart: row.current_period_start,
    currentPeriodEnd: row.current_period_end,
  };
}

export async function activateMembershipForUser({ userId, email, planKey, billingInterval='monthly' }) {
  const { rows: planRows } = await query("SELECT * FROM membership_plans WHERE plan_key=$1 AND active=true LIMIT 1", [planKey]);
  const plan = planRows[0];
  if (!plan) throw Object.assign(new Error('Membership plan not found.'), { status: 404 });
  const { rows } = await query(
    `INSERT INTO memberships(user_id,email,plan_key,status,billing_interval,workshop_credits,discount_percent,friend_passes_remaining,current_period_start,current_period_end,credits_refresh_at,friend_passes_refresh_at)
     VALUES($1,$2,$3,'active',$4,$5,$6,$7,now(),CASE WHEN $4='annual' THEN now()+interval '1 year' ELSE now()+interval '1 month' END,now()+interval '1 month',now()+interval '1 year')
     RETURNING id`,
    [userId || null, email, planKey, billingInterval, Number(plan.monthly_credits), Number(plan.discount_percent), Number(plan.friend_passes_per_year)]
  );
  return rows[0].id;
}

export async function createCreditReservation({ userId, email, name, workshopId, sessionId, seats=1, useFriendPass=false }) {
  return transaction(async (client) => {
    await client.query(
      `UPDATE memberships m SET workshop_credits=p.monthly_credits,credits_refresh_at=now()+interval '1 month',updated_at=now()
       FROM membership_plans p WHERE m.plan_key=p.plan_key AND m.status='active' AND (m.user_id=$1 OR lower(m.email)=lower($2))
       AND m.credits_refresh_at IS NOT NULL AND m.credits_refresh_at <= now()`, [userId,email]
    );
    await client.query(
      `UPDATE memberships m SET friend_passes_remaining=p.friend_passes_per_year,friend_passes_refresh_at=now()+interval '1 year',updated_at=now()
       FROM membership_plans p WHERE m.plan_key=p.plan_key AND m.status='active' AND (m.user_id=$1 OR lower(m.email)=lower($2))
       AND m.friend_passes_refresh_at IS NOT NULL AND m.friend_passes_refresh_at <= now()`, [userId,email]
    );
    const membershipResult = await client.query(
      `SELECT m.*, p.discount_scope, p.friend_passes_per_year
       FROM memberships m LEFT JOIN membership_plans p ON p.plan_key=m.plan_key
       WHERE m.status='active' AND (m.user_id=$1 OR lower(m.email)=lower($2))
       ORDER BY m.updated_at DESC LIMIT 1 FOR UPDATE OF m`,
      [userId, email]
    );
    const membership = membershipResult.rows[0];
    if (!membership) throw Object.assign(new Error('An active Bloom Club membership is required.'), { status: 403 });

    const sessionResult = await client.query("SELECT * FROM workshop_sessions WHERE id=$1 AND status='published' FOR UPDATE", [sessionId]);
    const session = sessionResult.rows[0];
    if (!session || session.workshop_id !== workshopId) throw Object.assign(new Error('That workshop session is no longer available.'), { status: 404 });

    const booked = await client.query(
      `SELECT COALESCE(SUM(seats),0)::int AS seats FROM bookings
       WHERE session_id=$1 AND status IN ('confirmed','attended')`, [sessionId]
    );
    const available = Number(session.capacity) - Number(booked.rows[0]?.seats || 0);
    if (available < seats) throw Object.assign(new Error('There are not enough seats remaining.'), { status: 409 });

    if (useFriendPass) {
      if (seats !== 1 || Number(membership.friend_passes_remaining || 0) < 1) {
        throw Object.assign(new Error('A friend pass can reserve one seat when one is available on your membership.'), { status: 409 });
      }
      await client.query("UPDATE memberships SET friend_passes_remaining=friend_passes_remaining-1, updated_at=now() WHERE id=$1", [membership.id]);
    } else {
      if (Number(membership.workshop_credits || 0) < seats) throw Object.assign(new Error('You do not have enough workshop credits for those seats.'), { status: 409 });
      await client.query("UPDATE memberships SET workshop_credits=workshop_credits-$1, updated_at=now() WHERE id=$2", [seats, membership.id]);
    }

    const order = await client.query(
      `INSERT INTO orders(user_id,customer_name,customer_email,subtotal_cents,discount_cents,tax_cents,total_cents,status,paid_at)
       VALUES($1,$2,$3,0,0,0,0,'paid',now()) RETURNING id`,
      [userId, name || '', email]
    );
    await client.query(
      `INSERT INTO order_items(order_id,item_type,workshop_id,session_id,title,unit_price_cents,quantity,line_total_cents)
       VALUES($1,'workshop',$2,$3,$4,0,$5,0)`,
      [order.rows[0].id, workshopId, sessionId, useFriendPass ? 'Bloom Club friend pass reservation' : 'Bloom Club credit reservation', seats]
    );
    const booking = await client.query(
      `INSERT INTO bookings(order_id,user_id,workshop_id,session_id,seats,customer_name,customer_email,status,reservation_source)
       VALUES($1,$2,$3,$4,$5,$6,$7,'confirmed',$8) RETURNING id`,
      [order.rows[0].id, userId, workshopId, sessionId, seats, name || '', email, useFriendPass ? 'friend-pass' : 'membership-credit']
    );
    return booking.rows[0].id;
  });
}


export async function finalizePaidCart({
  cartId,
  userId = null,
  customerName = "",
  customerEmail,
  pricedCart,
  squarePaymentId,
  squareOrderId = null,
  promoCode = null,
}) {
  return transaction(async (client) => {
    const cartLock = await client.query(
      "SELECT id,status FROM carts WHERE id=$1 FOR UPDATE",
      [cartId]
    );
    if (!cartLock.rows[0] || cartLock.rows[0].status !== "open") {
      throw Object.assign(new Error("This cart has already been checked out."), { status: 409 });
    }

    // Re-check inventory / seats while rows are locked before recording the order.
    for (const item of pricedCart.items) {
      if (item.itemType === "product") {
        const product = await client.query(
          "SELECT id,stock FROM products WHERE id=$1 AND active=true FOR UPDATE",
          [item.productId]
        );
        if (!product.rows[0] || Number(product.rows[0].stock) < Number(item.quantity)) {
          throw Object.assign(new Error(`${item.title} no longer has enough stock.`), { status: 409 });
        }
      } else {
        const session = await client.query(
          "SELECT id,capacity,status FROM workshop_sessions WHERE id=$1 FOR UPDATE",
          [item.session.id]
        );
        if (!session.rows[0] || session.rows[0].status !== "published") {
          throw Object.assign(new Error(`${item.title} is no longer available.`), { status: 409 });
        }
        const booked = await client.query(
          `SELECT COALESCE(SUM(seats),0)::int AS seats
           FROM bookings
           WHERE session_id=$1 AND status IN ('confirmed','attended')`,
          [item.session.id]
        );
        const remaining = Number(session.rows[0].capacity) - Number(booked.rows[0].seats || 0);
        if (remaining < Number(item.quantity)) {
          throw Object.assign(new Error(`${item.title} no longer has enough seats.`), { status: 409 });
        }
      }
    }

    const order = await client.query(
      `INSERT INTO orders(
        user_id,cart_id,customer_name,customer_email,
        subtotal_cents,discount_cents,tax_cents,total_cents,currency,
        status,square_payment_id,square_order_id,promo_code,paid_at
      )
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,'USD','paid',$9,$10,$11,now())
      RETURNING id`,
      [
        userId,
        cartId,
        customerName,
        customerEmail,
        Math.round(Number(pricedCart.subtotal || 0) * 100),
        Math.round(Number(pricedCart.discount || 0) * 100),
        Math.round(Number(pricedCart.tax || 0) * 100),
        Math.round(Number(pricedCart.total || 0) * 100),
        squarePaymentId,
        squareOrderId,
        promoCode || null,
      ]
    );
    const orderId = order.rows[0].id;

    for (const item of pricedCart.items) {
      await client.query(
        `INSERT INTO order_items(
          order_id,item_type,product_id,workshop_id,session_id,
          title,unit_price_cents,quantity,line_total_cents
        )
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          orderId,
          item.itemType,
          item.productId || null,
          item.workshopId || null,
          item.session?.id || null,
          item.title,
          Math.round(Number(item.unitPrice || 0) * 100),
          Number(item.quantity),
          Math.round(Number(item.lineTotal || 0) * 100),
        ]
      );

      if (item.itemType === "product") {
        await client.query(
          "UPDATE products SET stock=stock-$1,updated_at=now() WHERE id=$2",
          [Number(item.quantity), item.productId]
        );
      } else {
        await client.query(
          `INSERT INTO bookings(
            order_id,user_id,workshop_id,session_id,seats,
            customer_name,customer_email,status,reservation_source
          )
          VALUES($1,$2,$3,$4,$5,$6,$7,'confirmed','payment')`,
          [
            orderId,
            userId,
            item.workshopId,
            item.session.id,
            Number(item.quantity),
            customerName,
            customerEmail,
          ]
        );
      }
    }

    if (promoCode) {
      await client.query(
        "UPDATE promo_codes SET uses=uses+1,updated_at=now() WHERE code=$1",
        [String(promoCode).trim().toUpperCase()]
      );
    }

    await client.query(
      "UPDATE carts SET status='converted',updated_at=now() WHERE id=$1",
      [cartId]
    );

    return orderId;
  });
}


export async function orderHistoryForUser(userId) {
  const { rows } = await query(
    `SELECT o.id,o.total_cents,o.status,o.created_at,
      COALESCE(json_agg(json_build_object('title',oi.title,'quantity',oi.quantity,'itemType',oi.item_type)
        ORDER BY oi.id) FILTER (WHERE oi.id IS NOT NULL),'[]'::json) AS items
     FROM orders o
     LEFT JOIN order_items oi ON oi.order_id=o.id
     WHERE o.user_id=$1
     GROUP BY o.id
     ORDER BY o.created_at DESC`,
    [userId]
  );
  return rows.map((row) => ({
    id: row.id,
    total: Number(row.total_cents || 0) / 100,
    status: row.status,
    createdAt: row.created_at,
    items: row.items || [],
  }));
}

export async function beginWebhookEvent({ id, provider, eventType, payload }) {
  const { rowCount } = await query(
    `INSERT INTO webhook_events(id,provider,event_type,payload)
     VALUES($1,$2,$3,$4::jsonb)
     ON CONFLICT(id) DO NOTHING`,
    [id, provider, eventType, JSON.stringify(payload)]
  );
  return rowCount === 1;
}

export async function markWebhookEventProcessed(id) {
  await query("UPDATE webhook_events SET processed=true,processed_at=now() WHERE id=$1", [id]);
}

export async function syncMembershipFromSquare({ email, squareCustomerId, squareSubscriptionId, planKey, billingInterval, status }) {
  const { rows: planRows } = await query("SELECT * FROM membership_plans WHERE plan_key=$1 AND active=true LIMIT 1", [planKey]);
  const plan = planRows[0];
  if (!plan) throw new Error(`Membership plan ${planKey} is not configured.`);
  const { rows: userRows } = await query("SELECT id FROM users WHERE lower(email)=lower($1) LIMIT 1", [email]);
  const userId = userRows[0]?.id || null;
  const active = status === 'active';
  const mappedStatus = ['active','paused','cancelled','past_due','inactive'].includes(status) ? status : 'inactive';
  const { rows } = await query(
    `INSERT INTO memberships(
      user_id,email,square_customer_id,square_subscription_id,plan_key,status,billing_interval,
      workshop_credits,discount_percent,friend_passes_remaining,current_period_start,current_period_end,
      credits_refresh_at,friend_passes_refresh_at
     ) VALUES(
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now(),
      CASE WHEN $7='annual' THEN now()+interval '1 year' ELSE now()+interval '1 month' END,
      now()+interval '1 month',now()+interval '1 year'
     )
     ON CONFLICT(square_subscription_id) DO UPDATE SET
      user_id=COALESCE(EXCLUDED.user_id,memberships.user_id), email=EXCLUDED.email,
      square_customer_id=EXCLUDED.square_customer_id, plan_key=EXCLUDED.plan_key,
      status=EXCLUDED.status,billing_interval=EXCLUDED.billing_interval,
      discount_percent=EXCLUDED.discount_percent,updated_at=now()
     RETURNING id`,
    [userId,email,squareCustomerId,squareSubscriptionId,planKey,mappedStatus,billingInterval,
     active ? Number(plan.monthly_credits) : 0, Number(plan.discount_percent), active ? Number(plan.friend_passes_per_year) : 0]
  );
  return rows[0].id;
}


export async function grantAdminByEmail(email) {
  const { rows } = await query(
    "UPDATE users SET is_admin=true WHERE lower(email)=lower($1) RETURNING id,email,is_admin",
    [email]
  );
  return rows[0] || null;
}
