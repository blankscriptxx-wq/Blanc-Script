"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Banknote, Loader2, Plus, Receipt, Send, Trash2 } from "lucide-react";
import {
  markPaidDirectAction,
  sendClientInvoiceAction,
  type OnboardingResult,
} from "@/app/(os)/(app)/clients/[id]/onboarding-actions";

type Line = { name: string; price: string };

export type UnpaidInvoice = {
  id: string;
  number: string | null;
  amountPence: number;
  reference: string | null;
  dueAt: Date | null;
  hasLink: boolean;
};

const money = (p: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(p / 100);
const pence = (s: string) => {
  const n = Number(s.replace(/[£,\s]/g, ""));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : 0;
};
const day = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "Europe/London" });

const input =
  "h-9 w-full rounded-sm border border-bs-border-strong bg-bs-surface px-3 text-sm text-bs-text outline-none placeholder:text-bs-subtle";
const ghost =
  "inline-flex items-center gap-1.5 rounded-sm border border-bs-border-strong bg-bs-surface px-2.5 py-1.5 text-xs font-medium text-bs-text transition-colors hover:bg-bs-surface-2 disabled:opacity-50";

/**
 * Invoice an existing client in one step: pick what it's for and how they'll
 * pay; the invoice is raised, made payable, put in their portal and emailed.
 * Unpaid invoices are listed with buttons to mark them paid in cash or by bank.
 */
export function ClientInvoicing({
  clientId,
  addOns,
  unpaid,
  stripeReady,
}: {
  clientId: string;
  addOns: { id: string; name: string; pricePence: number | null }[];
  unpaid: UnpaidInvoice[];
  stripeReady: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = React.useState("");
  const [lines, setLines] = React.useState<Line[]>([{ name: "", price: "" }]);
  const [method, setMethod] = React.useState<"card" | "cash">("card");
  const [busy, setBusy] = React.useState("");
  const [note, setNote] = React.useState<{ ok: boolean; text: string } | null>(null);

  const total = lines.reduce((n, l) => n + pence(l.price), 0);
  const setLine = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, n) => (n === i ? { ...l, ...patch } : l)));

  async function run(key: string, fn: () => Promise<OnboardingResult>) {
    setBusy(key);
    setNote(null);
    const res = await fn().catch(() => null);
    setBusy("");
    if (!res) return setNote({ ok: false, text: "Something went wrong." });
    setNote(res.ok ? { ok: true, text: res.message } : { ok: false, text: res.error });
    if (res.ok) router.refresh();
    return res.ok;
  }

  return (
    <section className="mt-8">
      <div className="mb-2 flex items-center gap-2">
        <Receipt className="h-4 w-4 text-bs-muted" />
        <h2 className="font-display text-h3">Invoice this client</h2>
      </div>
      <div className="rounded-md border border-bs-border bg-bs-surface p-4">
        {unpaid.length ? (
          <div className="mb-4">
            <p className="mb-1.5 text-xs font-medium text-bs-muted">Waiting to be paid</p>
            <ul className="space-y-2">
              {unpaid.map((inv) => (
                <li key={inv.id} className="flex flex-wrap items-center gap-2 rounded-sm border border-bs-border px-3 py-2">
                  <span className="min-w-0 flex-1 text-sm">
                    <Link href={`/finance/${inv.id}`} className="font-medium tabular-nums text-bs-text hover:underline">
                      {inv.number ?? "Invoice"} · {money(inv.amountPence)}
                    </Link>
                    <span className="block text-xs text-bs-subtle">
                      {inv.reference ?? ""}
                      {inv.dueAt ? ` · due ${day.format(new Date(inv.dueAt))}` : ""}
                      {inv.hasLink ? " · payable by card" : " · paying directly"}
                    </span>
                  </span>
                  <button
                    type="button"
                    className={ghost}
                    disabled={busy !== ""}
                    onClick={() => {
                      if (window.confirm(`Mark ${inv.number ?? "this invoice"} as paid in cash? The client is emailed a receipt.`)) {
                        void run(`cash-${inv.id}`, () => markPaidDirectAction(clientId, inv.id, "cash"));
                      }
                    }}
                  >
                    {busy === `cash-${inv.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Banknote className="h-3.5 w-3.5 text-bs-primary" />}
                    Paid — cash
                  </button>
                  <button
                    type="button"
                    className={ghost}
                    disabled={busy !== ""}
                    onClick={() => {
                      if (window.confirm(`Mark ${inv.number ?? "this invoice"} as paid by bank transfer?`)) {
                        void run(`bank-${inv.id}`, () => markPaidDirectAction(clientId, inv.id, "bank"));
                      }
                    }}
                  >
                    Paid — bank
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <p className="mb-3 text-sm text-bs-muted">
          For extra work outside their package or project. Choose what it&rsquo;s for and how they&rsquo;ll pay — the
          invoice is created, sent to their portal and emailed straight away.
        </p>
        <label className="mb-3 block">
          <span className="mb-1 block text-xs font-medium text-bs-muted">What it&rsquo;s for</span>
          <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Extra shoot day — December" aria-label="What the invoice is for" />
        </label>
        <ul className="mb-2 space-y-2">
          {lines.map((l, i) => (
            <li key={i} className="flex flex-wrap items-center gap-2">
              <input className={`${input} min-w-[180px] flex-1`} value={l.name} onChange={(e) => setLine(i, { name: e.target.value })} placeholder="Item" aria-label="Invoice item" />
              <input className={`${input} w-28`} inputMode="decimal" value={l.price} onChange={(e) => setLine(i, { price: e.target.value })} placeholder="£" aria-label="Item price in pounds" />
              {lines.length > 1 ? (
                <button type="button" aria-label="Remove item" className="text-bs-subtle hover:text-bs-danger" onClick={() => setLines((ls) => ls.filter((_, n) => n !== i))}>
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {addOns.length ? (
            <select
              className={`${input} w-auto`}
              value=""
              aria-label="Add an item from your add-ons"
              onChange={(e) => {
                const a = addOns.find((x) => x.id === e.target.value);
                if (!a) return;
                const item = { name: a.name, price: a.pricePence != null ? (a.pricePence / 100).toFixed(2).replace(/\.00$/, "") : "" };
                setLines((ls) => (ls.length === 1 && !ls[0].name && !ls[0].price ? [item] : [...ls, item]));
                if (!title.trim()) setTitle(a.name);
              }}
            >
              <option value="">Add from your add-ons…</option>
              {addOns.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                  {a.pricePence != null ? ` · ${money(a.pricePence)}` : ""}
                </option>
              ))}
            </select>
          ) : null}
          <button type="button" className={ghost} onClick={() => setLines((ls) => [...ls, { name: "", price: "" }])}>
            <Plus className="h-3.5 w-3.5" /> Add an item
          </button>
          <span className="ml-auto text-sm tabular-nums text-bs-text">
            Total <span className="font-medium">{money(total)}</span>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-sm border border-bs-border-strong p-0.5 text-sm">
            {(["card", "cash"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                aria-pressed={method === m}
                className={`rounded-[3px] px-3 py-1.5 font-medium transition-colors ${method === m ? "bg-bs-primary text-bs-on-accent" : "text-bs-muted hover:text-bs-text"}`}
              >
                {m === "card" ? "Pay by card (Stripe)" : "Cash or bank transfer"}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={busy !== "" || total < 50 || !title.trim()}
            className="inline-flex h-9 items-center gap-1.5 rounded-sm bg-bs-primary px-3.5 text-sm font-medium text-bs-on-accent transition-colors hover:bg-bs-primary-hover disabled:opacity-50"
            onClick={async () => {
              const ok = await run("send", () =>
                sendClientInvoiceAction(clientId, {
                  title,
                  method,
                  lines: lines.filter((l) => l.name.trim() && pence(l.price) > 0).map((l) => ({ name: l.name.trim(), pricePence: pence(l.price) })),
                }),
              );
              if (ok) {
                setTitle("");
                setLines([{ name: "", price: "" }]);
              }
            }}
          >
            {busy === "send" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send invoice
          </button>
        </div>
        <p className="mt-3 text-xs text-bs-subtle">
          {method === "cash"
            ? "Nothing goes through Stripe. Press “Paid — cash” or “Paid — bank” above when the money arrives and the client gets their receipt."
            : stripeReady
              ? "The client pays by card from their portal or the email; it's marked paid and receipted automatically."
              : "Stripe isn't connected, so the invoice goes out without a card link."}{" "}
          For a whole new project or package (with its agreement), use Onboarding → Set up something new.
        </p>
        {note ? <p className={`mt-2 text-xs ${note.ok ? "text-bs-success" : "text-bs-danger"}`}>{note.text}</p> : null}
      </div>
    </section>
  );
}
