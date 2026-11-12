"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2, Plus, Wand2 } from "lucide-react";
import { Dialog } from "@/components/ds/dialog";
import { StatusPill } from "@/components/ds/status-pill";
import {
  createDocumentAction,
  generateAgreementAction,
  saveDocumentAction,
  sendDocumentAction,
  voidDocumentAction,
  type DocResult,
} from "@/app/(os)/(app)/clients/[id]/document-actions";

export type ClientDocumentView = {
  id: string;
  title: string;
  body: string;
  status: "draft" | "sent" | "accepted" | "void";
  sentAt: Date | null;
  acceptedAt: Date | null;
  acceptedByName: string | null;
  createdAt: Date;
};

type Tone = React.ComponentProps<typeof StatusPill>["tone"];
const STATUS: Record<ClientDocumentView["status"], { label: string; tone: Tone }> = {
  draft: { label: "Draft", tone: "neutral" },
  sent: { label: "Awaiting acceptance", tone: "warning" },
  accepted: { label: "Accepted", tone: "success" },
  void: { label: "Void", tone: "neutral" },
};

const when = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/London",
});

/**
 * Agreements and schedules for one client: create a copy from a template
 * (merge fields filled in), check it, send it to their portal, and see when
 * and by whom it was accepted.
 */
export function ClientDocuments({
  clientId,
  documents,
  templates,
}: {
  clientId: string;
  documents: ClientDocumentView[];
  templates: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [templateId, setTemplateId] = React.useState("");
  const [busy, setBusy] = React.useState("");
  const [note, setNote] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [open, setOpen] = React.useState<ClientDocumentView | null>(null);
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");

  async function run(key: string, fn: () => Promise<DocResult>) {
    setBusy(key);
    setNote(null);
    const res = await fn().catch(() => null);
    setBusy("");
    if (!res) return setNote({ ok: false, text: "Something went wrong." });
    if (!res.ok) return setNote({ ok: false, text: res.error });
    if (res.message) setNote({ ok: true, text: res.message });
    router.refresh();
    return true;
  }

  function view(d: ClientDocumentView) {
    setOpen(d);
    setTitle(d.title);
    setBody(d.body);
  }

  const visible = documents.filter((d) => d.status !== "void");
  const btn =
    "inline-flex items-center gap-1.5 rounded-sm border border-bs-border-strong bg-bs-surface px-2.5 py-1.5 text-xs font-medium text-bs-text transition-colors hover:bg-bs-surface-2 disabled:opacity-50";

  return (
    <section className="mt-8">
      <div className="mb-2 flex items-center gap-2">
        <FileText className="h-4 w-4 text-bs-muted" />
        <h2 className="font-display text-h3">Agreements &amp; documents</h2>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-md border border-dashed border-bs-border bg-bs-surface px-4 py-5 text-sm text-bs-subtle">
          Nothing issued yet. Create a document from a template to send to this client.
        </p>
      ) : (
        <ul className="space-y-2">
          {visible.map((d) => (
            <li
              key={d.id}
              className="flex flex-wrap items-center gap-2 rounded-md border border-bs-border bg-bs-surface px-4 py-3"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-bs-text">{d.title}</span>
                <span className="block text-xs text-bs-subtle">
                  {d.status === "accepted" && d.acceptedAt
                    ? `Accepted by ${d.acceptedByName} on ${when.format(new Date(d.acceptedAt))}`
                    : d.status === "sent" && d.sentAt
                      ? `Sent ${when.format(new Date(d.sentAt))}`
                      : `Created ${when.format(new Date(d.createdAt))}`}
                </span>
              </span>
              <StatusPill tone={STATUS[d.status].tone}>{STATUS[d.status].label}</StatusPill>
              <button type="button" className={btn} onClick={() => view(d)}>
                {d.status === "draft" ? "Review & edit" : "View"}
              </button>
              {d.status === "draft" ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-sm bg-bs-primary px-2.5 py-1.5 text-xs font-medium text-bs-on-accent transition-colors hover:bg-bs-primary-hover disabled:opacity-50"
                  disabled={busy !== ""}
                  onClick={() => run(`send-${d.id}`, () => sendDocumentAction(clientId, d.id))}
                >
                  {busy === `send-${d.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  Send to client
                </button>
              ) : null}
              {d.status !== "accepted" ? (
                <button
                  type="button"
                  disabled={busy !== ""}
                  onClick={() => {
                    if (window.confirm("Void this document? The client will no longer see it.")) {
                      void run(`void-${d.id}`, () => voidDocumentAction(clientId, d.id));
                    }
                  }}
                  className="text-xs text-bs-subtle transition-colors hover:text-bs-danger disabled:opacity-50"
                >
                  Void
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {templates.length === 0 ? (
          <p className="text-xs text-bs-subtle">
            Add a template in Settings → Document templates to create documents here.
          </p>
        ) : (
          <>
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              aria-label="Template"
              className="h-9 min-w-[220px] rounded-sm border border-bs-border-strong bg-bs-surface px-3 pr-8 text-sm text-bs-text outline-none"
            >
              <option value="">Choose a template…</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={busy !== "" || !templateId}
              onClick={async () => {
                if (await run("create", () => createDocumentAction(clientId, templateId))) setTemplateId("");
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-sm border border-bs-border-strong bg-bs-surface px-3 text-sm font-medium text-bs-text transition-colors hover:bg-bs-surface-2 disabled:opacity-50"
            >
              {busy === "create" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create document
            </button>
          </>
        )}
        <button
          type="button"
          disabled={busy !== ""}
          onClick={() => run("generate", () => generateAgreementAction(clientId))}
          title="Writes the Service Agreement from what you entered in Onboarding — no blank fields"
          className="inline-flex h-9 items-center gap-1.5 rounded-sm bg-bs-primary px-3 text-sm font-medium text-bs-on-accent transition-colors hover:bg-bs-primary-hover disabled:opacity-50"
        >
          {busy === "generate" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
          Generate agreement
        </button>
      </div>
      {note ? (
        <p className={`mt-2 text-xs ${note.ok ? "text-bs-success" : "text-bs-danger"}`}>{note.text}</p>
      ) : null}

      <Dialog open={open !== null} onClose={() => setOpen(null)} title={open?.status === "draft" ? "Review document" : (open?.title ?? "")}>
        {open ? (
          open.status === "draft" ? (
            <div className="space-y-3">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                aria-label="Document title"
                className="h-9 w-full rounded-sm border border-bs-border-strong bg-bs-surface px-3 text-sm text-bs-text outline-none"
              />
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={18}
                aria-label="Document text"
                className="w-full rounded-sm border border-bs-border-strong bg-bs-surface px-3 py-2 text-sm leading-relaxed text-bs-text outline-none"
              />
              <p className="text-xs text-bs-subtle">
                Anything in [square brackets] is a merge field that had no value — fill it in before sending.
              </p>
              <div className="flex justify-end gap-2">
                <button type="button" className={btn} onClick={() => setOpen(null)}>
                  Close
                </button>
                <button
                  type="button"
                  disabled={busy !== ""}
                  onClick={async () => {
                    if (await run("save", () => saveDocumentAction(clientId, open.id, title, body))) setOpen(null);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-sm bg-bs-primary px-3 py-1.5 text-xs font-medium text-bs-on-accent hover:bg-bs-primary-hover disabled:opacity-50"
                >
                  {busy === "save" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  Save draft
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {open.status === "accepted" && open.acceptedAt ? (
                <p className="rounded-sm bg-bs-success-soft px-3 py-2 text-sm text-bs-success">
                  Accepted by {open.acceptedByName} on {when.format(new Date(open.acceptedAt))}.
                </p>
              ) : null}
              <a
                href={`/clients/${clientId}/documents/${open.id}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-bs-primary hover:underline"
              >
                Open as the client sees it (print or save as PDF)
              </a>
              <div className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap rounded-sm border border-bs-border bg-bs-surface-2 p-4 text-sm leading-relaxed text-bs-text">
                {open.body}
              </div>
            </div>
          )
        ) : null}
      </Dialog>
    </section>
  );
}
