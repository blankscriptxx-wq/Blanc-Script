"use client";

import { useState, type FormEvent } from "react";
import { Check, Loader2, AlertCircle } from "lucide-react";
import { services } from "@/data/services";
import { industries } from "@/data/industries";
import { cn } from "@/lib/utils";

type Status = "idle" | "submitting" | "success" | "error";
type Errors = Record<string, string>;

// Web3Forms access key — public by design (only emails hello@blancscript.com).
// Override via NEXT_PUBLIC_WEB3FORMS_KEY if you'd rather keep it out of code.
const WEB3FORMS_KEY =
  process.env.NEXT_PUBLIC_WEB3FORMS_KEY || "881d6ebc-c505-4c4b-b937-56ae43d9e070";

const budgets = [
  "Not sure yet",
  "Under £2,000",
  "£2,000 – £5,000",
  "£5,000 – £10,000",
  "£10,000 – £25,000",
  "£25,000+",
];

const referralSources = [
  "Instagram",
  "TikTok",
  "LinkedIn",
  "Google search",
  "Referral / word of mouth",
  "Other",
];

const fieldBase =
  "w-full rounded-xl border border-charcoal/20 bg-white/80 px-4 py-3 text-charcoal placeholder:text-charcoal/35 " +
  "focus:border-coral focus:outline-none focus:ring-2 focus:ring-coral/20 transition-colors min-h-[48px]";

function Label({ htmlFor, children, required }: { htmlFor: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="mb-2 block text-sm font-medium text-charcoal">
      {children}
      {required && <span className="text-coral"> *</span>}
    </label>
  );
}

/**
 * Enquiry form. Mobile-first single column, correct input types/keyboards,
 * labels above fields, minimal required set (name/email/details). Client-side
 * validation preserves entered data on error. Submits to /api/enquiry.
 *
 * TO CONNECT A CRM: see app/api/enquiry/route.ts and the README.
 */
export function ContactForm({ defaultService }: { defaultService?: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<Errors>({});
  const [selectedServices, setSelectedServices] = useState<string[]>(
    defaultService ? [defaultService] : []
  );

  function toggleService(slug: string) {
    setSelectedServices((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());

    // Validate minimal required fields
    const nextErrors: Errors = {};
    if (!String(data.name ?? "").trim()) nextErrors.name = "Please enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.email ?? "")))
      nextErrors.email = "Enter a valid email address.";
    if (String(data.details ?? "").trim().length < 10)
      nextErrors.details = "Tell us a little more (10+ characters).";

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      // Move focus to the first error for screen-reader users
      const firstError = Object.keys(nextErrors)[0];
      form.querySelector<HTMLElement>(`[name="${firstError}"]`)?.focus();
      return;
    }

    setErrors({});
    setStatus("submitting");
    try {
      const name = String(data.name ?? "").trim();
      const business = String(data.business ?? "").trim();

      // Web3Forms is submitted client-side (its free tier only accepts
      // browser requests). The access key is public by design — it only ever
      // emails the address it's tied to (hello@blancscript.com).
      const payload = {
        access_key: WEB3FORMS_KEY,
        subject: `New enquiry — ${name}${business ? ` (${business})` : ""}`,
        from_name: "Blanc Script Website",
        replyto: String(data.email ?? ""),
        botcheck: "", // honeypot
        Name: name,
        Email: String(data.email ?? ""),
        Phone: String(data.phone ?? ""),
        Business: business,
        Website: String(data.website ?? ""),
        Industry: String(data.industry ?? ""),
        "Services required": selectedServices.join(", "),
        "Estimated budget": String(data.budget ?? ""),
        "Preferred start": String(data.startDate ?? ""),
        "Social links": String(data.socials ?? ""),
        "Heard about us via": String(data.referral ?? ""),
        "Project details": String(data.details ?? ""),
      };

      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => ({}))) as { success?: boolean };
      if (!res.ok || !json.success) throw new Error("Request failed");

      setStatus("success");
      form.reset();
      setSelectedServices([]);
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div
        role="status"
        className="rounded-card border border-teal/30 bg-teal/8 p-8 text-center"
      >
        <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-teal text-charcoal">
          <Check className="h-7 w-7" aria-hidden />
        </span>
        <h3 className="font-display text-2xl font-semibold text-charcoal">Thanks — got it.</h3>
        <p className="mx-auto mt-3 max-w-md text-charcoal-soft">
          We&apos;ve received your enquiry and will be in touch soon. If it&apos;s urgent,
          email us directly and we&apos;ll prioritise it.
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="mt-6 text-sm font-semibold text-coral hover:underline"
        >
          Send another enquiry
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      {status === "error" && (
        <div role="alert" className="flex items-center gap-3 rounded-xl border border-coral/30 bg-coral/8 p-4 text-sm text-coral-dark">
          <AlertCircle className="h-5 w-5 shrink-0" aria-hidden />
          Something went wrong sending your enquiry. Please try again, or email us directly.
        </div>
      )}

      {/* Required essentials */}
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <Label htmlFor="name" required>Full name</Label>
          <input id="name" name="name" type="text" autoComplete="name" className={cn(fieldBase, errors.name && "border-coral")} aria-invalid={!!errors.name} aria-describedby={errors.name ? "name-error" : undefined} />
          {errors.name && <p id="name-error" className="mt-1.5 text-sm text-coral">{errors.name}</p>}
        </div>
        <div>
          <Label htmlFor="business">Business name</Label>
          <input id="business" name="business" type="text" autoComplete="organization" className={fieldBase} />
        </div>
        <div>
          <Label htmlFor="email" required>Email</Label>
          <input id="email" name="email" type="email" inputMode="email" autoComplete="email" className={cn(fieldBase, errors.email && "border-coral")} aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-error" : undefined} />
          {errors.email && <p id="email-error" className="mt-1.5 text-sm text-coral">{errors.email}</p>}
        </div>
        <div>
          <Label htmlFor="phone">Phone number</Label>
          <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" className={fieldBase} />
        </div>
        <div>
          <Label htmlFor="website">Website</Label>
          <input id="website" name="website" type="url" inputMode="url" placeholder="https://" className={fieldBase} />
        </div>
        <div>
          <Label htmlFor="socials">Social media links</Label>
          <input id="socials" name="socials" type="text" placeholder="@yourbrand" className={fieldBase} />
        </div>
      </div>

      {/* Industry + budget + start date */}
      <div className="grid gap-6 sm:grid-cols-3">
        <div>
          <Label htmlFor="industry">Industry</Label>
          <select id="industry" name="industry" className={fieldBase} defaultValue="">
            <option value="" disabled>Select…</option>
            {industries.map((i) => (
              <option key={i.slug} value={i.name}>{i.name}</option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="budget">Estimated budget</Label>
          <select id="budget" name="budget" className={fieldBase} defaultValue="">
            <option value="" disabled>Select…</option>
            {budgets.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="startDate">Preferred start</Label>
          <input id="startDate" name="startDate" type="month" className={fieldBase} />
        </div>
      </div>

      {/* Services required (multi-select chips) */}
      <fieldset>
        <legend className="mb-3 text-sm font-medium text-charcoal">Services required</legend>
        <div className="flex flex-wrap gap-2">
          {services.map((s) => {
            const active = selectedServices.includes(s.slug);
            return (
              <button
                key={s.slug}
                type="button"
                onClick={() => toggleService(s.slug)}
                aria-pressed={active}
                className={cn(
                  "rounded-pill border px-4 py-2 text-sm transition-colors min-h-[44px]",
                  active
                    ? "border-coral bg-coral text-white"
                    : "border-charcoal/20 text-charcoal hover:border-charcoal"
                )}
              >
                {s.short}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Project details */}
      <div>
        <Label htmlFor="details" required>Project details</Label>
        <textarea id="details" name="details" rows={5} placeholder="Tell us about your brand, goals and what you have in mind." className={cn(fieldBase, "resize-y", errors.details && "border-coral")} aria-invalid={!!errors.details} aria-describedby={errors.details ? "details-error" : undefined} />
        {errors.details && <p id="details-error" className="mt-1.5 text-sm text-coral">{errors.details}</p>}
      </div>

      {/* Referral */}
      <div className="sm:max-w-xs">
        <Label htmlFor="referral">How did you hear about us?</Label>
        <select id="referral" name="referral" className={fieldBase} defaultValue="">
          <option value="" disabled>Select…</option>
          {referralSources.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      <div className="flex flex-col items-start gap-4 pt-2 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={status === "submitting"}
          className="group inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-pill bg-coral px-8 py-4 font-semibold text-white transition-colors hover:bg-coral-dark disabled:opacity-70 sm:w-auto"
        >
          {status === "submitting" ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              Sending…
            </>
          ) : (
            "Send enquiry"
          )}
        </button>
        <p className="text-xs text-charcoal/50">
          We aim to reply within two business days. No spam, ever.
        </p>
      </div>
    </form>
  );
}
