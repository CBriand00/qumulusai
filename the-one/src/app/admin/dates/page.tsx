import type { Metadata } from "next";
import Link from "next/link";
import { adminListDates } from "@/features/dates/queries";
import { AdminDateControls } from "@/features/dates/admin-date-controls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Dates" };
export const dynamic = "force-dynamic";

function fmt(dt: string | null) {
  return dt ? new Date(dt).toLocaleString() : "TBD";
}

export default async function AdminDatesPage() {
  const dates = await adminListDates();

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow text-gold">Scheduling</p>
        <h1 className="mt-1 font-serif text-3xl">Dates</h1>
      </div>

      {dates.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
          No date invitations yet. Create one from an applicant&apos;s detail page.
        </CardContent></Card>
      ) : (
        <div className="space-y-4">
          {dates.map((d) => (
            <Card key={d.id}>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-lg">
                  <Link href={`/admin/applicants/${d.applicantId}`} className="hover:text-gold">{d.name}</Link>
                </CardTitle>
                <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs capitalize text-secondary-foreground">{d.status.replace("_", " ")}</span>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><span className="text-muted-foreground">{d.mode === "virtual" ? "Virtual" : "In person"} ·</span> {fmt(d.proposedAt)}</p>
                {d.locationLabel ? <p><span className="text-muted-foreground">Where:</span> {d.locationLabel}</p> : null}
                {d.applicantResponse ? <p><span className="text-muted-foreground">Applicant note:</span> {d.applicantResponse}</p> : null}
                {d.adminPostNotes ? <p className="text-muted-foreground">Post-date notes: {d.adminPostNotes}</p> : null}
                <AdminDateControls dateId={d.id} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
