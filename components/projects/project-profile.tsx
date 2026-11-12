import Link from "next/link";
import { ArrowLeft, Camera, Users, FileVideo, FolderOpen } from "lucide-react";
import { StatusPill } from "@/components/ds/status-pill";
import { TasksBoard } from "@/components/tasks/tasks-board";
import { Uploader } from "@/components/uploads/uploader";
import { FileList } from "@/components/uploads/file-list";
import type { MediaAssetRow } from "@/lib/data/media";
import type {
  ProjectProfile,
  ProjectStatus,
  ShootStatus,
  DeliverableStatus,
} from "@/lib/data/project-profile";

type Tone = React.ComponentProps<typeof StatusPill>["tone"];

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeZone: "Europe/London",
});

const PROJECT_STATUS: Record<ProjectStatus, { label: string; tone: Tone }> = {
  planning: { label: "Planning", tone: "info" },
  active: { label: "Active", tone: "success" },
  on_hold: { label: "On hold", tone: "warning" },
  complete: { label: "Complete", tone: "accent" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

const SHOOT_STATUS: Record<ShootStatus, { label: string; tone: Tone }> = {
  booked: { label: "Booked", tone: "info" },
  on_site: { label: "On site", tone: "gold" },
  wrapped: { label: "Wrapped", tone: "success" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

const DELIVERABLE_STATUS: Record<
  DeliverableStatus,
  { label: string; tone: Tone }
> = {
  editing: { label: "Editing", tone: "info" },
  in_review: { label: "In review", tone: "gold" },
  changes_requested: { label: "Changes requested", tone: "warning" },
  approved: { label: "Approved", tone: "success" },
  published: { label: "Published", tone: "accent" },
};

export function ProjectProfileView({
  profile,
  media = [],
  storageReady = false,
}: {
  profile: ProjectProfile;
  media?: MediaAssetRow[];
  storageReady?: boolean;
}) {
  const { project: p, summary, tasks, shoots, talent, deliverables } = profile;

  const tiles = [
    { label: "Tasks open", value: String(summary.tasksOpen) },
    { label: "Tasks done", value: String(summary.tasksDone) },
    { label: "Shoots", value: String(summary.shootsCount) },
    { label: "Talent", value: String(summary.talentCount) },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/projects"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-bs-subtle transition-colors hover:text-bs-text"
      >
        <ArrowLeft className="h-4 w-4" /> Projects
      </Link>

      {/* Header */}
      <div className="rounded-md border border-bs-border bg-bs-surface p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-h1 text-bs-text">{p.name}</h1>
          <StatusPill tone={PROJECT_STATUS[p.status].tone}>
            {PROJECT_STATUS[p.status].label}
          </StatusPill>
        </div>
        <div className="mt-3 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
          <Detail label="Client" value={p.clientName ?? "—"} />
          <Detail label="Started" value={dateFmt.format(new Date(p.createdAt))} />
          <Detail label="Updated" value={dateFmt.format(new Date(p.updatedAt))} />
        </div>
      </div>

      {/* Brief */}
      <section className="mt-4">
        <h2 className="mb-2 font-display text-h3">Brief</h2>
        {p.brief?.trim() ? (
          <p className="whitespace-pre-wrap rounded-md border border-bs-border bg-bs-surface p-4 text-sm text-bs-muted">
            {p.brief}
          </p>
        ) : (
          <p className="rounded-md border border-dashed border-bs-border bg-bs-surface px-4 py-6 text-sm text-bs-subtle">
            No brief yet. Add one to give the team the shape of this project.
          </p>
        )}
      </section>

      {/* Summary tiles */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((k) => (
          <div
            key={k.label}
            className="rounded-md border border-bs-border bg-bs-surface p-4"
          >
            <div className="text-eyebrow uppercase text-bs-subtle">{k.label}</div>
            <div className="mt-1 font-display text-h2 text-bs-text tabular-nums">
              {k.value}
            </div>
          </div>
        ))}
      </div>

      {/* Tasks board */}
      <section className="mt-8">
        <h2 className="mb-3 font-display text-h3">Tasks</h2>
        <TasksBoard projectId={p.id} tasks={tasks} />
      </section>

      {/* Shoots */}
      <section className="mt-8">
        <div className="mb-2 flex items-center gap-2">
          <Camera className="h-4 w-4 text-bs-subtle" />
          <h2 className="font-display text-h3">Shoots</h2>
        </div>
        {shoots.length === 0 ? (
          <EmptyLine>No shoots linked to this project's client yet.</EmptyLine>
        ) : (
          <ul className="space-y-1.5">
            {shoots.map((s) => (
              <Line
                key={s.id}
                title={s.title}
                sub={[s.scheduledAt ? dateFmt.format(new Date(s.scheduledAt)) : null]}
                pill={SHOOT_STATUS[s.status]}
              />
            ))}
          </ul>
        )}
      </section>

      {/* Talent */}
      <section className="mt-8">
        <div className="mb-2 flex items-center gap-2">
          <Users className="h-4 w-4 text-bs-subtle" />
          <h2 className="font-display text-h3">Talent</h2>
        </div>
        {talent.length === 0 ? (
          <EmptyLine>No talent cast on this project yet.</EmptyLine>
        ) : (
          <ul className="space-y-1.5">
            {talent.map((t) => (
              <Line key={t.id} title={t.name} sub={[t.roleName]} />
            ))}
          </ul>
        )}
      </section>

      {/* Deliverables */}
      <section className="mt-8">
        <div className="mb-2 flex items-center gap-2">
          <FileVideo className="h-4 w-4 text-bs-subtle" />
          <h2 className="font-display text-h3">Deliverables</h2>
        </div>
        {deliverables.length === 0 ? (
          <EmptyLine>No deliverables on this project yet.</EmptyLine>
        ) : (
          <ul className="space-y-1.5">
            {deliverables.map((d) => (
              <Line
                key={d.id}
                title={d.title}
                sub={[]}
                pill={DELIVERABLE_STATUS[d.status]}
              />
            ))}
          </ul>
        )}
      </section>

      {/* Project files */}
      <section className="mt-8">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-bs-subtle" />
            <h2 className="font-display text-h3">Project files</h2>
          </div>
          <Uploader context={{ projectId: p.id }} configured={storageReady} />
        </div>
        <FileList rows={media} />
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

function EmptyLine({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-md border border-dashed border-bs-border bg-bs-surface px-4 py-6 text-sm text-bs-subtle">
      {children}
    </p>
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
    <li className="flex items-start justify-between gap-3 rounded-sm border border-bs-border bg-bs-surface px-3 py-2">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-medium text-bs-text">{title}</span>
          {pill ? <StatusPill tone={pill.tone}>{pill.label}</StatusPill> : null}
        </div>
        {bits.length ? (
          <div className="mt-0.5 text-xs text-bs-subtle">{bits.join(" · ")}</div>
        ) : null}
      </div>
    </li>
  );
}
