import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <section className="grid min-h-[70vh] place-items-center px-6 pt-32">
      <div className="text-center">
        <p className="font-display text-display-lg font-bold text-charcoal">
          4<span className="text-coral">0</span>4
        </p>
        <h1 className="mt-2 font-display text-2xl font-semibold text-charcoal">
          This page went off-script.
        </h1>
        <p className="mx-auto mt-3 max-w-md text-charcoal-soft">
          The page you&apos;re after doesn&apos;t exist or has moved. Let&apos;s get you back on track.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button href="/" withArrow>Back home</Button>
          <Button href="/portfolio" variant="secondary">View work</Button>
        </div>
      </div>
    </section>
  );
}
