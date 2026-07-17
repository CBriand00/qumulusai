import "server-only";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { computeOverallScore, type CategoryScore } from "@/config/compatibility";
import { ageFromDob } from "@/lib/utils";
import type { ApplicantStatus } from "@/config/site";

export interface ApplicantListFilters {
  search?: string;
  status?: string;
  faith?: string;
  children?: "yes" | "no";
  hasVideo?: boolean;
  favoritesOnly?: boolean;
  minScore?: number;
  sort?:
    | "newest"
    | "oldest"
    | "recently_active"
    | "highest_compatibility"
    | "most_complete"
    | "favorites";
}

export interface ApplicantRow {
  applicantId: string;
  applicationId: string | null;
  name: string;
  age: number | null;
  city: string | null;
  occupation: string | null;
  faith: string | null;
  hasChildren: boolean | null;
  status: ApplicantStatus;
  overallScore: number | null;
  greenFlags: number;
  concerns: number;
  hasVideo: boolean;
  isFavorite: boolean;
  submittedAt: string | null;
  lastActivity: string | null;
  photoUrl: string | null;
}

async function signedPrimaryPhotoUrls(
  supabase: ReturnType<typeof createClient>,
  paths: { applicantId: string; storage_path: string }[],
) {
  const map = new Map<string, string>();
  await Promise.all(
    paths.map(async (p) => {
      const { data } = await supabase.storage
        .from("applicant-media")
        .createSignedUrl(p.storage_path, 60 * 30);
      if (data?.signedUrl) map.set(p.applicantId, data.signedUrl);
    }),
  );
  return map;
}

/** List all applicants for the admin review table, filtered and sorted. */
export async function listApplicants(filters: ApplicantListFilters): Promise<ApplicantRow[]> {
  const admin = await requireRole("admin");
  const supabase = createClient();

  const { data: applications } = await supabase
    .from("applications")
    .select("id, applicant_id, status, current_step, submitted_at, updated_at")
    .returns<
      {
        id: string;
        applicant_id: string;
        status: ApplicantStatus;
        current_step: number;
        submitted_at: string | null;
        updated_at: string;
      }[]
    >();

  const apps = applications ?? [];
  const ids = apps.map((a) => a.applicant_id);
  if (ids.length === 0) return [];

  const [{ data: profiles }, { data: baseProfiles }, { data: answers }, { data: media }, { data: scores }, { data: flags }, { data: favorites }] =
    await Promise.all([
      supabase.from("applicant_profiles").select("applicant_id, city, occupation, date_of_birth, has_children").in("applicant_id", ids).returns<{ applicant_id: string; city: string | null; occupation: string | null; date_of_birth: string | null; has_children: boolean | null }[]>(),
      supabase.from("profiles").select("id, full_name").in("id", ids).returns<{ id: string; full_name: string | null }[]>(),
      supabase.from("application_answers").select("application_id, question_key, value_text").eq("question_key", "faith_identification").returns<{ application_id: string; question_key: string; value_text: string | null }[]>(),
      supabase.from("applicant_media").select("applicant_id, kind, storage_path").in("applicant_id", ids).returns<{ applicant_id: string; kind: string; storage_path: string }[]>(),
      supabase.from("compatibility_scores").select("applicant_id, category_key, score, override_score").in("applicant_id", ids).returns<{ applicant_id: string; category_key: string; score: number | null; override_score: number | null }[]>(),
      supabase.from("applicant_flags").select("applicant_id, flag").in("applicant_id", ids).returns<{ applicant_id: string; flag: string }[]>(),
      supabase.from("favorites").select("applicant_id").eq("admin_id", admin.id).returns<{ applicant_id: string }[]>(),
    ]);

  const profileByaId = new Map((profiles ?? []).map((p) => [p.applicant_id, p]));
  const nameById = new Map((baseProfiles ?? []).map((p) => [p.id, p.full_name]));
  const appIdToaId = new Map(apps.map((a) => [a.id, a.applicant_id]));
  const faithByaId = new Map<string, string>();
  for (const a of answers ?? []) {
    const aId = appIdToaId.get(a.application_id);
    if (aId && a.value_text) faithByaId.set(aId, a.value_text);
  }

  const primaryByaId: { applicantId: string; storage_path: string }[] = [];
  const videoSet = new Set<string>();
  for (const m of media ?? []) {
    if (m.kind === "primary_photo") primaryByaId.push({ applicantId: m.applicant_id, storage_path: m.storage_path });
    if (m.kind === "video_intro") videoSet.add(m.applicant_id);
  }
  const photoMap = await signedPrimaryPhotoUrls(supabase, primaryByaId);

  const scoresByaId = new Map<string, CategoryScore[]>();
  for (const s of scores ?? []) {
    const list = scoresByaId.get(s.applicant_id) ?? [];
    list.push({ key: s.category_key, score: s.score, override: s.override_score });
    scoresByaId.set(s.applicant_id, list);
  }

  const flagCounts = new Map<string, { green: number; concern: number }>();
  for (const f of flags ?? []) {
    const c = flagCounts.get(f.applicant_id) ?? { green: 0, concern: 0 };
    if (f.flag === "green") c.green++;
    else c.concern++;
    flagCounts.set(f.applicant_id, c);
  }

  const favoriteSet = new Set((favorites ?? []).map((f) => f.applicant_id));

  let rows: ApplicantRow[] = apps.map((a) => {
    const prof = profileByaId.get(a.applicant_id);
    const fc = flagCounts.get(a.applicant_id) ?? { green: 0, concern: 0 };
    return {
      applicantId: a.applicant_id,
      applicationId: a.id,
      name: nameById.get(a.applicant_id) ?? "Applicant",
      age: prof?.date_of_birth ? ageFromDob(prof.date_of_birth) : null,
      city: prof?.city ?? null,
      occupation: prof?.occupation ?? null,
      faith: faithByaId.get(a.applicant_id) ?? null,
      hasChildren: prof?.has_children ?? null,
      status: a.status,
      overallScore: computeOverallScore(scoresByaId.get(a.applicant_id) ?? []),
      greenFlags: fc.green,
      concerns: fc.concern,
      hasVideo: videoSet.has(a.applicant_id),
      isFavorite: favoriteSet.has(a.applicant_id),
      submittedAt: a.submitted_at,
      lastActivity: a.updated_at,
      photoUrl: photoMap.get(a.applicant_id) ?? null,
    };
  });

  // Filters (applied in-memory over the joined rows).
  const f = filters;
  if (f.search) {
    const q = f.search.toLowerCase();
    rows = rows.filter((r) =>
      [r.name, r.city, r.occupation].some((v) => v?.toLowerCase().includes(q)),
    );
  }
  if (f.status) rows = rows.filter((r) => r.status === f.status);
  if (f.faith) rows = rows.filter((r) => r.faith?.toLowerCase().includes(f.faith!.toLowerCase()));
  if (f.children === "yes") rows = rows.filter((r) => r.hasChildren === true);
  if (f.children === "no") rows = rows.filter((r) => r.hasChildren === false);
  if (f.hasVideo) rows = rows.filter((r) => r.hasVideo);
  if (f.favoritesOnly) rows = rows.filter((r) => r.isFavorite);
  if (typeof f.minScore === "number") rows = rows.filter((r) => (r.overallScore ?? -1) >= f.minScore!);

  // Sorting.
  const bySubmitted = (r: ApplicantRow) => r.submittedAt ?? "";
  switch (f.sort) {
    case "oldest": rows.sort((a, b) => bySubmitted(a).localeCompare(bySubmitted(b))); break;
    case "recently_active": rows.sort((a, b) => (b.lastActivity ?? "").localeCompare(a.lastActivity ?? "")); break;
    case "highest_compatibility": rows.sort((a, b) => (b.overallScore ?? -1) - (a.overallScore ?? -1)); break;
    case "favorites": rows.sort((a, b) => Number(b.isFavorite) - Number(a.isFavorite)); break;
    case "newest":
    default: rows.sort((a, b) => bySubmitted(b).localeCompare(bySubmitted(a)));
  }

  return rows;
}

export interface ApplicantDetail {
  applicantId: string;
  applicationId: string | null;
  name: string;
  email: string | null;
  status: ApplicantStatus;
  profile: Record<string, unknown> | null;
  answers: Record<string, string | number | boolean | null>;
  media: { id: string; kind: string; url: string | null }[];
  scores: { key: string; score: number | null; override: number | null; notes: string | null }[];
  overallScore: number | null;
  notes: { id: string; body: string; created_at: string }[];
  flags: { id: string; flag: string; label: string | null }[];
  isFavorite: boolean;
  verification: string;
  statusHistory: { to_status: string; from_status: string | null; reason: string | null; created_at: string }[];
  aiAnalysis: { id: string; kind: string; content: unknown; model: string | null; created_at: string }[];
}

/** Full applicant record for the admin detail page. */
export async function getApplicantDetail(applicantId: string): Promise<ApplicantDetail | null> {
  const admin = await requireRole("admin");
  const supabase = createClient();

  const { data: app } = await supabase
    .from("applications")
    .select("id, status")
    .eq("applicant_id", applicantId)
    .maybeSingle<{ id: string; status: ApplicantStatus }>();

  const { data: baseProfile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", applicantId)
    .maybeSingle<{ full_name: string | null }>();

  const [{ data: profile }, { data: answers }, { data: media }, { data: scores }, { data: notes }, { data: flags }, { data: fav }, { data: verification }, { data: history }, { data: ai }] =
    await Promise.all([
      supabase.from("applicant_profiles").select("*").eq("applicant_id", applicantId).maybeSingle<Record<string, unknown>>(),
      app ? supabase.from("application_answers").select("question_key, value_text, value_number, value_bool").eq("application_id", app.id).returns<{ question_key: string; value_text: string | null; value_number: number | null; value_bool: boolean | null }[]>() : Promise.resolve({ data: [] as never[] }),
      supabase.from("applicant_media").select("id, kind, storage_path").eq("applicant_id", applicantId).order("sort_order").returns<{ id: string; kind: string; storage_path: string }[]>(),
      supabase.from("compatibility_scores").select("category_key, score, override_score, notes").eq("applicant_id", applicantId).returns<{ category_key: string; score: number | null; override_score: number | null; notes: string | null }[]>(),
      supabase.from("admin_notes").select("id, body, created_at").eq("applicant_id", applicantId).order("created_at", { ascending: false }).returns<{ id: string; body: string; created_at: string }[]>(),
      supabase.from("applicant_flags").select("id, flag, label").eq("applicant_id", applicantId).returns<{ id: string; flag: string; label: string | null }[]>(),
      supabase.from("favorites").select("applicant_id").eq("admin_id", admin.id).eq("applicant_id", applicantId).maybeSingle<{ applicant_id: string }>(),
      supabase.from("verification_records").select("status").eq("applicant_id", applicantId).order("created_at", { ascending: false }).limit(1).maybeSingle<{ status: string }>(),
      app ? supabase.from("status_history").select("to_status, from_status, reason, created_at").eq("application_id", app.id).order("created_at", { ascending: false }).returns<{ to_status: string; from_status: string | null; reason: string | null; created_at: string }[]>() : Promise.resolve({ data: [] as never[] }),
      supabase.from("ai_analysis").select("id, kind, content, model, created_at").eq("applicant_id", applicantId).order("created_at", { ascending: false }).returns<{ id: string; kind: string; content: unknown; model: string | null; created_at: string }[]>(),
    ]);

  const flatAnswers: Record<string, string | number | boolean | null> = {};
  for (const a of answers ?? []) {
    flatAnswers[a.question_key] = a.value_text ?? a.value_number ?? a.value_bool;
  }

  const mediaWithUrls = await Promise.all(
    (media ?? []).map(async (m) => {
      const { data } = await supabase.storage.from("applicant-media").createSignedUrl(m.storage_path, 60 * 30);
      return { id: m.id, kind: m.kind, url: data?.signedUrl ?? null };
    }),
  );

  const scoreList = (scores ?? []).map((s) => ({ key: s.category_key, score: s.score, override: s.override_score, notes: s.notes }));

  return {
    applicantId,
    applicationId: app?.id ?? null,
    name: baseProfile?.full_name ?? "Applicant",
    email: null, // email is intentionally not surfaced in review UI
    status: app?.status ?? "draft",
    profile: profile ?? null,
    answers: flatAnswers,
    media: mediaWithUrls,
    scores: scoreList,
    overallScore: computeOverallScore(scoreList.map((s) => ({ key: s.key, score: s.score, override: s.override }))),
    notes: notes ?? [],
    flags: flags ?? [],
    isFavorite: Boolean(fav),
    verification: verification?.status ?? "unverified",
    statusHistory: history ?? [],
    aiAnalysis: ai ?? [],
  };
}
