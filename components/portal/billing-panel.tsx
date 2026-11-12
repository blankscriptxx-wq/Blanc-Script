"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, CreditCard, Loader2 } from "lucide-react";
import {
  portalManagePaymentAction,
  portalRefreshBillingAction,
  portalStartSubscriptionAction,
  portalUpgradeAction,
} from "@/app/(os)/portal/[token]/actions";

export type PortalBilling = {
  planName: string | null;
  monthlyPence: number | null;
  status: string | null;
  live: boolean;
  renewsAt: Date | null;
  hasCustomer: boolean;
  canStart: boolean;
  upgrades: { id: string; name: string; pricePence: number }[];
};

const money = (p: number | null) =>
  p == null ? "—" : new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(p / 100);
const day = new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "Europe/London" });

const STATUS: Record<string, string> = {
  active: "Active",
  trialing: "Active",
  past_due: "Payment overdue — please update your card",
  unpaid: "Payment overdue — please update your card",
  canceled: "Cancelled",
  incomplete: "Waiting for your first payment",
};

/** The client's package: what they're on, when it renews, and how to change it. */
export function BillingPanel({
  token,
  billing,
  justSubscribed,
}: {
  token: string;
  billing: PortalBilling;
  justSubscribed: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState("");
  const [note, setNote] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [choosing, setChoosing] = React.useState<string | null>(null);

  // Back from Stripe Checkout: pull the new subscription in, then tidy the address.
  React.useEffect(() => {
    if (!justSubscribed) return;
    let live = true;
    portalRefreshBillingAction(token)
      .catch(() => {})
      .finally(() => {
        if (live) router.replace(`/portal/${token}`);
      });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [justSubscribed]);

  async function go(key: string, fn: () => Promise<{ ok: true; url: string } | { ok: false; error: string }>) {
    setBusy(key);
    setNote(null);
    const res = await fn().catch(() => null);
    if (res?.ok) {
      window.location.href = res.url;
      return;
    }
    setBusy("");
    setNote({ ok: false, text: res && !res.ok ? res.error : "Something went wrong. Please try again." });
  }

  async function upgrade(planId: string) {
    setBusy(`up-${planId}`);
    setNote(null);
    const res = await portalUpgradeAction(token, planId).catch(() => null);
    setBusy("");
    setChoosing(null);
    setNote(res ? { ok: res.ok, text: res.ok ? res.message : res.error } : { ok: false, text: "Something went wrong." });
    if (res?.ok) router.refresh();
  }

  const btn =
    "inline-flex h-9 items-center gap-1.5 rounded-sm border border-bs-border-strong px-3 text-sm text-bs-text transition-colors hover:bg-bs-surface-2 disabled:opacity-50";
  const primary =
    "inline-flex h-9 items-center gap-1.5 rounded-sm bg-bs-primary px-3.5 text-sm font-medium text-bs-on-accent transition-colors hover:bg-bs-primary-hover disabled:opacity-50";

  if (!billing.planName) {
    return (
      <p className="rounded-md border border-dashed border-bs-border bg-bs-surface px-4 py-5 text-sm text-bs-subtle">
        You&rsquo;re not on a monthly package at the moment.
      </p>
    );
  }

  return (
    <div className="rounded-md border border-bs-border bg-bs-surface p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-eyebrow uppercase text-bs-subtle">Your package</p>
          <p className="mt-1 font-display text-h1">{billing.planName}</p>
          <p className="mt-0.5 text-sm text-bs-muted">
            <span className="font-medium tabular-nums text-bs-text">{money(billing.monthlyPence)}</span> a month
          </p>
        </div>
        <div className="text-right text-sm">
          {justSubscribed && !billing.live ? (
            <p className="flex items-center gap-2 text-bs-muted">
              <Loader2 className="h-4 w-4 animate-spin" /> Confirming your payment…
            </p>
          ) : billing.live ? (
            <>
              <p className={billing.status === "past_due" || billing.status === "unpaid" ? "font-medium text-bs-danger" : "font-medium text-bs-success"}>
                {STATUS[billing.status ?? ""] ?? "Active"}
              </p>
              {billing.renewsAt ? (
                <p className="text-bs-muted">Next payment {day.format(new Date(billing.renewsAt))}</p>
              ) : null}
            </>
          ) : (
            <p className="text-bs-muted">Monthly payment not set up yet</p>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {billing.canStart ? (
          <button type="button" className={primary} disabled={busy !== ""} onClick={() => go("start", () => portalStartSubscriptionAction(token))}>
            {busy === "start" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
            Set up monthly payment
          </button>
        ) : null}
        {billing.hasCustomer && billing.live ? (
          <button type="button" className={btn} disabled={busy !== ""} onClick={() => go("manage", () => portalManagePaymentAction(token))}>
            {busy === "manage" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
            Update card
          </button>
        ) : null}
      </div>

      {billing.live && billing.upgrades.length ? (
        <div className="mt-5 border-t border-bs-border pt-4">
          <p className="text-sm font-medium text-bs-text">Upgrade your package</p>
          <ul className="mt-2 space-y-2">
            {billing.upgrades.map((u) => (
              <li key={u.id} className="rounded-sm border border-bs-border px-3 py-2.5">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-bs-text">{u.name}</span>
                    <span className="block text-xs text-bs-muted tabular-nums">{money(u.pricePence)} a month</span>
                  </span>
                  {choosing === u.id ? null : (
                    <button type="button" className={btn} disabled={busy !== ""} onClick={() => setChoosing(u.id)}>
                      <ArrowUpRight className="h-4 w-4" /> Upgrade
                    </button>
                  )}
                </div>
                {choosing === u.id ? (
                  <div className="mt-2 rounded-sm bg-bs-surface-2 p-3 text-sm text-bs-muted">
                    <p>
                      You&rsquo;ll move to <span className="font-medium text-bs-text">{u.name}</span> straight away at{" "}
                      <span className="font-medium text-bs-text">{money(u.pricePence)} a month</span>. The difference
                      for the rest of this month is charged to your card now, and you&rsquo;ll get an invoice for it.
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <button type="button" className={primary} disabled={busy !== ""} onClick={() => upgrade(u.id)}>
                        {busy === `up-${u.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        Confirm upgrade
                      </button>
                      <button type="button" className="text-xs text-bs-subtle hover:text-bs-text" disabled={busy !== ""} onClick={() => setChoosing(null)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-bs-subtle">To move to a smaller package, please speak to us.</p>
        </div>
      ) : null}

      {note ? <p className={`mt-3 text-sm ${note.ok ? "text-bs-success" : "text-bs-danger"}`}>{note.text}</p> : null}
    </div>
  );
}
