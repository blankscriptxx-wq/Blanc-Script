"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Copy, ExternalLink, Loader2, Send, Sparkles } from "lucide-react";
import type { ProposalContent, ProposalItem } from "@/lib/db/schema";
import {
  draftProposalAction,
  saveProposalAction,
  sendProposalAction,
  type ProposalResult,
} from "@/app/(os)/(app)/clients/[id]/proposal-actions";

// Lists are edited one item per line: "Title | description".
const toLines = (items: ProposalItem[]) => items.map((i) => (i.text ? `${i.title} | ${i.text}` : i.title)).join("\n");
const fromLines = (s: string): ProposalItem[] =>
  s
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const i = l.indexOf("|");
      return i < 0 ? { title: l, text: "" } : { title: l.slice(0, i).trim(), text: l.slice(i + 1).trim() };
    });
const statLines = (stats: { value: string; label: string }[]) => stats.map((s) => `${s.value} | ${s.label}`).join("\n");
const plain = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);

type Form = {
  title: string;
  preparedFor: string;
  heroLines: string;
  heroIntro: string;
  oppHeading: string;
  oppBody: string;
  oppStats: string;
  whyHeading: string;
  whyBody: string;
  whyCards: string;
  createHeading: string;
  createBody: string;
  pillars: string;
  processHeading: string;
  steps: string;
  invHeading: string;
  price: string;
  priceNote: string;
  invBody: string;
  includes: string;
  closeHeading: string;
  closeBody: string;
};

function toForm(title: string, c: ProposalContent): Form {
  return {
    title,
    preparedFor: c.preparedFor,
    heroLines: c.heroLines.join("\n"),
    heroIntro: c.heroIntro,
    oppHeading: c.opportunity.heading,
    oppBody: c.opportunity.body,
    oppStats: statLines(c.opportunity.stats),
    whyHeading: c.whyNow.heading,
    whyBody: c.whyNow.body,
    whyCards: toLines(c.whyNow.cards),
    createHeading: c.create.heading,
    createBody: c.create.body,
    pillars: toLines(c.create.pillars),
    processHeading: c.process.heading,
    steps: toLines(c.process.steps),
    invHeading: c.investment.heading,
    price: c.investment.price,
    priceNote: c.investment.priceNote,
    invBody: c.investment.body,
    includes: c.investment.includes.join("\n"),
    closeHeading: c.close.heading,
    closeBody: c.close.body,
  };
}

function toContent(f: Form): ProposalContent {
  return {
    preparedFor: f.preparedFor,
    heroLines: plain(f.heroLines),
    heroIntro: f.heroIntro,
    opportunity: {
      heading: f.oppHeading,
      body: f.oppBody,
      stats: fromLines(f.oppStats).map((s) => ({ value: s.title, label: s.text })).slice(0, 3),
    },
    whyNow: { heading: f.whyHeading, body: f.whyBody, cards: fromLines(f.whyCards) },
    create: { heading: f.createHeading, body: f.createBody, pillars: fromLines(f.pillars) },
    process: { heading: f.processHeading, steps: fromLines(f.steps) },
    investment: { heading: f.invHeading, price: f.price, priceNote: f.priceNote, body: f.invBody, includes: plain(f.includes) },
    close: { heading: f.closeHeading, body: f.closeBody },
  };
}

const input =
  "w-full rounded-sm border border-bs-border-strong bg-bs-surface px-3 py-2 text-sm text-bs-text outline-none placeholder:text-bs-subtle";
const ghost =
  "inline-flex h-9 items-center gap-1.5 rounded-sm border border-bs-border-strong bg-bs-surface px-3 text-sm font-medium text-bs-text transition-colors hover:bg-bs-surface-2 disabled:opacity-50";
const primary =
  "inline-flex h-9 items-center gap-1.5 rounded-sm bg-bs-primary px-3.5 text-sm font-medium text-bs-on-accent transition-colors hover:bg-bs-primary-hover disabled:opacity-50";

export function ProposalEditor({
  clientId,
  clientName,
  proposal,
  aiReady,
}: {
  clientId: string;
  clientName: string;
  proposal: {
    id: string;
    title: string;
    token: string;
    status: "draft" | "sent" | "accepted";
    content: ProposalContent;
    viewedAt: Date | null;
    acceptedByName: string | null;
  };
  aiReady: boolean;
}) {
  const router = useRouter();
  const [f, setF] = React.useState<Form>(() => toForm(proposal.title, proposal.content));
  const [brief, setBrief] = React.useState("");
  const [busy, setBusy] = React.useState("");
  const [note, setNote] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [link, setLink] = React.useState(proposal.status === "draft" ? "" : `/proposal/${proposal.token}`);
  const [copied, setCopied] = React.useState(false);
  const locked = proposal.status === "accepted";
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF((x) => ({ ...x, [k]: e.target.value }));

  async function run(key: string, fn: () => Promise<ProposalResult>) {
    setBusy(key);
    setNote(null);
    const res = await fn().catch(() => null);
    setBusy("");
    if (!res) {
      setNote({ ok: false, text: "Something went wrong." });
      return null;
    }
    setNote(res.ok ? { ok: true, text: res.message } : { ok: false, text: res.error });
    return res.ok ? res : null;
  }

  const save = () => run("save", () => saveProposalAction(clientId, proposal.id, f.title, toContent(f)));

  const field = (k: keyof Form, label: string, rows?: number, hint?: string) => (
    <label className="block" key={k}>
      <span className="mb-1 block text-xs font-medium text-bs-muted">{label}</span>
      {rows ? (
        <textarea rows={rows} className={input} value={f[k]} onChange={set(k)} disabled={locked} />
      ) : (
        <input className={`${input} h-9 py-0`} value={f[k]} onChange={set(k)} disabled={locked} />
      )}
      {hint ? <span className="mt-1 block text-xs text-bs-subtle">{hint}</span> : null}
    </label>
  );
  const group = (title: string, children: React.ReactNode) => (
    <section key={title} className="mt-4 rounded-md border border-bs-border bg-bs-surface p-5">
      <h2 className="mb-3 font-display text-h3 text-bs-text">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
  const perLine = "One per line, as: Title | description";

  return (
    <div>
      <Link href={`/clients/${clientId}`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-bs-subtle transition-colors hover:text-bs-text">
        <ArrowLeft className="h-4 w-4" /> Back to {clientName}
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-eyebrow uppercase text-bs-subtle">Proposal</p>
          <h1 className="mt-1 font-display text-h1">{f.title || "Untitled proposal"}</h1>
          <p className="mt-1 text-sm text-bs-muted">
            {locked
              ? `Accepted by ${proposal.acceptedByName}. It can no longer be changed.`
              : proposal.status === "sent"
                ? proposal.viewedAt
                  ? "Sent, and the client has opened it. Changes you save show on their link straight away."
                  : "Sent — not opened yet. Changes you save show on their link straight away."
                : "Draft — only you can see it until you send it."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a className={ghost} href={`/proposal/${proposal.token}?preview=1`} target="_blank" rel="noreferrer">
            <ExternalLink className="h-4 w-4" /> Preview
          </a>
          {locked ? null : (
            <>
              <button type="button" className={ghost} disabled={busy !== ""} onClick={save}>
                {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save
              </button>
              <button
                type="button"
                className={primary}
                disabled={busy !== ""}
                onClick={async () => {
                  if (!(await save())) return;
                  if (!window.confirm(proposal.status === "draft" ? "Publish this proposal and email it to the client?" : "Email the proposal link to the client again?")) return;
                  const res = await run("send", () => sendProposalAction(clientId, proposal.id));
                  if (res?.url) setLink(res.url);
                  router.refresh();
                }}
              >
                {busy === "send" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {proposal.status === "draft" ? "Save and send" : "Send again"}
              </button>
            </>
          )}
        </div>
      </div>
      {note ? <p className={`mt-3 text-sm ${note.ok ? "text-bs-success" : "text-bs-danger"}`}>{note.text}</p> : null}
      {link ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            readOnly
            aria-label="Client's proposal link"
            value={link.startsWith("http") ? link : typeof window === "undefined" ? link : `${window.location.origin}${link}`}
            onFocus={(e) => e.currentTarget.select()}
            className={`${input} h-9 min-w-0 flex-1 bg-bs-surface-2 py-0 font-mono text-xs`}
          />
          <button
            type="button"
            className={ghost}
            onClick={() => {
              const url = link.startsWith("http") ? link : `${window.location.origin}${link}`;
              navigator.clipboard?.writeText(url).then(
                () => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                },
                () => {},
              );
            }}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy link"}
          </button>
        </div>
      ) : null}

      {locked ? null : (
        <section className="mt-5 rounded-md border border-bs-border bg-bs-surface p-5">
          <h2 className="flex items-center gap-2 font-display text-h3 text-bs-text">
            <Sparkles className="h-4 w-4 text-bs-primary" /> Draft it with AI
          </h2>
          <p className="mt-1 text-sm text-bs-muted">
            Tell it about the client — what they do, what&rsquo;s working, what isn&rsquo;t, and what they want. It
            rewrites every section below for them; the price stays as you set it. You review and edit before sending.
          </p>
          <textarea
            rows={3}
            className={`${input} mt-3`}
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder="e.g. Three late-night venues in central Birmingham. Busy rooms and loyal regulars, but they only post in bursts and rely on customer tags. They want consistent content across all three and more table bookings."
            aria-label="About the client"
          />
          <button
            type="button"
            className={`${ghost} mt-2`}
            disabled={busy !== "" || !aiReady || brief.trim().length < 10}
            onClick={async () => {
              const res = await run("ai", () => draftProposalAction(clientId, proposal.id, brief));
              if (res?.content) setF(toForm(f.title, res.content));
            }}
          >
            {busy === "ai" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {busy === "ai" ? "Writing — about a minute…" : "Write the proposal"}
          </button>
          {aiReady ? null : <p className="mt-2 text-xs text-bs-subtle">AI isn&rsquo;t connected yet.</p>}
        </section>
      )}

      {group("Cover", <>
        {field("title", "Proposal title (only you see this)")}
        {field("preparedFor", "Prepared for")}
        {field("heroLines", "Headline", 2, "One short line per row. The last line shows in red.")}
        {field("heroIntro", "Introduction", 2)}
      </>)}
      {group("The opportunity", <>
        {field("oppHeading", "Heading")}
        {field("oppBody", "Text", 5)}
        {field("oppStats", "Three figures", 3, "One per line, as: Number | what it means. Only use figures that are true.")}
      </>)}
      {group("Why now", <>
        {field("whyHeading", "Heading")}
        {field("whyBody", "Text", 4)}
        {field("whyCards", "Four points", 4, perLine)}
      </>)}
      {group("What we'd create", <>
        {field("createHeading", "Heading")}
        {field("createBody", "Text", 2)}
        {field("pillars", "Content ideas", 8, perLine)}
      </>)}
      {group("How it works", <>
        {field("processHeading", "Heading")}
        {field("steps", "Steps, in order", 6, perLine)}
      </>)}
      {group("The investment", <>
        {field("invHeading", "Heading")}
        <div className="grid gap-3 sm:grid-cols-2">
          {field("price", "Price as shown", undefined, "e.g. £900 or Bespoke")}
          {field("priceNote", "Shown after the price", undefined, "e.g. a month — Prime Time")}
        </div>
        {field("invBody", "Text", 3)}
        {field("includes", "What's included", 5, "One per line.")}
      </>)}
      {group("Closing", <>
        {field("closeHeading", "Heading")}
        {field("closeBody", "Text", 3)}
      </>)}
      {locked ? null : (
        <div className="mt-4">
          <button type="button" className={primary} disabled={busy !== ""} onClick={save}>
            {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save changes
          </button>
        </div>
      )}
    </div>
  );
}
