import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Section heading. The reference page uses 40px/700 with -2px tracking for
 * section titles and a 6px stack gap before the supporting line.
 */
export function SectionHeading({
  title,
  description,
  action,
  as: Tag = "h2",
  className
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  as?: "h1" | "h2" | "h3";
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="flex max-w-2xl flex-col gap-1.5">
        <Tag
          className={cn(
            "text-ink-50",
            Tag === "h1"
              ? "text-3xl font-bold tracking-[-1.6px] sm:text-display"
              : "text-3xl font-bold tracking-[-1.6px] sm:text-headline"
          )}
        >
          {title}
        </Tag>
        {description ? (
          <p className="text-base leading-6 text-white/60">{description}</p>
        ) : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-3">{action}</div> : null}
    </div>
  );
}

/** 992px content column inside a 1040px container, matching the reference. */
export function Container({
  children,
  className,
  as: Tag = "div"
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "main" | "header" | "footer";
}) {
  return <Tag className={cn("container-page", className)}>{children}</Tag>;
}

/** Card surface: rgba(255,255,255,0.03) with an 8px radius and a hairline. */
export function Card({
  children,
  className,
  interactive = false
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-card bg-white/3",
        interactive && "transition-transform duration-300 ease-out hover:scale-[1.02]",
        className
      )}
    >
      <span aria-hidden className="slight-outline absolute inset-0 z-2 rounded-card" />
      {children}
    </div>
  );
}

/** Larger panel surface used for forms and summary blocks. */
export function Panel({
  children,
  className,
  tone = "default"
}: {
  children: ReactNode;
  className?: string;
  tone?: "default" | "raised" | "brand";
}) {
  return (
    <div
      className={cn(
        "rounded-panel-lg",
        tone === "default" && "bg-white/4",
        tone === "raised" && "bg-white/8",
        tone === "brand" && "bg-brand-soft",
        className
      )}
    >
      {children}
    </div>
  );
}

/** Breadcrumb row, 14px/500 at 60% white with a 6px gap. */
export function Breadcrumbs({ items }: { items: Array<{ label: string; href?: string }> }) {
  return (
    <nav aria-label="面包屑">
      <ol className="flex flex-wrap items-center gap-1.5 text-nav tracking-[-0.2px] text-white/60">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
            {index > 0 ? <span aria-hidden className="text-white/30">/</span> : null}
            {item.href ? (
              <Link href={item.href} className="transition-colors hover:text-white">
                {item.label}
              </Link>
            ) : (
              <span className="text-white/80">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Centred eyebrow pill used above hero copy. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-white/6 px-3 py-1 text-micro font-medium text-white/80">
      {children}
    </span>
  );
}

/** Empty-state block shared by the task list and catalog fallbacks. */
export function EmptyState({
  title,
  description,
  action
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-panel-lg bg-white/3 px-6 py-16 text-center">
      <p className="text-base font-medium text-ink-100">{title}</p>
      {description ? <p className="max-w-md text-nav text-white/50">{description}</p> : null}
      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  );
}
