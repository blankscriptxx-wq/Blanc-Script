"use client";

import { AiGenerate } from "@/components/ai/ai-generate";
import {
  draftClientEmailAction,
  draftClientSummaryAction,
} from "@/app/(os)/(app)/clients/[id]/ai-actions";

/**
 * Client wrappers around the Clients AI actions. They bind the clientId and
 * supply the thunks AiGenerate expects (the profile is a server component and
 * cannot create those closures itself). Both show the generated text inline
 * with a Copy button.
 */

export function DraftSummaryButton({ clientId }: { clientId: string }) {
  return (
    <AiGenerate
      label="Draft summary"
      action={() => draftClientSummaryAction(clientId)}
    />
  );
}

export function DraftEmailButton({ clientId }: { clientId: string }) {
  return (
    <AiGenerate
      label="Draft email"
      action={() => draftClientEmailAction(clientId)}
    />
  );
}
