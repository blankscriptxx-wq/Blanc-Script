import * as React from "react";

/**
 * Minimal renderer for the Markdown the AI writes (headings, bold/italic,
 * inline code, bullet and numbered lists, rules). Deliberately small: no HTML
 * is ever injected, everything is rendered as React text nodes.
 */
function inline(text: string, keyBase: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /(\*\*[^*\n]+\*\*|`[^`\n]+`|\*[^*\s][^*\n]*\*|_[^_\s][^_\n]*_)/g;
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(re)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push(text.slice(last, idx));
    const tok = m[0];
    const key = `${keyBase}-${i++}`;
    if (tok.startsWith("**")) out.push(<strong key={key} className="font-semibold">{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith("`")) out.push(<code key={key} className="rounded-xs bg-bs-surface-2 px-1 font-mono text-[0.92em]">{tok.slice(1, -1)}</code>);
    else out.push(<em key={key}>{tok.slice(1, -1)}</em>);
    last = idx + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function AiText({ text, className }: { text: string; className?: string }) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let para: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let k = 0;

  const flushPara = () => {
    if (!para.length) return;
    const key = `p${k++}`;
    blocks.push(
      <p key={key} className="whitespace-pre-wrap">
        {inline(para.join("\n"), key)}
      </p>,
    );
    para = [];
  };
  const flushList = () => {
    if (!list) return;
    const key = `l${k++}`;
    const items = list.items.map((it, i) => <li key={i}>{inline(it, `${key}-${i}`)}</li>);
    blocks.push(
      list.ordered ? (
        <ol key={key} className="list-decimal space-y-0.5 pl-5">{items}</ol>
      ) : (
        <ul key={key} className="list-disc space-y-0.5 pl-5">{items}</ul>
      ),
    );
    list = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    const bullet = /^\s*[-*•]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (!line.trim()) {
      flushPara();
      flushList();
    } else if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      flushPara();
      flushList();
      blocks.push(<hr key={`h${k++}`} className="border-bs-border" />);
    } else if (heading) {
      flushPara();
      flushList();
      const key = `t${k++}`;
      blocks.push(
        <p key={key} className="font-display font-semibold text-bs-text">
          {inline(heading[2], key)}
        </p>,
      );
    } else if (bullet || numbered) {
      flushPara();
      const ordered = !bullet;
      if (list && list.ordered !== ordered) flushList();
      list ??= { ordered, items: [] };
      list.items.push((bullet ?? numbered)![1]);
    } else {
      flushList();
      para.push(line);
    }
  }
  flushPara();
  flushList();

  return <div className={`space-y-2 leading-relaxed ${className ?? ""}`}>{blocks}</div>;
}
