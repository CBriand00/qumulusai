import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { loadApplication } from "@/features/application/actions";
import { ApplicationWizard } from "@/features/application/application-wizard";

export const metadata: Metadata = { title: "My Application" };

// Always render fresh — the application state changes as the applicant works.
export const dynamic = "force-dynamic";

export default async function ApplicationPage() {
  await requireRole("applicant");
  const initial = await loadApplication();

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Private Application</p>
        <h1 className="mt-1 text-3xl">Your application</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Take your time — your progress saves automatically.
        </p>
      </div>
      <ApplicationWizard initial={initial} />
    </div>
  );
}
