import type { Metadata } from "next";
import Link from "next/link";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { loadApplication } from "@/features/application/actions";
import { completionPercent } from "@/lib/validation/application";
import { APPLICANT_STATUS_LABELS, type ApplicantStatus } from "@/config/site";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardHome() {
  const profile = await requireRole("applicant");
  const supabase = createClient();

  const app = await loadApplication();
  const status = app.status as ApplicantStatus;
  const percent = completionPercent(app.values);

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, title, body, created_at, read_at")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(5)
    .returns<{ id: string; title: string; body: string | null; created_at: string; read_at: string | null }[]>();

  const nextAction =
    status === "draft" && percent < 100
      ? { label: "Continue your application", href: "/application" }
      : status === "draft"
      ? { label: "Review & submit", href: "/application" }
      : status === "additional_info_requested"
      ? { label: "Provide requested information", href: "/application" }
      : status === "messaging_open"
      ? { label: "Open messages", href: "/dashboard/messages" }
      : { label: "View your application", href: "/application" };

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow">Private Dashboard</p>
        <h1 className="mt-1 text-3xl">
          Welcome{profile.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
        </h1>
        <p className="mt-2 text-muted-foreground">
          Everything here is private. Take your time — your progress is saved.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-normal text-muted-foreground">Status</CardTitle></CardHeader>
          <CardContent><p className="font-serif text-xl text-espresso">{APPLICANT_STATUS_LABELS[status]}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-normal text-muted-foreground">Completion</CardTitle></CardHeader>
          <CardContent>
            <p className="font-serif text-3xl text-gold">{percent}%</p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div className="h-full bg-gold" style={{ width: `${percent}%` }} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-normal text-muted-foreground">Application ID</CardTitle></CardHeader>
          <CardContent><p className="font-mono text-sm text-muted-foreground">{app.status === "draft" ? "Not yet submitted" : "Submitted"}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-normal text-muted-foreground">Next step</CardTitle></CardHeader>
          <CardContent>
            <Button asChild variant="gold" size="sm"><Link href={nextAction.href}>{nextAction.label}</Link></Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bell className="h-4 w-4 text-gold" /> Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          {notifications && notifications.length > 0 ? (
            <ul className="divide-y divide-border">
              {notifications.map((n) => (
                <li key={n.id} className="py-3">
                  <p className="text-sm font-medium">{n.title}</p>
                  {n.body ? <p className="text-sm text-muted-foreground">{n.body}</p> : null}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(n.created_at).toLocaleDateString()}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No notifications yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
