import "server-only";

import { createClient } from "@/lib/supabase/server";
import { requireRole, requireUser } from "@/lib/auth";

export interface ChatMessage {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
  readAt: string | null;
}

export interface ConversationView {
  conversationId: string | null;
  isOpen: boolean;
  messages: ChatMessage[];
}

function mapMessages(rows: { id: string; sender_id: string; body: string; created_at: string; read_at: string | null }[]): ChatMessage[] {
  return rows.map((m) => ({ id: m.id, senderId: m.sender_id, body: m.body, createdAt: m.created_at, readAt: m.read_at }));
}

/** The signed-in applicant's own conversation. Marks incoming messages read. */
export async function loadMyConversation(): Promise<ConversationView> {
  const user = await requireUser();
  const supabase = createClient();

  const { data: convo } = await supabase
    .from("conversations")
    .select("id, is_open")
    .eq("applicant_id", user.id)
    .maybeSingle<{ id: string; is_open: boolean }>();

  if (!convo) return { conversationId: null, isOpen: false, messages: [] };

  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", convo.id)
    .neq("sender_id", user.id)
    .is("read_at", null);

  const { data: messages } = await supabase
    .from("messages")
    .select("id, sender_id, body, created_at, read_at")
    .eq("conversation_id", convo.id)
    .order("created_at")
    .returns<{ id: string; sender_id: string; body: string; created_at: string; read_at: string | null }[]>();

  return { conversationId: convo.id, isOpen: convo.is_open, messages: mapMessages(messages ?? []) };
}

export interface AdminConversationRow {
  applicantId: string;
  name: string;
  isOpen: boolean;
  lastMessage: string | null;
  lastAt: string | null;
  unread: number;
}

/** All conversations for the admin inbox. */
export async function adminListConversations(): Promise<AdminConversationRow[]> {
  const admin = await requireRole("admin");
  const supabase = createClient();

  const { data: convos } = await supabase
    .from("conversations")
    .select("id, applicant_id, is_open, updated_at")
    .order("updated_at", { ascending: false })
    .returns<{ id: string; applicant_id: string; is_open: boolean; updated_at: string }[]>();

  if (!convos || convos.length === 0) return [];

  const ids = convos.map((c) => c.applicant_id);
  const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", ids).returns<{ id: string; full_name: string | null }[]>();
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  const { data: msgs } = await supabase
    .from("messages")
    .select("conversation_id, sender_id, body, created_at, read_at")
    .in("conversation_id", convos.map((c) => c.id))
    .order("created_at", { ascending: false })
    .returns<{ conversation_id: string; sender_id: string; body: string; created_at: string; read_at: string | null }[]>();

  const lastByConvo = new Map<string, { body: string; at: string }>();
  const unreadByConvo = new Map<string, number>();
  for (const m of msgs ?? []) {
    if (!lastByConvo.has(m.conversation_id)) lastByConvo.set(m.conversation_id, { body: m.body, at: m.created_at });
    if (m.sender_id !== admin.id && !m.read_at) {
      unreadByConvo.set(m.conversation_id, (unreadByConvo.get(m.conversation_id) ?? 0) + 1);
    }
  }

  return convos.map((c) => ({
    applicantId: c.applicant_id,
    name: nameById.get(c.applicant_id) ?? "Applicant",
    isOpen: c.is_open,
    lastMessage: lastByConvo.get(c.id)?.body ?? null,
    lastAt: lastByConvo.get(c.id)?.at ?? null,
    unread: unreadByConvo.get(c.id) ?? 0,
  }));
}

/** A specific applicant's conversation, for the admin. Marks incoming read. */
export async function adminLoadConversation(applicantId: string): Promise<ConversationView & { name: string }> {
  const admin = await requireRole("admin");
  const supabase = createClient();

  const { data: convo } = await supabase
    .from("conversations")
    .select("id, is_open")
    .eq("applicant_id", applicantId)
    .maybeSingle<{ id: string; is_open: boolean }>();

  const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", applicantId).maybeSingle<{ full_name: string | null }>();
  const name = prof?.full_name ?? "Applicant";

  if (!convo) return { conversationId: null, isOpen: false, messages: [], name };

  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", convo.id)
    .neq("sender_id", admin.id)
    .is("read_at", null);

  const { data: messages } = await supabase
    .from("messages")
    .select("id, sender_id, body, created_at, read_at")
    .eq("conversation_id", convo.id)
    .order("created_at")
    .returns<{ id: string; sender_id: string; body: string; created_at: string; read_at: string | null }[]>();

  return { conversationId: convo.id, isOpen: convo.is_open, messages: mapMessages(messages ?? []), name };
}
