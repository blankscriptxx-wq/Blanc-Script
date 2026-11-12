import type { ReactNode } from "react";
import { PageHero } from "./PageHero";

type Section = { heading: string; body: ReactNode };

/**
 * Shared layout for legal pages. Renders a page header + a readable single
 * column of sections with consistent typography.
 */
export function LegalLayout({
  title,
  updated,
  intro,
  sections,
  breadcrumbLabel,
  breadcrumbPath,
}: {
  title: string;
  updated: string;
  intro: ReactNode;
  sections: Section[];
  breadcrumbLabel: string;
  breadcrumbPath: string;
}) {
  return (
    <>
      <PageHero
        eyebrow="Legal"
        breadcrumbs={[
          { name: "Home", path: "/" },
          { name: breadcrumbLabel, path: breadcrumbPath },
        ]}
        title={title}
        intro={intro}
      />
      <section className="pb-section">
        <div className="shell max-w-3xl">
          <p className="mb-10 rounded-xl border border-gold/40 bg-gold/10 p-4 text-sm text-charcoal-soft">
            <strong>Placeholder notice:</strong> this is template wording to be
            reviewed and completed by a qualified legal advisor before launch. It
            is not legal advice.
          </p>
          <p className="mb-12 text-sm text-charcoal/50">Last updated: {updated}</p>

          <div className="space-y-10">
            {sections.map((s) => (
              <div key={s.heading}>
                <h2 className="font-display text-xl font-semibold text-charcoal">{s.heading}</h2>
                <div className="mt-3 space-y-3 leading-relaxed text-charcoal-soft">{s.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
