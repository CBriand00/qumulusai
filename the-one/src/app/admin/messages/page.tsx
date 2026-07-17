import type { Metadata } from "next";
import Link from "next/link";
import { adminListConversations } from "@/features/messaging/queries";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Messages" };
export const dynamic = "force-dynamic";

export default async function AdminMessagesPage() {
  const convos = await adminListConversations();

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow text-gold">Messaging</p>
        <h1 className="mt-1 font-serif text-3xl">Conversations</h1>
      </div>

      {convos.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
          No conversations yet. Unlock messaging from an applicant&apos;s detail page.
        </CardContent></Card>
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border">
          {convos.map((c) => (
            <Link key={c.applicantId} href={`/admin/messages/${c.applicantId}`} className="flex items-center justify-between gap-4 p-4 hover:bg-secondary/40">
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-medium">
                  {c.name}
                  {!c.isOpen ? <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">closed</span> : null}
                  {c.unread > 0 ? <span className="rounded-full bg-gold px-2 py-0.5 text-xs text-ink">{c.unread} new</span> : null}
                </p>
                <p className="truncate text-sm text-muted-foreground">{c.lastMessage ?? "No messages yet"}</p>
              </div>
              <span className="whitespace-nowrap text-xs text-muted-foreground">
                {c.lastAt ? new Date(c.lastAt).toLocaleDateString() : ""}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
