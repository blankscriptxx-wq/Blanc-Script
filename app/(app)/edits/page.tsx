import { PageHeader } from "@/components/ds/page-header";
import { EditsView } from "@/components/edits/edits-view";
import {
  listDeliverables,
  listProjectOptions,
  listClientOptions,
} from "@/lib/data/edits";

export const metadata = { title: "Edits" };
export const dynamic = "force-dynamic";

export default async function EditsPage() {
  const [rows, projectOptions, clientOptions] = await Promise.all([
    listDeliverables(),
    listProjectOptions(),
    listClientOptions(),
  ]);
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Edits" eyebrow="Review" />
      <EditsView
        rows={rows}
        projectOptions={projectOptions}
        clientOptions={clientOptions}
      />
    </div>
  );
}
