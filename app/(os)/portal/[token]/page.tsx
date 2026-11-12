import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, CalendarRange, Camera, Clapperboard, FileText, Package, Receipt, Upload } from "lucide-react";
import { StatusPill } from "@/components/ds/status-pill";
import { PayButton } from "@/components/portal/pay-button";
import { BillingPanel } from "@/components/portal/billing-panel";
import { UploadPanel } from "@/components/portal/upload-panel";
import { getBillingSummary } from "@/lib/data/billing";
import { listPortalDocuments } from "@/lib/data/documents";
import { listPortalUploads } from "@/lib/data/client-uploads";
import { stripeConfigured } from "@/lib/payments/stripe";
import { storageConfigured } from "@/lib/storage/r2";
import { getPortalHome, resolvePortal, type PortalDeliverableStatus } from "@/lib/data/portal";

export const dynamic = "force-dynamic";

type Tone = React.ComponentProps<typeof StatusPill>["tone"];

const DELIVERABLE: Record<PortalDeliverableStatus, { label: string; tone: Tone }> = {
  in_review: { label: "Ready for your review", tone: "warning" },
  changes_requested: { label: "Changes requested", tone: "info" },
  approved: { label: "Approved", tone: "success" },
  published: { label: "Published", tone: "accent" },
};
const INVOICE: Record<string, { label: string; tone: Tone }> = {
  sent: { label: "Due", tone: "info" },
  approved: { label: "Due", tone: "info" },
  overdue: { label: "Overdue", tone: "danger" },
  paid: { label: "Paid", tone: "success" },
};
const CHANNEL: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  linkedin: "LinkedIn",
  other: "Other",
};

const day = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "Europe/London" });
const dayTime = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/London",
});
const money = (p: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(p / 100);

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 flex items-center gap-2 font-display text-h3">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-md border border-dashed border-bs-border bg-bs-surface px-4 py-5 text-sm text-bs-subtle">
      {children}
    </p>
  );
}

export default async function PortalHomePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ subscribed?: string }>;
}) {
  const { token } = await params;
  const { subscribed } = await searchParams;
  const ctx = await resolvePortal(token);
  if (!ctx) redirect(`/portal/enter?t=${encodeURIComponent(token)}`);
  const [home, billingRaw, documents, uploads] = await Promise.all([
    getPortalHome(ctx),
    getBillingSummary(ctx.orgId, ctx.clientId).catch(() => null),
    listPortalDocuments(ctx).catch(() => []),
    listPortalUploads(ctx).catch(() => []),
  ]);
  const billing = billingRaw
    ? { ...billingRaw, canStart: billingRaw.canStart && stripeConfigured(), upgrades: stripeConfigured() ? billingRaw.upgrades : [] }
    : null;
  const waiting = home.deliverables.filter((d) => d.status === "in_review").length;
  const toAccept = documents.filter((d) => d.status === "sent").length;

  return (
    <div>
      <p className="text-eyebrow uppercase text-bs-subtle">Client portal</p>
      <h1 className="mt-1 font-display text-display">Hello, {ctx.viewerName.split(" ")[0]}</h1>
      <p className="mt-2 text-sm text-bs-muted">
        {waiting > 0
          ? `${waiting} ${waiting === 1 ? "piece is" : "pieces are"} waiting for your review.`
          : toAccept > 0
            ? ""
            : "Nothing is waiting on you right now."}
        {toAccept > 0
          ? ` ${toAccept} ${toAccept === 1 ? "document needs" : "documents need"} your acceptance.`
          : ""}
      </p>

      {billing ? (
        <Section icon={<Package className="h-5 w-5 text-bs-primary" />} title="Your package">
          <BillingPanel token={token} billing={billing} justSubscribed={subscribed === "1"} />
        </Section>
      ) : null}

      {documents.length ? (
        <Section icon={<FileText className="h-5 w-5 text-bs-primary" />} title="Agreements & documents">
          <ul className="space-y-2">
            {documents.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/portal/${token}/documents/${d.id}`}
                  className="flex flex-wrap items-center gap-3 rounded-md border border-bs-border bg-bs-surface px-4 py-3 transition-colors hover:bg-bs-surface-2"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-bs-text">{d.title}</span>
                    <span className="block text-xs text-bs-subtle">
                      {d.status === "accepted" && d.acceptedAt
                        ? `Accepted by ${d.acceptedByName} on ${day.format(d.acceptedAt)}`
                        : d.sentAt
                          ? `Sent ${day.format(d.sentAt)}`
                          : ""}
                    </span>
                  </span>
                  <StatusPill tone={d.status === "accepted" ? "success" : "warning"}>
                    {d.status === "accepted" ? "Accepted" : "Please read and accept"}
                  </StatusPill>
                  <ArrowRight className="h-4 w-4 text-bs-subtle" />
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section icon={<Clapperboard className="h-5 w-5 text-bs-primary" />} title="Your work">
        {home.deliverables.length === 0 ? (
          <Empty>Cuts will appear here as soon as they&rsquo;re ready for you to review.</Empty>
        ) : (
          <ul className="space-y-2">
            {home.deliverables.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/portal/${token}/edits/${d.id}`}
                  className="flex flex-wrap items-center gap-3 rounded-md border border-bs-border bg-bs-surface px-4 py-3 transition-colors hover:bg-bs-surface-2"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-bs-text">
                      {d.title}
                      {d.versionLabel ? (
                        <span className="ml-2 text-xs font-normal text-bs-subtle">{d.versionLabel}</span>
                      ) : null}
                    </span>
                    <span className="block text-xs text-bs-subtle">
                      Updated {day.format(d.updatedAt)}
                    </span>
                  </span>
                  <StatusPill tone={DELIVERABLE[d.status].tone}>{DELIVERABLE[d.status].label}</StatusPill>
                  <ArrowRight className="h-4 w-4 text-bs-subtle" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section icon={<Camera className="h-5 w-5 text-bs-primary" />} title="Upcoming shoots">
        {home.shoots.length === 0 ? (
          <Empty>No shoots booked at the moment.</Empty>
        ) : (
          <ul className="space-y-2">
            {home.shoots.map((s) => (
              <li key={s.id} className="rounded-md border border-bs-border bg-bs-surface px-4 py-3">
                <span className="block font-medium">{s.title}</span>
                <span className="block text-sm text-bs-muted">
                  {s.scheduledAt ? dayTime.format(s.scheduledAt) : "Date to be confirmed"}
                  {s.locationName ? ` · ${s.locationName}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section icon={<CalendarRange className="h-5 w-5 text-bs-primary" />} title="Content schedule">
        {home.content.length === 0 ? (
          <Empty>Scheduled posts will be listed here.</Empty>
        ) : (
          <ul className="space-y-2">
            {home.content.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center gap-3 rounded-md border border-bs-border bg-bs-surface px-4 py-3"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{c.title}</span>
                  <span className="block text-sm text-bs-muted">
                    {CHANNEL[c.channel] ?? c.channel}
                    {c.scheduledFor ? ` · ${dayTime.format(c.scheduledFor)}` : ""}
                  </span>
                </span>
                <StatusPill tone={c.status === "posted" ? "success" : "info"}>
                  {c.status === "posted" ? "Posted" : "Scheduled"}
                </StatusPill>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section icon={<Receipt className="h-5 w-5 text-bs-primary" />} title="Invoices">
        {home.invoices.length === 0 ? (
          <Empty>No invoices yet.</Empty>
        ) : (
          <ul className="space-y-2">
            {home.invoices.map((i) => (
              <li
                key={i.id}
                className="flex flex-wrap items-center gap-3 rounded-md border border-bs-border bg-bs-surface px-4 py-3"
              >
                <span className="min-w-0 flex-1">
                  <Link
                    href={`/portal/${token}/invoices/${i.id}`}
                    className="block font-medium tabular-nums text-bs-text underline-offset-2 hover:underline"
                  >
                    {i.number ?? "Invoice"} · {money(i.grossPence)}
                  </Link>
                  <span className="block text-sm text-bs-muted">
                    {i.status === "paid"
                      ? `Paid${i.paidAt ? ` ${day.format(i.paidAt)}` : ""}`
                      : i.dueAt
                        ? `Due ${day.format(i.dueAt)}`
                        : "Payment due"}
                    {" · "}
                    <Link href={`/portal/${token}/invoices/${i.id}`} className="text-bs-primary hover:underline">
                      View invoice
                    </Link>
                  </span>
                </span>
                <StatusPill tone={INVOICE[i.status].tone}>{INVOICE[i.status].label}</StatusPill>
                {i.status !== "paid" && i.paymentUrl ? (
                  <PayButton token={token} invoiceId={i.id} paymentUrl={i.paymentUrl} />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section icon={<Upload className="h-5 w-5 text-bs-primary" />} title="Send us files">
        {storageConfigured() ? (
          <UploadPanel token={token} />
        ) : (
          <Empty>Uploads aren&rsquo;t available right now.</Empty>
        )}
        {uploads.length ? (
          <div className="mt-3">
            <p className="mb-1.5 text-xs text-bs-subtle">Received from you</p>
            <ul className="divide-y divide-bs-border rounded-md border border-bs-border bg-bs-surface text-sm">
              {uploads.map((u) => (
                <li key={u.id} className="flex items-center gap-3 px-4 py-2">
                  <span className="min-w-0 flex-1 truncate">{u.fileName}</span>
                  <span className="shrink-0 text-xs text-bs-subtle">{day.format(u.createdAt)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Section>
    </div>
  );
}
