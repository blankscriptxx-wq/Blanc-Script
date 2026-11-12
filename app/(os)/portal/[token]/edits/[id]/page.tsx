import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { StatusPill } from "@/components/ds/status-pill";
import { ReviewPanel } from "@/components/portal/review-panel";
import { getPortalDeliverable, resolvePortal, type PortalDeliverableStatus } from "@/lib/data/portal";

export const dynamic = "force-dynamic";

type Tone = React.ComponentProps<typeof StatusPill>["tone"];
const STATUS: Record<PortalDeliverableStatus, { label: string; tone: Tone }> = {
  in_review: { label: "Ready for your review", tone: "warning" },
  changes_requested: { label: "Changes requested", tone: "info" },
  approved: { label: "Approved", tone: "success" },
  published: { label: "Published", tone: "accent" },
};

const when = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/London",
});
const day = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "Europe/London" });

function timecode(s: number): string {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default async function PortalDeliverablePage({
  params,
}: {
  params: Promise<{ token: string; id: string }>;
}) {
  const { token, id } = await params;
  const ctx = await resolvePortal(token);
  if (!ctx) redirect(`/portal/enter?t=${encodeURIComponent(token)}`);
  const d = await getPortalDeliverable(ctx, id);
  if (!d) notFound();

  const latest = d.versions[0];
  const watchUrl = latest?.previewUrl ?? d.previewUrl;

  return (
    <div>
      <Link
        href={`/portal/${token}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-bs-subtle transition-colors hover:text-bs-text"
      >
        <ArrowLeft className="h-4 w-4" /> All work
      </Link>

      <div className="rounded-md border border-bs-border bg-bs-surface p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-h1">{d.title}</h1>
          <StatusPill tone={STATUS[d.status].tone}>{STATUS[d.status].label}</StatusPill>
        </div>
        <p className="mt-1 text-sm text-bs-muted">
          {latest ? `Latest version: ${latest.label}` : d.versionLabel ? `Version ${d.versionLabel}` : "First cut"}
          {d.dueAt ? ` · feedback due ${day.format(d.dueAt)}` : ""}
        </p>
        {watchUrl ? (
          <a
            href={watchUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex h-10 items-center gap-2 rounded-sm bg-bs-text px-4 text-sm font-medium text-bs-surface transition-opacity hover:opacity-90"
          >
            <ExternalLink className="h-4 w-4" /> Watch the latest cut
          </a>
        ) : (
          <p className="mt-4 text-sm text-bs-subtle">
            The viewing link hasn&rsquo;t been added yet — we&rsquo;ll be in touch.
          </p>
        )}
      </div>

      <ReviewPanel
        token={token}
        deliverableId={d.id}
        canDecide={d.status === "in_review" || d.status === "changes_requested"}
        status={d.status}
      />

      <section className="mt-8">
        <h2 className="mb-3 font-display text-h3">Comments</h2>
        {d.comments.length === 0 ? (
          <p className="rounded-md border border-dashed border-bs-border bg-bs-surface px-4 py-5 text-sm text-bs-subtle">
            No comments yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {d.comments.map((c) => (
              <li
                key={c.id}
                className={
                  c.fromClient
                    ? "ml-6 rounded-md border border-bs-border bg-bs-primary-soft px-4 py-3"
                    : "mr-6 rounded-md border border-bs-border bg-bs-surface px-4 py-3"
                }
              >
                <p className="text-xs text-bs-subtle">
                  <span className="font-medium text-bs-text">{c.authorName}</span>
                  {c.fromClient ? "" : ` · ${ctx.agencyName}`} · {when.format(c.createdAt)}
                  {c.timecodeSeconds != null ? ` · at ${timecode(c.timecodeSeconds)}` : ""}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-bs-text">{c.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {d.versions.length > 1 ? (
        <section className="mt-8">
          <h2 className="mb-3 font-display text-h3">Earlier versions</h2>
          <ul className="space-y-2">
            {d.versions.slice(1).map((v) => (
              <li
                key={v.id}
                className="flex flex-wrap items-center gap-3 rounded-md border border-bs-border bg-bs-surface px-4 py-3 text-sm"
              >
                <span className="font-medium">{v.label}</span>
                <span className="text-bs-subtle">{day.format(v.createdAt)}</span>
                {v.note ? <span className="min-w-0 flex-1 text-bs-muted">{v.note}</span> : null}
                {v.previewUrl ? (
                  <a
                    href={v.previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-auto inline-flex items-center gap-1 text-bs-primary hover:underline"
                  >
                    Watch <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
