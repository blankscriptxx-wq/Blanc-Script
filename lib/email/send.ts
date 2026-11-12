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

/**
 * Blanc Script's email design: cream page, the logo and teal brush stroke,
 * ink text, a red button and a dark footer. Table-based with inline styles so
 * it holds up in Outlook, Gmail and Apple Mail; images come from the studio
 * site and the layout still reads well if a mail app blocks them.
 */
function renderHtml(input: { heading: string; paragraphs: string[]; button?: { label: string; url: string } }): string {
  const site = (process.env.APP_ORIGIN?.trim() || "https://studio.blancscript.com").replace(/\/$/, "");
  const font = "'Poppins','Helvetica Neue',Helvetica,Arial,sans-serif";
  const paras = input.paragraphs
    .map((p) => `<p style="margin:0 0 16px;line-height:1.65;color:#3A3B45;font-size:15px;font-family:${font}">${esc(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
  const button = input.button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0 10px"><tr><td style="border-radius:40px;background:#EE3A5F"><a href="${esc(input.button.url)}" style="display:inline-block;padding:14px 30px;font-family:${font};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:40px">${esc(input.button.label)}</a></td></tr></table><p style="margin:0 0 6px;font-size:12px;line-height:1.5;color:#8A8A90;font-family:${font}">Or paste this into your browser:<br><a href="${esc(input.button.url)}" style="color:#2AA6A8;word-break:break-all">${esc(input.button.url)}</a></p>`
    : "";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap" rel="stylesheet"></head><body style="margin:0;padding:0;background:#F7EDE2"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7EDE2"><tr><td align="center" style="padding:32px 16px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px"><tr><td style="padding:0 6px 22px"><img src="${site}/brand/logo-dark.png" width="132" alt="Blanc Script" style="display:block;border:0;width:132px;height:auto;font-family:${font};font-size:20px;font-weight:700;color:#26272E"></td></tr><tr><td style="background:#FDF7F0;border:1px solid #E6D9CA;border-radius:18px;padding:36px 34px 30px"><h1 style="margin:0;font-family:${font};font-size:26px;line-height:1.2;font-weight:700;letter-spacing:-.4px;color:#26272E">${esc(input.heading)}</h1><img src="${site}/brand/squiggle.png" width="110" alt="" style="display:block;border:0;width:110px;height:auto;margin:10px 0 22px">${paras}${button}</td></tr><tr><td style="padding:22px 6px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#26272E;border-radius:14px"><tr><td align="center" style="padding:22px 20px;font-family:${font}"><div style="font-size:11px;letter-spacing:3px;color:#F7EDE2;font-weight:600">CONTENT &nbsp;·&nbsp; CREATIVITY &nbsp;·&nbsp; IMPACT</div><div style="margin-top:10px;font-size:12px;line-height:1.6;color:#9a9aa2">Blanc Script &nbsp;·&nbsp; 84 Walsall Street, Wednesbury, WS10 9EN<br><a href="mailto:hello@blancscript.com" style="color:#9a9aa2;text-decoration:none">hello@blancscript.com</a> &nbsp;·&nbsp; <a href="https://www.blancscript.com" style="color:#9a9aa2;text-decoration:none">blancscript.com</a></div></td></tr></table></td></tr></table></td></tr></table></body></html>`;
}

/** The email as it will look, for previews and tests. */
export function previewEmailHtml(input: { heading: string; paragraphs: string[]; button?: { label: string; url: string } }): string {
  return renderHtml(input);
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
