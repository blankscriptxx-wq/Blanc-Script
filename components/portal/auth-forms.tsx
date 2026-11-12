"use client";

import * as React from "react";
import { useActionState } from "react";
import {
  portalClaimAction,
  portalSignInAction,
  type PortalAuthState,
} from "@/app/(os)/portal/auth-actions";

const inputCls =
  "h-10 w-full rounded-sm border border-bs-border-strong bg-bs-surface px-3 text-bs-text outline-none placeholder:text-bs-subtle";
const btnCls =
  "inline-flex h-10 w-full items-center justify-center rounded-sm bg-bs-primary px-4 text-sm font-medium text-bs-on-accent transition-colors hover:bg-bs-primary-hover disabled:opacity-50";

export function PortalShell({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-bs-canvas px-4 text-bs-text">
      <div className="w-full max-w-sm">
        <div className="mb-6 font-display text-lg font-extrabold uppercase leading-none tracking-tight">
          Blanc<span className="text-bs-primary">Script</span>
          <span className="text-bs-accent">.</span>
        </div>
        <div className="rounded-lg border border-bs-border bg-bs-surface p-6 shadow-elev-2">
          <h1 className="font-display text-h1">{title}</h1>
          <p className="mt-1 text-sm text-bs-muted">{intro}</p>
          <div className="mt-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

/** Invite: the email is fixed; the person picks their name and a password. */
export function PortalClaimForm({ token, email, name }: { token: string; email: string; name: string }) {
  const [state, action, pending] = useActionState<PortalAuthState, FormData>(portalClaimAction, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <label className="block space-y-1.5">
        <span className="block text-sm font-medium">Email</span>
        <input value={email} readOnly className={`${inputCls} bg-bs-surface-2 text-bs-muted`} />
      </label>
      <label className="block space-y-1.5">
        <span className="block text-sm font-medium">Your name</span>
        <input
          name="name"
          required
          key={state?.name ?? name}
          defaultValue={state?.name ?? name}
          autoComplete="name"
          className={inputCls}
        />
      </label>
      <label className="block space-y-1.5">
        <span className="block text-sm font-medium">Choose a password</span>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="At least 8 characters"
          className={inputCls}
        />
      </label>
      {state?.error ? <p className="text-sm text-bs-danger">{state.error}</p> : null}
      <button type="submit" disabled={pending} className={btnCls}>
        {pending ? "Setting up…" : "Create my login"}
      </button>
    </form>
  );
}

export function PortalSignInForm({ email = "" }: { email?: string }) {
  const [state, action, pending] = useActionState<PortalAuthState, FormData>(portalSignInAction, null);
  return (
    <form action={action} className="space-y-4">
      <label className="block space-y-1.5">
        <span className="block text-sm font-medium">Email</span>
        <input
          name="email"
          type="email"
          required
          key={state?.email ?? email}
          defaultValue={state?.email ?? email}
          autoComplete="email"
          className={inputCls}
        />
      </label>
      <label className="block space-y-1.5">
        <span className="block text-sm font-medium">Password</span>
        <input name="password" type="password" required autoComplete="current-password" className={inputCls} />
      </label>
      {state?.error ? <p className="text-sm text-bs-danger">{state.error}</p> : null}
      <button type="submit" disabled={pending} className={btnCls}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
