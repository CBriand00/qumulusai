import type { Metadata } from "next";
import { getAnalytics } from "@/features/admin/analytics";
import { APPLICANT_STATUS_LABELS, type ApplicantStatus } from "@/config/site";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Analytics" };
export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const a = await getAnalytics();

  const tiles = [
    { label: "Total applicants", value: a.total },
    { label: "Completion rate", value: `${a.completionRate}%` },
    { label: "Avg. completion time", value: a.avgCompletionDays !== null ? `${a.avgCompletionDays} days` : "—" },
    { label: "Active conversations", value: a.activeConversations },
    { label: "Scheduled dates", value: a.scheduledDates },
    { label: "Submitted+", value: a.submittedPlus },
  ];

  const maxCount = Math.max(1, ...Object.values(a.statusCounts));

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow text-gold">Insights</p>
        <h1 className="mt-1 font-serif text-3xl">Analytics</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((t) => (
          <Card key={t.label}>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-normal text-muted-foreground">{t.label}</CardTitle></CardHeader>
            <CardContent><p className="font-serif text-3xl text-gold">{t.value}</p></CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Applications by status</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {Object.entries(a.statusCounts).length === 0 ? (
            <p className="text-sm text-muted-foreground">No applications yet.</p>
          ) : (
            Object.entries(a.statusCounts)
              .sort((x, y) => y[1] - x[1])
              .map(([status, count]) => (
                <div key={status} className="flex items-center gap-3">
                  <span className="w-48 shrink-0 text-sm text-muted-foreground">
                    {APPLICANT_STATUS_LABELS[status as ApplicantStatus] ?? status}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full bg-gold" style={{ width: `${(count / maxCount) * 100}%` }} />
                  </div>
                  <span className="w-8 text-right text-sm">{count}</span>
                </div>
              ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
