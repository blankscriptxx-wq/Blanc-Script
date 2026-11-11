import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const button = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm font-medium transition-colors duration-150 ease-editorial focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40 active:scale-[.98]",
  {
    variants: {
      variant: {
        primary:
          "bg-bs-primary text-bs-on-accent hover:bg-bs-primary-hover",
        secondary:
          "border border-bs-border-strong text-bs-text hover:bg-bs-surface-2",
        ghost: "text-bs-text hover:bg-bs-surface-2",
        subtle: "bg-bs-neutral-soft text-bs-text hover:bg-bs-surface-2",
        danger: "bg-bs-danger text-bs-on-accent hover:opacity-90",
        link: "text-bs-primary underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-7 px-2.5 text-xs",
        md: "h-9 px-3.5 text-body",
        lg: "h-11 px-5 text-body",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(button({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";
