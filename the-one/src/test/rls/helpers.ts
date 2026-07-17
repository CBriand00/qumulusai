import { Client } from "pg";

/**
 * Helpers for the RLS integration tests. Connects to a Postgres instance that
 * has had bootstrap.sql + 0001_init.sql + 0002_rls.sql applied (see
 * scripts/rls-test.sh). Skipped entirely when RLS_TEST_DB is unset.
 */
export const RLS_DB = process.env.RLS_TEST_DB;

export const IDS = {
  admin: "00000000-0000-0000-0000-0000000000a1",
  app1: "00000000-0000-0000-0000-0000000000b1",
  app2: "00000000-0000-0000-0000-0000000000b2",
};

export async function connect(): Promise<Client> {
  const client = new Client({ connectionString: RLS_DB });
  await client.connect();
  return client;
}

/** Deterministic fixture data, inserted with triggers disabled (superuser). */
export async function seed(client: Client): Promise<void> {
  await client.query("set session_replication_role = replica");
  await client.query(`
    truncate table
      messages, conversations, applicant_flags, compatibility_scores,
      admin_notes, applications, applicant_profiles, profiles, site_content
      restart identity cascade;
    delete from auth.users;
  `);
  await client.query(
    `insert into auth.users (id, email) values ($1,'admin@t'),($2,'a1@t'),($3,'a2@t')`,
    [IDS.admin, IDS.app1, IDS.app2],
  );
  await client.query(
    `insert into profiles (id, role) values ($1,'admin'),($2,'applicant'),($3,'applicant')`,
    [IDS.admin, IDS.app1, IDS.app2],
  );
  await client.query(
    `insert into applications (applicant_id, status) values ($1,'submitted'),($2,'submitted')`,
    [IDS.app1, IDS.app2],
  );
  await client.query(`insert into admin_notes (applicant_id, author_id, body) values ($1,$2,'private')`, [IDS.app1, IDS.admin]);
  await client.query(`insert into compatibility_scores (applicant_id, category_key, score) values ($1,'faith_alignment',80)`, [IDS.app1]);
  await client.query(`insert into applicant_flags (applicant_id, flag) values ($1,'green')`, [IDS.app1]);
  await client.query(`insert into conversations (applicant_id, is_open) values ($1, false)`, [IDS.app1]);
  await client.query(
    `insert into messages (conversation_id, sender_id, body)
     select id, $1, 'hello' from conversations where applicant_id = $2`,
    [IDS.admin, IDS.app1],
  );
  await client.query(`insert into site_content (key, value) values ('tagline', '"public"'::jsonb)`);
  await client.query("set session_replication_role = origin");
}

/**
 * Run `fn` inside a transaction acting as a given role + user (PostgREST-style
 * GUCs). Always rolls back so assertions don't mutate fixtures.
 */
export async function asUser<T>(
  client: Client,
  role: "anon" | "authenticated",
  userId: string | null,
  fn: (c: Client) => Promise<T>,
): Promise<T> {
  await client.query("begin");
  try {
    await client.query(`set local role ${role}`);
    await client.query(`select set_config('request.jwt.claim.role', $1, true)`, [role]);
    await client.query(`select set_config('request.jwt.claim.sub', $1, true)`, [userId ?? ""]);
    return await fn(client);
  } finally {
    await client.query("rollback");
  }
}
