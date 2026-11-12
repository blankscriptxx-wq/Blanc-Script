import { PageHeader } from "@/components/ds/page-header";
import { InboxView } from "@/components/inbox/inbox-view";
import {
  listConversations,
  listMessages,
  listClientOptions,
} from "@/lib/data/inbox";
import { aniroConfigured } from "@/lib/whatsapp/aniro";

export const metadata = { title: "Inbox" };
export const dynamic = "force-dynamic";

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { c } = await searchParams;
  const [conversations, clientOptions] = await Promise.all([
    listConversations(),
    listClientOptions(),
  ]);

  const selectedId =
    c && conversations.some((row) => row.id === c)
      ? c
      : (conversations[0]?.id ?? null);
  const messages = selectedId ? await listMessages(selectedId).catch(() => []) : [];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Inbox" eyebrow="WhatsApp" />
      <InboxView
        conversations={conversations}
        selectedId={selectedId}
        messages={messages}
        clientOptions={clientOptions}
        live={aniroConfigured()}
      />
    </div>
  );
}
