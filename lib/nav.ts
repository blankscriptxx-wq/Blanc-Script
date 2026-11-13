import {
  Camera,
  CalendarRange,
  Clapperboard,
  FolderKanban,
  LayoutDashboard,
  ChartColumn,
  MessageCircle,
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
  /** Heading this item sits under in the side menu. */
  group?: string;
};

/** Primary navigation — the 10 product systems (Foundation §5). */
export const NAV: NavItem[] = [
  // Day to day
  { href: "/today", label: "Today", icon: LayoutDashboard, ready: true },
  { href: "/clients", label: "Clients", icon: Users, ready: true },
  { href: "/inbox", label: "Inbox", icon: MessageCircle, ready: true },
  // The work, in the order it happens
  { href: "/projects", label: "Projects", icon: FolderKanban, ready: true, group: "Work" },
  { href: "/shoots", label: "Shoots", icon: Camera, ready: true, group: "Work" },
  { href: "/edits", label: "Edits", icon: Clapperboard, ready: true, group: "Work" },
  { href: "/content", label: "Content", icon: CalendarRange, ready: true, group: "Work" },
  // Running the studio
  { href: "/finance", label: "Finance", icon: Receipt, requires: "can_see_money", ready: true, group: "Studio" },
  { href: "/talent", label: "Talent", icon: Sparkles, ready: true, group: "Studio" },
  { href: "/team", label: "Team", icon: UsersRound, requires: "can_manage_users", ready: true, group: "Studio" },
  { href: "/insights", label: "Insights", icon: ChartColumn, ready: true, group: "Studio" },
];

export const SETTINGS_ITEM: NavItem = {
  href: "/settings",
  label: "Settings",
  icon: Settings,
  requires: "can_settings",
  ready: true,
};
