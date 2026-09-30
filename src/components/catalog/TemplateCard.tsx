"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CardAction } from "@/components/ui/Button";
import type { Template } from "@/lib/material-hub";
import { cn } from "@/lib/utils";

/**
 * Template card.
 *
 * Mirrors the reference gallery card: 8px radius on a rgba(255,255,255,0.03)
 * surface, a hairline inset outline, a bottom-up black gradient carrying the
 * title, and a white pill primary action next to a translucent secondary one.
 * The media area keeps the source aspect ratio instead of being cropped.
 */
export function TemplateCard({
  template,
  onUse,
  priority = false
}: {
  template: Template;
  onUse?: (template: Template) => void;
  priority?: boolean;
}) {
  const media = template.previewUrl || template.coverUrl;
  const isVideo = template.kind === "video";

  return (
    <article className="group relative overflow-hidden rounded-card bg-white/3">
      <div className="relative">
        {isVideo ? (
          <VideoMedia src={media} poster={template.coverUrl} />
        ) : (
          <ImageMedia template={template} priority={priority} />
        )}

        <span aria-hidden className="slight-outline absolute inset-0 z-2 rounded-card" />

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-3 flex flex-col gap-2.5 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-3.5 pt-10 pb-3.5">
          <h3 className="line-clamp-2 text-title text-ink-50">{template.title}</h3>
          <div className="pointer-events-auto flex flex-wrap items-center gap-2">
            {onUse ? (
              <CardAction tone="solid" onClick={() => onUse(template)}>
                使用此模板
              </CardAction>
            ) : (
              <Link
                href={`/templates/${encodeURIComponent(template.id)}`}
                className="inline-flex h-8 items-center justify-center rounded-full bg-white px-3 text-micro font-semibold text-ink-850 transition-colors hover:bg-white/90"
              >
                使用此模板
              </Link>
            )}
            <CopyPromptButton prompt={template.prompt} />
          </div>
        </div>
      </div>
    </article>
  );
}

/** Video tile with a mute toggle in the top-right, like the reference. */
function VideoMedia({ src, poster }: { src: string; poster: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.muted = muted;
    if (muted) return;
    // Autoplay with sound is blocked until a user gesture, so retry on click.
    void element.play().catch(() => setMuted(true));
  }, [muted]);

  return (
    <div className="relative w-full">
      <video
        ref={ref}
        src={src}
        poster={poster || undefined}
        className="block h-full w-full object-cover"
        muted={muted}
        loop
        playsInline
        autoPlay
        preload="metadata"
      />
      <button
        type="button"
        aria-label={muted ? "取消静音" : "静音"}
        onClick={() => setMuted((value) => !value)}
        className="absolute top-2 right-2 z-4 flex size-8 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white/90 backdrop-blur-md transition-colors hover:bg-black/80 hover:text-white"
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7">
          <path d="M4 9.5v5h3.2L12 18V6L7.2 9.5H4Z" />
          {muted ? <path d="M16 9.5l4 5M20 9.5l-4 5" /> : <path d="M16 8.6a4.5 4.5 0 0 1 0 6.8M18.6 6.6a8 8 0 0 1 0 10.8" />}
        </svg>
      </button>
    </div>
  );
}

/**
 * Still tile. `coverType === 1` assets ship a separate before image, so the
 * card crossfades from the effect to the original on hover.
 */
function ImageMedia({ template, priority }: { template: Template; priority: boolean }) {
  const [showBefore, setShowBefore] = useState(false);
  const hasComparison = template.coverType === 1 && Boolean(template.beforeImageUrl && template.afterImageUrl);

  const after = hasComparison ? template.afterImageUrl! : template.previewUrl || template.coverUrl;
  const before = template.beforeImageUrl;

  return (
    <div
      className="relative w-full"
      onMouseEnter={() => hasComparison && setShowBefore(true)}
      onMouseLeave={() => hasComparison && setShowBefore(false)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- catalog media is
          served from Aliyun OSS / the Material Hub Worker, whose hostnames are
          configured at deploy time; the optimizer is not used for them. */}
      <img
        src={(hasComparison && showBefore && before ? before : after) || ""}
        alt={template.title}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        className="block h-full w-full bg-white/3 object-cover transition-opacity duration-300"
      />
      {hasComparison ? (
        <span className="absolute top-2 left-2 z-4 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white/85 backdrop-blur-sm">
          {showBefore ? "原图" : "效果"}
        </span>
      ) : null}
    </div>
  );
}

function CopyPromptButton({ prompt }: { prompt: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <CardAction
      tone="glass"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(prompt);
          setCopied(true);
        } catch {
          setCopied(false);
        }
      }}
    >
      <span className="flex items-center gap-1.5">
        <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.7">
          {copied ? <path d="M5 12.5l4.5 4.5L19 7.5" /> : <><rect x="9" y="9" width="10" height="10" rx="2" /><path d="M15 5H7a2 2 0 0 0-2 2v8" /></>}
        </svg>
        {copied ? "已复制" : "复制提示词"}
      </span>
    </CardAction>
  );
}

/** Masonry-style grid: 3 columns at desktop, 2 at tablet, 1 on phones. */
export function TemplateGrid({
  templates,
  onUse,
  className
}: {
  templates: Template[];
  onUse?: (template: Template) => void;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {templates.map((template, index) => (
        <TemplateCard key={template.id} template={template} onUse={onUse} priority={index < 3} />
      ))}
    </div>
  );
}
