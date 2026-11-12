"use client";
import * as React from "react";
import { useActionState } from "react";
import { Button } from "@/components/ds/button";
import {
  renameWorkspaceAction,
  type SettingsActionState,
} from "@/app/(os)/(app)/settings/actions";

const inputCls =
  "h-9 w-full rounded-sm border border-bs-border-strong bg-bs-surface px-3 text-body text-bs-text outline-none placeholder:text-bs-subtle";

export function WorkspaceForm({
  name,
  slug,
}: {
  name: string;
  slug: string;
}) {
  const [state, action, pending] = useActionState<SettingsActionState, FormData>(
    renameWorkspaceAction,
    {},
  );

  return (
    <form action={action} className="mt-4 space-y-4">
      <label className="block space-y-1.5">
        <span className="block text-sm font-medium text-bs-text">Workspace name</span>
        <input
          name="name"
          defaultValue={name}
          required
          minLength={2}
          maxLength={80}
          className={inputCls}
        />
      </label>
      <div className="flex items-center gap-2">
        <span className="text-sm text-bs-subtle">Handle</span>
        <code className="rounded-sm bg-bs-surface-2 px-2 py-0.5 text-sm text-bs-muted">
          {slug}
        </code>
      </div>
      {state?.error ? (
        <p className="text-sm text-bs-danger">{state.error}</p>
      ) : null}
      {state?.ok ? (
        <p className="text-sm text-bs-success">Saved.</p>
      ) : null}
      <div className="flex justify-end pt-1">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
