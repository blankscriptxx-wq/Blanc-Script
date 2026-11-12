# Aniro brief — live WhatsApp for the Blanc Script OS inbox

**Goal:** make the OS Inbox a real WhatsApp inbox. A message typed in the OS is delivered
to the client's WhatsApp; a client's reply appears in the same thread within seconds, filed
against the right client. Aniro owns the WhatsApp connection; the OS owns the inbox UI and
the records.

**Decision:** Aniro is the only provider. Periskope is not being used.

---

## 1. What already exists in the OS (built and deployed)

The OS side of the contract below is finished and live at `https://studio.blancscript.com`.
It switches on as soon as the three environment variables in section 5 are set — no further
OS release is needed.

- **Inbox UI** (`/inbox`): conversation list, thread view, new conversation, open / snoozed /
  closed. Each outbound message shows its delivery state (Sending → Sent → Delivered → Read,
  or Not delivered with the reason).
- **Tables**
  - `wa_conversations` — `contact_name`, `contact_phone`, `client_id`, `status`,
    `external_id` (Aniro's chat id), `last_message_at`.
  - `wa_messages` — `direction` (inbound | outbound), `body`, `external_id` (Aniro's message
    id), `delivery_status`, `delivery_error`, `sent_at`, `author_user_id`.
- **Outbound** (`lib/whatsapp/aniro.ts`, `lib/data/inbox.ts`): the message is saved first,
  then sent to Aniro. A failed send is recorded on the message, never lost.
- **Inbound webhook** (`POST /api/aniro/whatsapp`): verifies Aniro's signature, de-duplicates
  on Aniro's message id, finds the conversation by phone number (or creates one and links it
  to the client whose contact has that number), stores the message and reopens the thread.

## 2. What Aniro needs to build

### 2.1 Send API (OS → Aniro)

```
POST {ANIRO_API_URL}/v1/whatsapp/messages
Authorization: Bearer {ANIRO_API_KEY}
Content-Type: application/json
Idempotency-Key: {reference}

{
  "to": "+447700900412",          // E.164
  "type": "text",
  "text": "Hi Hannah — shoot is booked for Tuesday 24 Nov…",
  "reference": "3f0c…-uuid"       // the OS message id; echo it back in status events
}
```

Response `200`/`202`:

```json
{ "id": "aniro_msg_123", "status": "queued" }
```

- `status` is one of `queued | sent | delivered | read | failed`.
- The same `Idempotency-Key` must never send twice; return the original result.
- Errors: non-2xx with `{ "error": { "message": "human-readable reason" } }`. The OS shows
  that message to the user, so make it plain (for example "This number isn't on WhatsApp"
  or "Outside the 24-hour window — a template is required").
- Respond within 15 seconds; the OS times out after that and marks the message failed.

### 2.2 Webhook (Aniro → OS)

```
POST https://studio.blancscript.com/api/aniro/whatsapp
Content-Type: application/json
X-Aniro-Signature: t=1731412345,v1=<hex>
```

**Signature:** `v1 = hex( HMAC-SHA256( ANIRO_WEBHOOK_SECRET, "{t}.{raw request body}" ) )`,
where `t` is the Unix time in seconds. The OS rejects events more than five minutes old or
with a bad signature (`401`). Sign the exact bytes sent.

**Inbound message**

```json
{
  "type": "message.received",
  "data": {
    "id": "aniro_msg_456",
    "chat_id": "aniro_chat_9",
    "from": "+447700900412",
    "from_name": "Hannah Fernley",
    "text": "Perfect, see you Tuesday!",
    "timestamp": "2026-11-17T09:12:44Z"
  }
}
```

**Delivery receipt** (for messages the OS sent)

```json
{
  "type": "message.status",
  "data": {
    "id": "aniro_msg_123",
    "reference": "3f0c…-uuid",
    "status": "delivered",
    "error": null
  }
}
```

- The OS answers `200 {"ok":true,"result":"stored|duplicate|updated|ignored"}`.
- Retry on non-2xx or timeout with backoff (for example 10s, 1m, 5m, 30m, 2h). Retries are
  safe: the OS ignores a message id it has already stored.
- Send receipts in order where possible; the OS simply keeps the latest state it is told.

### 2.3 The WhatsApp connection itself

- Connect Blanc Script's WhatsApp Business number (WhatsApp Business Platform / Cloud API
  preferred over a linked-device session, for reliability and policy compliance).
- Handle Meta's rules so the OS doesn't have to: the 24-hour customer-service window,
  approved templates for messages outside it, opt-outs, and rate limits. When a send is
  refused for one of these reasons, return a clear error message (2.1).
- Keep the number's own WhatsApp history out of scope: only messages from go-live onward
  need to reach the OS.

## 3. Phase 2 (not needed for go-live — agree before building)

| Feature | Notes |
|---|---|
| Media (images, video, voice notes, documents) | Inbound: Aniro stores the file and sends a time-limited `media_url` + `mime_type`. The OS will copy it to its own storage (Cloudflare R2) and file it against the client. Outbound: OS sends a `media_url`. |
| Templates | `GET /v1/whatsapp/templates` so the OS can offer approved templates when the 24-hour window has closed. |
| Group chats | Out of scope unless Blanc Script asks; the OS models one contact per conversation. |
| Typing / presence | Not needed. |
| Multiple numbers | The OS currently assumes one WhatsApp number for the workspace. |

## 4. Acceptance tests

1. Send from the OS to a real handset → arrives on WhatsApp; the OS shows Sent, then
   Delivered, then Read.
2. Reply from the handset → appears in the same OS thread within 5 seconds, without a page
   reload being required beyond the normal refresh.
3. Message from a number the OS has never seen → a new conversation is created; if the
   number matches a client contact, it is linked to that client and named after them.
4. UK numbers stored as `07700 900412` in the OS match `+447700900412` from WhatsApp.
5. The same webhook delivered twice stores one message.
6. A webhook with a wrong signature, or a timestamp older than five minutes, is rejected
   with `401` and nothing is stored.
7. Sending to a number that isn't on WhatsApp shows "Not delivered" with Aniro's reason.
8. If Aniro is down, the OS still saves the message and marks it Not delivered.

## 5. To switch it on (Blanc Script, once Aniro is ready)

Set on the Vercel project (Production):

| Variable | Value |
|---|---|
| `ANIRO_API_URL` | Base URL of Aniro's API, e.g. `https://api.aniro.ai` |
| `ANIRO_API_KEY` | Bearer key Aniro issues for the OS |
| `ANIRO_WEBHOOK_SECRET` | Shared secret used for the webhook signature |
| `ANIRO_ORG_ID` *(optional)* | Only needed if the OS ever hosts more than one workspace |

Then redeploy. Until `ANIRO_API_URL` and `ANIRO_API_KEY` are set, the inbox keeps working
as it does today: messages are stored and labelled "Saved, not sent".

## 6. What Aniro should send back to Blanc Script

- The API base URL and a key for the OS.
- The webhook secret (or agree one).
- Confirmation of which WhatsApp number is connected, and the template names approved for
  out-of-window messages.
- Any deviation from the payloads above — the OS side is small and easy to adjust, but it
  must match exactly.
