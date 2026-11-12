"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Opens a list view's "add" dialog when the page is reached with `?new=1`
 * (from the Today "+ New" menu or the command palette), then removes the
 * parameter so a refresh doesn't reopen it.
 */
export function useOpenOnNewParam(open: (v: boolean) => void) {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const wantsNew = params.get("new") === "1";
  React.useEffect(() => {
    if (!wantsNew) return;
    open(true);
    const rest = new URLSearchParams(params.toString());
    rest.delete("new");
    const qs = rest.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantsNew]);
}
