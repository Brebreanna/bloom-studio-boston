import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "../db/client.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const sql = fs.readFileSync(path.join(__dirname, "..", "db", "schema.sql"), "utf8");

try {
  await pool.query(sql);
  console.log("Bloom Studio database migration complete.");
} finally {
  await pool.end();
}
