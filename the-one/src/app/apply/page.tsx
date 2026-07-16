import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { siteConfig } from "@/config/site";

/**
 * Application entry point.
 * - Not signed in → register.
 * - Signed-in admin → admin dashboard (admins don't apply).
 * - Signed-in applicant → the multi-step application (Phase 2).
 */
export default async function ApplyPage() {
  if (!siteConfig.applicationsOpen) {
    redirect("/apply/closed");
  }

  const profile = await getSessionProfile();
  if (!profile) redirect("/register");
  if (profile.role === "admin") redirect("/admin");
  redirect("/application");
}
