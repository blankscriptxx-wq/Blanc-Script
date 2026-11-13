"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { setSelfShootAction } from "@/app/(os)/(app)/clients/[id]/actions";

/** Who films this client's content. Decides how their scripts are written. */
export function WhoFilms({ clientId, selfShoot }: { clientId: string; selfShoot: boolean }) {
  const router = useRouter();
  const [value, setValue] = React.useState(selfShoot);
  const [busy, setBusy] = React.useState(false);
  const set = async (next: boolean) => {
    if (next === value || busy) return;
    setValue(next);
    setBusy(true);
    const res = await setSelfShootAction(clientId, next);
    setBusy(false);
    if (!res.ok) setValue(!next);
    else router.refresh();
  };
  const opt = (v: boolean, label: string) => (
    <button
      type="button"
      aria-pressed={value === v}
      onClick={() => void set(v)}
      className={
        "h-9 flex-1 rounded-sm px-3 text-sm font-medium transition-colors sm:flex-none " +
        (value === v ? "bg-bs-text text-bs-surface" : "text-bs-muted hover:bg-bs-surface-2")
      }
    >
      {label}
    </button>
  );
  return (
    <div className="mt-4 border-t border-bs-border pt-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-sm font-medium text-bs-text">Who films their content</span>
        <div className="flex w-full gap-1 rounded-md border border-bs-border p-1 sm:w-auto">
          {opt(false, "Our team")}
          {opt(true, "They film themselves")}
        </div>
      </div>
      <p className="mt-1.5 text-xs text-bs-muted">
        {value
          ? "New scripts are written as a simple shot-by-shot list they can follow on a phone and tick off in their portal."
          : "New scripts are written for our crew, with full camera direction."}
      </p>
    </div>
  );
}
