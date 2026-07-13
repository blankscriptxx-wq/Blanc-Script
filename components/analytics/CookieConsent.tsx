"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

const KEY = "bs-cookie-consent";

/**
 * Minimal cookie-consent banner (placeholder). Stores the choice in
 * localStorage. To make analytics truly consent-gated, read this value before
 * initialising GA/Pixel in components/analytics/Analytics.tsx.
 */
export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setVisible(true);
    } catch {
      /* localStorage unavailable — skip */
    }
  }, []);

  function decide(choice: "accepted" | "declined") {
    try {
      localStorage.setItem(KEY, choice);
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed inset-x-3 bottom-3 z-[65] mx-auto max-w-3xl rounded-card border border-charcoal/10 bg-white/95 p-5 shadow-xl backdrop-blur sm:inset-x-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-charcoal-soft">
          We use cookies to understand how the site is used. See our{" "}
          <Link href="/privacy-policy" className="text-coral underline underline-offset-2">
            Privacy Policy
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <Button variant="secondary" size="md" onClick={() => decide("declined")}>
            Decline
          </Button>
          <Button variant="primary" size="md" onClick={() => decide("accepted")}>
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
