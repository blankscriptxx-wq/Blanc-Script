import type { Metadata } from "next";
import { Sora, Inter } from "next/font/google";
import "./(site)/globals.css";
import { Button } from "@/site/components/ui/Button";

// Used for any URL that matches no route. It bypasses both root layouts
// (site and OS), so it brings its own fonts and styles.
const sora = Sora({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-display",
  display: "swap",
});
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Page not found · Blanc Script",
  robots: { index: false, follow: false },
};

export default function GlobalNotFound() {
  return (
    <html lang="en-GB" className={`${sora.variable} ${inter.variable}`}>
      <body className="font-sans antialiased">
        <section className="grid min-h-screen place-items-center px-6">
          <div className="text-center">
            <p className="font-display text-display-lg font-bold text-charcoal">
              4<span className="text-coral">0</span>4
            </p>
            <h1 className="mt-2 font-display text-2xl font-semibold text-charcoal">
              This page went off-script.
            </h1>
            <p className="mx-auto mt-3 max-w-md text-charcoal-soft">
              The page you&apos;re after doesn&apos;t exist or has moved.
            </p>
            <div className="mt-8 flex justify-center gap-3">
              <Button href="/" withArrow>
                Back home
              </Button>
            </div>
          </div>
        </section>
      </body>
    </html>
  );
}
