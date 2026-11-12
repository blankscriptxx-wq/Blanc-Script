"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, CreditCard, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import {
  checkPaymentAction,
  createPaymentLinkAction,
} from "@/app/(os)/(app)/finance/[id]/actions";

export type PaymentsInfo = {
  configured: boolean;
  mode: "test" | "live" | null;
  webhook: boolean;
};

function money(p: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(p / 100);
}

/**
 * Online payment for a client invoice: create a Stripe payment link for the
 * grand total, share it, and confirm when it's paid.
 */
export function OnlinePayment({
  invoiceId,
  status,
  isTalentPayment,
  paymentUrl,
  hasStripeLink,
  linkAmountPence,
  grossPence,
  payments,
}: {
  invoiceId: string;
  status: string;
  isTalentPayment: boolean;
  paymentUrl: string | null;
  hasStripeLink: boolean;
  linkAmountPence: number | null;
  grossPence: number;
  payments: PaymentsInfo;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<"" | "create" | "check">("");
  const [note, setNote] = React.useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [copied, setCopied] = React.useState(false);

  if (isTalentPayment) return null;

  const paid = status === "paid";
  const stale = hasStripeLink && linkAmountPence != null && linkAmountPence !== grossPence;

  async function run(kind: "create" | "check") {
    setBusy(kind);
    setNote(null);
    try {
      const res =
        kind === "create"
          ? await createPaymentLinkAction(invoiceId)
          : await checkPaymentAction(invoiceId);
      setNote(res.ok ? { tone: "ok", text: res.message } : { tone: "error", text: res.error });
      if (res.ok) router.refresh();
    } catch (e) {
      setNote({ tone: "error", text: e instanceof Error ? e.message : "Something went wrong." });
    } finally {
      setBusy("");
    }
  }

  const btn =
    "inline-flex items-center gap-1.5 rounded-sm border border-bs-border-strong bg-bs-surface px-2.5 py-1.5 text-xs font-medium text-bs-text transition-colors hover:bg-bs-surface-2 disabled:opacity-60";

  return (
    <section className="mt-4 rounded-md border border-bs-border bg-bs-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-h3 text-bs-text">
          <CreditCard className="h-4 w-4 text-bs-muted" /> Online payment
        </h2>
        {payments.mode === "test" ? (
          <span className="rounded-pill bg-bs-warning-soft px-2 py-0.5 text-xs font-medium text-bs-warning">
            Stripe test mode
          </span>
        ) : null}
      </div>

      {!payments.configured ? (
        <p className="mt-2 text-sm text-bs-muted">
          Stripe isn&rsquo;t connected yet. Add a Stripe secret key to take card payment on
          invoices.
        </p>
      ) : paid ? (
        <p className="mt-2 flex items-center gap-2 text-sm text-bs-success">
          <Check className="h-4 w-4" /> This invoice is paid.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {paymentUrl ? (
            <div className="flex flex-wrap items-center gap-2">
              <input
                readOnly
                value={paymentUrl}
                aria-label="Payment link"
                onFocus={(e) => e.currentTarget.select()}
                className="h-9 min-w-0 flex-1 rounded-sm border border-bs-border-strong bg-bs-surface-2 px-3 font-mono text-xs text-bs-text outline-none"
              />
              <button
                type="button"
                className={btn}
                onClick={() => {
                  navigator.clipboard?.writeText(paymentUrl).then(
                    () => {
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    },
                    () => {},
                  );
                }}
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy link"}
              </button>
              <a href={paymentUrl} target="_blank" rel="noreferrer" className={btn}>
                <ExternalLink className="h-3.5 w-3.5" /> Open
              </a>
            </div>
          ) : (
            <p className="text-sm text-bs-muted">
              Create a secure card-payment link for {money(grossPence)} to send to the client.
            </p>
          )}

          {stale ? (
            <p className="text-sm text-bs-warning">
              The invoice total is now {money(grossPence)} but this link charges{" "}
              {money(linkAmountPence ?? 0)}. Replace the link before sending it.
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={btn}
              disabled={busy !== ""}
              onClick={() => run("create")}
            >
              {busy === "create" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CreditCard className="h-3.5 w-3.5 text-bs-primary" />
              )}
              {hasStripeLink ? "Replace payment link" : "Create payment link"}
            </button>
            {hasStripeLink ? (
              <button
                type="button"
                className={btn}
                disabled={busy !== ""}
                onClick={() => run("check")}
              >
                {busy === "check" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                Check payment
              </button>
            ) : null}
          </div>

          <p className="text-xs text-bs-subtle">
            {payments.webhook
              ? "The invoice is marked paid automatically when the client pays."
              : "When the client pays, press “Check payment” to mark the invoice paid. (Add a Stripe webhook to make this automatic.)"}
          </p>
        </div>
      )}

      {note ? (
        <p className={`mt-2 text-xs ${note.tone === "ok" ? "text-bs-success" : "text-bs-danger"}`}>
          {note.text}
        </p>
      ) : null}
    </section>
  );
}
