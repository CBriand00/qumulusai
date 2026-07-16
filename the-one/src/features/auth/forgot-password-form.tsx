"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { requestPasswordReset, type AuthState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="gold" className="w-full" disabled={pending}>
      {pending ? "Sending…" : "Send Reset Link"}
    </Button>
  );
}

export function ForgotPasswordForm() {
  const [state, formAction] = useFormState<AuthState, FormData>(requestPasswordReset, {});

  return (
    <div>
      <h1 className="text-3xl">Reset your password</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Enter your email and we&apos;ll send you a secure reset link.
      </p>

      <form action={formAction} className="mt-8 space-y-5" noValidate>
        {state.message ? (
          <p className="rounded-md bg-secondary px-4 py-3 text-sm text-secondary-foreground">
            {state.message}
          </p>
        ) : null}
        {state.error ? (
          <p role="alert" className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {state.error}
          </p>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>

        <SubmitButton />
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-foreground hover:text-gold">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
