import { notFound } from "next/navigation";
import { DeliverableDetailView } from "@/components/edits/deliverable-detail";
import { getDeliverableDetail } from "@/lib/data/deliverable-detail";

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
  return <DeliverableDetailView detail={detail} />;
}
