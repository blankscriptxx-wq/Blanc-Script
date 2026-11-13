import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RunSheet } from "@/components/shoots/run-sheet";
import { getSharedRunSheet } from "@/lib/data/shoots";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Call sheet · Blanc Script",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

/** A shoot's call sheet and scripts for talent and crew: a private link, no account. */
export default async function CallSheetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const sheet = await getSharedRunSheet(decodeURIComponent(token)).catch(() => null);
  if (!sheet) notFound();
  const { shoot, talent, scripts, studio } = sheet;

  const fmt = (o: Intl.DateTimeFormatOptions, d: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", ...o }).format(d);
  const time = (d: Date | null) => (d ? fmt({ hour: "numeric", minute: "2-digit", hour12: true }, d) : null);
  const facts: [string, string | null][] = [
    ["When", shoot.scheduledAt ? `${fmt({ weekday: "long", day: "numeric", month: "long" }, shoot.scheduledAt)}, ${time(shoot.scheduledAt)}` : "Date to be confirmed"],
    ["Where", shoot.locationName],
    ["For", shoot.clientName],
    ["Talent", talent.length ? talent.map((t) => t.name + (time(t.callTime) ? ` — call ${time(t.callTime)}` : "")).join(", ") : null],
    ["Scripts", scripts.length ? String(scripts.length) : null],
  ];

  return (
    <div className="min-h-screen bg-bs-canvas text-bs-text">
      <div className="mx-auto max-w-2xl px-4 pb-16 pt-6">
        <p className="text-eyebrow uppercase text-bs-accent">{studio} · Call sheet</p>
        <h1 className="mt-1 break-words font-display text-h1 text-bs-text">{shoot.title}</h1>
        <dl className="mt-4 space-y-2 rounded-md border border-bs-border bg-bs-surface p-4">
          {facts
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <div key={k} className="flex gap-3">
                <dt className="w-16 shrink-0 text-sm text-bs-subtle">{k}</dt>
                <dd className="min-w-0 break-words font-medium text-bs-text">{v}</dd>
              </div>
            ))}
        </dl>
        <RunSheet shootId={shoot.id} clientId={null} scripts={scripts} title={shoot.title} canTick={false} />
        <p className="mt-8 text-center text-xs text-bs-subtle">Shared privately by {studio}. Please don&apos;t forward it.</p>
      </div>
    </div>
  );
}
