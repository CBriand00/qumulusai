"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";

export interface ContentResult {
  ok: boolean;
  message?: string;
}

/** Save editable hero/tagline copy to site_content (admin only via RLS). */
export async function saveSiteContent(input: {
  heroHeadline: string;
  heroSubhead: string;
  tagline: string;
}): Promise<ContentResult> {
  const admin = await requireRole("admin");
  const supabase = createClient();

  const rows = [
    { key: "hero_headline", value: input.heroHeadline, updated_by: admin.id },
    { key: "hero_subhead", value: input.heroSubhead, updated_by: admin.id },
    { key: "tagline", value: input.tagline, updated_by: admin.id },
  ];
  const { error } = await supabase.from("site_content").upsert(rows, { onConflict: "key" });
  if (error) return { ok: false, message: error.message };

  revalidatePath("/");
  revalidatePath("/admin/content");
  return { ok: true };
}

/** Toggle whether applications are open (system_settings, admin only). */
export async function setApplicationsOpen(open: boolean): Promise<ContentResult> {
  const admin = await requireRole("admin");
  const supabase = createClient();
  const { error } = await supabase
    .from("system_settings")
    .upsert({ key: "applications_open", value: open, updated_by: admin.id }, { onConflict: "key" });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/");
  revalidatePath("/apply");
  revalidatePath("/admin/content");
  return { ok: true };
}
