import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { loadMyConversation } from "@/features/messaging/queries";
import { Thread } from "@/features/messaging/thread";
import { PhasePlaceholder } from "@/components/dashboard/phase-placeholder";

export const metadata: Metadata = { title: "Messages" };
export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const profile = await requireRole("applicant");
  const convo = await loadMyConversation();

  if (!convo.conversationId) {
    return (
      <PhasePlaceholder eyebrow="Private" title="Messages" phase="Available after approval">
        Secure, private messaging opens only after your application is approved.
        Your contact details are never shared until you choose to share them.
      </PhasePlaceholder>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="eyebrow">Private</p>
        <h1 className="mt-1 text-3xl">Messages</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Private and secure. Never share personal contact details until you&apos;re ready.
        </p>
      </div>
      <Thread
        conversationId={convo.conversationId}
        isOpen={convo.isOpen}
        messages={convo.messages}
        currentUserId={profile.id}
        isAdmin={false}
      />
    </div>
  );
}
