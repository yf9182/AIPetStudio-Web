import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Button geometry and colour are taken from the reference design:
 *
 *   primary   #FAFAFA background, black label, fully rounded, 9px 18px padding
 *   secondary rgba(255,255,255,0.16) background, #F5F5F5 label
 *   brand     #0075FF background, white label (the reference's生成 button)
 *   outline   transparent with a rgba(255,255,255,0.2) border
 *
 * Sizes map to measured heights: nav CTA 32px, hero CTA 40px, card action 31px.
 */
export type ButtonVariant = "primary" | "secondary" | "brand" | "outline" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg" | "xl";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-ink-50 text-black hover:bg-white disabled:hover:bg-ink-50",
  secondary: "bg-white/16 text-ink-100 hover:bg-white/24 disabled:hover:bg-white/16",
  brand: "bg-brand text-white hover:bg-brand-hover disabled:hover:bg-brand",
  outline: "border border-white/20 text-ink-200 hover:border-white/40 hover:text-white",
  ghost: "text-ink-200 hover:bg-white/8 hover:text-white",
  danger: "border border-red-500/40 text-red-300 hover:bg-red-500/12 hover:text-red-200"
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-micro font-medium gap-1.5",
  md: "h-9 px-4 text-nav font-medium gap-2",
  lg: "h-10 px-4.5 text-base font-medium gap-2",
  xl: "h-12 px-6 text-base font-medium gap-2"
};

const BASE =
  "inline-flex items-center justify-center rounded-full whitespace-nowrap transition-colors duration-150 " +
  "disabled:cursor-not-allowed disabled:opacity-50 select-none";

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children?: ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: CommonProps & ComponentProps<"button">) {
  return (
    <button className={cn(BASE, VARIANTS[variant], SIZES[size], className)} {...rest}>
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: CommonProps & ComponentProps<typeof Link>) {
  return (
    <Link className={cn(BASE, VARIANTS[variant], SIZES[size], className)} {...rest}>
      {children}
    </Link>
  );
}

/** Pill filter used above the template grid. */
export function Chip({
  active = false,
  className,
  children,
  ...rest
}: { active?: boolean } & ComponentProps<"button">) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "h-9 shrink-0 rounded-full px-4 text-chip transition-colors duration-150",
        active
          ? "bg-ink-100 text-black"
          : "border border-white/20 text-ink-200 hover:border-white/40 hover:text-white",
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Small pill action overlaid on a template card. */
export function CardAction({
  tone = "solid",
  className,
  children,
  ...rest
}: { tone?: "solid" | "glass" } & ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-8 items-center justify-center rounded-full px-3 text-micro transition-colors duration-150",
        tone === "solid"
          ? "bg-white font-semibold text-ink-850 hover:bg-white/90"
          : "bg-black/40 font-medium text-white/85 backdrop-blur-sm hover:bg-black/60 hover:text-white",
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
