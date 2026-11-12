"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { startRegistration } from "@simplewebauthn/browser";
import { Check, Fingerprint, KeyRound, Loader2, ShieldCheck, Smartphone, Trash2 } from "lucide-react";
import {
  confirmTotpAction,
  newRecoveryCodesAction,
  passkeyAddAction,
  passkeyOptionsAction,
  removePasskeyAction,
  removeTotpAction,
  startTotpAction,
} from "@/app/(os)/auth/security/actions";

export type SecurityView = {
  totp: boolean;
  passkeys: { id: string; name: string; added: string; lastUsed: string | null }[];
  recoveryLeft: number;
};

const card = "rounded-md border border-bs-border bg-bs-surface p-5";
const primary =
  "inline-flex h-10 items-center gap-2 rounded-sm bg-bs-primary px-4 text-sm font-medium text-bs-on-accent transition-colors hover:bg-bs-primary-hover disabled:opacity-50";
const ghost =
  "inline-flex h-9 items-center gap-1.5 rounded-sm border border-bs-border-strong bg-bs-surface px-3 text-sm font-medium text-bs-text transition-colors hover:bg-bs-surface-2 disabled:opacity-50";
const input =
  "h-10 rounded-sm border border-bs-border-strong bg-bs-surface px-3 text-sm text-bs-text outline-none placeholder:text-bs-subtle";

/**
 * Set up and manage the second sign-in step: an authenticator app, passkeys
 * and recovery codes. `required` is true for the team (they can't remove
 * their last one); clients can switch it on or off as they like.
 */
export function SecurityPanel({
  state,
  required,
  setup,
  continueHref,
}: {
  state: SecurityView;
  required: boolean;
  setup: boolean;
  continueHref: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState("");
  const [error, setError] = React.useState("");
  const [totp, setTotp] = React.useState<{ secret: string; qr: string } | null>(null);
  const [code, setCode] = React.useState("");
  const [codes, setCodes] = React.useState<string[] | null>(null);
  const [passkeyName, setPasskeyName] = React.useState("");
  const [canPasskey, setCanPasskey] = React.useState(true);
  React.useEffect(() => setCanPasskey(typeof window !== "undefined" && "PublicKeyCredential" in window), []);

  const has = state.totp || state.passkeys.length > 0;

  // Runs an action; returns its successful result (narrowed), or null after showing the error.
  async function run<T extends { ok: boolean }>(key: string, fn: () => Promise<T>): Promise<Extract<T, { ok: true }> | null> {
    setBusy(key);
    setError("");
    const res = await fn().catch(() => null);
    setBusy("");
    if (!res) setError("Something went wrong. Please try again.");
    else if (!res.ok) setError((res as unknown as { error: string }).error);
    return res && res.ok ? (res as Extract<T, { ok: true }>) : null;
  }

  async function addPasskey() {
    const opts = await run("passkey", passkeyOptionsAction);
    if (!opts) return;
    setBusy("passkey");
    try {
      const response = await startRegistration({ optionsJSON: opts.options });
      const res = await passkeyAddAction(response, passkeyName || defaultName());
      if (!res.ok) setError(res.error);
      else {
        setPasskeyName("");
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error && e.name === "NotAllowedError" ? "The passkey prompt was cancelled." : "This device couldn't create a passkey.");
    }
    setBusy("");
  }

  return (
    <div className="space-y-4">
      {setup && !has ? (
        <p className="rounded-md border border-bs-border bg-bs-surface-2 px-4 py-3 text-sm text-bs-text">
          <ShieldCheck className="mr-1.5 inline h-4 w-4 text-bs-primary" />
          Before you can open the studio, add a second sign-in step. Choose either option below — it takes about a
          minute.
        </p>
      ) : null}
      {has ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-bs-border bg-bs-surface px-4 py-3">
          <p className="flex items-center gap-2 text-sm text-bs-success">
            <Check className="h-4 w-4" /> Your account is protected by a second sign-in step.
          </p>
          <a href={continueHref} className={primary}>
            Continue
          </a>
        </div>
      ) : null}
      {error ? <p className="text-sm text-bs-danger" role="alert">{error}</p> : null}

      {codes ? (
        <section className={card}>
          <h2 className="font-display text-h3">Save your recovery codes</h2>
          <p className="mt-1 text-sm text-bs-muted">
            Each code works once if you lose your phone or passkey. Keep them somewhere safe — they won&rsquo;t be
            shown again.
          </p>
          <ul className="mt-3 grid grid-cols-2 gap-2 font-mono text-sm sm:grid-cols-4">
            {codes.map((c) => (
              <li key={c} className="rounded-sm border border-bs-border bg-bs-surface-2 px-2 py-1.5 text-center">{c}</li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className={ghost} onClick={() => navigator.clipboard?.writeText(codes.join("\n")).catch(() => {})}>
              Copy codes
            </button>
            <button type="button" className={ghost} onClick={() => setCodes(null)}>
              I&rsquo;ve saved them
            </button>
          </div>
        </section>
      ) : null}

      <section className={card}>
        <h2 className="flex items-center gap-2 font-display text-h3">
          <Smartphone className="h-4 w-4 text-bs-muted" /> Authenticator app
        </h2>
        {state.totp ? (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-bs-muted">Set up. You&rsquo;ll be asked for a 6-digit code when you sign in on a new device.</p>
            <button
              type="button"
              className="text-xs text-bs-subtle hover:text-bs-danger"
              disabled={busy !== ""}
              onClick={async () => {
                if (!window.confirm("Remove the authenticator app from your account?")) return;
                if (await run("rm-totp", removeTotpAction)) router.refresh();
              }}
            >
              Remove
            </button>
          </div>
        ) : totp ? (
          <div className="mt-3 grid gap-5 sm:grid-cols-[220px_1fr]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={totp.qr} alt="QR code to scan with your authenticator app" width={220} height={220} className="rounded-sm border border-bs-border bg-white" />
            <div>
              <ol className="list-decimal space-y-1.5 pl-5 text-sm text-bs-text">
                <li>Open an authenticator app (Google Authenticator, Microsoft Authenticator, Authy or 1Password).</li>
                <li>Scan the QR code — or enter this key by hand:</li>
              </ol>
              <p className="mt-2 break-all rounded-sm border border-bs-border bg-bs-surface-2 px-3 py-2 font-mono text-xs">{totp.secret.replace(/(.{4})/g, "$1 ").trim()}</p>
              <form
                className="mt-3 flex flex-wrap items-center gap-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const res = await run("confirm", () => confirmTotpAction(code));
                  if (res) {
                    setTotp(null);
                    setCode("");
                    if (res.recoveryCodes.length) setCodes(res.recoveryCodes);
                    router.refresh();
                  }
                }}
              >
                <input className={`${input} w-40 tracking-widest`} inputMode="numeric" autoComplete="one-time-code" maxLength={7} value={code} onChange={(e) => setCode(e.target.value)} placeholder="6-digit code" aria-label="6-digit code from your app" />
                <button type="submit" className={primary} disabled={busy !== "" || code.replace(/\s/g, "").length < 6}>
                  {busy === "confirm" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Confirm
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-bs-muted">A 6-digit code from an app on your phone. Works on any device.</p>
            <button
              type="button"
              className={has ? ghost : primary}
              disabled={busy !== ""}
              onClick={async () => {
                const res = await run("totp", startTotpAction);
                if (res) setTotp({ secret: res.secret, qr: res.qr });
              }}
            >
              {busy === "totp" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Set up authenticator app
            </button>
          </div>
        )}
      </section>

      <section className={card}>
        <h2 className="flex items-center gap-2 font-display text-h3">
          <Fingerprint className="h-4 w-4 text-bs-muted" /> Passkeys
        </h2>
        <p className="mt-1 text-sm text-bs-muted">
          Confirm it&rsquo;s you with Face ID, Touch ID, Windows Hello or a security key — no code to type.
        </p>
        {state.passkeys.length ? (
          <ul className="mt-3 space-y-2">
            {state.passkeys.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-2 rounded-sm border border-bs-border px-3 py-2">
                <span className="min-w-0 flex-1 text-sm">
                  <span className="font-medium text-bs-text">{p.name}</span>
                  <span className="block text-xs text-bs-subtle">
                    Added {p.added}
                    {p.lastUsed ? ` · last used ${p.lastUsed}` : ""}
                  </span>
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${p.name}`}
                  className="text-bs-subtle hover:text-bs-danger"
                  disabled={busy !== ""}
                  onClick={async () => {
                    if (!window.confirm(`Remove the passkey "${p.name}"?`)) return;
                    if (await run(`rm-${p.id}`, () => removePasskeyAction(p.id))) router.refresh();
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {canPasskey ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input className={`${input} min-w-[200px] flex-1`} value={passkeyName} onChange={(e) => setPasskeyName(e.target.value)} placeholder="Name it, e.g. My iPhone" aria-label="Name for this passkey" />
            <button type="button" className={has ? ghost : primary} disabled={busy !== ""} onClick={addPasskey}>
              {busy === "passkey" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Fingerprint className="h-4 w-4" />}
              Add a passkey
            </button>
          </div>
        ) : (
          <p className="mt-3 text-sm text-bs-subtle">This browser doesn&rsquo;t support passkeys. Use the authenticator app instead.</p>
        )}
      </section>

      {has ? (
        <section className={card}>
          <h2 className="flex items-center gap-2 font-display text-h3">
            <KeyRound className="h-4 w-4 text-bs-muted" /> Recovery codes
          </h2>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-bs-muted">
              {state.recoveryLeft
                ? `${state.recoveryLeft} unused ${state.recoveryLeft === 1 ? "code" : "codes"} left.`
                : "You have no recovery codes. Create some in case you lose your device."}
            </p>
            <button
              type="button"
              className={ghost}
              disabled={busy !== ""}
              onClick={async () => {
                if (state.recoveryLeft && !window.confirm("Create new recovery codes? Your old ones will stop working.")) return;
                const res = await run("codes", newRecoveryCodesAction);
                if (res) {
                  setCodes(res.recoveryCodes);
                  router.refresh();
                }
              }}
            >
              {busy === "codes" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {state.recoveryLeft ? "Create new codes" : "Create recovery codes"}
            </button>
          </div>
        </section>
      ) : null}

      <p className="text-xs text-bs-subtle">
        {required
          ? "Team accounts must keep at least one second step. If you lose access to all of them, an owner can reset your sign-in security from the Team page."
          : "This is optional for client accounts. If you add one, you'll be asked for it when you sign in on a new device."}
      </p>
    </div>
  );
}

function defaultName(): string {
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Android/.test(ua)) return "Android phone";
  if (/Mac/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows PC";
  return "Passkey";
}
