// scripts/migrate.mjs
import fs from "fs";
import path from "path";
import pkg from "pg";

const { Pool } = pkg;

async function run() {
  const sqlPath = path.resolve("db/migrations.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await pool.query(sql);
    console.log("✅ Migrations applied");
  } catch (e) {
    console.error("❌ Migration failed", e);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
