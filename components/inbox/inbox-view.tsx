"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Send, Info, Tag, Phone } from "lucide-react";
import { Button } from "@/components/ds/button";
import { StatusPill } from "@/components/ds/status-pill";
import { Dialog } from "@/components/ds/dialog";
import { EmptyState } from "@/components/ds/empty-state";
import {
  createConversationAction,
  sendMessageAction,
  setStatusAction,
} from "@/app/(os)/(app)/inbox/actions";
import type { ConversationRow, MessageRow, WaStatus } from "@/lib/data/inbox";
import { cn } from "@/lib/cn";

const STATUS_TONE: Record<WaStatus, React.ComponentProps<typeof StatusPill>["tone"]> = {
  open: "success",
  snoozed: "warning",
  closed: "neutral",
};

const STATUSES: WaStatus[] = ["open", "snoozed", "closed"];

const timeFmt = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" });
const dayFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

const DELIVERY_LABEL: Record<string, string> = {
  stored: "Saved, not sent",
  queued: "Sending",
  sent: "Sent",
  delivered: "Delivered",
  read: "Read",
  failed: "Not delivered",
};

function cap(s: string) {
  return s[0].toUpperCase() + s.slice(1);
}

function relativeTime(d: Date | null): string {
  if (!d) return "";
  const date = new Date(d);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  return sameDay ? timeFmt.format(date) : dayFmt.format(date);
}

function contactLabel(c: ConversationRow): string {
  return c.contactName || c.contactPhone || "Unknown contact";
}

type OptimisticMessage = MessageRow & { pending: true };

export function InboxView({
  conversations,
  selectedId,
  messages,
  clientOptions,
  live = false,
}: {
  conversations: ConversationRow[];
  selectedId: string | null;
  messages: MessageRow[];
  clientOptions: { id: string; name: string }[];
  /** True when the Aniro WhatsApp connection is configured. */
  live?: boolean;
}) {
  const router = useRouter();
  const [addOpen, setAddOpen] = React.useState(false);

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  function select(id: string) {
    router.push(`/inbox?c=${id}`);
  }

  return (
    <>
      <div className="grid h-[calc(100dvh-13rem)] min-h-[32rem] grid-cols-1 overflow-hidden rounded-md border border-bs-border bg-bs-surface md:grid-cols-[20rem_1fr]">
        {/* Left: conversation list */}
        <aside className="flex min-h-0 flex-col border-b border-bs-border md:border-b-0 md:border-r">
          <div className="flex items-center justify-between gap-2 border-b border-bs-border px-3 py-2.5">
            <p className="text-sm text-bs-muted">
              {conversations.length}{" "}
              {conversations.length === 1 ? "conversation" : "conversations"}
            </p>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" /> New
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  title="No conversations yet."
                  description="Start one to keep a client's WhatsApp thread here."
                  action={<Button size="sm" onClick={() => setAddOpen(true)}>New conversation</Button>}
                />
              </div>
            ) : (
              <ul>
                {conversations.map((c) => {
                  const active = c.id === selectedId;
                  return (
                    <li key={c.id}>
                      <button
                        onClick={() => select(c.id)}
                        className={cn(
                          "flex w-full flex-col gap-1 border-b border-bs-border px-3 py-3 text-left transition-colors hover:bg-bs-surface-2",
                          active && "bg-bs-surface-2",
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate font-medium text-bs-text">
                            {contactLabel(c)}
                          </span>
                          <span className="shrink-0 text-xs tabular-nums text-bs-subtle">
                            {relativeTime(c.lastMessageAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusPill tone={STATUS_TONE[c.status]} className="shrink-0">
                            {cap(c.status)}
                          </StatusPill>
                          {c.clientName ? (
                            <span className="inline-flex min-w-0 items-center gap-1 text-xs text-bs-muted">
                              <Tag className="h-3 w-3 shrink-0" />
                              <span className="truncate">{c.clientName}</span>
                            </span>
                          ) : c.contactPhone ? (
                            <span className="truncate text-xs text-bs-subtle">
                              {c.contactPhone}
                            </span>
                          ) : null}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        {/* Right: transcript + composer */}
        <section className="flex min-h-0 flex-col">
          {selected ? (
            <Conversation
              key={selected.id}
              conversation={selected}
              messages={messages}
              live={live}
              onChanged={() => router.refresh()}
            />
          ) : (
            <div className="grid flex-1 place-items-center p-6">
              <EmptyState
                title="Select a conversation."
                description="Choose a thread on the left, or start a new one."
              />
            </div>
          )}
        </section>
      </div>

      <NewConversationDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        clientOptions={clientOptions}
        onCreated={(id) => {
          setAddOpen(false);
          router.push(`/inbox?c=${id}`);
        }}
      />
    </>
  );
}

function Conversation({
  conversation,
  messages,
  live,
  onChanged,
}: {
  conversation: ConversationRow;
  messages: MessageRow[];
  live: boolean;
  onChanged: () => void;
}) {
  const [optimistic, setOptimistic] = React.useState<OptimisticMessage[]>([]);
  const [body, setBody] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState("");
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Server messages are the source of truth — once fresh props arrive after a
  // refresh, drop the optimistic shadows (the real rows are now included).
  React.useEffect(() => {
    setOptimistic([]);
  }, [messages]);

  const all: (MessageRow | OptimisticMessage)[] = [...messages, ...optimistic];

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [all.length, sending]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text || sending) return;
    setError("");
    setSending(true);
    setOptimistic((o) => [
      ...o,
      {
        id: `optimistic-${Date.now()}`,
        conversationId: conversation.id,
        direction: "outbound",
        body: text,
        authorUserId: null,
        authorName: "You",
        deliveryStatus: null,
        deliveryError: null,
        sentAt: new Date(),
        pending: true,
      },
    ]);
    setBody("");

    const fd = new FormData();
    fd.set("conversationId", conversation.id);
    fd.set("body", text);
    const res = await sendMessageAction(null, fd);
    setSending(false);
    if (!res.ok) {
      setError(res.error);
      setOptimistic((o) => o.filter((m) => !("pending" in m)));
      setBody(text);
      return;
    }
    onChanged();
  }

  async function changeStatus(status: WaStatus) {
    if (status === conversation.status) return;
    const fd = new FormData();
    fd.set("id", conversation.id);
    fd.set("status", status);
    const res = await setStatusAction(fd);
    if (res.ok) onChanged();
  }

  return (
    <>
      {/* Header */}
      <header className="flex items-center justify-between gap-3 border-b border-bs-border px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate font-display text-h3 text-bs-text">
            {contactLabel(conversation)}
          </h2>
          <div className="mt-0.5 flex items-center gap-3 text-xs text-bs-subtle">
            {conversation.contactPhone ? (
              <span className="inline-flex items-center gap-1">
                <Phone className="h-3 w-3" /> {conversation.contactPhone}
              </span>
            ) : null}
            {conversation.clientName ? (
              <span className="inline-flex items-center gap-1">
                <Tag className="h-3 w-3" /> {conversation.clientName}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1 rounded-pill border border-bs-border bg-bs-surface-2 p-0.5">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => changeStatus(s)}
              aria-pressed={conversation.status === s}
              className={cn(
                "rounded-pill px-2.5 py-1 text-xs font-medium transition-colors",
                conversation.status === s
                  ? "bg-bs-surface text-bs-text shadow-sm"
                  : "text-bs-subtle hover:text-bs-text",
              )}
            >
              {cap(s)}
            </button>
          ))}
        </div>
      </header>

      {live ? null : (
        <>
      {/* Not-connected banner */}
      <div className="flex items-start gap-2 border-b border-bs-border bg-bs-info-soft px-4 py-2.5 text-sm text-bs-info">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          WhatsApp isn&rsquo;t connected yet — messages are saved here, not sent. They&rsquo;ll send for
          real once the Aniro WhatsApp connection is switched on.
        </p>
      </div>
        </>
      )}

      {/* Transcript */}
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-bs-surface-2/40 p-4">
        {all.length === 0 ? (
          <div className="grid h-full place-items-center">
            <p className="text-sm text-bs-subtle">No messages yet. Say hello below.</p>
          </div>
        ) : (
          all.map((m) => {
            const outbound = m.direction === "outbound";
            const pending = "pending" in m;
            return (
              <div
                key={m.id}
                className={cn("flex", outbound ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[78%] rounded-lg px-3 py-2 text-sm",
                    outbound
                      ? "rounded-br-sm bg-bs-primary text-bs-on-accent"
                      : "rounded-bl-sm border border-bs-border bg-bs-surface text-bs-text",
                  )}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
                  <div
                    className={cn(
                      "mt-1 flex items-center gap-1.5 text-[11px]",
                      outbound ? "text-bs-on-accent/70" : "text-bs-subtle",
                    )}
                  >
                    {outbound && m.authorName ? <span>{m.authorName}</span> : null}
                    <span className="tabular-nums">
                      {pending ? "Saving…" : timeFmt.format(new Date(m.sentAt))}
                    </span>
                    {outbound && !pending && m.deliveryStatus ? (
                      <span
                        title={m.deliveryError ?? undefined}
                        className={m.deliveryStatus === "failed" ? "font-medium underline" : undefined}
                      >
                        · {DELIVERY_LABEL[m.deliveryStatus] ?? m.deliveryStatus}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Composer */}
      <form onSubmit={send} className="border-t border-bs-border p-3">
        {error ? <p className="mb-2 px-1 text-sm text-bs-danger">{error}</p> : null}
        <div className="flex items-end gap-2 rounded-md border border-bs-border-strong bg-bs-surface px-3 py-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) send(e);
            }}
            rows={1}
            placeholder={live ? "Write a WhatsApp message…" : "Write a message… (stored, not sent)"}
            className="max-h-32 min-h-[1.5rem] flex-1 resize-none bg-transparent text-body text-bs-text outline-none placeholder:text-bs-subtle"
          />
          <Button
            type="submit"
            size="icon"
            disabled={sending || !body.trim()}
            aria-label="Save message"
            className="h-8 w-8 shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </>
  );
}

function NewConversationDialog({
  open,
  onClose,
  clientOptions,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  clientOptions: { id: string; name: string }[];
  onCreated: (id: string) => void;
}) {
  const [state, action, pending] = useActionState(createConversationAction, null);
  React.useEffect(() => {
    if (state?.ok && state.id) onCreated(state.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const inputCls =
    "h-9 w-full rounded-sm border border-bs-border-strong bg-bs-surface px-3 text-body text-bs-text outline-none placeholder:text-bs-subtle";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="New conversation"
      description="Start a WhatsApp thread. Messages are stored until the connection is live."
    >
      <form action={action} className="space-y-4">
        <Field label="Contact name">
          <input
            name="contactName"
            required
            autoFocus
            placeholder="e.g. Priya at Aura Skincare"
            className={inputCls}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phone (optional)">
            <input name="contactPhone" placeholder="+44…" className={inputCls} />
          </Field>
          <Field label="Client (optional)">
            <select name="clientId" defaultValue="" className={cn(inputCls, "pr-8")}>
              <option value="">None</option>
              {clientOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {state && !state.ok ? (
          <p className="text-sm text-bs-danger">{state.error}</p>
        ) : null}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Starting…" : "Start conversation"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-sm font-medium text-bs-text">{label}</span>
      {children}
    </label>
  );
}
