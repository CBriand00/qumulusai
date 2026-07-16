import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { PhasePlaceholder } from "@/components/dashboard/phase-placeholder";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage() {
  await requireRole("applicant");
  return (
    <PhasePlaceholder eyebrow="Private" title="Messages" phase="Available after approval">
      Secure, private messaging unlocks only after your application is approved.
      It is built in Phase 4. Your contact details are never shared until you
      choose to share them.
    </PhasePlaceholder>
  );
}
