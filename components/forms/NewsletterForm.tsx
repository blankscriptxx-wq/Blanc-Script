"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, Check } from "lucide-react";

/**
 * Lightweight newsletter capture. Currently a client-side stub with a success
 * state — wire the submit handler to your ESP (Mailchimp, Klaviyo, etc.) or the
 * /api/enquiry route. See README → "Connecting forms".
 */
export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!valid) {
      setError("Enter a valid email address.");
      return;
    }
    setError("");
    // TODO: POST to your newsletter provider here.
    setDone(true);
  }

  if (done) {
    return (
      <p className="flex items-center gap-2 text-sm text-teal">
        <Check className="h-4 w-4" aria-hidden /> Thanks — you&apos;re on the list.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-sm">
      <label htmlFor="newsletter-email" className="sr-only">
        Email address
      </label>
      <div className="flex items-center gap-2 rounded-pill border border-cream/20 bg-cream/5 p-1.5 pl-4 focus-within:border-teal">
        <input
          id="newsletter-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@brand.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="min-w-0 flex-1 bg-transparent py-2 text-sm text-cream placeholder:text-cream/40 focus:outline-none"
        />
        <button
          type="submit"
          aria-label="Subscribe"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-teal text-charcoal transition-colors hover:bg-teal-dark hover:text-cream"
        >
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs text-coral">
          {error}
        </p>
      )}
    </form>
  );
}
