"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Circle, Copy, Loader2, Mail, Plus, Rocket, Send, Trash2 } from "lucide-react";
import {
  cancelOnboardingAction,
  remindOnboardingAction,
  saveOnboardingAction,
  sendOnboardingAction,
  type OnboardingResult,
} from "@/app/(os)/(app)/clients/[id]/onboarding-actions";

type Extra = { name: string; pricePence: number; cadence: "monthly" | "one_off" };

export type OnboardingCardView = {
  status: "draft" | "sent" | "completed" | "cancelled";
  billingType: "subscription" | "one_off";
  servicePlanId: string | null;
  planName: string | null;
  monthlyPence: number | null;
  projectTitle: string | null;
  extras: Extra[];
  deliverables: string | null;
  templateIds: string[];
  contactName: string | null;
  contactEmail: string | null;
  welcomeNote: string | null;
  sentAt: Date | null;
  completedAt: Date | null;
  inviteUrl: string | null;
  progress: { accountReady: boolean; docsTotal: number; docsAccepted: number; paid: boolean; complete: boolean } | null;
};

type Line = { name: string; price: string; cadence: "monthly" | "one_off" };

const money = (p: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(p / 100);
const pounds = (p: number | null | undefined) => (p == null ? "" : (p / 100).toFixed(2).replace(/\.00$/, ""));
const pence = (s: string) => {
  const n = Number(s.replace(/[£,\s]/g, ""));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : 0;
};
const day = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "Europe/London" });

const input =
  "h-9 w-full rounded-sm border border-bs-border-strong bg-bs-surface px-3 text-sm text-bs-text outline-none placeholder:text-bs-subtle";
const ghost =
  "inline-flex items-center gap-1.5 rounded-sm border border-bs-border-strong bg-bs-surface px-2.5 py-1.5 text-xs font-medium text-bs-text transition-colors hover:bg-bs-surface-2 disabled:opacity-50";
const primary =
  "inline-flex h-9 items-center gap-1.5 rounded-sm bg-bs-primary px-3.5 text-sm font-medium text-bs-on-accent transition-colors hover:bg-bs-primary-hover disabled:opacity-50";
const label = "mb-1 block text-xs font-medium text-bs-muted";

/**
 * Set a client up from the agency side: what they're buying (a monthly package
 * or a one-off project), add-ons, deliverables and the documents to sign —
 * then send one welcome email. Afterwards it tracks how far they've got.
 */
export function OnboardingCard({
  clientId,
  onboarding,
  plans,
  addOns,
  templates,
  contacts,
  emailReady,
  stripeReady,
}: {
  clientId: string;
  onboarding: OnboardingCardView | null;
  plans: { id: string; name: string; pricePence: number | null }[];
  addOns: { id: string; name: string; pricePence: number | null; cadence: string }[];
  templates: { id: string; name: string }[];
  contacts: { name: string; email: string | null }[];
  emailReady: boolean;
  stripeReady: boolean;
}) {
  const router = useRouter();
  const draft = onboarding?.status === "draft" ? onboarding : null;
  const firstContact = contacts.find((c) => c.email) ?? contacts[0];
  const [editing, setEditing] = React.useState(false);
  const [type, setType] = React.useState<"subscription" | "one_off">(draft?.billingType ?? "subscription");
  const [planId, setPlanId] = React.useState(draft?.servicePlanId ?? "");
  const [monthly, setMonthly] = React.useState(pounds(draft?.monthlyPence));
  const [project, setProject] = React.useState(draft?.projectTitle ?? "");
  const [lines, setLines] = React.useState<Line[]>(
    (draft?.extras ?? []).map((x) => ({ name: x.name, price: pounds(x.pricePence), cadence: x.cadence })),
  );
  const [deliverables, setDeliverables] = React.useState(draft?.deliverables ?? "");
  const [tpl, setTpl] = React.useState<string[]>(draft?.templateIds ?? []);
  const [name, setName] = React.useState(draft?.contactName ?? firstContact?.name ?? "");
  const [email, setEmail] = React.useState(draft?.contactEmail ?? firstContact?.email ?? "");
  const [welcome, setWelcome] = React.useState(draft?.welcomeNote ?? "");
  const [busy, setBusy] = React.useState("");
  const [note, setNote] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [invite, setInvite] = React.useState("");
  const [copied, setCopied] = React.useState(false);

  const oneOff = type === "one_off";
  const plan = plans.find((p) => p.id === planId);
  const monthlyTotal =
    pence(monthly || pounds(plan?.pricePence)) +
    lines.filter((l) => l.cadence === "monthly").reduce((n, l) => n + pence(l.price), 0);
  const oneOffTotal = lines.filter((l) => oneOff || l.cadence === "one_off").reduce((n, l) => n + pence(l.price), 0);

  function payload() {
    return {
      billingType: type,
      servicePlanId: oneOff ? null : planId || null,
      monthlyPence: oneOff ? null : monthly.trim() ? pence(monthly) : null,
      projectTitle: oneOff ? project.trim() || null : null,
      extras: lines
        .filter((l) => l.name.trim())
        .map((l) => ({ name: l.name.trim(), pricePence: pence(l.price), cadence: oneOff ? ("one_off" as const) : l.cadence })),
      deliverables: deliverables.trim() || null,
      templateIds: tpl,
      contactName: name,
      contactEmail: email,
      welcomeNote: welcome.trim() || null,
    };
  }

  async function run(key: string, fn: () => Promise<OnboardingResult>) {
    setBusy(key);
    setNote(null);
    const res = await fn().catch(() => null);
    setBusy("");
    if (!res) return setNote({ ok: false, text: "Something went wrong." });
    if (!res.ok) return setNote({ ok: false, text: res.error });
    setNote({ ok: true, text: res.message });
    if (res.inviteUrl) setInvite(res.inviteUrl);
    setEditing(false);
    router.refresh();
  }

  function copy(url: string) {
    navigator.clipboard?.writeText(url).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      },
      () => {},
    );
  }

  const setLine = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, n) => (n === i ? { ...l, ...patch } : l)));

  const heading = (
    <div className="mb-2 flex items-center gap-2">
      <Rocket className="h-4 w-4 text-bs-muted" />
      <h2 className="font-display text-h3">Onboarding</h2>
    </div>
  );
  const feedback = (
    <>
      {note ? <p className={`mt-3 text-xs ${note.ok ? "text-bs-success" : "text-bs-danger"}`}>{note.text}</p> : null}
      {invite ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input readOnly value={invite} aria-label="Client's set-up link" onFocus={(e) => e.currentTarget.select()} className={`${input} min-w-0 flex-1 bg-bs-surface-2 font-mono text-xs`} />
          <button type="button" className={ghost} onClick={() => copy(invite)}>
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      ) : null}
    </>
  );

  // ── Sent or completed: show progress ─────────────────────────────────────
  if (onboarding && (onboarding.status === "sent" || onboarding.status === "completed") && !editing) {
    const p = onboarding.progress;
    const done = onboarding.status === "completed";
    const steps = p
      ? [
          { ok: p.accountReady, text: p.accountReady ? "Login set up" : "Login not set up yet" },
          {
            ok: p.docsAccepted === p.docsTotal,
            text: p.docsTotal ? `Documents accepted: ${p.docsAccepted} of ${p.docsTotal}` : "No documents to sign",
          },
          {
            ok: p.paid,
            text:
              onboarding.billingType === "subscription"
                ? p.paid ? "Monthly payment set up" : "Monthly payment not set up yet"
                : p.paid ? "Invoice paid" : "Invoice not paid yet",
          },
        ]
      : [];
    return (
      <section className="mt-8">
        {heading}
        <div className="rounded-md border border-bs-border bg-bs-surface p-4">
          <p className="text-sm text-bs-text">
            <span className="font-medium">
              {onboarding.billingType === "subscription"
                ? `${onboarding.planName ?? "Package"} · ${money(onboarding.monthlyPence ?? 0)} a month`
                : `${onboarding.projectTitle ?? "One-off project"} · ${money(onboarding.extras.reduce((n, x) => n + x.pricePence, 0))}`}
            </span>
            {onboarding.billingType === "subscription" && onboarding.extras.length ? (
              <span className="text-bs-muted"> + {onboarding.extras.map((x) => x.name).join(", ")}</span>
            ) : null}
          </p>
          <p className="mt-0.5 text-xs text-bs-subtle">
            {done && onboarding.completedAt
              ? `Completed ${day.format(new Date(onboarding.completedAt))}`
              : `Welcome sent to ${onboarding.contactName} (${onboarding.contactEmail})${onboarding.sentAt ? ` on ${day.format(new Date(onboarding.sentAt))}` : ""}`}
          </p>
          <ul className="mt-3 space-y-1.5">
            {steps.map((s) => (
              <li key={s.text} className="flex items-center gap-2 text-sm">
                {s.ok ? <Check className="h-4 w-4 text-bs-success" /> : <Circle className="h-4 w-4 text-bs-subtle" />}
                <span className={s.ok ? "text-bs-text" : "text-bs-muted"}>{s.text}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {done ? (
              <button type="button" className={ghost} onClick={() => setEditing(true)}>
                <Plus className="h-3.5 w-3.5" /> Set up something new
              </button>
            ) : (
              <>
                <button type="button" className={ghost} disabled={busy !== ""} onClick={() => run("remind", () => remindOnboardingAction(clientId))}>
                  {busy === "remind" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                  Send reminder
                </button>
                <button type="button" className={ghost} disabled={busy !== ""} onClick={() => run("resend", () => sendOnboardingAction(clientId, null))}>
                  {busy === "resend" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Resend welcome
                </button>
                {onboarding.inviteUrl ? (
                  <button type="button" className={ghost} onClick={() => copy(onboarding.inviteUrl!)}>
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copied" : "Copy set-up link"}
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={busy !== ""}
                  className="text-xs text-bs-subtle transition-colors hover:text-bs-danger disabled:opacity-50"
                  onClick={() => {
                    if (window.confirm("Cancel this onboarding? An unpaid invoice it raised is withdrawn. Documents already sent stay in the portal.")) {
                      void run("cancel", () => cancelOnboardingAction(clientId));
                    }
                  }}
                >
                  Cancel onboarding
                </button>
              </>
            )}
          </div>
          {!done ? (
            <p className="mt-3 text-xs text-bs-subtle">
              {emailReady
                ? "Reminders go out automatically every few days until they finish (switch off in Settings)."
                : "Email isn't connected yet, so nothing is sent automatically — use the set-up link."}
            </p>
          ) : null}
          {feedback}
        </div>
      </section>
    );
  }

  // ── Draft / new: the set-up form ─────────────────────────────────────────
  return (
    <section className="mt-8">
      {heading}
      <div className="rounded-md border border-bs-border bg-bs-surface p-4">
        <p className="mb-4 text-sm text-bs-muted">
          Record what you&rsquo;ve agreed, then send one welcome email. The client sets up their login, accepts the
          documents and pays — and you can see each step here.
        </p>

        <div className="mb-4 inline-flex rounded-sm border border-bs-border-strong p-0.5 text-sm">
          {(["subscription", "one_off"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              aria-pressed={type === t}
              className={`rounded-[3px] px-3 py-1.5 font-medium transition-colors ${type === t ? "bg-bs-primary text-bs-on-accent" : "text-bs-muted hover:text-bs-text"}`}
            >
              {t === "subscription" ? "Monthly package" : "One-off project"}
            </button>
          ))}
        </div>

        {oneOff ? (
          <div className="mb-3">
            <label className={label} htmlFor="ob-project">Project name</label>
            <input id="ob-project" className={input} value={project} onChange={(e) => setProject(e.target.value)} placeholder="e.g. Brand film — spring launch" />
          </div>
        ) : (
          <div className="mb-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className={label} htmlFor="ob-plan">Package</label>
              <select
                id="ob-plan"
                className={input}
                value={planId}
                onChange={(e) => {
                  setPlanId(e.target.value);
                  setMonthly(pounds(plans.find((p) => p.id === e.target.value)?.pricePence));
                }}
              >
                <option value="">Choose a package…</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}{p.pricePence != null ? ` · ${money(p.pricePence)}/month` : " · bespoke"}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label} htmlFor="ob-monthly">Agreed monthly price (£)</label>
              <input id="ob-monthly" className={input} inputMode="decimal" value={monthly} onChange={(e) => setMonthly(e.target.value)} placeholder="e.g. 900" />
            </div>
          </div>
        )}

        <p className={label}>{oneOff ? "What the invoice covers" : "Add-ons"}</p>
        {lines.length ? (
          <ul className="mb-2 space-y-2">
            {lines.map((l, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2">
                <input className={`${input} min-w-[180px] flex-1`} value={l.name} onChange={(e) => setLine(i, { name: e.target.value })} placeholder={oneOff ? "e.g. Filming day" : "Add-on name"} aria-label="Line name" />
                <input className={`${input} w-28`} inputMode="decimal" value={l.price} onChange={(e) => setLine(i, { price: e.target.value })} placeholder="£" aria-label="Line price in pounds" />
                {oneOff ? null : (
                  <select className={`${input} w-32`} value={l.cadence} onChange={(e) => setLine(i, { cadence: e.target.value as Line["cadence"] })} aria-label="How often it is charged">
                    <option value="monthly">Monthly</option>
                    <option value="one_off">One-off</option>
                  </select>
                )}
                <button type="button" aria-label="Remove line" className="text-bs-subtle hover:text-bs-danger" onClick={() => setLines((ls) => ls.filter((_, n) => n !== i))}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {addOns.length ? (
            <select
              className={`${input} w-auto`}
              value=""
              aria-label="Add from your add-ons list"
              onChange={(e) => {
                const a = addOns.find((x) => x.id === e.target.value);
                if (a) setLines((ls) => [...ls, { name: a.name, price: pounds(a.pricePence), cadence: a.cadence === "monthly" ? "monthly" : "one_off" }]);
              }}
            >
              <option value="">Add from your add-ons…</option>
              {addOns.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}{a.pricePence != null ? ` · ${money(a.pricePence)}` : ""}
                </option>
              ))}
            </select>
          ) : null}
          <button type="button" className={ghost} onClick={() => setLines((ls) => [...ls, { name: "", price: "", cadence: oneOff ? "one_off" : "monthly" }])}>
            <Plus className="h-3.5 w-3.5" /> {oneOff ? "Add a line" : "Custom add-on"}
          </button>
          <span className="ml-auto text-sm tabular-nums text-bs-text">
            {oneOff ? (
              <>Total <span className="font-medium">{money(oneOffTotal)}</span></>
            ) : (
              <>
                <span className="font-medium">{money(monthlyTotal)}</span> a month
                {oneOffTotal ? <> + <span className="font-medium">{money(oneOffTotal)}</span> once</> : null}
              </>
            )}
          </span>
        </div>

        <div className="mb-3">
          <label className={label} htmlFor="ob-deliverables">Agreed deliverables (one per line)</label>
          <textarea id="ob-deliverables" rows={4} className={`${input} h-auto py-2`} value={deliverables} onChange={(e) => setDeliverables(e.target.value)} placeholder={"8 short-form videos a month\n1 shoot day a month\n2 rounds of revisions"} />
        </div>

        <div className="mb-3">
          <p className={label}>Documents to sign</p>
          {templates.length ? (
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {templates.map((t) => (
                <label key={t.id} className="flex items-center gap-2 text-sm text-bs-text">
                  <input type="checkbox" checked={tpl.includes(t.id)} onChange={(e) => setTpl((x) => (e.target.checked ? [...x, t.id] : x.filter((id) => id !== t.id)))} />
                  {t.name}
                </label>
              ))}
            </div>
          ) : (
            <p className="text-sm text-bs-subtle">No templates yet — add your agreement in Settings → Document templates.</p>
          )}
        </div>

        <div className="mb-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="ob-name">Send to (name)</label>
            <input id="ob-name" className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Hannah Fernley" />
          </div>
          <div>
            <label className={label} htmlFor="ob-email">Their email</label>
            <input id="ob-email" type="email" className={input} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@business.co.uk" />
          </div>
        </div>
        <div className="mb-4">
          <label className={label} htmlFor="ob-welcome">Personal note for the welcome email (optional)</label>
          <textarea id="ob-welcome" rows={2} className={`${input} h-auto py-2`} value={welcome} onChange={(e) => setWelcome(e.target.value)} placeholder="Great to meet you on Tuesday — really looking forward to getting started." />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={primary}
            disabled={busy !== ""}
            onClick={() => {
              if (window.confirm(`Send the welcome to ${email || "the client"}? This sets their package, publishes the documents${oneOff ? ", raises the invoice" : ""} and gives them a portal login.`)) {
                void run("send", () => sendOnboardingAction(clientId, payload()));
              }
            }}
          >
            {busy === "send" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Save and send welcome
          </button>
          <button type="button" className={ghost} disabled={busy !== ""} onClick={() => run("save", () => saveOnboardingAction(clientId, payload()))}>
            {busy === "save" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Save draft
          </button>
          {editing ? (
            <button type="button" className="text-xs text-bs-subtle hover:text-bs-text" onClick={() => setEditing(false)}>
              Back
            </button>
          ) : null}
        </div>
        <p className="mt-3 text-xs text-bs-subtle">
          {!stripeReady
            ? "Stripe isn't connected, so the client won't be able to pay by card yet."
            : oneOff
              ? "The client pays the invoice by card. Prices are ex VAT; no VAT is added."
              : "The client pays monthly by card. Monthly add-ons recur; one-off add-ons are charged with the first payment. No VAT is added."}
          {emailReady ? "" : " Email isn't connected yet — you'll get a link to send yourself."}
        </p>
        {feedback}
      </div>
    </section>
  );
}
