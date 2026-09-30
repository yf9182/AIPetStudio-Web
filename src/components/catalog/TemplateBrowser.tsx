"use client";

import { useMemo, useState } from "react";
import { GenerateDialog } from "@/components/generate/GenerateDialog";
import { TemplateGrid } from "@/components/catalog/TemplateCard";
import { Chip } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Layout";
import type { Catalog, Template, TemplateCategory } from "@/lib/material-hub";
import { cn } from "@/lib/utils";

type KindFilter = "all" | "image" | "video";

const KIND_CHIPS: Array<{ value: KindFilter; label: string }> = [
  { value: "all", label: "全部" },
  { value: "image", label: "图生图" },
  { value: "video", label: "图生视频" }
];

/**
 * Template gallery with the reference page's filter row: a light pill for the
 * active filter, hairline-bordered pills for the rest, followed by the category
 * chips Material Hub reports (never hard-coded, so new categories appear on
 * their own).
 */
export function TemplateBrowser({
  catalog,
  initialKind = "all",
  initialCategory = ""
}: {
  catalog: Catalog;
  initialKind?: KindFilter;
  initialCategory?: string;
}) {
  const [kind, setKind] = useState<KindFilter>(initialKind);
  const [category, setCategory] = useState(initialCategory);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<Template | null>(null);

  const categories: TemplateCategory[] = useMemo(
    () => catalog.categories.filter((item) => item.count > 0),
    [catalog.categories]
  );

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return catalog.templates.filter((template) => {
      if (kind !== "all" && template.kind !== kind) return false;
      if (category && template.categoryId !== category) return false;
      if (needle) {
        const haystack = `${template.title} ${template.prompt}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }, [catalog.templates, kind, category, query]);

  return (
    <div id="templates" className="flex flex-col gap-6 scroll-mt-24">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {KIND_CHIPS.map((chip) => (
            <Chip
              key={chip.value}
              active={kind === chip.value}
              onClick={() => setKind(chip.value)}
            >
              {chip.label}
            </Chip>
          ))}

          {categories.length > 0 ? (
            <span aria-hidden className="mx-1 hidden h-5 w-px bg-white/12 sm:block" />
          ) : null}

          <Chip active={category === ""} onClick={() => setCategory("")}>
            全部分类
          </Chip>
          {categories.map((item) => (
            <Chip key={item.id} active={category === item.id} onClick={() => setCategory(item.id)}>
              {item.name}
            </Chip>
          ))}
        </div>

        <label className="relative flex h-9 w-full items-center lg:w-64">
          <span className="sr-only">搜索模板</span>
          <svg
            viewBox="0 0 24 24"
            aria-hidden
            className="pointer-events-none absolute left-3 size-4 text-white/35"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
          >
            <circle cx="11" cy="11" r="6.5" />
            <path d="M16 16l4 4" />
          </svg>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索模板"
            className="h-9 w-full rounded-full border border-white/15 bg-transparent pr-4 pl-9 text-nav text-ink-100 placeholder:text-white/35 focus:border-white/35 focus:outline-none"
          />
        </label>
      </div>

      <p className="text-micro text-white/40">共 {visible.length} 个模板</p>

      {visible.length === 0 ? (
        <EmptyState
          title="没有符合条件的模板"
          description={
            catalog.templates.length === 0
              ? "素材中心暂时没有已发布的模板，请稍后再试。"
              : "试试切换分类或清空搜索关键词。"
          }
          action={
            <Chip
              active
              onClick={() => {
                setKind("all");
                setCategory("");
                setQuery("");
              }}
            >
              重置筛选
            </Chip>
          }
        />
      ) : (
        <TemplateGrid templates={visible} onUse={setActive} />
      )}

      {/* Keyed so the dialog's upload state resets whenever a different
          template is chosen. */}
      {active ? (
        <GenerateDialog key={active.id} template={active} onClose={() => setActive(null)} />
      ) : null}

      <span className={cn("sr-only")} aria-live="polite">
        当前显示 {visible.length} 个模板
      </span>
    </div>
  );
}
