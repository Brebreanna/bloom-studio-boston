import "dotenv/config";
import crypto from "crypto";

const environment = String(process.env.SQUARE_ENVIRONMENT || "production").toLowerCase() === "sandbox" ? "sandbox" : "production";
const base = environment === "sandbox" ? "https://connect.squareupsandbox.com" : "https://connect.squareup.com";
const token = process.env.SQUARE_ACCESS_TOKEN;
if (!token) throw new Error("SQUARE_ACCESS_TOKEN is required.");

const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "Square-Version": "2026-09-16" };
async function upsert(object) {
  const response = await fetch(`${base}/v2/catalog/object`, { method:"POST", headers, body:JSON.stringify({ idempotency_key:crypto.randomUUID(), object }) });
  const payload = await response.json();
  if (!response.ok) throw new Error(JSON.stringify(payload.errors || payload));
  return payload.catalog_object;
}
const plan = await upsert({ type:"SUBSCRIPTION_PLAN", id:"#bloom-club", present_at_all_locations:true, subscription_plan_data:{ name:"Bloom Club" } });
const defs = [
  ["PETAL_MONTHLY","Petal Monthly",5000,"MONTHLY"], ["PETAL_ANNUAL","Petal Annual",60000,"ANNUAL"],
  ["BLOOM_MONTHLY","Blossom Monthly",9000,"MONTHLY"], ["BLOOM_ANNUAL","Blossom Annual",108000,"ANNUAL"],
  ["FULL_BLOOM_MONTHLY","Flourish Monthly",12000,"MONTHLY"], ["FULL_BLOOM_ANNUAL","Flourish Annual",144000,"ANNUAL"],
];
console.log(`Created Square Bloom Club plan in ${environment}: ${plan.id}`);
for (const [envName,name,amount,cadence] of defs) {
  const variation = await upsert({ type:"SUBSCRIPTION_PLAN_VARIATION", id:`#${envName.toLowerCase()}`, present_at_all_locations:true, subscription_plan_variation_data:{ name, subscription_plan_id:plan.id, phases:[{ cadence, pricing:{ type:"STATIC", price_money:{ amount, currency:"USD" } } }] } });
  console.log(`SQUARE_MEMBERSHIP_${envName}_ID=${variation.id}`);
}
