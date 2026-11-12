import { notFound } from "next/navigation";
import { InvoiceDetailView } from "@/components/finance/invoice-detail";
import { getInvoiceDetail } from "@/lib/data/invoice-detail";
import { listClientOptions, listTalentOptions } from "@/lib/data/finance";
import { stripeConfigured, stripeMode, stripeWebhookConfigured } from "@/lib/payments/stripe";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getInvoiceDetail(id).catch(() => null);
  return { title: detail ? (detail.invoice.number ?? "Invoice") : "Invoice" };
}

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getInvoiceDetail(id).catch(() => null);
  if (!detail) notFound();
  const [clientOptions, talentOptions] = await Promise.all([
    listClientOptions(),
    listTalentOptions(),
  ]);
  return (
    <InvoiceDetailView
      detail={detail}
      clientOptions={clientOptions}
      talentOptions={talentOptions}
      payments={{
        configured: stripeConfigured(),
        mode: stripeMode(),
        webhook: stripeWebhookConfigured(),
      }}
    />
  );
}
