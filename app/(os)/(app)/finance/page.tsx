import { PageHeader } from "@/components/ds/page-header";
import { FinanceView } from "@/components/finance/finance-view";
import {
  listInvoices,
  getFinanceSummary,
  listClientOptions,
  listTalentOptions,
} from "@/lib/data/finance";
import { NoAccess } from "@/components/ds/no-access";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata = { title: "Finance" };
export const dynamic = "force-dynamic";

export default async function FinancePage() {
  if (!(await getCurrentUser())?.capabilities.has("can_see_money")) {
    return <NoAccess what="Finance" />;
  }
  const [rows, summary, clientOptions, talentOptions] = await Promise.all([
    listInvoices(),
    getFinanceSummary(),
    listClientOptions(),
    listTalentOptions(),
  ]);
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Finance" eyebrow="Commercials" />
      <FinanceView
        rows={rows}
        summary={summary}
        clientOptions={clientOptions}
        talentOptions={talentOptions}
      />
    </div>
  );
}
