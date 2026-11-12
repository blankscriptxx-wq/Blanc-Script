import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { clientContacts, organisations, waConversations, waMessages } from "@/lib/db/schema";
import { normalisePhone } from "@/lib/whatsapp/aniro";

/**
 * Inbound WhatsApp events from Aniro. There is no signed-in user here — the
 * webhook is authenticated by signature, and the workspace is resolved from
 * ANIRO_ORG_ID (or the only workspace, when there is just one).
 */

export async function resolveInboundOrg(): Promise<string | null> {
  const configured = process.env.ANIRO_ORG_ID?.trim();
  if (configured) return configured;
  const rows = await getDb().select({ id: organisations.id }).from(organisations).limit(2);
  return rows.length === 1 ? rows[0].id : null;
}

const digits = (col: unknown) => sql`regexp_replace(coalesce(${col}, ''), '[^0-9]', '', 'g')`;

export async function recordInboundMessage(
  orgId: string,
  input: { externalId: string; from: string; fromName?: string | null; text: string; at?: string | null; chatId?: string | null },
): Promise<"stored" | "duplicate" | "ignored"> {
  const phone = normalisePhone(input.from);
  const text = input.text?.trim();
  if (!phone || !text || !input.externalId) return "ignored";
  const db = getDb();

  const [dupe] = await db
    .select({ id: waMessages.id })
    .from(waMessages)
    .where(and(eq(waMessages.orgId, orgId), eq(waMessages.externalId, input.externalId)))
    .limit(1);
  if (dupe) return "duplicate";

  // Match on the last 10 digits so "07700 900412" and "+44 7700 900412" agree.
  const tail = phone.slice(-10);
  let [convo] = await db
    .select({ id: waConversations.id })
    .from(waConversations)
    .where(and(eq(waConversations.orgId, orgId), sql`right(${digits(waConversations.contactPhone)}, 10) = ${tail}`))
    .orderBy(sql`${waConversations.lastMessageAt} desc nulls last`)
    .limit(1);

  const sentAt = input.at && !Number.isNaN(Date.parse(input.at)) ? new Date(input.at) : new Date();

  if (!convo) {
    const [contact] = await db
      .select({ clientId: clientContacts.clientId, name: clientContacts.name })
      .from(clientContacts)
      .where(and(eq(clientContacts.orgId, orgId), sql`right(${digits(clientContacts.phone)}, 10) = ${tail}`))
      .limit(1);
    [convo] = await db
      .insert(waConversations)
      .values({
        orgId,
        clientId: contact?.clientId ?? null,
        contactName: contact?.name ?? input.fromName?.trim() ?? `+${phone}`,
        contactPhone: `+${phone}`,
        externalId: input.chatId ?? null,
        lastMessageAt: sentAt,
      })
      .returning({ id: waConversations.id });
  }

  await db.insert(waMessages).values({
    orgId,
    conversationId: convo.id,
    direction: "inbound",
    body: text.slice(0, 8000),
    externalId: input.externalId,
    deliveryStatus: "received",
    sentAt,
  });
  // A reply reopens a snoozed or closed conversation.
  await db
    .update(waConversations)
    .set({ lastMessageAt: sentAt, status: "open" })
    .where(eq(waConversations.id, convo.id));
  return "stored";
}

const STATUSES = new Set(["queued", "sent", "delivered", "read", "failed"]);

/** Delivery receipts for messages the OS sent. Matched by our id or Aniro's. */
export async function recordDeliveryStatus(
  orgId: string,
  input: { externalId?: string | null; reference?: string | null; status: string; error?: string | null },
): Promise<boolean> {
  if (!STATUSES.has(input.status)) return false;
  const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
  const match =
    input.reference && isUuid(input.reference)
      ? eq(waMessages.id, input.reference)
      : input.externalId
        ? eq(waMessages.externalId, input.externalId)
        : null;
  if (!match) return false;
  // Receipts only move forward: a late "delivered" never overwrites "read".
  const earlier = { queued: ["stored", "queued"], sent: ["stored", "queued"], delivered: ["stored", "queued", "sent"] }[
    input.status as "queued" | "sent" | "delivered"
  ];
  const rows = await getDb()
    .update(waMessages)
    .set({
      deliveryStatus: input.status,
      deliveryError: input.status === "failed" ? (input.error ?? "Delivery failed").slice(0, 500) : null,
      ...(input.externalId ? { externalId: input.externalId } : {}),
    })
    .where(
      and(
        eq(waMessages.orgId, orgId),
        eq(waMessages.direction, "outbound"),
        match,
        earlier ? inArray(waMessages.deliveryStatus, earlier) : undefined,
      ),
    )
    .returning({ id: waMessages.id });
  return rows.length > 0;
}
