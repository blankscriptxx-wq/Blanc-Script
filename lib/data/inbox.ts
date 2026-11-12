import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { clients, waConversations, waMessages, activityLog } from "@/lib/db/schema";
import { requireUser } from "@/lib/data/clients";
import { aniroConfigured, normalisePhone, sendWhatsApp } from "@/lib/whatsapp/aniro";

/**
 * Inbox data access (WhatsApp-style). EVERY query is scoped to the caller's
 * org_id — tenancy is enforced here (application layer) and, as defence in
 * depth, by Neon RLS.
 *
 * Live WhatsApp runs through Aniro (lib/whatsapp/aniro.ts). When Aniro is
 * connected, `sendMessage` stores the message and sends it; until then it is
 * stored only. Inbound messages arrive via /api/aniro/whatsapp.
 */

export type WaStatus = "open" | "snoozed" | "closed";
export type WaDirection = "inbound" | "outbound";

export type ConversationRow = {
  id: string;
  contactName: string | null;
  contactPhone: string | null;
  clientId: string | null;
  clientName: string | null;
  status: WaStatus;
  lastMessageAt: Date | null;
  createdAt: Date;
};

export type MessageRow = {
  id: string;
  conversationId: string;
  direction: WaDirection;
  body: string;
  authorUserId: string | null;
  authorName: string | null;
  /** stored | queued | sent | delivered | read | failed | received */
  deliveryStatus: string | null;
  deliveryError: string | null;
  sentAt: Date;
};

/** All conversations, newest activity first (null last-message dates sink). */
export async function listConversations(): Promise<ConversationRow[]> {
  const user = await requireUser();
  const rows = await getDb()
    .select({
      id: waConversations.id,
      contactName: waConversations.contactName,
      contactPhone: waConversations.contactPhone,
      clientId: waConversations.clientId,
      clientName: clients.name,
      status: waConversations.status,
      lastMessageAt: waConversations.lastMessageAt,
      createdAt: waConversations.createdAt,
    })
    .from(waConversations)
    .leftJoin(clients, eq(waConversations.clientId, clients.id))
    .where(eq(waConversations.orgId, user.orgId))
    .orderBy(
      sql`${waConversations.lastMessageAt} desc nulls last`,
      sql`${waConversations.createdAt} desc`,
    );
  return rows as ConversationRow[];
}

/** A single conversation (org-scoped), or null. */
export async function getConversation(id: string): Promise<ConversationRow | null> {
  const user = await requireUser();
  const [row] = await getDb()
    .select({
      id: waConversations.id,
      contactName: waConversations.contactName,
      contactPhone: waConversations.contactPhone,
      clientId: waConversations.clientId,
      clientName: clients.name,
      status: waConversations.status,
      lastMessageAt: waConversations.lastMessageAt,
      createdAt: waConversations.createdAt,
    })
    .from(waConversations)
    .leftJoin(clients, eq(waConversations.clientId, clients.id))
    .where(and(eq(waConversations.id, id), eq(waConversations.orgId, user.orgId)))
    .limit(1);
  return (row as ConversationRow) ?? null;
}

/** The transcript for a conversation, oldest first. Author names resolved from
 * Neon Auth (a different schema) via raw SQL, like the team directory does. */
export async function listMessages(conversationId: string): Promise<MessageRow[]> {
  const user = await requireUser();
  const { rows } = await getDb().execute(sql`
    select
      msg.id,
      msg.conversation_id as "conversationId",
      msg.direction,
      msg.body,
      msg.author_user_id as "authorUserId",
      u.name as "authorName",
      msg.delivery_status as "deliveryStatus",
      msg.delivery_error as "deliveryError",
      msg.sent_at as "sentAt"
    from wa_messages msg
    left join neon_auth."user" u on u.id = msg.author_user_id
    where msg.org_id = ${user.orgId}
      and msg.conversation_id = ${conversationId}
    order by msg.sent_at asc
  `);
  return rows as MessageRow[];
}

export const conversationInput = z.object({
  contactName: z.string().trim().min(1, "A contact name is required").max(160),
  contactPhone: z.string().trim().max(40).optional().or(z.literal("")),
  clientId: z.string().uuid().nullable().optional(),
});
export type ConversationInput = z.infer<typeof conversationInput>;

/** Open a new conversation. */
export async function createConversation(input: ConversationInput) {
  const user = await requireUser();
  const data = conversationInput.parse(input);

  // If a client was named, it must belong to this org (defence in depth).
  let clientId: string | null = data.clientId ?? null;
  if (clientId) {
    const [owned] = await getDb()
      .select({ id: clients.id })
      .from(clients)
      .where(and(eq(clients.id, clientId), eq(clients.orgId, user.orgId)))
      .limit(1);
    if (!owned) clientId = null;
  }

  const [row] = await getDb()
    .insert(waConversations)
    .values({
      orgId: user.orgId,
      contactName: data.contactName,
      contactPhone: data.contactPhone ? data.contactPhone : null,
      clientId,
      status: "open",
    })
    .returning({ id: waConversations.id });

  await getDb().insert(activityLog).values({
    orgId: user.orgId,
    actorUserId: user.id,
    action: "wa_conversation.created",
    entityType: "wa_conversation",
    entityId: row.id,
    meta: { contactName: data.contactName },
  });

  return row;
}

export const sendMessageInput = z.object({
  conversationId: z.string().uuid(),
  body: z.string().trim().min(1, "Message can't be empty").max(4000),
});

/**
 * Store an OUTBOUND message and, when Aniro is connected, send it to WhatsApp.
 * The message is always saved first; a failed send is recorded on the message
 * (delivery_status = failed) rather than thrown, so nothing typed is lost.
 */
export async function sendMessage(conversationId: string, body: string) {
  const user = await requireUser();
  const data = sendMessageInput.parse({ conversationId, body });

  // The conversation must belong to the caller's org.
  const [convo] = await getDb()
    .select({ id: waConversations.id, contactPhone: waConversations.contactPhone })
    .from(waConversations)
    .where(
      and(eq(waConversations.id, data.conversationId), eq(waConversations.orgId, user.orgId)),
    )
    .limit(1);
  if (!convo) throw new Error("Conversation not found.");

  const live = aniroConfigured();
  const to = normalisePhone(convo.contactPhone);
  const now = new Date();
  const [row] = await getDb()
    .insert(waMessages)
    .values({
      orgId: user.orgId,
      conversationId: data.conversationId,
      direction: "outbound",
      body: data.body,
      authorUserId: user.id,
      deliveryStatus: live ? "queued" : "stored",
      sentAt: now,
    })
    .returning({ id: waMessages.id });

  await getDb()
    .update(waConversations)
    .set({ lastMessageAt: now })
    .where(
      and(eq(waConversations.id, data.conversationId), eq(waConversations.orgId, user.orgId)),
    );

  if (live) {
    const result = to
      ? await sendWhatsApp({ to, text: data.body, reference: row.id })
      : ({ ok: false, error: "This contact has no valid phone number." } as const);
    await getDb()
      .update(waMessages)
      .set(
        result.ok
          ? { deliveryStatus: result.status, externalId: result.externalId }
          : {
              deliveryStatus: "failed",
              deliveryError: result.error.slice(0, 500),
              ...("externalId" in result && result.externalId ? { externalId: result.externalId } : {}),
            },
      )
      .where(eq(waMessages.id, row.id));
  }

  return row;
}

export const statusInput = z.object({
  id: z.string().uuid(),
  status: z.enum(["open", "snoozed", "closed"]),
});

/** Move a conversation between open / snoozed / closed. */
export async function setConversationStatus(id: string, status: WaStatus) {
  const user = await requireUser();
  const data = statusInput.parse({ id, status });

  const updated = await getDb()
    .update(waConversations)
    .set({ status: data.status })
    .where(and(eq(waConversations.id, data.id), eq(waConversations.orgId, user.orgId)))
    .returning({ id: waConversations.id });
  if (updated.length === 0) throw new Error("Conversation not found.");

  await getDb().insert(activityLog).values({
    orgId: user.orgId,
    actorUserId: user.id,
    action: "wa_conversation.status_changed",
    entityType: "wa_conversation",
    entityId: data.id,
    meta: { status: data.status },
  });

  return updated[0];
}

/** Clients for the new-conversation picker (id + name), org-scoped. */
export async function listClientOptions() {
  const user = await requireUser();
  return getDb()
    .select({ id: clients.id, name: clients.name })
    .from(clients)
    .where(eq(clients.orgId, user.orgId))
    .orderBy(asc(clients.name));
}
