import {
  Camera,
  CalendarRange,
  Clapperboard,
  FolderKanban,
  LayoutDashboard,
  Receipt,
  Settings,
  Sparkles,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import type { Capability } from "@/lib/auth/roles";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Hidden unless the user holds this capability. */
  requires?: Capability;
  /** Whether the feature screen exists yet (M1 = Today only). */
  ready?: boolean;
};

/** Primary navigation — the 10 product systems (Foundation §5). */
export const NAV: NavItem[] = [
  { href: "/today", label: "Today", icon: LayoutDashboard, ready: true },
  { href: "/clients", label: "Clients", icon: Users, ready: true },
  { href: "/projects", label: "Projects", icon: FolderKanban, ready: true },
  { href: "/shoots", label: "Shoots", icon: Camera, ready: true },
  { href: "/edits", label: "Edits", icon: Clapperboard },
  { href: "/content", label: "Content", icon: CalendarRange },
  { href: "/finance", label: "Finance", icon: Receipt, requires: "can_see_money" },
  { href: "/team", label: "Team", icon: UsersRound, requires: "can_manage_users", ready: true },
  { href: "/talent", label: "Talent", icon: Sparkles },
];

export const SETTINGS_ITEM: NavItem = {
  href: "/settings",
  label: "Settings",
  icon: Settings,
  requires: "can_settings",
};
