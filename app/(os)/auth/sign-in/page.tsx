"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signInWithEmail } from "./actions";
import { AuthCard, Field } from "@/components/auth/auth-ui";
import { Button } from "@/components/ds/button";

export default function SignInPage() {
  const [state, formAction, isPending] = useActionState(signInWithEmail, null);
  return (
    <AuthCard
      title="Sign in"
      subtitle="Welcome back."
      footer={
        <>
          New here?{" "}
          <Link href="/auth/sign-up" className="text-bs-primary hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form action={formAction} className="space-y-4">
        <Field label="Email" name="email" type="email" autoComplete="email" />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
        />
        {state?.error ? (
          <p className="text-sm text-bs-danger">{state.error}</p>
        ) : null}
        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AuthCard>
  );
}
