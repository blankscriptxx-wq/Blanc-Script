# Aniro AI — WhatsApp Inbox capability: build brief for Blanc Script OS

**Audience:** whoever builds on the Aniro AI side.
**Why:** Blanc Script OS needs client/talent messaging over WhatsApp (inbox + **group** chats). For v1 it uses Periskope. The better long-term path is to reuse **Aniro AI's existing WhatsApp inbox integration** and expose it as a service Blanc Script OS (and other products) can consume. This brief says what Aniro needs to build/expose for that.

> Scope note: this describes an **interface between two of the owner's own businesses**. It is a product spec, not instructions to touch anyone else's systems. Build it on official WhatsApp/Meta APIs under Aniro's own Meta/WhatsApp Business assets.

## What Blanc Script OS needs (capability contract)
A small, stable service ("Aniro Messaging") that offers:

1. **Send a message** to a WhatsApp 1:1 chat or **group**, from a chosen Aniro-connected WhatsApp number, with text + optional media. Returns a message id + status.
2. **Receive messages** (inbound + status updates: sent/delivered/read/failed) via **webhook** to a Blanc Script OS endpoint, signed so we can verify authenticity.
3. **List threads** (1:1 and groups) for a connected number, with last-message + unread, paginated.
4. **Read a thread** — message history, paginated, with sender identity and timestamps (UTC).
5. **Group awareness** — group id, name, participants (this is the reason to use Aniro over the plain Meta Cloud API, which can't do groups).
6. **Template sends** — for 1:1 business-initiated messages that fall outside the 24-hour window (Meta template requirement).

## Interface shape (suggested)
- **Transport:** HTTPS REST (or RPC) + outbound **webhooks**. JSON bodies.
- **Auth:** per-consumer API key or OAuth client-credentials, scoped to specific WhatsApp numbers/workspaces. Blanc Script OS stores the key server-side only (never client).
- **Idempotency:** `send` accepts an idempotency key (money-grade discipline — no double-sends).
- **Webhook security:** HMAC signature header over the raw body + timestamp; replay window; Blanc Script OS verifies before processing.
- **Rate limits + retries:** documented; 429 with `Retry-After`; at-least-once webhook delivery with dedupe ids.

### Endpoints (illustrative)
```
POST   /v1/messages            { number_id, to: {chat_id|group_id|phone}, text, media?, idempotency_key, template? }
GET    /v1/threads?number_id=…&cursor=…
GET    /v1/threads/{thread_id}/messages?cursor=…
POST   /v1/webhooks            (register Blanc Script OS callback URL + secret)
→ webhook payloads: message.received | message.status | thread.updated
```

## How Blanc Script OS maps it (their side, for context)
- Inbound webhooks → `records`-equivalent `messages`/`threads` (OS uses a relational model: a `messaging_threads` + `messages` table, org-scoped, RLS-isolated).
- A thread links to a **client** (and optionally a shoot/project) so chat shows in the client record.
- Sends are permission-gated (only staff with the right capability; AI may draft but a human confirms — sends are an `ask`-mode action).

## Security & compliance (both sides)
- Official WhatsApp Business/Meta APIs only; respect WhatsApp's business policy + 24-hour/template rules.
- PII: phone numbers + message content are personal data — encrypt in transit + at rest, honour UK GDPR (export/erasure), minimise retention.
- Per-number consent/opt-out handling.

## Build checklist (Aniro side)
- [ ] Confirm Aniro's WhatsApp Business assets + number(s) that Blanc Script OS may use.
- [ ] Stand up the send/receive/threads/history endpoints above.
- [ ] Signed webhooks + idempotent sends + rate-limit docs.
- [ ] Group support verified (list, read, send).
- [ ] Template message support for out-of-window 1:1.
- [ ] API-key issuance for Blanc Script OS (scoped, revocable).
- [ ] Sandbox/test number for integration testing.

## Related
- Direct **Meta social publishing** via Aniro's reviewed Meta app is a separate but adjacent reuse (see `DEVELOPMENT_ROADMAP.md` → Cross-business). Same principle: Aniro holds the approved Meta assets; Blanc Script OS consumes a thin, authed service.
