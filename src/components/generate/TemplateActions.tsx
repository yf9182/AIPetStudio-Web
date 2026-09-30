"use client";

import { useState } from "react";
import { GenerateDialog } from "@/components/generate/GenerateDialog";
import { Button, CardAction } from "@/components/ui/Button";
import type { Template } from "@/lib/material-hub";

/**
 * Detail-page actions: the primary generate CTA plus a copy-prompt control,
 * matching the two pill actions the reference page puts on every template.
 */
export function TemplateActions({ template }: { template: Template }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="brand" size="lg" onClick={() => setOpen(true)}>
          使用此模板
          <svg viewBox="0 0 24 24" aria-hidden className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M5 12h13M13 6.5l5.5 5.5-5.5 5.5" />
          </svg>
        </Button>

        <CardAction
          tone="glass"
          className="h-10 px-4 text-nav"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(template.prompt);
              setCopied(true);
              setTimeout(() => setCopied(false), 1800);
            } catch {
              setCopied(false);
            }
          }}
        >
          <span className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" aria-hidden className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7">
              {copied ? (
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              ) : (
                <>
                  <rect x="9" y="9" width="10" height="10" rx="2" />
                  <path d="M15 5H7a2 2 0 0 0-2 2v8" />
                </>
              )}
            </svg>
            {copied ? "已复制提示词" : "复制提示词"}
          </span>
        </CardAction>
      </div>

      {open ? <GenerateDialog template={template} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
