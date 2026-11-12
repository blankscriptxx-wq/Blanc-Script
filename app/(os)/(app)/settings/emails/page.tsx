import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { NoAccess } from "@/components/ds/no-access";
import { EmailLogRow } from "@/components/settings/email-log-row";
import { getCurrentUser } from "@/lib/auth/session";
import { getEmailLog } from "@/lib/data/email-log";
import { emailConfigured, emailFrom } from "@/lib/email/send";

export const dynamic = "force-dynamic";
export const metadata = { title: "Email log" };

const KIND: Record<string, string> = {
  welcome: "Onboarding welcome",
  onboarding_reminder: "Onboarding reminder",
  onboarding_complete: "Onboarding complete",
  portal_invite: "Portal invitation",
  owner_invite: "Owner invitation",
  account_created: "Account created",
  invoice: "Invoice / receipt",
  invoice_reminder: "Overdue invoice reminder",
  document: "Agreement",
  document_reminder: "Agreement reminder",
  review_reminder: "Review reminder",
  payment_failed: "Failed payment",
  proposal: "Proposal",
  test: "Test email",
};

const when = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });

/** Every email the OS has sent or tried to send, with what happened to it. */
export default async function EmailLogPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const user = await getCurrentUser();
  if (!user?.capabilities.has("can_settings")) return <NoAccess what="the email log" />;
  const { status, q } = await searchParams;
  const { rows, counts } = await getEmailLog({ status, q });
  const tabs = [
    { key: "", label: "All" },
    { key: "sent", label: "Sent" },
    { key: "failed", label: "Failed" },
    { key: "not_configured", label: "Not sent" },
  ];
  const href = (key: string) => `/settings/emails${key || q ? "?" : ""}${key ? `status=${key}` : ""}${key && q ? "&" : ""}${q ? `q=${encodeURIComponent(q)}` : ""}`;

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/settings" className="mb-4 inline-flex items-center gap-1.5 text-sm text-bs-subtle transition-colors hover:text-bs-text">
        <ArrowLeft className="h-4 w-4" /> Back to settings
      </Link>
      <p className="text-eyebrow uppercase text-bs-subtle">Settings</p>
      <h1 className="mt-1 font-display text-h1">Email log</h1>
      <p className="mt-1 text-sm text-bs-muted">
        {emailConfigured() ? `Sending as ${emailFrom()}.` : "Email isn't connected, so nothing is being sent — messages are only recorded here."} Every
        email the studio sends is listed below with what happened to it.
      </p>

      <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Sent", value: counts.sent, cls: "text-bs-success" },
          { label: "Failed", value: counts.failed, cls: counts.failed ? "text-bs-danger" : "text-bs-text" },
          { label: "Not sent", value: counts.notSent, cls: "text-bs-text" },
          { label: "Total", value: counts.total, cls: "text-bs-text" },
        ].map((c) => (
          <div key={c.label} className="rounded-md border border-bs-border bg-bs-surface p-4">
            <dt className="text-xs text-bs-subtle">{c.label} · last 30 days</dt>
            <dd className={`mt-1 font-display text-h1 tabular-nums ${c.cls}`}>{c.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {tabs.map((t) => {
          const active = (status ?? "") === t.key;
          return (
            <Link
              key={t.key}
              href={href(t.key)}
              aria-current={active ? "page" : undefined}
              className={`rounded-pill border px-3 py-1 text-sm transition-colors ${active ? "border-bs-primary bg-bs-primary text-bs-on-accent" : "border-bs-border-strong text-bs-text hover:bg-bs-surface-2"}`}
            >
              {t.label}
            </Link>
          );
        })}
        <form className="ml-auto" action="/settings/emails">
          {status ? <input type="hidden" name="status" value={status} /> : null}
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search by email or subject"
            aria-label="Search the email log"
            className="h-9 w-64 max-w-full rounded-sm border border-bs-border-strong bg-bs-surface px-3 text-sm text-bs-text outline-none placeholder:text-bs-subtle"
          />
        </form>
      </div>

      {rows.length === 0 ? (
        <p className="mt-4 rounded-md border border-dashed border-bs-border bg-bs-surface px-4 py-8 text-center text-sm text-bs-subtle">
          No emails match.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-bs-border rounded-md border border-bs-border bg-bs-surface">
          {rows.map((r) => (
            <EmailLogRow
              key={r.id}
              row={{
                id: r.id,
                toEmail: r.toEmail,
                subject: r.subject,
                kindLabel: KIND[r.kind] ?? r.kind.replace(/_/g, " "),
                status: r.status,
                error: r.error,
                when: when.format(r.createdAt),
              }}
            />
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-bs-subtle">
        Showing the latest {rows.length} emails. &ldquo;Sent&rdquo; means your mail server accepted it; a wrong address can still bounce back to your
        inbox. &ldquo;Not sent&rdquo; are messages recorded before email was connected.
      </p>
    </div>
  );
}
