import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";

export const metadata: Metadata = { title: "Payment received", robots: { index: false, follow: false } };

/** Where Stripe returns the payer after a successful invoice payment. */
export default function PaymentThanksPage() {
  return (
    <div className="grid min-h-dvh place-items-center bg-bs-canvas px-6 text-bs-text">
      <div className="max-w-md text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-bs-success" />
        <h1 className="mt-4 font-display text-display">Payment received</h1>
        <p className="mt-3 text-bs-muted">
          Thank you. Your payment has gone through and Blanc Script has been notified. Stripe
          will email you a receipt. You can close this page.
        </p>
      </div>
    </div>
  );
}
