"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

export interface AccountResult {
  ok: boolean;
  message?: string;
}

/**
 * Request account + data deletion. Records the request and a confirmation
 * notification. Hard deletion / anonymization is executed by the Phase 5
 * deletion worker, subject to legal retention.
 */
export async function requestAccountDeletion(): Promise<AccountResult> {
  const user = await requireUser();
  const supabase = createClient();

  const { error } = await supabase
    .from("deletion_requests")
    .insert({ user_id: user.id, status: "requested" });
  if (error) return { ok: false, message: error.message };

  await supabase.from("notifications").insert({
    user_id: user.id,
    kind: "deletion_confirmed",
    title: "Deletion request received",
    body: "Your data deletion request has been received and will be processed, subject to legal retention requirements.",
  });

  revalidatePath("/dashboard/settings");
  return { ok: true, message: "Your deletion request has been received." };
}
