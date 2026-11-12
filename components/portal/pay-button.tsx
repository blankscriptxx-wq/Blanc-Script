"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Loader2 } from "lucide-react";
import { portalCheckPaymentAction } from "@/app/(os)/portal/[token]/actions";

/** "Pay now" opens Stripe in a new tab; "I've paid" confirms it with Stripe. */
export function PayButton({
  token,
  invoiceId,
  paymentUrl,
}: {
  token: string;
  invoiceId: string;
  paymentUrl: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [note, setNote] = React.useState("");

  async function check() {
    setBusy(true);
    setNote("");
    const res = await portalCheckPaymentAction(token, invoiceId).catch(() => null);
    setBusy(false);
    if (!res) return setNote("Something went wrong. Please try again.");
    setNote(res.ok ? res.message : res.error);
    if (res.ok) router.refresh();
  }

  return (
    <span className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
      <a
        href={paymentUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex h-9 items-center gap-1.5 rounded-sm bg-bs-primary px-3.5 text-sm font-medium text-bs-on-accent transition-colors hover:bg-bs-primary-hover"
      >
        <CreditCard className="h-4 w-4" /> Pay now
      </a>
      <button
        type="button"
        onClick={check}
        disabled={busy}
        className="inline-flex h-9 items-center gap-1.5 rounded-sm border border-bs-border-strong px-3 text-sm text-bs-text transition-colors hover:bg-bs-surface-2 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        I&rsquo;ve paid
      </button>
      {note ? <span className="w-full text-xs text-bs-muted">{note}</span> : null}
    </span>
  );
}
