import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "light";
type Size = "md" | "lg";

const base =
  "group inline-flex items-center justify-center gap-2 rounded-pill font-semibold " +
  "transition-all duration-300 ease-editorial focus-visible:outline-none " +
  "min-h-[44px] select-none";

const sizes: Record<Size, string> = {
  md: "px-6 py-3 text-[0.95rem]",
  lg: "px-8 py-4 text-base",
};

const variants: Record<Variant, string> = {
  // Coral — primary action
  primary:
    "bg-coral text-white hover:bg-coral-dark active:scale-[0.98] shadow-[0_10px_30px_-12px_rgba(232,55,91,0.6)]",
  // Charcoal outline on light
  secondary:
    "border border-charcoal/25 text-charcoal hover:border-charcoal hover:bg-charcoal hover:text-cream",
  // Minimal text button
  ghost: "text-charcoal hover:text-coral px-0 py-2",
  // For use on dark charcoal sections
  light:
    "bg-cream text-charcoal hover:bg-white active:scale-[0.98]",
};

type CommonProps = {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
  withArrow?: boolean;
};

type LinkProps = CommonProps & {
  href: string;
  type?: never;
  onClick?: never;
  disabled?: never;
};

type NativeButtonProps = CommonProps & {
  href?: never;
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
};

export function Button(props: LinkProps | NativeButtonProps) {
  const {
    children,
    variant = "primary",
    size = "md",
    className,
    withArrow = false,
  } = props;

  const classes = cn(base, sizes[size], variants[variant], className);

  const inner = (
    <>
      {children}
      {withArrow && (
        <ArrowUpRight
          className="h-4 w-4 transition-transform duration-300 ease-editorial group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          aria-hidden="true"
        />
      )}
    </>
  );

  if ("href" in props && props.href) {
    const external = props.href.startsWith("http");
    return (
      <Link
        href={props.href}
        className={classes}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {inner}
      </Link>
    );
  }

  return (
    <button
      type={props.type ?? "button"}
      onClick={props.onClick}
      disabled={props.disabled}
      className={cn(classes, props.disabled && "opacity-50 cursor-not-allowed")}
    >
      {inner}
    </button>
  );
}
