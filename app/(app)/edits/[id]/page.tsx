import { notFound } from "next/navigation";
import { DeliverableDetailView } from "@/components/edits/deliverable-detail";
import { getDeliverableDetail } from "@/lib/data/deliverable-detail";
import {
  listProjectOptions,
  listClientOptions,
  listShootOptions,
  listReviewerOptions,
} from "@/lib/data/edits";

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
  const [projectOptions, clientOptions, shootOptions, reviewerOptions] =
    await Promise.all([
      listProjectOptions(),
      listClientOptions(),
      listShootOptions(),
      listReviewerOptions(),
    ]);
  return (
    <DeliverableDetailView
      detail={detail}
      projectOptions={projectOptions}
      clientOptions={clientOptions}
      shootOptions={shootOptions}
      reviewerOptions={reviewerOptions}
    />
  );
}
