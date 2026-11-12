import { notFound } from "next/navigation";
import { ProposalEditor } from "@/components/proposals/proposal-editor";
import { NoAccess } from "@/components/ds/no-access";
import { aiConfigured } from "@/lib/ai/claude";
import { getCurrentUser } from "@/lib/auth/session";
import { getProposal } from "@/lib/data/proposals";

export const dynamic = "force-dynamic";
// The AI draft is a single long call.
export const maxDuration = 300;
export const metadata = { title: "Proposal" };

export default async function ProposalEditorPage({ params }: { params: Promise<{ id: string; pid: string }> }) {
  const { id, pid } = await params;
  const user = await getCurrentUser();
  if (!user?.capabilities.has("can_see_money")) return <NoAccess />;
  const p = await getProposal(pid).catch(() => null);
  if (!p || p.clientId !== id) notFound();
  return (
    <ProposalEditor
      clientId={id}
      clientName={p.clientName}
      aiReady={aiConfigured()}
      proposal={{
        id: p.id,
        title: p.title,
        token: p.token,
        status: p.status as "draft" | "sent" | "accepted",
        content: p.content,
        viewedAt: p.viewedAt,
        acceptedByName: p.acceptedByName,
      }}
    />
  );
}
