import { revalidatePath } from "next/cache";
import { recordDeliveryStatus, recordInboundMessage, resolveInboundOrg } from "@/lib/data/inbox-inbound";
import { verifyAniroSignature } from "@/lib/whatsapp/aniro";

export const dynamic = "force-dynamic";

type AniroEvent = {
  type?: string;
  data?: {
    id?: string;
    reference?: string;
    chat_id?: string;
    from?: string;
    from_name?: string;
    text?: string;
    timestamp?: string;
    status?: string;
    error?: string;
  };
};

/**
 * Aniro → OS webhook (see docs/aniro-whatsapp-brief.md).
 *   message.received  an inbound WhatsApp message
 *   message.status    a delivery receipt for a message the OS sent
 * Always answers 2xx for a validly signed event so Aniro doesn't retry forever.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyAniroSignature(raw, req.headers.get("x-aniro-signature"))) {
    return new Response("Invalid signature", { status: 401 });
  }
  let event: AniroEvent;
  try {
    event = JSON.parse(raw) as AniroEvent;
  } catch {
    return new Response("Bad payload", { status: 400 });
  }
  const orgId = await resolveInboundOrg();
  if (!orgId) return Response.json({ ok: false, reason: "no workspace" }, { status: 202 });

  const d = event.data ?? {};
  let result = "ignored";
  if (event.type === "message.received") {
    result = await recordInboundMessage(orgId, {
      externalId: d.id ?? "",
      from: d.from ?? "",
      fromName: d.from_name,
      text: d.text ?? "",
      at: d.timestamp,
      chatId: d.chat_id,
    });
  } else if (event.type === "message.status") {
    result = (await recordDeliveryStatus(orgId, {
      externalId: d.id,
      reference: d.reference,
      status: d.status ?? "",
      error: d.error,
    }))
      ? "updated"
      : "ignored";
  }
  if (result === "stored" || result === "updated") revalidatePath("/inbox");
  return Response.json({ ok: true, result });
}
