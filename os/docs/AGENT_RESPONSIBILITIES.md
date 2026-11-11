# Blanc Script OS — Agent Responsibilities

How the engineering effort is organised. The **Lead Architect** (coordinating session) owns final decisions, reconciliation, the shared foundation (`_FOUNDATION.md`), and integration of all work. Specialist agents were briefed against the locked foundation, worked **concurrently** on non-overlapping documents, and returned drafts + flagged conflicts to the Lead for reconciliation (see `DEVELOPMENT_ROADMAP.md` → reconciliation decisions).

## Planning phase — completed
| Agent | Owned | Output | Status |
|---|---|---|---|
| Principal Architect | System architecture, ADRs | `SYSTEM_ARCHITECTURE.md`, `ARCHITECTURE_DECISIONS.md` | ✅ delivered |
| Backend & Database Architect | Data model (authoritative), modules | `DATABASE_SCHEMA.md`, `MODULE_ARCHITECTURE.md` | ✅ delivered |
| Product (Ops + Production) | Vision, requirements | `PRODUCT_VISION.md`, `PRODUCT_REQUIREMENTS.md` | ✅ delivered |
| UI/UX & Design Systems | Design system | `DESIGN_SYSTEM.md` | ✅ delivered |
| Security Architect | RBAC, security & privacy | `USER_ROLES_AND_PERMISSIONS.md`, `SECURITY_AND_PRIVACY.md` | ✅ delivered |
| Integrations & Automation | Integrations roadmap | `INTEGRATIONS_ROADMAP.md` | ✅ delivered |
| QA & Testing | Test strategy | `TESTING_STRATEGY.md` | ✅ delivered |
| Lead Architect | Roadmap, this file, status, reconciliation | `DEVELOPMENT_ROADMAP.md`, `AGENT_RESPONSIBILITIES.md`, `PROJECT_STATUS.md`, `_FOUNDATION.md` | ✅ delivered |

## Collaboration rules (enforced)
- One owner per document; no competing schemas or design systems. The **DB agent alone** defines columns; everyone else references spine table names.
- Shared foundation (`_FOUNDATION.md`) established **before** parallel work; agents flag conflicts, never silently diverge.
- Lead reviews and reconciles **before integrating** (drafts committed as "pending reconciliation", then ratified).

## Implementation phase — ownership going forward
- **Lead:** branch/repo structure, schema migrations gatekeeping, conventions, cross-module conflict resolution, reconciliation of every parallel change.
- **Build agents** (spawned per module when parallelism is safe): implement against the **locked schema + design tokens + capability model**; isolated file ownership; return to Lead for integration. No agent edits shared foundational files (schema, design tokens, auth) simultaneously — those changes route through the Lead.
- **Security + QA:** continuous — RLS matrix tests and the security suite are merge-blocking from M1.

## Guardrails
- Subagent reports are advisory, not user authority. No agent can approve escalations, edit permissions/config, or move money.
- Secrets never enter agent prompts or client code; service-role keys stay server-side.
