# Blanc Script OS — Security & Privacy

**Status:** Planned (v0). Consistent with `_FOUNDATION.md`. Owner: Security Architect.
**Scope:** Threat model and the full control set — authentication, authorisation, RLS as the core isolation, secure file access, secrets, audit logging, handling of stored third-party client credentials, UK GDPR / Data Protection posture, webhook verification, rate limiting, and a security testing checklist.
Companion to `USER_ROLES_AND_PERMISSIONS.md` (the RBAC detail). British English throughout. Everything here is **planned** unless a sibling doc marks it implemented.

> **Guardrail.** Where this document discusses stored third-party client credentials, it addresses only their **secure storage, protection and governance at rest** inside Blanc Script OS. It gives no guidance on using them to access any third-party system.

---

## 1. Security principles

1. **The database is the enforcer.** Isolation and sensitive-data gates live in Postgres RLS (foundation §1/§3). The app is a convenience layer; a bug in it must not breach a tenant. See §3 for the DB-vs-app split.
2. **Deny by default.** No membership → nothing. No capability → no. No portal match → no row.
3. **Least privilege everywhere** — roles lean, capabilities granted explicitly and audited (`USER_ROLES_AND_PERMISSIONS.md` §6).
4. **Secrets are server-only.** No service-role key, provider secret, or BYO AI key ever reaches the client (foundation §2/§35).
5. **Defence in depth.** Clerk authn + server authz + RLS + signed URLs + webhook signatures + rate limits + audit — no single control is load-bearing alone.
6. **Auditable.** Every consequential action and access change is written to `activity_log`.
7. **Privacy by design & default** (UK GDPR Art. 25) — minimise data, scope access, retain only as needed, support erasure.
8. **Adapters contain blast radius.** Each integration sits behind an adapter; a compromised/absent provider degrades gracefully.

---

## 2. Threat model

Scope: a multi-tenant (but agency-operated) PWA on Vercel + Neon + Clerk + R2, with client/talent portals over the same database.

### 2.1 Principals / trust boundaries
- **Internal staff** (owner/ops/account_manager/editor/filmer) — trusted within capability limits.
- **Portal users** (client_user/talent_user) — semi-trusted, confined to their own rows.
- **Anonymous / internet** — untrusted.
- **Integrations** (Xero, social platforms, Frame.io, payment rail, Google, messaging, Claude) — treated as untrusted input at the boundary; verified and adapter-isolated.
- **Background jobs** (Trigger.dev) — privileged server context; must still scope by org.

### 2.2 Key assets
Client PII & brand IP; media (raw + finished, commercially sensitive); financials (invoices, margins, revenue); staff & talent pay and bank-relevant data; **stored third-party client credentials** (crown-jewel secrets); auth tokens & integration secrets; the audit log itself.

### 2.3 Threats & primary mitigations (STRIDE-lite)
| Threat | Example | Primary mitigation |
|---|---|---|
| **Spoofing** | Forged session / role | Clerk-issued, signed, short-lived JWT; server verifies; RLS reads verified claims only |
| **Tampering** | Client edits a request to hit another org/row | RLS `WITH CHECK` on every write; server re-validates capability; no client-trusted ids |
| **Repudiation** | "I didn't release that pay run" | `activity_log` with actor, action, before/after, timestamp; append-only posture |
| **Information disclosure** | Cross-tenant read; IDOR on media/invoice | Tenant + portal RLS; **R2 signed URLs** (§4); no public buckets; capability predicates on money/pay |
| **Denial of service** | Credential stuffing, scraping, webhook flood | Rate limiting (§8), Clerk bot/abuse protection, Vercel edge limits, webhook signature + idempotency |
| **Elevation of privilege** | Self-granting capabilities; AI act beyond user | Self-elevation blocked; AI runs *as the user* through same RLS/guards (`ROLES` §10) |
| **Supply chain** | Compromised dependency / provider | Pinned deps, adapter isolation, least-privilege integration scopes, secret rotation |
| **Insider misuse** | Staff reveals stored client login | `can_manage_client_logins` off-by-default, reveal is audited, dual-control (§7) |

### 2.4 Explicitly out of scope / accepted
- Physical security of provider data centres (delegated to Vercel/Neon/Cloudflare/Clerk).
- Nation-state targeting of the providers themselves.
- Malicious owner of a tenant acting within their own tenant's data (they own it) — except erasure/retention obligations still apply.

---

## 3. What MUST be enforced in the DB vs the app

| Control | Database (RLS/constraints) — **mandatory** | App layer — convenience/UX |
|---|:--:|:--:|
| Tenant isolation (`org_id`) | ✅ sole source of truth | filter lists, friendly errors |
| Portal isolation (client/talent → own rows) | ✅ | hide other areas |
| Money/pay/contract visibility | ✅ capability predicates | hide figures/buttons |
| Pay build vs approve separation | ✅ write policy on approve | disable button |
| Row-scoping (editor/filmer → assigned) | ✅ | pre-filter |
| Hard-erasure integrity | ✅ FK/cascade + path | orchestration UI |
| Capability re-check on mutation | — | ✅ required before write |
| Signed-URL minting | — | ✅ server-only |
| Webhook signature verify | — | ✅ at ingress |
| Rate limiting | partial (DB can't) | ✅ edge/server |
| Input validation / schema | constraints where possible | ✅ Zod at the edge |

Rule of thumb: **anything that protects a tenant or a sensitive field must be re-expressible as an RLS policy or constraint.** The app may *add* friction but must never be the *only* gate.

---

## 4. Authentication & session

- **Provider:** Clerk (organisations + roles). Email/OAuth (Google), MFA available; **MFA required for staff holding** `can_approve_pay`, `can_manage_client_logins`, `can_erase`, `platform_admin`.
- **Sessions:** short-lived JWTs consumed by Neon Authorize; short TTL so revoked capabilities/roles drop out quickly on refresh.
- **Claims:** only non-secret authz facts (`sub`, `org_id`, `role`, `caps[]`, `portal`, `client_id`/`talent_id`) — see `ROLES` §7.4.
- **Portal auth:** separate role class; portal tokens carry `portal` + the owning `client_id`/`talent_id` and nothing else.
- **Account lifecycle:** invite-based onboarding; deactivation removes membership → immediate loss of row access via RLS; portal invites expire and are single-use.
- **Impersonation / "preview-as":** `platform_admin`/`can_impersonate` only, time-boxed, reason-logged, every impersonated action audited as `impersonated_by`.

## 5. Authorisation (summary — detail in RBAC doc)

- Three-layer AND: tenant (RLS) · role (seed) · capability (the real gate).
- Capabilities are the canonical gate for money/pay/contracts/users and are enforced **both** in the app (pre-mutation re-check) **and** in the DB (RLS predicates).
- See `USER_ROLES_AND_PERMISSIONS.md` for the capability set, matrix, overrides, Clerk mapping, and AI gating.

---

## 6. RLS — the core isolation

### 6.1 Baseline (every tenant-scoped table)
```sql
ALTER TABLE <t> ENABLE ROW LEVEL SECURITY;
ALTER TABLE <t> FORCE ROW LEVEL SECURITY;      -- applies even to table owner roles
CREATE POLICY tenant_isolation ON <t>
  USING (org_id = auth.org_id())
  WITH CHECK (org_id = auth.org_id());
```
Applies to **every** spine table (foundation §4): `organisations`/`memberships` (self-scoped), `companies`, `contacts`, `clients`, `leads`, `client_notes`, `brand_assets`, `projects`, `project_templates`, `tasks`, `task_dependencies`, `shoots`, `shoot_briefs`, `shot_lists`, `call_sheets`, `locations`, `equipment`, `crew_assignments`, `media_assets`, `edits`, `edit_assignments`, `reviews`, `revisions`, `approvals`, `deliveries`, `content_items`, `content_calendar`, `social_posts`, `post_metrics`, `quotes`, `proposals`, `invoices`, `invoice_lines`, `expenses`, `payments`, `retainers`, `talent`, `talent_availability`, `talent_payments`, `notifications`, `activity_log`, `integrations`, `ai_threads`/`ai_messages`.

### 6.2 Sensitive-table capability predicates
Money/pay/contract tables add capability checks (examples in `ROLES` §8.3): `invoices`, `invoice_lines`, `quotes`, `proposals`, `payments`, `expenses`, `retainers` → `can_see_money`; `talent_payments` + staff pay → `can_see_actor_pay`/`can_see_staff_pay`; pay-run release → `can_approve_pay` (separate from build).

### 6.3 Portal isolation rules (the hard boundary)
- Portal principals are admitted **only** by explicit portal policies keyed on `client_id = auth.client_id()` or `talent_id = auth.talent_id()`, **and** gated by a staff-controlled `portal_visible`/entitlement flag so nothing surfaces by default.
- Internal-only tables have **no portal policy** → unreachable by portals even within the tenant: `leads`, `client_notes`, `expenses`, margin/cost columns, `activity_log`, `integrations`, `memberships`, staff pay, and the stored-client-login tables.
- A client never reaches talent rows; talent never reaches client commercial rows; neither reaches the other's portal namespace.

### 6.4 Writes
Every policy includes `WITH CHECK` so a user cannot *insert/update a row into another org or another client's scope*. Server-set `org_id` from the verified claim; the client-supplied `org_id` is ignored/overwritten.

### 6.5 Background jobs
Trigger.dev jobs run server-side but must **set the org context** per unit of work (impersonate the tenant's scope) rather than using a blanket superuser connection, so even job code is bounded by org. Cross-org jobs iterate org-by-org.

---

## 7. Secure file & media access (R2)

- **No public buckets** for client media (foundation §1). All objects private.
- **Signed URLs only:** the server mints **short-lived, scoped** pre-signed R2 URLs on demand, *after* an RLS-equivalent capability/ownership check for that `media_asset`/`delivery`/`review`. The signing credential is **server-only**.
- **Least exposure:** URLs are time-boxed (minutes), single-purpose (GET for view/download, PUT for a specific upload key), and never logged in full.
- **Path authority:** object keys are derived server-side from `org_id`/`client_id`/asset id; a client cannot guess or enumerate another org's keys, and even a leaked key expires.
- **Portal media:** a `client_user` gets signed URLs only for deliverables explicitly released to them (`can_deliver` + `portal_visible`); raw internal footage is never signed to a portal.
- **Review/delivery adapters** (Frame.io / Stream fallback): same posture — access brokered server-side, provider links scoped and expiring.
- **Uploads:** direct-to-R2 via short-lived presigned PUT to a server-fixed key; server validates content-type/size and records the `media_asset` row (RLS-scoped).

---

## 8. Secrets handling

- **Server-only, always.** Service-role keys, R2 signing keys, integration client secrets/tokens, Resend, Trigger.dev, and the **bring-your-own Anthropic key** live only in server env / secret store (Vercel encrypted env vars / provider secret manager). **Never** shipped to the client, never in `NEXT_PUBLIC_*`, never in the bundle.
- **Clear public/private split** (foundation §2): only genuinely public config (e.g. Clerk publishable key) is client-exposed; everything else is server.
- **Per-tenant integration secrets** stored encrypted in `integrations` (or a secret store keyed by org), decrypted only server-side at use.
- **Rotation:** documented rotation for provider keys and signing keys; revocation on staff offboarding; no long-lived shared credentials.
- **No secrets in logs, errors, URLs, or the audit log.** Error reporting scrubs tokens/keys.
- **AI key isolation:** the BYO Claude key is used only by server-side AI calls; AI tool execution carries the *user's* authz, not a privileged key (RBAC §10.1).

---

## 9. Audit logging (`activity_log`)

- **What's logged:** every consequential action (create/update/archive/erase of business records, invoice state changes, pay-run build/approve, publishes, sends), every **access change** (role/capability grant/revoke), every **reveal** of a stored client login, every impersonation, and security events (failed authz, rate-limit trips).
- **Shape (planned):** `org_id`, `actor_id` (+ `impersonated_by` if applicable or `via_ai = true`), `action`, `entity_type`, `entity_id`, `before`/`after` (diff or summary; sensitive fields redacted), `reason` (for sensitive grants/reveals), `ip`/`user_agent` where appropriate, `at`.
- **Integrity:** append-only posture — no UPDATE/DELETE policy for ordinary roles; corrections are new rows. RLS-scoped per org; readable only with `can_view_audit`; **never** exposed to portals.
- **AI actions** appear in the log exactly like human ones, tagged `via_ai` with the tool and mode, so AI-initiated changes are reviewable.
- **Retention:** audit retained per the retention schedule (§11) and for legal/defensibility; not erased by a routine DSAR unless law requires (balanced against legal-basis for keeping it).

---

## 10. Stored third-party client credentials (if offered)

The agency may, as a convenience, store logins it holds on a client's behalf. These are the **highest-sensitivity data** in the system and are governed tightly. *(This section covers protection only; it gives no guidance on using such credentials against any third-party system.)*

- **Opt-in feature**, off unless the org enables it; access gated solely by `can_manage_client_logins` — **off by default for everyone, including owners** (RBAC §4.3).
- **Encryption at rest:** stored encrypted with a dedicated key (envelope encryption; key in a server-side KMS/secret store, **not** in the DB). Ciphertext only in Postgres; decryption only server-side at an authorised reveal.
- **Least privilege + separation:** the storing table has **no portal policy** and strict RLS; even in-tenant staff without the flag see nothing. The secret is never included in list/search responses.
- **Reveal is an event, not a read:** every reveal requires the capability, a logged **reason**, and writes an `activity_log` entry (actor, which login, when, why) — matching and improving Centauri's reveal/delete + "audit of access changes". Re-authentication/MFA step-up for reveal.
- **Lifecycle:** save / update / delete are all audited; deletion is a hard delete of the secret. Credentials are rotated-out on client offboarding and included in erasure (§11).
- **No client-side exposure:** a decrypted secret is returned to exactly one authorised reveal action and never cached client-side or logged.
- **Minimisation:** store only what the client has explicitly asked the agency to hold; prefer delegated/OAuth connections over stored passwords wherever a provider supports it.

---

## 11. UK GDPR / Data-Protection posture

Blanc Script OS operates under the **UK GDPR** and **Data Protection Act 2018**; the agency is the **data controller** for client/talent/staff personal data, Blanc Script OS (and its sub-processors) act as **processor** for client end-data where applicable. PECR applies to any marketing/messaging.

### 11.1 Lawful basis (planned mapping)
| Processing | Lawful basis |
|---|---|
| Staff/talent accounts & pay | Contract; legal obligation (tax/payroll records) |
| Client records, projects, invoices | Contract; legitimate interests (running the engagement) |
| Audit & security logging | Legal obligation; legitimate interests (security) |
| Marketing/analytics on own channels | Legitimate interests / consent (PECR for messaging) |
| Stored third-party client credentials | Contract + explicit client instruction |

### 11.2 Data subject rights
- **Access / portability (DSAR):** per-subject **export** compiling their personal data across spine tables (profile, contacts, messages, bookings, pay, invoices) into a portable format; served within statutory time (1 month). Capability-gated and audited.
- **Rectification:** editable via normal flows; corrections audited.
- **Erasure ("forget me"):** an explicit **hard-erasure path** (foundation §2 allows hard-delete *only* via this path), gated by `can_erase` with owner sign-off (dual-control). It:
  1. hard-deletes/anonymises the subject's personal data across the spine (contacts, notes, messages, media PII, stored logins),
  2. preserves what law requires (e.g. invoices/financial records for HMRC retention) in **anonymised/pseudonymised** form,
  3. propagates erasure requests to processors/integrations where the data was shared,
  4. writes an erasure record to `activity_log` (the fact of erasure is retained, not the erased content).
  Mirrors Centauri's `forget_me` but with explicit dual-control and retention-aware carve-outs.
- **Objection/restriction:** supported via account flags that suppress processing.

### 11.3 Retention
- Soft-delete (`archived_at`) for business records; **hard-delete only via the erasure path** (foundation §2).
- Retention schedule (planned): financial records kept to meet **HMRC (6 years)**; operational records to engagement + a defined window; audit logs per security policy; media per client contract; **stored client logins only while the client wants them held.**
- Automated retention sweeps via Trigger.dev, org-scoped, audited.

### 11.4 Processors & international transfers
- **Sub-processor list (planned):** Vercel (hosting), Neon (database), Clerk (auth/identity), Cloudflare R2 (media), Trigger.dev (jobs), Resend (email), Anthropic (AI, server-side, BYO key), plus engagement-specific integrations (accounting, social platforms, review/delivery, payment rail, messaging).
- Maintain a **Record of Processing Activities (ROPA)** and **DPAs** with each processor.
- **International transfers** (US-based providers) covered by appropriate transfer mechanisms (UK IDTA / Addendum to SCCs); documented per processor.
- **DPIA** performed for high-risk processing (stored credentials, AI over personal data, pay data).
- **Breach process:** detect → contain → assess → notify **ICO within 72h** where required, and affected individuals where high risk; drill via the testing checklist (§13).

---

## 12. Integration security

- **Webhook signature verification (MUST):** every inbound webhook (payment rail, social platforms, messaging, accounting, Clerk) is verified against its provider signature/secret at ingress **before** any processing; unsigned/invalid → rejected and logged. **Idempotency keys** prevent replay/duplication; timestamp/nonce checks reject stale deliveries.
- **Least-privilege scopes:** request the minimum OAuth scopes per integration; store tokens encrypted (§8); refresh server-side.
- **Adapter isolation:** each provider behind an adapter interface (foundation §1) so a compromise or outage is contained and the app degrades gracefully.
- **Outbound:** server-side only; no provider secret in client calls; validate/parse provider responses as untrusted input.

## 13. Rate limiting & abuse protection

- **Auth endpoints:** Clerk bot/credential-stuffing protection + additional server throttling on sign-in/invite/reveal actions.
- **API/mutations:** per-user and per-org rate limits at the edge/server (e.g. sliding-window, keyed by `sub`+`org_id`); stricter limits on expensive/sensitive ops (exports, reveals, pay runs, bulk sends, AI act-tools).
- **Webhooks:** per-source limits + idempotency to absorb floods.
- **AI:** per-user/per-org budget + call limits (`can_settings`); act-tools additionally rate-limited.
- **Enumeration defence:** signed URLs + unguessable ids + uniform "not found" responses to avoid confirming existence across tenants.

---

## 14. Application-layer hardening

- **Security headers (match/exceed Centauri):** strict **CSP** (scripts same-origin; public config in separate static files, not inline), `X-Frame-Options: DENY` / `frame-ancestors 'none'`, **HSTS** (long max-age, preload), `X-Content-Type-Options: nosniff`, tight `Permissions-Policy`, `Referrer-Policy`, `X-Robots-Tag: noindex` for the app.
- **Input validation:** Zod schemas at every server boundary; parameterised queries via Drizzle (no string-built SQL); output encoding to prevent XSS.
- **CSRF:** same-site cookies + Clerk session handling; state-changing routes require the verified session.
- **Dependency hygiene:** pinned versions, automated vulnerability scanning, no unnecessary deps (foundation §1).
- **Error handling:** no secrets/stack detail to the client; server-side structured logging with scrubbing.
- **PWA/service worker:** cache only non-sensitive assets; never cache authed API responses containing PII/media.

---

## 15. Security testing checklist (planned, pre-release & ongoing)

**Tenant & portal isolation**
- [ ] Cross-tenant read/write attempts return 0 rows / rejected (RLS), for every spine table.
- [ ] `client_user` cannot reach another client's rows by id manipulation (IDOR).
- [ ] `talent_user` cannot reach another talent's or any client-commercial rows.
- [ ] Portals cannot read internal-only tables (leads, notes, expenses, audit, integrations, stored logins).

**Capabilities / authz**
- [ ] Money/pay/contract tables invisible without the capability — in app **and** verified at the DB with the capability stripped.
- [ ] Pay **build** without **approve** cannot release a run (separation of duties).
- [ ] Self-elevation of capabilities blocked; sensitive grants require owner + audit.
- [ ] Editor/filmer row-scoping holds (no access to unassigned records).

**AI gating**
- [ ] AI read tools return only RLS-visible rows for the calling user.
- [ ] AI `direct`/`confirm`/`ask` modes enforced server-side; `ask` actions cannot execute without confirmation.
- [ ] Prompt-injection cannot make the AI exceed the user's capabilities (guard is `has_cap`, not prompt).
- [ ] Pay-run **release** is not reachable as any AI tool.

**Files/secrets**
- [ ] Signed URLs expire; expired/mismatched keys denied; no public bucket access.
- [ ] No service-role/signing/integration/AI keys in the client bundle or `NEXT_PUBLIC_*`.
- [ ] Stored client-login reveal requires capability + MFA step-up + logged reason; secret never in lists/logs.

**Integrations/abuse**
- [ ] Unsigned/replayed webhooks rejected; idempotency prevents duplicates.
- [ ] Rate limits trip on brute force / scraping / bulk sends.
- [ ] Headers (CSP/HSTS/frame/nosniff) present and strict.

**Privacy**
- [ ] DSAR export returns a complete, scoped per-subject bundle.
- [ ] Erasure path hard-deletes/anonymises, respects HMRC-retained records, propagates to processors, and logs the erasure.
- [ ] Retention sweeps run org-scoped and audited.

**Process**
- [ ] Dependency & secret scanning in CI; pentest before major release.
- [ ] Breach/incident runbook rehearsed (incl. ICO 72h notification path).

---

## 16. Open items for Lead decision
1. **KMS choice** for envelope-encrypting stored client logins and R2 signing (provider KMS vs. app-managed keys) and rotation cadence.
2. **MFA enforcement scope** — which exact capabilities mandate MFA step-up (proposal: approve-pay, manage-client-logins, erase, platform-admin).
3. **Audit immutability level** — append-only policy vs. write-once external log sink for tamper-evidence.
4. **Retention schedule specifics** per data class (beyond the HMRC 6-year financial floor).
5. **Whether to offer stored client credentials at all** in v1, given the risk/benefit; default recommendation is **deferred / off** until KMS + dual-control + reveal-audit are fully implemented.
6. **DPIA ownership & sub-processor DPAs** — who signs, where the ROPA lives.
</content>
