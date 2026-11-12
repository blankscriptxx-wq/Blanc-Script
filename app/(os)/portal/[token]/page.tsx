import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CalendarRange, Camera, Clapperboard, Receipt } from "lucide-react";
import { StatusPill } from "@/components/ds/status-pill";
import { PayButton } from "@/components/portal/pay-button";
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

export default async function PortalHomePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ctx = await resolvePortal(token);
  if (!ctx) notFound();
  const home = await getPortalHome(ctx);
  const waiting = home.deliverables.filter((d) => d.status === "in_review").length;

  return (
    <div>
      <p className="text-eyebrow uppercase text-bs-subtle">Client portal</p>
      <h1 className="mt-1 font-display text-display">Hello, {ctx.viewerName.split(" ")[0]}</h1>
      <p className="mt-2 text-sm text-bs-muted">
        {waiting > 0
          ? `${waiting} ${waiting === 1 ? "piece is" : "pieces are"} waiting for your review.`
          : "Nothing is waiting on you right now."}
      </p>

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
                  <span className="block font-medium tabular-nums">
                    {i.number ?? "Invoice"} · {money(i.grossPence)}
                  </span>
                  <span className="block text-sm text-bs-muted">
                    {i.status === "paid"
                      ? `Paid${i.paidAt ? ` ${day.format(i.paidAt)}` : ""}`
                      : i.dueAt
                        ? `Due ${day.format(i.dueAt)}`
                        : "Payment due"}
                    {" · includes VAT where charged"}
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
    </div>
  );
}
