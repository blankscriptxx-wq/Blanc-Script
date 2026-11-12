"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  connectStripeAction,
  setFollowUpsAction,
  sendTestEmailAction,
  type SettingsResult,
} from "@/app/(os)/(app)/settings/integration-actions";

/** One-click set-up steps that sit under the integrations list. */
export function Connections({
  stripe,
  email,
  followUps,
}: {
  stripe: { configured: boolean; mode: "test" | "live" | null; connected: boolean };
  email: { configured: boolean; from: string };
  followUps: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState("");
  const [note, setNote] = React.useState<{ key: string; ok: boolean; text: string } | null>(null);

  async function run(key: string, fn: () => Promise<SettingsResult>) {
    setBusy(key);
    setNote(null);
    const res = await fn().catch(() => null);
    setBusy("");
    setNote(
      res
        ? { key, ok: res.ok, text: res.ok ? res.message : res.error }
        : { key, ok: false, text: "Something went wrong." },
    );
    if (res?.ok) router.refresh();
  }

  const btn =
    "inline-flex items-center gap-1.5 rounded-sm border border-bs-border-strong bg-bs-surface px-2.5 py-1.5 text-xs font-medium text-bs-text transition-colors hover:bg-bs-surface-2 disabled:opacity-50";

  return (
    <div className="mt-4 space-y-3">
      <div className="rounded-md border border-bs-border p-4">
        <p className="font-medium text-bs-text">
          Stripe automation
          {stripe.mode === "test" ? (
            <span className="ml-2 rounded-pill bg-bs-warning-soft px-2 py-0.5 text-xs font-medium text-bs-warning">
              Test mode
            </span>
          ) : null}
        </p>
        <p className="mt-0.5 text-sm text-bs-muted">
          {stripe.connected
            ? "Connected: when a client pays or a subscription renews, the OS creates the paid invoice and updates the client automatically."
            : "Connect once so payments and monthly renewals update the OS on their own."}
        </p>
        <button
          type="button"
          className={`${btn} mt-2`}
          disabled={busy !== "" || !stripe.configured}
          onClick={() => run("stripe", connectStripeAction)}
        >
          {busy === "stripe" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {stripe.connected ? "Reconnect Stripe" : "Connect Stripe"}
        </button>
        {note?.key === "stripe" ? (
          <p className={`mt-2 text-xs ${note.ok ? "text-bs-success" : "text-bs-danger"}`}>{note.text}</p>
        ) : null}
      </div>

      <div className="rounded-md border border-bs-border p-4">
        <p className="font-medium text-bs-text">Email</p>
        <p className="mt-0.5 text-sm text-bs-muted">
          {email.configured
            ? `Sending as ${email.from}.`
            : "Not connected. Until it is, every email is saved in the log so nothing is lost, and you can copy links to send yourself."}
        </p>
        <button
          type="button"
          className={`${btn} mt-2`}
          disabled={busy !== "" || !email.configured}
          onClick={() => run("email", sendTestEmailAction)}
        >
          {busy === "email" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Send me a test email
        </button>
        {note?.key === "email" ? (
          <p className={`mt-2 text-xs ${note.ok ? "text-bs-success" : "text-bs-danger"}`}>{note.text}</p>
        ) : null}
      </div>

      <div className="rounded-md border border-bs-border p-4">
        <p className="text-sm font-medium text-bs-text">Automatic follow-up emails</p>
        <p className="mt-0.5 text-sm text-bs-muted">
          {followUps ? "On." : "Off."} Once a day the OS politely chases clients who haven&rsquo;t finished setting up
          (login, documents, payment), documents waiting to be accepted, overdue invoices and cuts waiting for review.
          Each is chased a few times, days apart, then left alone.
          {email.configured ? "" : " Nothing is sent until email is connected."}
        </p>
        <button
          type="button"
          className={`${btn} mt-2`}
          disabled={busy !== ""}
          onClick={() => run("followups", () => setFollowUpsAction(!followUps))}
        >
          {busy === "followups" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {followUps ? "Turn follow-ups off" : "Turn follow-ups on"}
        </button>
        {note?.key === "followups" ? (
          <p className={`mt-2 text-xs ${note.ok ? "text-bs-success" : "text-bs-danger"}`}>{note.text}</p>
        ) : null}
      </div>
    </div>
  );
}
