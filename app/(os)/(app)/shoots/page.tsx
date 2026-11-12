import { PageHeader } from "@/components/ds/page-header";
import { ShootsView } from "@/components/shoots/shoots-view";
import { listShoots, listClientOptions } from "@/lib/data/shoots";
import { listShootCastings, listTalentPickerOptions } from "@/lib/data/castings";
import { listMediaWithShoot, storageConfigured } from "@/lib/data/media";

export const metadata = { title: "Shoots" };
export const dynamic = "force-dynamic";

export default async function ShootsPage() {
  const [rows, clientOptions, castings, talentOptions, media] = await Promise.all([
    listShoots(),
    listClientOptions(),
    listShootCastings(),
    listTalentPickerOptions(),
    listMediaWithShoot(),
  ]);
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Shoots" eyebrow="Production" />
      <ShootsView
        rows={rows}
        clientOptions={clientOptions}
        castings={castings}
        talentOptions={talentOptions}
        media={media}
        storageReady={storageConfigured()}
      />
    </div>
  );
}
