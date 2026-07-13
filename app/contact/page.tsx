import type { Metadata } from "next";
import { MapPin, Mail, Phone, Clock, Globe } from "lucide-react";
import { buildMetadata, pageSeo } from "@/data/seo";
import { site } from "@/data/site";
import { JsonLd, breadcrumbSchema } from "@/components/seo/JsonLd";
import { PageHero } from "@/components/ui/PageHero";
import { ContactForm } from "@/components/forms/ContactForm";
import { SocialLinks } from "@/components/layout/SocialLinks";

export const metadata: Metadata = buildMetadata(pageSeo.contact);

const detailItems = [
  { Icon: Mail, label: "Email", value: site.contact.email, href: `mailto:${site.contact.email}` },
  { Icon: Phone, label: "Phone", value: site.contact.phone, href: site.contact.phoneHref },
  { Icon: MapPin, label: "Based in", value: `${site.location.city}, ${site.location.country}` },
  { Icon: Globe, label: "Availability", value: "Nationwide & international" },
  { Icon: Clock, label: "Response time", value: "Within two business days" },
];

export default function ContactPage() {
  const breadcrumbs = [
    { name: "Home", path: "/" },
    { name: "Contact", path: "/contact" },
  ];

  return (
    <>
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <PageHero
        eyebrow="Start a project"
        breadcrumbs={breadcrumbs}
        title={<>Let&apos;s build <span className="text-coral">yours</span>.</>}
        intro="Tell us about your brand and where you want to take it. Share as much or as little as you like — we'll come back with a clear, tailored approach."
      />

      <section className="pb-section">
        <div className="shell grid gap-12 lg:grid-cols-[1.5fr_1fr] lg:gap-16">
          {/* Form */}
          <div className="order-2 lg:order-1">
            <div className="rounded-card border border-charcoal/12 bg-white/50 p-6 sm:p-8">
              <ContactForm />
            </div>
          </div>

          {/* Details + discovery call */}
          <aside className="order-1 space-y-8 lg:order-2 lg:sticky lg:top-28 lg:self-start">
            <div id="discovery" className="scroll-mt-28 rounded-card bg-charcoal p-8 text-cream">
              <h2 className="font-display text-2xl font-semibold">Prefer to talk?</h2>
              <p className="mt-3 text-cream/70">
                Book a free discovery call. We&apos;ll talk through your goals and whether
                we&apos;re the right fit — no pressure, no pitch deck.
              </p>
              <a
                href={site.contact.bookingUrl}
                className="mt-6 inline-flex min-h-[48px] items-center justify-center rounded-pill bg-teal px-6 py-3 font-semibold text-charcoal transition-colors hover:bg-teal-dark hover:text-cream"
              >
                Book a discovery call
              </a>
              <p className="mt-3 text-xs text-cream/40">
                Placeholder link — connect Calendly / cal.com in data/site.ts
              </p>
            </div>

            <div className="rounded-card border border-charcoal/12 bg-white/50 p-8">
              <h2 className="eyebrow mb-6 text-charcoal/40">Contact</h2>
              <ul className="space-y-5">
                {detailItems.map(({ Icon, label, value, href }) => (
                  <li key={label} className="flex items-start gap-4">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-charcoal/6">
                      <Icon className="h-5 w-5 text-teal-dark" aria-hidden />
                    </span>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-charcoal/40">{label}</p>
                      {href ? (
                        <a href={href} className="font-medium text-charcoal hover:text-coral">{value}</a>
                      ) : (
                        <p className="font-medium text-charcoal">{value}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-6 border-t border-charcoal/10 pt-6">
                <p className="mb-3 text-xs uppercase tracking-wider text-charcoal/40">Follow</p>
                <SocialLinks className="-ml-2" />
              </div>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
