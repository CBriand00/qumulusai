import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { APPLICANT_STATUS_LABELS, type ApplicantStatus } from "@/config/site";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardHome() {
  const profile = await requireRole("applicant");
  const supabase = createClient();

  const { data: application } = await supabase
    .from("applications")
    .select("status, current_step, application_code, submitted_at")
    .eq("applicant_id", profile.id)
    .maybeSingle<{
      status: ApplicantStatus;
      current_step: number;
      application_code: string | null;
      submitted_at: string | null;
    }>();

  const status = (application?.status ?? "draft") as ApplicantStatus;
  const nextAction =
    status === "draft"
      ? { label: "Continue your application", href: "/application" }
      : status === "additional_info_requested"
      ? { label: "Provide requested information", href: "/application" }
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

      <div className="grid gap-6 sm:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-base">Application Status</CardTitle></CardHeader>
          <CardContent>
            <p className="font-serif text-2xl text-espresso">
              {APPLICANT_STATUS_LABELS[status]}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Application ID</CardTitle></CardHeader>
          <CardContent>
            <p className="font-mono text-sm text-muted-foreground">
              {application?.application_code ?? "Not yet submitted"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Next Step</CardTitle></CardHeader>
          <CardContent>
            <Button asChild variant="gold" size="sm">
              <Link href={nextAction.href}>{nextAction.label}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>What happens next</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Complete every section of your application, including your photos and
            a short video introduction. When you submit, your application is
            reviewed privately and individually.
          </p>
          <p>
            Messaging and date scheduling become available only if your
            application is approved. You will be notified of any updates.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
