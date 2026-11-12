import { PageHeader } from "@/components/ds/page-header";
import { EmptyState } from "@/components/ds/empty-state";
import { TalentView } from "@/components/talent/talent-view";
import { listTalent } from "@/lib/data/talent";
import {
  listContentCastings,
  listProjectCastings,
  listShootCastings,
} from "@/lib/data/castings";

export const metadata = { title: "Talent" };
export const dynamic = "force-dynamic";

export default async function TalentPage() {
  const [rows, shootCastings, projectCastings, contentCastings] = await Promise.all([
    listTalent(),
    listShootCastings(),
    listProjectCastings(),
    listContentCastings(),
  ]);
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Talent" eyebrow="Book" />
      {rows.length === 0 ? (
        <EmptyState
          title="No talent yet."
          description="Add on-camera talent to your book so you can cast them onto shoots and track rates."
        />
      ) : (
        <TalentView
          rows={rows}
          shootCastings={shootCastings}
          projectCastings={projectCastings}
          contentCastings={contentCastings}
        />
      )}
    </div>
  );
}
