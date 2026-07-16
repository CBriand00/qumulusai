import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Admin Overview" };

/** Overview stat, computed from a filtered count query (RLS: admin only). */
async function statCount(filter: (q: any) => any): Promise<number> {
  const supabase = createClient();
  let query = supabase.from("applications").select("*", { count: "exact", head: true });
  query = filter(query);
  const { count } = await query;
  return count ?? 0;
}

export default async function AdminOverview() {
  const [total, submitted, underReview, shortlisted, approved] = await Promise.all([
    statCount((q) => q),
    statCount((q) => q.eq("status", "submitted")),
    statCount((q) => q.eq("status", "under_review")),
    statCount((q) => q.eq("status", "shortlisted")),
    statCount((q) => q.in("status", ["approved_to_connect", "messaging_open", "dating"])),
  ]);

  const stats = [
    { label: "Total Applicants", value: total },
    { label: "New / Submitted", value: submitted },
    { label: "Under Review", value: underReview },
    { label: "Under Consideration", value: shortlisted },
    { label: "Approved", value: approved },
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
        <CardHeader><CardTitle>Getting started</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            The applicant review table, filters, compatibility scoring, notes,
            and status controls arrive in Phase 3. Messaging, dates, and
            notifications in Phase 4. AI analysis, audit, export, and deletion
            in Phase 5.
          </p>
          <p>
            Counts above are live from the database via row-level-security-scoped
            admin queries.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
