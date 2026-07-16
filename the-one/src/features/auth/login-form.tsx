"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { signIn, type AuthState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="gold" className="w-full" disabled={pending}>
      {pending ? "Signing in…" : "Sign In"}
    </Button>
  );
}

export function LoginForm() {
  const [state, formAction] = useFormState<AuthState, FormData>(signIn, {});

  return (
    <div>
      <h1 className="text-3xl">Welcome back</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Sign in to continue your application.
      </p>

      <form action={formAction} className="mt-8 space-y-5" noValidate>
        {state.error ? (
          <p role="alert" className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {state.error}
          </p>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground">
              Forgot password?
            </Link>
          </div>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </div>

        <SubmitButton />
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link href="/register" className="font-medium text-foreground hover:text-gold">
          Create an account
        </Link>
      </p>
    </div>
  );
}
