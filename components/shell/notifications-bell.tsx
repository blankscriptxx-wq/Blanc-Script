"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  getNotificationsAction,
  type NotificationItem,
} from "@/app/(os)/(app)/notifications-actions";

const DOT: Record<NotificationItem["tone"], string> = {
  danger: "bg-bs-danger",
  warning: "bg-bs-warning",
  accent: "bg-bs-accent",
  success: "bg-bs-success",
};
const KIND: Record<NotificationItem["kind"], string> = {
  client: "Client",
  invoice: "Invoice",
  shoot: "Shoot",
  task: "Task",
  deliverable: "Edit",
};

/**
 * The bell: a count of things that need you (overdue invoices, cuts awaiting
 * review, tasks due, shoots coming up) and a quick list to jump to them.
 */
export function NotificationsBell() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<NotificationItem[] | null>(null);
  const ref = React.useRef<HTMLDivElement>(null);

  // Refresh on first load and whenever you move between pages.
  React.useEffect(() => {
    let live = true;
    getNotificationsAction().then(
      (r) => live && setItems(r),
      () => live && setItems([]),
    );
    return () => {
      live = false;
    };
  }, [pathname]);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const count = items?.length ?? 0;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={count ? `Notifications (${count})` : "Notifications"}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="relative grid h-9 w-9 place-items-center rounded-sm text-bs-muted hover:bg-bs-surface-2"
      >
        <Bell className="h-[18px] w-[18px]" />
        {count ? (
          <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-pill bg-bs-primary px-1 text-[10px] font-semibold leading-none text-bs-on-accent">
            {count > 9 ? "9+" : count}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 w-80 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-md border border-bs-border bg-bs-overlay shadow-elev-3"
        >
          <div className="border-b border-bs-border px-3 py-2 text-eyebrow uppercase text-bs-subtle">
            Needs you
          </div>
          {items === null ? (
            <p className="px-3 py-5 text-sm text-bs-subtle">Loading…</p>
          ) : count === 0 ? (
            <p className="px-3 py-5 text-sm text-bs-subtle">You&rsquo;re all caught up.</p>
          ) : (
            <ul className="max-h-96 overflow-y-auto p-1">
              {items.map((n) => (
                <li key={`${n.kind}-${n.id}`}>
                  <Link
                    href={n.href}
                    role="menuitem"
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-2.5 rounded-sm px-2.5 py-2 transition-colors hover:bg-bs-surface-2"
                  >
                    <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-pill", DOT[n.tone])} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-bs-text">{n.title}</span>
                      <span className="block truncate text-xs text-bs-subtle">
                        {KIND[n.kind]} · {n.meta}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/today"
            onClick={() => setOpen(false)}
            className="block border-t border-bs-border px-3 py-2 text-xs font-medium text-bs-primary hover:underline"
          >
            Open Today
          </Link>
        </div>
      ) : null}
    </div>
  );
}
