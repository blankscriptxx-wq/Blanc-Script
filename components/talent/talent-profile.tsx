import Link from "next/link";
import { ArrowLeft, Camera, FolderKanban, CalendarRange, Receipt, Star } from "lucide-react";
import { StatusPill } from "@/components/ds/status-pill";
import { AvailabilityPanel } from "@/components/talent/availability-panel";
import { DraftBioButton, DraftOutreachButton } from "@/components/talent/talent-ai";
import type {
  TalentProfile,
  TalentProfileInvoice,
} from "@/lib/data/talent-profile";
import type { CastingStatus } from "@/lib/data/castings";
import type { InvoiceStatus } from "@/lib/data/finance";

type Tone = React.ComponentProps<typeof StatusPill>["tone"];

const gbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});
const dateFmt = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "Europe/London" });

const CAST_STATUS: Record<CastingStatus, { label: string; tone: Tone }> = {
  pencilled: { label: "Pencilled", tone: "warning" },
  confirmed: { label: "Confirmed", tone: "success" },
  released: { label: "Released", tone: "neutral" },
};
const INV_STATUS: Record<InvoiceStatus, { label: string; tone: Tone }> = {
  draft: { label: "Draft", tone: "neutral" },
  sent: { label: "Sent", tone: "info" },
  approved: { label: "Approved", tone: "accent" },
  paid: { label: "Paid", tone: "success" },
  overdue: { label: "Overdue", tone: "danger" },
};

function money(p: number | null): string {
  return p == null ? "—" : gbp.format(p / 100);
}
function rateText(effectiveRatePence: number | null, isOverride: boolean): string | null {
  if (effectiveRatePence == null) return null;
  return `${gbp.format(effectiveRatePence / 100)}/hr${isOverride ? "" : " (default)"}`;
}
function cap(s: string): string {
  return s[0].toUpperCase() + s.slice(1);
}
function maskAccount(n: string | null): string {
  if (!n) return "—";
  const digits = n.replace(/\s/g, "");
  if (digits.length <= 4) return `••${digits}`;
  return `••••${digits.slice(-4)}`;
}
function hoursLabel(mins: number | null): string | null {
  if (mins == null) return null;
  const h = mins / 60;
  return `${h} hr`;
}

export function TalentProfileView({ profile }: { profile: TalentProfile }) {
  const { talent: t, summary, payments, byClient, canSeePay } = profile;
  const hasBank = t.bankAccountName || t.bankSortCode || t.bankAccountNumber;

  const tiles = [
    { label: "Shoots", value: String(summary.shootsCount) },
    { label: "Clients", value: String(summary.clientsCount) },
    ...(canSeePay
      ? [
          { label: "Billed to clients", value: money(summary.clientBilledPence), hint: "re-billed talent cost" },
          { label: "Blanc Script covers", value: money(summary.absorbedPence), hint: "absorbed cost" },
          { label: "Paid to date", value: money(summary.paidPence) },
          { label: "Outstanding", value: money(summary.outstandingPence), hint: "owed to them" },
        ]
      : []),
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/talent"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-bs-subtle transition-colors hover:text-bs-text"
      >
        <ArrowLeft className="h-4 w-4" /> Talent
      </Link>

      {/* Header */}
      <div className="rounded-md border border-bs-border bg-bs-surface p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-h1 text-bs-text">{t.name}</h1>
          <StatusPill
            tone={t.status === "active" ? "success" : "neutral"}
          >
            {cap(t.status)}
          </StatusPill>
          {summary.avgRating != null ? (
            <span className="inline-flex items-center gap-1 text-sm text-bs-text">
              <Star className="h-4 w-4 fill-bs-gold text-bs-gold" />
              <span className="font-medium tabular-nums">{summary.avgRating}</span>
              <span className="text-xs text-bs-subtle">({summary.ratedCount})</span>
            </span>
          ) : null}
        </div>
        {t.tags.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {t.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-bs-surface-2 px-2.5 py-1 text-xs text-bs-muted"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
        <div className="mt-3">
          <DraftBioButton talentId={t.id} />
        </div>
        <div className="mt-3 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
          <Detail label="Email" value={t.email ?? "—"} />
          <Detail label="Phone" value={t.phone ?? "—"} />
          <Detail
            label="Hourly rate"
            value={t.ratePerHourPence == null ? "—" : `${gbp.format(t.ratePerHourPence / 100)} / hr`}
          />
          <Detail
            label="Day rate"
            value={t.dayRatePence == null ? "—" : `${gbp.format(t.dayRatePence / 100)} / day`}
          />
          <Detail label="Base" value={t.baseLocation ?? "—"} />
          <Detail
            label="Instagram"
            value={t.instagram ? `@${t.instagram}` : "—"}
          />
          <Detail label="Agent / rep" value={t.agentName ?? "—"} />
          <Detail label="Agent contact" value={t.agentContact ?? "—"} />
          <Detail label="Height" value={t.heightCm != null ? `${t.heightCm} cm` : "—"} />
          <Detail label="Wardrobe / sizes" value={t.wardrobeNotes ?? "—"} />
          <Detail label="On book since" value={dateFmt.format(new Date(t.createdAt))} />
        </div>
        <div className="mt-3">
          <DraftOutreachButton talentId={t.id} />
        </div>
        {canSeePay && hasBank ? (
          <div className="mt-3 border-t border-bs-border pt-3">
            <div className="mb-1.5 text-xs uppercase tracking-wide text-bs-subtle">
              Payment details
            </div>
            <div className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
              <Detail label="Account name" value={t.bankAccountName ?? "—"} />
              <Detail label="Sort code" value={t.bankSortCode ?? "—"} />
              <Detail label="Account number" value={maskAccount(t.bankAccountNumber)} />
            </div>
          </div>
        ) : null}
        {t.notes?.trim() ? (
          <p className="mt-3 whitespace-pre-wrap border-t border-bs-border pt-3 text-sm text-bs-muted">
            {t.notes}
          </p>
        ) : null}
      </div>

      {/* Summary tiles */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map((k) => (
          <div key={k.label} className="rounded-md border border-bs-border bg-bs-surface p-4">
            <div className="text-eyebrow uppercase text-bs-subtle">{k.label}</div>
            <div className="mt-1 font-display text-h2 text-bs-text tabular-nums">{k.value}</div>
            {k.hint ? <div className="mt-0.5 text-xs text-bs-subtle">{k.hint}</div> : null}
          </div>
        ))}
      </div>

      {/* Availability */}
      <AvailabilityPanel talentId={t.id} rows={profile.availability} />

      {/* Their payments */}
      <section className="mt-8">
        <div className="mb-2 flex items-center gap-2">
          <Receipt className="h-4 w-4 text-bs-subtle" />
          <h2 className="font-display text-h3">Their invoices &amp; payments</h2>
        </div>
        {payments.length === 0 ? (
          <p className="rounded-md border border-dashed border-bs-border bg-bs-surface px-4 py-6 text-sm text-bs-subtle">
            No talent payments logged yet. Raise one from Finance and tag it to {t.name.split(" ")[0]}.
          </p>
        ) : (
          <InvoiceTable rows={payments} showClient />
        )}
      </section>

      {/* Work by client */}
      <section className="mt-8">
        <h2 className="mb-3 font-display text-h3">Work by client</h2>
        {byClient.length === 0 ? (
          <p className="rounded-md border border-dashed border-bs-border bg-bs-surface px-4 py-6 text-sm text-bs-subtle">
            Not attached to any shoots, projects or content yet.
          </p>
        ) : (
          <div className="space-y-5">
            {byClient.map((g) => (
              <div
                key={g.clientId ?? "none"}
                className="overflow-hidden rounded-md border border-bs-border bg-bs-surface"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-bs-border bg-bs-surface-2 px-4 py-2.5">
                  <h3 className="font-display text-h3 text-bs-text">
                    {g.clientName ?? "No client attached"}
                  </h3>
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    {g.billedToClientPence > 0 ? (
                      <span className="rounded-full bg-bs-surface px-2.5 py-1 text-bs-muted">
                        Billed to client: <span className="tabular-nums text-bs-text">{money(g.billedToClientPence)}</span>
                      </span>
                    ) : null}
                    {g.absorbedPence > 0 ? (
                      <span className="rounded-full bg-bs-surface px-2.5 py-1 text-bs-muted">
                        Blanc Script covers: <span className="tabular-nums text-bs-text">{money(g.absorbedPence)}</span>
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="space-y-4 p-4">
                  <LineGroup icon={<Camera className="h-3.5 w-3.5" />} label="Shoots" empty={g.shoots.length === 0}>
                    {g.shoots.map((s) => (
                      <Line
                        key={s.id}
                        title={s.title}
                        sub={[
                          s.roleName,
                          s.scheduledAt ? dateFmt.format(new Date(s.scheduledAt)) : null,
                          s.rateMode === "day"
                            ? `day rate${s.dayCount && s.dayCount > 1 ? ` × ${s.dayCount}` : ""}`
                            : hoursLabel(s.durationMinutes),
                          s.costPence != null
                            ? `${money(s.costPence)} ${s.costOwner === "agency" ? "(Blanc Script)" : "(client)"}`
                            : rateText(s.effectiveRatePence, s.rateIsOverride),
                          s.rating != null ? `★ ${s.rating}` : null,
                        ]}
                        pill={CAST_STATUS[s.status]}
                      />
                    ))}
                  </LineGroup>
                  <LineGroup icon={<FolderKanban className="h-3.5 w-3.5" />} label="Projects" empty={g.projects.length === 0}>
                    {g.projects.map((p) => (
                      <Line
                        key={p.id}
                        title={p.name}
                        sub={[p.roleName, rateText(p.effectiveRatePence, p.rateIsOverride)]}
                      />
                    ))}
                  </LineGroup>
                  <LineGroup icon={<CalendarRange className="h-3.5 w-3.5" />} label="Content" empty={g.content.length === 0}>
                    {g.content.map((c) => (
                      <Line key={c.id} title={c.title} sub={[c.roleName]} />
                    ))}
                  </LineGroup>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-bs-border/60 py-1 last:border-0 sm:border-0">
      <span className="text-bs-subtle">{label}</span>
      <span className="text-bs-text">{value}</span>
    </div>
  );
}

function GroupLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="mb-1.5 flex items-center gap-1.5 text-xs uppercase tracking-wide text-bs-subtle">
      {icon}
      {label}
    </div>
  );
}

function LineGroup({
  icon,
  label,
  empty,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  empty: boolean;
  children: React.ReactNode;
}) {
  if (empty) return null;
  return (
    <div>
      <GroupLabel icon={icon} label={label} />
      <ul className="space-y-1.5">{children}</ul>
    </div>
  );
}

function Line({
  title,
  sub,
  pill,
}: {
  title: string;
  sub: (string | null)[];
  pill?: { label: string; tone: Tone };
}) {
  const bits = sub.filter(Boolean) as string[];
  return (
    <li className="flex items-start justify-between gap-3 rounded-sm bg-bs-surface-2 px-3 py-2">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-medium text-bs-text">{title}</span>
          {pill ? <StatusPill tone={pill.tone}>{pill.label}</StatusPill> : null}
        </div>
        {bits.length ? <div className="mt-0.5 text-xs text-bs-subtle">{bits.join(" · ")}</div> : null}
      </div>
    </li>
  );
}

function InvoiceTable({
  rows,
  showClient = false,
}: {
  rows: TalentProfileInvoice[];
  showClient?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-sm border border-bs-border">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-bs-border bg-bs-surface-2 text-xs uppercase tracking-wide text-bs-subtle">
          <tr>
            <th className="px-3 py-2 font-medium">Number</th>
            {showClient ? <th className="px-3 py-2 font-medium">Client</th> : null}
            <th className="px-3 py-2 text-right font-medium">Amount</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Due</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-bs-border last:border-0">
              <td className="px-3 py-2 text-bs-text">{r.number ?? "—"}</td>
              {showClient ? (
                <td className="px-3 py-2 text-bs-muted">{r.clientName ?? "Blanc Script"}</td>
              ) : null}
              <td className="px-3 py-2 text-right tabular-nums text-bs-text">
                {gbp.format(r.amountPence / 100)}
              </td>
              <td className="px-3 py-2">
                <StatusPill tone={INV_STATUS[r.status].tone}>
                  {INV_STATUS[r.status].label}
                </StatusPill>
              </td>
              <td className="px-3 py-2 text-bs-muted tabular-nums">
                {r.dueAt ? dateFmt.format(new Date(r.dueAt)) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
