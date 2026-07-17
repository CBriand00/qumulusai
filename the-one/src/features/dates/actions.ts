"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole, requireUser } from "@/lib/auth";
import { insertNotification, emailUser } from "@/lib/notify";
import { dateInvitationEmail, dateUpdatedEmail } from "@/lib/email/templates";
import { setApplicantStatus } from "@/features/admin/actions";

export interface DateResult {
  ok: boolean;
  message?: string;
}

/** Admin proposes a date. Home addresses are never used as a location label. */
export async function createDateInvitation(
  applicantId: string,
  input: {
    mode: "virtual" | "in_person";
    proposedAt: string;
    locationLabel?: string;
    instructions?: string;
    responseDeadline?: string;
  },
): Promise<DateResult> {
  const admin = await requireRole("admin");
  const supabase = createClient();

  const { error } = await supabase.from("date_invitations").insert({
    applicant_id: applicantId,
    created_by: admin.id,
    status: "proposed",
    mode: input.mode,
    proposed_at: input.proposedAt || null,
    location_label: input.locationLabel || null,
    instructions: input.instructions || null,
    response_deadline: input.responseDeadline || null,
  });
  if (error) return { ok: false, message: error.message };

  await setApplicantStatus(applicantId, "date_invited", "Date invitation sent.");
  await insertNotification(applicantId, "date_invitation", "You've received a date invitation", "Please sign in to view and respond.");
  await emailUser(applicantId, (email) => dateInvitationEmail(email));

  revalidatePath(`/admin/applicants/${applicantId}`);
  revalidatePath("/admin/dates");
  revalidatePath("/dashboard/dates");
  return { ok: true };
}

/** Applicant responds to a date invitation. */
export async function respondToDate(
  dateId: string,
  response: "accepted" | "declined" | "counter_proposed",
  note?: string,
): Promise<DateResult> {
  const user = await requireUser();
  const supabase = createClient();

  const { data: inv } = await supabase
    .from("date_invitations")
    .select("id, applicant_id")
    .eq("id", dateId)
    .maybeSingle<{ id: string; applicant_id: string }>();
  if (!inv || inv.applicant_id !== user.id) return { ok: false, message: "Not found." };

  const { error } = await supabase
    .from("date_invitations")
    .update({ status: response, applicant_response: note?.trim() || null })
    .eq("id", dateId);
  if (error) return { ok: false, message: error.message };

  const { data: admins } = await supabase.from("profiles").select("id").eq("role", "admin").returns<{ id: string }[]>();
  for (const a of admins ?? []) {
    await insertNotification(a.id, "date_updated", `A date invitation was ${response.replace("_", " ")}`);
  }
  revalidatePath("/dashboard/dates");
  revalidatePath("/admin/dates");
  return { ok: true };
}

/** Admin updates a date: reschedule, cancel, complete, or add post-date notes. */
export async function updateDateInvitation(
  dateId: string,
  patch: {
    status?: "proposed" | "cancelled" | "completed";
    proposedAt?: string;
    adminPostNotes?: string;
  },
): Promise<DateResult> {
  await requireRole("admin");
  const supabase = createClient();

  const { data: inv } = await supabase
    .from("date_invitations")
    .select("applicant_id")
    .eq("id", dateId)
    .maybeSingle<{ applicant_id: string }>();
  if (!inv) return { ok: false, message: "Not found." };

  const update: Record<string, unknown> = {};
  if (patch.status) update.status = patch.status;
  if (patch.proposedAt !== undefined) update.proposed_at = patch.proposedAt || null;
  if (patch.adminPostNotes !== undefined) update.admin_post_notes = patch.adminPostNotes || null;

  const { error } = await supabase.from("date_invitations").update(update).eq("id", dateId);
  if (error) return { ok: false, message: error.message };

  if (patch.status === "cancelled") {
    await insertNotification(inv.applicant_id, "date_cancelled", "A date invitation was cancelled");
    await emailUser(inv.applicant_id, (email) => dateUpdatedEmail(email, "cancelled"));
  } else if (patch.proposedAt) {
    await insertNotification(inv.applicant_id, "date_updated", "A date invitation was updated");
    await emailUser(inv.applicant_id, (email) => dateUpdatedEmail(email, "updated"));
  }

  revalidatePath("/admin/dates");
  revalidatePath("/dashboard/dates");
  return { ok: true };
}
