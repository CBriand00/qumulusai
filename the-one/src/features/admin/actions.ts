"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";
import type { ApplicantStatus } from "@/config/site";
import { APPLICANT_STATUS_LABELS } from "@/config/site";

export interface AdminResult {
  ok: boolean;
  message?: string;
}

/** Append an audit-log entry (best effort; never blocks the action). */
async function audit(action: string, entityId: string, metadata?: Record<string, unknown>) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from("audit_logs").insert({
      actor_id: user?.id ?? null,
      action,
      entity: "applicant",
      entity_id: entityId,
      metadata: metadata ?? null,
    });
  } catch {
    /* non-fatal */
  }
}

async function notify(userId: string, kind: string, title: string, body?: string) {
  const supabase = createClient();
  await supabase.from("notifications").insert({ user_id: userId, kind, title, body: body ?? null });
}

/** Change an applicant's status, record history, notify, and audit. */
export async function setApplicantStatus(
  applicantId: string,
  toStatus: ApplicantStatus,
  reason?: string,
): Promise<AdminResult> {
  const admin = await requireRole("admin");
  const supabase = createClient();

  const { data: app } = await supabase
    .from("applications")
    .select("id, status")
    .eq("applicant_id", applicantId)
    .maybeSingle<{ id: string; status: ApplicantStatus }>();
  if (!app) return { ok: false, message: "Application not found." };

  const { error } = await supabase
    .from("applications")
    .update({ status: toStatus })
    .eq("id", app.id);
  if (error) return { ok: false, message: error.message };

  await supabase.from("status_history").insert({
    application_id: app.id,
    from_status: app.status,
    to_status: toStatus,
    changed_by: admin.id,
    reason: reason ?? null,
  });

  // Applicant-facing, respectful notification (never internal language).
  await notify(
    applicantId,
    "status_updated",
    "Your application status was updated",
    `Status: ${APPLICANT_STATUS_LABELS[toStatus]}.`,
  );
  await audit("status_change", applicantId, { to: toStatus, reason });

  revalidatePath("/admin/applicants");
  revalidatePath(`/admin/applicants/${applicantId}`);
  return { ok: true };
}

/** Open (or close) messaging for an applicant. */
export async function setMessaging(applicantId: string, open: boolean): Promise<AdminResult> {
  const supabase = createClient();
  const { error } = await supabase
    .from("conversations")
    .upsert({ applicant_id: applicantId, is_open: open }, { onConflict: "applicant_id" });
  if (error) return { ok: false, message: error.message };

  if (open) {
    await setApplicantStatus(applicantId, "messaging_open", "Messaging unlocked.");
    await notify(applicantId, "messaging_unlocked", "You've been invited to connect", "Messaging is now open.");
  }
  await audit(open ? "messaging_open" : "messaging_close", applicantId);
  revalidatePath(`/admin/applicants/${applicantId}`);
  return { ok: true };
}

export async function toggleFavorite(applicantId: string): Promise<AdminResult> {
  const admin = await requireRole("admin");
  const supabase = createClient();
  const { data: existing } = await supabase
    .from("favorites")
    .select("applicant_id")
    .eq("admin_id", admin.id)
    .eq("applicant_id", applicantId)
    .maybeSingle<{ applicant_id: string }>();

  if (existing) {
    await supabase.from("favorites").delete().eq("admin_id", admin.id).eq("applicant_id", applicantId);
  } else {
    await supabase.from("favorites").insert({ admin_id: admin.id, applicant_id: applicantId });
  }
  revalidatePath("/admin/applicants");
  revalidatePath(`/admin/applicants/${applicantId}`);
  return { ok: true };
}

export async function addNote(applicantId: string, body: string): Promise<AdminResult> {
  const admin = await requireRole("admin");
  if (!body.trim()) return { ok: false, message: "Note cannot be empty." };
  const supabase = createClient();
  const { error } = await supabase
    .from("admin_notes")
    .insert({ applicant_id: applicantId, author_id: admin.id, body: body.trim() });
  if (error) return { ok: false, message: error.message };
  await audit("note_added", applicantId);
  revalidatePath(`/admin/applicants/${applicantId}`);
  return { ok: true };
}

export async function addFlag(
  applicantId: string,
  flag: "green" | "concern" | "red" | "contradiction",
  label?: string,
): Promise<AdminResult> {
  const admin = await requireRole("admin");
  const supabase = createClient();
  const { error } = await supabase
    .from("applicant_flags")
    .insert({ applicant_id: applicantId, flag, label: label ?? null, created_by: admin.id });
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/admin/applicants/${applicantId}`);
  return { ok: true };
}

export async function removeFlag(flagId: string, applicantId: string): Promise<AdminResult> {
  await requireRole("admin");
  const supabase = createClient();
  await supabase.from("applicant_flags").delete().eq("id", flagId);
  revalidatePath(`/admin/applicants/${applicantId}`);
  return { ok: true };
}

/** Request additional information — flips status and notifies the applicant. */
export async function requestInformation(applicantId: string, message: string): Promise<AdminResult> {
  const res = await setApplicantStatus(applicantId, "additional_info_requested", "Additional information requested.");
  if (!res.ok) return res;
  await notify(
    applicantId,
    "info_requested",
    "More information requested",
    message.trim() || "Please review your application and provide additional information.",
  );
  return { ok: true };
}

/** Save/override compatibility scores for a category. */
export async function saveCategoryScore(input: {
  applicantId: string;
  categoryKey: string;
  score: number | null;
  override: number | null;
  notes?: string;
}): Promise<AdminResult> {
  const admin = await requireRole("admin");
  const supabase = createClient();
  const { error } = await supabase.from("compatibility_scores").upsert(
    {
      applicant_id: input.applicantId,
      category_key: input.categoryKey,
      score: input.score,
      override_score: input.override,
      notes: input.notes ?? null,
      version: 1,
      scored_by: admin.id,
    },
    { onConflict: "applicant_id,category_key,version" },
  );
  if (error) return { ok: false, message: error.message };
  await audit("score_saved", input.applicantId, { category: input.categoryKey });
  revalidatePath(`/admin/applicants/${input.applicantId}`);
  return { ok: true };
}

/** Permanently delete an applicant and all their data (service role). */
export async function deleteApplicant(applicantId: string): Promise<AdminResult> {
  await requireRole("admin");
  try {
    const admin = createAdminClient();
    // Deleting the auth user cascades to all FK-linked applicant data.
    const { error } = await admin.auth.admin.deleteUser(applicantId);
    if (error) return { ok: false, message: error.message };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Deletion failed." };
  }
  await audit("applicant_deleted", applicantId);
  revalidatePath("/admin/applicants");
  return { ok: true };
}
