import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "My Application" };

/**
 * The multi-step application (12 steps, autosave, media upload, consent) is
 * built in Phase 2. This protected route is the mount point. It already
 * enforces the applicant role and will render the wizard here.
 */
export default async function ApplicationPage() {
  await requireRole("applicant");
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Private Application</p>
        <h1 className="mt-1 text-3xl">Your application</h1>
      </div>
      <Card>
        <CardHeader><CardTitle>The application wizard</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            The 12-step application — basic information, relationship status,
            faith &amp; values, career &amp; finances, lifestyle, emotional
            intelligence, leadership, vision, personal introduction, media
            upload, consent, and review — is implemented in Phase 2 on top of
            this protected, role-guarded route.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
