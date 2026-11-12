import { notFound } from "next/navigation";
import { ClientProfileView } from "@/components/clients/client-profile";
import { SubscriptionCard } from "@/components/clients/subscription-card";
import { ClientDocuments } from "@/components/clients/client-documents";
import { ClientUploads } from "@/components/clients/client-uploads";
import { getClientProfile } from "@/lib/data/client-profile";
import { listPortalLinks } from "@/lib/data/portal";
import { getBillingSummary } from "@/lib/data/billing";
import { listClientDocuments, listTemplates } from "@/lib/data/documents";
import { listClientUploads, uploadAssignOptions } from "@/lib/data/client-uploads";
import { stripeConfigured } from "@/lib/payments/stripe";
import { getCurrentUser } from "@/lib/auth/session";

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
  const user = await getCurrentUser();
  const canMoney = user?.capabilities.has("can_see_money") ?? false;
  const canDocs =
    (user?.capabilities.has("can_contract") || user?.capabilities.has("can_settings")) ?? false;

  const [portalLinks, billing, documents, templates, uploads, assignOptions] = await Promise.all([
    listPortalLinks(id).catch(() => []),
    canMoney && user?.orgId ? getBillingSummary(user.orgId, id).catch(() => null) : null,
    canDocs ? listClientDocuments(id).catch(() => []) : [],
    canDocs ? listTemplates().catch(() => []) : [],
    listClientUploads(id).catch(() => []),
    uploadAssignOptions(id).catch(() => ({ shoots: [], scripts: [] })),
  ]);

  return (
    <ClientProfileView
      profile={profile}
      portalLinks={portalLinks}
      sections={
        <>
          {billing ? (
            <SubscriptionCard clientId={id} billing={billing} stripeReady={stripeConfigured()} />
          ) : null}
          {canDocs ? (
            <ClientDocuments
              clientId={id}
              documents={documents}
              templates={templates.map((t) => ({ id: t.id, name: t.name }))}
            />
          ) : null}
          <ClientUploads
            clientId={id}
            uploads={uploads}
            shoots={assignOptions.shoots}
            scripts={assignOptions.scripts}
          />
        </>
      }
    />
  );
}
