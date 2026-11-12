"use server";

import { aiConfigured, runAssist } from "@/lib/ai/claude";
import { getClientProfile } from "@/lib/data/client-profile";

/**
 * AI helpers for the Clients module. Every action is wrapped in try/catch and
 * returns a discriminated result so the UI never throws. Org-scoping is enforced
 * by getClientProfile, which calls requireUser underneath.
 */
export type ClientAiResult =
  | { ok: true; text: string }
  | { ok: false; error: string };

const SUMMARY_SYSTEM =
  "You write a concise internal account summary for a creative agency: where the relationship stands, what's live, and what needs attention. British English.";

const EMAIL_SYSTEM =
  "You draft a short, warm, professional client check-in/update email for a creative agency. British English. Keep it to a few sentences, ready to send.";

const NOT_CONNECTED =
  "The AI assistant isn't connected yet. Add an Anthropic API key in Settings → Integrations.";

const CLIENT_STATUS_LABEL: Record<string, string> = {
  lead: "Lead",
  active: "Active",
  paused: "Paused",
  churned: "Churned",
};

const gbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

function money(pence: number | null): string {
  return pence == null ? "—" : gbp.format(pence / 100);
}

function humanAction(action: string): string {
  return action
    .split(".")
    .join(" · ")
    .replace(/_/g, " ")
    .replace(/^\w/, (ch) => ch.toUpperCase());
}

/**
 * Draft a concise internal account summary from the client's profile: status,
 * plan, live work and what needs attention. Returns the text to review and copy.
 */
export async function draftClientSummaryAction(
  clientId: string,
): Promise<ClientAiResult> {
  try {
    if (!aiConfigured()) {
      return { ok: false, error: NOT_CONNECTED };
    }
    const profile = await getClientProfile(clientId);
    if (!profile) {
      return { ok: false, error: "That client was not found in your workspace." };
    }
    const { client: c, summary, projects, shoots, activity } = profile;

    const liveProjects = projects
      .filter((p) => p.status === "active" || p.status === "planning" || p.status === "on_hold")
      .map((p) => p.name);
    const upcomingShoots = shoots
      .filter((s) => s.status === "booked" || s.status === "on_site")
      .map((s) => s.title);
    const recent = activity.slice(0, 6).map((a) => humanAction(a.action));

    const context = [
      `Client: ${c.name}`,
      `Status: ${CLIENT_STATUS_LABEL[c.status] ?? c.status}`,
      `Plan: ${summary.planName ?? "—"}`,
      `Monthly recurring (ex VAT): ${money(summary.mrrPence)}`,
      `Projects: ${summary.projectsCount}${liveProjects.length ? ` (live: ${liveProjects.join(", ")})` : ""}`,
      `Shoots: ${summary.shootsCount}${upcomingShoots.length ? ` (upcoming: ${upcomingShoots.join(", ")})` : ""}`,
      `Outstanding (awaiting payment): ${money(summary.outstandingPence)}`,
      `Recent activity: ${recent.length ? recent.join("; ") : "none logged"}`,
    ].join("\n");

    const text = await runAssist({ system: SUMMARY_SYSTEM, prompt: context });
    if (!text) {
      return { ok: false, error: "The assistant returned an empty summary. Try again." };
    }
    return { ok: true, text };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not draft the summary.",
    };
  }
}

/**
 * Draft a short, warm client check-in/update email from the client's name and
 * what's currently live. Returns the draft to review and copy.
 */
export async function draftClientEmailAction(
  clientId: string,
): Promise<ClientAiResult> {
  try {
    if (!aiConfigured()) {
      return { ok: false, error: NOT_CONNECTED };
    }
    const profile = await getClientProfile(clientId);
    if (!profile) {
      return { ok: false, error: "That client was not found in your workspace." };
    }
    const { client: c, projects, shoots } = profile;

    const primary = profile.contacts.find((ct) => ct.isPrimary) ?? profile.contacts[0];
    const live = projects
      .filter((p) => p.status === "active" || p.status === "planning" || p.status === "on_hold")
      .map((p) => p.name);
    const upcoming = shoots
      .filter((s) => s.status === "booked" || s.status === "on_site")
      .map((s) => s.title);

    const context = [
      `Client: ${c.name}`,
      primary ? `Primary contact: ${primary.name}` : null,
      `Live projects: ${live.length ? live.join(", ") : "none right now"}`,
      `Upcoming shoots: ${upcoming.length ? upcoming.join(", ") : "none scheduled"}`,
    ]
      .filter((l): l is string => l != null)
      .join("\n");

    const text = await runAssist({ system: EMAIL_SYSTEM, prompt: context });
    if (!text) {
      return { ok: false, error: "The assistant returned an empty draft. Try again." };
    }
    return { ok: true, text };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not draft the email.",
    };
  }
}
