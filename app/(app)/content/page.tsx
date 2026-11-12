import { PageHeader } from "@/components/ds/page-header";
import { ContentView } from "@/components/content/content-view";
import { listContent, listClientOptions, listContentMedia } from "@/lib/data/content";
import { storageConfigured } from "@/lib/data/media";
import { listContentCastings, listTalentPickerOptions } from "@/lib/data/castings";

export const metadata = { title: "Content" };
export const dynamic = "force-dynamic";

export default async function ContentPage() {
  const [rows, clientOptions, castings, talentOptions, media] = await Promise.all([
    listContent(),
    listClientOptions(),
    listContentCastings(),
    listTalentPickerOptions(),
    listContentMedia(),
  ]);
  const storageReady = storageConfigured();
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Content" eyebrow="Calendar" />
      <ContentView
        rows={rows}
        clientOptions={clientOptions}
        castings={castings}
        talentOptions={talentOptions}
        media={media}
        storageReady={storageReady}
      />
    </div>
  );
}
