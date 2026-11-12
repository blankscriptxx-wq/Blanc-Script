import type { InternalRole } from "@/lib/auth/roles";

/**
 * The staff role templates, in plain words: who each one is for and what it
 * opens. The exact permissions come from ROLE_CAPABILITIES in roles.ts; this
 * is the description people see when inviting someone. Client-safe.
 */
export const ROLE_INFO: Record<InternalRole, { label: string; forWho: string; can: string[]; cannot: string[] }> = {
  owner: {
    label: "Owner",
    forWho: "Directors and partners. Full control of the studio.",
    can: ["Everything: clients, projects, shoots, edits and content", "Finance, invoices, pay and margins", "Team, roles, settings and the email log"],
    cannot: [],
  },
  ops: {
    label: "Operations",
    forWho: "Studio or operations manager who runs the day-to-day.",
    can: ["All client and production work", "Invoices, fees and talent pay", "Manage the team and settings", "Publish and deliver to clients"],
    cannot: ["See profit margins", "Approve pay runs", "Issue agreements"],
  },
  account_manager: {
    label: "Account manager",
    forWho: "Looks after client relationships and delivery.",
    can: ["Clients, projects, shoots, edits and content", "Send work to clients and publish", "Agreements and client documents"],
    cannot: ["Finance, invoices or pay", "Team, roles or settings"],
  },
  editor: {
    label: "Editor",
    forWho: "Edits and delivers the work.",
    can: ["Projects, shoots, edits and content", "Send cuts to clients for review"],
    cannot: ["Finance, invoices or pay", "Agreements", "Publishing, team or settings"],
  },
  filmer: {
    label: "Filmer",
    forWho: "Shoots on location and uploads footage.",
    can: ["See and update shoots, tasks and uploads"],
    cannot: ["Finance, invoices or pay", "Sending to clients or publishing", "Agreements, team or settings"],
  },
};
