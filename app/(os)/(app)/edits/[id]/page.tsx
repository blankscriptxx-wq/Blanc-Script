import { notFound } from "next/navigation";
import { DeliverableDetailView } from "@/components/edits/deliverable-detail";
import { getDeliverableDetail } from "@/lib/data/deliverable-detail";
import {
  listProjectOptions,
  listClientOptions,
  listShootOptions,
  listReviewerOptions,
} from "@/lib/data/edits";
import { listMediaFor, storageConfigured } from "@/lib/data/media";
import { getScriptForDeliverable } from "@/lib/data/shoots";
import { ScriptBreakdown } from "@/components/shoots/script-breakdown";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getDeliverableDetail(id).catch(() => null);
  return { title: detail ? detail.deliverable.title : "Deliverable" };
}

export default async function DeliverableDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getDeliverableDetail(id).catch(() => null);
  if (!detail) notFound();
  const [projectOptions, clientOptions, shootOptions, reviewerOptions, media, storageReady] =
    await Promise.all([
      listProjectOptions(),
      listClientOptions(),
      listShootOptions(),
      listReviewerOptions(),
      listMediaFor({ deliverableId: id }),
      Promise.resolve(storageConfigured()),
    ]);
  const script = await getScriptForDeliverable(id).catch(() => null);
  return (
    <>
      <DeliverableDetailView
        detail={detail}
        projectOptions={projectOptions}
        clientOptions={clientOptions}
        shootOptions={shootOptions}
        reviewerOptions={reviewerOptions}
        media={media}
        storageReady={storageReady}
      />
      {script ? (
        <section className="mx-auto mt-8 max-w-4xl">
          <h2 className="font-display text-h2 text-bs-text">The script</h2>
          <p className="mt-1 text-sm text-bs-muted">
            {script.style === "self"
              ? "The client filmed this themselves, in whatever order was easiest. This is the order it should be cut in."
              : "What this edit is cut to, in running order."}
          </p>
          <div className="mt-3 rounded-md border border-bs-border bg-bs-surface p-5">
            <p className="mb-4 font-medium text-bs-text">{script.title}</p>
            <ScriptBreakdown script={script} view="all" order="edit" />
          </div>
        </section>
      ) : null}
    </>
  );
}
