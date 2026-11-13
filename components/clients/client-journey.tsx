"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

export type JourneyData = {
  clientId: string;
  proposal: { id: string; status: "draft" | "sent" | "accepted"; opened: boolean } | null;
  onboarding: {
    status: "draft" | "sent" | "completed";
    accountReady: boolean;
    docsLeft: number;
    paid: boolean;
    cash: boolean;
    oneOff: boolean;
  } | null;
  projects: number;
  unpaid: number;
};

type Stage = { label: string; state: "done" | "now" | "todo"; note: string };
type Action = { label: string; href?: string; tab?: string; scroll?: boolean };

const openTab = (tab: string) => window.dispatchEvent(new CustomEvent("client-tab", { detail: tab }));

/**
 * The one path every client follows — proposal, set-up, sign and pay, deliver,
 * invoice — with where this client is on it and the single thing to do next.
 */
export function ClientJourney({ data }: { data: JourneyData }) {
  const { proposal: p, onboarding: ob } = data;
  const setUp = ob?.status === "sent" || ob?.status === "completed";
  const signed = ob?.status === "completed";

  const waiting: string[] = [];
  if (ob?.status === "sent") {
    if (!ob.accountReady) waiting.push("create their login");
    if (ob.docsLeft > 0) waiting.push("accept the agreement");
    if (!ob.paid) waiting.push(ob.cash ? "pay you directly" : ob.oneOff ? "pay the invoice" : "set up their monthly payment");
  }

  const stages: Stage[] = [
    {
      label: "Proposal",
      state: p?.status === "accepted" || setUp ? "done" : p ? "now" : "todo",
      note: p?.status === "accepted" ? "Accepted" : p?.status === "sent" ? (p.opened ? "Sent · opened" : "Sent") : p ? "Draft" : setUp ? "Skipped" : "Optional",
    },
    {
      label: "Set up",
      state: setUp ? "done" : ob?.status === "draft" || p?.status === "accepted" ? "now" : !p ? "now" : "todo",
      note: setUp ? "Welcome sent" : ob?.status === "draft" ? "Draft saved" : "Package, terms, payment",
    },
    {
      label: "Sign & pay",
      state: signed ? "done" : ob?.status === "sent" ? "now" : "todo",
      note: signed ? "Signed and paid" : ob?.status === "sent" ? "Waiting on client" : "Agreement and payment",
    },
    {
      label: "Deliver",
      state: signed && data.projects > 0 ? "done" : signed ? "now" : "todo",
      note: data.projects ? `${data.projects} project${data.projects === 1 ? "" : "s"}` : "Projects, shoots, edits",
    },
    {
      label: "Invoice",
      state: data.unpaid > 0 ? "now" : "todo",
      note: data.unpaid ? `${data.unpaid} unpaid` : "Extra work",
    },
  ];

  // Exactly one thing to do next.
  let title: string;
  let detail: string;
  let primary: Action | null;
  let secondary: Action | null = null;
  if (!ob && !p) {
    title = "Set this client up";
    detail = "Choose their package or project, the terms and how they'll pay. Their agreement and invoice are created for you.";
    primary = { label: "Start set-up", scroll: true };
    secondary = { label: "Send a proposal first", scroll: true };
  } else if (!ob && p?.status === "draft") {
    title = "Finish and send the proposal";
    detail = "It's still a draft — the client can't see it yet.";
    primary = { label: "Open proposal", href: `/clients/${data.clientId}/proposals/${p.id}` };
    secondary = { label: "Skip to set-up", scroll: true };
  } else if (!ob && p?.status === "sent") {
    title = "Waiting for them to accept the proposal";
    detail = p.opened ? "They've opened it. You can set them up as soon as they say yes." : "They haven't opened it yet.";
    primary = { label: "Set them up now", scroll: true };
    secondary = { label: "View proposal", href: `/clients/${data.clientId}/proposals/${p.id}` };
  } else if (!ob) {
    title = "Proposal accepted — set them up";
    detail = "Choose their package or project and send the welcome. The agreement and invoice follow automatically.";
    primary = { label: "Start set-up", scroll: true };
  } else if (ob.status === "draft") {
    title = "Send their welcome";
    detail = "The set-up is saved as a draft. Sending it issues the agreement, the invoice or payment link, and their portal login.";
    primary = { label: "Review and send", scroll: true };
  } else if (ob.status === "sent") {
    title = "Waiting on the client";
    detail = `They still need to ${waiting.join(", then ")}. Reminders go out automatically.`;
    primary = { label: "Send a reminder", scroll: true };
  } else if (data.unpaid > 0) {
    title = `${data.unpaid} invoice${data.unpaid === 1 ? " is" : "s are"} waiting to be paid`;
    detail = "Mark it paid if the money has arrived, or leave it — overdue invoices are chased automatically.";
    primary = { label: "Open billing", tab: "billing" };
  } else if (data.projects === 0) {
    title = "Start their first project";
    detail = "They've signed and paid. Create a project to plan the shoots and edits.";
    primary = { label: "Create a project", href: "/projects?new=1" };
    secondary = { label: "Invoice extra work", tab: "billing" };
  } else {
    title = "All set — nothing waiting";
    detail = "Carry on with the work. Come back here to invoice extras or set up a new project or package.";
    primary = { label: "Invoice extra work", tab: "billing" };
    secondary = { label: "Set up something new", scroll: true };
  }

  const act = (a: Action) => {
    if (a.tab) openTab(a.tab);
    if (a.scroll) {
      openTab("steps");
      setTimeout(() => document.getElementById("onboarding")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }
  };
  const button = (a: Action, main: boolean) => {
    const cls = main
      ? "inline-flex h-10 items-center gap-2 rounded-sm bg-bs-primary px-4 text-sm font-medium text-bs-on-accent transition-colors hover:bg-bs-primary-hover"
      : "inline-flex h-10 items-center rounded-sm border border-bs-border-strong px-4 text-sm font-medium text-bs-text transition-colors hover:bg-bs-surface-2";
    return a.href ? (
      <Link key={a.label} href={a.href} className={cls}>
        {a.label}
        {main ? <ArrowRight className="h-4 w-4" /> : null}
      </Link>
    ) : (
      <button key={a.label} type="button" className={cls} onClick={() => act(a)}>
        {a.label}
        {main ? <ArrowRight className="h-4 w-4" /> : null}
      </button>
    );
  };

  return (
    <section className="mt-6" aria-label="Where this client is">
      <ol className="grid grid-cols-1 gap-2 sm:grid-cols-5">
        {stages.map((s, i) => (
          <li
            key={s.label}
            aria-current={s.state === "now" ? "step" : undefined}
            className={
              "flex items-center gap-3 rounded-md border px-3 py-2.5 sm:flex-col sm:items-start sm:gap-1.5 " +
              (s.state === "now" ? "border-bs-primary bg-bs-surface" : "border-bs-border bg-bs-surface")
            }
          >
            <span
              className={
                "grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-semibold " +
                (s.state === "done"
                  ? "bg-bs-success text-white"
                  : s.state === "now"
                    ? "bg-bs-primary text-bs-on-accent"
                    : "border border-bs-border-strong text-bs-subtle")
              }
            >
              {s.state === "done" ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span className="min-w-0">
              <span className={"block text-sm font-medium " + (s.state === "todo" ? "text-bs-muted" : "text-bs-text")}>{s.label}</span>
              <span className="block truncate text-xs text-bs-subtle">{s.note}</span>
            </span>
          </li>
        ))}
      </ol>

      <div className="mt-3 rounded-md border border-bs-border bg-bs-surface p-5">
        <p className="text-eyebrow uppercase text-bs-subtle">Next step</p>
        <h2 className="mt-1 font-display text-h2 text-bs-text">{title}</h2>
        <p className="mt-1 max-w-2xl text-sm text-bs-muted">{detail}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {primary ? button(primary, true) : null}
          {secondary ? button(secondary, false) : null}
        </div>
      </div>
    </section>
  );
}
