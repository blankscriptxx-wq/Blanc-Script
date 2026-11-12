"use client";
import * as React from "react";
import { useActionState } from "react";
import { Brain, Check, Plus, Sparkles, X } from "lucide-react";
import {
  addKnowledgeAction,
  approveKnowledgeAction,
  dismissKnowledgeAction,
  researchClientAction,
  setAutoResearchAction,
  saveProfileAction,
} from "@/app/(os)/(app)/clients/[id]/strategy/actions";
import { AiGenerate } from "@/components/ai/ai-generate";
import { Button } from "@/components/ds/button";
import { StatusPill } from "@/components/ds/status-pill";
import type { ClientProfile, KnowledgeKind, KnowledgeRow } from "@/lib/data/client-brain";
import { cn } from "@/lib/cn";

const inputCls =
  "h-9 w-full rounded-sm border border-bs-border-strong bg-bs-surface px-3 text-body text-bs-text outline-none placeholder:text-bs-subtle";
const textareaCls =
  "w-full rounded-sm border border-bs-border-strong bg-bs-surface px-3 py-2 text-body text-bs-text outline-none placeholder:text-bs-subtle";
const labelCls = "block text-sm font-medium text-bs-text";

const KIND_ORDER: KnowledgeKind[] = [
  "brand",
  "audience",
  "competitor",
  "guideline",
  "insight",
  "performance",
];

const KIND_LABEL: Record<KnowledgeKind, string> = {
  brand: "Brand",
  audience: "Audience",
  competitor: "Competitor",
  guideline: "Guideline",
  insight: "Insight",
  performance: "Performance",
};

const KIND_TONE: Record<
  KnowledgeKind,
  "info" | "accent" | "gold" | "success" | "warning" | "neutral"
> = {
  brand: "accent",
  audience: "info",
  competitor: "warning",
  guideline: "gold",
  insight: "success",
  performance: "neutral",
};

function KindPill({ kind }: { kind: KnowledgeKind }) {
  return <StatusPill tone={KIND_TONE[kind]}>{KIND_LABEL[kind]}</StatusPill>;
}

function SectionHeading({
  icon,
  title,
  hint,
}: {
  icon?: React.ReactNode;
  title: string;
  hint?: string;
}) {
  return (
    <div className="space-y-1">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-bs-text">
        {icon}
        {title}
      </h2>
      {hint ? <p className="text-xs text-bs-subtle">{hint}</p> : null}
    </div>
  );
}

export function BrainPanel({
  clientId,
  profile,
  proposed,
  approved,
  aiReady,
}: {
  clientId: string;
  profile: ClientProfile;
  proposed: KnowledgeRow[];
  approved: KnowledgeRow[];
  aiReady: boolean;
}) {
  const [profileState, saveProfile, savingProfile] = useActionState(saveProfileAction, {});
  const [addState, addKnowledge, addingKnowledge] = useActionState(addKnowledgeAction, {});
  const addFormRef = React.useRef<HTMLFormElement>(null);

  // Clear the "Add to brain" form once an entry has been accepted.
  React.useEffect(() => {
    if (addState?.ok) addFormRef.current?.reset();
  }, [addState?.ok]);

  const grouped = KIND_ORDER.map((kind) => ({
    kind,
    rows: approved.filter((row) => row.kind === kind),
  })).filter((group) => group.rows.length > 0);

  return (
    <div className="space-y-10">
      {/* 1 ── Run research ─────────────────────────────────────────────── */}
      <section className="space-y-3">
        <SectionHeading
          icon={<Sparkles className="h-5 w-5 text-bs-primary" />}
          title="Run research"
          hint="Uses web search to study the niche & competitors; proposes findings below for your approval."
        />
        {aiReady ? (
          <>
            <AiGenerate
              action={() => researchClientAction(clientId)}
              label="Research this client"
            />
            <AutoResearchToggle
              clientId={clientId}
              enabled={profile.autoResearch}
              researchedAt={profile.researchedAt}
            />
          </>
        ) : (
          <p className="text-sm text-bs-subtle">
            Connect AI in Settings → Integrations to run research.
          </p>
        )}
      </section>

      {/* 2 ── Brand profile ────────────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionHeading
          icon={<Brain className="h-5 w-5 text-bs-primary" />}
          title="Brand profile"
          hint="The core brief every script and idea is built from."
        />
        <form action={saveProfile} className="space-y-4">
          <input type="hidden" name="clientId" value={clientId} />
          <label className="block space-y-1.5">
            <span className={labelCls}>Brand summary</span>
            <textarea
              name="brandSummary"
              rows={3}
              defaultValue={profile.brandSummary ?? ""}
              placeholder="Who the client is and what they stand for."
              className={textareaCls}
            />
          </label>
          <label className="block space-y-1.5">
            <span className={labelCls}>Audience</span>
            <textarea
              name="audience"
              rows={2}
              defaultValue={profile.audience ?? ""}
              placeholder="Who we are speaking to."
              className={textareaCls}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className={labelCls}>Tone of voice</span>
              <input
                name="tone"
                defaultValue={profile.tone ?? ""}
                placeholder="e.g. warm, confident, playful"
                className={inputCls}
              />
            </label>
            <label className="block space-y-1.5">
              <span className={labelCls}>Content pillars</span>
              <input
                name="pillars"
                defaultValue={profile.pillars.join(", ")}
                placeholder="Comma-separated, e.g. education, behind-the-scenes"
                className={inputCls}
              />
            </label>
          </div>
          <label className="block space-y-1.5">
            <span className={labelCls}>Do's & don'ts</span>
            <textarea
              name="dosAndDonts"
              rows={3}
              defaultValue={profile.dosAndDonts ?? ""}
              placeholder="Guardrails for everything we make."
              className={textareaCls}
            />
          </label>
          <label className="block space-y-1.5">
            <span className={labelCls}>Notes</span>
            <textarea
              name="notes"
              rows={3}
              defaultValue={profile.notes ?? ""}
              placeholder="Anything else worth remembering."
              className={textareaCls}
            />
          </label>
          {profileState?.error ? (
            <p className="text-sm text-bs-danger">{profileState.error}</p>
          ) : null}
          {profileState?.ok ? <p className="text-sm text-bs-success">Saved.</p> : null}
          <div className="flex justify-end pt-1">
            <Button type="submit" disabled={savingProfile}>
              {savingProfile ? "Saving…" : "Save profile"}
            </Button>
          </div>
        </form>
      </section>

      {/* 3 ── Proposed findings ────────────────────────────────────────── */}
      {proposed.length > 0 ? (
        <section className="space-y-4">
          <SectionHeading
            title="Proposed findings"
            hint="Approve what belongs in the brain; dismiss the rest."
          />
          <ul className="space-y-3">
            {proposed.map((row) => (
              <li
                key={row.id}
                className="rounded-md border border-bs-border bg-bs-surface p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <KindPill kind={row.kind} />
                  <span className="font-medium text-bs-text">{row.title}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-bs-muted">
                  {row.content}
                </p>
                {row.source ? (
                  <p className="mt-1 text-xs text-bs-subtle">Source: {row.source}</p>
                ) : null}
                <div className="mt-3 flex items-center gap-2">
                  <form action={approveKnowledgeAction}>
                    <input type="hidden" name="id" value={row.id} />
                    <input type="hidden" name="clientId" value={clientId} />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 rounded-sm bg-bs-success-soft px-2.5 py-1.5 text-xs font-medium text-bs-success transition-colors hover:opacity-90"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Approve
                    </button>
                  </form>
                  <form action={dismissKnowledgeAction}>
                    <input type="hidden" name="id" value={row.id} />
                    <input type="hidden" name="clientId" value={clientId} />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 rounded-sm bg-bs-neutral-soft px-2.5 py-1.5 text-xs font-medium text-bs-subtle transition-colors hover:text-bs-text"
                    >
                      <X className="h-3.5 w-3.5" />
                      Dismiss
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* 4 ── Knowledge base ───────────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionHeading
          title="Knowledge base"
          hint="Everything the strategist knows about this client."
        />
        {grouped.length > 0 ? (
          <div className="space-y-6">
            {grouped.map((group) => (
              <div key={group.kind} className="space-y-2">
                <div className="flex items-center gap-2">
                  <KindPill kind={group.kind} />
                  <span className="text-xs text-bs-subtle">{group.rows.length}</span>
                </div>
                <ul className="space-y-2">
                  {group.rows.map((row) => (
                    <li
                      key={row.id}
                      className="rounded-md border border-bs-border bg-bs-surface p-3"
                    >
                      <p className="text-sm font-medium text-bs-text">{row.title}</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-bs-muted">
                        {row.content}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-bs-subtle">
            Nothing in the brain yet — run research or add an entry below.
          </p>
        )}

        {/* Add to brain */}
        <form
          ref={addFormRef}
          action={addKnowledge}
          className={cn(
            "space-y-3 rounded-md border border-dashed border-bs-border-strong bg-bs-surface-2 p-4",
          )}
        >
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-bs-primary" />
            <span className="text-sm font-medium text-bs-text">Add to brain</span>
          </div>
          <input type="hidden" name="clientId" value={clientId} />
          <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
            <label className="block space-y-1.5">
              <span className={labelCls}>Kind</span>
              <select name="kind" defaultValue="insight" className={inputCls}>
                {KIND_ORDER.map((kind) => (
                  <option key={kind} value={kind}>
                    {KIND_LABEL[kind]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1.5">
              <span className={labelCls}>Title</span>
              <input
                name="title"
                required
                maxLength={200}
                placeholder="A short, memorable name."
                className={inputCls}
              />
            </label>
          </div>
          <label className="block space-y-1.5">
            <span className={labelCls}>Content</span>
            <textarea
              name="content"
              rows={3}
              required
              maxLength={4000}
              placeholder="What the strategist should remember."
              className={textareaCls}
            />
          </label>
          {addState?.error ? (
            <p className="text-sm text-bs-danger">{addState.error}</p>
          ) : null}
          {addState?.ok ? <p className="text-sm text-bs-success">Added to the brain.</p> : null}
          <div className="flex justify-end">
            <Button type="submit" variant="secondary" size="sm" disabled={addingKnowledge}>
              {addingKnowledge ? "Adding…" : "Add to brain"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}

function AutoResearchToggle({
  clientId,
  enabled,
  researchedAt,
}: {
  clientId: string;
  enabled: boolean;
  researchedAt: Date | null;
}) {
  const [on, setOn] = React.useState(enabled);
  const [pending, startTransition] = React.useTransition();
  const last = researchedAt
    ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "Europe/London" }).format(
        new Date(researchedAt),
      )
    : null;
  return (
    <label className="flex flex-wrap items-center gap-2 text-sm text-bs-muted">
      <input
        type="checkbox"
        checked={on}
        disabled={pending}
        onChange={(e) => {
          const next = e.currentTarget.checked;
          setOn(next);
          startTransition(() => setAutoResearchAction(clientId, next));
        }}
      />
      <span>
        Refresh this research automatically every month
        <span className="text-bs-subtle">
          {" "}
          · {last ? `last researched ${last}` : "not researched yet"}. New findings still wait
          for your approval.
        </span>
      </span>
    </label>
  );
}
