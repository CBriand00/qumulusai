import "server-only";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";

export interface Analytics {
  total: number;
  submittedPlus: number;
  completionRate: number; // %
  avgCompletionDays: number | null;
  activeConversations: number;
  scheduledDates: number;
  statusCounts: Record<string, number>;
}

export async function getAnalytics(): Promise<Analytics> {
  await requireRole("admin");
  const supabase = createClient();

  const { data: apps } = await supabase
    .from("applications")
    .select("status, created_at, submitted_at")
    .returns<{ status: string; created_at: string; submitted_at: string | null }[]>();

  const rows = apps ?? [];
  const total = rows.length;
  const statusCounts: Record<string, number> = {};
  let submittedPlus = 0;
  let completionSum = 0;
  let completionCount = 0;

  for (const r of rows) {
    statusCounts[r.status] = (statusCounts[r.status] ?? 0) + 1;
    if (r.status !== "draft") submittedPlus++;
    if (r.submitted_at) {
      const ms = new Date(r.submitted_at).getTime() - new Date(r.created_at).getTime();
      if (ms >= 0) {
        completionSum += ms;
        completionCount++;
      }
    }
  }

  const [{ count: activeConversations }, { count: scheduledDates }] = await Promise.all([
    supabase.from("conversations").select("*", { count: "exact", head: true }).eq("is_open", true),
    supabase.from("date_invitations").select("*", { count: "exact", head: true }).in("status", ["proposed", "accepted", "counter_proposed"]),
  ]);

  return {
    total,
    submittedPlus,
    completionRate: total > 0 ? Math.round((submittedPlus / total) * 100) : 0,
    avgCompletionDays: completionCount > 0 ? Math.round((completionSum / completionCount / 86_400_000) * 10) / 10 : null,
    activeConversations: activeConversations ?? 0,
    scheduledDates: scheduledDates ?? 0,
    statusCounts,
  };
}
