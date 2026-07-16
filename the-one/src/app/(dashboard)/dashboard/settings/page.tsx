import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { PhasePlaceholder } from "@/components/dashboard/phase-placeholder";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireRole("applicant");
  return (
    <PhasePlaceholder eyebrow="Account" title="Settings & Privacy" phase="Account controls">
      Account settings, privacy controls, downloading a copy of your data,
      withdrawing your application, and deleting your account are wired to the
      data-export and deletion workflows in Phase 5. Your right to withdraw and
      delete is honored at any time.
    </PhasePlaceholder>
  );
}
