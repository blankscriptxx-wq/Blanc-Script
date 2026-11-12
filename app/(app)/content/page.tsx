import { PageHeader } from "@/components/ds/page-header";
import { ContentView } from "@/components/content/content-view";
import { listContent, listClientOptions } from "@/lib/data/content";

export const metadata = { title: "Content" };
export const dynamic = "force-dynamic";

export default async function ContentPage() {
  const [rows, clientOptions] = await Promise.all([
    listContent(),
    listClientOptions(),
  ]);
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Content" eyebrow="Calendar" />
      <ContentView rows={rows} clientOptions={clientOptions} />
    </div>
  );
}
