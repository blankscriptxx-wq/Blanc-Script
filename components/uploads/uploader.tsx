"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2 } from "lucide-react";
import {
  presignUploadAction,
  confirmUploadAction,
} from "@/app/(os)/(app)/uploads/actions";
import type { MediaFilter } from "@/lib/data/media";

type State = "idle" | "uploading" | "error" | "done";

/**
 * Direct-to-R2 uploader. The file is registered + auto-assigned to the given
 * context (shoot/project/client/…) the moment it's picked, then the browser PUTs
 * the bytes straight to storage.
 */
export function Uploader({
  context,
  configured,
  label = "Upload file",
}: {
  context: MediaFilter;
  configured: boolean;
  label?: string;
}) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [state, setState] = React.useState<State>("idle");
  const [error, setError] = React.useState<string>("");
  const [current, setCurrent] = React.useState<string>("");

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setState("uploading");
    setError("");
    setCurrent(file.name);
    try {
      const pres = await presignUploadAction({
        fileName: file.name,
        mimeType: file.type || null,
        sizeBytes: file.size,
        ...context,
      });
      if (!pres.ok) {
        setError(pres.error);
        setState("error");
        return;
      }
      const put = await fetch(pres.uploadUrl, {
        method: "PUT",
        headers: { "content-type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!put.ok) {
        setError(`Upload failed (HTTP ${put.status}). Check the bucket's CORS allows PUT from this site.`);
        setState("error");
        return;
      }
      await confirmUploadAction(pres.assetId);
      setState("done");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
      setState("error");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  if (!configured) {
    return (
      <p className="rounded-sm border border-dashed border-bs-border bg-bs-surface-2 px-3 py-2 text-xs text-bs-subtle">
        Storage isn&rsquo;t connected yet. Add the Cloudflare R2 keys in{" "}
        <span className="text-bs-text">Settings → Integrations</span> to enable uploads.
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={onPick}
        disabled={state === "uploading"}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={state === "uploading"}
        className="inline-flex items-center gap-2 rounded-sm border border-bs-border-strong bg-bs-surface px-3 py-1.5 text-sm text-bs-text transition-colors hover:bg-bs-surface-2 disabled:opacity-60"
      >
        {state === "uploading" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Upload className="h-4 w-4" />
        )}
        {state === "uploading" ? "Uploading…" : label}
      </button>
      {state === "uploading" && current ? (
        <p className="text-xs text-bs-subtle">{current}</p>
      ) : null}
      {state === "done" ? (
        <p className="text-xs text-bs-success">Uploaded &amp; assigned.</p>
      ) : null}
      {state === "error" ? <p className="text-xs text-bs-danger">{error}</p> : null}
    </div>
  );
}
