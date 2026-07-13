"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowDown } from "lucide-react";
import { cta } from "@/data/navigation";
import { Button } from "@/components/ui/Button";
import { MediaPlaceholder } from "@/components/ui/MediaPlaceholder";
import { EASE } from "@/lib/motion";

const HEADLINE = ["We turn brands", "into stories", "people remember."];

/**
 * Cinematic, light-led editorial hero. Oversized animated headline on a warm
 * cream canvas, paired with a tall showreel media panel. On mobile the copy and
 * CTAs come first (understand + act above the fold), media follows.
 */
export function Hero() {
  const reduce = useReducedMotion();

  return (
    <section className="relative overflow-hidden pt-28 md:pt-32" aria-labelledby="hero-heading">
      {/* Ambient brand glow */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -right-24 top-10 h-72 w-72 rounded-full bg-teal/20 blur-3xl md:h-96 md:w-96" />
        <div className="absolute -left-20 top-40 h-64 w-64 rounded-full bg-coral/10 blur-3xl" />
      </div>

      <div className="shell relative grid items-center gap-10 pb-16 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14 lg:pb-24">
        <div>
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="eyebrow mb-6 flex items-center gap-3 text-coral"
          >
            <span className="inline-block h-px w-8 bg-current opacity-60" aria-hidden />
            Strategy-led creative agency · Birmingham
          </motion.p>

          <h1 id="hero-heading" className="text-[clamp(2.6rem,7.5vw,5.25rem)] font-bold leading-[0.98] tracking-[-0.03em] text-charcoal">
            {HEADLINE.map((line, i) => (
              <span key={i} className="block overflow-hidden">
                <motion.span
                  className="block"
                  initial={reduce ? false : { y: "110%" }}
                  animate={{ y: "0%" }}
                  transition={{ duration: 0.8, ease: EASE, delay: 0.1 + i * 0.12 }}
                >
                  {i === 2 ? (
                    <span className="script-underline">{line}</span>
                  ) : (
                    line
                  )}
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.p
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.5 }}
            className="mt-7 max-w-xl text-lg leading-relaxed text-charcoal-soft"
          >
            Blanc Script combines strategy, cinematic production and social media
            expertise to create content that captures attention and drives growth.
          </motion.p>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.65 }}
            className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <Button href={cta.primary.href} size="lg" withArrow>
              {cta.primary.label}
            </Button>
            <Button href={cta.portfolio.href} variant="secondary" size="lg">
              {cta.portfolio.label}
            </Button>
          </motion.div>
        </div>

        {/* Showreel media panel */}
        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: EASE, delay: 0.2 }}
          className="relative"
        >
          <MediaPlaceholder
            media={{ kind: "video" }}
            label="Showreel"
            accent="charcoal"
            ratio="aspect-[4/5] sm:aspect-[16/11] lg:aspect-[4/5]"
            priority
            sizes="(max-width: 1024px) 100vw, 45vw"
          />
          <div className="absolute -bottom-4 left-4 right-4 flex items-center justify-between rounded-pill bg-cream/90 px-5 py-3 text-sm font-medium text-charcoal shadow-lg backdrop-blur">
            <span className="flex items-center gap-2">
              <span className="grid h-2.5 w-2.5 place-items-center">
                <span className="h-2.5 w-2.5 animate-ping rounded-full bg-coral/60" />
                <span className="absolute h-2 w-2 rounded-full bg-coral" />
              </span>
              Showreel 2025
            </span>
            <span className="text-charcoal-soft">Replace with your reel</span>
          </div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <div className="shell hidden pb-8 lg:block">
        <motion.a
          href="#intro"
          aria-label="Scroll to content"
          className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.25em] text-charcoal-soft transition-colors hover:text-coral"
          animate={reduce ? undefined : { y: [0, 6, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <ArrowDown className="h-4 w-4" aria-hidden />
          Scroll
        </motion.a>
      </div>
    </section>
  );
}
