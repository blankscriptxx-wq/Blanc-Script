import "server-only";
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { and, eq, sql } from "drizzle-orm";
import QRCode from "qrcode";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from "@simplewebauthn/server";
import { getDb } from "@/lib/db/client";
import { passkeys, userSecurity } from "@/lib/db/schema";

/**
 * The second sign-in step. Neon Auth handles the password; this adds what it
 * doesn't offer yet: authenticator-app codes (TOTP), passkeys (WebAuthn) and
 * one-time recovery codes. Staff must have one set up and must pass it on
 * each device; clients may switch it on for themselves.
 *
 * After the second step succeeds, a signed cookie remembers this browser for
 * this account for a week. Secrets are encrypted at rest; recovery codes are
 * stored hashed.
 */

const VERIFIED_COOKIE = "bs_2fa";
const CHALLENGE_COOKIE = "bs_wa";
const VERIFIED_DAYS = 7;
const RP_NAME = "Blanc Script Studio";

function key(purpose: string): Buffer {
  const secret = process.env.NEON_AUTH_COOKIE_SECRET;
  if (!secret) throw new Error("Auth not configured.");
  return createHash("sha256").update(`${purpose}:${secret}`).digest();
}

function origin(): string {
  return (process.env.APP_ORIGIN?.trim() || "https://studio.blancscript.com").replace(/\/$/, "");
}
const rpId = () => new URL(origin()).hostname;

// ── Small crypto helpers ──────────────────────────────────────────────────

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function base32(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}
function unbase32(s: string): Buffer {
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of s.replace(/=+$/, "").toUpperCase()) {
    const i = B32.indexOf(ch);
    if (i < 0) continue;
    value = (value << 5) | i;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key("totp"), iv);
  const body = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), body].map((b) => b.toString("base64url")).join(".");
}
function decrypt(stored: string): string {
  const [iv, tag, body] = stored.split(".").map((p) => Buffer.from(p, "base64url"));
  const d = createDecipheriv("aes-256-gcm", key("totp"), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(body), d.final()]).toString("utf8");
}

const sign = (value: string) => createHmac("sha256", key("cookie")).update(value).digest("base64url");
function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
const hashCode = (code: string) => createHash("sha256").update(`recovery:${code}`).digest("base64url");

/** RFC 6238 time-based code for one 30-second step. */
function totpAt(secret: Buffer, step: number): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const h = createHmac("sha1", secret).update(counter).digest();
  const o = h[h.length - 1] & 15;
  const n = ((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(n % 1_000_000).padStart(6, "0");
}
function totpMatches(secretB32: string, code: string): boolean {
  const clean = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(clean)) return false;
  const secret = unbase32(secretB32);
  const now = Math.floor(Date.now() / 30_000);
  // Accept the step either side, for clocks that are slightly out.
  return [0, -1, 1].some((d) => safeEqual(totpAt(secret, now + d), clean));
}

// ── State ─────────────────────────────────────────────────────────────────

export type SecurityState = {
  totp: boolean;
  passkeys: { id: string; name: string; createdAt: Date; lastUsedAt: Date | null }[];
  recoveryLeft: number;
};

export const getSecurityState = cache(async (userId: string): Promise<SecurityState> => {
  const db = getDb();
  const [[sec], keys] = await Promise.all([
    db
      .select({ enabledAt: userSecurity.totpEnabledAt, recovery: userSecurity.recoveryHashes })
      .from(userSecurity)
      .where(eq(userSecurity.userId, userId))
      .limit(1),
    db
      .select({ id: passkeys.id, name: passkeys.name, createdAt: passkeys.createdAt, lastUsedAt: passkeys.lastUsedAt })
      .from(passkeys)
      .where(eq(passkeys.userId, userId))
      .orderBy(passkeys.createdAt),
  ]);
  return { totp: Boolean(sec?.enabledAt), passkeys: keys, recoveryLeft: sec?.recovery?.length ?? 0 };
});

export const hasSecondFactor = (s: SecurityState) => s.totp || s.passkeys.length > 0;

/** Has this browser already passed the second step for this account? */
export async function isSecondFactorVerified(userId: string): Promise<boolean> {
  const raw = (await cookies()).get(VERIFIED_COOKIE)?.value;
  if (!raw) return false;
  const [uid, exp, sig] = raw.split(".");
  if (!uid || !exp || !sig || uid !== userId || Number(exp) < Date.now()) return false;
  return safeEqual(sig, sign(`${uid}.${exp}`));
}

async function markVerified(userId: string) {
  const exp = Date.now() + VERIFIED_DAYS * 24 * 60 * 60 * 1000;
  (await cookies()).set(VERIFIED_COOKIE, `${userId}.${exp}.${sign(`${userId}.${exp}`)}`, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    expires: new Date(exp),
  });
}

export async function clearVerified() {
  (await cookies()).delete(VERIFIED_COOKIE);
}

/**
 * Where someone stands:
 *   ok      nothing more to do
 *   setup   they must set up a second step first (staff only)
 *   verify  they have one and need to pass it on this browser
 */
export const secondFactorGate = cache(async (userId: string, required: boolean): Promise<"ok" | "setup" | "verify"> => {
  const state = await getSecurityState(userId);
  if (!hasSecondFactor(state)) return required ? "setup" : "ok";
  return (await isSecondFactorVerified(userId)) ? "ok" : "verify";
});

// ── Authenticator app (TOTP) ──────────────────────────────────────────────

/** Start setting up an authenticator app: a new secret, as a QR code and as text. */
export async function beginTotpSetup(userId: string, email: string): Promise<{ secret: string; qr: string }> {
  const db = getDb();
  const [row] = await db.select({ enabledAt: userSecurity.totpEnabledAt }).from(userSecurity).where(eq(userSecurity.userId, userId)).limit(1);
  if (row?.enabledAt) throw new Error("An authenticator app is already set up.");
  const secret = base32(randomBytes(20));
  await db
    .insert(userSecurity)
    .values({ userId, totpSecretEnc: encrypt(secret) })
    .onConflictDoUpdate({ target: userSecurity.userId, set: { totpSecretEnc: encrypt(secret), updatedAt: new Date() } });
  const uri = `otpauth://totp/${encodeURIComponent(`${RP_NAME}:${email}`)}?secret=${secret}&issuer=${encodeURIComponent(RP_NAME)}&algorithm=SHA1&digits=6&period=30`;
  return { secret, qr: await QRCode.toDataURL(uri, { margin: 1, width: 220 }) };
}

function newRecoveryCodes(): string[] {
  return Array.from({ length: 8 }, () => {
    const raw = randomBytes(5).toString("hex");
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  });
}

/** Confirm the authenticator app with a first code. Returns recovery codes (shown once). */
export async function confirmTotp(userId: string, code: string): Promise<{ recoveryCodes: string[] }> {
  const db = getDb();
  const [row] = await db.select().from(userSecurity).where(eq(userSecurity.userId, userId)).limit(1);
  if (!row?.totpSecretEnc) throw new Error("Start the set-up again.");
  if (row.totpEnabledAt) throw new Error("An authenticator app is already set up.");
  if (!totpMatches(decrypt(row.totpSecretEnc), code)) throw new Error("That code isn't right. Check the app and try again.");
  const codes = row.recoveryHashes?.length ? [] : newRecoveryCodes();
  await db
    .update(userSecurity)
    .set({ totpEnabledAt: new Date(), updatedAt: new Date(), ...(codes.length ? { recoveryHashes: codes.map(hashCode) } : {}) })
    .where(eq(userSecurity.userId, userId));
  await markVerified(userId);
  return { recoveryCodes: codes };
}

/** Check a 6-digit code, or a recovery code (which is then used up). */
export async function verifyCode(userId: string, code: string): Promise<boolean> {
  const db = getDb();
  const [row] = await db.select().from(userSecurity).where(eq(userSecurity.userId, userId)).limit(1);
  if (!row) return false;
  const clean = code.trim().toLowerCase();
  if (row.totpEnabledAt && row.totpSecretEnc && totpMatches(decrypt(row.totpSecretEnc), clean)) {
    await markVerified(userId);
    return true;
  }
  const hash = hashCode(clean);
  if ((row.recoveryHashes ?? []).includes(hash)) {
    await db
      .update(userSecurity)
      .set({ recoveryHashes: (row.recoveryHashes ?? []).filter((h) => h !== hash), updatedAt: new Date() })
      .where(eq(userSecurity.userId, userId));
    await markVerified(userId);
    return true;
  }
  return false;
}

/** New recovery codes, replacing any old ones. */
export async function regenerateRecoveryCodes(userId: string): Promise<string[]> {
  const codes = newRecoveryCodes();
  await getDb()
    .insert(userSecurity)
    .values({ userId, recoveryHashes: codes.map(hashCode) })
    .onConflictDoUpdate({ target: userSecurity.userId, set: { recoveryHashes: codes.map(hashCode), updatedAt: new Date() } });
  return codes;
}

export async function removeTotp(userId: string): Promise<void> {
  await getDb()
    .update(userSecurity)
    .set({ totpSecretEnc: null, totpEnabledAt: null, updatedAt: new Date() })
    .where(eq(userSecurity.userId, userId));
}

/** Wipe someone's second step entirely (an owner helping a locked-out colleague). */
export async function resetSecondFactor(userId: string): Promise<void> {
  const db = getDb();
  await db.delete(passkeys).where(eq(passkeys.userId, userId));
  await db.delete(userSecurity).where(eq(userSecurity.userId, userId));
}

// ── Passkeys (WebAuthn) ───────────────────────────────────────────────────

async function setChallenge(challenge: string) {
  const exp = Date.now() + 5 * 60 * 1000;
  (await cookies()).set(CHALLENGE_COOKIE, `${challenge}.${exp}.${sign(`${challenge}.${exp}`)}`, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    expires: new Date(exp),
  });
}
async function takeChallenge(): Promise<string> {
  const jar = await cookies();
  const raw = jar.get(CHALLENGE_COOKIE)?.value ?? "";
  jar.delete(CHALLENGE_COOKIE);
  const i = raw.lastIndexOf(".");
  const j = raw.lastIndexOf(".", i - 1);
  const challenge = raw.slice(0, j);
  const exp = raw.slice(j + 1, i);
  const sig = raw.slice(i + 1);
  if (!challenge || Number(exp) < Date.now() || !safeEqual(sig, sign(`${challenge}.${exp}`))) {
    throw new Error("That took too long. Please try again.");
  }
  return challenge;
}

export async function passkeyRegistrationOptions(user: { id: string; email: string; name: string }) {
  const existing = await getDb().select({ credentialId: passkeys.credentialId, transports: passkeys.transports }).from(passkeys).where(eq(passkeys.userId, user.id));
  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: rpId(),
    userName: user.email,
    userDisplayName: user.name,
    userID: new TextEncoder().encode(user.id),
    attestationType: "none",
    excludeCredentials: existing.map((c) => ({ id: c.credentialId, transports: c.transports as never })),
    authenticatorSelection: { residentKey: "preferred", userVerification: "preferred" },
  });
  await setChallenge(options.challenge);
  return options;
}

export async function passkeyRegister(userId: string, response: RegistrationResponseJSON, name: string): Promise<void> {
  const expectedChallenge = await takeChallenge();
  const result = await verifyRegistrationResponse({ response, expectedChallenge, expectedOrigin: origin(), expectedRPID: rpId(), requireUserVerification: false });
  if (!result.verified || !result.registrationInfo) throw new Error("That passkey couldn't be confirmed. Please try again.");
  const cred = result.registrationInfo.credential;
  await getDb().insert(passkeys).values({
    userId,
    credentialId: cred.id,
    publicKey: Buffer.from(cred.publicKey).toString("base64url"),
    counter: cred.counter,
    transports: (response.response.transports ?? []) as string[],
    name: name.trim().slice(0, 60) || "Passkey",
  });
  await markVerified(userId);
}

export async function passkeyAuthenticationOptions(userId: string) {
  const creds = await getDb().select({ credentialId: passkeys.credentialId, transports: passkeys.transports }).from(passkeys).where(eq(passkeys.userId, userId));
  if (!creds.length) throw new Error("No passkey is set up for this account.");
  const options = await generateAuthenticationOptions({
    rpID: rpId(),
    userVerification: "preferred",
    allowCredentials: creds.map((c) => ({ id: c.credentialId, transports: c.transports as never })),
  });
  await setChallenge(options.challenge);
  return options;
}

export async function passkeyAuthenticate(userId: string, response: AuthenticationResponseJSON): Promise<boolean> {
  const expectedChallenge = await takeChallenge();
  const db = getDb();
  const [cred] = await db.select().from(passkeys).where(and(eq(passkeys.userId, userId), eq(passkeys.credentialId, response.id))).limit(1);
  if (!cred) return false;
  const result = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin(),
    expectedRPID: rpId(),
    requireUserVerification: false,
    credential: { id: cred.credentialId, publicKey: new Uint8Array(Buffer.from(cred.publicKey, "base64url")), counter: cred.counter, transports: cred.transports as never },
  });
  if (!result.verified) return false;
  await db.update(passkeys).set({ counter: result.authenticationInfo.newCounter, lastUsedAt: new Date() }).where(eq(passkeys.id, cred.id));
  await markVerified(userId);
  return true;
}

export async function removePasskey(userId: string, id: string): Promise<void> {
  await getDb().delete(passkeys).where(and(eq(passkeys.id, id), eq(passkeys.userId, userId)));
}

/** How many of a workspace's people have a second step (for the Team page). */
export async function securityByUser(userIds: string[]): Promise<Map<string, { totp: boolean; passkeys: number }>> {
  const out = new Map<string, { totp: boolean; passkeys: number }>();
  if (!userIds.length) return out;
  const { rows } = await getDb().execute(sql`
    select u.id::text as id,
      exists (select 1 from user_security s where s.user_id = u.id and s.totp_enabled_at is not null) as totp,
      (select count(*)::int from passkeys p where p.user_id = u.id) as passkeys
    from unnest(${userIds}::uuid[]) as u(id)
  `);
  for (const r of rows as { id: string; totp: boolean; passkeys: number }[]) out.set(r.id, { totp: r.totp, passkeys: Number(r.passkeys) });
  return out;
}
