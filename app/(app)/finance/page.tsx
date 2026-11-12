import { PageHeader } from "@/components/ds/page-header";
import { FinanceView } from "@/components/finance/finance-view";
import { listInvoices, getFinanceSummary, listClientOptions } from "@/lib/data/finance";

export const metadata = { title: "Finance" };
export const dynamic = "force-dynamic";

export default async function FinancePage() {
  const [rows, summary, clientOptions] = await Promise.all([
    listInvoices(),
    getFinanceSummary(),
    listClientOptions(),
  ]);
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Finance" eyebrow="Commercials" />
      <FinanceView rows={rows} summary={summary} clientOptions={clientOptions} />
    </div>
  );
}
