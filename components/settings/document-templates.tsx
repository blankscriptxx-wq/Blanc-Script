"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Dialog } from "@/components/ds/dialog";
import { MERGE_FIELDS } from "@/lib/documents/merge";
import {
  archiveTemplateAction,
  saveTemplateAction,
} from "@/app/(os)/(app)/settings/integration-actions";

export type TemplateView = { id: string; name: string; body: string };

/**
 * Reusable documents (service agreement, contract schedules…). Paste your
 * wording in, drop in merge fields, and create a filled-in copy for any
 * client from their page.
 */
export function DocumentTemplates({ templates }: { templates: TemplateView[] }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<TemplateView | { id: null; name: string; body: string } | null>(null);
  const [name, setName] = React.useState("");
  const [body, setBody] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const bodyRef = React.useRef<HTMLTextAreaElement>(null);

  function open(t: TemplateView | null) {
    setEditing(t ?? { id: null, name: "", body: "" });
    setName(t?.name ?? "");
    setBody(t?.body ?? "");
    setError("");
  }

  function insert(key: string) {
    const el = bodyRef.current;
    const token = `{{${key}}}`;
    if (!el) return setBody((b) => b + token);
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    setBody(body.slice(0, start) + token + body.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  }

  async function save() {
    if (!editing) return;
    setBusy(true);
    setError("");
    const res = await saveTemplateAction(editing.id, name, body).catch(() => null);
    setBusy(false);
    if (!res || !res.ok) return setError(res && !res.ok ? res.error : "Something went wrong.");
    setEditing(null);
    router.refresh();
  }

  return (
    <div className="mt-4">
      {templates.length === 0 ? (
        <p className="rounded-md border border-dashed border-bs-border px-4 py-5 text-sm text-bs-subtle">
          No templates yet. Add your service agreement to start issuing it to clients.
        </p>
      ) : (
        <ul className="divide-y divide-bs-border rounded-md border border-bs-border">
          {templates.map((t) => (
            <li key={t.id} className="flex items-center gap-2 px-4 py-3">
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-bs-text">{t.name}</span>
                <span className="block truncate text-xs text-bs-subtle">{t.body.replace(/\s+/g, " ").slice(0, 110)}</span>
              </span>
              <button
                type="button"
                aria-label={`Edit ${t.name}`}
                onClick={() => open(t)}
                className="rounded-sm p-1.5 text-bs-muted hover:bg-bs-surface-2"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label={`Remove ${t.name}`}
                onClick={async () => {
                  if (!window.confirm(`Remove the “${t.name}” template? Documents already issued are kept.`)) return;
                  await archiveTemplateAction(t.id);
                  router.refresh();
                }}
                className="rounded-sm p-1.5 text-bs-muted hover:bg-bs-surface-2 hover:text-bs-danger"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={() => open(null)}
        className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-sm border border-bs-border-strong bg-bs-surface px-3 text-sm font-medium text-bs-text hover:bg-bs-surface-2"
      >
        <Plus className="h-4 w-4" /> Add template
      </button>

      <Dialog open={editing !== null} onClose={() => setEditing(null)} title={editing?.id ? "Edit template" : "New template"}>
        <div className="space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Service Agreement"
            aria-label="Template name"
            className="h-9 w-full rounded-sm border border-bs-border-strong bg-bs-surface px-3 text-sm text-bs-text outline-none placeholder:text-bs-subtle"
          />
          <textarea
            ref={bodyRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={16}
            placeholder="Paste the document wording here…"
            aria-label="Template text"
            className="w-full rounded-sm border border-bs-border-strong bg-bs-surface px-3 py-2 text-sm leading-relaxed text-bs-text outline-none placeholder:text-bs-subtle"
          />
          <div>
            <p className="mb-1.5 text-xs text-bs-subtle">Insert a field that fills in for each client:</p>
            <div className="flex flex-wrap gap-1.5">
              {MERGE_FIELDS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  title={f.label}
                  onClick={() => insert(f.key)}
                  className="rounded-pill border border-bs-border px-2 py-0.5 font-mono text-[11px] text-bs-text hover:bg-bs-surface-2"
                >
                  {`{{${f.key}}}`}
                </button>
              ))}
            </div>
          </div>
          {error ? <p className="text-xs text-bs-danger">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-sm border border-bs-border-strong px-3 py-1.5 text-xs font-medium text-bs-text hover:bg-bs-surface-2"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-sm bg-bs-primary px-3 py-1.5 text-xs font-medium text-bs-on-accent hover:bg-bs-primary-hover disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Save template
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
