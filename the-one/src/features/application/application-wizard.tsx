"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Loader2, CircleCheck } from "lucide-react";
import {
  applicationSteps,
  editableAfterSubmit,
  TOTAL_STEPS,
  consentItems,
} from "@/config/application-schema";
import {
  completionPercent,
  validateStep,
  type StepValues,
  type AnswerValue,
  type FieldErrors,
} from "@/lib/validation/application";
import { saveProgress, submitApplication, type LoadedApplication } from "@/features/application/actions";
import { APPLICANT_STATUS_LABELS, type ApplicantStatus } from "@/config/site";
import { Button } from "@/components/ui/button";
import { FieldRenderer } from "./field-renderer";
import { MediaStep } from "./media-step";
import { ConsentStep } from "./consent-step";
import { ReviewStep } from "./review-step";

const AUTOSAVE_MS = 1200;

export function ApplicationWizard({ initial }: { initial: LoadedApplication }) {
  const router = useRouter();
  const locked = initial.locked;
  const [values, setValues] = useState<StepValues>(initial.values);
  const [current, setCurrent] = useState(locked ? 12 : Math.min(initial.currentStep, TOTAL_STEPS));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [consents, setConsents] = useState<Record<string, boolean>>({});
  const [typedName, setTypedName] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedCode, setSubmittedCode] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const step = applicationSteps.find((s) => s.index === current)!;
  const percent = completionPercent(values);

  const persist = useCallback(
    async (stepIndex: number, v: StepValues, validate: boolean) => {
      setSaveState("saving");
      const res = await saveProgress(stepIndex, v, validate);
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1500);
      return res;
    },
    [],
  );

  // Debounced autosave when values change (no validation gate).
  useEffect(() => {
    if (locked || step.special) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      persist(current, values, false);
    }, AUTOSAVE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values]);

  function onChange(key: string, value: AnswerValue) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: "" } : prev));
  }

  async function goTo(index: number) {
    if (timer.current) clearTimeout(timer.current);
    if (!locked && !step.special) await persist(current, values, false);
    setErrors({});
    setCurrent(Math.min(Math.max(index, 1), TOTAL_STEPS));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function next() {
    if (!step.special && !locked) {
      const res = await persist(current, values, true);
      if (!res.ok && res.errors) {
        setErrors(res.errors);
        return;
      }
    }
    await goTo(current + 1);
  }

  async function handleSubmit() {
    setSubmitError(null);
    const res = await submitApplication({ consents, typedName });
    if (!res.ok) {
      setSubmitError(res.message ?? "Could not submit.");
      return;
    }
    setSubmittedCode(res.message ?? "Submitted");
    startTransition(() => router.refresh());
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const photos = initial.media.filter((m) =>
    ["primary_photo", "photo", "professional_photo", "full_length_photo"].includes(m.kind),
  ).length;
  const hasVideo = initial.media.some((m) => m.kind === "video_intro");

  // Confirmation screen after successful submission.
  if (submittedCode) {
    return (
      <div className="rounded-lg border border-border bg-card p-10 text-center">
        <CircleCheck className="mx-auto h-12 w-12 text-gold" />
        <h2 className="mt-4 text-3xl">Application submitted</h2>
        <p className="mt-2 text-muted-foreground">
          Thank you. Your application has been received and will be reviewed privately.
        </p>
        <p className="mt-4 font-mono text-sm">Application ID: {submittedCode}</p>
        <p className="mx-auto mt-4 max-w-md text-sm text-muted-foreground">
          Submitting an application does not guarantee a response, approval,
          conversation, or date. You&apos;ll be notified of any updates.
        </p>
        <Button className="mt-8" variant="gold" onClick={() => router.push("/dashboard")}>
          Go to dashboard
        </Button>
      </div>
    );
  }

  const allConsented =
    consentItems.every((c) => consents[c.key]) && typedName.trim().length > 0;

  return (
    <div className="space-y-8">
      {/* Progress */}
      <div className="sticky top-16 z-10 -mx-1 rounded-lg border border-border bg-paper/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            Step {current} of {TOTAL_STEPS} — {step.title}
          </span>
          <span className="flex items-center gap-2 text-muted-foreground">
            {saveState === "saving" ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</>
            ) : saveState === "saved" ? (
              <><Check className="h-3.5 w-3.5 text-gold" /> Saved</>
            ) : (
              <>{percent}% complete</>
            )}
          </span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full bg-gold transition-all" style={{ width: `${(current / TOTAL_STEPS) * 100}%` }} />
        </div>
      </div>

      {locked ? (
        <div className="rounded-md bg-secondary px-4 py-3 text-sm text-secondary-foreground">
          Your application is <strong>{APPLICANT_STATUS_LABELS[initial.status as ApplicantStatus] ?? initial.status}</strong>.
          Core fields are locked; you can still update your contact details.
        </div>
      ) : null}

      {/* Step body */}
      <div>
        <h2 className="text-2xl">{step.title}</h2>
        {step.description ? (
          <p className="mt-1 text-muted-foreground">{step.description}</p>
        ) : null}

        <div className="mt-6">
          {step.special === "media" ? (
            <MediaStep media={initial.media} disabled={locked} />
          ) : step.special === "consent" ? (
            <ConsentStep
              consents={consents}
              onToggle={(k, c) => setConsents((p) => ({ ...p, [k]: c }))}
              typedName={typedName}
              onTypedName={setTypedName}
              disabled={locked}
            />
          ) : step.special === "review" ? (
            <ReviewStep values={values} mediaCount={{ photos, video: hasVideo }} onEditStep={goTo} />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2">
              {step.fields.map((field) => {
                const fieldDisabled = locked && !editableAfterSubmit.has(field.key);
                const fullWidth = field.type === "textarea";
                return (
                  <div key={field.key} className={fullWidth ? "sm:col-span-2" : ""}>
                    <FieldRenderer
                      field={field}
                      value={values[field.key]}
                      error={errors[field.key]}
                      disabled={fieldDisabled}
                      onChange={onChange}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {submitError ? (
        <p role="alert" className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {submitError}
        </p>
      ) : null}

      {/* Navigation */}
      <div className="flex items-center justify-between border-t border-border pt-6">
        <Button variant="outline" onClick={() => goTo(current - 1)} disabled={current === 1}>
          <ChevronLeft className="h-4 w-4" /> Previous
        </Button>

        {current < TOTAL_STEPS ? (
          <Button variant="gold" onClick={next}>
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        ) : locked ? (
          <Button variant="outline" onClick={() => router.push("/dashboard")}>
            Back to dashboard
          </Button>
        ) : (
          <Button variant="gold" onClick={handleSubmit} disabled={!allConsented}>
            Submit application
          </Button>
        )}
      </div>
    </div>
  );
}
