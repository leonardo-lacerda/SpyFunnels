import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(__dirname, "..", "migrations");
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();

await client.query(`
  create table if not exists schema_migrations (
    id serial primary key,
    file_name text unique not null,
    applied_at timestamptz not null default now()
  )
`);

const files = (await fs.readdir(migrationsDir)).filter((file) => file.endsWith(".sql")).sort();

for (const file of files) {
  const existing = await client.query("select 1 from schema_migrations where file_name = $1", [file]);
  if (existing.rowCount) {
    console.log(`Skipping migration ${file}`);
    continue;
  }
  const sql = await fs.readFile(path.join(migrationsDir, file), "utf8");
  console.log(`Applying migration ${file}`);
  await client.query("begin");
  try {
    await client.query(sql);
    await client.query("insert into schema_migrations (file_name) values ($1)", [file]);
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}

await client.end();
console.log("Migrations complete");
