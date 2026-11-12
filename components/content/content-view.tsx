"use client";

import { useOpenOnNewParam } from "@/lib/use-new-param";
import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ds/button";
import { StatusPill } from "@/components/ds/status-pill";
import { Dialog } from "@/components/ds/dialog";
import { Sheet } from "@/components/ds/sheet";
import { EmptyState } from "@/components/ds/empty-state";
import {
  createContentAction,
  updateContentAction,
  setContentStatusAction,
  rescheduleContentAction,
} from "@/app/(os)/(app)/content/actions";
import {
  draftCaptionAction,
  suggestHashtagsAction,
} from "@/app/(os)/(app)/content/ai-actions";
import { AiGenerate } from "@/components/ai/ai-generate";
import type { ContentRow, ContentChannel, ContentStatus } from "@/lib/data/content";
import { CastingSection } from "@/components/castings/casting-section";
import type { ContentCasting, TalentPickerOption } from "@/lib/data/castings";
import { ContentCalendar } from "@/components/content/content-calendar";
import { Uploader } from "@/components/uploads/uploader";
import { FileList } from "@/components/uploads/file-list";
import type { MediaAssetRow } from "@/lib/data/media";
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

const CHANNEL_ORDER: ContentChannel[] = [
  "instagram",
  "tiktok",
  "youtube",
  "linkedin",
  "other",
];

const dateFmt = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" });
const dateTimeFmt = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
});

const inputCls =
  "h-9 w-full rounded-sm border border-bs-border-strong bg-bs-surface px-3 text-body text-bs-text outline-none placeholder:text-bs-subtle";
const textareaCls =
  "min-h-[88px] w-full rounded-sm border border-bs-border-strong bg-bs-surface px-3 py-2 text-body text-bs-text outline-none placeholder:text-bs-subtle";

/** Date → "YYYY-MM-DDTHH:mm" in the browser's local time, for datetime-local inputs. */
function toDateTimeLocal(d: Date | string | null): string {
  if (!d) return "";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function ContentView({
  rows,
  clientOptions,
  castings = [],
  talentOptions = [],
  media = [],
  storageReady = false,
}: {
  rows: ContentRow[];
  clientOptions: { id: string; name: string }[];
  castings?: ContentCasting[];
  talentOptions?: TalentPickerOption[];
  media?: MediaAssetRow[];
  storageReady?: boolean;
}) {
  const router = useRouter();
  const [addOpen, setAddOpen] = React.useState(false);
  useOpenOnNewParam(setAddOpen);
  const [selected, setSelected] = React.useState<ContentRow | null>(null);
  const [editing, setEditing] = React.useState<ContentRow | null>(null);
  const [mode, setMode] = React.useState<ContentViewMode>("board");

  const [filterClient, setFilterClient] = React.useState<string>("all");
  const [filterChannel, setFilterChannel] = React.useState<string>("all");
  const [filterStatus, setFilterStatus] = React.useState<string>("all");

  const filteredRows = React.useMemo(
    () =>
      rows.filter((r) => {
        if (filterClient !== "all") {
          if (filterClient === "none" ? r.clientId !== null : r.clientId !== filterClient) {
            return false;
          }
        }
        if (filterChannel !== "all" && r.channel !== filterChannel) return false;
        if (filterStatus !== "all" && r.status !== filterStatus) return false;
        return true;
      }),
    [rows, filterClient, filterChannel, filterStatus],
  );

  const grouped = React.useMemo(() => {
    const map: Record<ContentStatus, ContentRow[]> = {
      idea: [],
      scripting: [],
      filming: [],
      editing: [],
      scheduled: [],
      posted: [],
    };
    for (const r of filteredRows) map[r.status].push(r);
    return map;
  }, [filteredRows]);

  const filtersActive =
    filterClient !== "all" || filterChannel !== "all" || filterStatus !== "all";

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-bs-muted">
          {filteredRows.length} {filteredRows.length === 1 ? "item" : "items"}
          {filtersActive ? ` of ${rows.length}` : ""} in the pipeline
        </p>
        <div className="flex items-center gap-3">
          <ViewToggle mode={mode} onChange={setMode} />
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> New content
          </Button>
        </div>
      </div>

      <FilterBar
        clientOptions={clientOptions}
        client={filterClient}
        channel={filterChannel}
        status={filterStatus}
        onClient={setFilterClient}
        onChannel={setFilterChannel}
        onStatus={setFilterStatus}
        onReset={() => {
          setFilterClient("all");
          setFilterChannel("all");
          setFilterStatus("all");
        }}
        active={filtersActive}
      />

      {mode === "calendar" ? (
        <ContentCalendar rows={filteredRows} onSelect={setSelected} />
      ) : filteredRows.length === 0 ? (
        <EmptyState
          title={filtersActive ? "No matching content." : "Nothing planned yet."}
          description={
            filtersActive
              ? "No items match the current filters. Try clearing them to see the full pipeline."
              : "Add your first content idea to start building the calendar — from first idea through to posted."
          }
          action={
            filtersActive ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setFilterClient("all");
                  setFilterChannel("all");
                  setFilterStatus("all");
                }}
              >
                Clear filters
              </Button>
            ) : (
              <Button onClick={() => setAddOpen(true)}>Add content</Button>
            )
          }
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

      {editing ? (
        <EditContentDialog
          key={editing.id}
          row={editing}
          clientOptions={clientOptions}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setSelected(null);
            router.refresh();
          }}
        />
      ) : null}

      <Sheet
        open={selected !== null}
        onClose={() => setSelected(null)}
        eyebrow="Content"
        title={selected?.title ?? ""}
      >
        {selected ? (
          <DrawerContent
            key={selected.id}
            row={selected}
            castings={castings.filter((c) => c.contentItemId === selected.id)}
            talentOptions={talentOptions}
            media={media.filter((m) => m.contentItemId === selected.id)}
            storageReady={storageReady}
            onEdit={() => setEditing(selected)}
            onPatch={(patch) =>
              setSelected((s) => (s ? { ...s, ...patch } : s))
            }
          />
        ) : null}
      </Sheet>
    </>
  );
}

function DrawerContent({
  row,
  castings,
  talentOptions,
  media,
  storageReady,
  onEdit,
  onPatch,
}: {
  row: ContentRow;
  castings: ContentCasting[];
  talentOptions: TalentPickerOption[];
  media: MediaAssetRow[];
  storageReady: boolean;
  onEdit: () => void;
  onPatch: (patch: Partial<ContentRow>) => void;
}) {
  const router = useRouter();
  const [statusPending, setStatusPending] = React.useState(false);
  const [schedule, setSchedule] = React.useState(toDateTimeLocal(row.scheduledFor));
  const [schedulePending, setSchedulePending] = React.useState(false);

  async function handleStatus(next: ContentStatus) {
    setStatusPending(true);
    try {
      const fd = new FormData();
      fd.set("id", row.id);
      fd.set("status", next);
      await setContentStatusAction(fd);
      onPatch({ status: next });
      router.refresh();
    } finally {
      setStatusPending(false);
    }
  }

  async function handleReschedule() {
    setSchedulePending(true);
    try {
      const fd = new FormData();
      fd.set("id", row.id);
      fd.set("scheduledFor", schedule);
      await rescheduleContentAction(fd);
      onPatch({
        scheduledFor: schedule ? new Date(schedule) : null,
      });
      router.refresh();
    } finally {
      setSchedulePending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="secondary" size="sm" onClick={onEdit}>
          <Pencil className="h-4 w-4" /> Edit
        </Button>
      </div>

      <label className="block space-y-1.5">
        <span className="block text-sm text-bs-subtle">Status</span>
        <select
          value={row.status}
          disabled={statusPending}
          onChange={(e) => handleStatus(e.target.value as ContentStatus)}
          className={cn(inputCls, "pr-8")}
        >
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </label>

      <Row label="Channel">
        <StatusPill tone={CHANNEL_TONE[row.channel]}>
          {CHANNEL_LABEL[row.channel]}
        </StatusPill>
      </Row>
      <Row label="Client">{row.clientName ?? "—"}</Row>

      <div className="space-y-1.5 border-b border-bs-border pb-3">
        <span className="block text-sm text-bs-subtle">Scheduled for</span>
        <div className="flex items-center gap-2">
          <input
            type="datetime-local"
            value={schedule}
            onChange={(e) => setSchedule(e.target.value)}
            className={inputCls}
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={handleReschedule}
            disabled={schedulePending || schedule === toDateTimeLocal(row.scheduledFor)}
          >
            {schedulePending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      <Row label="Added">{dateFmt.format(new Date(row.createdAt))}</Row>

      {row.link?.trim() ? (
        <div className="border-b border-bs-border pb-3">
          <span className="block text-sm text-bs-subtle">Link</span>
          <a
            href={row.link}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 block break-all text-sm text-bs-primary hover:underline"
          >
            {row.link}
          </a>
        </div>
      ) : null}

      <div className="border-b border-bs-border pb-3">
        <span className="block text-sm text-bs-subtle">Caption / copy</span>
        <p className="mt-1 whitespace-pre-wrap text-sm text-bs-text">
          {row.body?.trim() ? row.body : "—"}
        </p>
      </div>

      <div className="border-b border-bs-border pb-3">
        <span className="block text-sm text-bs-subtle">Hashtags</span>
        <p className="mt-1 whitespace-pre-wrap text-sm text-bs-text">
          {row.hashtags?.trim() ? row.hashtags : "—"}
        </p>
      </div>

      <div className="border-b border-bs-border pb-3">
        <span className="block text-sm text-bs-subtle">Notes</span>
        <p className="mt-1 whitespace-pre-wrap text-sm text-bs-text">
          {row.notes?.trim() ? row.notes : "—"}
        </p>
      </div>

      <CastingSection
        kind="content"
        parentId={row.id}
        items={castings}
        talentOptions={talentOptions}
      />

      <div className="space-y-2.5 border-t border-bs-border pt-4">
        <h3 className="text-sm font-medium text-bs-text">Files</h3>
        <Uploader
          context={{ contentItemId: row.id, clientId: row.clientId ?? undefined }}
          configured={storageReady}
        />
        <FileList rows={media} />
      </div>
    </div>
  );
}

function FilterBar({
  clientOptions,
  client,
  channel,
  status,
  onClient,
  onChannel,
  onStatus,
  onReset,
  active,
}: {
  clientOptions: { id: string; name: string }[];
  client: string;
  channel: string;
  status: string;
  onClient: (v: string) => void;
  onChannel: (v: string) => void;
  onStatus: (v: string) => void;
  onReset: () => void;
  active: boolean;
}) {
  const selectCls =
    "h-8 rounded-sm border border-bs-border-strong bg-bs-surface pl-2.5 pr-7 text-sm text-bs-text outline-none";
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <span className="text-eyebrow uppercase text-bs-subtle">Filter</span>
      <select
        aria-label="Filter by client"
        value={client}
        onChange={(e) => onClient(e.target.value)}
        className={selectCls}
      >
        <option value="all">All clients</option>
        <option value="none">No client</option>
        {clientOptions.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <select
        aria-label="Filter by channel"
        value={channel}
        onChange={(e) => onChannel(e.target.value)}
        className={selectCls}
      >
        <option value="all">All channels</option>
        {CHANNEL_ORDER.map((c) => (
          <option key={c} value={c}>
            {CHANNEL_LABEL[c]}
          </option>
        ))}
      </select>
      <select
        aria-label="Filter by status"
        value={status}
        onChange={(e) => onStatus(e.target.value)}
        className={selectCls}
      >
        <option value="all">All statuses</option>
        {STATUS_ORDER.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABEL[s]}
          </option>
        ))}
      </select>
      {active ? (
        <Button variant="ghost" size="sm" onClick={onReset}>
          Clear
        </Button>
      ) : null}
    </div>
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
              {CHANNEL_ORDER.map((c) => (
                <option key={c} value={c}>
                  {CHANNEL_LABEL[c]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select name="status" defaultValue="idea" className={cn(inputCls, "pr-8")}>
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
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

function EditContentDialog({
  row,
  clientOptions,
  onClose,
  onSaved,
}: {
  row: ContentRow;
  clientOptions: { id: string; name: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [state, action, pending] = useActionState(updateContentAction, null);
  const [body, setBody] = React.useState(row.body ?? "");
  const [hashtags, setHashtags] = React.useState(row.hashtags ?? "");
  React.useEffect(() => {
    if (state?.ok) onSaved();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Dialog open onClose={onClose} title="Edit content">
      <form action={action} className="space-y-4">
        <input type="hidden" name="id" value={row.id} />
        <Field label="Title">
          <input
            name="title"
            required
            autoFocus
            defaultValue={row.title}
            className={inputCls}
          />
        </Field>
        <Field label="Client (optional)">
          <select
            name="clientId"
            defaultValue={row.clientId ?? ""}
            className={cn(inputCls, "pr-8")}
          >
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
            <select
              name="channel"
              defaultValue={row.channel}
              className={cn(inputCls, "pr-8")}
            >
              {CHANNEL_ORDER.map((c) => (
                <option key={c} value={c}>
                  {CHANNEL_LABEL[c]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select
              name="status"
              defaultValue={row.status}
              className={cn(inputCls, "pr-8")}
            >
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Scheduled date (optional)">
          <input
            type="datetime-local"
            name="scheduledFor"
            defaultValue={toDateTimeLocal(row.scheduledFor)}
            className={inputCls}
          />
        </Field>
        <Field label="Caption / copy (optional)">
          <textarea
            name="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Post caption or copy…"
            className={textareaCls}
          />
          <AiGenerate
            action={() => draftCaptionAction(row.id)}
            label="Draft caption"
            onResult={(t) => setBody(t)}
          />
        </Field>
        <Field label="Hashtags (optional)">
          <input
            name="hashtags"
            value={hashtags}
            onChange={(e) => setHashtags(e.target.value)}
            placeholder="#reels #behindthescenes"
            className={inputCls}
          />
          <AiGenerate
            action={() => suggestHashtagsAction(row.id)}
            label="Suggest hashtags"
            onResult={(t) => setHashtags(t)}
          />
        </Field>
        <Field label="Link (optional)">
          <input
            name="link"
            type="url"
            defaultValue={row.link ?? ""}
            placeholder="https://…"
            className={inputCls}
          />
        </Field>
        <Field label="Notes (optional)">
          <textarea
            name="notes"
            defaultValue={row.notes ?? ""}
            placeholder="Internal notes…"
            className={textareaCls}
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
            {pending ? "Saving…" : "Save changes"}
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
