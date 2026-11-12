/**
 * A client document shown as a Blanc Script-branded page: logo, squiggle,
 * numbered section headings and lists picked out from the plain text.
 * Colours are fixed (cream paper, ink text) so it reads the same in any theme
 * and prints cleanly.
 */
export function DocumentPaper({ body }: { body: string }) {
  const lines = body.replace(/\r/g, "").split("\n");
  const first = lines.findIndex((l) => l.trim());
  const blocks: React.ReactNode[] = [];
  // Ordered items keep the number written in the document, so a clause list
  // that is interrupted by an inserted bullet list carries on at 3, not 1.
  let list: { ordered: boolean; items: { n: number; text: string }[] } | null = null;
  const flush = () => {
    if (!list) return;
    const items = list.items.map((t, i) => (
      <li key={i} value={list!.ordered ? t.n : undefined}>
        {t.text}
      </li>
    ));
    blocks.push(
      list.ordered ? (
        <ol key={blocks.length} className="my-2 list-decimal space-y-1.5 pl-6">{items}</ol>
      ) : (
        <ul key={blocks.length} className="my-2 list-disc space-y-1.5 pl-6">{items}</ul>
      ),
    );
    list = null;
  };

  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (!line) return flush();
    if (i === first) {
      flush();
      blocks.push(
        <h2 key={blocks.length} className="text-[26px] font-bold leading-tight tracking-tight text-[#26272E]">
          {line}
        </h2>,
        // eslint-disable-next-line @next/next/no-img-element
        <img key={`sq-${blocks.length}`} src="/brand/squiggle.png" alt="" className="mb-5 mt-3 h-auto w-28" />,
      );
      return;
    }
    // "3. Fees and payment" on its own line, with a blank line after it, is a section heading.
    const next = lines[i + 1]?.trim() ?? "";
    const heading = /^\d{1,2}\.\s+\S/.test(line) && line.length <= 70 && !/[.;:]$/.test(line) && next === "";
    if (heading) {
      flush();
      blocks.push(
        <h3 key={blocks.length} className="mb-2 mt-7 border-t border-[#E6D9CA] pt-5 text-[17px] font-bold text-[#26272E]">
          <span className="mr-2 text-[#EE3A5F]">{line.match(/^\d+/)![0]}.</span>
          {line.replace(/^\d+\.\s+/, "")}
        </h3>,
      );
      return;
    }
    const ordered = /^\d{1,2}\.\s+/.test(line);
    const bullet = /^[-•]\s+/.test(line);
    if (ordered || bullet) {
      if (!list || list.ordered !== ordered) {
        flush();
        list = { ordered, items: [] };
      }
      list.items.push({ n: ordered ? Number(line.match(/^\d+/)![0]) : 0, text: line.replace(ordered ? /^\d{1,2}\.\s+/ : /^[-•]\s+/, "") });
      return;
    }
    flush();
    blocks.push(
      <p key={blocks.length} className="my-2.5">
        {line}
      </p>,
    );
  });
  flush();

  return (
    <article className="mt-4 overflow-hidden rounded-lg border border-[#E6D9CA] bg-[#FDF7F0] text-[15px] leading-relaxed text-[#3A3B45] shadow-sm print:border-0 print:shadow-none">
      <header className="flex items-center justify-between border-b border-[#E6D9CA] bg-[#F7EDE2] px-6 py-4 sm:px-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-dark.png" alt="Blanc Script" className="h-7 w-auto" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#EE3A5F]">Agreement</span>
      </header>
      <div className="px-6 py-8 sm:px-10">{blocks}</div>
      <footer className="border-t border-[#E6D9CA] bg-[#26272E] px-6 py-4 text-center text-[11px] tracking-wide text-[#9a9aa2] sm:px-10">
        Content · Creativity · Impact &nbsp;·&nbsp; blancscript.com
      </footer>
    </article>
  );
}
