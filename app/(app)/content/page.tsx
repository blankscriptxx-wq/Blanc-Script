import { PageHeader } from "@/components/ds/page-header";
import { ContentView } from "@/components/content/content-view";
import { listContent, listClientOptions } from "@/lib/data/content";
import { listContentCastings, listTalentPickerOptions } from "@/lib/data/castings";

export const metadata = { title: "Content" };
export const dynamic = "force-dynamic";

export default async function ContentPage() {
  const [rows, clientOptions, castings, talentOptions] = await Promise.all([
    listContent(),
    listClientOptions(),
    listContentCastings(),
    listTalentPickerOptions(),
  ]);
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Content" eyebrow="Calendar" />
      <ContentView
        rows={rows}
        clientOptions={clientOptions}
        castings={castings}
        talentOptions={talentOptions}
      />
    </div>
  );
}
