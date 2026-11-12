import { notFound } from "next/navigation";
import { ProjectProfileView } from "@/components/projects/project-profile";
import { getProjectProfile } from "@/lib/data/project-profile";
import { listMediaFor, storageConfigured } from "@/lib/data/media";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProjectProfile(id).catch(() => null);
  return { title: profile ? profile.project.name : "Project" };
}

export default async function ProjectProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProjectProfile(id).catch(() => null);
  if (!profile) notFound();
  const media = await listMediaFor({ projectId: id }).catch(() => []);
  return (
    <ProjectProfileView
      profile={profile}
      media={media}
      storageReady={storageConfigured()}
    />
  );
}
