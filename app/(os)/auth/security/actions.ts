"use server";

import { redirect } from "next/navigation";
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from "@simplewebauthn/server";
import { getCurrentUser } from "@/lib/auth/session";
import {
  beginTotpSetup,
  confirmTotp,
  getSecurityState,
  hasSecondFactor,
  isSecondFactorVerified,
  passkeyAuthenticate,
  passkeyAuthenticationOptions,
  passkeyRegister,
  passkeyRegistrationOptions,
  regenerateRecoveryCodes,
  removePasskey,
  removeTotp,
  verifyCode,
} from "@/lib/auth/mfa";

export type SecurityResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const fail = (e: unknown, fallback: string) => ({ ok: false as const, error: e instanceof Error ? e.message : fallback });

async function me() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");
  return user;
}

/** Changing your security needs the second step to have been passed here (once you have one). */
async function meVerified() {
  const user = await me();
  const state = await getSecurityState(user.id);
  if (hasSecondFactor(state) && !(await isSecondFactorVerified(user.id))) {
    throw new Error("Confirm it's you first.");
  }
  return { user, state };
}

/** Only allow staying on our own site after the second step. */
function safeNext(next: string | undefined, fallback: string): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}

// ── Passing the second step ───────────────────────────────────────────────

export async function verifyCodeAction(code: string, next?: string): Promise<SecurityResult<{ next: string }>> {
  try {
    const user = await me();
    if (!(await verifyCode(user.id, code))) return { ok: false, error: "That code isn't right. Try the newest code from your app." };
    return { ok: true, next: safeNext(next, user.hasAccess ? "/today" : "/portal") };
  } catch (e) {
    return fail(e, "Could not check the code.");
  }
}

export async function passkeyLoginOptionsAction(): Promise<SecurityResult<{ options: Awaited<ReturnType<typeof passkeyAuthenticationOptions>> }>> {
  try {
    const user = await me();
    return { ok: true, options: await passkeyAuthenticationOptions(user.id) };
  } catch (e) {
    return fail(e, "Could not start the passkey check.");
  }
}

export async function passkeyLoginAction(response: AuthenticationResponseJSON, next?: string): Promise<SecurityResult<{ next: string }>> {
  try {
    const user = await me();
    if (!(await passkeyAuthenticate(user.id, response))) return { ok: false, error: "That passkey wasn't recognised." };
    return { ok: true, next: safeNext(next, user.hasAccess ? "/today" : "/portal") };
  } catch (e) {
    return fail(e, "The passkey check failed.");
  }
}

// ── Setting up and managing ───────────────────────────────────────────────

export async function startTotpAction(): Promise<SecurityResult<{ secret: string; qr: string }>> {
  try {
    const { user } = await meVerified();
    return { ok: true, ...(await beginTotpSetup(user.id, user.email)) };
  } catch (e) {
    return fail(e, "Could not start the set-up.");
  }
}

export async function confirmTotpAction(code: string): Promise<SecurityResult<{ recoveryCodes: string[] }>> {
  try {
    const { user } = await meVerified();
    return { ok: true, ...(await confirmTotp(user.id, code)) };
  } catch (e) {
    return fail(e, "Could not confirm the code.");
  }
}

export async function passkeyOptionsAction(): Promise<SecurityResult<{ options: Awaited<ReturnType<typeof passkeyRegistrationOptions>> }>> {
  try {
    const { user } = await meVerified();
    return { ok: true, options: await passkeyRegistrationOptions({ id: user.id, email: user.email, name: user.name }) };
  } catch (e) {
    return fail(e, "Could not start adding a passkey.");
  }
}

export async function passkeyAddAction(response: RegistrationResponseJSON, name: string): Promise<SecurityResult> {
  try {
    const { user } = await meVerified();
    await passkeyRegister(user.id, response, name);
    return { ok: true };
  } catch (e) {
    return fail(e, "Could not add the passkey.");
  }
}

/** Staff must always keep at least one second step. */
async function assertNotLast(user: { hasAccess: boolean }, remaining: number) {
  if (user.hasAccess && remaining < 1) {
    throw new Error("Team accounts need at least one second step. Add another before removing this one.");
  }
}

export async function removePasskeyAction(id: string): Promise<SecurityResult> {
  try {
    const { user, state } = await meVerified();
    await assertNotLast(user, state.passkeys.filter((p) => p.id !== id).length + (state.totp ? 1 : 0));
    await removePasskey(user.id, id);
    return { ok: true };
  } catch (e) {
    return fail(e, "Could not remove the passkey.");
  }
}

export async function removeTotpAction(): Promise<SecurityResult> {
  try {
    const { user, state } = await meVerified();
    await assertNotLast(user, state.passkeys.length);
    await removeTotp(user.id);
    return { ok: true };
  } catch (e) {
    return fail(e, "Could not remove the authenticator app.");
  }
}

export async function newRecoveryCodesAction(): Promise<SecurityResult<{ recoveryCodes: string[] }>> {
  try {
    const { user } = await meVerified();
    return { ok: true, recoveryCodes: await regenerateRecoveryCodes(user.id) };
  } catch (e) {
    return fail(e, "Could not create new codes.");
  }
}
