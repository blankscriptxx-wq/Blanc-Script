/** Turns a script's text into timed beats and labelled lines for the run sheet. */

export type LineKind = "say" | "camera" | "visual" | "sound" | "cut" | "note";
export type ScriptLine = { kind: LineKind; label: string; text: string };
export type ScriptBeat = { time: string | null; heading: string | null; lines: ScriptLine[] };

const KINDS: Record<string, LineKind> = {
  say: "say",
  line: "say",
  lines: "say",
  dialogue: "say",
  vo: "say",
  voiceover: "say",
  camera: "camera",
  shot: "camera",
  visual: "visual",
  visuals: "visual",
  action: "visual",
  "on screen": "visual",
  sound: "sound",
  audio: "sound",
  music: "sound",
  sfx: "sound",
  "set-up": "camera",
  setup: "camera",
  "set up": "camera",
  phone: "camera",
  do: "visual",
  "b-roll": "visual",
  cutaway: "visual",
  tip: "note",
  cut: "cut",
  edit: "cut",
  transition: "cut",
};

const BEAT = /^(\d+(?:[.:]\d+)?\s*(?:s|sec)?\s*[–—-]\s*\d+(?:[.:]\d+)?\s*(?:s|secs?|seconds)?)\s*(?:[·•|:–—-]\s*(.+))?$/i;
const SHOT = /^shot\s*(\d+)\s*(?:[·•|:.–—-]\s*(.+))?$/i;
const LABELLED = /^([A-Za-z][A-Za-z -]{1,13}):\s*(.+)$/;

export function parseScript(body: string | null): ScriptBeat[] {
  const beats: ScriptBeat[] = [];
  let cur: ScriptBeat | null = null;
  for (const raw of (body ?? "").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const b = line.match(BEAT);
    if (b) {
      cur = { time: b[1].replace(/\s+/g, ""), heading: b[2]?.trim() || null, lines: [] };
      beats.push(cur);
      continue;
    }
    const sh = line.match(SHOT);
    if (sh) {
      cur = { time: null, heading: sh[2]?.trim() || `Shot ${sh[1]}`, lines: [] };
      beats.push(cur);
      continue;
    }
    if (!cur) {
      cur = { time: null, heading: null, lines: [] };
      beats.push(cur);
    }
    const l = line.match(LABELLED);
    const kind = l ? KINDS[l[1].trim().toLowerCase()] : undefined;
    if (l && kind) cur.lines.push({ kind, label: l[1].trim(), text: l[2].trim() });
    else cur.lines.push({ kind: "note", label: "", text: line });
  }
  return beats;
}

/** True when the script has timed beats or labelled lines worth breaking down. */
export function isStructured(beats: ScriptBeat[]): boolean {
  return beats.some((b) => b.time || b.lines.some((l) => l.kind !== "note"));
}

/** Leading "Key: value" lines become quick facts; the rest stays as notes. */
export function parseNotes(notes: string | null): { facts: { label: string; value: string }[]; text: string } {
  const facts: { label: string; value: string }[] = [];
  const rest: string[] = [];
  let head = true;
  for (const raw of (notes ?? "").split(/\r?\n/)) {
    const line = raw.trim();
    const m = head ? line.match(/^([A-Za-z][A-Za-z ]{1,13}):\s*(\S.*)$/) : null;
    if (m) facts.push({ label: m[1].trim(), value: m[2].trim() });
    else {
      if (line) head = false;
      rest.push(line);
    }
  }
  return { facts, text: rest.join("\n").trim() };
}
