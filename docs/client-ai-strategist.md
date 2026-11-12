# Per-client AI strategist

Each client has a dedicated AI strategist with a growing "brain", reached from the
client profile → **AI Strategist**, at `/clients/[id]/strategy`.

## What's built (wave 1)
- **Brain** (`client_profiles` + `client_knowledge`): a brand/audience/tone/pillars
  profile plus an append-only knowledge base. **AI web research** (Claude's web search)
  studies the niche + competitors and **proposes** findings; you **approve** them into
  the brain (curated memory — nothing enters without a human nod). Manual entries are
  approved by definition.
- **Chat** (`client_threads` + `client_messages`): a persisted, per-client conversation
  grounded in the brain + the client's data. Plan, ideate, ask for scripts.
- **Script studio** (`scripts`): generate a script with an explicit **visual hook +
  script hook + body + format**; move it idea → draft → review → approved → produced;
  **Push to Content** creates a scheduled content item (closing the loop into the OS).
- All grounded in `buildBrainContext()` so every generation improves as the brain grows.

## Needs the key
All generation uses Claude — set `ANTHROPIC_API_KEY` (Settings → Integrations). Research
also needs web search, which the model does server-side. Without the key the UI shows a
clean "connect AI" state.

## Wave 2 (to-do)
- **Continual learning loop**: when a script is produced or a result is logged, have the
  AI propose a `performance` insight automatically (still approve-gated).
- **Capture insight from chat**: a button on an assistant message → propose it to the brain.
- **Script versions**: iterate a script (v1 → v2) with the brain + feedback.
- **Visual hook references**: attach example frames/media (via the R2 media pipeline) to a hook.
- **Idea backlog & calendar fill**: generate a month of ideas and drop them onto the
  content calendar in one go.
- **Competitor tracking**: periodic re-research (scheduled) to keep the landscape fresh.
- **Per-client model/tone tuning**: pin tone/format defaults per client.
