import "server-only";

import { createClient } from "@/lib/supabase/server";
import { requireRole, requireUser } from "@/lib/auth";

export interface DateInvitation {
  id: string;
  applicantId: string;
  status: string;
  mode: string;
  proposedAt: string | null;
  locationLabel: string | null;
  instructions: string | null;
  responseDeadline: string | null;
  applicantResponse: string | null;
  adminPostNotes: string | null;
}

function mapRow(r: Record<string, unknown>): DateInvitation {
  return {
    id: r.id as string,
    applicantId: r.applicant_id as string,
    status: r.status as string,
    mode: r.mode as string,
    proposedAt: (r.proposed_at as string) ?? null,
    locationLabel: (r.location_label as string) ?? null,
    instructions: (r.instructions as string) ?? null,
    responseDeadline: (r.response_deadline as string) ?? null,
    applicantResponse: (r.applicant_response as string) ?? null,
    adminPostNotes: (r.admin_post_notes as string) ?? null,
  };
}

const SELECT = "id, applicant_id, status, mode, proposed_at, location_label, instructions, response_deadline, applicant_response, admin_post_notes";

/** The signed-in applicant's date invitations. */
export async function loadMyDates(): Promise<DateInvitation[]> {
  const user = await requireUser();
  const supabase = createClient();
  const { data } = await supabase
    .from("date_invitations")
    .select(SELECT)
    .eq("applicant_id", user.id)
    .order("created_at", { ascending: false })
    .returns<Record<string, unknown>[]>();
  return (data ?? []).map(mapRow);
}

/** All date invitations, for the admin, with applicant names. */
export async function adminListDates(): Promise<(DateInvitation & { name: string })[]> {
  await requireRole("admin");
  const supabase = createClient();
  const { data } = await supabase
    .from("date_invitations")
    .select(SELECT)
    .order("created_at", { ascending: false })
    .returns<Record<string, unknown>[]>();
  const rows = (data ?? []).map(mapRow);

  const ids = Array.from(new Set(rows.map((r) => r.applicantId)));
  const nameById = new Map<string, string>();
  if (ids.length) {
    const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", ids).returns<{ id: string; full_name: string | null }[]>();
    for (const p of profiles ?? []) nameById.set(p.id, p.full_name ?? "Applicant");
  }
  return rows.map((r) => ({ ...r, name: nameById.get(r.applicantId) ?? "Applicant" }));
}

/** Invitations for a specific applicant, for the admin detail view. */
export async function adminDatesForApplicant(applicantId: string): Promise<DateInvitation[]> {
  await requireRole("admin");
  const supabase = createClient();
  const { data } = await supabase
    .from("date_invitations")
    .select(SELECT)
    .eq("applicant_id", applicantId)
    .order("created_at", { ascending: false })
    .returns<Record<string, unknown>[]>();
  return (data ?? []).map(mapRow);
}
