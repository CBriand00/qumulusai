import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeletionRow, ExportRow } from "@/features/admin/privacy-request-row";

export const metadata: Metadata = { title: "Privacy Requests" };
export const dynamic = "force-dynamic";

export default async function PrivacyPage() {
  await requireRole("admin");
  const supabase = createClient();

  const { data: deletions } = await supabase
    .from("deletion_requests")
    .select("id, user_id, status, created_at")
    .order("created_at", { ascending: false })
    .returns<{ id: string; user_id: string; status: string; created_at: string }[]>();

  const { data: exports } = await supabase
    .from("data_export_requests")
    .select("id, user_id, status, created_at")
    .order("created_at", { ascending: false })
    .returns<{ id: string; user_id: string; status: string; created_at: string }[]>();

  const ids = Array.from(new Set([...(deletions ?? []), ...(exports ?? [])].map((r) => r.user_id)));
  const nameById = new Map<string, string>();
  if (ids.length) {
    const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", ids).returns<{ id: string; full_name: string | null }[]>();
    for (const p of profiles ?? []) nameById.set(p.id, p.full_name ?? "Applicant");
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow text-gold">Privacy</p>
        <h1 className="mt-1 font-serif text-3xl">Data requests</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Deletion is subject to legal retention requirements. Exports are user-downloadable JSON.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle>Deletion requests</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {deletions && deletions.length > 0 ? (
            deletions.map((d) => <DeletionRow key={d.id} requestId={d.id} userId={d.user_id} name={nameById.get(d.user_id) ?? "Applicant"} status={d.status} />)
          ) : <p className="text-sm text-muted-foreground">No deletion requests.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Export requests</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {exports && exports.length > 0 ? (
            exports.map((e) => <ExportRow key={e.id} requestId={e.id} name={nameById.get(e.user_id) ?? "Applicant"} status={e.status} />)
          ) : <p className="text-sm text-muted-foreground">No export requests.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
