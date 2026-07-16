import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { PhasePlaceholder } from "@/components/dashboard/phase-placeholder";

export const metadata: Metadata = { title: "Date Invitations" };

export default async function DatesPage() {
  await requireRole("applicant");
  return (
    <PhasePlaceholder eyebrow="Private" title="Date Invitations" phase="Available after approval">
      If there is continued mutual interest, you may receive a date invitation
      here. You will be able to accept, decline, or suggest another time. Built
      in Phase 4.
    </PhasePlaceholder>
  );
}
