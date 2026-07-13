import Link from "next/link";
import { MapPin, Mail, Phone } from "lucide-react";
import { footerNav } from "@/data/navigation";
import { site } from "@/data/site";
import { Wordmark } from "./Wordmark";
import { SocialLinks } from "./SocialLinks";
import { NewsletterForm } from "@/components/forms/NewsletterForm";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="grain relative bg-charcoal text-cream">
      {/* Main footer grid */}
      <div className="shell grid gap-12 py-section md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div className="max-w-xs">
          <Wordmark tone="light" />
          <p className="mt-5 text-sm leading-relaxed text-cream/60">
            {site.description}
          </p>
          <SocialLinks tone="light" className="mt-6 -ml-2" />
        </div>

        {footerNav.map((col) => (
          <nav key={col.heading} aria-label={col.heading}>
            <h3 className="eyebrow text-cream/50">{col.heading}</h3>
            <ul className="mt-5 space-y-3">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-cream/80 transition-colors hover:text-teal"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      {/* Contact + newsletter */}
      <div className="shell grid gap-10 border-t border-cream/10 py-12 lg:grid-cols-[1fr_1fr]">
        <ul className="space-y-3 text-sm text-cream/70">
          <li className="flex items-center gap-3">
            <MapPin className="h-4 w-4 shrink-0 text-teal" aria-hidden />
            {site.location.city}, {site.location.country} — nationwide &amp; international
          </li>
          <li>
            <a href={`mailto:${site.contact.email}`} className="flex items-center gap-3 hover:text-teal">
              <Mail className="h-4 w-4 shrink-0 text-teal" aria-hidden />
              {site.contact.email}
            </a>
          </li>
          <li>
            <a href={site.contact.phoneHref} className="flex items-center gap-3 hover:text-teal">
              <Phone className="h-4 w-4 shrink-0 text-teal" aria-hidden />
              {site.contact.phone}
            </a>
          </li>
        </ul>
        <div>
          <h3 className="eyebrow text-cream/50">Stay in the loop</h3>
          <p className="mt-4 mb-4 text-sm text-cream/60">
            Occasional notes on brand, content and what we&apos;re making.
          </p>
          <NewsletterForm />
        </div>
      </div>

      {/* Bottom bar */}
      <div className="shell flex flex-col gap-4 border-t border-cream/10 py-6 text-xs text-cream/50 sm:flex-row sm:items-center sm:justify-between">
        <p>© {year} {site.legalName}. All rights reserved.</p>
        <div className="flex gap-6">
          <Link href="/privacy-policy" className="hover:text-cream">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-cream">Terms &amp; Conditions</Link>
        </div>
      </div>
    </footer>
  );
}
