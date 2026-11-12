import { revalidatePath } from "next/cache";
import { handleBillingEvent, storedWebhookSecrets } from "@/lib/data/billing";
import { markInvoicePaidFromStripe } from "@/lib/data/payments";
import { verifyWebhook } from "@/lib/payments/stripe";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type StripeEvent = {
  type?: string;
  data?: {
    object?: {
      mode?: string;
      payment_status?: string;
      metadata?: Record<string, string> | null;
    } & Record<string, unknown>;
  };
};

/**
 * Stripe → OS. Handles:
 *  - one-off invoice payment links (marks that invoice paid);
 *  - package subscriptions: links a new subscription to its client, mirrors
 *    each paid Stripe invoice as an OS invoice (and emails it), and keeps the
 *    client's status, renewal date and package in step.
 * The signing secret comes from STRIPE_WEBHOOK_SECRET or from the one stored
 * when a workspace pressed "Connect Stripe" in Settings.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const secrets = await storedWebhookSecrets().catch(() => []);
  if (!verifyWebhook(raw, req.headers.get("stripe-signature"), secrets)) {
    return new Response("Invalid signature", { status: 400 });
  }
  let event: StripeEvent;
  try {
    event = JSON.parse(raw) as StripeEvent;
  } catch {
    return new Response("Bad payload", { status: 400 });
  }

  const session = event.data?.object;
  const results: string[] = [];
  try {
    // One-off payment link for a specific OS invoice.
    const paidCheckout =
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded";
    const invoiceId = session?.metadata?.invoice_id;
    if (paidCheckout && session?.mode !== "subscription" && invoiceId && session?.payment_status === "paid") {
      if (/^[0-9a-f-]{36}$/i.test(invoiceId)) {
        await markInvoicePaidFromStripe(invoiceId, "webhook");
        revalidatePath(`/finance/${invoiceId}`);
        results.push("invoice_paid");
      }
    }
    results.push(await handleBillingEvent(event));
  } catch (e) {
    // A 500 makes Stripe retry later, which is what we want for a transient failure.
    return Response.json(
      { received: false, error: e instanceof Error ? e.message : "failed" },
      { status: 500 },
    );
  }
  revalidatePath("/finance");
  revalidatePath("/clients");
  return Response.json({ received: true, results });
}
