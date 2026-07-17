import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { getSiteOverrides } from "@/lib/site-settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ContentEditor } from "@/features/admin/content-editor";

export const metadata: Metadata = { title: "Content" };
export const dynamic = "force-dynamic";

export default async function ContentPage() {
  await requireRole("admin");
  const overrides = await getSiteOverrides();

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow text-gold">Content</p>
        <h1 className="mt-1 font-serif text-3xl">Site content</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Edit landing copy and application availability. Longer-form copy (About,
          values, FAQ, legal) lives in <code>src/config</code> and can be migrated
          here over time.
        </p>
      </div>
      <Card>
        <CardHeader><CardTitle>Editable content</CardTitle></CardHeader>
        <CardContent>
          <ContentEditor initial={overrides} />
        </CardContent>
      </Card>
    </div>
  );
}
