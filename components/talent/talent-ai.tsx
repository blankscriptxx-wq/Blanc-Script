"use client";

import { AiGenerate } from "@/components/ai/ai-generate";
import {
  draftTalentBioAction,
  draftOutreachAction,
} from "@/app/(app)/talent/[id]/ai-actions";

/**
 * Client wrappers around the Talent AI actions. They bind the talentId and
 * supply the thunks AiGenerate expects (the profile is a server component and
 * cannot create those closures itself). Each shows the drafted text inline with
 * a Copy button.
 */

export function DraftBioButton({ talentId }: { talentId: string }) {
  return (
    <AiGenerate label="Draft bio" action={() => draftTalentBioAction(talentId)} />
  );
}

export function DraftOutreachButton({ talentId }: { talentId: string }) {
  return (
    <AiGenerate
      label="Draft outreach"
      action={() => draftOutreachAction(talentId)}
    />
  );
}
