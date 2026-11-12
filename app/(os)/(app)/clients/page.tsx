import { PageHeader } from "@/components/ds/page-header";
import { ClientsView } from "@/components/clients/clients-view";
import { listClients, listPlanOptions } from "@/lib/data/clients";

export const metadata = { title: "Clients" };
export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const [rows, planOptions] = await Promise.all([listClients(), listPlanOptions()]);
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Clients" eyebrow="CRM" />
      <ClientsView rows={rows} planOptions={planOptions} />
    </div>
  );
}
