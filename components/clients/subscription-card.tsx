"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Banknote, Check, Copy, CreditCard, Loader2, RefreshCw } from "lucide-react";
import { recordDirectPaymentAction } from "@/app/(os)/(app)/clients/[id]/onboarding-actions";
import {
  staffUpgradeAction,
  subscriptionLinkAction,
  syncBillingAction,
  type BillingResult,
} from "@/app/(os)/(app)/clients/[id]/billing-actions";

export type BillingView = {
  planName: string | null;
  monthlyPence: number | null;
  status: string | null;
  live: boolean;
  renewsAt: Date | null;
  hasCustomer: boolean;
  canStart: boolean;
  upgrades: { id: string; name: string; pricePence: number }[];
};

const STATUS: Record<string, string> = {
  active: "Active",
  trialing: "In trial",
  past_due: "Payment overdue",
  unpaid: "Unpaid",
  canceled: "Cancelled",
  incomplete: "Awaiting first payment",
  incomplete_expired: "First payment not completed",
  paused: "Paused",
};

const money = (p: number | null) =>
  p == null ? "—" : new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(p / 100);
const day = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "Europe/London" });

/** The client's package subscription in Stripe: status, renewal, start link, upgrade. */
export function SubscriptionCard({
  clientId,
  billing,
  stripeReady,
  cashDefaultPence,
}: {
  clientId: string;
  billing: BillingView;
  stripeReady: boolean;
  cashDefaultPence: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState("");
  const [note, setNote] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [link, setLink] = React.useState("");
  const [copied, setCopied] = React.useState(false);
  const [target, setTarget] = React.useState("");
  const [cashOpen, setCashOpen] = React.useState(false);
  const [cashAmount, setCashAmount] = React.useState(cashDefaultPence ? (cashDefaultPence / 100).toFixed(2).replace(/\.00$/, "") : "");
  const [cashNote, setCashNote] = React.useState("");
  const [cashMethod, setCashMethod] = React.useState<"cash" | "bank">("cash");

  async function run(key: string, fn: () => Promise<BillingResult>) {
    setBusy(key);
    setNote(null);
    const res = await fn().catch(() => null);
    setBusy("");
    if (!res) return setNote({ ok: false, text: "Something went wrong." });
    if (!res.ok) return setNote({ ok: false, text: res.error });
    setNote({ ok: true, text: res.message });
    if (res.url) setLink(res.url);
    router.refresh();
  }

  const btn =
    "inline-flex items-center gap-1.5 rounded-sm border border-bs-border-strong bg-bs-surface px-2.5 py-1.5 text-xs font-medium text-bs-text transition-colors hover:bg-bs-surface-2 disabled:opacity-50";

  return (
    <section className="mt-8">
      <div className="mb-2 flex items-center gap-2">
        <CreditCard className="h-4 w-4 text-bs-muted" />
        <h2 className="font-display text-h3">Subscription</h2>
      </div>
      <div className="rounded-md border border-bs-border bg-bs-surface p-4">
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 text-sm">
          <span>
            <span className="text-bs-subtle">Package </span>
            <span className="font-medium text-bs-text">{billing.planName ?? "None"}</span>
          </span>
          <span>
            <span className="text-bs-subtle">Monthly </span>
            <span className="font-medium tabular-nums text-bs-text">{money(billing.monthlyPence)}</span>
          </span>
          <span>
            <span className="text-bs-subtle">Stripe </span>
            <span className={billing.live ? "font-medium text-bs-success" : "font-medium text-bs-text"}>
              {billing.status ? (STATUS[billing.status] ?? billing.status) : "Not set up"}
            </span>
          </span>
          {billing.renewsAt ? (
            <span>
              <span className="text-bs-subtle">Next payment </span>
              <span className="font-medium text-bs-text">{day.format(new Date(billing.renewsAt))}</span>
            </span>
          ) : null}
        </div>

        {!stripeReady ? (
          <p className="mt-3 text-sm text-bs-muted">Connect Stripe to bill packages by subscription.</p>
        ) : (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {billing.canStart ? (
              <button
                type="button"
                className={btn}
                disabled={busy !== ""}
                onClick={() => run("link", () => subscriptionLinkAction(clientId))}
              >
                {busy === "link" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5 text-bs-primary" />}
                Create subscription link
              </button>
            ) : null}
            {billing.hasCustomer ? (
              <button
                type="button"
                className={btn}
                disabled={busy !== ""}
                onClick={() => run("sync", () => syncBillingAction(clientId))}
              >
                {busy === "sync" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Sync with Stripe
              </button>
            ) : null}
            {billing.live && billing.upgrades.length ? (
              <span className="flex items-center gap-2">
                <select
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  aria-label="Upgrade to"
                  className="h-8 rounded-sm border border-bs-border-strong bg-bs-surface px-2 pr-7 text-xs text-bs-text outline-none"
                >
                  <option value="">Upgrade to…</option>
                  {billing.upgrades.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} · {money(u.pricePence)}/month
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className={btn}
                  disabled={busy !== "" || !target}
                  onClick={() => {
                    const u = billing.upgrades.find((x) => x.id === target);
                    if (u && window.confirm(`Upgrade to ${u.name} at ${money(u.pricePence)} a month? The difference for the rest of this month is charged to the client's card now.`)) {
                      void run("upgrade", () => staffUpgradeAction(clientId, target));
                    }
                  }}
                >
                  {busy === "upgrade" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  Upgrade
                </button>
              </span>
            ) : null}
          </div>
        )}

        <div className="mt-3 border-t border-bs-border pt-3">
          {cashOpen ? (
            <form
              className="flex flex-wrap items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const amountPence = Math.round(Number(cashAmount.replace(/[£,\s]/g, "")) * 100);
                if (!Number.isFinite(amountPence) || amountPence < 1) return setNote({ ok: false, text: "Enter the amount received." });
                void run("cash", () =>
                  recordDirectPaymentAction(clientId, { amountPence, method: cashMethod, description: cashNote.trim() || undefined }),
                ).then(() => setCashOpen(false));
              }}
            >
              <label className="text-xs text-bs-muted">
                Amount received (£)
                <input value={cashAmount} onChange={(e) => setCashAmount(e.target.value)} inputMode="decimal" aria-label="Amount received in pounds" className="mt-1 block h-8 w-28 rounded-sm border border-bs-border-strong bg-bs-surface px-2 text-sm text-bs-text outline-none" />
              </label>
              <label className="text-xs text-bs-muted">
                Paid by
                <select value={cashMethod} onChange={(e) => setCashMethod(e.target.value as "cash" | "bank")} aria-label="How it was paid" className="mt-1 block h-8 rounded-sm border border-bs-border-strong bg-bs-surface px-2 pr-7 text-sm text-bs-text outline-none">
                  <option value="cash">Cash</option>
                  <option value="bank">Bank transfer</option>
                </select>
              </label>
              <label className="min-w-[180px] flex-1 text-xs text-bs-muted">
                What it&rsquo;s for (optional)
                <input value={cashNote} onChange={(e) => setCashNote(e.target.value)} placeholder="Leave blank to itemise their monthly package" aria-label="What the payment is for" className="mt-1 block h-8 w-full rounded-sm border border-bs-border-strong bg-bs-surface px-2 text-sm text-bs-text outline-none placeholder:text-bs-subtle" />
              </label>
              <button type="submit" className={btn} disabled={busy !== ""}>
                {busy === "cash" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 text-bs-success" />}
                Create paid invoice
              </button>
              <button type="button" className="text-xs text-bs-subtle hover:text-bs-text" onClick={() => setCashOpen(false)}>
                Cancel
              </button>
            </form>
          ) : (
            <button type="button" className={btn} onClick={() => setCashOpen(true)}>
              <Banknote className="h-3.5 w-3.5 text-bs-primary" /> Record cash or bank payment
            </button>
          )}
          <p className="mt-2 text-xs text-bs-subtle">
            For clients who pay you directly. It creates a paid invoice, shows it in their portal and emails them a
            receipt — nothing goes through Stripe.
          </p>
        </div>

        {link ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              readOnly
              value={link}
              aria-label="Subscription link"
              onFocus={(e) => e.currentTarget.select()}
              className="h-9 min-w-0 flex-1 rounded-sm border border-bs-border-strong bg-bs-surface-2 px-3 font-mono text-xs text-bs-text outline-none"
            />
            <button
              type="button"
              className={btn}
              onClick={() => {
                navigator.clipboard?.writeText(link).then(
                  () => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  },
                  () => {},
                );
              }}
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        ) : null}

        <p className="mt-3 text-xs text-bs-subtle">
          {billing.live
            ? "Each monthly payment creates a paid invoice here and in the client's portal, and emails it to them."
            : "The client can also start this themselves from their portal. Prices are ex VAT; no VAT is added."}
        </p>
        {note ? (
          <p className={`mt-2 text-xs ${note.ok ? "text-bs-success" : "text-bs-danger"}`}>{note.text}</p>
        ) : null}
      </div>
    </section>
  );
}
