import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/Button";
import { MediaPlaceholder } from "@/components/ui/MediaPlaceholder";

/** Brief About introduction with a link to the full page. */
export function AboutPreview() {
  return (
    <section className="py-section" aria-labelledby="about-preview-heading">
      <div className="shell grid items-center gap-12 lg:grid-cols-2">
        <Reveal>
          <MediaPlaceholder
            media={{ kind: "photo" }}
            label="Behind the scenes"
            accent="teal"
            ratio="aspect-[5/4]"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        </Reveal>
        <div>
          <SectionHeading
            id="about-preview-heading"
            eyebrow="The studio"
            title={<>A strategy-led creative studio.</>}
          />
          <Reveal delay={0.1}>
            <p className="mt-6 text-lg leading-relaxed text-charcoal-soft">
              We work closely with brands to develop content that looks premium,
              feels authentic and serves a clear business objective. Strategy,
              production and social — held to a single standard.
            </p>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="mt-8">
              <Button href="/about" variant="secondary" withArrow>
                About Blanc Script
              </Button>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
