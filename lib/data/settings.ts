import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { activityLog, organisations } from "@/lib/db/schema";
import { requireUser } from "@/lib/data/clients";

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  vatNumber: string | null;
  addressText: string | null;
  billingEmail: string | null;
  defaultCurrency: string;
};

const workspaceColumns = {
  id: organisations.id,
  name: organisations.name,
  slug: organisations.slug,
  logoUrl: organisations.logoUrl,
  vatNumber: organisations.vatNumber,
  addressText: organisations.addressText,
  billingEmail: organisations.billingEmail,
  defaultCurrency: organisations.defaultCurrency,
} as const;

export async function getWorkspace(): Promise<Workspace | null> {
  const user = await requireUser();
  const db = getDb();
  const [row] = await db
    .select(workspaceColumns)
    .from(organisations)
    .where(eq(organisations.id, user.orgId))
    .limit(1);
  return (row as Workspace) ?? null;
}

const workspaceNameInput = z.object({
  name: z.string().trim().min(2, "Name is too short").max(80, "Name is too long"),
});

/** Rename the workspace. Gated: caller must hold `can_settings`. */
export async function updateWorkspaceName(raw: unknown): Promise<Workspace> {
  const user = await requireUser();
  if (!user.capabilities.has("can_settings")) {
    throw new Error("You do not have permission to change workspace settings.");
  }
  const { name } = workspaceNameInput.parse(raw);
  const db = getDb();
  const [row] = await db
    .update(organisations)
    .set({ name, updatedAt: new Date() })
    .where(eq(organisations.id, user.orgId))
    .returning(workspaceColumns);
  await db.insert(activityLog).values({
    orgId: user.orgId,
    actorUserId: user.id,
    action: "workspace.renamed",
    entityType: "organisation",
    entityId: user.orgId,
    meta: { name },
  });
  return row as Workspace;
}

/** Supported invoicing currencies. GBP is the default across the OS. */
export const WORKSPACE_CURRENCIES = ["GBP", "USD", "EUR"] as const;

/** "" → null; trims. Keeps optional text columns tidy. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, "Too long")
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

const workspaceDetailsInput = z.object({
  name: z.string().trim().min(2, "Name is too short").max(80, "Name is too long").optional(),
  logoUrl: z
    .string()
    .trim()
    .max(500, "Too long")
    .refine((v) => v === "" || /^https?:\/\//i.test(v), "Enter a valid URL")
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  vatNumber: optionalText(40),
  addressText: optionalText(500),
  billingEmail: z
    .string()
    .trim()
    .max(160, "Too long")
    .refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Enter a valid email")
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  defaultCurrency: z.enum(WORKSPACE_CURRENCIES).optional(),
});
export type WorkspaceDetailsInput = z.input<typeof workspaceDetailsInput>;

/**
 * Update workspace branding & billing details (feeds invoice branding).
 * Gated: caller must hold `can_settings`. Only provided fields change.
 */
export async function updateWorkspaceDetails(raw: unknown): Promise<Workspace> {
  const user = await requireUser();
  if (!user.capabilities.has("can_settings")) {
    throw new Error("You do not have permission to change workspace settings.");
  }
  const data = workspaceDetailsInput.parse(raw);

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (data.name !== undefined) patch.name = data.name;
  if (data.logoUrl !== undefined) patch.logoUrl = data.logoUrl;
  if (data.vatNumber !== undefined) patch.vatNumber = data.vatNumber;
  if (data.addressText !== undefined) patch.addressText = data.addressText;
  if (data.billingEmail !== undefined) patch.billingEmail = data.billingEmail;
  if (data.defaultCurrency !== undefined) patch.defaultCurrency = data.defaultCurrency;

  const db = getDb();
  const [row] = await db
    .update(organisations)
    .set(patch)
    .where(eq(organisations.id, user.orgId))
    .returning(workspaceColumns);
  if (!row) throw new Error("Workspace not found.");
  await db.insert(activityLog).values({
    orgId: user.orgId,
    actorUserId: user.id,
    action: "workspace.updated",
    entityType: "organisation",
    entityId: user.orgId,
    meta: { fields: Object.keys(patch).filter((k) => k !== "updatedAt") },
  });
  return row as Workspace;
}
