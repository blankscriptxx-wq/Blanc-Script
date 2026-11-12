import "server-only";
import { and, asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { clientMessages, clientThreads, clients } from "@/lib/db/schema";
import { requireUser } from "@/lib/data/clients";
import type { ChatMessage } from "@/lib/ai/claude";

export type ThreadRow = { id: string; title: string; updatedAt: Date };

async function assertClient(orgId: string, clientId: string) {
  const [c] = await getDb()
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.orgId, orgId)))
    .limit(1);
  if (!c) throw new Error("That client was not found in your workspace.");
}

export async function listThreads(clientId: string): Promise<ThreadRow[]> {
  const user = await requireUser();
  const rows = await getDb()
    .select({ id: clientThreads.id, title: clientThreads.title, updatedAt: clientThreads.updatedAt })
    .from(clientThreads)
    .where(and(eq(clientThreads.orgId, user.orgId), eq(clientThreads.clientId, clientId)))
    .orderBy(desc(clientThreads.updatedAt));
  return rows;
}

export async function createThread(clientId: string, title = "New conversation"): Promise<string> {
  const user = await requireUser();
  await assertClient(user.orgId, clientId);
  const [row] = await getDb()
    .insert(clientThreads)
    .values({ orgId: user.orgId, clientId, title: title.slice(0, 120) || "New conversation" })
    .returning({ id: clientThreads.id });
  return row.id;
}

/** Returns the thread's client id (org-scoped) or null. */
export async function getThreadClientId(threadId: string): Promise<string | null> {
  const user = await requireUser();
  const [row] = await getDb()
    .select({ clientId: clientThreads.clientId })
    .from(clientThreads)
    .where(and(eq(clientThreads.id, threadId), eq(clientThreads.orgId, user.orgId)))
    .limit(1);
  return row?.clientId ?? null;
}

export async function getThreadMessages(threadId: string): Promise<ChatMessage[]> {
  const user = await requireUser();
  const rows = await getDb()
    .select({ role: clientMessages.role, content: clientMessages.content })
    .from(clientMessages)
    .where(and(eq(clientMessages.orgId, user.orgId), eq(clientMessages.threadId, threadId)))
    .orderBy(asc(clientMessages.createdAt));
  return rows.map((r) => ({ role: r.role as "user" | "assistant", content: r.content }));
}

export async function addMessage(threadId: string, role: "user" | "assistant", content: string) {
  const user = await requireUser();
  await getDb()
    .insert(clientMessages)
    .values({ orgId: user.orgId, threadId, role, content });
  await getDb()
    .update(clientThreads)
    .set({ updatedAt: new Date() })
    .where(and(eq(clientThreads.id, threadId), eq(clientThreads.orgId, user.orgId)));
}
