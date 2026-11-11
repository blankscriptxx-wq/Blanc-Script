"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUpWithEmail } from "./actions";
import { AuthCard, Field } from "@/components/auth/auth-ui";
import { Button } from "@/components/ds/button";

export default function SignUpPage() {
  const [state, formAction, isPending] = useActionState(signUpWithEmail, null);
  return (
    <AuthCard
      title="Create your account"
      subtitle="You'll get access once an owner adds you to the workspace."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/auth/sign-in" className="text-bs-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form action={formAction} className="space-y-4">
        <Field label="Name" name="name" autoComplete="name" />
        <Field label="Email" name="email" type="email" autoComplete="email" />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
        />
        {state?.error ? (
          <p className="text-sm text-bs-danger">{state.error}</p>
        ) : null}
        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </AuthCard>
  );
}
