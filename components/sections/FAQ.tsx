import { faqs } from "@/data/faqs";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Accordion } from "@/components/ui/Accordion";

/** FAQ accordion. Paired with FAQ schema in the page that renders it. */
export function FAQ({ items = faqs }: { items?: typeof faqs }) {
  return (
    <section className="py-section" aria-labelledby="faq-heading">
      <div className="shell grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
        <SectionHeading
          id="faq-heading"
          eyebrow="Questions"
          title={<>Good to <span className="text-teal-dark">know</span>.</>}
          intro="The things brands usually ask before we start."
        />
        <div className="lg:pt-2">
          <Accordion items={items} />
        </div>
      </div>
    </section>
  );
}
