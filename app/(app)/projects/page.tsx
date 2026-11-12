import { PageHeader } from "@/components/ds/page-header";
import { ProjectsView } from "@/components/projects/projects-view";
import { listProjects, listClientOptions } from "@/lib/data/projects";

export const metadata = { title: "Projects" };
export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const [rows, clientOptions] = await Promise.all([
    listProjects(),
    listClientOptions(),
  ]);
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Projects" eyebrow="Delivery" />
      <ProjectsView rows={rows} clientOptions={clientOptions} />
    </div>
  );
}
