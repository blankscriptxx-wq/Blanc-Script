import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { AcceptDocument } from "@/components/portal/accept-document";
import { DocumentView } from "@/components/documents/document-view";
import { PrintButton } from "@/components/finance/print-button";
import { getPortalDocument } from "@/lib/data/documents";
import { resolvePortal } from "@/lib/data/portal";

export const dynamic = "force-dynamic";

const when = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "Europe/London",
});

export default async function PortalDocumentPage({
  params,
}: {
  params: Promise<{ token: string; id: string }>;
}) {
  const { token, id } = await params;
  const ctx = await resolvePortal(token);
  if (!ctx) redirect(`/portal/enter?t=${encodeURIComponent(token)}`);
  const doc = await getPortalDocument(ctx, id);
  if (!doc) notFound();

  return (
    <div>
      <Link
        href={`/portal/${token}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-bs-subtle transition-colors hover:text-bs-text"
      >
        <ArrowLeft className="h-4 w-4" /> Back to your portal
      </Link>
      <h1 className="font-display text-h1">{doc.title}</h1>
      {doc.status === "accepted" && doc.acceptedAt ? (
        <p className="mt-2 flex items-center gap-2 text-sm text-bs-success">
          <CheckCircle2 className="h-4 w-4" /> Accepted by {doc.acceptedByName} on {when.format(doc.acceptedAt)}
        </p>
      ) : (
        <p className="mt-2 text-sm text-bs-muted">Please read this through, then accept it at the bottom.</p>
      )}
      <div className="mt-3 print:hidden">
        <PrintButton />
      </div>
      <DocumentView
        body={doc.body}
        acceptance={doc.status === "accepted" && doc.acceptedAt && doc.acceptedByName ? { name: doc.acceptedByName, at: doc.acceptedAt } : null}
        studio={doc.sentAt ? { name: ctx.agencyName, date: doc.sentAt } : null}
      />
      {doc.status === "sent" ? (
        <AcceptDocument token={token} documentId={doc.id} defaultName={ctx.viewerName} />
      ) : null}
    </div>
  );
}
