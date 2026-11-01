import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "../db/client.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, "..", "data");

const read = (name, fallback) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(dataDir, name), "utf8"));
  } catch {
    return fallback;
  }
};

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

try {
  const products = read("products.json", []);
  for (const p of products) {
    await pool.query(
      `INSERT INTO products
        (id, slug, title, category, price_cents, stock, image, description, badge, active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true)
       ON CONFLICT (id) DO UPDATE SET
         slug=EXCLUDED.slug,
         title=EXCLUDED.title,
         category=EXCLUDED.category,
         price_cents=EXCLUDED.price_cents,
         stock=EXCLUDED.stock,
         image=EXCLUDED.image,
         description=EXCLUDED.description,
         badge=EXCLUDED.badge,
         updated_at=now()`,
      [
        p.id, p.slug, p.title, p.category,
        Math.round(Number(p.price || 0) * 100),
        Number(p.stock || 0),
        p.image || null, p.description || "", p.badge || null
      ]
    );
  }

  const events = read("coming_soon_events.json", []);
  for (const e of events) {
    await pool.query(
      `INSERT INTO coming_soon_events
        (id, slug, title, category, image, description, status, event_date, location, active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true)
       ON CONFLICT (id) DO UPDATE SET
         slug=EXCLUDED.slug,
         title=EXCLUDED.title,
         category=EXCLUDED.category,
         image=EXCLUDED.image,
         description=EXCLUDED.description,
         status=EXCLUDED.status,
         event_date=EXCLUDED.event_date,
         location=EXCLUDED.location,
         updated_at=now()`,
      [
        e.id, e.slug, e.title, e.category || "Coming Soon",
        e.image || null, e.description || "", e.status || "idea",
        e.date || null, e.location || null
      ]
    );
  }


  const workshops = read("workshops.json", []);
  const sessionCountResult = await pool.query("SELECT COUNT(*)::int AS count FROM workshop_sessions");
  const shouldSeedSessions = Number(sessionCountResult.rows[0]?.count || 0) === 0;
  const now = new Date();

  const dateKey = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  if (shouldSeedSessions) {
  for (const workshop of workshops) {
    const windowDays = Number(workshop.bookingWindowDays || 90);
    const leadMs = Number(workshop.minimumLeadHours || 0) * 60 * 60 * 1000;

    for (let offset = 0; offset <= windowDays; offset += 1) {
      const date = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + offset,
        12, 0, 0, 0
      );

      for (const rule of workshop.scheduleRules || []) {
        if (date.getDay() !== Number(rule.weekday)) continue;

        const [sh, sm] = rule.startTime.split(":").map(Number);
        const startsAt = new Date(
          date.getFullYear(), date.getMonth(), date.getDate(), sh, sm, 0, 0
        );
        if (startsAt.getTime() - now.getTime() < leadMs) continue;

        const d = dateKey(date);
        const id = `${workshop.id}-${d}-${rule.startTime.replace(":", "")}`;

        await pool.query(
          `INSERT INTO workshop_sessions
            (id, workshop_id, session_date, start_time, end_time, capacity, price_cents, status)
           VALUES($1,$2,$3,$4,$5,$6,$7,'published')
           ON CONFLICT(id) DO NOTHING`,
          [
            id,
            workshop.id,
            d,
            rule.startTime,
            rule.endTime || null,
            Number(rule.capacity || 8),
            Math.round(Number(workshop.price || 0) * 100)
          ]
        );
      }
    }
  }
  }

  const business = read("business.json", {});
  const membership = read("membership.json", {});
  const policies = read("policies.json", {});
  const taxSettings = {
    productTaxRate: 0.0625,
    workshopTaxRate: 0,
    note: "Massachusetts sales tax is calculated on taxable ready-made artwork in the shop. Workshop prices are shown as listed at checkout."
  };

  for (const [key, value] of Object.entries({ business, membership, policies, taxes: taxSettings })) {
    await pool.query(
      `INSERT INTO site_settings(key, value) VALUES($1,$2::jsonb)
       ON CONFLICT(key) DO NOTHING`,
      [key, JSON.stringify(value)]
    );
  }

  for (const plan of membership.plans || []) {
    await pool.query(
      `INSERT INTO membership_plans
        (plan_key,name,monthly_price_cents,annual_price_cents,monthly_credits,discount_percent,discount_scope,friend_passes_per_year,benefits,active)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,true)
       ON CONFLICT(plan_key) DO UPDATE SET
         name=EXCLUDED.name,
         monthly_price_cents=EXCLUDED.monthly_price_cents,
         annual_price_cents=EXCLUDED.annual_price_cents,
         monthly_credits=EXCLUDED.monthly_credits,
         discount_percent=EXCLUDED.discount_percent,
         discount_scope=EXCLUDED.discount_scope,
         friend_passes_per_year=EXCLUDED.friend_passes_per_year,
         benefits=EXCLUDED.benefits,
         updated_at=now()`,
      [
        plan.key, plan.name,
        Math.round(Number(plan.monthlyPrice || 0) * 100),
        Math.round(Number(plan.annualPrice || 0) * 100),
        Number(plan.monthlyCredits || 0),
        Number(plan.discountPercent || 0),
        plan.discountScope || "workshops",
        Number(plan.friendPassesPerYear || 0),
        JSON.stringify(plan.benefits || [])
      ]
    );
  }

  console.log(`Seeded ${products.length} products, ${events.length} coming-soon events, workshop sessions, membership plans, and site settings.`);
} finally {
  await pool.end();
}
