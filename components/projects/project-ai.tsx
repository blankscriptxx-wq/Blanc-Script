"use client";

import { useRouter } from "next/navigation";
import { AiGenerate } from "@/components/ai/ai-generate";
import {
  breakIntoTasksAction,
  draftBriefAction,
} from "@/app/(app)/projects/[id]/ai-actions";

/**
 * Client wrappers around the Projects AI actions. They bind the projectId and
 * supply the thunks AiGenerate expects (a server component cannot create those
 * closures itself). "Draft brief" shows the text to copy; "Break into tasks"
 * refreshes the route so the new tasks appear on the board.
 */

export function DraftBriefButton({ projectId }: { projectId: string }) {
  return (
    <AiGenerate label="Draft brief" action={() => draftBriefAction(projectId)} />
  );
}

export function BreakIntoTasksButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  return (
    <AiGenerate
      label="Break into tasks"
      action={() => breakIntoTasksAction(projectId)}
      onResult={() => router.refresh()}
    />
  );
}
