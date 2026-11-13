"use client";

import * as React from "react";
import Link from "next/link";
import { signOutAction } from "@/app/(os)/auth/sign-out/actions";
import { searchWorkspaceAction, type SearchHit } from "@/app/(os)/(app)/search-actions";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  PanelLeft,
  Search,
  Sparkles,
  Camera,
  UserPlus,
  Receipt,
  SquarePen,
  CornerDownLeft,
  type LucideIcon,
  LogOut,
  Users,
  FolderKanban,
  Clapperboard,
  CalendarRange,
  UserRound,
  X,
} from "lucide-react";
import { motion } from "framer-motion";
import { NAV, SETTINGS_ITEM, type NavItem } from "@/lib/nav";
import { ThemeSwitcher } from "@/components/ds/theme-switcher";
import { AIPanel } from "@/components/shell/ai-panel";
import { NotificationsBell } from "@/components/shell/notifications-bell";
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
  const [aiOpen, setAiOpen] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const pathname = usePathname();
  // Going to another page closes the phone menu.
  React.useEffect(() => setMenuOpen(false), [pathname]);
  React.useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

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
    // On a phone the button opens the menu; on a wider screen it narrows the sidebar.
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
      setMenuOpen((v) => !v);
      return;
    }
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
          onOpenAI={() => setAiOpen(true)}
        />
        <main className="min-w-0 flex-1 px-4 py-6 md:px-6">{children}</main>
      </div>
      {menuOpen ? (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <motion.div
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-y-0 left-0 flex w-[280px] max-w-[85vw] shadow-elev-3"
          >
            <Sidebar
              items={nav}
              settingsItem={showSettings ? SETTINGS_ITEM : null}
              collapsed={false}
              user={user}
              mobile
              onClose={() => setMenuOpen(false)}
            />
          </motion.div>
        </div>
      ) : null}
      {paletteOpen ? (
        <CommandPalette
          items={[...nav, ...(showSettings ? [SETTINGS_ITEM] : [])]}
          onClose={() => setPaletteOpen(false)}
          onOpenAI={() => {
            setPaletteOpen(false);
            setAiOpen(true);
          }}
        />
      ) : null}
      <AIPanel open={aiOpen} onClose={() => setAiOpen(false)} />
    </div>
  );
}

function Sidebar({
  items,
  settingsItem,
  collapsed,
  user,
  mobile = false,
  onClose,
}: {
  items: NavItem[];
  settingsItem: NavItem | null;
  collapsed: boolean;
  user: ShellUser;
  /** The slide-out version used on phones. */
  mobile?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  return (
    <aside
      className={cn(
        "shrink-0 flex-col border-r border-bs-border bg-bs-surface",
        mobile ? "flex h-full w-full overflow-y-auto" : "hidden md:flex",
        mobile ? "" : collapsed ? "w-[60px]" : "w-[232px]",
      )}
    >
      <div className="flex h-14 shrink-0 items-center gap-2 px-4">
        <div className="grid h-7 w-7 place-items-center rounded-sm bg-bs-primary text-bs-on-accent">
          <span className="font-display text-sm font-bold">B</span>
        </div>
        {!collapsed ? (
          <span className="font-display text-h3 font-semibold">Blanc Script</span>
        ) : null}
        {mobile ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="ml-auto grid h-9 w-9 place-items-center rounded-sm text-bs-muted hover:bg-bs-surface-2"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        ) : null}
      </div>
      <nav className="flex-1 space-y-0.5 px-2 py-2">
        {items.map((item, i) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          const newGroup = item.group && item.group !== items[i - 1]?.group;
          return (
            <React.Fragment key={item.href}>
              {newGroup ? (
                collapsed ? (
                  <div className="mx-2 my-2 border-t border-bs-border" />
                ) : (
                  <div className="px-2.5 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-bs-subtle">
                    {item.group}
                  </div>
                )
              ) : null}
              <NavLink item={item} active={active} collapsed={collapsed}>
                <Icon className="h-[18px] w-[18px] shrink-0" />
                {!collapsed ? <span>{item.label}</span> : null}
              </NavLink>
            </React.Fragment>
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
      {mobile ? (
        <div className="flex items-center justify-between gap-3 border-t border-bs-border px-4 py-3">
          <span className="text-sm text-bs-muted">Theme</span>
          <ThemeSwitcher size="sm" />
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
        {!collapsed ? (
          <form action={signOutAction} className="ml-auto">
            <button
              type="submit"
              aria-label="Sign out"
              title="Sign out"
              className="grid h-8 w-8 place-items-center rounded-sm text-bs-muted transition-colors hover:bg-bs-surface-2 hover:text-bs-text"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
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
  onOpenAI,
}: {
  onToggleSidebar: () => void;
  onOpenPalette: () => void;
  onOpenAI: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-bs-border bg-bs-surface/90 px-3 backdrop-blur md:gap-3 md:px-4">
      <button
        onClick={onToggleSidebar}
        aria-label="Menu"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-sm text-bs-muted hover:bg-bs-surface-2"
      >
        <PanelLeft className="h-[18px] w-[18px]" />
      </button>
      <button
        onClick={onOpenPalette}
        className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-sm border border-bs-border-strong px-3 text-left text-sm text-bs-subtle hover:bg-bs-surface-2 md:max-w-md"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="truncate sm:hidden">Search…</span>
        <span className="hidden truncate sm:inline">Search or jump anywhere…</span>
        <kbd className="ml-auto hidden rounded-xs border border-bs-border px-1.5 py-0.5 font-mono text-[10px] text-bs-muted md:inline">
          ⌘K
        </kbd>
      </button>
      <div className="ml-auto flex shrink-0 items-center gap-1 md:gap-2">
        {/* On phones the theme switch lives in the menu, to keep this bar uncluttered. */}
        <span className="hidden md:block">
          <ThemeSwitcher size="sm" />
        </span>
        <NotificationsBell />
        <button
          onClick={onOpenAI}
          aria-label="Blanc Script AI"
          className="group grid h-9 w-9 place-items-center rounded-sm text-bs-primary transition-colors hover:bg-bs-primary-soft"
        >
          <Sparkles className="h-[18px] w-[18px] transition-transform group-hover:scale-110" />
        </button>
      </div>
    </header>
  );
}

const HIT_LABEL: Record<SearchHit["kind"], string> = {
  client: "Client",
  project: "Project",
  shoot: "Shoot",
  deliverable: "Edit",
  content: "Content",
  invoice: "Invoice",
  talent: "Talent",
};

const HIT_ICON: Record<SearchHit["kind"], LucideIcon> = {
  client: Users,
  project: FolderKanban,
  shoot: Camera,
  deliverable: Clapperboard,
  content: CalendarRange,
  invoice: Receipt,
  talent: UserRound,
};

type Command = {
  id: string;
  label: string;
  group: "Results" | "Navigate" | "Actions" | "Assistant";
  hint?: string;
  icon: LucideIcon;
  run: () => void;
};

function CommandPalette({
  items,
  onClose,
  onOpenAI,
}: {
  items: NavItem[];
  onClose: () => void;
  onOpenAI: () => void;
}) {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [active, setActive] = React.useState(0);
  const go = (href: string) => {
    onClose();
    router.push(href);
  };

  const commands: Command[] = React.useMemo(
    () => [
      ...items.map((i) => ({
        id: `nav:${i.href}`,
        label: i.label,
        group: "Navigate" as const,
        icon: i.icon,
        run: () => go(i.href),
      })),
      { id: "act:shoot", label: "Book a shoot", group: "Actions", icon: Camera, run: () => go("/shoots?new=1") },
      { id: "act:client", label: "Add a client", group: "Actions", icon: UserPlus, run: () => go("/clients?new=1") },
      { id: "act:task", label: "Add a task", group: "Actions", icon: SquarePen, run: () => go("/projects") },
      { id: "act:chase", label: "Draft a chase for overdue invoices", group: "Actions", icon: Receipt, run: () => go("/finance") },
      { id: "ai", label: "Ask Blanc Script AI", group: "Assistant", icon: Sparkles, run: () => onOpenAI() },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items],
  );

  // Record search (clients, projects, invoices…), debounced as you type.
  const [hits, setHits] = React.useState<SearchHit[]>([]);
  const [searching, setSearching] = React.useState(false);
  React.useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setHits([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(() => {
      searchWorkspaceAction(term)
        .then((r) => {
          if (!cancelled) setHits(r);
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 220);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q]);

  const results: Command[] = hits.map((h) => ({
    id: `hit:${h.kind}:${h.id}`,
    label: h.label,
    hint: HIT_LABEL[h.kind],
    group: "Results" as const,
    icon: HIT_ICON[h.kind],
    run: () => go(h.href),
  }));

  const filtered = [
    ...results,
    ...commands.filter((c) => c.label.toLowerCase().includes(q.toLowerCase())),
  ];
  React.useEffect(() => setActive(0), [q, hits.length]);

  const groups = ["Results", "Navigate", "Actions", "Assistant"] as const;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4 pt-[12vh] backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <motion.div
        initial={{ opacity: 0, y: -8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
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
              else if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, filtered.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter" && filtered[active]) {
                e.preventDefault();
                filtered[active].run();
              }
            }}
            placeholder="Search, jump, or run an action…"
            className="h-12 flex-1 bg-transparent text-body outline-none placeholder:text-bs-subtle"
          />
          <kbd className="hidden items-center gap-1 rounded-xs border border-bs-border px-1.5 py-0.5 font-mono text-[10px] text-bs-subtle sm:flex">
            <CornerDownLeft className="h-3 w-3" /> to run
          </kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-bs-subtle">
              {searching ? "Searching…" : `Nothing matches “${q}”.`}
            </div>
          ) : (
            groups.map((g) => {
              const inGroup = filtered.filter((c) => c.group === g);
              if (inGroup.length === 0) return null;
              return (
                <div key={g} className="mb-1">
                  <div className="px-2 py-1 text-eyebrow uppercase text-bs-subtle">{g}</div>
                  <ul>
                    {inGroup.map((c) => {
                      const idx = filtered.indexOf(c);
                      const isActive = idx === active;
                      const Icon = c.icon;
                      return (
                        <li key={c.id}>
                          <button
                            onMouseEnter={() => setActive(idx)}
                            onClick={() => c.run()}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-sm px-3 py-2 text-left text-body",
                              isActive ? "bg-bs-surface-2 text-bs-text" : "text-bs-muted",
                            )}
                          >
                            <Icon className={cn("h-[18px] w-[18px]", c.group === "Assistant" && "text-bs-primary")} />
                            <span className="min-w-0 flex-1 truncate">{c.label}</span>
                            {c.hint ? (
                              <span className="shrink-0 text-xs text-bs-subtle">{c.hint}</span>
                            ) : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    </div>
  );
}
