"use client";

import * as React from "react";
import { startAuthentication } from "@simplewebauthn/browser";
import { Fingerprint, Loader2 } from "lucide-react";
import { passkeyLoginAction, passkeyLoginOptionsAction, verifyCodeAction } from "@/app/(os)/auth/security/actions";

/** The second sign-in step: a passkey, a 6-digit code, or a recovery code. */
export function VerifyPanel({ hasTotp, hasPasskey, next }: { hasTotp: boolean; hasPasskey: boolean; next?: string }) {
  const [code, setCode] = React.useState("");
  const [busy, setBusy] = React.useState("");
  const [error, setError] = React.useState("");
  const [recovery, setRecovery] = React.useState(!hasTotp && !hasPasskey);

  async function usePasskey() {
    setBusy("passkey");
    setError("");
    try {
      const opts = await passkeyLoginOptionsAction();
      if (!opts.ok) throw new Error(opts.error);
      const response = await startAuthentication({ optionsJSON: opts.options });
      const res = await passkeyLoginAction(response, next);
      if (!res.ok) throw new Error(res.error);
      window.location.href = res.next;
      return;
    } catch (e) {
      setError(e instanceof Error && e.name === "NotAllowedError" ? "The passkey prompt was cancelled." : e instanceof Error ? e.message : "The passkey check failed.");
    }
    setBusy("");
  }

  const btn =
    "inline-flex h-11 w-full items-center justify-center gap-2 rounded-sm bg-bs-primary px-4 text-sm font-medium text-bs-on-accent transition-colors hover:bg-bs-primary-hover disabled:opacity-50";

  return (
    <div className="space-y-4">
      {hasPasskey ? (
        <button type="button" className={btn} disabled={busy !== ""} onClick={usePasskey}>
          {busy === "passkey" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Fingerprint className="h-4 w-4" />}
          Use my passkey
        </button>
      ) : null}
      {hasPasskey && (hasTotp || recovery) ? <p className="text-center text-xs text-bs-subtle">or</p> : null}
      {hasTotp || recovery ? (
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy("code");
            setError("");
            const res = await verifyCodeAction(code, next).catch(() => null);
            if (res?.ok) {
              window.location.href = res.next;
              return;
            }
            setBusy("");
            setError(res && !res.ok ? res.error : "Something went wrong. Please try again.");
          }}
        >
          <label className="block space-y-1.5">
            <span className="block text-sm font-medium">{recovery ? "Recovery code" : "6-digit code from your authenticator app"}</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode={recovery ? "text" : "numeric"}
              autoComplete="one-time-code"
              autoFocus
              placeholder={recovery ? "xxxxx-xxxxx" : "123 456"}
              className="h-11 w-full rounded-sm border border-bs-border-strong bg-bs-surface px-3 text-center text-lg tracking-widest text-bs-text outline-none placeholder:text-bs-subtle"
            />
          </label>
          <button type="submit" className={hasPasskey ? `${btn} border border-bs-border-strong bg-bs-surface text-bs-text hover:bg-bs-surface-2` : btn} disabled={busy !== "" || code.trim().length < 6}>
            {busy === "code" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Confirm
          </button>
        </form>
      ) : null}
      {error ? <p className="text-sm text-bs-danger" role="alert">{error}</p> : null}
      <button type="button" className="block w-full text-center text-xs text-bs-subtle hover:text-bs-text" onClick={() => { setRecovery((r) => !r); setCode(""); setError(""); }}>
        {recovery ? (hasTotp ? "Use my authenticator app instead" : "Back") : "Lost your device? Use a recovery code"}
      </button>
    </div>
  );
}
