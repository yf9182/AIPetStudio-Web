"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export type FaqItem = { question: string; answer: string };

/**
 * FAQ accordion.
 *
 * Matches the reference: hairline-separated rows, 18px padding, a chevron that
 * rotates, and an answer block indented to 18px with 10px top padding.
 */
export function Faq({ items, className }: { items: FaqItem[]; className?: string }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className={cn("flex flex-col", className)}>
      {items.map((item, index) => {
        const expanded = open === index;
        return (
          <div key={item.question} className="border-b border-white/8">
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setOpen(expanded ? null : index)}
              className="flex w-full cursor-pointer items-center justify-between gap-4 p-[18px] text-left"
            >
              <span className="flex-1 text-base leading-[22px] tracking-[-0.015em] text-ink-100">
                {item.question}
              </span>
              <svg
                viewBox="0 0 24 24"
                aria-hidden
                className={cn(
                  "size-4 shrink-0 text-white/50 transition-transform duration-150",
                  expanded && "rotate-180"
                )}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
              >
                <path d="M6 9.5l6 6 6-6" />
              </svg>
            </button>
            <div
              className={cn(
                "grid transition-[grid-template-rows] duration-200 ease-out",
                expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              )}
            >
              <div className="min-h-0 overflow-hidden">
                <p className="px-[18px] pt-[10px] pb-[18px] text-nav leading-6 text-ink-400">{item.answer}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
