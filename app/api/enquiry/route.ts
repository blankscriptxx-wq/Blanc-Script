import { NextResponse } from "next/server";

/**
 * Enquiry endpoint.
 *
 * Delivery priority:
 *   1. HubSpot  — if HUBSPOT_PORTAL_ID + HUBSPOT_FORM_GUID are set, the enquiry
 *      is submitted to your HubSpot form (creates/updates a CRM contact).
 *   2. Webhook  — else if ENQUIRY_WEBHOOK_URL is set, the raw payload is POSTed
 *      there (Zapier / Make / GoHighLevel / any inbound webhook).
 *   3. Log only — else it's logged server-side so nothing is silently lost.
 *
 * HubSpot setup (free CRM): see README → "Connecting the enquiry form to HubSpot".
 * Both HubSpot IDs are safe to expose (they're not secrets).
 */

type Payload = Record<string, unknown>;

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : v == null ? "" : String(v);
}

/** Build a readable summary of the "extra" fields for the HubSpot message property. */
function buildMessage(data: Payload): string {
  const services = Array.isArray(data.services)
    ? (data.services as string[]).join(", ")
    : str(data.services);

  const lines = [
    str(data.details),
    "",
    `Industry: ${str(data.industry) || "—"}`,
    `Services: ${services || "—"}`,
    `Budget: ${str(data.budget) || "—"}`,
    `Preferred start: ${str(data.startDate) || "—"}`,
    `Social links: ${str(data.socials) || "—"}`,
    `Heard about us via: ${str(data.referral) || "—"}`,
  ];
  return lines.join("\n");
}

async function sendToHubSpot(data: Payload): Promise<void> {
  const portalId = process.env.HUBSPOT_PORTAL_ID;
  const formGuid = process.env.HUBSPOT_FORM_GUID;
  if (!portalId || !formGuid) throw new Error("HubSpot not configured");

  const fullName = str(data.name);
  const [firstname, ...rest] = fullName.split(" ");
  const lastname = rest.join(" ");

  // Field names must match the internal property names on your HubSpot form.
  const fields = [
    { name: "email", value: str(data.email) },
    { name: "firstname", value: firstname },
    { name: "lastname", value: lastname },
    { name: "phone", value: str(data.phone) },
    { name: "company", value: str(data.business) },
    { name: "website", value: str(data.website) },
    { name: "message", value: buildMessage(data) },
  ].filter((f) => f.value); // HubSpot rejects empty required-less fields cleanly

  const res = await fetch(
    `https://api.hsforms.com/submissions/v3/integration/submit/${portalId}/${formGuid}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fields,
        context: { pageName: "Contact — Blanc Script" },
      }),
    }
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HubSpot responded ${res.status}: ${body}`);
  }
}

export async function POST(request: Request) {
  let data: Payload;
  try {
    data = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const name = str(data.name);
  const email = str(data.email);
  const details = str(data.details);

  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || details.length < 10) {
    return NextResponse.json(
      { ok: false, error: "Missing or invalid required fields" },
      { status: 422 }
    );
  }

  try {
    if (process.env.HUBSPOT_PORTAL_ID && process.env.HUBSPOT_FORM_GUID) {
      await sendToHubSpot(data);
    } else if (process.env.ENQUIRY_WEBHOOK_URL) {
      const res = await fetch(process.env.ENQUIRY_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, submittedAt: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error(`Webhook responded ${res.status}`);
    } else {
      console.info("New enquiry (no destination configured):", { name, email });
    }
  } catch (err) {
    console.error("Enquiry delivery failed:", err);
    return NextResponse.json({ ok: false, error: "Delivery failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
