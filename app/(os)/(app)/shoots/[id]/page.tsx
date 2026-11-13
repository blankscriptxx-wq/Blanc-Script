import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { RunSheet } from "@/components/shoots/run-sheet";
import { ShootChat } from "@/components/shoots/shoot-chat";
import { aiConfigured } from "@/lib/ai/claude";
import { getShootThreadId, getThreadMessages } from "@/lib/data/client-chat";
import { getShootRunSheet, shootShareToken } from "@/lib/data/shoots";

export const metadata = { title: "Shoot" };
export const dynamic = "force-dynamic";
// AI script drafting from this page can take a couple of minutes.
export const maxDuration = 300;

export default async function ShootPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const sheet = await getShootRunSheet(id);
  if (!sheet) notFound();
  const { shoot, talent, scripts } = sheet;
  const token = await shootShareToken(shoot.id).catch(() => null);
  const threadId = await getShootThreadId(shoot.id).catch(() => null);
  const chat = threadId ? await getThreadMessages(threadId).catch(() => []) : [];

  const when = shoot.scheduledAt
    ? new Intl.DateTimeFormat("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: "Europe/London",
      }).format(shoot.scheduledAt)
    : "Date to be confirmed";
  const time = (d: Date | null) =>
    d
      ? new Intl.DateTimeFormat("en-GB", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Europe/London" }).format(d)
      : null;
  const details: [string, string | null][] = [
    ["Client", shoot.clientName],
    ["Project", shoot.projectName],
    ["Where", shoot.locationName],
    [
      "Talent",
      talent.length
        ? talent.map((t) => t.name + (time(t.callTime) ? ` (call ${time(t.callTime)})` : "")).join(", ")
        : null,
    ],
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/shoots" className="inline-flex items-center gap-1.5 text-sm text-bs-muted hover:text-bs-text">
        <ArrowLeft className="h-4 w-4" /> All shoots
      </Link>
      <p className="mt-4 text-eyebrow uppercase text-bs-accent">{when}</p>
      <h1 className="mt-1 break-words font-display text-h1 text-bs-text">{shoot.title}</h1>
      <dl className="mt-4 space-y-1.5 rounded-md border border-bs-border bg-bs-surface p-4 text-sm">
        {details
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <div key={k} className="flex gap-3">
              <dt className="w-16 shrink-0 text-bs-subtle">{k}</dt>
              <dd className="min-w-0 break-words text-bs-text">{v}</dd>
            </div>
          ))}
      </dl>

      <RunSheet
        shootId={shoot.id}
        scripts={scripts}
        title={shoot.title}
        sharePath={token ? `/callsheet/${token}` : undefined}
      />

      {shoot.clientId ? <ShootChat shootId={shoot.id} messages={chat} aiReady={aiConfigured()} /> : null}
    </div>
  );
}
