"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, PanelLeft, Search, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { NAV, SETTINGS_ITEM, type NavItem } from "@/lib/nav";
import { ThemeSwitcher } from "@/components/ds/theme-switcher";
import { cn } from "@/lib/cn";

export type ShellUser = {
  name: string;
  orgName: string;
  role: string;
  placeholder: boolean;
};

export function AppShell({
  user,
  allowedHrefs,
  children,
}: {
  user: ShellUser;
  allowedHrefs: string[];
  children: React.ReactNode;
}) {
  const allowed = new Set(allowedHrefs);
  const nav = NAV.filter((i) => allowed.has(i.href));
  const showSettings = allowed.has(SETTINGS_ITEM.href);
  const [collapsed, setCollapsed] = React.useState(false);
  const [paletteOpen, setPaletteOpen] = React.useState(false);

  React.useEffect(() => {
    try {
      const t = localStorage.getItem("bs-theme");
      if (t) document.documentElement.setAttribute("data-theme", t);
      const c = localStorage.getItem("bs-sidebar-collapsed");
      if (c === "1") setCollapsed(true);
    } catch {}
  }, []);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((v) => {
      const next = !v;
      try {
        localStorage.setItem("bs-sidebar-collapsed", next ? "1" : "0");
      } catch {}
      return next;
    });
  };

  return (
    <div className="flex min-h-dvh bg-bs-canvas text-bs-text">
      <Sidebar
        items={nav}
        settingsItem={showSettings ? SETTINGS_ITEM : null}
        collapsed={collapsed}
        user={user}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          onToggleSidebar={toggleCollapsed}
          onOpenPalette={() => setPaletteOpen(true)}
        />
        <main className="flex-1 px-4 py-6 md:px-6">{children}</main>
      </div>
      {paletteOpen ? (
        <CommandPalette
          items={[...nav, ...(showSettings ? [SETTINGS_ITEM] : [])]}
          onClose={() => setPaletteOpen(false)}
        />
      ) : null}
    </div>
  );
}

function Sidebar({
  items,
  settingsItem,
  collapsed,
  user,
}: {
  items: NavItem[];
  settingsItem: NavItem | null;
  collapsed: boolean;
  user: ShellUser;
}) {
  const pathname = usePathname();
  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col border-r border-bs-border bg-bs-surface md:flex",
        collapsed ? "w-[60px]" : "w-[232px]",
      )}
    >
      <div className="flex h-14 items-center gap-2 px-4">
        <div className="grid h-7 w-7 place-items-center rounded-sm bg-bs-primary text-bs-on-accent">
          <span className="font-display text-sm font-bold">B</span>
        </div>
        {!collapsed ? (
          <span className="font-display text-h3 font-semibold">Blanc Script</span>
        ) : null}
      </div>
      <nav className="flex-1 space-y-0.5 px-2 py-2">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <NavLink key={item.href} item={item} active={active} collapsed={collapsed}>
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {!collapsed ? <span>{item.label}</span> : null}
            </NavLink>
          );
        })}
      </nav>
      {settingsItem ? (
        <div className="border-t border-bs-border px-2 py-2">
          <NavLink
            item={settingsItem}
            active={pathname.startsWith(settingsItem.href)}
            collapsed={collapsed}
          >
            <settingsItem.icon className="h-[18px] w-[18px] shrink-0" />
            {!collapsed ? <span>{settingsItem.label}</span> : null}
          </NavLink>
        </div>
      ) : null}
      <div className="flex items-center gap-2 border-t border-bs-border px-3 py-3">
        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-pill bg-bs-accent-soft text-xs font-semibold text-bs-accent">
          {user.name.slice(0, 1)}
        </div>
        {!collapsed ? (
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{user.name}</div>
            <div className="truncate text-xs text-bs-subtle">{user.orgName}</div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function NavLink({
  item,
  active,
  collapsed,
  children,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex items-center gap-3 rounded-sm px-2.5 py-2 text-body transition-colors",
        collapsed && "justify-center",
        active
          ? "font-medium text-bs-accent"
          : "text-bs-muted hover:bg-bs-surface-2 hover:text-bs-text",
      )}
    >
      {active ? (
        <motion.span
          layoutId="nav-active"
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
          className="absolute inset-0 -z-10 rounded-sm bg-bs-accent-soft"
        >
          <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-pill bg-bs-accent" />
        </motion.span>
      ) : null}
      {children}
      {!collapsed && item.ready === undefined ? (
        <span className="ml-auto text-[10px] uppercase tracking-wide text-bs-subtle">
          soon
        </span>
      ) : null}
    </Link>
  );
}

function Topbar({
  onToggleSidebar,
  onOpenPalette,
}: {
  onToggleSidebar: () => void;
  onOpenPalette: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-bs-border bg-bs-surface/90 px-3 backdrop-blur md:px-4">
      <button
        onClick={onToggleSidebar}
        aria-label="Toggle sidebar"
        className="grid h-9 w-9 place-items-center rounded-sm text-bs-muted hover:bg-bs-surface-2"
      >
        <PanelLeft className="h-[18px] w-[18px]" />
      </button>
      <button
        onClick={onOpenPalette}
        className="flex h-9 flex-1 items-center gap-2 rounded-sm border border-bs-border-strong px-3 text-sm text-bs-subtle hover:bg-bs-surface-2 md:max-w-md"
      >
        <Search className="h-4 w-4" />
        <span>Search or jump anywhere…</span>
        <kbd className="ml-auto hidden rounded-xs border border-bs-border px-1.5 py-0.5 font-mono text-[10px] text-bs-muted md:inline">
          ⌘K
        </kbd>
      </button>
      <div className="ml-auto flex items-center gap-2">
        <ThemeSwitcher size="sm" />
        <button
          aria-label="Notifications"
          className="grid h-9 w-9 place-items-center rounded-sm text-bs-muted hover:bg-bs-surface-2"
        >
          <Bell className="h-[18px] w-[18px]" />
        </button>
        <button
          aria-label="Blanc Script AI"
          className="grid h-9 w-9 place-items-center rounded-sm text-bs-muted hover:bg-bs-surface-2"
        >
          <Sparkles className="h-[18px] w-[18px]" />
        </button>
      </div>
    </header>
  );
}

function CommandPalette({
  items,
  onClose,
}: {
  items: NavItem[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const filtered = items.filter((i) =>
    i.label.toLowerCase().includes(q.toLowerCase()),
  );
  const go = (href: string) => {
    onClose();
    router.push(href);
  };
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4 pt-[12vh]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-lg border border-bs-border bg-bs-overlay shadow-elev-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-bs-border px-3">
          <Search className="h-4 w-4 text-bs-subtle" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "Enter" && filtered[0]) go(filtered[0].href);
            }}
            placeholder="Search or jump anywhere…"
            className="h-12 flex-1 bg-transparent text-body outline-none placeholder:text-bs-subtle"
          />
        </div>
        <ul className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-bs-subtle">
              Nothing matches “{q}”.
            </li>
          ) : (
            filtered.map((i) => {
              const Icon = i.icon;
              return (
                <li key={i.href}>
                  <button
                    onClick={() => go(i.href)}
                    className="flex w-full items-center gap-3 rounded-sm px-3 py-2 text-left text-body hover:bg-bs-surface-2"
                  >
                    <Icon className="h-[18px] w-[18px] text-bs-muted" />
                    <span>{i.label}</span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}
