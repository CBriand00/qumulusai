import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getEmailProvider, type EmailMessage } from "@/lib/email/provider";

/**
 * Look up a user's email via the service-role auth admin API. Email addresses
 * are never exposed to the client; this runs only in trusted server code.
 */
export async function getUserEmail(userId: string): Promise<string | null> {
  try {
    const admin = createAdminClient();
    const { data } = await admin.auth.admin.getUserById(userId);
    return data.user?.email ?? null;
  } catch {
    return null;
  }
}

/** Insert an in-app notification (best effort). */
export async function insertNotification(
  userId: string,
  kind: string,
  title: string,
  body?: string,
): Promise<void> {
  const supabase = createClient();
  await supabase.from("notifications").insert({ user_id: userId, kind, title, body: body ?? null });
}

/** Send a transactional email to a user by id (best effort, non-fatal). */
export async function emailUser(
  userId: string,
  build: (email: string) => EmailMessage,
): Promise<void> {
  try {
    const email = await getUserEmail(userId);
    if (!email) return;
    await getEmailProvider().send(build(email));
  } catch {
    /* delivery failure never blocks the underlying action */
  }
}
