import { Lora, Poppins } from "next/font/google";
import { DocumentPaper } from "@/components/documents/document-paper";
import { RichDocument } from "@/components/documents/rich-document";
import { isRichDocument } from "@/lib/documents/markup";

const poppins = Poppins({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"], variable: "--bsd-sans", display: "swap" });
const lora = Lora({ subsets: ["latin"], weight: ["400", "500"], style: ["normal", "italic"], variable: "--bsd-serif", display: "swap" });

// When printing, show only the document: hide the app around it and let the
// A4 sheets start at the top-left of the paper.
const PRINT_CSS = `
@media print {
  html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
  body * { visibility: hidden !important; }
  .doc-print-root, .doc-print-root * { visibility: visible !important; }
  .doc-print-root { position: absolute !important; left: 0; top: 0; width: 210mm; margin: 0 !important; padding: 0 !important; }
}`;

/**
 * A client document as the client (or staff) sees it. Designed documents —
 * the Service Agreement and its Short Form — render as A4 pages that match the
 * studio's PDFs; anything else uses the simpler branded paper.
 */
export function DocumentView({
  body,
  acceptance,
  studio,
}: {
  body: string;
  acceptance?: { name: string; at: Date } | null;
  studio?: { name: string; date?: Date | null } | null;
}) {
  if (!isRichDocument(body)) return <DocumentPaper body={body} />;
  return (
    <div className={`doc-print-root mt-4 ${poppins.variable} ${lora.variable}`}>
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />
      <RichDocument body={body} acceptance={acceptance} studio={studio} />
    </div>
  );
}
