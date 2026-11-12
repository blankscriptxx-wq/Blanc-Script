# Blanc Script OS — Backlog (to-do for later)

Deferred feature/engineering work, agreed to park for later. Everything here is
optional depth on top of a working OS — none of it blocks day-to-day use.
(Account/API-key setup lives separately in `docs/OVERNIGHT_CHECKLIST.md`.)

## Security / data protection
- [ ] **Encrypted vault for talent bank details.** Sort code / account number are
      currently stored as plain text in Neon (visibility is gated to `can_see_actor_pay`
      and masked in the UI, but not encrypted at rest). Add field-level encryption via a
      KMS-managed key before real bank data goes in. **Do this before onboarding real talent pay.**
- [ ] **DB-enforced Neon RLS** (defence in depth on top of the app-level tenancy that's
      already enforced). Plan is in `docs/OVERNIGHT_LOG.md` — needs a custom DB role,
      a driver swap for the user-facing layer, and a two-org isolation test.

## Storage / documents
- [ ] **Cloudflare R2 + document uploads.** Needed for talent compliance docs
      (right-to-work, signed contracts, headshots), deliverable media, and invoice PDFs.
      Requires R2 account + keys (see checklist), an upload component, and signed URLs.

## Portals (external users)
- [x] ~~Talent portal~~ — dropped (not needed).
- [x] **Client portal** (built: private link per person — review/approve cuts, shoots, schedule, pay invoices). Original note: clients sign in — clients sign in to approve edits, see their content calendar
      and invoices (`client_user` role + `memberships.clientId`).

## Talent — smaller follow-ons
- [ ] Edit existing bookings in place (hours, rate, call time, status) — currently add/remove only.
- [ ] Day-rate option on **project** castings too (shoots have it now).
- [ ] Per-shoot wardrobe/measurement capture (talent-level fields exist; per-booking would be richer).
- [ ] Travel radius / willing-to-travel on top of base location.

## Finance — follow-ons
- [ ] Auto-draft talent payments from confirmed shoot bookings (rate × hours / day rate already computed).
- [x] ~~Xero sync~~ — dropped: the OS is the invoicing system. Stripe payment links built.

## Integrations (need external accounts — see checklist)
- [ ] Anthropic API key → turn on the AI assistant panel.
- [ ] Resend (email), Metricool (social), Frame.io/Adobe (review), WhatsApp via Aniro (OS side built — see docs/aniro-whatsapp-brief.md; Periskope dropped).
