"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { mainNav, cta } from "@/data/navigation";
import { cn } from "@/lib/utils";
import { Wordmark } from "./Wordmark";
import { Button } from "@/components/ui/Button";
import { MobileMenu } from "./MobileMenu";

/**
 * Sticky, condensing navigation. Transparent over the hero, solid on scroll.
 * Desktop links with active state; mobile menu button opens the full-screen menu.
 */
export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-all duration-300 ease-editorial",
          scrolled
            ? "border-b border-charcoal/10 bg-cream/85 backdrop-blur-md"
            : "bg-transparent"
        )}
      >
        <nav className="shell flex h-[4.5rem] items-center justify-between" aria-label="Primary">
          <Wordmark />

          <ul className="hidden items-center gap-8 lg:flex">
            {mainNav.map((link) => {
              const active =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative py-2 text-sm font-medium transition-colors",
                      active ? "text-coral" : "text-charcoal hover:text-coral"
                    )}
                  >
                    {link.label}
                    {active && (
                      <span className="absolute -bottom-0.5 left-0 h-0.5 w-full rounded-full bg-teal" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center gap-3">
            <Button href={cta.primary.href} size="md" className="hidden sm:inline-flex" withArrow>
              {cta.primary.label}
            </Button>
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              aria-expanded={menuOpen}
              className="grid h-11 w-11 place-items-center rounded-full border border-charcoal/20 text-charcoal transition-colors hover:bg-charcoal hover:text-cream lg:hidden"
            >
              <Menu className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </nav>
      </header>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
