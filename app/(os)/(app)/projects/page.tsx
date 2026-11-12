import { PageHeader } from "@/components/ds/page-header";
import { ProjectsView } from "@/components/projects/projects-view";
import { listProjects, listClientOptions } from "@/lib/data/projects";
import { listProjectCastings, listTalentPickerOptions } from "@/lib/data/castings";

export const metadata = { title: "Projects" };
export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const [rows, clientOptions, castings, talentOptions] = await Promise.all([
    listProjects(),
    listClientOptions(),
    listProjectCastings(),
    listTalentPickerOptions(),
  ]);
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Projects" eyebrow="Delivery" />
      <ProjectsView
        rows={rows}
        clientOptions={clientOptions}
        castings={castings}
        talentOptions={talentOptions}
      />
    </div>
  );
}
