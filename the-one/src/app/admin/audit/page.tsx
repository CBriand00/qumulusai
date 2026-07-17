import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Audit Log" };
export const dynamic = "force-dynamic";

export default async function AuditPage() {
  await requireRole("admin");
  const supabase = createClient();

  const { data: logs } = await supabase
    .from("audit_logs")
    .select("id, actor_id, action, entity, entity_id, created_at")
    .order("created_at", { ascending: false })
    .limit(200)
    .returns<{ id: string; actor_id: string | null; action: string; entity: string | null; entity_id: string | null; created_at: string }[]>();

  const rows = logs ?? [];
  const actorIds = Array.from(new Set(rows.map((r) => r.actor_id).filter(Boolean))) as string[];
  const nameById = new Map<string, string>();
  if (actorIds.length) {
    const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", actorIds).returns<{ id: string; full_name: string | null }[]>();
    for (const p of profiles ?? []) nameById.set(p.id, p.full_name ?? "—");
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow text-gold">Security</p>
        <h1 className="mt-1 font-serif text-3xl">Audit Log</h1>
        <p className="mt-1 text-sm text-muted-foreground">Append-only. Records cannot be edited or deleted.</p>
      </div>

      {rows.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No audit events yet.</CardContent></Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[700px] text-sm">
            <thead className="border-b border-border bg-card text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-3">Time</th>
                <th className="px-3 py-3">Actor</th>
                <th className="px-3 py-3">Action</th>
                <th className="px-3 py-3">Entity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="px-3 py-2">{r.actor_id ? nameById.get(r.actor_id) ?? "—" : "system"}</td>
                  <td className="px-3 py-2 font-medium">{r.action}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.entity ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
