import "dotenv/config";
import { createHash, randomUUID } from "node:crypto";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "admin@local").toLowerCase();
const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "admin1234567890";
const orgName = process.env.SEED_ORG_NAME ?? "Primary Workspace";
const resetOrgData = process.env.SEED_RESET_ORG_DATA !== "false";

const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();

const q = (sql, params = []) => client.query(sql, params);
const one = async (sql, params = []) => (await q(sql, params)).rows[0] ?? null;

async function ensureOrganization(name) {
  const existing = await one("select id, name from organizations where name = $1 order by created_at asc limit 1", [name]);
  if (existing) return existing;

  const id = randomUUID();
  await q(
    "insert into organizations (id, name, plan, status) values ($1, $2, $3, $4)",
    [id, name, "pro", "active"]
  );
  return { id, name };
}

async function ensureUser(email, password) {
  const passwordHash = createHash("sha256").update(password).digest("hex");
  await q(
    `insert into users (id, email, password_hash, status)
     values (gen_random_uuid(), $1, $2, 'active')
     on conflict (email) do update set password_hash = excluded.password_hash, status = excluded.status`,
    [email, passwordHash]
  );
  return one("select id, email from users where email = $1 limit 1", [email]);
}

async function ensureMembership(orgId, userId) {
  await q(
    `insert into memberships (org_id, user_id, role)
     values ($1, $2, 'owner')
     on conflict (org_id, user_id) do update set role = excluded.role`,
    [orgId, userId]
  );
}

async function clearOrganizationData(orgId) {
  await q("delete from reports where org_id = $1", [orgId]);
  await q("delete from inboxes where org_id = $1", [orgId]);
  await q("delete from sim_identities where org_id = $1", [orgId]);
  await q("delete from simulation_profiles where org_id = $1", [orgId]);
  await q("delete from competitors where org_id = $1", [orgId]);
}

try {
  const org = await ensureOrganization(orgName);
  const user = await ensureUser(adminEmail, adminPassword);

  if (!user?.id) {
    throw new Error("Failed to upsert admin user");
  }

  await ensureMembership(org.id, user.id);

  if (resetOrgData) {
    await clearOrganizationData(org.id);
  }

  console.log(
    `Seed complete for org ${org.id}. Mock competitor data ${resetOrgData ? "removed" : "preserved"}.
Admin login: ${adminEmail}`
  );
} finally {
  await client.end();
}
