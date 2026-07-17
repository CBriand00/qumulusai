"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import {
  applicationSteps,
  editableAfterSubmit,
  type Field,
} from "@/config/application-schema";
import { validateStep, type StepValues } from "@/lib/validation/application";
import { platformRules } from "@/config/site";
import { getEmailProvider } from "@/lib/email/provider";
import { applicationSubmittedEmail } from "@/lib/email/templates";

const PROFILE_FIELDS: Field[] = applicationSteps
  .flatMap((s) => s.fields)
  .filter((f) => f.profileColumn);

const ANSWER_FIELDS: Field[] = applicationSteps
  .flatMap((s) => s.fields)
  .filter((f) => !f.profileColumn);

function coerce(field: Field, value: unknown) {
  if (value === "" || value === undefined || value === null) return null;
  if (field.type === "number" || field.type === "scale") return Number(value);
  if (field.type === "boolean") return value === true || value === "true" || value === "on";
  return String(value);
}

/** Ensure the signed-in applicant has an application row; returns its id. */
export async function ensureApplication(): Promise<string> {
  const user = await requireUser();
  const supabase = createClient();

  const { data: existing } = await supabase
    .from("applications")
    .select("id")
    .eq("applicant_id", user.id)
    .maybeSingle<{ id: string }>();
  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("applications")
    .insert({ applicant_id: user.id, status: "draft", current_step: 1 })
    .select("id")
    .single<{ id: string }>();
  if (error) throw new Error(error.message);
  return created.id;
}

export interface LoadedApplication {
  applicationId: string;
  status: string;
  currentStep: number;
  locked: boolean;
  values: StepValues;
  media: { id: string; kind: string; storage_path: string; url: string | null }[];
}

/** Load the applicant's draft/submitted application, flattened for the form. */
export async function loadApplication(): Promise<LoadedApplication> {
  const user = await requireUser();
  const supabase = createClient();
  const applicationId = await ensureApplication();

  const [{ data: app }, { data: profile }, { data: answers }, { data: media }] =
    await Promise.all([
      supabase
        .from("applications")
        .select("status, current_step, locked_at")
        .eq("id", applicationId)
        .single<{ status: string; current_step: number; locked_at: string | null }>(),
      supabase
        .from("applicant_profiles")
        .select("*")
        .eq("applicant_id", user.id)
        .maybeSingle<Record<string, unknown>>(),
      supabase
        .from("application_answers")
        .select("question_key, value_text, value_number, value_bool")
        .eq("application_id", applicationId)
        .returns<
          { question_key: string; value_text: string | null; value_number: number | null; value_bool: boolean | null }[]
        >(),
      supabase
        .from("applicant_media")
        .select("id, kind, storage_path")
        .eq("applicant_id", user.id)
        .order("sort_order")
        .returns<{ id: string; kind: string; storage_path: string }[]>(),
    ]);

  const values: StepValues = {};
  if (profile) {
    for (const f of PROFILE_FIELDS) {
      const v = profile[f.profileColumn as string];
      if (v !== null && v !== undefined) values[f.key] = v as never;
    }
  }
  for (const a of answers ?? []) {
    values[a.question_key] = (a.value_text ?? a.value_number ?? a.value_bool) as never;
  }

  // Short-lived signed URLs for private media previews.
  const mediaWithUrls = await Promise.all(
    (media ?? []).map(async (m) => {
      const { data: signed } = await supabase.storage
        .from("applicant-media")
        .createSignedUrl(m.storage_path, 60 * 30);
      return { ...m, url: signed?.signedUrl ?? null };
    }),
  );

  return {
    applicationId,
    status: app?.status ?? "draft",
    currentStep: app?.current_step ?? 1,
    locked: Boolean(app?.locked_at),
    values,
    media: mediaWithUrls,
  };
}

export interface SaveResult {
  ok: boolean;
  errors?: Record<string, string>;
  message?: string;
}

/**
 * Autosave a step. `validate` gates on required fields (used on Next); autosave
 * during editing can pass validate=false to persist partial progress.
 */
export async function saveProgress(
  stepIndex: number,
  values: StepValues,
  validate: boolean,
): Promise<SaveResult> {
  const user = await requireUser();
  const supabase = createClient();
  const applicationId = await ensureApplication();

  // Reject edits to a locked application except for permitted contact fields.
  const { data: app } = await supabase
    .from("applications")
    .select("locked_at")
    .eq("id", applicationId)
    .single<{ locked_at: string | null }>();
  const locked = Boolean(app?.locked_at);

  if (validate) {
    const errors = validateStep(stepIndex, values);
    if (Object.keys(errors).length > 0) return { ok: false, errors };
  }

  const step = applicationSteps.find((s) => s.index === stepIndex);
  if (!step) return { ok: false, message: "Unknown step." };

  const profilePatch: Record<string, unknown> = { applicant_id: user.id };
  const answerRows: {
    application_id: string;
    question_key: string;
    value_text: string | null;
    value_number: number | null;
    value_bool: boolean | null;
  }[] = [];

  for (const field of step.fields) {
    if (locked && !editableAfterSubmit.has(field.key)) continue;
    const coerced = coerce(field, values[field.key]);
    if (field.profileColumn) {
      profilePatch[field.profileColumn] = coerced;
    } else {
      answerRows.push({
        application_id: applicationId,
        question_key: field.key,
        value_text: typeof coerced === "string" ? coerced : null,
        value_number: typeof coerced === "number" ? coerced : null,
        value_bool: typeof coerced === "boolean" ? coerced : null,
      });
    }
  }

  if (Object.keys(profilePatch).length > 1) {
    const { error } = await supabase
      .from("applicant_profiles")
      .upsert(profilePatch, { onConflict: "applicant_id" });
    if (error) return { ok: false, message: error.message };
  }

  if (answerRows.length > 0) {
    const { error } = await supabase
      .from("application_answers")
      .upsert(answerRows, { onConflict: "application_id,question_key" });
    if (error) return { ok: false, message: error.message };
  }

  if (!locked) {
    await supabase
      .from("applications")
      .update({ current_step: Math.max(stepIndex, 1) })
      .eq("id", applicationId);
  }

  revalidatePath("/application");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Record an uploaded media object after a client-side storage upload. */
export async function recordMedia(input: {
  kind: string;
  storagePath: string;
  mimeType?: string;
  sizeBytes?: number;
  durationSeconds?: number;
}): Promise<SaveResult> {
  const user = await requireUser();
  const supabase = createClient();

  // Path must belong to the caller (defense in depth; storage RLS also enforces).
  if (!input.storagePath.startsWith(`${user.id}/`)) {
    return { ok: false, message: "Invalid upload path." };
  }
  // Primary photo and video are singular — replace any existing one.
  if (input.kind === "primary_photo" || input.kind === "video_intro") {
    await supabase
      .from("applicant_media")
      .delete()
      .eq("applicant_id", user.id)
      .eq("kind", input.kind);
  }
  const { error } = await supabase.from("applicant_media").insert({
    applicant_id: user.id,
    kind: input.kind,
    storage_path: input.storagePath,
    mime_type: input.mimeType ?? null,
    size_bytes: input.sizeBytes ?? null,
    duration_seconds: input.durationSeconds ?? null,
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/application");
  return { ok: true };
}

export async function deleteMedia(id: string): Promise<SaveResult> {
  const user = await requireUser();
  const supabase = createClient();
  const { data: row } = await supabase
    .from("applicant_media")
    .select("storage_path, applicant_id")
    .eq("id", id)
    .single<{ storage_path: string; applicant_id: string }>();
  if (!row || row.applicant_id !== user.id) return { ok: false, message: "Not found." };

  await supabase.storage.from("applicant-media").remove([row.storage_path]);
  await supabase.from("applicant_media").delete().eq("id", id);
  revalidatePath("/application");
  return { ok: true };
}

/** Final submission: validate everything, lock, record consent, notify. */
export async function submitApplication(input: {
  consents: Record<string, boolean>;
  typedName: string;
}): Promise<SaveResult> {
  const user = await requireUser();
  const supabase = createClient();
  const applicationId = await ensureApplication();

  // 1. Validate every content step.
  const { values } = await loadApplication();
  for (const step of applicationSteps) {
    if (step.special) continue;
    const errors = validateStep(step.index, values);
    if (Object.keys(errors).length > 0) {
      return { ok: false, message: `Please complete "${step.title}" before submitting.` };
    }
  }

  // 2. Media requirements.
  const { data: media } = await supabase
    .from("applicant_media")
    .select("kind")
    .eq("applicant_id", user.id)
    .returns<{ kind: string }[]>();
  const kinds = (media ?? []).map((m) => m.kind);
  const photoCount = kinds.filter((k) => k === "primary_photo" || k === "photo").length;
  if (!kinds.includes("primary_photo")) {
    return { ok: false, message: "A primary profile photo is required." };
  }
  if (photoCount < 1 + platformRules.media.minAdditionalPhotos) {
    return {
      ok: false,
      message: `Please upload a primary photo and at least ${platformRules.media.minAdditionalPhotos} more photos.`,
    };
  }
  if (!kinds.includes("video_intro")) {
    return { ok: false, message: "A video introduction is required." };
  }

  // 3. Consent — all required certifications must be affirmed.
  if (!input.typedName.trim()) {
    return { ok: false, message: "Please type your full name to certify." };
  }
  const allConsented = Object.values(input.consents).every(Boolean);
  if (!allConsented || Object.keys(input.consents).length === 0) {
    return { ok: false, message: "All certifications must be confirmed." };
  }

  const hdrs = headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const ua = hdrs.get("user-agent") ?? null;
  const consentRows = Object.entries(input.consents).map(([consent_key, consented]) => ({
    user_id: user.id,
    consent_key,
    consented,
    typed_name: input.typedName.trim(),
    ip_address: ip,
    user_agent: ua,
  }));
  await supabase.from("consent_records").insert(consentRows);

  // 4. Lock & flip status.
  const code = `ONE-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
  const now = new Date().toISOString();
  const { error: updErr } = await supabase
    .from("applications")
    .update({
      status: "submitted",
      submitted_at: now,
      locked_at: now,
      application_code: code,
      current_step: 12,
    })
    .eq("id", applicationId);
  if (updErr) return { ok: false, message: updErr.message };

  await supabase.from("status_history").insert({
    application_id: applicationId,
    from_status: "draft",
    to_status: "submitted",
    changed_by: user.id,
    reason: "Applicant submitted application.",
  });

  // 5. Notifications (applicant + admins) and confirmation email.
  await supabase.from("notifications").insert({
    user_id: user.id,
    kind: "application_submitted",
    title: "Your application has been received",
    body: `Application ID ${code}.`,
  });
  const { data: admins } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "admin")
    .returns<{ id: string }[]>();
  if (admins?.length) {
    await supabase.from("notifications").insert(
      admins.map((a) => ({
        user_id: a.id,
        kind: "application_submitted",
        title: "New application submitted",
        body: `Application ${code} is ready for review.`,
      })),
    );
  }
  if (user.email) {
    try {
      await getEmailProvider().send(applicationSubmittedEmail(user.email, code));
    } catch {
      // Non-fatal: submission succeeds even if email delivery fails.
    }
  }

  revalidatePath("/application");
  revalidatePath("/dashboard");
  return { ok: true, message: code };
}

/** Applicant-initiated withdrawal. */
export async function withdrawApplication(): Promise<SaveResult> {
  const user = await requireUser();
  const supabase = createClient();
  const applicationId = await ensureApplication();
  const { error } = await supabase
    .from("applications")
    .update({ status: "withdrawn" })
    .eq("id", applicationId);
  if (error) return { ok: false, message: error.message };
  await supabase.from("status_history").insert({
    application_id: applicationId,
    to_status: "withdrawn",
    changed_by: user.id,
    reason: "Applicant withdrew.",
  });
  revalidatePath("/dashboard");
  return { ok: true };
}
