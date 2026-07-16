/**
 * Development seed — creates one admin and eight FICTIONAL male applicants,
 * with applications at different stages, example scores, notes, notifications,
 * a message, and a date invitation.
 *
 * ⚠️  All applicants are fictional. Do NOT use real people.
 * ⚠️  Requires the SERVICE ROLE key. Never run against production.
 *
 *   Usage:  node scripts/seed.mjs
 *   Env:    NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const db = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@theone.example";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "AdminPassw0rd!";
const DEFAULT_PASSWORD = "ApplicantPass1!";

const applicants = [
  { name: "Fictional Applicant — Marcus", city: "Austin", state: "TX", status: "submitted", occupation: "Architect", faith: "Christian", children: false, score: 82 },
  { name: "Fictional Applicant — David", city: "Denver", state: "CO", status: "under_review", occupation: "Physician", faith: "Christian", children: true, score: 88 },
  { name: "Fictional Applicant — Elijah", city: "Nashville", state: "TN", status: "shortlisted", occupation: "Founder", faith: "Christian", children: false, score: 91 },
  { name: "Fictional Applicant — Samuel", city: "Charlotte", state: "NC", status: "approved_to_connect", occupation: "Attorney", faith: "Christian", children: false, score: 86 },
  { name: "Fictional Applicant — Jonah", city: "Dallas", state: "TX", status: "messaging_open", occupation: "Engineer", faith: "Christian", children: false, score: 84 },
  { name: "Fictional Applicant — Aaron", city: "Atlanta", state: "GA", status: "additional_info_requested", occupation: "Professor", faith: "Christian", children: true, score: 77 },
  { name: "Fictional Applicant — Caleb", city: "Phoenix", state: "AZ", status: "draft", occupation: "Consultant", faith: "Spiritual", children: false, score: null },
  { name: "Fictional Applicant — Nathan", city: "Seattle", state: "WA", status: "not_selected", occupation: "Designer", faith: "Christian", children: false, score: 63 },
];

async function ensureUser(email, password, meta) {
  // Try to create; if exists, look it up.
  const { data, error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: meta,
  });
  if (!error) return data.user;
  const { data: list } = await db.auth.admin.listUsers();
  const found = list.users.find((u) => u.email === email);
  if (!found) throw error;
  return found;
}

async function main() {
  console.log("Seeding The One (fictional data)…");

  // Admin
  const admin = await ensureUser(ADMIN_EMAIL, ADMIN_PASSWORD, { full_name: "Platform Admin" });
  await db.from("profiles").update({ role: "admin", full_name: "Platform Admin" }).eq("id", admin.id);
  console.log(`  admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);

  let n = 1;
  for (const a of applicants) {
    const email = `applicant${n}@theone.example`;
    const user = await ensureUser(email, DEFAULT_PASSWORD, { full_name: a.name });

    await db.from("applicant_profiles").upsert({
      applicant_id: user.id,
      legal_first_name: a.name.split("—")[1]?.trim() ?? a.name,
      city: a.city,
      state: a.state,
      country: "USA",
      occupation: a.occupation,
      relationship_status: "Single",
      has_children: a.children,
      age_confirmed_over_min: true,
      short_bio: `Fictional seed applicant for development. ${a.occupation} based in ${a.city}.`,
    });

    const code = `ONE-${String(1000 + n)}`;
    const { data: app } = await db
      .from("applications")
      .upsert(
        {
          applicant_id: user.id,
          status: a.status,
          application_code: code,
          submitted_at: a.status === "draft" ? null : new Date().toISOString(),
          current_step: a.status === "draft" ? 4 : 12,
        },
        { onConflict: "applicant_id" },
      )
      .select()
      .single();

    if (a.score !== null && app) {
      await db.from("compatibility_scores").upsert(
        {
          applicant_id: user.id,
          category_key: "relationship_readiness",
          score: a.score,
          version: 1,
          scored_by: admin.id,
        },
        { onConflict: "applicant_id,category_key,version" },
      );
      await db.from("admin_notes").insert({
        applicant_id: user.id,
        author_id: admin.id,
        body: "Seed note: promising alignment on values (fictional).",
      });
    }

    await db.from("notifications").insert({
      user_id: user.id,
      kind: "status_updated",
      title: "Your application status was updated",
      body: `Status: ${a.status}`,
    });

    // Example messaging + date for the messaging_open applicant.
    if (a.status === "messaging_open") {
      const { data: convo } = await db
        .from("conversations")
        .upsert({ applicant_id: user.id, is_open: true }, { onConflict: "applicant_id" })
        .select()
        .single();
      if (convo) {
        await db.from("messages").insert([
          { conversation_id: convo.id, sender_id: admin.id, body: "Thank you for your thoughtful application." },
          { conversation_id: convo.id, sender_id: user.id, body: "Thank you — I appreciate the opportunity." },
        ]);
      }
      await db.from("date_invitations").insert({
        applicant_id: user.id,
        created_by: admin.id,
        status: "proposed",
        mode: "virtual",
        proposed_at: new Date(Date.now() + 3 * 864e5).toISOString(),
        location_label: "Video call (link shared privately)",
        instructions: "A relaxed 30-minute introductory conversation.",
      });
    }

    console.log(`  applicant ${n}: ${email} / ${DEFAULT_PASSWORD}  [${a.status}]`);
    n++;
  }

  console.log("Done. All applicants are fictional.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
