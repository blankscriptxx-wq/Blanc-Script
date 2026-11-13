"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Upload } from "lucide-react";
import {
  portalConfirmUploadAction,
  portalPresignUploadAction,
} from "@/app/(os)/portal/[token]/actions";

type Item = { name: string; size: number; progress: number; state: "queued" | "uploading" | "done" | "error"; error?: string };

function fileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

/** PUT a file straight to storage with progress (fetch can't report upload progress). */
function put(url: string, file: File, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("content-type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status}).`)));
    xhr.onerror = () => reject(new Error("The upload was interrupted. Please check your connection and try again."));
    xhr.send(file);
  });
}

/** Clients send footage and files here; each goes straight to Blanc Script. */
export function UploadPanel({ token, scriptId, intro }: { token: string; scriptId?: string; intro?: string }) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [note, setNote] = React.useState("");
  const [items, setItems] = React.useState<Item[]>([]);
  const [working, setWorking] = React.useState(false);

  const patch = (i: number, p: Partial<Item>) =>
    setItems((list) => list.map((it, idx) => (idx === i ? { ...it, ...p } : it)));

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const base = items.length;
    setItems((list) => [...list, ...files.map((f) => ({ name: f.name, size: f.size, progress: 0, state: "queued" as const }))]);
    setWorking(true);
    for (let k = 0; k < files.length; k++) {
      const file = files[k];
      const i = base + k;
      patch(i, { state: "uploading" });
      try {
        const target = await portalPresignUploadAction(token, {
          fileName: file.name,
          mimeType: file.type || null,
          sizeBytes: file.size,
          note: note.trim() || null,
          scriptId: scriptId ?? null,
        });
        if (!target.ok) throw new Error(target.error);
        await put(target.uploadUrl, file, (pct) => patch(i, { progress: pct }));
        await portalConfirmUploadAction(token, target.assetId);
        patch(i, { state: "done", progress: 100 });
      } catch (err) {
        patch(i, { state: "error", error: err instanceof Error ? err.message : "Upload failed." });
      }
    }
    setWorking(false);
    setNote("");
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  return (
    <div className="rounded-md border border-bs-border bg-bs-surface p-5">
      <p className="text-sm text-bs-muted">
        {intro ??
          "Send us footage, photos, logos or documents. Files go straight to the Blanc Script team."}{" "}
        Keep this page open until each upload finishes. Up to 5 GB per file.
      </p>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Add a note (optional) — e.g. “B-roll from Saturday's market”"
        aria-label="Note for these files"
        className="mt-3 h-9 w-full rounded-sm border border-bs-border-strong bg-bs-surface px-3 text-sm text-bs-text outline-none placeholder:text-bs-subtle"
      />
      <input ref={inputRef} type="file" multiple className="hidden" onChange={onPick} disabled={working} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={working}
        className="mt-3 inline-flex h-10 items-center gap-2 rounded-sm bg-bs-text px-4 text-sm font-medium text-bs-surface transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {working ? "Uploading…" : "Choose files"}
      </button>

      {items.length ? (
        <ul className="mt-4 space-y-2">
          {items.map((it, i) => (
            <li key={`${it.name}-${i}`} className="rounded-sm border border-bs-border px-3 py-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate text-bs-text">{it.name}</span>
                <span className="shrink-0 text-xs text-bs-subtle">{fileSize(it.size)}</span>
                {it.state === "done" ? (
                  <span className="flex shrink-0 items-center gap-1 text-xs text-bs-success">
                    <CheckCircle2 className="h-4 w-4" /> Sent
                  </span>
                ) : it.state === "error" ? (
                  <span className="shrink-0 text-xs text-bs-danger">Not sent</span>
                ) : (
                  <span className="shrink-0 text-xs tabular-nums text-bs-muted">{it.state === "queued" ? "Waiting" : `${it.progress}%`}</span>
                )}
              </div>
              {it.state === "uploading" ? (
                <div className="mt-1.5 h-1 overflow-hidden rounded-pill bg-bs-surface-2">
                  <div className="h-full bg-bs-primary transition-all" style={{ width: `${it.progress}%` }} />
                </div>
              ) : null}
              {it.error ? <p className="mt-1 text-xs text-bs-danger">{it.error}</p> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
