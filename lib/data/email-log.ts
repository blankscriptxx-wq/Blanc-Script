import "server-only";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { emailOutbox } from "@/lib/db/schema";
import { requireUser } from "@/lib/data/clients";
import { sendEmail, type EmailResult } from "@/lib/email/send";

/**
 * The email log: every message the OS has sent or tried to send, read from
 * email_outbox. For owners and anyone who can change settings.
 */

export type EmailStatus = "sent" | "failed" | "not_configured" | "queued";
export type EmailLogRow = {
  id: string;
  toEmail: string;
  subject: string;
  kind: string;
  status: EmailStatus;
  error: string | null;
  createdAt: Date;
  sentAt: Date | null;
};

async function settingsUser() {
  const user = await requireUser();
  if (!user.capabilities.has("can_settings")) throw new Error("You do not have permission to view the email log.");
  return user;
}

export async function getEmailLog(filter: { status?: string; q?: string }): Promise<{
  rows: EmailLogRow[];
  counts: { sent: number; failed: number; notSent: number; total: number };
}> {
  const user = await settingsUser();
  const db = getDb();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const status = z.enum(["sent", "failed", "not_configured"]).safeParse(filter.status);
  const q = (filter.q ?? "").trim().toLowerCase().slice(0, 80);
  const [rows, [c]] = await Promise.all([
    db
      .select({
        id: emailOutbox.id,
        toEmail: emailOutbox.toEmail,
        subject: emailOutbox.subject,
        kind: emailOutbox.kind,
        status: emailOutbox.status,
        error: emailOutbox.error,
        createdAt: emailOutbox.createdAt,
        sentAt: emailOutbox.sentAt,
      })
      .from(emailOutbox)
      .where(
        and(
          eq(emailOutbox.orgId, user.orgId),
          status.success ? eq(emailOutbox.status, status.data) : undefined,
          q ? sql`(lower(${emailOutbox.toEmail}) like ${`%${q}%`} or lower(${emailOutbox.subject}) like ${`%${q}%`})` : undefined,
        ),
      )
      .orderBy(desc(emailOutbox.createdAt))
      .limit(200),
    db
      .select({
        sent: sql<number>`count(*) filter (where ${emailOutbox.status} = 'sent')::int`,
        failed: sql<number>`count(*) filter (where ${emailOutbox.status} = 'failed')::int`,
        notSent: sql<number>`count(*) filter (where ${emailOutbox.status} in ('not_configured', 'queued'))::int`,
        total: sql<number>`count(*)::int`,
      })
      .from(emailOutbox)
      .where(and(eq(emailOutbox.orgId, user.orgId), gte(emailOutbox.createdAt, since))),
  ]);
  return { rows: rows as EmailLogRow[], counts: c ?? { sent: 0, failed: 0, notSent: 0, total: 0 } };
}

/** The full text of one logged email. */
export async function getEmailBody(id: string): Promise<string | null> {
  const user = await settingsUser();
  const [row] = await getDb()
    .select({ body: emailOutbox.bodyText })
    .from(emailOutbox)
    .where(and(eq(emailOutbox.id, id), eq(emailOutbox.orgId, user.orgId)))
    .limit(1);
  return row?.body ?? null;
}

/**
 * Send a logged email again (for one that failed, or was written before email
 * was connected). The message is rebuilt from the stored text, in the same
 * branded design, and logged as a new entry.
 */
export async function resendEmail(id: string): Promise<EmailResult> {
  const user = await settingsUser();
  const [row] = await getDb()
    .select()
    .from(emailOutbox)
    .where(and(eq(emailOutbox.id, id), eq(emailOutbox.orgId, user.orgId)))
    .limit(1);
  if (!row) throw new Error("That email was not found.");
  // Stored as: heading, blank, paragraphs…, blank, "Label: url", blank, footer.
  const lines = row.bodyText.split("\n");
  const heading = lines[0] ?? row.subject;
  const footerAt = lines.lastIndexOf("Blanc Script · blancscript.com");
  const bodyLines = lines.slice(2, footerAt > 0 ? footerAt : undefined);
  while (bodyLines.length && !bodyLines[bodyLines.length - 1].trim()) bodyLines.pop();
  let button: { label: string; url: string } | undefined;
  const last = bodyLines[bodyLines.length - 1] ?? "";
  const m = /^(.{1,60}): (https?:\/\/\S+)$/.exec(last);
  if (m && bodyLines[bodyLines.length - 2]?.trim() === "") {
    button = { label: m[1], url: m[2] };
    bodyLines.splice(-2);
  }
  // Paragraphs were joined with single newlines; keep indented list lines with their paragraph.
  const paragraphs: string[] = [];
  for (const line of bodyLines) {
    if (/^\s{2,}\S/.test(line) && paragraphs.length) paragraphs[paragraphs.length - 1] += `\n${line}`;
    else paragraphs.push(line);
  }
  return sendEmail({
    orgId: user.orgId,
    to: row.toEmail,
    subject: row.subject,
    heading,
    paragraphs: paragraphs.filter((p) => p.trim()),
    button,
    kind: row.kind,
    related: row.relatedType && row.relatedId ? { type: row.relatedType, id: row.relatedId } : undefined,
  });
}
