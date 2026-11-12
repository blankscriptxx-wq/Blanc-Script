"use client";

import * as React from "react";
import Link from "next/link";
import {
  CalendarRange,
  Camera,
  Clapperboard,
  FolderKanban,
  Plus,
  Receipt,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ds/button";

type Item = { label: string; href: string; icon: LucideIcon; money?: boolean };

const ITEMS: Item[] = [
  { label: "Client", href: "/clients?new=1", icon: Users },
  { label: "Project", href: "/projects?new=1", icon: FolderKanban },
  { label: "Shoot", href: "/shoots?new=1", icon: Camera },
  { label: "Deliverable", href: "/edits?new=1", icon: Clapperboard },
  { label: "Content item", href: "/content?new=1", icon: CalendarRange },
  { label: "Invoice", href: "/finance?new=1", icon: Receipt, money: true },
  { label: "Talent", href: "/talent?new=1", icon: Sparkles },
];

/** "+ New" on Today: a small menu that jumps straight into each create form. */
export function NewMenu({ canSeeMoney }: { canSeeMoney: boolean }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const items = ITEMS.filter((i) => !i.money || canSeeMoney);

  return (
    <div ref={ref} className="relative">
      <Button aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Plus className="h-4 w-4" /> New
      </Button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 w-48 overflow-hidden rounded-md border border-bs-border bg-bs-overlay p-1 shadow-elev-3"
        >
          {items.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm text-bs-text transition-colors hover:bg-bs-surface-2"
            >
              <i.icon className="h-4 w-4 text-bs-muted" />
              {i.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
