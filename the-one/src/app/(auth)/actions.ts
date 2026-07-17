"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { siteConfig } from "@/config/site";
import { loginSchema, registerSchema, forgotPasswordSchema } from "@/lib/validation/auth";

export interface AuthState {
  error?: string;
  message?: string;
}

/** Sign in with email + password. */
export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    // Generic message avoids leaking which accounts exist.
    return { error: "Incorrect email or password." };
  }

  redirect("/dashboard");
}

/** Register a new applicant account. Consent is recorded on the profile. */
export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = registerSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    acceptTerms: formData.get("acceptTerms") === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${siteConfig.url}/auth/callback`,
      // New accounts are always applicants. Role is set server-side by a DB
      // trigger to 'applicant'; it can never be self-assigned as admin.
      data: {
        full_name: parsed.data.fullName,
        terms_accepted_at: new Date().toISOString(),
      },
    },
  });
  if (error) {
    return { error: error.message };
  }

  return {
    message:
      "Check your email to verify your account. Once verified, you can sign in and begin your application.",
  };
}

/** Send a password reset email. */
export async function requestPasswordReset(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }

  const supabase = createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteConfig.url}/auth/callback?next=/reset-password`,
  });

  // Always return success to avoid revealing whether an email is registered.
  return {
    message: "If an account exists for that email, a reset link has been sent.",
  };
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/");
}
