"use client";
import * as React from "react";
import { Film, Image as ImageIcon, FileText, Music, File, Download, X } from "lucide-react";
import { StatusPill } from "@/components/ds/status-pill";
import { removeMediaAction } from "@/app/(app)/uploads/actions";
import type { MediaAssetRow, MediaKind } from "@/lib/data/media";

const KIND_ICON: Record<MediaKind, React.ComponentType<{ className?: string }>> = {
  video: Film,
  image: ImageIcon,
  document: FileText,
  audio: Music,
  other: File,
};

function humanSize(n: number | null): string {
  if (n == null) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function FileList({ rows }: { rows: MediaAssetRow[] }) {
  if (rows.length === 0) {
    return <p className="text-xs text-bs-subtle">No files yet.</p>;
  }
  return (
    <ul className="space-y-1.5">
      {rows.map((r) => {
        const Icon = KIND_ICON[r.kind] ?? File;
        return (
          <li
            key={r.id}
            className="flex items-center justify-between gap-3 rounded-sm bg-bs-surface-2 px-3 py-2"
          >
            <div className="flex min-w-0 items-center gap-2">
              <Icon className="h-4 w-4 shrink-0 text-bs-subtle" />
              <span className="truncate text-sm text-bs-text">{r.fileName}</span>
              {r.sizeBytes != null ? (
                <span className="shrink-0 text-xs text-bs-subtle">{humanSize(r.sizeBytes)}</span>
              ) : null}
              {r.status !== "ready" ? (
                <StatusPill tone="warning">{r.status}</StatusPill>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <a
                href={`/uploads/${r.id}`}
                target="_blank"
                rel="noreferrer"
                aria-label={`Download ${r.fileName}`}
                className="rounded-sm p-1 text-bs-subtle transition-colors hover:bg-bs-surface hover:text-bs-text"
              >
                <Download className="h-3.5 w-3.5" />
              </a>
              <form action={removeMediaAction}>
                <input type="hidden" name="id" value={r.id} />
                <button
                  type="submit"
                  aria-label={`Remove ${r.fileName}`}
                  className="rounded-sm p-1 text-bs-subtle transition-colors hover:bg-bs-surface hover:text-bs-danger"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
