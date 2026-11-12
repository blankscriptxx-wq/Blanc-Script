import { notFound } from "next/navigation";
import { ClientProfileView } from "@/components/clients/client-profile";
import { getClientProfile } from "@/lib/data/client-profile";
import { listPortalLinks } from "@/lib/data/portal";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getClientProfile(id).catch(() => null);
  return { title: profile ? profile.client.name : "Client" };
}

export default async function ClientProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getClientProfile(id).catch(() => null);
  if (!profile) notFound();
  const portalLinks = await listPortalLinks(id).catch(() => []);
  return <ClientProfileView profile={profile} portalLinks={portalLinks} />;
}
