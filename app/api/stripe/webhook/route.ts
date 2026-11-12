import { revalidatePath } from "next/cache";
import { markInvoicePaidFromStripe } from "@/lib/data/payments";
import { verifyWebhook } from "@/lib/payments/stripe";

export const dynamic = "force-dynamic";

type StripeEvent = {
  type?: string;
  data?: {
    object?: {
      payment_status?: string;
      metadata?: Record<string, string> | null;
    };
  };
};

/**
 * Stripe → OS. Marks an invoice paid the moment its payment link is paid.
 * Point a Stripe webhook at /api/stripe/webhook for `checkout.session.completed`
 * and `checkout.session.async_payment_succeeded`, and set STRIPE_WEBHOOK_SECRET.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyWebhook(raw, req.headers.get("stripe-signature"))) {
    return new Response("Invalid signature", { status: 400 });
  }
  let event: StripeEvent;
  try {
    event = JSON.parse(raw) as StripeEvent;
  } catch {
    return new Response("Bad payload", { status: 400 });
  }

  const paidEvent =
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded";
  const session = event.data?.object;
  const invoiceId = session?.metadata?.invoice_id;

  if (paidEvent && invoiceId && session?.payment_status === "paid") {
    if (/^[0-9a-f-]{36}$/i.test(invoiceId)) {
      await markInvoicePaidFromStripe(invoiceId, "webhook");
      revalidatePath("/finance");
      revalidatePath(`/finance/${invoiceId}`);
    }
  }
  return Response.json({ received: true });
}
