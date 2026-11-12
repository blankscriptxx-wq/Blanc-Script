"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Globe, Loader2, Plus } from "lucide-react";
import {
  createPortalLinkAction,
  revokePortalLinkAction,
} from "@/app/(os)/(app)/clients/[id]/portal-actions";

export type PortalLinkView = {
  id: string;
  label: string;
  token: string;
  lastSeenAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
};

const day = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/London",
});

/**
 * Client portal access for one client: a private link per person. The client
 * can review cuts, see shoots and the content schedule, and pay invoices.
 */
export function PortalLinks({
  clientId,
  links,
  suggestions,
}: {
  clientId: string;
  links: PortalLinkView[];
  suggestions: string[];
}) {
  const router = useRouter();
  const [label, setLabel] = React.useState("");
  const [busy, setBusy] = React.useState("");
  const [error, setError] = React.useState("");
  const [copied, setCopied] = React.useState("");
  const [origin, setOrigin] = React.useState("");
  React.useEffect(() => setOrigin(window.location.origin), []);

  const active = links.filter((l) => !l.revokedAt);
  const unused = suggestions.filter((s) => !active.some((l) => l.label === s));

  async function create(name: string) {
    setBusy("create");
    setError("");
    const res = await createPortalLinkAction(clientId, name).catch(() => null);
    setBusy("");
    if (!res || !res.ok) return setError(res && !res.ok ? res.error : "Something went wrong.");
    setLabel("");
    router.refresh();
  }

  async function revoke(id: string) {
    if (!window.confirm("Revoke this link? It will stop working straight away.")) return;
    setBusy(id);
    setError("");
    const res = await revokePortalLinkAction(clientId, id).catch(() => null);
    setBusy("");
    if (!res || !res.ok) return setError(res && !res.ok ? res.error : "Something went wrong.");
    router.refresh();
  }

  return (
    <section className="mt-8">
      <div className="mb-2 flex items-center gap-2">
        <Globe className="h-4 w-4 text-bs-muted" />
        <h2 className="font-display text-h3">Client portal</h2>
      </div>
      <p className="mb-3 text-sm text-bs-muted">
        Give each person their own private link. They can review cuts sent for review, see
        shoots and the content schedule, and pay invoices — nothing internal.
      </p>

      {active.length ? (
        <ul className="mb-3 space-y-2">
          {active.map((l) => {
            const url = `${origin}/portal/${l.token}`;
            return (
              <li
                key={l.id}
                className="flex flex-wrap items-center gap-2 rounded-md border border-bs-border bg-bs-surface px-4 py-3"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-bs-text">{l.label}</span>
                  <span className="block text-xs text-bs-subtle">
                    {l.lastSeenAt ? `Last opened ${day.format(new Date(l.lastSeenAt))}` : "Not opened yet"}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(url).then(
                      () => {
                        setCopied(l.id);
                        setTimeout(() => setCopied(""), 1500);
                      },
                      () => {},
                    );
                  }}
                  className="inline-flex items-center gap-1.5 rounded-sm border border-bs-border-strong bg-bs-surface px-2.5 py-1.5 text-xs font-medium text-bs-text transition-colors hover:bg-bs-surface-2"
                >
                  {copied === l.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied === l.id ? "Copied" : "Copy link"}
                </button>
                <a
                  href={`/portal/${l.token}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-bs-primary hover:underline"
                >
                  Preview
                </a>
                <button
                  type="button"
                  onClick={() => revoke(l.id)}
                  disabled={busy !== ""}
                  className="text-xs text-bs-subtle transition-colors hover:text-bs-danger disabled:opacity-50"
                >
                  {busy === l.id ? "Revoking…" : "Revoke"}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (label.trim()) void create(label);
        }}
      >
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Who is this link for? e.g. Hannah Fernley"
          aria-label="Name for the portal link"
          className="h-9 min-w-[220px] flex-1 rounded-sm border border-bs-border-strong bg-bs-surface px-3 text-sm text-bs-text outline-none placeholder:text-bs-subtle"
        />
        <button
          type="submit"
          disabled={busy !== "" || !label.trim()}
          className="inline-flex h-9 items-center gap-1.5 rounded-sm bg-bs-primary px-3 text-sm font-medium text-bs-on-accent transition-colors hover:bg-bs-primary-hover disabled:opacity-50"
        >
          {busy === "create" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Create link
        </button>
      </form>
      {unused.length ? (
        <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-bs-subtle">
          Quick add:
          {unused.map((s) => (
            <button
              key={s}
              type="button"
              disabled={busy !== ""}
              onClick={() => create(s)}
              className="rounded-pill border border-bs-border px-2 py-0.5 text-bs-text transition-colors hover:bg-bs-surface-2 disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </p>
      ) : null}
      {error ? <p className="mt-2 text-xs text-bs-danger">{error}</p> : null}
    </section>
  );
}
