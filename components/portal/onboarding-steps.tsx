"use client";

import * as React from "react";
import Link from "next/link";
import { Check, CreditCard, FileText, Loader2 } from "lucide-react";
import { portalStartSubscriptionAction } from "@/app/(os)/portal/[token]/actions";
import { PayButton } from "@/components/portal/pay-button";

export type PortalOnboardingView = {
  status: "sent" | "completed";
  billingType: "subscription" | "one_off";
  paymentMethod: "card" | "cash";
  progress: { accountReady: boolean; docsTotal: number; docsAccepted: number; paid: boolean };
  nextDocumentId: string | null;
  invoice: { id: string; paymentUrl: string | null; totalPence: number } | null;
  canPayByCard: boolean;
};

const money = (p: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(p / 100);

/** "Getting started": the three things a new client does, in order, with one clear next action. */
export function OnboardingSteps({ token, ob }: { token: string; ob: PortalOnboardingView }) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const p = ob.progress;
  const docsDone = p.docsAccepted === p.docsTotal;
  const left = p.docsTotal - p.docsAccepted;

  async function subscribe() {
    setBusy(true);
    setError("");
    const res = await portalStartSubscriptionAction(token).catch(() => null);
    if (res?.ok) {
      window.location.href = res.url;
      return;
    }
    setBusy(false);
    setError(res && !res.ok ? res.error : "Something went wrong. Please try again.");
  }

  const primary =
    "inline-flex h-9 items-center gap-1.5 rounded-sm bg-bs-primary px-3.5 text-sm font-medium text-bs-on-accent transition-colors hover:bg-bs-primary-hover disabled:opacity-50";

  const Step = ({ n, done, title, children }: { n: number; done: boolean; title: string; children?: React.ReactNode }) => (
    <li className="flex gap-3 py-3">
      <span
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${done ? "bg-bs-success text-white" : "border border-bs-border-strong text-bs-muted"}`}
      >
        {done ? <Check className="h-3.5 w-3.5" /> : n}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium ${done ? "text-bs-muted" : "text-bs-text"}`}>{title}</p>
        {children ? <div className="mt-2">{children}</div> : null}
      </div>
    </li>
  );

  return (
    <div className="rounded-md border border-bs-border bg-bs-surface px-5 py-2">
      <ol className="divide-y divide-bs-border">
        <Step n={1} done={p.accountReady} title={p.accountReady ? "Your login is set up" : "Set up your login"} />
        <Step
          n={2}
          done={docsDone}
          title={
            p.docsTotal === 0
              ? "No documents to sign"
              : docsDone
                ? "Documents accepted"
                : `Read and accept ${left === 1 ? "your agreement" : `your ${left} documents`}`
          }
        >
          {!docsDone && ob.nextDocumentId ? (
            <Link href={`/portal/${token}/documents/${ob.nextDocumentId}`} className={primary}>
              <FileText className="h-4 w-4" /> Read and accept
            </Link>
          ) : null}
        </Step>
        <Step
          n={3}
          done={p.paid}
          title={
            ob.paymentMethod === "cash"
              ? p.paid ? "Payment received" : `Pay by cash or bank transfer${ob.invoice ? ` (${money(ob.invoice.totalPence)})` : ""}`
              : ob.billingType === "subscription"
              ? p.paid ? "Monthly payment set up" : "Set up your monthly payment"
              : p.paid ? "Invoice paid" : `Pay your invoice${ob.invoice ? ` (${money(ob.invoice.totalPence)})` : ""}`
          }
        >
          {p.paid ? null : ob.paymentMethod === "cash" ? (
            <p className="text-xs text-bs-subtle">
              You&rsquo;re paying us directly. We&rsquo;ll mark this as paid as soon as we receive it, and your paid
              invoice will appear below.
              {ob.invoice ? (
                <>
                  {" "}
                  <Link href={`/portal/${token}/invoices/${ob.invoice.id}`} className="text-bs-primary hover:underline">
                    View invoice
                  </Link>
                </>
              ) : null}
            </p>
          ) : !docsDone ? (
            <p className="text-xs text-bs-subtle">Available once you&rsquo;ve accepted your documents.</p>
          ) : ob.billingType === "subscription" ? (
            ob.canPayByCard ? (
              <button type="button" className={primary} disabled={busy} onClick={subscribe}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                Set up monthly payment
              </button>
            ) : (
              <p className="text-xs text-bs-subtle">We&rsquo;ll be in touch with payment details.</p>
            )
          ) : ob.invoice?.paymentUrl ? (
            <PayButton token={token} invoiceId={ob.invoice.id} paymentUrl={ob.invoice.paymentUrl} />
          ) : (
            <p className="text-xs text-bs-subtle">We&rsquo;ll be in touch with payment details.</p>
          )}
        </Step>
      </ol>
      {error ? <p className="pb-3 text-sm text-bs-danger">{error}</p> : null}
    </div>
  );
}
