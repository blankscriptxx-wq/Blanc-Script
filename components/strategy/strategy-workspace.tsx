"use client";
import * as React from "react";
import { Brain, MessagesSquare, Clapperboard } from "lucide-react";
import { cn } from "@/lib/cn";
import { BrainPanel } from "@/components/strategy/brain-panel";
import { ChatPanel } from "@/components/strategy/chat-panel";
import { ScriptsPanel } from "@/components/strategy/scripts-panel";
import type { ClientProfile, KnowledgeRow } from "@/lib/data/client-brain";
import type { ThreadRow } from "@/lib/data/client-chat";
import type { ScriptRow } from "@/lib/data/scripts";
import type { ScriptMediaRow } from "@/lib/data/media";
import type { ChatMessage } from "@/lib/ai/claude";

type Tab = "brain" | "chat" | "scripts";

export function StrategyWorkspace(props: {
  clientId: string;
  profile: ClientProfile;
  proposed: KnowledgeRow[];
  approved: KnowledgeRow[];
  threads: ThreadRow[];
  activeThreadId: string | null;
  messages: ChatMessage[];
  scripts: ScriptRow[];
  scriptMedia: ScriptMediaRow[];
  storageReady: boolean;
  aiReady: boolean;
}) {
  const [tab, setTab] = React.useState<Tab>("brain");
  const tabs: { id: Tab; label: string; icon: typeof Brain; count?: number }[] = [
    { id: "brain", label: "Brain", icon: Brain, count: props.proposed.length || undefined },
    { id: "chat", label: "Chat", icon: MessagesSquare },
    { id: "scripts", label: "Scripts", icon: Clapperboard, count: props.scripts.length || undefined },
  ];

  return (
    <div>
      <div className="mb-4 inline-flex rounded-md border border-bs-border bg-bs-surface p-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-sm transition-colors",
                active ? "bg-bs-text text-bs-surface" : "text-bs-muted hover:text-bs-text",
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
              {t.count ? (
                <span
                  className={cn(
                    "rounded-full px-1.5 text-[11px]",
                    active ? "bg-bs-surface/20" : "bg-bs-surface-2 text-bs-subtle",
                  )}
                >
                  {t.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {tab === "brain" ? (
        <BrainPanel
          clientId={props.clientId}
          profile={props.profile}
          proposed={props.proposed}
          approved={props.approved}
          aiReady={props.aiReady}
        />
      ) : tab === "chat" ? (
        <ChatPanel
          clientId={props.clientId}
          threads={props.threads}
          activeThreadId={props.activeThreadId}
          messages={props.messages}
          aiReady={props.aiReady}
        />
      ) : (
        <ScriptsPanel
          clientId={props.clientId}
          scripts={props.scripts}
          scriptMedia={props.scriptMedia}
          storageReady={props.storageReady}
          aiReady={props.aiReady}
        />
      )}
    </div>
  );
}
