import { NextResponse } from "next/server";

/**
 * Enquiry endpoint → emails each submission to the studio inbox.
 *
 * Delivery uses Web3Forms (https://web3forms.com) — free, unlimited, no signup
 * beyond a free access key that's tied to your destination email.
 *
 * ── SETUP ──────────────────────────────────────────────────────────────
 * 1. Go to web3forms.com, enter hello@blancscript.com, and they email you an
 *    "Access Key" (a UUID).
 * 2. Put it in WEB3FORMS_ACCESS_KEY (Vercel env var and/or .env.local), OR
 *    paste it into ACCESS_KEY below.
 * The key isn't a secret — it only lets a form email that one fixed address.
 *
 * Until a key is set, submissions are logged (and the form still shows success)
 * so nothing breaks during setup — but no email is sent, so add the key before
 * promoting the site.
 */

// Optionally hardcode the key here instead of using an env var:
const ACCESS_KEY = process.env.WEB3FORMS_ACCESS_KEY || "";

type Payload = Record<string, unknown>;

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : v == null ? "" : String(v);
}

async function sendEmail(data: Payload): Promise<void> {
  const services = Array.isArray(data.services)
    ? (data.services as string[]).join(", ")
    : str(data.services);

  const name = str(data.name);
  const business = str(data.business);

  const res = await fetch("https://api.web3forms.com/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      access_key: ACCESS_KEY,
      subject: `New enquiry — ${name}${business ? ` (${business})` : ""}`,
      from_name: "Blanc Script Website",
      replyto: str(data.email), // reply straight to the enquirer
      // These become the body of the email:
      Name: name,
      Email: str(data.email),
      Phone: str(data.phone),
      Business: business,
      Website: str(data.website),
      Industry: str(data.industry),
      "Services required": services,
      "Estimated budget": str(data.budget),
      "Preferred start": str(data.startDate),
      "Social links": str(data.socials),
      "Heard about us via": str(data.referral),
      "Project details": str(data.details),
    }),
  });

  const json = (await res.json().catch(() => ({}))) as { success?: boolean; message?: string };
  if (!res.ok || !json.success) {
    throw new Error(`Web3Forms error ${res.status}: ${json.message ?? "unknown"}`);
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

  if (!ACCESS_KEY) {
    // No destination configured yet — log so nothing is lost, still succeed.
    console.info("New enquiry (WEB3FORMS_ACCESS_KEY not set):", { name, email });
    return NextResponse.json({ ok: true });
  }

  try {
    await sendEmail(data);
  } catch (err) {
    console.error("Enquiry delivery failed:", err);
    return NextResponse.json({ ok: false, error: "Delivery failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
