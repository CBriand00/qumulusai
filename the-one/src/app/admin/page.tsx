import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Admin Overview" };
export const dynamic = "force-dynamic";

/** Overview stat, computed from a filtered count query (RLS: admin only). */
async function statCount(filter: (q: any) => any): Promise<number> {
  const supabase = createClient();
  let query = supabase.from("applications").select("*", { count: "exact", head: true });
  query = filter(query);
  const { count } = await query;
  return count ?? 0;
}

export default async function AdminOverview() {
  const [total, submitted, underReview, shortlisted, approved, withdrawn, blocked] = await Promise.all([
    statCount((q) => q),
    statCount((q) => q.eq("status", "submitted")),
    statCount((q) => q.eq("status", "under_review")),
    statCount((q) => q.eq("status", "shortlisted")),
    statCount((q) => q.in("status", ["approved_to_connect", "messaging_open", "date_invited", "dating"])),
    statCount((q) => q.eq("status", "withdrawn")),
    statCount((q) => q.eq("status", "blocked")),
  ]);

  const stats = [
    { label: "Total Applicants", value: total },
    { label: "New / Submitted", value: submitted },
    { label: "Under Review", value: underReview },
    { label: "Under Consideration", value: shortlisted },
    { label: "Approved / Connecting", value: approved },
    { label: "Withdrawn", value: withdrawn },
    { label: "Blocked", value: blocked },
  ];

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow text-gold">Overview</p>
        <h1 className="mt-1 font-serif text-3xl">Command Center</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-normal text-muted-foreground">
                {s.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-serif text-4xl text-gold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Review applicants</CardTitle></CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            Open the applicant table to filter, sort, favorite, review full
            applications and media, add private notes and flags, assign
            compatibility scores, and manage status — including approving,
            unlocking messaging, and requesting more information.
          </p>
          <Button asChild variant="gold" size="sm"><Link href="/admin/applicants">Open applicants</Link></Button>
          <p className="text-xs">
            Messaging, dates, and notifications complete in Phase 4; AI analysis,
            audit viewer, and analytics in Phase 5. Counts above are live via
            RLS-scoped admin queries.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
