# Blanc Script OS — User Roles & Permissions (RBAC Model)

**Status:** Planned (v0). Consistent with `_FOUNDATION.md`. Owner: Security Architect.
**Scope:** The complete role / capability model, the role→capability default matrix, per-user overrides, the Clerk→Neon mapping, concrete per-system behaviour, and AI action-gating. Companion to `SECURITY_AND_PRIVACY.md`.
British English throughout. Everything here is **planned** unless a sibling doc marks it implemented.

> **Guardrail.** This document defines *who may see and do what inside Blanc Script OS*. It does **not** describe, advise on, or endorse using any stored credential to access a third party's system. Stored third-party client logins are treated purely as sensitive data at rest (see `SECURITY_AND_PRIVACY.md` §7).

---

## 1. Model shape (how authorisation is decided)

Authorisation in Blanc Script OS is a **three-layer AND**:

1. **Tenant** — every request is scoped to one `org_id`. No row of another organisation is ever reachable. Enforced in the **database** by RLS (§8), not by the app.
2. **Role** — one coarse role per membership (`memberships.role`) that seeds a default capability set.
3. **Capability flags** — fine-grained booleans (`memberships.capabilities` JSONB) that are the *actual* gate for every sensitive action. Roles are a convenience; **capabilities are the truth**.

```
allowed(action) = same_org(row)              -- layer 1, DB-enforced (RLS)
               AND role_permits(action)       -- layer 2, coarse
               AND capability(action) == true -- layer 3, the real check
```

Design rules:
- **Capabilities, not roles, guard money/pay/contracts/users.** Code and RLS check `can_see_money`, never `role = 'owner'`. This lets us grant an account manager invoicing without promoting them, and lets us *remove* a capability from an owner-equivalent without demotion.
- **Deny by default.** A missing or unknown capability = `false`. A user with no membership in an org sees nothing.
- **Portals are a hard boundary.** `client_user` and `talent_user` are **not** internal roles with fewer flags; they are a separate class confined to portal tables and their own rows (§6, §8.4). They never receive internal capabilities.
- **Least privilege + override.** Defaults are deliberately lean; access is widened per-user by explicit override, and every override is audited.

This improves on Centauri's observed pattern (five roles + ad-hoc capability booleans checked in the UI) by (a) making capabilities the **database-enforced** gate rather than UI-only, (b) giving every capability a single canonical name shared by app and RLS, and (c) making every grant/override an audited event.

---

## 2. Internal roles

Staff belong to the agency organisation via a `memberships` row (`user ↔ org + role + capabilities`). One primary role per membership.

| Role | Who | Essence |
|---|---|---|
| `owner` | Founder(s) / directors | Full control incl. money, pay approval, contracts, user management, settings, erasure sign-off. The only role that can grant `can_manage_users` to others and approve pay runs by default. |
| `ops` (admin) | Operations / studio manager | Runs the agency day-to-day: clients, projects, shoots, scheduling, archiving, invoicing. Sees money; does **not** approve pay or manage billing-level settings unless granted. |
| `account_manager` | Client-facing staff | Owns client relationships, pipeline, briefs, content, portal invites. **No money, no pay, no user management** by default. Can contract only if granted. |
| `editor` | Post-production | Edits assigned to them, media, reviews, revisions, delivery. No client money, no pay, no CRM admin. |
| `filmer` | On-shoot videographer | Their call sheets, shot lists, shoot status, upload footage, their own tasks. Narrowest internal role. |

Notes:
- There is **no standalone `superadmin` role** in the product. Platform/break-glass administration is a separate, audited operational capability (`platform_admin`, §4) held by named individuals, not a product role shown in the org chart. This avoids Centauri's ambiguous "SuperAdmin".
- `ops` is the stored value for admin; UI label is "Admin / Operations".

---

## 3. External user types (portal-only, strongly isolated)

| Type | Portal | Can reach |
|---|---|---|
| `client_user` | Client portal | **Only their own client's** projects, shoots, deliverables for approval, invoices (view/pay), messages, and brand assets they're entitled to. Scoped to one `client_id` (occasionally several, by explicit link rows). |
| `talent_user` | Talent portal | **Only their own** profile, availability, bookings they're cast on, their own pay statements, and onboarding. Never another talent's data, never client commercials. |

External users:
- Live in `memberships` with a portal role **or** in dedicated portal link tables (DB agent owns the exact shape; this doc assumes a membership-style link carrying `client_id`/`talent_id`).
- Carry **no** internal capability flags. Their JWT marks them `portal: client|talent` and the RLS portal policies (§8.4) are the only policies that admit them.
- Cannot see: other clients, other talent, internal costs, margins, actor pay, staff pay, the pipeline, internal notes, the activity log, settings, or the AI's act-tools.
- **Never reuse an actor across clients** (a Centauri rule we keep): enforced as a booking constraint and reflected in what a `talent_user` is shown.

---

## 4. The capability flag set

Expanded from the foundation's list (`can_see_money`, `can_invoice`, `can_pay_team`, `can_approve_pay`, `can_see_actor_pay`, `can_manage_users`, `can_settings`, `can_contract`, `can_edit_fees`, `can_archive`) and reconciled with the Centauri capability booleans. Canonical `snake_case` names are used identically in app code, JWT claims, and RLS.

### 4.1 Money & commercials
| Capability | Grants |
|---|---|
| `can_see_money` | See any monetary figure: quotes, invoices, revenue, retainer value, expenses, margins. The master money gate. |
| `can_invoice` | Create/send invoices, mark paid/void, issue credit notes. Requires `can_see_money`. |
| `can_edit_fees` | Change project/retainer fees, day rates, package pricing. |
| `can_contract` | Create/send/countersign contracts & proposals; edit contract terms. |
| `can_see_margin` | See cost vs. price and profitability (stricter than `can_see_money`). |

### 4.2 Pay (staff + talent)
| Capability | Grants |
|---|---|
| `can_see_actor_pay` | View talent pay amounts and statements. |
| `can_see_staff_pay` | View staff/editor pay and rates. |
| `can_pay_team` | Build pay runs (aggregate what's owed). Build only — not release. |
| `can_approve_pay` | Approve/release a pay run for payment execution. **Separation of duties: distinct from `can_pay_team`.** |

### 4.3 People & access
| Capability | Grants |
|---|---|
| `can_manage_users` | Invite/remove members, change roles, set capability overrides, manage portal invites. |
| `can_settings` | Org settings, branding/skins, integrations connect/disconnect, AI budget. |
| `can_manage_integrations` | Connect/disconnect integrations specifically (splittable from general settings). |
| `can_view_audit` | Read the `activity_log` / access-change history. |
| `can_manage_client_logins` | Manage the agency's record of stored third-party client credentials: save, update, **reveal** (audited), delete. Highest-sensitivity flag; off by default for everyone. |

### 4.4 Records & lifecycle
| Capability | Grants |
|---|---|
| `can_archive` | Archive/restore business records (soft-delete). |
| `can_erase` | Initiate/execute the GDPR hard-erasure path (dual-control with owner sign-off). |
| `can_edit` | Create/update core operational records (clients, projects, tasks, shoots, content). |
| `can_act` | Permission to perform *consequential* actions at all (send messages, publish, book) vs. read-only. Gates AI act-tools and bulk sends. |
| `can_manage_talent` | Add/edit talent book, casting, availability. |
| `can_publish` | Publish/schedule social posts to live platforms. |
| `can_deliver` | Mark edits delivered / release deliverables to the client portal. |

### 4.5 Operational / platform (not product roles)
| Capability | Grants |
|---|---|
| `platform_admin` | Break-glass support: impersonation / "preview-as", cross-tenant diagnostics. Held by named engineers, time-boxed, always audited, requires a logged reason. Never a default of any product role. |
| `can_impersonate` | The "preview profile / see-as" capability specifically, subset of platform duties, audited per use. |

> The old Centauri booleans map cleanly: `canManage→can_edit`, `canPayTeam→can_pay_team`, `canApprovePay→can_approve_pay`, `canSeeActorPay→can_see_actor_pay`, `canInvoice→can_invoice`, `canSeeMoney→can_see_money`, `canFees/canEditFees→can_edit_fees`, `canSettings→can_settings`, `canManageUsers→can_manage_users`, `canLogins→can_manage_client_logins`, `canContract→can_contract`, `canArchive→can_archive`, `canEdit→can_edit`, `canName→(UI only, dropped)`, `canAct→can_act`.

---

## 5. Role → capability default matrix

Legend: ● default on · ○ default off (grantable per-user) · — never applicable.
Portals occupy separate columns because they are a different class, not "roles with fewer flags".

| Capability | owner | ops/admin | account_manager | editor | filmer | client_user | talent_user |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| `can_edit` | ● | ● | ● | ●¹ | ●¹ | — | — |
| `can_act` | ● | ● | ● | ○ | ○ | — | — |
| `can_see_money` | ● | ● | ○ | — | — | own invoices² | — |
| `can_see_margin` | ● | ○ | ○ | — | — | — | — |
| `can_invoice` | ● | ● | ○ | — | — | — | — |
| `can_edit_fees` | ● | ○ | ○ | — | — | — | — |
| `can_contract` | ● | ○ | ○ | — | — | — | — |
| `can_see_actor_pay` | ● | ● | ○ | — | — | — | own only³ |
| `can_see_staff_pay` | ● | ○ | — | own only³ | own only³ | — | — |
| `can_pay_team` | ● | ○ | — | — | — | — | — |
| `can_approve_pay` | ● | ○ | ○ | — | — | — | — |
| `can_manage_talent` | ● | ● | ● | — | ○ | — | — |
| `can_publish` | ● | ● | ● | ○ | — | — | — |
| `can_deliver` | ● | ● | ● | ● | — | — | — |
| `can_archive` | ● | ● | ●⁴ | ○ | — | — | — |
| `can_erase` | ● | ○ | — | — | — | — | — |
| `can_manage_users` | ● | ○ | — | — | — | — | — |
| `can_settings` | ● | ○ | — | — | — | — | — |
| `can_manage_integrations` | ● | ○ | — | — | — | — | — |
| `can_view_audit` | ● | ● | ○ | — | — | — | — |
| `can_manage_client_logins` | ○⁵ | ○ | — | — | — | — | — |
| `platform_admin` / `can_impersonate` | ○⁶ | — | — | — | — | — | — |

Footnotes:
1. Editor/filmer `can_edit` is **scoped** to records assigned to them (their edits, their shoots/tasks), enforced by RLS row predicates, not just the flag.
2. A `client_user` seeing "money" means only **their own** invoices (view + pay), never agency revenue, margin, or costs.
3. "own only" = a row-level self-filter, not the staff capability; a talent/editor sees **their own** statements through the portal/profile view, decided by RLS, not by the money flags.
4. Account managers may archive, matching Centauri's "archiving needs an admin or an account manager".
5. Even for owners, `can_manage_client_logins` is **off by default** and must be explicitly enabled — it is the single most sensitive flag.
6. `platform_admin` is not granted by product role assignment; it is provisioned separately to named individuals.

---

## 6. Per-user overrides

Roles seed defaults; **every capability is individually overridable per membership**.

- **Storage:** `memberships.capabilities` is a JSONB object of explicit overrides, e.g. `{"can_invoice": true, "can_archive": false}`. Absent keys fall back to the role default from a server-owned default map (versioned in code, not the DB, so defaults can be reviewed in PRs).
- **Effective capability** = `override[cap]` if the key is present, else `ROLE_DEFAULTS[role][cap]`, else `false`.
- **Who may change overrides:** only `can_manage_users`. Nobody may grant themselves a capability; self-service elevation is blocked server-side (the editor of the membership must differ from its subject for any *elevation*, or require a second approver for high-sensitivity flags).
- **Sensitive-flag rules:**
  - `can_approve_pay`, `can_manage_client_logins`, `can_erase`, `platform_admin` require **owner** action to grant and are **double-logged** (who granted, to whom, when, why).
  - Granting `can_approve_pay` to someone who also holds `can_pay_team` is allowed but **flagged** in the audit as a separation-of-duties exception for review.
- **Every change is an `activity_log` event** of kind `access_change` capturing `actor_id`, `subject_id`, `capability`, `from`, `to`, `reason`, `at`. This mirrors and improves Centauri's "approvals & access" + "audit of access changes".
- **Revocation is immediate at the DB layer** because RLS reads the live claim/row (§8.5) — no waiting for a session to expire for *row* access; JWT-cached claims refresh on the next token mint (keep token TTL short, §Security doc).

Example overrides:
- Senior account manager who invoices: `account_manager` + `{can_see_money:true, can_invoice:true}`.
- Lead editor who also schedules posts: `editor` + `{can_publish:true, can_act:true}`.
- Ops person explicitly barred from pay: `ops` + `{can_see_staff_pay:false, can_approve_pay:false}`.

---

## 7. Mapping to Clerk (organisations, roles, metadata, JWT claims)

Clerk is the identity provider; Neon Authorize consumes its JWT so RLS can read the authenticated principal.

### 7.1 Organisations
- One Clerk **Organization** per tenant = one `organisations.org_id`. The Clerk org id is stored on the org record so the two stay joined.
- A user may belong to multiple Clerk orgs (e.g. an agency with sub-brands); the **active org** is carried in the token (`org_id` / `o.id`) and is what every RLS policy scopes to.
- **Portal users** are modelled as members of the same Clerk org but with a portal role and a portal public-metadata marker; they are admitted *only* by portal RLS policies. (If Clerk org-member role granularity proves limiting for portals, the fallback is a separate Clerk instance/org per portal class — an open item for Lead, see §12.)

### 7.2 Roles
- Clerk org roles map 1:1 to our stored roles: `org:owner`, `org:ops`, `org:account_manager`, `org:editor`, `org:filmer`, plus `portal:client`, `portal:talent`.
- The role is the **seed only**; capabilities are the gate.

### 7.3 Metadata → capabilities
- Effective capabilities are computed server-side (role defaults + overrides from `memberships.capabilities`) and written into the Clerk **JWT session claims** via a custom claims template, so the database sees them without a round-trip.
- Only **non-secret** authorisation facts live in claims. No keys, no PII beyond ids.

### 7.4 JWT claim shape (planned)
Minted into every session token for Neon Authorize:
```jsonc
{
  "sub": "user_...",            // Clerk user id -> users.clerk_id
  "org_id": "uuid",            // active tenant  -> RLS tenant scope
  "role": "account_manager",   // seed role
  "caps": ["can_edit","can_act","can_publish","can_manage_talent",
            "can_archive","can_view_audit"],   // effective capabilities (array of true flags)
  "portal": null,              // or "client"/"talent"
  "client_id": null,           // set for client_user -> portal row scope
  "talent_id": null            // set for talent_user -> portal row scope
}
```
Rules:
- `caps` contains only the flags that are **true** for this user (deny-by-default: absence = no).
- Tokens are **short-lived** (≈60s Neon Authorize posture / short session TTL) so revoked capabilities drop out quickly on refresh.
- The app **re-checks** capabilities server-side on every mutation even though the claim exists — the claim is for the DB; the app must not trust the client to have filtered.

---

## 8. Flow into Neon RLS

RLS is the **primary isolation mechanism** (foundation §1/§3). The app is a convenience layer; **the database is the enforcer**.

### 8.1 Reading the principal in Postgres
Neon Authorize exposes the verified JWT to SQL. Helper SQL functions (DB agent owns exact form) read claims:
```sql
auth.org_id()   -- current tenant uuid from token
auth.user_id()  -- maps sub -> users.id
auth.has_cap(text) -- true if the capability is present in caps[]
auth.portal()   -- 'client' | 'talent' | null
auth.client_id()/auth.talent_id()
```

### 8.2 Tenant isolation (every tenant table)
Every `org_id`-scoped table carries, at minimum:
```sql
ALTER TABLE <t> ENABLE ROW LEVEL SECURITY;
ALTER TABLE <t> FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON <t>
  USING (org_id = auth.org_id())
  WITH CHECK (org_id = auth.org_id());
```
This is the non-negotiable floor for all spine tables (`clients`, `projects`, `tasks`, `shoots`, `media_assets`, `invoices`, `talent_payments`, `activity_log`, …).

### 8.3 Capability predicates on sensitive tables
Money/pay/contract tables add capability predicates so even an in-tenant user without the flag reads nothing:
```sql
-- invoices: visible only to money-cleared staff, OR to the owning client in the portal
CREATE POLICY invoices_read ON invoices FOR SELECT
  USING (
    org_id = auth.org_id() AND (
       auth.has_cap('can_see_money')
       OR (auth.portal() = 'client' AND client_id = auth.client_id())
    )
  );

-- talent_payments: staff need can_see_actor_pay; talent see only their own row
CREATE POLICY talent_pay_read ON talent_payments FOR SELECT
  USING (
    org_id = auth.org_id() AND (
       auth.has_cap('can_see_actor_pay')
       OR (auth.portal() = 'talent' AND talent_id = auth.talent_id())
    )
  );

-- pay run release is write-gated AND separated from build
CREATE POLICY pay_run_approve ON pay_runs FOR UPDATE
  USING (org_id = auth.org_id() AND auth.has_cap('can_approve_pay'))
  WITH CHECK (org_id = auth.org_id() AND auth.has_cap('can_approve_pay'));
```

### 8.4 Portal isolation
Portal rows are reachable **only** through portal policies, and only for the matching `client_id`/`talent_id`:
```sql
CREATE POLICY client_portal_projects ON projects FOR SELECT
  USING (org_id = auth.org_id()
         AND auth.portal() = 'client'
         AND client_id = auth.client_id()
         AND portal_visible = true);   -- staff decide what surfaces
```
Internal-only tables (`leads`, `client_notes`, `expenses`, `talent_payments` costs, `activity_log`, `integrations`) have **no** portal policy at all → portals cannot touch them even in-tenant.

### 8.5 Row-scoped roles (editor/filmer)
Narrow roles add assignment predicates so the flag alone isn't enough:
```sql
CREATE POLICY editor_edits ON edits FOR ALL
  USING (org_id = auth.org_id()
         AND (auth.has_cap('can_view_audit')  -- managers see all
              OR assigned_editor_id = auth.user_id()));
```

### 8.6 What MUST be in the DB vs the app
- **DB (RLS) — mandatory:** tenant isolation, portal isolation, money/pay/contract visibility, row-scoping for narrow roles, hard-erasure constraints. If the app has a bug, the DB still refuses.
- **App — convenience + UX:** hiding buttons, pre-filtering lists, friendly errors, orchestrating multi-step writes, re-validating capability before a mutation. The app **must assume RLS is the backstop** and never be the sole gate for anything sensitive.

---

## 9. Concrete behaviour across the 10 systems

What each principal can / cannot see or do. (Systems A–J per foundation §5.)

### A. Command Centre
- **owner/ops:** full "today" feed incl. overdue invoices, pay waiting, margin alerts.
- **account_manager:** their clients' footage due, edits, portal logins waiting, tasks — **no** money/pay cards unless `can_see_money`.
- **editor/filmer:** only their assignments ("where am I filming next", "edits due").
- **portals:** no Command Centre; they get a portal home scoped to their own items.

### B. CRM & Client Management
- **account_manager:** full client records, pipeline, briefs, portal invites, notes.
- **editor/filmer:** read the client context needed for their work; no pipeline, no notes editing.
- **client_user:** sees only their own brand kit/entitled assets and their messages — **never** the pipeline, internal notes, other clients, or lead/churn data.
- Client **deletion/erasure** gated to `can_erase` (owner).

### C. Projects & Tasks
- All internal roles see projects in their org; **edit** scoped by `can_edit` and assignment. Filmer sees shoot-linked tasks and their own.
- **client_user:** sees only `portal_visible` project milestones/approvals for their client.

### D. Production Studio (shoots)
- **ops/account_manager:** book, brief, shot list, call sheet, cast, cancel (cancel/edit gated like Centauri to management).
- **filmer:** their call sheet, shot list, "on site" status, upload footage; cannot cancel a shoot or change fees.
- **client_user:** sees their own upcoming shoot summary if surfaced; never crew pay, never locations pricing/margin.

### E. Post-production Studio
- **editor:** their assigned edits, media, revisions, mark delivered (`can_deliver`).
- **account_manager:** oversight of client's edits, push to portal.
- **client_user:** review + approve **their** deliverables only; sees review links (R2/Frame.io signed), not raw internal media.

### F. Content & Social Studio
- **account_manager/editor(if granted):** plan calendar, draft captions, schedule. `can_publish` required to push live.
- **client_user:** sees their own content calendar/approvals if surfaced; no cross-client analytics.
- Post metrics visible to staff; a client sees only their own.

### G. Finance & Commercials — **money**
- **owner:** everything incl. margin, fees, credit notes.
- **ops:** invoices, revenue (`can_see_money`) but **not margin** and **not pay approval** by default.
- **account_manager:** **no money** by default; sees commercial status like "retainer active" only. With `can_invoice` override, can raise/chase invoices but still no margin.
- **editor/filmer:** no finance at all.
- **client_user:** **their own** invoices — view, download, pay. Never agency revenue, costs, other clients.
- "Only the owner changes a paid line" → enforced as `can_invoice` + a paid-line lock requiring owner/elevated flag.

### H. Team, Talent & Resources — **pay**
- **Build vs approve are separated:** `can_pay_team` builds the run; `can_approve_pay` releases it. One person should not routinely hold both (flagged if they do).
- **owner:** see staff + actor pay, build and approve.
- **ops:** build runs / see actor pay if granted; approval is an explicit override.
- **account_manager:** no pay visibility by default.
- **editor/filmer:** see **only their own** pay statement.
- **talent_user:** see **only their own** pay statements and bookings; never another talent's, never client commercials, never the run total.

### I. Portals (client + talent)
- Hard isolation per §3/§8.4. A client never sees talent pay; talent never sees client money; neither sees internal costs, notes, audit, or settings.
- Portal content is **opt-in by staff** (`portal_visible` flags) — nothing leaks by default.

### J. Blanc Script AI
- The assistant inherits the **caller's** role + capabilities exactly and can never exceed them (§10). It is available to staff with `can_act` for actions; read tools follow read permissions; portal users get a tightly limited, read-mostly assistant scoped to their own data.

### User management (cross-cutting)
- Only `can_manage_users` may invite/remove, change roles, set overrides, manage portal invites. `platform_admin`/impersonation is separate, named, time-boxed, audited.

---

## 10. AI assistant permission-gating (improving on Centauri)

Blanc Script AI is **agentic** (Claude tool-use), so its tools must be permission-gated at least as strictly as the UI. We keep Centauri's three execution modes but make the guard **server-enforced and identical to the human gate**.

### 10.1 Core principle
> **The AI acts strictly as the current user.** Every tool call runs through the same server authorisation and the same RLS as if the user clicked the button. The AI can never read or do anything the user could not. There is no AI service-role bypass.

### 10.2 Read vs act
- **Read tools** (`search_clients`, `find_shoots`, `find_invoices`, `find_pay`, `get_client_context`, …) return **only RLS-visible rows**. A money-blind user's AI cannot surface invoice totals because the DB returns nothing — the guard is the same RLS, not a prompt instruction.
- **Act tools** require `can_act` **and** the specific capability for that action, checked **server-side at execution**, never merely in the model's reasoning.

### 10.3 Execution modes (each tool declares one)
| Mode | Behaviour | Example tools | Guard |
|---|---|---|---|
| `direct` | Executes immediately on the user's behalf. Reserved for **low-blast-radius, easily reversible** writes. | `add_task`, `update_task`, `add_lead`, `move_lead`, `add_client_update` | `can_act` + `can_edit` |
| `confirm` (Centauri's `popup`) | Opens the real form **pre-filled**; the human reviews and submits. For medium-impact or multi-field actions. | `book_shoot`, `move_shoot`, `assign_video`, `draft_invoice` | the action's capability (e.g. `can_edit`, `can_invoice`) |
| `ask` | Requires an explicit "yes, do it" confirmation step before execution. For **consequential / external / irreversible** actions. | `cancel_shoot`, `mark_invoice_paid`, `send_whatsapp`/`send_dm`, `publish_post`, `build_pay_run` | the hard capability (`can_invoice`, `can_publish`, `can_pay_team`) **+** explicit confirm |

Improvements over Centauri:
1. **Guard is authoritative, not advisory.** Centauri's `may:` was a UI hint; ours re-runs the exact server capability check + RLS at tool execution. A jailbroken prompt still hits `has_cap()` and fails.
2. **No external/irreversible action in `direct`.** Anything that leaves the system (messages, publishes) or moves money/pay is **`ask` minimum**, regardless of what the model proposes.
3. **Default-deny tool registry.** Each tool's required capability is declared in a server registry; an unregistered or mis-declared tool cannot run.
4. **Pay has belt-and-braces:** `build_pay_run` is `ask` + `can_pay_team`; releasing a run is **never** an AI tool — approval is human-only and needs `can_approve_pay`.
5. **Every AI action is audited** in `activity_log` with `actor = user (via AI)`, the tool, inputs, mode, and confirmation, so AI-initiated changes are reviewable exactly like human ones.
6. **Portal AI is read-mostly:** client/talent assistants expose only read tools over their own rows plus a couple of safe `confirm` actions (e.g. "request a change"); no cross-tenant, no money, no publish.

### 10.4 Budget & availability
- AI is **opt-in, bring-your-own-key, server-side only** (foundation §1). The key is never shipped to the client. Availability and AI-usage/budget are governed by `can_settings`.

---

## 11. Worked permission examples (quick reference)

| Scenario | Decision | Why |
|---|---|---|
| Account manager opens Finance | Revenue hidden | `can_see_money` off by default |
| Same AM, overridden `{can_invoice:true}` | Can raise/chase invoices, still no margin | `can_invoice` on, `can_see_margin` off |
| Editor asks AI "mark invoice 1042 paid" | Refused | no `can_invoice`; `ask` guard fails |
| Ops builds a pay run, tries to release it | Build ok, release blocked | `can_pay_team` yes, `can_approve_pay` no (SoD) |
| client_user tries URL of another client's project | 0 rows | portal RLS `client_id = auth.client_id()` |
| talent_user views pay | Only their own statements | portal self-filter, not `can_see_actor_pay` |
| filmer edits a shoot they're not on | Blocked | row-scope predicate, assignment mismatch |
| Someone grants themselves `can_approve_pay` | Blocked | self-elevation prevented; owner-only + audited |

---

## 12. Open items for Lead decision
1. **Portal identity model in Clerk** — same org with portal roles vs. a separate Clerk instance/org per portal class. Affects claim shape and invite flow (§7.1).
2. **`can_see_margin` vs `can_see_money` split** — confirm ops should see revenue but not margin by default.
3. **Multi-client users** — whether a `client_user` can ever legitimately span several `client_id`s (franchise/parent brand) and, if so, the link-table shape.
4. **Separation-of-duties enforcement strength** — flag-and-review (current proposal) vs. hard-block on holding both `can_pay_team` and `can_approve_pay`.
5. **Break-glass (`platform_admin`) governance** — approval workflow, time-box length, and whether impersonation requires the impersonated user's org-owner notification.
</content>
</invoke>
