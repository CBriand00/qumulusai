"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Flag, Send } from "lucide-react";
import { sendMessage, reportMessage, type MsgResult } from "@/features/messaging/actions";
import type { ChatMessage } from "@/features/messaging/queries";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface Props {
  conversationId: string;
  isOpen: boolean;
  messages: ChatMessage[];
  currentUserId: string;
  isAdmin: boolean;
}

export function Thread({ conversationId, isOpen, messages, currentUserId, isAdmin }: Props) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // Applicants can only send while the conversation is open; admins may always.
  const canSend = isAdmin || isOpen;
  const lastMine = [...messages].reverse().find((m) => m.senderId === currentUserId);

  function submit() {
    setError(null);
    const value = body;
    start(async () => {
      const res: MsgResult = await sendMessage(conversationId, value);
      if (!res.ok) { setError(res.message ?? "Could not send."); return; }
      setBody("");
      router.refresh();
    });
  }

  function report(id: string) {
    start(async () => {
      await reportMessage(id, "Reported from thread");
      router.refresh();
    });
  }

  return (
    <div className="flex h-[60vh] flex-col rounded-lg border border-border">
      <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">No messages yet. Say hello.</p>
        ) : null}
        {messages.map((m) => {
          const mine = m.senderId === currentUserId;
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div className={cn("group max-w-[75%] rounded-lg px-4 py-2", mine ? "bg-espresso text-paper" : "bg-secondary text-secondary-foreground")}>
                <p className="whitespace-pre-wrap text-sm">{m.body}</p>
                <div className={cn("mt-1 flex items-center gap-2 text-[11px]", mine ? "text-paper/60" : "text-muted-foreground")}>
                  <span>{new Date(m.createdAt).toLocaleString()}</span>
                  {mine && m.id === lastMine?.id ? <span>{m.readAt ? "Read" : "Sent"}</span> : null}
                  {!mine && !isAdmin ? (
                    <button type="button" onClick={() => report(m.id)} className="opacity-0 transition-opacity group-hover:opacity-100" aria-label="Report message">
                      <Flag className="h-3 w-3" />
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-border p-3">
        {error ? <p role="alert" className="mb-2 text-sm text-destructive">{error}</p> : null}
        {canSend ? (
          <div className="flex items-end gap-2">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write a message…"
              className="min-h-[44px] flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
              }}
            />
            <Button variant="gold" onClick={submit} disabled={pending || !body.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            Messaging is currently closed.
          </p>
        )}
      </div>
    </div>
  );
}
