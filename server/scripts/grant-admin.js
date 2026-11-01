import "dotenv/config";
import { grantAdminByEmail } from "../db/store.js";

const email = String(process.argv[2] || "").trim().toLowerCase();
if (!email || !email.includes("@")) {
  console.error("Usage: npm run admin:grant -- email@example.com");
  process.exit(1);
}
const user = await grantAdminByEmail(email);
if (!user) {
  console.error("No Bloom account exists for that email yet. Create the account first, then rerun this command.");
  process.exit(1);
}
console.log(`Admin access granted to ${user.email}`);
process.exit(0);
