"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ds/button";
import { StatusPill } from "@/components/ds/status-pill";
import { Dialog } from "@/components/ds/dialog";
import { Sheet } from "@/components/ds/sheet";
import { EmptyState } from "@/components/ds/empty-state";
import { createContentAction } from "@/app/(app)/content/actions";
import type { ContentRow, ContentChannel, ContentStatus } from "@/lib/data/content";
import { CastingSection } from "@/components/castings/casting-section";
import type { ContentCasting, TalentPickerOption } from "@/lib/data/castings";
import { ContentCalendar } from "@/components/content/content-calendar";
import { cn } from "@/lib/cn";

type ContentViewMode = "board" | "calendar";

type Tone = React.ComponentProps<typeof StatusPill>["tone"];

const CHANNEL_LABEL: Record<ContentChannel, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  linkedin: "LinkedIn",
  other: "Other",
};

const CHANNEL_TONE: Record<ContentChannel, Tone> = {
  instagram: "accent",
  tiktok: "info",
  youtube: "danger",
  linkedin: "info",
  other: "neutral",
};

const STATUS_LABEL: Record<ContentStatus, string> = {
  idea: "Idea",
  scripting: "Scripting",
  filming: "Filming",
  editing: "Editing",
  scheduled: "Scheduled",
  posted: "Posted",
};

const STATUS_TONE: Record<ContentStatus, Tone> = {
  idea: "neutral",
  scripting: "info",
  filming: "gold",
  editing: "info",
  scheduled: "accent",
  posted: "success",
};

const STATUS_ORDER: ContentStatus[] = [
  "idea",
  "scripting",
  "filming",
  "editing",
  "scheduled",
  "posted",
];

const dateFmt = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" });
const dateTimeFmt = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function ContentView({
  rows,
  clientOptions,
  castings = [],
  talentOptions = [],
}: {
  rows: ContentRow[];
  clientOptions: { id: string; name: string }[];
  castings?: ContentCasting[];
  talentOptions?: TalentPickerOption[];
}) {
  const router = useRouter();
  const [addOpen, setAddOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<ContentRow | null>(null);
  const [mode, setMode] = React.useState<ContentViewMode>("board");

  const grouped = React.useMemo(() => {
    const map: Record<ContentStatus, ContentRow[]> = {
      idea: [],
      scripting: [],
      filming: [],
      editing: [],
      scheduled: [],
      posted: [],
    };
    for (const r of rows) map[r.status].push(r);
    return map;
  }, [rows]);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-bs-muted">
          {rows.length} {rows.length === 1 ? "item" : "items"} in the pipeline
        </p>
        <div className="flex items-center gap-3">
          <ViewToggle mode={mode} onChange={setMode} />
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> New content
          </Button>
        </div>
      </div>

      {mode === "calendar" ? (
        <ContentCalendar rows={rows} onSelect={setSelected} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="Nothing planned yet."
          description="Add your first content idea to start building the calendar — from first idea through to posted."
          action={<Button onClick={() => setAddOpen(true)}>Add content</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {STATUS_ORDER.map((status) => {
            const items = grouped[status];
            return (
              <div
                key={status}
                className="flex flex-col rounded-md border border-bs-border bg-bs-surface"
              >
                <div className="flex items-center justify-between gap-2 border-b border-bs-border px-3 py-2.5">
                  <StatusPill tone={STATUS_TONE[status]}>
                    {STATUS_LABEL[status]}
                  </StatusPill>
                  <span className="text-xs tabular-nums text-bs-subtle">
                    {items.length}
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-2 p-2">
                  {items.length === 0 ? (
                    <p className="px-1 py-3 text-xs text-bs-subtle">—</p>
                  ) : (
                    items.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => setSelected(r)}
                        className="flex flex-col gap-2 rounded-sm border border-bs-border bg-bs-surface-2 p-2.5 text-left transition-colors hover:bg-bs-surface"
                      >
                        <span className="text-sm font-medium leading-snug text-bs-text">
                          {r.title}
                        </span>
                        <span className="flex flex-wrap items-center gap-1.5">
                          <StatusPill tone={CHANNEL_TONE[r.channel]}>
                            {CHANNEL_LABEL[r.channel]}
                          </StatusPill>
                        </span>
                        {r.clientName ? (
                          <span className="text-xs text-bs-muted">{r.clientName}</span>
                        ) : null}
                        {r.scheduledFor ? (
                          <span className="text-xs tabular-nums text-bs-subtle">
                            {dateFmt.format(new Date(r.scheduledFor))}
                          </span>
                        ) : null}
                      </button>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AddContentDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        clientOptions={clientOptions}
        onCreated={() => {
          setAddOpen(false);
          router.refresh();
        }}
      />

      <Sheet
        open={selected !== null}
        onClose={() => setSelected(null)}
        eyebrow="Content"
        title={selected?.title ?? ""}
      >
        {selected ? (
          <div className="space-y-4">
            <Row label="Status">
              <StatusPill tone={STATUS_TONE[selected.status]}>
                {STATUS_LABEL[selected.status]}
              </StatusPill>
            </Row>
            <Row label="Channel">
              <StatusPill tone={CHANNEL_TONE[selected.channel]}>
                {CHANNEL_LABEL[selected.channel]}
              </StatusPill>
            </Row>
            <Row label="Client">{selected.clientName ?? "—"}</Row>
            <Row label="Scheduled for">
              {selected.scheduledFor
                ? dateTimeFmt.format(new Date(selected.scheduledFor))
                : "—"}
            </Row>
            <Row label="Added">
              {dateFmt.format(new Date(selected.createdAt))}
            </Row>
            <div className="border-b border-bs-border pb-3 last:border-0">
              <span className="block text-sm text-bs-subtle">Notes</span>
              <p className="mt-1 whitespace-pre-wrap text-sm text-bs-text">
                {selected.notes?.trim() ? selected.notes : "—"}
              </p>
            </div>
            <CastingSection
              kind="content"
              parentId={selected.id}
              items={castings.filter((c) => c.contentItemId === selected.id)}
              talentOptions={talentOptions}
            />
          </div>
        ) : null}
      </Sheet>
    </>
  );
}

function ViewToggle({
  mode,
  onChange,
}: {
  mode: ContentViewMode;
  onChange: (mode: ContentViewMode) => void;
}) {
  const options: { value: ContentViewMode; label: string }[] = [
    { value: "board", label: "Board" },
    { value: "calendar", label: "Calendar" },
  ];
  return (
    <div
      role="tablist"
      aria-label="Content view"
      className="inline-flex items-center gap-0.5 rounded-sm border border-bs-border bg-bs-surface-2 p-0.5"
    >
      {options.map((opt) => {
        const active = mode === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-xs px-3 py-1 text-sm font-medium transition-colors",
              active
                ? "bg-bs-surface text-bs-text shadow-elev-1"
                : "text-bs-muted hover:text-bs-text",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-bs-border pb-3 last:border-0">
      <span className="text-sm text-bs-subtle">{label}</span>
      <span className="text-sm text-bs-text">{children}</span>
    </div>
  );
}

function AddContentDialog({
  open,
  onClose,
  clientOptions,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  clientOptions: { id: string; name: string }[];
  onCreated: () => void;
}) {
  const [state, action, pending] = useActionState(createContentAction, null);
  React.useEffect(() => {
    if (state?.ok) onCreated();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const inputCls =
    "h-9 w-full rounded-sm border border-bs-border-strong bg-bs-surface px-3 text-body text-bs-text outline-none placeholder:text-bs-subtle";

  return (
    <Dialog open={open} onClose={onClose} title="New content">
      <form action={action} className="space-y-4">
        <Field label="Title">
          <input
            name="title"
            required
            autoFocus
            placeholder="e.g. Behind the scenes reel"
            className={inputCls}
          />
        </Field>
        <Field label="Client (optional)">
          <select name="clientId" defaultValue="" className={cn(inputCls, "pr-8")}>
            <option value="">None</option>
            {clientOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Channel">
            <select name="channel" defaultValue="instagram" className={cn(inputCls, "pr-8")}>
              <option value="instagram">Instagram</option>
              <option value="tiktok">TikTok</option>
              <option value="youtube">YouTube</option>
              <option value="linkedin">LinkedIn</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Status">
            <select name="status" defaultValue="idea" className={cn(inputCls, "pr-8")}>
              <option value="idea">Idea</option>
              <option value="scripting">Scripting</option>
              <option value="filming">Filming</option>
              <option value="editing">Editing</option>
              <option value="scheduled">Scheduled</option>
              <option value="posted">Posted</option>
            </select>
          </Field>
        </div>
        <Field label="Scheduled date (optional)">
          <input
            type="datetime-local"
            name="scheduledFor"
            className={inputCls}
          />
        </Field>
        {state && !state.ok ? (
          <p className="text-sm text-bs-danger">{state.error}</p>
        ) : null}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Adding…" : "Add content"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-sm font-medium text-bs-text">{label}</span>
      {children}
    </label>
  );
}
