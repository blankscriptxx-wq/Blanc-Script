import { PageHeader } from "@/components/ds/page-header";
import { ShootsView } from "@/components/shoots/shoots-view";
import { listShoots, listClientOptions } from "@/lib/data/shoots";

export const metadata = { title: "Shoots" };
export const dynamic = "force-dynamic";

export default async function ShootsPage() {
  const [rows, clientOptions] = await Promise.all([listShoots(), listClientOptions()]);
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Shoots" eyebrow="Production" />
      <ShootsView rows={rows} clientOptions={clientOptions} />
    </div>
  );
}
