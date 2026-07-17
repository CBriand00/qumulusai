"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";
import { insertNotification } from "@/lib/notify";

export interface PrivacyResult {
  ok: boolean;
  message?: string;
}

/**
 * Process a deletion request: permanently delete the user (service role,
 * cascades to all applicant data) and mark the request completed.
 */
export async function processDeletionRequest(requestId: string, userId: string): Promise<PrivacyResult> {
  const admin = await requireRole("admin");
  const supabase = createClient();

  try {
    const svc = createAdminClient();
    const { error } = await svc.auth.admin.deleteUser(userId);
    if (error) return { ok: false, message: error.message };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Deletion failed." };
  }

  // The request row FK cascades on user delete; if it somehow remains, mark it.
  await supabase.from("deletion_requests").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", requestId);

  await supabase.from("audit_logs").insert({
    actor_id: admin.id,
    action: "deletion_processed",
    entity: "user",
    entity_id: userId,
  });

  revalidatePath("/admin/privacy");
  return { ok: true };
}

/** Mark a data-export request as delivered (the JSON is user-downloadable). */
export async function markExportDelivered(requestId: string): Promise<PrivacyResult> {
  await requireRole("admin");
  const supabase = createClient();
  await supabase
    .from("data_export_requests")
    .update({ status: "delivered", completed_at: new Date().toISOString() })
    .eq("id", requestId);
  revalidatePath("/admin/privacy");
  return { ok: true };
}

/** Reject a deletion request (e.g. pending dispute), notifying the user. */
export async function rejectDeletionRequest(requestId: string, userId: string): Promise<PrivacyResult> {
  await requireRole("admin");
  const supabase = createClient();
  await supabase.from("deletion_requests").update({ status: "rejected" }).eq("id", requestId);
  await insertNotification(userId, "security_notice", "Your deletion request needs attention", "Please contact us regarding your request.");
  revalidatePath("/admin/privacy");
  return { ok: true };
}
