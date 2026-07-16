import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AccountControls } from "@/features/account/account-controls";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

const WITHDRAWABLE = new Set([
  "draft", "submitted", "under_review", "additional_info_requested",
  "shortlisted", "approved_to_connect", "messaging_open", "date_invited", "dating", "paused",
]);

export default async function SettingsPage() {
  const profile = await requireRole("applicant");
  const supabase = createClient();

  const { data: app } = await supabase
    .from("applications")
    .select("status")
    .eq("applicant_id", profile.id)
    .maybeSingle<{ status: string }>();

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Account</p>
        <h1 className="mt-1 text-3xl">Settings &amp; Privacy</h1>
      </div>
      <Card>
        <CardHeader><CardTitle>Your data &amp; account</CardTitle></CardHeader>
        <CardContent>
          <AccountControls canWithdraw={WITHDRAWABLE.has(app?.status ?? "draft")} />
        </CardContent>
      </Card>
    </div>
  );
}
