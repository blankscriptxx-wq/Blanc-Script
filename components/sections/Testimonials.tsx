"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Quote } from "lucide-react";
import { testimonials } from "@/data/testimonials";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Tag } from "@/components/ui/Tag";

/**
 * Testimonial carousel. NOTE: all quotes are clearly-labelled PLACEHOLDERS
 * (see data/testimonials.ts) — no fictional client is presented as genuine.
 * Keyboard-operable controls; swipeable via drag on touch.
 */
export function Testimonials() {
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const reduce = useReducedMotion();
  const count = testimonials.length;

  const go = (next: number) => {
    setDir(next > index || (index === count - 1 && next === 0) ? 1 : -1);
    setIndex((next + count) % count);
  };

  const t = testimonials[index];

  return (
    <section className="py-section" aria-labelledby="testimonials-heading" aria-roledescription="carousel">
      <div className="shell">
        <SectionHeading
          id="testimonials-heading"
          eyebrow="In their words"
          title={<>What working with us <span className="text-teal-dark">feels like</span>.</>}
          intro="A few words from the brands we work with."
        />

        <div className="relative mt-14 overflow-hidden rounded-card border border-charcoal/12 bg-white/70 p-8 md:p-14">
          <Quote className="mb-6 h-10 w-10 text-coral/30" aria-hidden />
          <AnimatePresence mode="wait" custom={dir}>
            <motion.blockquote
              key={index}
              initial={reduce ? { opacity: 0 } : { opacity: 0, x: dir * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, x: dir * -40 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              drag={reduce ? false : "x"}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.15}
              onDragEnd={(_, info) => {
                if (info.offset.x < -60) go(index + 1);
                else if (info.offset.x > 60) go(index - 1);
              }}
            >
              <p className="max-w-3xl font-serif text-2xl italic leading-snug text-charcoal md:text-3xl">
                &ldquo;{t.quote}&rdquo;
              </p>
              <footer className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="font-semibold text-charcoal">{t.name}</span>
                <span className="text-charcoal-soft">
                  {t.role}, {t.company}
                </span>
                <Tag tone="teal">{t.industry}</Tag>
              </footer>
            </motion.blockquote>
          </AnimatePresence>

          <div className="mt-10 flex items-center justify-between">
            <div className="flex gap-2" role="tablist" aria-label="Choose testimonial">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`Testimonial ${i + 1}`}
                  onClick={() => go(i)}
                  className={`h-2 rounded-full transition-all ${
                    i === index ? "w-8 bg-coral" : "w-2 bg-charcoal/20 hover:bg-charcoal/40"
                  }`}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => go(index - 1)}
                aria-label="Previous testimonial"
                className="grid h-11 w-11 place-items-center rounded-full border border-charcoal/20 text-charcoal transition-colors hover:bg-charcoal hover:text-cream"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
              </button>
              <button
                onClick={() => go(index + 1)}
                aria-label="Next testimonial"
                className="grid h-11 w-11 place-items-center rounded-full border border-charcoal/20 text-charcoal transition-colors hover:bg-charcoal hover:text-cream"
              >
                <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
