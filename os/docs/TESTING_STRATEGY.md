# Blanc Script OS — Testing Strategy

**Status:** Planned (v0). Owner: QA & Testing agent. Consumes `_FOUNDATION.md` (locked).
**Scope:** How we test Blanc Script OS across the locked stack — Next.js (App Router) · TypeScript · Drizzle · Neon (Postgres + RLS) · Clerk · Neon Authorize · Cloudflare R2 · Trigger.dev · Resend · Anthropic Claude.
**British English throughout.** Money is integer minor units (pence) + ISO currency; times are UTC stored, Europe/London displayed. These invariants are themselves test subjects.

This document defines *what* we test and *how "done" is proven*. It does **not** redefine the schema, the stack, or the role model — those are owned by the DB, Security and Architecture agents. Where this doc names a table (`invoices`, `memberships`, `media_assets`, …) or a role/capability, it is **referencing** the spine in `_FOUNDATION.md §3–§4`, not defining it.

> **Flagged for Lead** (collected in §13): a handful of decisions — coverage gates, Neon test-branch budget, Clerk test-mode strategy, the "golden org" seed ownership — need a Lead ruling before M1 CI is switched on.

---

## 1. Testing philosophy

1. **High signal over high coverage.** We do not chase 100%. We chase *confidence in the things that can hurt a client or the business*: data isolation (RLS), money/VAT correctness, permission boundaries, and the handful of journeys each role performs daily. A test that cannot fail for a real reason is deleted.
2. **Security is a first-class test target, not an afterthought.** RLS isolation and authorisation bypass attempts get *dedicated, adversarial* suites that try to break the system, run on every PR, and block merge. This is the single most important section of this strategy (§5, §8).
3. **Test the contract, not the implementation.** Tests assert observable behaviour (a `client_user` cannot read another client's `invoices`; VAT on £100 at 20% is 2000 pence) so refactors don't force test rewrites.
4. **Real Postgres for anything touching data.** We never mock Drizzle or RLS. Mocks cannot prove an RLS policy holds. The data-access layer is tested against a *real* Postgres with policies applied (§4).
5. **Fast feedback, honest gates.** Unit + typecheck run in seconds on every commit; integration on every PR against an ephemeral Neon branch; E2E on the critical journeys per PR, full matrix nightly. A red security or RLS test is **never** waved through.
6. **Planned = tested when built.** Per `_FOUNDATION §2`, docs distinguish *implemented* vs *planned*. Tests are written alongside the feature, not retrofitted. No fake data to disguise unfinished work; an unbuilt feature has a `test.todo`, not a green stub.
7. **Every module ships its own tests; QA owns the seams.** Feature agents test their module; QA owns cross-module conflict detection, the shared fixtures/seed, the RLS matrix, and the E2E journey suite (§11).

---

## 2. The test pyramid for this stack

```
            ╱╲        E2E (Playwright + Chromium)         ~10–15%
           ╱  ╲       key journeys per role, Clerk test mode,
          ╱    ╲      a11y (axe) + perf budgets ride here
         ╱──────╲
        ╱        ╲    Integration (Vitest + real Postgres)  ~30–35%
       ╱          ╲   data-access layer, RLS matrix, webhooks,
      ╱            ╲  Trigger.dev tasks, R2 signed URLs
     ╱──────────────╲
    ╱                ╲ Unit (Vitest)                         ~50–55%
   ╱                  ╲ domain logic, money/VAT, capability
  ╱____________________╲ checks, Zod validators, pure helpers
```

Two cross-cutting bands that are **not** a layer but ride the layers:
- **Contract/type tests** — `tsc --noEmit` and Zod/Drizzle schema inference are a zeroth gate; a type error fails CI before a test runs.
- **Security tests** — unit-level capability checks, integration-level RLS + IDOR + webhook-signature, E2E-level authz-bypass journeys. Tracked as a suite, scored separately (§8).

Rationale for the shape: the risk in this product concentrates in **data isolation and money**, both of which live at the data-access layer — so the integration band is deliberately fatter than a typical web app, and E2E stays lean (journeys, not feature-matrixing).

---

## 3. Unit tests — Vitest

**Runner:** Vitest (native ESM/TS, fast, same config shape as the app). Co-located `*.test.ts` next to the unit, pure and dependency-free (no DB, no network, no Clerk). Target: milliseconds each, thousands total.

**What gets unit tests (the high-value core):**

### 3.1 Money & VAT (highest priority pure logic)
Per `_FOUNDATION §2`: money is **integer pence + ISO currency**, never floats; UK VAT aware. The money module is the most heavily unit-tested code in the system.
- Arithmetic in minor units: sums, proportional splits, rounding to pence (banker's vs half-up — pick one, test the boundary), no float leakage (property test: `fromPence(toPence(x))` round-trips).
- VAT: 20% standard, 0% zero-rated, exempt, and reverse-charge cases; VAT computed on net → gross and extracted from gross → net must agree to the penny. Line-level vs invoice-level rounding (the classic "sum of rounded lines ≠ rounded total" bug) is pinned with explicit fixtures from `invoice_lines` → `invoices`.
- Currency: reject mixing currencies in one `invoices`/`invoice_lines` set; ISO code validation.
- Pay-run maths (`talent_payments`): per-shoot aggregation, travel pay added on top, deductions ("take X's shoot pay off"), day-rate maths (camera day, "two shoots one day = one shoot day" rule). These are pure functions tested exhaustively before any bank adapter is touched.

### 3.2 Permission / capability checks
Per `_FOUNDATION §3`: roles (`owner`, `ops`, `account_manager`, `editor`, `filmer`, + `client_user`, `talent_user`) with overridable capability flags (`can_see_money`, `can_invoice`, `can_pay_team`, `can_approve_pay`, `can_see_actor_pay`, `can_manage_users`, `can_settings`, `can_contract`, `can_edit_fees`, `can_archive`, …).
- The pure capability resolver: role → default capability set, with per-user overrides applied. Table-driven tests: for each (role × capability) assert the default, then assert overrides win.
- Guard helpers (`can(user, 'invoice')`, `assertCan(...)`) — allow/deny/throw behaviour. **These are the in-app mirror of RLS**; RLS is the true boundary (tested in §4/§5), but the app-layer guard must agree with it. A divergence between the two is itself a tracked test (§11.3).
- AI action guards: the Claude tool catalogue's `may:`/mode (`direct`/`popup`/`ask`) gating — a `mark_invoice_paid`-style tool must refuse without `can_invoice` and must require confirmation in `ask` mode. Pure-logic level here; wired behaviour in integration/E2E.

### 3.3 Validators (Zod)
Every input boundary (Server Actions, route handlers, webhook payloads, AI tool inputs) has a Zod schema. Unit tests assert: valid input parses; invalid is rejected with the right error; coercion/defaults behave; money fields reject floats and negative-where-illegal; enums match the DB `kind`/status enums. Zod schema ↔ Drizzle column type drift is caught by a type-level test.

### 3.4 Other pure domain logic
Date/timezone helpers (UTC store ↔ Europe/London display, BST boundary cases), slug/soft-delete (`archived_at`) predicates, status-machine transitions (edit states *Being Edited → Revision Needed → Sent to Client → Ready to Post*; invoice *draft → sent → paid*; pay states), capacity/pacing calcs (editor load, "posting on pace"), post-to-edit matching heuristic (`videolink`-style: title/length/file signals).

**Explicitly not unit-tested:** anything whose correctness depends on RLS, real SQL, Clerk JWT claims, or a provider. Those go to integration — mocking them would prove nothing.

---

## 4. Integration tests — data-access layer against real Postgres

**This is the heart of the suite.** Everything that issues SQL is tested against a *real* Postgres with the real Drizzle schema, migrations, and **RLS policies applied** — never a mock, never an in-memory shim.

### 4.1 The database under test
Two supported backends, same tests:
- **Neon branch (CI default):** each CI run creates an ephemeral Neon branch from a migrated+seeded template, runs, then deletes it. Gives us production-identical Postgres + Neon Authorize behaviour. Branch-per-run (or per-shard) for isolation.
- **Local Postgres (dev default):** a Dockerised Postgres matching Neon's major version, migrations applied, for fast local iteration. RLS policies are plain Postgres, so they run identically; the Neon-Authorize JWT→`current_setting` shim is emulated locally (see §5.3).

Setup runs **Drizzle Kit migrations** against the target (never `push`/auto-sync — we test the migrations themselves), then applies RLS policies (which live in migrations), then seeds the golden fixture (§9).

### 4.2 What integration tests cover
- **Every repository/query function** in the data-access layer: CRUD round-trips, constraints (FK, unique, check), `org_id not null`, soft-delete (`archived_at`) semantics, `created_at`/`updated_at` behaviour, JSONB read/write for the genuinely-variable payloads (per-platform post blobs, integration state).
- **Transactions & invariants:** invoice + lines written atomically; pay-run aggregation consistent; no partial writes on failure.
- **The write path:** if the build adopts a central validated-write entry point (Centauri's `write_record` analogue), its validation + audit (`activity_log`) + permission enforcement are integration-tested end to end.
- **Migrations:** apply forward cleanly on an empty DB and on a seeded one; a smoke check that a round of migrate-up succeeds in CI. (Reversibility only where a down migration exists.)

### 4.3 How a test connects "as a role"
The key technique (shared with §5): a test helper opens a connection and sets the request-scoped auth context the way Neon Authorize does in production — i.e. the authenticated user id, `org_id`, role and capabilities are presented to Postgres as settings/claims that the RLS policies read. Each test declares *who it is acting as* and the same query is run under different identities to prove both the happy path (I can see my rows) and the isolation path (I cannot see yours). This helper is the backbone of the RLS matrix.

---

## 5. RLS policy testing — the critical suite

**Goal:** *prove* that a `client_user` or `talent_user` (and every staff role) can only touch rows they are entitled to, enforced in the database, independent of any application bug. Per `_FOUNDATION §1`, RLS is the *primary* data-isolation mechanism; this suite is what makes that claim true rather than aspirational.

### 5.1 The threat model we encode as tests
- **Cross-org:** a user in org A must never read/write any `org_id = B` row. (The universal tenant boundary — every tenant-scoped table.)
- **Cross-client within an org:** a `client_user` for Client X must never read Client Y's `clients`, `projects`, `invoices`, `media_assets`, `reviews`, `social_posts`, chat, etc. — even though both clients live in the same org. (Portal isolation — the sharpest edge; Centauri's rule *"never reuse an actor from another client"* and portal separation live here.)
- **Cross-talent:** a `talent_user` sees only their own `talent`, `talent_availability`, `talent_payments`, and only the shoots/`crew_assignments` they are cast on — never another talent's pay or another client's shoot.
- **Staff capability scoping:** an `account_manager` without `can_see_money` cannot read `invoices`/`talent_payments` money columns/rows; without `can_pay_team` cannot touch pay-runs — enforced at the row/policy level, not just hidden in the UI.
- **Write isolation:** the above for `INSERT`/`UPDATE`/`DELETE`, not just `SELECT` (a classic gap — read policies right, write policies wrong). Includes "can I update a row to *move it* into/out of my scope" (changing `org_id`/`client_id` to smuggle data).

### 5.2 The RLS test pattern (describe once, apply everywhere)
For each tenant-scoped table we run a parametrised matrix. The canonical pattern:

```ts
// pseudo-Vitest — the shared asRole() helper sets the DB auth context
// (user id, org_id, role, capabilities) exactly as Neon Authorize would.

describe('RLS: invoices', () => {
  // seeded golden data: orgA/orgB, clientX/clientY in orgA, talentT
  test('client_user(X) reads only client X invoices', async () => {
    const db = asRole({ type: 'client_user', orgId: A, clientId: X });
    const rows = await db.select().from(invoices);
    expect(rows.every(r => r.clientId === X)).toBe(true);
    expect(rows).not.toContainRowFor(clientY); // Y's invoice is seeded & must be invisible
  });

  test('client_user(X) cannot read another org', async () => {
    const db = asRole({ type: 'client_user', orgId: A, clientId: X });
    expect(await db.select().from(invoices).where(eq(invoices.orgId, B)))
      .toHaveLength(0); // not an error — RLS returns zero rows
  });

  test('client_user(X) cannot UPDATE client Y invoice', async () => {
    const db = asRole({ type: 'client_user', orgId: A, clientId: X });
    const res = await db.update(invoices)
      .set({ status: 'paid' }).where(eq(invoices.id, clientY_invoice));
    expect(res.rowCount).toBe(0); // policy filters the row out → no-op, not a leak
  });

  test('client_user(X) cannot INSERT into org B / client Y', async () => {
    const db = asRole({ type: 'client_user', orgId: A, clientId: X });
    await expect(db.insert(invoices).values({ orgId: B, /*…*/ }))
      .rejects.toThrow(); // WITH CHECK violation
  });

  test('account_manager without can_see_money sees no invoice rows', async () => {
    const db = asRole({ type: 'account_manager', orgId: A, caps: { can_see_money: false } });
    expect(await db.select().from(invoices)).toHaveLength(0);
  });
});
```

Key properties of the pattern:
- **Negative tests assert zero rows / no-op / WITH CHECK rejection**, never "it threw a generic error" — the *shape* of the denial matters (SELECT → invisible, UPDATE/DELETE → zero rowCount, INSERT of out-of-scope → WITH CHECK failure).
- **Seed includes the forbidden rows.** A test that another org's invoice is invisible is meaningless unless that invoice *exists* in the seed. The golden seed (§9) deliberately plants orgB/clientY/other-talent rows as "landmines".
- **The acting identity is set by one audited helper (`asRole`)**, so a bug in how we present claims can't accidentally grant access in tests (the helper itself has unit tests, and a "nobody" identity that must see *nothing*).
- **A table is not "done" until it appears in the RLS matrix** (enforced by a meta-test that lists tenant-scoped tables from the Drizzle schema and fails if any lacks an RLS suite — closes the "new table shipped without a policy test" gap).

### 5.3 Neon Authorize fidelity
Production RLS reads the Clerk-issued JWT via Neon Authorize (`auth.user_id()`/role claims surfaced to policies). Tests must set the *same* context the same way:
- On a **Neon branch**, exercise the real Neon-Authorize path where feasible (sign a test JWT with the test-mode signer, or set the session claims the integration expects) so we test the true mechanism.
- On **local Postgres**, a thin shim sets the equivalent `current_setting`/`SET LOCAL` values the policies read, so the *policy logic* is tested identically even without Neon's JWT layer.
- A dedicated test asserts **policy + Neon-Authorize wiring** on a branch (claims actually flow through) so the shim can't hide a real misconfiguration. **[Flag for Lead/Security: confirm the exact claim shape so `asRole` matches production 1:1.]**

---

## 6. End-to-end tests — Playwright

**Runner:** Playwright with **Chromium (preinstalled in this environment)** as the default engine; WebKit/Firefox added nightly for the PWA-critical surfaces only. Tests run against a Next.js build (`next build && next start`) wired to a seeded test database, not dev mode.

### 6.1 Auth via Clerk test mode
- Use **Clerk's test mode / testing tokens** so sign-in is deterministic and bot-detection is bypassed in CI; test users are created per role (`owner`, `ops`, `account_manager`, `editor`, `filmer`, `client_user`, `talent_user`) with known emails + the `+clerk_test` convention and fixed OTP where applicable.
- Authenticate once per role via Playwright **storage-state** (sign in in global setup, reuse the session cookie across tests) to keep journeys fast; a small number of tests exercise the *actual* sign-in/sign-up/invite flow itself.
- Clerk orgs map to our `organisations`/`memberships`; the seed aligns Clerk test users to the golden org so RLS and UI agree.

### 6.2 Key journeys per role (lean, representative — not feature-matrixing)
Each is one happy-path + the critical guard it must enforce:
- **Owner / ops:** create client → add to pipeline → book shoot → assign editor; manage users & capabilities; run a pay-run (sandbox); mark an invoice paid (requires `can_invoice`).
- **Account manager:** client work end to end *without* seeing money (asserts money UI is absent **and** the API/DB refuses — ties back to §5).
- **Editor:** see assigned edits, move edit through states, upload/attach `media_assets`, export finals; cannot see pay or other editors' money.
- **Filmer:** "my next shoot", call sheet / shot list, "who else is on my shoot", add a prep task — and *cannot* reach finance/clients they aren't on.
- **client_user (portal):** log in → see only their shoots/videos/`reviews` → approve a delivery → cannot see any other client's anything (the headline isolation journey, E2E mirror of §5).
- **talent_user (portal):** onboard → see own availability & bookings → see own pay only.
- **AI layer:** ask Claude a read question (scoped answer), attempt a write tool that needs a capability → confirmation required (`ask` mode) and refused without the capability.

### 6.3 States & UX contract (from `_FOUNDATION §7`)
Every journey asserts the mandated states exist and behave: **loading, empty, error**, permission-gated (no dead buttons — a gated action is absent or disabled-with-reason, never a 500), responsive at mobile/tablet/desktop breakpoints, and PWA installability smoke (manifest + service worker register).

---

## 7. Accessibility & performance (ride the E2E layer)

### 7.1 Accessibility — axe
- **`@axe-core/playwright`** runs on every key screen in the E2E journeys: zero *critical*/*serious* violations blocks merge; moderate/minor are logged to a budget that must trend down. Centauri shipped heavy ARIA; we hold a higher bar as a product requirement, not a nicety.
- Keyboard-only traversal of each core flow (tab order, focus trap in modals/command palette, skip links), visible focus, `prefers-reduced-motion` respected (Framer Motion used sparingly per foundation), form labels/errors announced, colour-contrast from the design tokens checked. Component-level axe checks also run in the design-system package.

### 7.2 Performance budgets
- **Lighthouse CI** on key routes per PR with budgets: LCP, TBT/INP, CLS, total JS transfer, and route-chunk size ceilings (code-splitting is a stack choice; a chunk blowing its budget fails). Budgets start generous, ratchet down milestone by milestone.
- **DB performance guards** in integration: assert hot queries (Today/Command Centre feed, portal lists) use indexes (`EXPLAIN` has no seq-scan on large tenant tables) and stay within a query-count budget (N+1 detection) — cheap, high-signal, catches the regressions that actually hurt at scale.
- Trigger.dev scheduled jobs (digests, publishing, syncs) have runtime/so-many-rows budgets smoke-tested.

---

## 8. Security test cases (dedicated, adversarial, merge-blocking)

Scored and tracked as its own suite. Spans unit → integration → E2E.

- **Authorisation bypass:** for every mutating endpoint/Server Action/AI tool, a test attempts it as each role that must be denied and asserts refusal **at the server/DB**, not just a hidden button. Capability downgrades (strip `can_invoice`) must flip behaviour.
- **IDOR / object-reference:** take a valid resource id from client X / org A and request/mutate it as client Y / org B via the API and the DB layer → must be denied/invisible (this is §5 surfaced through the HTTP boundary too). Enumerate ids across `invoices`, `media_assets`, `projects`, `reviews`, `talent_payments`, chat.
- **Webhook signature verification:** Clerk, Trigger.dev, and any provider webhook (Resend events, payment/accounting, social) — assert a *missing*, *malformed*, *wrong-secret*, and *replayed/expired-timestamp* signature is rejected (401/400) and only a correctly-signed, fresh payload is processed. Idempotency: a replayed valid event does not double-apply.
- **File access via signed URLs (R2):** per `_FOUNDATION §1`, no public buckets. Tests assert: media is never served from a public URL; a signed URL is scoped to the right object and **expires** (a stale URL is rejected); you cannot fetch another client's/org's object by swapping the key; generating a signed URL itself is capability+RLS gated (you can only mint URLs for media you may see). Upload path equally gated.
- **Secrets hygiene:** a build-time test/lint asserts no server-only secret (service keys, Anthropic key, R2 creds, webhook secrets) is referenced in client bundles (`NEXT_PUBLIC_` boundary), per `_FOUNDATION §2`.
- **AI confinement:** the Claude layer cannot exceed the current user's role+capabilities; a prompt attempting a consequential action without permission/confirmation is refused (tests the guard, not the model). No cross-tenant data reaches a prompt (context is RLS-scoped at source).
- **GDPR erasure path:** the hard-delete/"forget me" path actually removes the subject's rows (and only theirs) and is itself owner/admin gated and audited in `activity_log`.

---

## 9. Test data, fixtures & seeding

- **One golden seed, deterministic.** A single seed script builds the canonical world: **2 orgs (A, B)**; in org A, **2 clients (X, Y)**, staff users of every role, **2 talent**, and a spread of `projects`/`shoots`/`edits`/`media_assets`/`invoices`/`invoice_lines`/`social_posts`/`talent_payments`/`reviews`/chat. Org B + client Y + a second talent exist **specifically as isolation landmines** (see §5.2). Fixed UUIDs/dates so assertions are stable; money fixtures include VAT-boundary amounts.
- **Layered fixtures:** the golden seed for integration/E2E + RLS; tiny inline factory builders for focused integration tests (create-just-what-you-need, auto-scoped to a chosen identity); pure object fixtures for unit tests. Factories always stamp `org_id`/`created_at` so you can't accidentally seed an unscoped row.
- **Isolation between tests:** integration tests run in a transaction rolled back at teardown, *or* on a fresh Neon branch per shard; never share mutable state across tests. The seed is re-applied, not mutated in place.
- **Clerk alignment:** the seed's users/orgs correspond to Clerk test-mode users/orgs so DB identity and auth identity match in E2E.
- **No real PII, no real secrets, no production data** ever enters a test DB. Synthetic British-style data (names, VAT numbers, GBP amounts).

---

## 10. CI approach

**Pipeline (per PR), fail-fast, ordered cheapest-first:**
1. **Static gate:** `tsc --noEmit`, ESLint, Prettier, `drizzle-kit` schema↔migration drift check. (Seconds.)
2. **Unit (Vitest):** full unit suite incl. money/VAT, capability, Zod, security-unit. (Seconds.)
3. **Integration + RLS:** spin an **ephemeral Neon branch** (or Dockerised Postgres on forks), migrate, seed golden, run data-access + the full **RLS matrix** + webhook/signed-URL/security-integration. Branch deleted on teardown. Sharded for speed. (A few minutes.)
4. **E2E (Playwright/Chromium):** build the app, point at a seeded DB + Clerk test mode, run the per-role key journeys + axe + Lighthouse budgets on critical routes. (Several minutes; sharded.)
5. **Report:** coverage + a11y + perf + **security/RLS scorecard** posted to the PR.

**Gating rules:**
- **Never-merge-red:** any RLS, authz-bypass, IDOR, webhook-signature, signed-URL, or critical-a11y failure blocks merge unconditionally — not overridable by coverage or green elsewhere.
- **Nightly / scheduled:** full browser matrix (WebKit/Firefox), longer perf runs, Trigger.dev job tests against a persistent test project, migration-from-previous-release smoke, dependency/security audit.
- **Ephemeral everything:** no shared long-lived test DB that drifts; the Neon branch model gives production-identical isolation per run. **[Flag for Lead: Neon branch quota/cost budget for CI concurrency.]**
- **Deterministic & parallel-safe:** fixed seeds, no wall-clock dependence (clock injected), no cross-shard shared rows.

---

## 11. How QA catches cross-module conflicts

The feature agents each test their own module; QA owns the **seams** where modules collide:
1. **The RLS matrix is global.** Because every tenant-scoped table (from any module) must appear in the single RLS suite (meta-test in §5.2), a new module's tables are automatically pulled into the cross-cutting isolation check — a module can't ship an unprotected table.
2. **Shared-invariant tests** that cross module boundaries: money in pence everywhere (Finance ↔ Pay-runs ↔ Portal display agree to the penny); status enums shared between modules don't diverge; `activity_log` is written by every mutating path; soft-delete (`archived_at`) honoured consistently by every reader (an archived client disappears from Projects, Portal, Search, AI context simultaneously).
3. **App-guard ↔ RLS agreement test.** The in-app capability resolver (§3.2) and the DB policies (§5) are both queried for the same (role, capability, table, action) matrix; any disagreement fails — this catches "UI allows but DB denies" and the dangerous inverse.
4. **Contract tests at integration seams:** the AI tool catalogue's declared permission (`may:`) must match the actual DB/guard outcome; webhook handlers write exactly the rows downstream modules read; Trigger.dev job outputs match what the consuming UI queries.
5. **Journey tests are inherently cross-module** (client→shoot→edit→portal→invoice touches CRM, Production, Post, Portal, Finance) — an E2E break localises an integration conflict the unit suites miss.
6. **Dependency/ownership lint:** a module importing another module's internals (bypassing its public interface/adapter per `_FOUNDATION §1`) fails a boundary check — structural conflict caught before it becomes a test conflict.

---

## 12. Coverage targets (pragmatic, not dogmatic)

Coverage is a *floor on the code that matters*, not a global vanity number.
- **Critical modules — hard gate:** money/VAT, capability resolver, RLS-adjacent data-access, auth/webhook handlers, signed-URL minting → **≥ 90% line + branch**, and 100% of the *enumerated* security/RLS matrix cases present (counted, not %-ed).
- **General app logic:** **~70–75%** line as a soft target; PRs may dip with reviewer sign-off.
- **UI/presentational:** no line-coverage gate; covered by E2E journeys + component axe checks instead.
- **What we measure hardest isn't %:** the **RLS matrix is complete** (every tenant table × every role × every verb), the **security scorecard is green**, and **each role's key journeys pass**. A module at 95% coverage with a missing RLS case is *failing*; a module at 70% with a complete isolation matrix and green journeys is *done*.
- Mutation testing (e.g. on the money module) considered later as a quality check on the tests themselves — not an M1 gate.

---

## 13. Per-milestone testing checklist — what "done" means

Milestones per `_FOUNDATION §7`. "Done" = the box below is green in CI, not "code exists".

### M1 — Core Foundation (shell, auth, DB, profiles, permissions, nav, design system, responsive)
- CI pipeline live: static gate + unit + integration (Neon branch) + E2E skeleton all run on every PR.
- Migrations apply cleanly; golden seed builds; `asRole` helper + Neon-Authorize wiring test green.
- **RLS matrix exists** for the foundation tables (`organisations`, `users`, `memberships`) + the meta-test that fails on any unprotected tenant table.
- Capability resolver unit-tested (role→caps + overrides); app-guard ↔ RLS agreement test green for M1 tables.
- Clerk test-mode auth works in Playwright for all 7 identities (storage-state reuse).
- Money/VAT module unit-tested to ≥90% **even though Finance ships later** (it's a foundation primitive).
- Design-system components pass axe; responsive smoke at 3 breakpoints; PWA manifest/service-worker registers.
- **Done =** a user signs in, lands in the right role-scoped shell, and cannot see another org — proven by test.

### M2 — Core Operations (Command Centre, Clients, Projects, Tasks, Calendar, Team, Global search)
- Data-access integration tests for `companies`/`contacts`/`clients`/`leads`/`projects`/`tasks`/`task_dependencies`/`client_notes`.
- RLS matrix extended to all M2 tables incl. cross-client isolation within an org.
- Journeys: owner creates client→project→task; account_manager works a client **without money** (UI + DB both refuse); filmer sees only their tasks/shoots.
- Global search respects RLS (search never returns a row the user can't open) — explicit test.
- Soft-delete consistency test (archived client vanishes from Command Centre, Projects, Search together).
- Command Centre/Today feed query has no seq-scan + within N+1 budget; loading/empty/error states asserted.
- **Done =** each staff role's daily journey passes; no cross-client leak in search or lists.

### M3 — Production (shoots, briefs, shot lists, call sheets, locations, equipment, crew, talent book)
- Integration + RLS for `shoots`/`shoot_briefs`/`shot_lists`/`call_sheets`/`locations`/`equipment`/`crew_assignments`/`talent`/`talent_availability`.
- Day-rate/shoot-day maths unit-tested ("two shoots one day = one shoot day", camera day rate).
- Talent isolation: a `talent_user` sees only their availability/bookings; **"never reuse an actor from another client"** encoded as a test.
- Journeys: book shoot → brief → shot list → cast from talent book → assign crew; filmer "my next shoot / who's on it".
- **Done =** a shoot is bookable and staffable end to end; talent and cross-client boundaries proven.

### M4 — Post-production + Client portal (media, edits, reviews, revisions, approvals, deliveries)
- Integration + RLS for `media_assets`(R2)/`edits`/`edit_assignments`/`reviews`/`revisions`/`approvals`/`deliveries`.
- **R2 signed-URL security suite green** (scoped, expiring, non-enumerable, capability+RLS gated; no public bucket).
- Edit state-machine unit tests; editor capacity/pacing calcs.
- **Client portal isolation is the headline M4 test:** `client_user(X)` sees only X's edits/reviews/deliveries, approves a delivery, and cannot reach Y's anything — E2E + DB + signed-URL all enforce it.
- Journey: upload raw → assign editor → states → sent to client → client approves in portal → ready to post.
- **Done =** footage→approval round-trips; portal leaks nothing across clients; media only reachable via scoped signed URLs.

### M5 — Finance + Content/Social (quotes, proposals, invoices, lines, expenses, payments, retainers; content, calendar, posts, metrics)
- Money/VAT suite exercised against real `invoices`/`invoice_lines` data (line vs invoice rounding pinned); multi-currency rejection.
- Pay-run maths (`talent_payments`) integration-tested; bank adapter in **sandbox/test-account mode only** in tests (no real transfers) with its state machine (`approved→going out→bank is on it→…`) covered.
- Capability gating of money everywhere: `can_see_money`/`can_invoice`/`can_pay_team`/`can_approve_pay`/`can_see_actor_pay` enforced at DB + API + UI (authz-bypass + IDOR suite covers finance ids).
- Content/social: RLS for `content_items`/`content_calendar`/`social_posts`/`post_metrics`; post-to-edit matching heuristic unit-tested; per-platform JSONB payload round-trips.
- Webhook-signature suite covers accounting/payment/social inbound events; idempotent replay.
- **Done =** an invoice is correct to the penny with VAT, gated to the right people, and no role without money access can read or mutate it.

### M6 — AI + Automation + Integrations
- AI tool-catalogue tests: each tool's `may:` guard + mode (`direct`/`popup`/`ask`) enforced; `ask` requires confirmation; no tool exceeds the user's role+caps; no cross-tenant data enters a prompt.
- Trigger.dev scheduled jobs (digests, scheduled publishing, provider syncs) tested against a test project: run, idempotency, failure/retry, runtime budget; signature-verified inbound webhooks.
- Integration adapters tested behind their interface with the provider stubbed at the boundary (app still runs if a provider is down — degradation test per `_FOUNDATION §1`); contract tests against recorded provider fixtures.
- Resend email paths: templates render, send is gated/audited, webhook events verified.
- Full security scorecard green across all modules; GDPR erasure path tested end to end.
- **Done =** the AI acts only within permissions with confirmation on consequential actions; automations run safely and idempotently; a downed provider degrades gracefully, proven by test.

---

## 14. Tooling summary

| Concern | Tool | Layer |
|---|---|---|
| Unit / integration runner | **Vitest** | Unit, Integration |
| Types/contract | `tsc --noEmit`, Zod, drizzle-kit drift | Gate |
| Real DB | **Neon branch** (CI) / Dockerised Postgres (local) | Integration, RLS |
| RLS identity | `asRole` helper (Neon-Authorize-faithful) | Integration, RLS |
| E2E | **Playwright + Chromium** (preinstalled) | E2E |
| Auth in E2E | **Clerk test mode** + storage-state | E2E |
| Accessibility | **@axe-core/playwright** + component axe | E2E, Component |
| Performance | **Lighthouse CI** + `EXPLAIN`/query-count guards | E2E, Integration |
| Security | authz/IDOR/webhook/signed-URL/secret-scan suites | All |
| Jobs | Trigger.dev test project | Integration |
| CI | ephemeral-branch pipeline, never-merge-red security gate | — |

---

## 15. Decisions needed from the Lead

1. **Neon test-branch budget/quota** — branch-per-run per shard multiplies branches; confirm concurrency ceiling and cleanup policy (vs. Dockerised Postgres fallback for some tiers).
2. **Clerk test-mode strategy** — testing tokens + fixed OTP users, and who owns the test-org↔DB-seed mapping so Clerk and Neon identities stay in lockstep.
3. **Neon Authorize claim shape** — the exact JWT claim/`current_setting` contract RLS reads, so `asRole` mirrors production 1:1 (co-owned with Security/DB agents).
4. **Coverage gate numbers** — ratify the ≥90% critical / ~70% general split and the "RLS matrix completeness counts more than %" principle as the actual merge gate.
5. **Golden-seed ownership** — one canonical seed shared by DB/QA; QA proposes to own it with DB-agent review, since isolation landmines (orgB/clientY) are QA's concern.
6. **Bank/payment + GDPR erasure in CI** — confirm sandbox-only enforcement for pay-runs and a safe, isolated fixture for the hard-delete erasure test.

*End — TESTING_STRATEGY.md (planned, v0). Consistent with `_FOUNDATION.md`; references the spine and role model without redefining them.*
