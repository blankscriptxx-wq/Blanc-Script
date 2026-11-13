import { isStructured, parseNotes, parseScript, type LineKind } from "@/lib/scripts/breakdown";
import { Check } from "lucide-react";
import type { RunSheetScript } from "@/lib/data/shoots";

/** Who is reading: everything, just the lines to say, or just the shots. */
export type SheetView = "all" | "lines" | "shots";

const TAG: Record<Exclude<LineKind, "say" | "note">, { label: string; cls: string }> = {
  camera: { label: "Camera", cls: "bg-bs-accent/15 text-bs-accent" },
  visual: { label: "Action", cls: "bg-bs-surface-2 text-bs-muted" },
  sound: { label: "Sound", cls: "bg-bs-gold-soft text-bs-gold-ink" },
  cut: { label: "Edit", cls: "bg-bs-surface-2 text-bs-muted" },
};

/** For a client filming themselves, say it in everyday words. */
const SELF_LABEL: Partial<Record<LineKind, string>> = { camera: "Set-up", visual: "Do" };

const shows = (view: SheetView, kind: LineKind) =>
  view === "all" || (view === "lines" ? kind === "say" : kind !== "say");

/** One script, broken into timed beats: what to say, and how it is shot. */
export function ScriptBreakdown({
  script,
  view,
  done,
  onTick,
}: {
  script: Pick<RunSheetScript, "body" | "notes" | "hookVisual" | "hookScript" | "style">;
  view: SheetView;
  /** Shots already ticked (by position). Shows a tick box on every shot when given. */
  done?: number[];
  /** Makes the tick boxes tappable. */
  onTick?: (index: number, done: boolean) => void;
}) {
  const self = script.style === "self";
  const beats = parseScript(script.body);
  const structured = isStructured(beats);
  const { facts, text: notes } = parseNotes(script.notes);
  const ticked = (i: number) => Boolean(done?.includes(i));

  return (
    <div className="space-y-5">
      {facts.length ? (
        <dl className="flex flex-wrap gap-2">
          {facts.map((f) => (
            <div key={f.label} className="rounded-sm bg-bs-surface-2 px-2.5 py-1.5 text-sm">
              <dt className="inline text-bs-subtle">{f.label}: </dt>
              <dd className="inline font-medium text-bs-text">{f.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {!structured ? (
        <div className="space-y-4">
          {script.hookVisual && view !== "lines" ? <Plain label="Opening shot" text={script.hookVisual} /> : null}
          {script.hookScript && view !== "shots" ? <Plain label="Opening line" text={script.hookScript} big /> : null}
          {script.body ? <Plain label="Script" text={script.body} big /> : null}
        </div>
      ) : (
        <ol className="space-y-5">
          {beats.map((b, i) => {
            const lines = b.lines.filter((l) => shows(view, l.kind));
            if (!lines.length) return null;
            return (
              <li key={i} className={ticked(i) ? "opacity-60" : undefined}>
                {b.time || b.heading || done ? (
                  <div className="mb-2 flex items-center gap-2 border-b border-bs-border pb-1.5">
                    {done ? (
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={ticked(i)}
                        aria-label={`Shot ${i + 1}${b.heading ? `, ${b.heading}` : ""}: filmed`}
                        disabled={!onTick}
                        onClick={() => onTick?.(i, !ticked(i))}
                        className={
                          "grid h-8 w-8 shrink-0 place-items-center rounded-md border-2 transition-colors " +
                          (ticked(i) ? "border-bs-success bg-bs-success text-white" : "border-bs-border-strong bg-bs-surface text-transparent") +
                          (onTick ? " hover:border-bs-success" : "")
                        }
                      >
                        <Check className="h-5 w-5" />
                      </button>
                    ) : (
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-bs-text text-xs font-semibold text-bs-surface">
                        {i + 1}
                      </span>
                    )}
                    <span className="min-w-0 break-words text-sm font-semibold uppercase tracking-wide text-bs-text">
                      {done ? `${self ? "Shot" : ""} ${i + 1}${b.heading ? " · " : ""}`.trimStart() : null}
                      {b.heading}
                    </span>
                    {b.time ? <span className="ml-auto shrink-0 text-sm tabular-nums text-bs-subtle">{b.time}</span> : null}
                  </div>
                ) : null}
                <ul className="space-y-2">
                  {lines.map((l, j) =>
                    l.kind === "say" ? (
                      <li key={j} className="border-l-4 border-bs-primary pl-3">
                        <span className="block text-xs font-semibold uppercase tracking-wide text-bs-primary">Say</span>
                        <span className="block break-words text-[1.35rem] font-medium leading-snug text-bs-text">{l.text}</span>
                      </li>
                    ) : l.kind === "note" ? (
                      <li key={j} className="break-words text-body leading-relaxed text-bs-muted">
                        {l.text}
                      </li>
                    ) : (
                      <li key={j} className="flex items-start gap-2.5">
                        <span className={"mt-0.5 w-16 shrink-0 rounded-sm px-1.5 py-0.5 text-center text-xs font-semibold " + TAG[l.kind].cls}>
                          {(self && SELF_LABEL[l.kind]) || TAG[l.kind].label}
                        </span>
                        <span className="min-w-0 break-words text-body leading-relaxed text-bs-text">{l.text}</span>
                      </li>
                    ),
                  )}
                </ul>
              </li>
            );
          })}
        </ol>
      )}

      {notes && view !== "lines" ? <Plain label={self ? "Tips" : "Director's notes"} text={notes} /> : null}
    </div>
  );
}

function Plain({ label, text, big }: { label: string; text: string; big?: boolean }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-bs-subtle">{label}</p>
      <p className={"mt-1 whitespace-pre-wrap break-words leading-relaxed text-bs-text " + (big ? "text-lg" : "text-body")}>{text.trim()}</p>
    </div>
  );
}
