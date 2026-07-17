import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { loadMyDates } from "@/features/dates/queries";
import { DateResponse } from "@/features/dates/date-response";
import { PhasePlaceholder } from "@/components/dashboard/phase-placeholder";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Date Invitations" };
export const dynamic = "force-dynamic";

function fmt(dt: string | null) {
  return dt ? new Date(dt).toLocaleString() : "To be confirmed";
}

export default async function DatesPage() {
  await requireRole("applicant");
  const dates = await loadMyDates();

  if (dates.length === 0) {
    return (
      <PhasePlaceholder eyebrow="Private" title="Date Invitations" phase="Nothing yet">
        If there is continued mutual interest, a date invitation will appear here.
        You&apos;ll be able to accept, decline, or suggest another time.
      </PhasePlaceholder>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="eyebrow">Private</p>
        <h1 className="mt-1 text-3xl">Date Invitations</h1>
      </div>
      {dates.map((d) => (
        <Card key={d.id}>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-lg">{d.mode === "virtual" ? "Virtual date" : "In-person date"}</CardTitle>
            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs capitalize text-secondary-foreground">{d.status.replace("_", " ")}</span>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p><span className="text-muted-foreground">When:</span> {fmt(d.proposedAt)}</p>
            {d.locationLabel ? <p><span className="text-muted-foreground">Where:</span> {d.locationLabel}</p> : null}
            {d.instructions ? <p><span className="text-muted-foreground">Details:</span> {d.instructions}</p> : null}
            {d.responseDeadline ? <p className="text-xs text-muted-foreground">Please respond by {fmt(d.responseDeadline)}.</p> : null}
            {d.applicantResponse ? <p className="text-muted-foreground">Your note: {d.applicantResponse}</p> : null}
            {d.status === "proposed" ? <DateResponse dateId={d.id} /> : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
