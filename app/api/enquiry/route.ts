import { NextResponse } from "next/server";

/**
 * Enquiry endpoint (stub).
 *
 * As shipped, this validates the payload and returns success WITHOUT storing or
 * forwarding anything. Wire it to your destination of choice:
 *
 *  ── Option A: CRM / automation webhook (HubSpot, GoHighLevel, Zapier, Make) ──
 *    Set ENQUIRY_WEBHOOK_URL in .env.local, and the block below will forward the
 *    payload as JSON. Most CRMs accept an inbound webhook out of the box.
 *
 *  ── Option B: Email (Resend / SendGrid / Postmark) ──
 *    Add the provider SDK and send a formatted email here.
 *
 *  ── Option C: Supabase / database ──
 *    Insert `data` into a table via the Supabase JS client or an RPC.
 *
 *  ── Option D: Wix / external form ──
 *    Point the form's fetch() at your Wix endpoint instead of this route, or
 *    forward from here.
 *
 * Keep validation server-side too — never trust the client alone.
 */
export async function POST(request: Request) {
  let data: Record<string, unknown>;
  try {
    data = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const name = String(data.name ?? "").trim();
  const email = String(data.email ?? "").trim();
  const details = String(data.details ?? "").trim();

  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || details.length < 10) {
    return NextResponse.json(
      { ok: false, error: "Missing or invalid required fields" },
      { status: 422 }
    );
  }

  const webhook = process.env.ENQUIRY_WEBHOOK_URL;
  if (webhook) {
    try {
      const res = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, submittedAt: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error(`Webhook responded ${res.status}`);
    } catch (err) {
      console.error("Enquiry webhook failed:", err);
      return NextResponse.json({ ok: false, error: "Delivery failed" }, { status: 502 });
    }
  } else {
    // No destination configured — log for local dev so nothing is silently lost.
    console.info("New enquiry (no ENQUIRY_WEBHOOK_URL set):", { name, email });
  }

  return NextResponse.json({ ok: true });
}
