import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Download-my-data: returns a JSON copy of the signed-in user's submitted
 * information. All reads are RLS-scoped to the caller, so this only ever
 * returns the requester's own data.
 */
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: appRow } = await supabase
    .from("applications")
    .select("*")
    .eq("applicant_id", user.id)
    .maybeSingle<{ id: string } & Record<string, unknown>>();

  const [profile, answers, media, consents, notifications] = await Promise.all([
    supabase.from("applicant_profiles").select("*").eq("applicant_id", user.id).maybeSingle(),
    appRow
      ? supabase.from("application_answers").select("question_key, value_text, value_number, value_bool").eq("application_id", appRow.id)
      : Promise.resolve({ data: [] }),
    supabase.from("applicant_media").select("kind, storage_path, created_at").eq("applicant_id", user.id),
    supabase.from("consent_records").select("consent_key, consented, typed_name, created_at").eq("user_id", user.id),
    supabase.from("notifications").select("kind, title, body, created_at").eq("user_id", user.id),
  ]);

  const payload = {
    exported_at: new Date().toISOString(),
    account: { id: user.id, email: user.email },
    profile: profile.data ?? null,
    application: appRow ?? null,
    answers: answers.data ?? [],
    media: media.data ?? [],
    consents: consents.data ?? [],
    notifications: notifications.data ?? [],
  };

  // Record the export request for the audit trail.
  await supabase.from("data_export_requests").insert({ user_id: user.id, status: "delivered" });

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="the-one-my-data.json"`,
    },
  });
}
