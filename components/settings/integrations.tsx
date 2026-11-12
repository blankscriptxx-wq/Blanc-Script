import * as React from "react";
import { StatusPill } from "@/components/ds/status-pill";

/**
 * Integrations status board. Reports connection status by reading env-var
 * PRESENCE only — never values, never secrets. Declarative: each integration
 * lists the env var(s) that power it, and is "Connected" when all are present.
 */

type Integration = {
  name: string;
  unlocks: string;
  /** Every listed env var must be present to count as connected. */
  envVars: string[];
};

const INTEGRATIONS: Integration[] = [
  {
    name: "AI assistant",
    unlocks: "Drafting, summaries and the AI inbox across the OS.",
    envVars: ["ANTHROPIC_API_KEY"],
  },
  {
    name: "Media storage",
    unlocks: "Uploads, deliverables and asset hosting.",
    envVars: ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"],
  },
  {
    name: "Social scheduling",
    unlocks: "Publishing and scheduling content to social channels.",
    envVars: ["METRICOOL_API_KEY"],
  },
  {
    name: "Payments (Stripe)",
    unlocks: "Package subscriptions, invoice payment links and automatic paid invoices.",
    envVars: ["STRIPE_SECRET_KEY"],
  },
  {
    name: "Email (your own mailbox)",
    unlocks: "Invoices, portal invites and agreements, sent from your blancscript.com mailbox.",
    envVars: ["SMTP_HOST", "SMTP_USER", "SMTP_PASS"],
  },
  {
    name: "WhatsApp (Aniro)",
    unlocks: "Live sending and receiving in the Inbox.",
    envVars: ["ANIRO_API_URL", "ANIRO_API_KEY"],
  },
];

/** True only when every required env var is present (non-empty). */
function isConnected(envVars: string[]): boolean {
  return envVars.every((key) => {
    const value = process.env[key];
    return typeof value === "string" && value.trim() !== "";
  });
}

export function Integrations() {
  return (
    <ul className="mt-4 divide-y divide-bs-border rounded-md border border-bs-border">
      {INTEGRATIONS.map((integration) => {
        const connected = isConnected(integration.envVars);
        return (
          <li
            key={integration.name}
            className="flex items-start justify-between gap-3 px-4 py-3"
          >
            <div className="min-w-0">
              <p className="font-medium text-bs-text">{integration.name}</p>
              <p className="mt-0.5 text-sm text-bs-muted">{integration.unlocks}</p>
            </div>
            <StatusPill tone={connected ? "success" : "neutral"} className="shrink-0">
              {connected ? "Connected" : "Not connected"}
            </StatusPill>
          </li>
        );
      })}
    </ul>
  );
}
