"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Copy, FileSignature, Loader2, Plus } from "lucide-react";
import { createProposalAction, deleteProposalAction } from "@/app/(os)/(app)/clients/[id]/proposal-actions";

export type ProposalListItem = {
  id: string;
  title: string;
  status: "draft" | "sent" | "accepted";
  token: string;
  sentAt: Date | null;
  viewedAt: Date | null;
  acceptedAt: Date | null;
  acceptedByName: string | null;
};

const day = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });

/** Proposals for one client: branded pages sent as a private link and accepted by name. */
export function ClientProposals({ clientId, proposals }: { clientId: string; proposals: ProposalListItem[] }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState("");
  const [error, setError] = React.useState("");
  const [copied, setCopied] = React.useState("");

  const ghost =
    "inline-flex items-center gap-1.5 rounded-sm border border-bs-border-strong bg-bs-surface px-2.5 py-1.5 text-xs font-medium text-bs-text transition-colors hover:bg-bs-surface-2 disabled:opacity-50";

  return (
    <section className="mt-8">
      <div className="mb-2 flex items-center gap-2">
        <FileSignature className="h-4 w-4 text-bs-muted" />
        <h2 className="font-display text-h3">Proposals</h2>
      </div>
      <p className="mb-3 text-sm text-bs-muted">
        A Blanc Script-branded page made for this client: the opportunity, what you&rsquo;d create, how it works and
        the investment. They open it from a private link and can accept it by typing their name.
      </p>
      {proposals.length ? (
        <ul className="mb-3 space-y-2">
          {proposals.map((p) => {
            const state =
              p.status === "accepted"
                ? `Accepted by ${p.acceptedByName}${p.acceptedAt ? ` · ${day.format(new Date(p.acceptedAt))}` : ""}`
                : p.status === "sent"
                  ? p.viewedAt
                    ? `Sent · opened ${day.format(new Date(p.viewedAt))}`
                    : "Sent · not opened yet"
                  : "Draft — not sent";
            return (
              <li key={p.id} className="flex flex-wrap items-center gap-2 rounded-md border border-bs-border bg-bs-surface px-4 py-3">
                <span className="min-w-0 flex-1">
                  <Link href={`/clients/${clientId}/proposals/${p.id}`} className="block text-sm font-medium text-bs-text hover:underline">
                    {p.title}
                  </Link>
                  <span className={`block text-xs ${p.status === "accepted" ? "text-bs-success" : "text-bs-subtle"}`}>{state}</span>
                </span>
                <Link href={`/clients/${clientId}/proposals/${p.id}`} className={ghost}>
                  {p.status === "accepted" ? "View" : "Edit"}
                </Link>
                {p.status !== "draft" ? (
                  <button
                    type="button"
                    className={ghost}
                    onClick={() => {
                      navigator.clipboard?.writeText(`${window.location.origin}/proposal/${p.token}`).then(
                        () => {
                          setCopied(p.id);
                          setTimeout(() => setCopied(""), 1500);
                        },
                        () => {},
                      );
                    }}
                  >
                    {copied === p.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied === p.id ? "Copied" : "Copy link"}
                  </button>
                ) : null}
                {p.status !== "accepted" ? (
                  <button
                    type="button"
                    disabled={busy !== ""}
                    className="text-xs text-bs-subtle transition-colors hover:text-bs-danger disabled:opacity-50"
                    onClick={async () => {
                      if (!window.confirm("Delete this proposal? Its link stops working.")) return;
                      setBusy(p.id);
                      await deleteProposalAction(clientId, p.id).catch(() => null);
                      setBusy("");
                      router.refresh();
                    }}
                  >
                    {busy === p.id ? "Deleting…" : "Delete"}
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
      <button
        type="button"
        disabled={busy !== ""}
        className="inline-flex h-9 items-center gap-1.5 rounded-sm bg-bs-primary px-3 text-sm font-medium text-bs-on-accent transition-colors hover:bg-bs-primary-hover disabled:opacity-50"
        onClick={async () => {
          setBusy("new");
          setError("");
          const res = await createProposalAction(clientId).catch(() => null);
          if (res?.ok && res.id) router.push(`/clients/${clientId}/proposals/${res.id}`);
          else {
            setBusy("");
            setError(res && !res.ok ? res.error : "Could not create the proposal.");
          }
        }}
      >
        {busy === "new" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        New proposal
      </button>
      {error ? <p className="mt-2 text-xs text-bs-danger">{error}</p> : null}
    </section>
  );
}
