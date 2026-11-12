import "server-only";
import nodemailer from "nodemailer";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { emailOutbox } from "@/lib/db/schema";

/**
 * Outgoing email, sent through Blanc Script's own mailbox over SMTP — no
 * third-party sending service. Configure with:
 *
 *   SMTP_HOST   e.g. smtpout.secureserver.net  (123 Reg / GoDaddy mailboxes)
 *   SMTP_PORT   465 (SSL) or 587 (STARTTLS)
 *   SMTP_USER   the mailbox address, e.g. no-reply@blancscript.com
 *   SMTP_PASS   that mailbox's password
 *   EMAIL_FROM  optional display, e.g. "Blanc Script <no-reply@blancscript.com>"
 *
 * Every email is written to email_outbox first, so there is a record of what
 * was (or would have been) sent even before a mailbox is connected.
 */

export function emailConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST?.trim() && process.env.SMTP_USER?.trim() && process.env.SMTP_PASS?.trim(),
  );
}

export function emailFrom(): string {
  const user = process.env.SMTP_USER?.trim() ?? "";
  return process.env.EMAIL_FROM?.trim() || (user ? `Blanc Script <${user}>` : "Blanc Script");
}

function transport() {
  const port = Number(process.env.SMTP_PORT?.trim() || 465);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST!.trim(),
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER!.trim(), pass: process.env.SMTP_PASS!.trim() },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Brand wrapper: plain paragraphs, one optional button. */
function renderHtml(input: { heading: string; paragraphs: string[]; button?: { label: string; url: string } }): string {
  const paras = input.paragraphs
    .map((p) => `<p style="margin:0 0 14px;line-height:1.6;color:#343D3A;font-size:15px">${esc(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
  const button = input.button
    ? `<p style="margin:22px 0 8px"><a href="${esc(input.button.url)}" style="display:inline-block;background:#E8375B;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 20px;border-radius:8px">${esc(input.button.label)}</a></p><p style="margin:0 0 14px;font-size:12px;color:#6b7370;word-break:break-all">${esc(input.button.url)}</p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#F1E7DE;font-family:Inter,Arial,Helvetica,sans-serif"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 16px"><table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:14px"><tr><td style="padding:26px 28px 6px"><div style="font-weight:800;font-size:18px;letter-spacing:-.3px;text-transform:uppercase;color:#343D3A">Blanc<span style="color:#E8375B">Script</span><span style="color:#40B6BA">.</span></div></td></tr><tr><td style="padding:14px 28px 26px"><h1 style="margin:0 0 14px;font-size:20px;line-height:1.3;color:#22292A">${esc(input.heading)}</h1>${paras}${button}</td></tr></table><p style="margin:14px 0 0;font-size:12px;color:#6b7370">Sent by Blanc Script · blancscript.com</p></td></tr></table></body></html>`;
}

export type EmailInput = {
  orgId: string;
  to: string;
  subject: string;
  heading: string;
  paragraphs: string[];
  button?: { label: string; url: string };
  kind: string;
  related?: { type: string; id: string };
};

export type EmailResult = { status: "sent" | "failed" | "not_configured"; error?: string };

/** Send (or record, if no mailbox is connected yet) one email. Never throws. */
export async function sendEmail(input: EmailInput): Promise<EmailResult> {
  const to = input.to.trim();
  const text = [
    input.heading,
    "",
    ...input.paragraphs,
    ...(input.button ? ["", `${input.button.label}: ${input.button.url}`] : []),
    "",
    "Blanc Script · blancscript.com",
  ].join("\n");

  let outboxId: string | null = null;
  try {
    const [row] = await getDb()
      .insert(emailOutbox)
      .values({
        orgId: input.orgId,
        toEmail: to,
        subject: input.subject,
        bodyText: text,
        kind: input.kind,
        status: emailConfigured() ? "queued" : "not_configured",
        relatedType: input.related?.type ?? null,
        relatedId: input.related?.id ?? null,
      })
      .returning({ id: emailOutbox.id });
    outboxId = row.id;
  } catch {
    // The log is best-effort; still try to send.
  }

  if (!emailConfigured()) return { status: "not_configured" };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
    if (outboxId) await mark(outboxId, "failed", "Invalid email address");
    return { status: "failed", error: "Invalid email address" };
  }

  try {
    await transport().sendMail({
      from: emailFrom(),
      to,
      subject: input.subject,
      text,
      html: renderHtml(input),
    });
    if (outboxId) await mark(outboxId, "sent");
    return { status: "sent" };
  } catch (e) {
    const error = e instanceof Error ? e.message.slice(0, 400) : "Send failed";
    if (outboxId) await mark(outboxId, "failed", error);
    return { status: "failed", error };
  }
}

async function mark(id: string, status: "sent" | "failed", error?: string) {
  await getDb()
    .update(emailOutbox)
    .set({ status, error: error ?? null, sentAt: status === "sent" ? new Date() : null })
    .where(eq(emailOutbox.id, id))
    .catch(() => {});
}

/** Where links in emails point (the OS's public address). */
export function appOrigin(): string {
  return (process.env.APP_ORIGIN?.trim() || "https://studio.blancscript.com").replace(/\/$/, "");
}
