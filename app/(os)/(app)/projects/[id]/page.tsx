import { notFound } from "next/navigation";
import { ProjectProfileView } from "@/components/projects/project-profile";
import { getProjectProfile } from "@/lib/data/project-profile";
import { listMediaFor, storageConfigured } from "@/lib/data/media";
import { listProjectScripts } from "@/lib/data/shoots";
import { clientScriptStyle } from "@/lib/data/script-writer";

export const dynamic = "force-dynamic";
// AI script drafting from this page can take a couple of minutes.
export const maxDuration = 300;

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
  const [media, scripts] = await Promise.all([
    listMediaFor({ projectId: id }).catch(() => []),
    listProjectScripts(id).catch(() => []),
  ]);
  const selfShoot = profile.project.clientId
    ? (await clientScriptStyle(profile.project.clientId).catch(() => "crew")) === "self"
    : false;
  return (
    <ProjectProfileView
      profile={profile}
      media={media}
      scripts={scripts}
      selfShoot={selfShoot}
      storageReady={storageConfigured()}
    />
  );
}
