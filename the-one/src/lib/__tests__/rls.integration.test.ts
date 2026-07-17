import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Client } from "pg";
import { RLS_DB, IDS, connect, seed, asUser } from "@/test/rls/helpers";

/**
 * Live-database RLS enforcement tests. These require a Postgres instance with
 * the app migrations applied; run them with `npm run test:rls` (which boots a
 * throwaway Postgres in Docker). Skipped automatically in the normal unit run.
 */
const describeRls = RLS_DB ? describe : describe.skip;

describeRls("Row Level Security", () => {
  let db: Client;

  beforeAll(async () => {
    db = await connect();
    await seed(db);
  });
  afterAll(async () => {
    await db?.end();
  });

  it("applicant sees only their own application", async () => {
    const rows = await asUser(db, "authenticated", IDS.app1, async (c) => {
      const r = await c.query("select applicant_id from applications");
      return r.rows;
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].applicant_id).toBe(IDS.app1);
  });

  it("admin sees all applications", async () => {
    const count = await asUser(db, "authenticated", IDS.admin, async (c) => {
      const r = await c.query("select count(*)::int as n from applications");
      return r.rows[0].n;
    });
    expect(count).toBe(2);
  });

  it("applicant cannot read admin notes", async () => {
    const rows = await asUser(db, "authenticated", IDS.app1, async (c) => {
      const r = await c.query("select * from admin_notes");
      return r.rows;
    });
    expect(rows).toHaveLength(0);
  });

  it("applicant cannot read compatibility scores or flags", async () => {
    const [scores, flags] = await asUser(db, "authenticated", IDS.app1, async (c) => {
      const s = await c.query("select * from compatibility_scores");
      const f = await c.query("select * from applicant_flags");
      return [s.rows, f.rows];
    });
    expect(scores).toHaveLength(0);
    expect(flags).toHaveLength(0);
  });

  it("applicant cannot read another applicant's conversation or messages", async () => {
    const [convos, msgs] = await asUser(db, "authenticated", IDS.app2, async (c) => {
      const cv = await c.query("select * from conversations");
      const m = await c.query("select * from messages");
      return [cv.rows, m.rows];
    });
    // app2 has no conversation of its own and cannot see app1's.
    expect(convos).toHaveLength(0);
    expect(msgs).toHaveLength(0);
  });

  it("blocks role escalation via the guard trigger", async () => {
    await expect(
      asUser(db, "authenticated", IDS.app1, (c) =>
        c.query("update profiles set role = 'admin' where id = $1", [IDS.app1]),
      ),
    ).rejects.toThrow(/not authorized/i);
  });

  it("prevents sending a message while the conversation is closed", async () => {
    await expect(
      asUser(db, "authenticated", IDS.app1, async (c) => {
        const convo = await c.query("select id from conversations where applicant_id = $1", [IDS.app1]);
        // app1 can't even see the closed conversation row, so this insert fails
        // the RLS WITH CHECK (no open conversation for them).
        return c.query("insert into messages (conversation_id, sender_id, body) values ($1,$2,'x')", [
          convo.rows[0]?.id ?? "00000000-0000-0000-0000-000000000000",
          IDS.app1,
        ]);
      }),
    ).rejects.toThrow(/row-level security|violates/i);
  });

  it("exposes public site content to anonymous visitors", async () => {
    const rows = await asUser(db, "anon", null, async (c) => {
      const r = await c.query("select key from site_content");
      return r.rows;
    });
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });

  it("auto-creates an APPLICANT profile on signup (never admin)", async () => {
    const newId = "00000000-0000-0000-0000-0000000000c9";
    // Triggers enabled: inserting an auth user fires handle_new_user.
    await db.query("delete from auth.users where id = $1", [newId]);
    await db.query("insert into auth.users (id, email, raw_user_meta_data) values ($1,'new@t','{}'::jsonb)", [newId]);
    const r = await db.query("select role from profiles where id = $1", [newId]);
    expect(r.rows[0]?.role).toBe("applicant");
  });
});
