"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { insertNotification, emailUser } from "@/lib/notify";
import { newMessageEmail } from "@/lib/email/templates";

export interface MsgResult {
  ok: boolean;
  message?: string;
}

const MAX_LEN = 4000;

/**
 * Send a message in a conversation. RLS guarantees the sender is a participant
 * and (for applicants) that the conversation is open. Notifies the recipient.
 */
export async function sendMessage(conversationId: string, body: string): Promise<MsgResult> {
  const user = await requireUser();
  const supabase = createClient();

  const text = body.trim();
  if (!text) return { ok: false, message: "Message is empty." };
  if (text.length > MAX_LEN) return { ok: false, message: "Message is too long." };

  const { data: convo } = await supabase
    .from("conversations")
    .select("id, applicant_id, is_open")
    .eq("id", conversationId)
    .maybeSingle<{ id: string; applicant_id: string; is_open: boolean }>();
  if (!convo) return { ok: false, message: "Conversation not found." };

  const { error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: user.id, body: text });
  if (error) return { ok: false, message: error.message };

  await supabase.from("conversations").update({ is_open: convo.is_open }).eq("id", conversationId);

  const isApplicant = user.id === convo.applicant_id;
  if (isApplicant) {
    // Notify admins.
    const { data: admins } = await supabase.from("profiles").select("id").eq("role", "admin").returns<{ id: string }[]>();
    for (const a of admins ?? []) {
      await insertNotification(a.id, "new_message", "New message from an applicant");
    }
  } else {
    // Admin → applicant: in-app + email (contents never included in email).
    await insertNotification(convo.applicant_id, "new_message", "You have a new message");
    await emailUser(convo.applicant_id, (email) => newMessageEmail(email));
  }

  revalidatePath("/dashboard/messages");
  revalidatePath(`/admin/messages/${convo.applicant_id}`);
  revalidatePath("/admin/messages");
  return { ok: true };
}

/** Applicant reports a message for safety review. */
export async function reportMessage(messageId: string, reason: string): Promise<MsgResult> {
  const user = await requireUser();
  const supabase = createClient();
  const { error } = await supabase
    .from("message_reports")
    .insert({ message_id: messageId, reporter_id: user.id, reason: reason.trim() || null });
  if (error) return { ok: false, message: error.message };

  const { data: admins } = await supabase.from("profiles").select("id").eq("role", "admin").returns<{ id: string }[]>();
  for (const a of admins ?? []) {
    await insertNotification(a.id, "security_notice", "A message was reported", "Please review flagged content.");
  }
  return { ok: true };
}
