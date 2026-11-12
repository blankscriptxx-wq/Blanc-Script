import { notFound } from "next/navigation";
import { TalentProfileView } from "@/components/talent/talent-profile";
import { getTalentProfile } from "@/lib/data/talent-profile";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getTalentProfile(id).catch(() => null);
  return { title: profile ? profile.talent.name : "Talent" };
}

export default async function TalentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getTalentProfile(id).catch(() => null);
  if (!profile) notFound();
  return <TalentProfileView profile={profile} />;
}
