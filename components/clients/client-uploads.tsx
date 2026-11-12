"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Download, Inbox } from "lucide-react";
import { assignUploadAction } from "@/app/(os)/(app)/clients/[id]/document-actions";

export type ClientUploadView = {
  id: string;
  fileName: string;
  kind: string;
  sizeBytes: number | null;
  note: string | null;
  uploadedBy: string | null;
  shootId: string | null;
  shootTitle: string | null;
  scriptId: string | null;
  scriptTitle: string | null;
  createdAt: Date;
};

const when = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/London",
});

export function fileSize(bytes: number | null): string {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let n = bytes / 1024;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n >= 10 ? Math.round(n) : n.toFixed(1)} ${units[i]}`;
}

/** Files the client sent through their portal, to be filed under a shoot or script. */
export function ClientUploads({
  clientId,
  uploads,
  shoots,
  scripts,
}: {
  clientId: string;
  uploads: ClientUploadView[];
  shoots: { id: string; title: string }[];
  scripts: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState("");
  const [error, setError] = React.useState("");

  async function assign(assetId: string, target: string) {
    setBusy(assetId);
    setError("");
    const res = await assignUploadAction(clientId, assetId, target).catch(() => null);
    setBusy("");
    if (!res || !res.ok) return setError(res && !res.ok ? res.error : "Something went wrong.");
    router.refresh();
  }

  const unfiled = uploads.filter((u) => !u.shootId && !u.scriptId).length;

  return (
    <section className="mt-8">
      <div className="mb-2 flex items-center gap-2">
        <Inbox className="h-4 w-4 text-bs-muted" />
        <h2 className="font-display text-h3">Files from the client</h2>
        {unfiled ? (
          <span className="rounded-pill bg-bs-warning-soft px-2 py-0.5 text-xs font-medium text-bs-warning">
            {unfiled} to file
          </span>
        ) : null}
      </div>
      {uploads.length === 0 ? (
        <p className="rounded-md border border-dashed border-bs-border bg-bs-surface px-4 py-5 text-sm text-bs-subtle">
          Nothing received yet. Clients can send footage and files from their portal.
        </p>
      ) : (
        <ul className="space-y-2">
          {uploads.map((u) => {
            const current = u.shootId ? `shoot:${u.shootId}` : u.scriptId ? `script:${u.scriptId}` : "";
            return (
              <li
                key={u.id}
                className="flex flex-wrap items-center gap-2 rounded-md border border-bs-border bg-bs-surface px-4 py-3"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-bs-text">{u.fileName}</span>
                  <span className="block text-xs text-bs-subtle">
                    {[fileSize(u.sizeBytes), u.uploadedBy ? `from ${u.uploadedBy}` : "", when.format(new Date(u.createdAt))]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                  {u.note ? <span className="mt-0.5 block text-xs text-bs-muted">“{u.note}”</span> : null}
                </span>
                <select
                  value={current}
                  disabled={busy === u.id}
                  onChange={(e) => assign(u.id, e.target.value)}
                  aria-label={`File ${u.fileName} under`}
                  className="h-8 max-w-[240px] rounded-sm border border-bs-border-strong bg-bs-surface px-2 pr-7 text-xs text-bs-text outline-none"
                >
                  <option value="">Not filed yet</option>
                  {shoots.length ? (
                    <optgroup label="Shoots">
                      {shoots.map((s) => (
                        <option key={s.id} value={`shoot:${s.id}`}>
                          {s.title}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                  {scripts.length ? (
                    <optgroup label="Scripts">
                      {scripts.map((s) => (
                        <option key={s.id} value={`script:${s.id}`}>
                          {s.title}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                </select>
                <a
                  href={`/uploads/${u.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-bs-primary hover:underline"
                >
                  <Download className="h-3.5 w-3.5" /> Download
                </a>
              </li>
            );
          })}
        </ul>
      )}
      {error ? <p className="mt-2 text-xs text-bs-danger">{error}</p> : null}
    </section>
  );
}
