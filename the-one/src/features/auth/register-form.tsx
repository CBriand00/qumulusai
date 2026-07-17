"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { signUp, type AuthState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="gold" className="w-full" disabled={pending}>
      {pending ? "Creating account…" : "Create Account"}
    </Button>
  );
}

export function RegisterForm() {
  const [state, formAction] = useFormState<AuthState, FormData>(signUp, {});

  if (state.message) {
    return (
      <div>
        <h1 className="text-3xl">Almost there</h1>
        <p className="mt-4 rounded-md bg-secondary px-4 py-3 text-sm text-secondary-foreground">
          {state.message}
        </p>
        <p className="mt-6 text-sm text-muted-foreground">
          Already verified?{" "}
          <Link href="/login" className="font-medium text-foreground hover:text-gold">
            Sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl">Begin your application</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Create a private account. Your information is never public.
      </p>

      <form action={formAction} className="mt-8 space-y-5" noValidate>
        {state.error ? (
          <p role="alert" className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {state.error}
          </p>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" name="fullName" autoComplete="name" required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" autoComplete="new-password" required />
          <p className="text-xs text-muted-foreground">
            At least 10 characters, with upper &amp; lowercase letters and a number.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required />
        </div>

        <div className="flex items-start gap-3">
          <input
            id="acceptTerms"
            name="acceptTerms"
            type="checkbox"
            required
            className="mt-1 h-4 w-4 rounded border-input text-gold focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Label htmlFor="acceptTerms" className="text-sm font-normal text-muted-foreground">
            I am at least {" "}
            {/* minimum age is re-verified in the application itself */}
            an adult, and I agree to the{" "}
            <Link href="/legal/terms" className="underline hover:text-foreground">Terms of Use</Link>{" "}
            and{" "}
            <Link href="/legal/privacy" className="underline hover:text-foreground">Privacy Policy</Link>.
          </Label>
        </div>

        <SubmitButton />
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-foreground hover:text-gold">
          Sign in
        </Link>
      </p>
    </div>
  );
}
