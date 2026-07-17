import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { adminLoadConversation } from "@/features/messaging/queries";
import { setMessaging } from "@/features/admin/actions";
import { Thread } from "@/features/messaging/thread";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Conversation" };
export const dynamic = "force-dynamic";

export default async function AdminConversationPage({ params }: { params: { applicantId: string } }) {
  const admin = await requireRole("admin");
  const convo = await adminLoadConversation(params.applicantId);

  async function toggle() {
    "use server";
    await setMessaging(params.applicantId, !convo.isOpen);
  }

  return (
    <div className="space-y-4">
      <Link href="/admin/messages" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> All conversations
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl">{convo.name}</h1>
          <p className="text-sm text-muted-foreground">
            Admin safety review — you can read the full thread. {convo.isOpen ? "Messaging is open." : "Messaging is closed."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm"><Link href={`/admin/applicants/${params.applicantId}`}>View applicant</Link></Button>
          <form action={toggle}>
            <Button type="submit" variant="outline" size="sm">{convo.isOpen ? "Close messaging" : "Open messaging"}</Button>
          </form>
        </div>
      </div>

      {convo.conversationId ? (
        <Thread
          conversationId={convo.conversationId}
          isOpen={convo.isOpen}
          messages={convo.messages}
          currentUserId={admin.id}
          isAdmin
        />
      ) : (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
          No conversation yet. Open messaging to start one.
        </CardContent></Card>
      )}
    </div>
  );
}
