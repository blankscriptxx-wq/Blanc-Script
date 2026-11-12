import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ds/page-header";
import { StrategyWorkspace } from "@/components/strategy/strategy-workspace";
import { getClientProfile, listKnowledge } from "@/lib/data/client-brain";
import { listThreads, getThreadMessages } from "@/lib/data/client-chat";
import { listScripts } from "@/lib/data/scripts";
import { listAllScriptMedia, storageConfigured } from "@/lib/data/media";
import { aiConfigured } from "@/lib/ai/claude";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getClientProfile(id).catch(() => null);
  return { title: profile ? `${profile.clientName} — Strategy` : "Strategy" };
}

export default async function ClientStrategyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ thread?: string }>;
}) {
  const { id } = await params;
  const { thread } = await searchParams;
  const profile = await getClientProfile(id).catch(() => null);
  if (!profile) notFound();

  const [proposed, approved, threads, scripts, scriptMedia] = await Promise.all([
    listKnowledge(id, "proposed"),
    listKnowledge(id, "approved"),
    listThreads(id),
    listScripts(id),
    listAllScriptMedia(),
  ]);
  const activeThreadId = thread || threads[0]?.id || null;
  const messages = activeThreadId ? await getThreadMessages(activeThreadId).catch(() => []) : [];

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href={`/clients/${id}`}
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-bs-subtle transition-colors hover:text-bs-text"
      >
        <ArrowLeft className="h-4 w-4" /> {profile.clientName}
      </Link>
      <PageHeader title="Strategy" eyebrow={`${profile.clientName} · AI strategist`} />
      <StrategyWorkspace
        clientId={id}
        profile={profile}
        proposed={proposed}
        approved={approved}
        threads={threads}
        activeThreadId={activeThreadId}
        messages={messages}
        scripts={scripts}
        scriptMedia={scriptMedia}
        storageReady={storageConfigured()}
        aiReady={aiConfigured()}
      />
    </div>
  );
}
