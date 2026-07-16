import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/config/site";

export interface SessionProfile {
  id: string;
  email: string | null;
  role: Role;
  full_name: string | null;
}

/** Returns the current user's profile, or null if not signed in. */
export async function getSessionProfile(): Promise<SessionProfile | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", user.id)
    .single<{ id: string; role: Role; full_name: string | null }>();

  return {
    id: user.id,
    email: user.email ?? null,
    role: profile?.role ?? "applicant",
    full_name: profile?.full_name ?? null,
  };
}

/** Require any signed-in user; redirect to /login otherwise. */
export async function requireUser(): Promise<SessionProfile> {
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  return profile;
}

/** Require a specific role; redirect appropriately otherwise. */
export async function requireRole(role: Role): Promise<SessionProfile> {
  const profile = await requireUser();
  if (profile.role !== role) {
    // Applicants can never reach admin routes; send them to their dashboard.
    redirect(role === "admin" ? "/dashboard" : "/");
  }
  return profile;
}
