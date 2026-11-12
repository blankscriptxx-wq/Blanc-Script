import type { CSSProperties, ReactNode } from "react";

import { RICH_DOCUMENT_CSS } from "@/components/documents/rich-document-styles";
import {
  parseDocument,
  type Block,
  type ContentPage,
  type ContentsPage,
  type CoverPage,
  type BackCoverPage,
  type DocumentVariant,
  type FieldItem,
  type SectionBlock,
  type TextBlock,
} from "@/lib/documents/markup";

const LOGO_DARK = "/brand/logo-dark.png";
const LOGO_LIGHT = "/brand/logo-light.png";
const SQUIGGLE = "/brand/squiggle.png";

export interface RichDocumentAcceptance {
  /** The name the client typed when accepting in the portal. */
  name: string;
  at: Date;
}

export interface RichDocumentStudio {
  /** Who signs for Blanc Script. */
  name: string;
  date?: Date | null;
}

export interface RichDocumentProps {
  /** BSD markup — see lib/documents/MARKUP.md. */
  body: string;
  acceptance?: RichDocumentAcceptance | null;
  studio?: RichDocumentStudio | null;
}

interface RenderContext {
  variant: DocumentVariant;
  acceptance: RichDocumentAcceptance | null;
  studio: RichDocumentStudio | null;
}

const LONG_DATE = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/London",
});

function formatDate(date: Date | null | undefined): string {
  if (!date) return "";
  const value = date instanceof Date ? date : new Date(date);
  return Number.isNaN(value.getTime()) ? "" : LONG_DATE.format(value);
}

function cols(count: number): CSSProperties {
  return { "--cols": count } as CSSProperties;
}

/** "01" → "1" for the contents list; a dash stays a dash. */
function contentsNumber(number: string): string {
  return /^\d+$/.test(number)
    ? String(Number.parseInt(number, 10))
    : number || "—";
}

/**
 * Running text. Words joined by a hyphen or slash stay on one line, as they do
 * in the PDF (which only ever breaks a line at a space).
 */
function Words({ text }: { text: string }) {
  if (!/\S[-/–]\S/.test(text)) return <>{text}</>;
  return (
    <>
      {text.split(/(\s+)/).map((token, index) =>
        /\S[-/–]\S/.test(token) ? (
          <span key={index} className="bsd-nb">
            {token}
          </span>
        ) : (
          token
        ),
      )}
    </>
  );
}

function Squiggle() {
  return <img className="bsd-squiggle" src={SQUIGGLE} alt="" />;
}

function SectionHeader({ block }: { block: SectionBlock }) {
  return (
    <header
      className={
        block.secondary ? "bsd-section bsd-section--secondary" : "bsd-section"
      }
    >
      {!block.secondary && (
        <p className="bsd-eyebrow">
          {block.number && (
            <span className="bsd-eyebrow-num">{block.number}</span>
          )}
          {block.eyebrow && (
            <span className="bsd-eyebrow-text">{block.eyebrow}</span>
          )}
        </p>
      )}
      <h2>
        <span className="bsd-title">
          <span className="bsd-title-text">{block.title}</span>
          <Squiggle />
        </span>
      </h2>
    </header>
  );
}

function Field({ field }: { field: FieldItem }) {
  const filled = field.lines.length > 0;
  return (
    <div
      className="bsd-field"
      style={field.span > 1 ? { gridColumn: `span ${field.span}` } : undefined}
    >
      <div className="bsd-field-label">{field.label}</div>
      <div
        className={
          filled || !field.hint ? "bsd-field-value" : "bsd-field-value is-hint"
        }
      >
        {filled
          ? field.lines.map((line, index) => <div key={index}>{line}</div>)
          : field.hint || null}
      </div>
    </div>
  );
}

function Fields({ fields, columns }: { fields: FieldItem[]; columns: number }) {
  // A block made only of full-width fields is set a little tighter, as in the PDF.
  const stacked =
    columns > 1 &&
    fields.length > 0 &&
    fields.every((field) => field.span >= columns);
  return (
    <div
      className={stacked ? "bsd-fields bsd-fields--stack" : "bsd-fields"}
      data-cols={columns}
      style={cols(columns)}
    >
      {fields.map((field, index) => (
        <Field key={index} field={field} />
      ))}
    </div>
  );
}

function TextBlocks({ blocks }: { blocks: TextBlock[] }) {
  return (
    <>
      {blocks.map((block, index) => (
        <BlockView key={index} block={block} context={null} />
      ))}
    </>
  );
}

interface Signatory {
  title: string;
  sub: string;
  signature: string;
  name: string;
  date: string;
  accepted: boolean;
}

function SignRow({
  label,
  value,
  script,
}: {
  label: string;
  value: string;
  script?: boolean;
}) {
  return (
    <div className="bsd-sign-row">
      <div className={script ? "bsd-sign-value is-script" : "bsd-sign-value"}>
        {value}
      </div>
      <div className="bsd-sign-label">{label}</div>
    </div>
  );
}

function Signatures({
  short,
  context,
}: {
  short: boolean;
  context: RenderContext;
}) {
  const { acceptance, studio } = context;
  const parties: Signatory[] = [
    {
      title: "For the Client",
      sub: short
        ? "Signed for and on behalf of the Client"
        : "Signed for and on behalf of the Client named in Section 2",
      signature: acceptance?.name ?? "",
      name: acceptance?.name ?? "",
      date: formatDate(acceptance?.at),
      accepted: Boolean(acceptance),
    },
    {
      title: "For Blanc Script",
      sub: "Signed for and on behalf of Blanc Script",
      signature: studio?.name ?? "",
      name: studio?.name ?? "",
      date: formatDate(studio?.date),
      accepted: false,
    },
  ];
  return (
    <div className={short ? "bsd-sign bsd-sign--short" : "bsd-sign"}>
      {parties.map((party) => (
        <section key={party.title} className="bsd-sign-party">
          <h3>{party.title}</h3>
          <p className="bsd-sign-sub">{party.sub}</p>
          <div className="bsd-sign-rows">
            <SignRow label="Signature" value={party.signature} script />
            {short ? (
              <div className="bsd-sign-pair">
                <SignRow label="Printed name" value={party.name} />
                <SignRow label="Date" value={party.date} />
              </div>
            ) : (
              <>
                <SignRow label="Printed name" value={party.name} />
                <SignRow label="Position" value="" />
                <SignRow label="Date" value={party.date} />
              </>
            )}
          </div>
          {party.accepted && (
            <p className="bsd-sign-accepted">
              Accepted electronically in the client portal
            </p>
          )}
        </section>
      ))}
    </div>
  );
}

function BlockView({
  block,
  context,
}: {
  block: Block;
  context: RenderContext | null;
}): ReactNode {
  switch (block.type) {
    case "section":
      return <SectionHeader block={block} />;
    case "intro":
      return (
        <p className="bsd-intro">
          <Words text={block.text} />
        </p>
      );
    case "definitions":
      return (
        <dl className="bsd-defs">
          {block.items.map((item, index) => (
            <div key={index} className="bsd-def">
              <dt>{item.term}</dt>
              <dd>
                <Words text={item.meaning} />
              </dd>
            </div>
          ))}
        </dl>
      );
    case "clause":
      return (
        <section className="bsd-clause">
          <h3>
            {block.number && (
              <span className="bsd-clause-num">{block.number}.</span>
            )}
            {block.number && " "}
            {block.heading}
          </h3>
          <TextBlocks blocks={block.children} />
        </section>
      );
    case "paragraph":
      return (
        <p className="bsd-p">
          <Words text={block.text} />
        </p>
      );
    case "lettered":
      return (
        <ol className="bsd-list bsd-letters">
          {block.items.map((item, index) => (
            <li key={index}>
              <span className="bsd-list-mark">{item.letter}.</span>{" "}
              <Words text={item.text} />
            </li>
          ))}
        </ol>
      );
    case "bullets":
      return (
        <ul className="bsd-list bsd-bullets">
          {block.items.map((item, index) => (
            <li key={index}>
              <Words text={item} />
            </li>
          ))}
        </ul>
      );
    case "subheading":
      return <h3 className="bsd-sub">{block.text}</h3>;
    case "note":
      return (
        <p className="bsd-note">
          <Words text={block.text} />
        </p>
      );
    case "rule":
      return <div className="bsd-rule" role="separator" />;
    case "fields":
      return <Fields fields={block.fields} columns={block.columns} />;
    case "checks":
      return (
        <div className="bsd-checks">
          <p className="bsd-checks-label">{block.label}</p>
          <ul style={cols(block.columns)}>
            {block.items.map((item, index) => (
              <li key={index}>
                <span
                  className={item.checked ? "bsd-box is-on" : "bsd-box"}
                  aria-hidden="true"
                />
                <span>
                  {item.label}
                  {item.checked && <span className="bsd-sr"> (selected)</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      );
    case "table":
      return (
        <table className="bsd-table">
          {block.headers.length > 0 && (
            <thead>
              <tr>
                {block.headers.map((header, index) => (
                  <th key={index} scope="col">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {block.rows.map((row, index) => (
              <tr key={index}>
                <td>
                  <span className="bsd-table-name">
                    {row.name}
                    {row.hint && (
                      <span className="bsd-table-hint">({row.hint})</span>
                    )}
                  </span>
                </td>
                <td>
                  <span className="bsd-table-value">{row.value}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    case "summary":
      return (
        <div className="bsd-summary">
          <p className="bsd-box-label">{block.label}</p>
          <Fields fields={block.fields} columns={3} />
        </div>
      );
    case "paybox":
      return (
        <div className="bsd-paybox">
          <p className="bsd-box-label">{block.label}</p>
          {block.name && <p className="bsd-paybox-name">{block.name}</p>}
          <Fields fields={block.fields} columns={3} />
        </div>
      );
    case "callout":
      return (
        <aside className={`bsd-callout bsd-callout--${block.colour}`}>
          {block.label && <p className="bsd-callout-label">{block.label}</p>}
          <p className="bsd-callout-text">
            <Words text={block.text} />
          </p>
        </aside>
      );
    case "steps":
      return (
        <div className="bsd-steps">
          <p className="bsd-steps-label">{block.label}</p>
          <ol style={cols(Math.max(block.steps.length, 1))}>
            {block.steps.map((step, index) => (
              <li key={index}>
                <span className="bsd-step-num" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="bsd-step-label">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      );
    case "columns":
      return (
        <div
          className="bsd-cols"
          style={cols(Math.max(block.columns.length, 1))}
        >
          {block.columns.map((column, index) => (
            <div key={index} className="bsd-col">
              <Blocks blocks={column} context={context} />
            </div>
          ))}
        </div>
      );
    case "signatures":
      return (
        <Signatures
          short={block.short}
          context={
            context ?? { variant: "full", acceptance: null, studio: null }
          }
        />
      );
    default:
      return null;
  }
}

function Blocks({
  blocks,
  context,
}: {
  blocks: Block[];
  context: RenderContext | null;
}) {
  return (
    <>
      {blocks.map((block, index) => (
        <BlockView key={index} block={block} context={context} />
      ))}
    </>
  );
}

/**
 * On a full-form signing page the closing rule and note sit at the foot of the
 * sheet (with a small squiggle), as on the PDF's Execution page.
 */
function splitFootnote(blocks: Block[]): {
  main: Block[];
  footnote: string | null;
} {
  const count = blocks.length;
  const note = blocks[count - 1];
  const rule = blocks[count - 2];
  const signs = blocks.some(
    (block) => block.type === "signatures" && !block.short,
  );
  if (signs && note?.type === "note" && rule?.type === "rule") {
    return { main: blocks.slice(0, count - 2), footnote: note.text };
  }
  return { main: blocks, footnote: null };
}

function RunningHeader() {
  return (
    <div className="bsd-head">
      <img src={LOGO_DARK} alt="Blanc Script" />
      <span>Service Agreement</span>
    </div>
  );
}

function RunningFooter({
  variant,
  number,
  total,
}: {
  variant: DocumentVariant;
  number: number;
  total: number;
}) {
  return (
    <div className="bsd-foot">
      <span className="bsd-foot-l">Blanc Script</span>
      <span className="bsd-foot-c">
        {variant === "short"
          ? "Confidential"
          : "Content Services Agreement  ·  Confidential"}
      </span>
      <span className="bsd-foot-r">
        {variant === "short"
          ? `${number} / ${total}`
          : String(number).padStart(2, "0")}
      </span>
    </div>
  );
}

function CoverSheet({
  page,
  variant,
}: {
  page: CoverPage;
  variant: DocumentVariant;
}) {
  const party = page.party;
  const short = variant === "short";
  const dateFields = party && (
    <div className="bsd-cover-fields">
      <div className="bsd-cover-field">
        <div className="bsd-cover-field-label">Agreement date</div>
        <div className="bsd-cover-field-value">{party.date}</div>
      </div>
      <div className="bsd-cover-field">
        <div className="bsd-cover-field-label">
          {short ? "Project / Reference" : "Reference"}
        </div>
        <div className="bsd-cover-field-value">{party.reference}</div>
      </div>
    </div>
  );
  return (
    <section className="bsd-sheet bsd-sheet--cover" aria-label="Cover">
      <div className="bsd-page bsd-cover">
        <div className="bsd-cover-strap">
          <span>Blanc Script — Creative Content Studio</span>
          <span>England &amp; Wales</span>
        </div>
        <img className="bsd-cover-logo" src={LOGO_DARK} alt="Blanc Script" />
        <p className="bsd-cover-title">
          {page.titleLines.map((line, index) => (
            <span key={index}>{line}</span>
          ))}
        </p>
        <div className="bsd-cover-bar" />
        {short && page.subtitle && (
          <p className="bsd-cover-sub">{page.subtitle}</p>
        )}
        {party && (
          <div className="bsd-party">
            <div className="bsd-party-between">Between</div>
            <div className="bsd-party-studio">Blanc Script</div>
            <div className="bsd-party-studio-sub">
              Creative content studio &nbsp;·&nbsp; “the Studio”
            </div>
            <div className="bsd-party-and">and</div>
            <div className="bsd-party-clabel">Client</div>
            <div className="bsd-party-client">{party.client}</div>
            <div className="bsd-party-cnote">“the Client”</div>
            {short && dateFields}
          </div>
        )}
        {!short && dateFields}
        {page.note && <p className="bsd-cover-note">{page.note}</p>}
        {short && <img className="bsd-cover-squiggle" src={SQUIGGLE} alt="" />}
      </div>
    </section>
  );
}

function ContentSheet({
  page,
  total,
  context,
}: {
  page: ContentPage | ContentsPage;
  total: number;
  context: RenderContext;
}) {
  const { main, footnote } = splitFootnote(page.blocks);
  return (
    <section
      className="bsd-sheet"
      aria-label={`Page ${page.number} of ${total}`}
    >
      <div className="bsd-page">
        <RunningHeader />
        <div className="bsd-body">
          {page.kind === "contents" && (
            <>
              <header className="bsd-section bsd-contents-head">
                <p className="bsd-eyebrow">
                  <span className="bsd-eyebrow-num">—</span>
                  <span className="bsd-eyebrow-text">This agreement</span>
                </p>
                <h2>
                  <span className="bsd-title">
                    <span className="bsd-title-text">Contents</span>
                    <Squiggle />
                  </span>
                </h2>
              </header>
              <ol className="bsd-toc">
                {page.entries.map((entry, index) => (
                  <li key={index}>
                    <span className="bsd-toc-num">
                      {contentsNumber(entry.number)}
                    </span>
                    <span className="bsd-toc-title">{entry.title}</span>
                    <span className="bsd-toc-lead" aria-hidden="true" />
                  </li>
                ))}
              </ol>
            </>
          )}
          <Blocks blocks={main} context={context} />
          {footnote !== null && (
            <div className="bsd-footnote">
              <p className="bsd-note">
                <Words text={footnote} />
              </p>
              <img src={SQUIGGLE} alt="" />
            </div>
          )}
        </div>
        <RunningFooter
          variant={context.variant}
          number={page.number}
          total={total}
        />
      </div>
    </section>
  );
}

function BackCoverSheet({ page }: { page: BackCoverPage }) {
  return (
    <section className="bsd-sheet bsd-sheet--dark" aria-label="Back cover">
      <div className="bsd-page bsd-back">
        <img className="bsd-back-logo" src={LOGO_LIGHT} alt="Blanc Script" />
        <p className="bsd-back-strap">Content · Creativity · Impact</p>
        <div className="bsd-back-bar" />
        {page.title && <p className="bsd-back-title">{page.title}</p>}
        {page.subtitle && <p className="bsd-back-sub">{page.subtitle}</p>}
        <p className="bsd-back-foot">Blanc Script — Creative Content Studio</p>
      </div>
    </section>
  );
}

/**
 * Renders a BSD document as A4 sheets that match the studio's PDF design, on
 * screen and in print. Server-safe: no hooks, no client code.
 *
 * The host supplies the fonts through `--bsd-sans` (Poppins) and `--bsd-serif`
 * (Lora) and serves the brand images at /brand/….
 */
export function RichDocument({
  body,
  acceptance = null,
  studio = null,
}: RichDocumentProps) {
  const document = parseDocument(body);
  const context: RenderContext = {
    variant: document.variant,
    acceptance,
    studio,
  };
  const total = document.pages.length;
  return (
    <div className={`bsd bsd--${document.variant}`}>
      <style dangerouslySetInnerHTML={{ __html: RICH_DOCUMENT_CSS }} />
      {document.pages.map((page) => {
        switch (page.kind) {
          case "cover":
            return (
              <CoverSheet
                key={page.number}
                page={page}
                variant={document.variant}
              />
            );
          case "backcover":
            return <BackCoverSheet key={page.number} page={page} />;
          default:
            return (
              <ContentSheet
                key={page.number}
                page={page}
                total={total}
                context={context}
              />
            );
        }
      })}
    </div>
  );
}
