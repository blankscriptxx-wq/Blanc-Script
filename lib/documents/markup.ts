/**
 * Parser for Blanc Script document markup ("BSD") — see lib/documents/MARKUP.md.
 *
 * Pure, dependency-free and client-safe. It turns a template body into a tree
 * of typed blocks that is already split into A4 pages (cover, contents,
 * content pages and back cover). It never throws: anything it does not
 * recognise degrades to a paragraph.
 */

export type DocumentVariant = "full" | "short";
export type CalloutColour = "amber" | "teal" | "red";

/** One form field: a small label above a line, with an optional value. */
export interface FieldItem {
  label: string;
  /** The value as a single string ("" when there is nothing to show). */
  value: string;
  /** The value split into display lines (a merged bullet list gives several). */
  lines: string[];
  /** Pale placeholder text shown when there is no value. */
  hint: string;
  /** How many grid columns the field covers (1–3). */
  span: number;
}

export interface SectionBlock {
  type: "section";
  /** "01", "—" or "" (a secondary title with no number). */
  number: string;
  eyebrow: string;
  title: string;
  /** True for `@section | | Title`: a title with a hairline above, left out of the contents. */
  secondary: boolean;
}
export interface IntroBlock {
  type: "intro";
  text: string;
}
export interface DefinitionsBlock {
  type: "definitions";
  items: { term: string; meaning: string }[];
}
export interface ClauseBlock {
  type: "clause";
  number: string;
  heading: string;
  children: TextBlock[];
}
export interface ParagraphBlock {
  type: "paragraph";
  text: string;
}
export interface LetteredBlock {
  type: "lettered";
  items: { letter: string; text: string }[];
}
export interface BulletsBlock {
  type: "bullets";
  items: string[];
}
export interface SubheadingBlock {
  type: "subheading";
  text: string;
}
export interface NoteBlock {
  type: "note";
  text: string;
}
export interface RuleBlock {
  type: "rule";
}
export interface FieldsBlock {
  type: "fields";
  columns: number;
  fields: FieldItem[];
}
export interface ChecksBlock {
  type: "checks";
  columns: number;
  label: string;
  items: { label: string; checked: boolean }[];
}
export interface TableBlock {
  type: "table";
  headers: string[];
  rows: { name: string; hint: string; value: string }[];
}
export interface SummaryBlock {
  type: "summary";
  label: string;
  fields: FieldItem[];
}
export interface PayboxBlock {
  type: "paybox";
  label: string;
  name: string;
  fields: FieldItem[];
}
export interface CalloutBlock {
  type: "callout";
  colour: CalloutColour;
  label: string;
  text: string;
}
export interface StepsBlock {
  type: "steps";
  label: string;
  steps: string[];
}
export interface ColumnsBlock {
  type: "columns";
  columns: Block[][];
}
export interface SignaturesBlock {
  type: "signatures";
  short: boolean;
}

/** The blocks that may sit indented under a clause. */
export type TextBlock = ParagraphBlock | LetteredBlock | BulletsBlock;

export type Block =
  | SectionBlock
  | IntroBlock
  | DefinitionsBlock
  | ClauseBlock
  | ParagraphBlock
  | LetteredBlock
  | BulletsBlock
  | SubheadingBlock
  | NoteBlock
  | RuleBlock
  | FieldsBlock
  | ChecksBlock
  | TableBlock
  | SummaryBlock
  | PayboxBlock
  | CalloutBlock
  | StepsBlock
  | ColumnsBlock
  | SignaturesBlock;

export interface PartyDetails {
  client: string;
  date: string;
  reference: string;
}

export interface ContentsEntry {
  /** As written in the markup: "01", "—"… */
  number: string;
  title: string;
}

export interface CoverPage {
  kind: "cover";
  /** Sheet number, starting at 1. */
  number: number;
  titleLines: string[];
  subtitle: string;
  party: PartyDetails | null;
  /** The small centred sentence under the party box (`@note` after `@party`). */
  note: string;
}
export interface ContentsPage {
  kind: "contents";
  number: number;
  entries: ContentsEntry[];
  /** Anything written after `@contents` and before the next `@page`. */
  blocks: Block[];
}
export interface ContentPage {
  kind: "content";
  number: number;
  blocks: Block[];
}
export interface BackCoverPage {
  kind: "backcover";
  number: number;
  title: string;
  subtitle: string;
}
export type DocumentPage =
  | CoverPage
  | ContentsPage
  | ContentPage
  | BackCoverPage;

export interface ParsedDocument {
  variant: DocumentVariant;
  pages: DocumentPage[];
  /** Every numbered (or `—`) section, in order — what the contents page lists. */
  sections: ContentsEntry[];
}

/** True when the body is BSD markup: its first non-empty line starts with `@doc`. */
export function isRichDocument(body: string): boolean {
  if (typeof body !== "string") return false;
  for (const line of body.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    return /^@doc(\s|$)/i.test(trimmed);
  }
  return false;
}

/**
 * True when a value should leave its line blank: nothing at all, an unfilled
 * merge field such as `[client name]`, or the word "None".
 */
export function isBlankValue(value: string): boolean {
  const v = value.trim();
  if (!v) return true;
  if (/^\[[^\[\]]*\]$/.test(v)) return true;
  if (/^\{\{[^{}]*\}\}$/.test(v)) return true;
  return /^(-\s*)?none\.?$/i.test(v);
}

function splitBar(text: string): string[] {
  return text.split("|").map((part) => part.trim());
}

/** Split `label :: value` at the first `::`. */
function splitLabel(text: string): [string, string] {
  const at = text.indexOf("::");
  if (at < 0) return [text.trim(), ""];
  return [text.slice(0, at).trim(), text.slice(at + 2).trim()];
}

function clampInt(
  raw: string | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  const n = Number.parseInt((raw ?? "").trim(), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/** `LABEL :: value | span=2 | hint=…`, where the value may run over several lines. */
function parseField(raw: string): FieldItem {
  const [label, rest] = splitLabel(raw);
  let span = 1;
  let hint = "";
  const valueLines: string[] = [];
  for (const rawLine of rest.split("\n")) {
    const kept: string[] = [];
    for (const part of splitBar(rawLine)) {
      const option = /^(span|hint)\s*=\s*(.*)$/i.exec(part);
      if (!option) {
        if (part) kept.push(part);
      } else if (option[1].toLowerCase() === "span") {
        span = clampInt(option[2], 1, 1, 3);
      } else {
        hint = option[2].trim();
      }
    }
    const line = kept
      .join(" | ")
      .replace(/^[-•]\s+/, "")
      .trim();
    if (!isBlankValue(line)) valueLines.push(line);
  }
  return { label, value: valueLines.join("\n"), lines: valueLines, hint, span };
}

function parseParty(text: string): PartyDetails {
  const party: PartyDetails = { client: "", date: "", reference: "" };
  for (const part of splitBar(text)) {
    const pair = /^(client|date|reference)\s*=\s*(.*)$/i.exec(part);
    if (!pair) continue;
    const value = isBlankValue(pair[2]) ? "" : pair[2].trim();
    party[pair[1].toLowerCase() as keyof PartyDetails] = value;
  }
  return party;
}

function parseSection(text: string): SectionBlock {
  const parts = splitBar(text);
  let number = "";
  let eyebrow = "";
  let title = "";
  if (parts.length >= 3) {
    number = parts[0];
    eyebrow = parts[1];
    title = parts.slice(2).join(" | ");
  } else if (parts.length === 2) {
    if (/^(\d+|[—–-])$/.test(parts[0])) number = parts[0];
    else eyebrow = parts[0];
    title = parts[1];
  } else {
    title = parts[0] ?? "";
  }
  if (/^[–-]$/.test(number)) number = "—";
  return {
    type: "section",
    number,
    eyebrow,
    title,
    secondary: !number && !eyebrow,
  };
}

function parseCalloutColour(raw: string): CalloutColour {
  const colour = raw.trim().toLowerCase();
  return colour === "teal" || colour === "red" ? colour : "amber";
}

type OpenForm =
  | { kind: "fields"; block: FieldsBlock; raws: string[]; implicit: boolean }
  | { kind: "summary"; block: SummaryBlock; raws: string[]; implicit: boolean }
  | { kind: "paybox"; block: PayboxBlock; raws: string[]; implicit: boolean }
  | { kind: "checks"; block: ChecksBlock }
  | { kind: "table"; block: TableBlock };

/** Parse a BSD body into pages of blocks. Never throws. */
export function parseDocument(body: string): ParsedDocument {
  const lines = (typeof body === "string" ? body : "").split(/\r?\n/);
  const pages: DocumentPage[] = [];
  const sections: ContentsEntry[] = [];
  let variant: DocumentVariant = "full";

  /** The page new blocks go on; null means "start a new sheet when something arrives". */
  let page: ContentPage | ContentsPage | null = null;
  let cover: CoverPage | null = null;
  /** True while directly after @cover/@party, when a @note belongs to the cover. */
  let onCover = false;
  let columns: { block: ColumnsBlock; index: number } | null = null;
  let clause: ClauseBlock | null = null;
  let form: OpenForm | null = null;
  /** A blank line ends a run of list items. */
  let gap = true;

  const target = (): Block[] => {
    if (columns) return columns.block.columns[columns.index];
    if (!page) {
      page = { kind: "content", number: 0, blocks: [] };
      pages.push(page);
    }
    return page.blocks;
  };

  const closeForm = () => {
    if (!form) return;
    if (
      form.kind === "fields" ||
      form.kind === "summary" ||
      form.kind === "paybox"
    ) {
      form.block.fields = form.raws.map(parseField);
    }
    form = null;
  };

  /** Add a block at the current position, ending any open clause or form. */
  const push = (block: Block) => {
    closeForm();
    clause = null;
    onCover = false;
    target().push(block);
  };

  /** Add running text: under the open clause if there is one. */
  const pushText = (
    make: () => TextBlock,
    extend: (last: Block | undefined) => boolean,
  ) => {
    closeForm();
    onCover = false;
    const list: Block[] = clause ? clause.children : target();
    if (!gap && extend(list[list.length - 1])) return;
    list.push(make());
  };

  const text = (line: string) => {
    const lettered = /^([a-z]{1,3})\)\s+(.+)$/.exec(line);
    if (lettered) {
      const item = { letter: lettered[1], text: lettered[2].trim() };
      pushText(
        () => ({ type: "lettered", items: [item] }),
        (last) =>
          last?.type === "lettered" ? (last.items.push(item), true) : false,
      );
      return;
    }
    const bullet = /^[-•]\s+(.+)$/.exec(line);
    if (bullet) {
      const item = bullet[1].trim();
      pushText(
        () => ({ type: "bullets", items: [item] }),
        (last) =>
          last?.type === "bullets" ? (last.items.push(item), true) : false,
      );
      return;
    }
    pushText(
      () => ({ type: "paragraph", text: line }),
      () => false,
    );
  };

  const openFields = (
    kind: "fields" | "summary" | "paybox",
    arg: string,
    implicit = false,
  ) => {
    if (kind === "fields") {
      const block: FieldsBlock = {
        type: "fields",
        columns: clampInt(arg, 2, 1, 3),
        fields: [],
      };
      push(block);
      form = { kind, block, raws: [], implicit };
    } else if (kind === "summary") {
      const block: SummaryBlock = {
        type: "summary",
        label: arg.trim(),
        fields: [],
      };
      push(block);
      form = { kind, block, raws: [], implicit };
    } else {
      const [label, name = ""] = splitBar(arg);
      const block: PayboxBlock = { type: "paybox", label, name, fields: [] };
      push(block);
      form = { kind, block, raws: [], implicit };
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      gap = true;
      continue;
    }

    const directive = /^@([a-z]+)(?:\s+(.*))?$/i.exec(line);
    const name = directive ? directive[1].toLowerCase() : "";
    const arg = directive ? (directive[2] ?? "").trim() : "";

    // Lines inside an open form block.
    if (form && !directive) {
      // `form` is reassigned inside helper closures, which TypeScript's narrowing can't follow.
      const open = form as OpenForm;
      if (open.kind === "checks") {
        const tick = /^\[\s*([xX✓✔]?)\s*\]\s*(.*)$/.exec(line);
        open.block.items.push(
          tick
            ? { label: tick[2].trim(), checked: tick[1] !== "" }
            : { label: line, checked: false },
        );
        gap = false;
        continue;
      }
      if (open.kind === "table") {
        const [left, value] = splitLabel(line);
        const hinted = /^(.*?)\s*\(([^()]*)\)$/.exec(left);
        open.block.rows.push({
          name: hinted ? hinted[1].trim() : left,
          hint: hinted ? hinted[2].trim() : "",
          value: isBlankValue(value) ? "" : value,
        });
        gap = false;
        continue;
      }
      // A merged value can run over several lines ("- Extra shoot day…").
      if (open.raws.length > 0 && !open.implicit) {
        open.raws[open.raws.length - 1] += `\n${line}`;
        gap = false;
        continue;
      }
      if (open.raws.length > 0 && /^[-•]\s|^\|/.test(line)) {
        open.raws[open.raws.length - 1] += `\n${line}`;
        gap = false;
        continue;
      }
    }

    if (!directive) {
      text(line);
      gap = false;
      continue;
    }

    switch (name) {
      case "doc":
        variant = arg.toLowerCase().startsWith("short") ? "short" : "full";
        break;
      case "cover": {
        closeForm();
        clause = null;
        columns = null;
        const [title = "", subtitle = ""] = splitBar(arg);
        cover = {
          kind: "cover",
          number: 0,
          titleLines: title
            .split("/")
            .map((part) => part.trim())
            .filter(Boolean),
          subtitle,
          party: null,
          note: "",
        };
        pages.push(cover);
        page = null;
        onCover = true;
        break;
      }
      case "party":
        if (cover && onCover) cover.party = parseParty(arg);
        else if (cover && !cover.party) cover.party = parseParty(arg);
        else text(line);
        break;
      case "contents": {
        closeForm();
        clause = null;
        columns = null;
        onCover = false;
        const contents: ContentsPage = {
          kind: "contents",
          number: 0,
          entries: sections,
          blocks: [],
        };
        pages.push(contents);
        page = contents;
        break;
      }
      case "page":
        closeForm();
        clause = null;
        columns = null;
        onCover = false;
        // The next block opens the new sheet, so an unused @page never leaves a blank one.
        page = null;
        break;
      case "backcover": {
        closeForm();
        clause = null;
        columns = null;
        onCover = false;
        const [title = "", subtitle = ""] = splitBar(arg);
        pages.push({ kind: "backcover", number: 0, title, subtitle });
        page = null;
        break;
      }
      case "section": {
        const section = parseSection(arg);
        push(section);
        if (!section.secondary && section.title)
          sections.push({ number: section.number, title: section.title });
        break;
      }
      case "intro":
        push({ type: "intro", text: arg });
        break;
      case "def": {
        closeForm();
        clause = null;
        onCover = false;
        const [term, meaning] = splitLabel(arg);
        const list = target();
        const last = list[list.length - 1];
        if (last && last.type === "definitions")
          last.items.push({ term, meaning });
        else list.push({ type: "definitions", items: [{ term, meaning }] });
        break;
      }
      case "clause": {
        const parts = splitBar(arg);
        const block: ClauseBlock = {
          type: "clause",
          number: parts.length > 1 ? parts[0].replace(/\.$/, "") : "",
          heading:
            parts.length > 1 ? parts.slice(1).join(" | ") : (parts[0] ?? ""),
          children: [],
        };
        push(block);
        clause = block;
        break;
      }
      case "sub":
        push({ type: "subheading", text: arg });
        break;
      case "note":
        if (cover && onCover)
          cover.note = cover.note ? `${cover.note} ${arg}` : arg;
        else push({ type: "note", text: arg });
        break;
      case "rule":
        push({ type: "rule" });
        break;
      case "fields":
        openFields("fields", arg);
        break;
      case "summary":
        openFields("summary", arg);
        break;
      case "paybox":
        openFields("paybox", arg);
        break;
      case "field": {
        const open = form as OpenForm | null;
        if (
          open &&
          (open.kind === "fields" ||
            open.kind === "summary" ||
            open.kind === "paybox")
        ) {
          open.raws.push(arg);
        } else {
          // A stray @field starts its own two-column grid.
          openFields("fields", "2", true);
          const implicit = form as OpenForm | null;
          if (implicit && implicit.kind === "fields") implicit.raws.push(arg);
        }
        break;
      }
      case "endfields":
      case "endsummary":
      case "endpaybox":
      case "endchecks":
      case "endtable":
        closeForm();
        break;
      case "checks": {
        const [count, label = ""] = splitBar(arg);
        const block: ChecksBlock = {
          type: "checks",
          columns: clampInt(count, 3, 1, 4),
          label,
          items: [],
        };
        push(block);
        form = { kind: "checks", block };
        break;
      }
      case "table": {
        const block: TableBlock = {
          type: "table",
          headers: splitBar(arg).filter(Boolean),
          rows: [],
        };
        push(block);
        form = { kind: "table", block };
        break;
      }
      case "callout": {
        const [head, body_] = splitLabel(arg);
        const parts = splitBar(head);
        const hasColour = parts.length > 1;
        push({
          type: "callout",
          colour: parseCalloutColour(hasColour ? parts[0] : "amber"),
          label: hasColour ? parts.slice(1).join(" | ") : (parts[0] ?? ""),
          text: body_,
        });
        break;
      }
      case "steps": {
        const hasLabel = arg.includes("::");
        const [label, rest] = hasLabel ? splitLabel(arg) : ["", arg];
        push({ type: "steps", label, steps: splitBar(rest).filter(Boolean) });
        break;
      }
      case "cols": {
        const block: ColumnsBlock = { type: "columns", columns: [[]] };
        push(block);
        columns = { block, index: 0 };
        break;
      }
      case "col":
        closeForm();
        clause = null;
        if (columns) {
          columns.block.columns.push([]);
          columns.index += 1;
        }
        break;
      case "endcols":
        closeForm();
        clause = null;
        columns = null;
        break;
      case "signatures":
        push({ type: "signatures", short: /^short/i.test(arg) });
        break;
      default:
        // Unknown directive: keep its words as a paragraph.
        text(arg || line);
        break;
    }
    gap = true;
  }
  closeForm();

  pages.forEach((p, index) => {
    p.number = index + 1;
  });
  return { variant, pages, sections };
}
