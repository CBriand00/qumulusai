"use client";

import { applicationSteps } from "@/config/application-schema";
import type { StepValues } from "@/lib/validation/application";
import { Button } from "@/components/ui/button";

interface Props {
  values: StepValues;
  mediaCount: { photos: number; video: boolean };
  onEditStep: (index: number) => void;
}

export function ReviewStep({ values, mediaCount, onEditStep }: Props) {
  const contentSteps = applicationSteps.filter((s) => !s.special);

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground">
        Review your answers. You can edit any section before submitting. After
        submission, core fields are locked (you can still update contact details).
      </p>

      {contentSteps.map((step) => (
        <section key={step.key} className="rounded-lg border border-border">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <h3 className="font-serif text-lg">{step.title}</h3>
            <Button variant="ghost" size="sm" onClick={() => onEditStep(step.index)}>
              Edit
            </Button>
          </div>
          <dl className="divide-y divide-border">
            {step.fields.map((field) => {
              const v = values[field.key];
              const display =
                v === undefined || v === null || v === ""
                  ? "—"
                  : typeof v === "boolean"
                  ? v ? "Yes" : "No"
                  : String(v);
              return (
                <div key={field.key} className="grid grid-cols-1 gap-1 px-5 py-3 sm:grid-cols-3">
                  <dt className="text-sm text-muted-foreground">{field.label}</dt>
                  <dd className="text-sm sm:col-span-2">{display}</dd>
                </div>
              );
            })}
          </dl>
        </section>
      ))}

      <section className="rounded-lg border border-border">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h3 className="font-serif text-lg">Media</h3>
          <Button variant="ghost" size="sm" onClick={() => onEditStep(10)}>Edit</Button>
        </div>
        <div className="px-5 py-3 text-sm">
          <p>{mediaCount.photos} photo(s) uploaded.</p>
          <p>{mediaCount.video ? "Video introduction uploaded." : "No video introduction yet."}</p>
        </div>
      </section>
    </div>
  );
}
