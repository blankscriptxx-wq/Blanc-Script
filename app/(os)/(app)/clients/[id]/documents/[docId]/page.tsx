import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { DocumentView } from "@/components/documents/document-view";
import { PrintButton } from "@/components/finance/print-button";
import { listClientDocuments } from "@/lib/data/documents";

export const dynamic = "force-dynamic";
export const metadata = { title: "Document" };

const when = new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/London" });

/** A client's document exactly as they see it, with a print / save-as-PDF button. */
export default async function ClientDocumentPage({ params }: { params: Promise<{ id: string; docId: string }> }) {
  const { id, docId } = await params;
  const docs = await listClientDocuments(id).catch(() => []);
  const doc = docs.find((d) => d.id === docId);
  if (!doc) notFound();
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/clients/${id}`} className="inline-flex items-center gap-1.5 text-sm text-bs-subtle transition-colors hover:text-bs-text">
          <ArrowLeft className="h-4 w-4" /> Back to client
        </Link>
        <PrintButton />
      </div>
      <h1 className="mt-3 font-display text-h1 print:hidden">{doc.title}</h1>
      <p className="mt-1 text-sm text-bs-muted print:hidden">
        {doc.status === "accepted" && doc.acceptedAt
          ? `Accepted by ${doc.acceptedByName} on ${when.format(doc.acceptedAt)}.`
          : doc.status === "sent"
            ? "Sent — waiting for the client to accept."
            : doc.status === "void"
              ? "Void."
              : "Draft — the client can't see this yet."}
      </p>
      <DocumentView
        body={doc.body}
        acceptance={doc.status === "accepted" && doc.acceptedAt && doc.acceptedByName ? { name: doc.acceptedByName, at: doc.acceptedAt } : null}
        studio={doc.sentAt ? { name: "Blanc Script", date: doc.sentAt } : null}
      />
    </div>
  );
}
