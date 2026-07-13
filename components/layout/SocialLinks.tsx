import { Instagram, Linkedin, Youtube } from "lucide-react";
import { site } from "@/data/site";
import { cn } from "@/lib/utils";

/** TikTok has no Lucide icon — small inline SVG. */
function TikTok({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M16.5 3c.3 2.1 1.6 3.7 3.7 4v2.6c-1.3.1-2.6-.3-3.7-1v6.3c0 3.2-2.6 5.8-5.8 5.8S4.9 18.1 4.9 15s2.6-5.8 5.8-5.8c.3 0 .6 0 .9.1v2.7c-.3-.1-.6-.2-.9-.2-1.7 0-3.1 1.4-3.1 3.1s1.4 3.1 3.1 3.1 3.1-1.4 3.1-3.1V3h2.7z" />
    </svg>
  );
}

const links = [
  { key: "instagram", label: "Instagram", href: site.social.instagram, Icon: Instagram },
  { key: "tiktok", label: "TikTok", href: site.social.tiktok, Icon: TikTok },
  { key: "linkedin", label: "LinkedIn", href: site.social.linkedin, Icon: Linkedin },
  { key: "youtube", label: "YouTube", href: site.social.youtube, Icon: Youtube },
] as const;

export function SocialLinks({
  tone = "dark",
  className,
}: {
  tone?: "dark" | "light";
  className?: string;
}) {
  return (
    <ul className={cn("flex items-center gap-1", className)}>
      {links.map(({ key, label, href, Icon }) => (
        <li key={key}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Blanc Script on ${label}`}
            className={cn(
              "grid h-11 w-11 place-items-center rounded-full transition-colors",
              tone === "light"
                ? "text-cream/70 hover:bg-cream/10 hover:text-cream"
                : "text-charcoal-soft hover:bg-charcoal/8 hover:text-coral"
            )}
          >
            <Icon className="h-[1.15rem] w-[1.15rem]" />
          </a>
        </li>
      ))}
    </ul>
  );
}
