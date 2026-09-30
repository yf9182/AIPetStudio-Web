/**
 * Material Hub (素材中心) read-only catalog client.
 *
 * Material Hub exposes no CORS headers at all, so a browser can never call it
 * directly — every request in this file runs on the server. The product API key
 * therefore never leaves the server, which is also why the catalog is proxied
 * through `/api/catalog/*` instead of being fetched from client components.
 *
 * The parsing rules below mirror the shipping iOS client
 * (`AIPetStudio/Core/Networking/MaterialHubClient.swift`) so the web catalog
 * resolves exactly the same templates the app shows.
 */

const REQUEST_TIMEOUT_MS = 15_000;
const MAX_PAGES = 20;
const DEFAULT_PAGE_SIZE = 50;

export type TemplateKind = "image" | "video";

/** `1` = before/after comparison, `2` = single effect image, `3` = animated preview. */
export type TemplateCoverType = 1 | 2 | 3;

export type Template = {
  /** `material_id` — stable across revisions and used as `template_id` upstream. */
  id: string;
  /** `id` of the product/material relation row. */
  relationId: string;
  title: string;
  kind: TemplateKind;
  coverType: TemplateCoverType;
  /** Number of reference images the user must upload. The backend only accepts 1. */
  imageCount: number;
  /** Display price from the catalog. The backend enforces the real charge. */
  price: number;
  prompt: string;
  categoryId: string;
  categoryName: string;
  coverUrl: string;
  previewUrl: string;
  resultUrl: string;
  beforeImageUrl: string | null;
  afterImageUrl: string | null;
  videoDuration: number | null;
  videoResolution: string | null;
  businessMode: string | null;
  isHot: boolean;
  marks: string[];
  updatedAt: string | null;
};

export type TemplateCategory = {
  id: string;
  name: string;
  code: string;
  count: number;
};

export type Catalog = {
  categories: TemplateCategory[];
  templates: Template[];
};

export class MaterialHubError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code = "MATERIAL_HUB_ERROR", status = 502) {
    super(message);
    this.name = "MaterialHubError";
    this.code = code;
    this.status = status;
  }
}

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeObject(value: unknown): JsonObject {
  return isObject(value) ? value : {};
}

function safeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export type MaterialHubConfig = {
  baseUrl: string;
  apiKey: string;
  pid: string;
  channel: string;
  source: string;
};

export function materialHubConfig(): MaterialHubConfig {
  const baseUrl = (process.env.MATERIAL_HUB_BASE_URL || "").replace(/\/+$/, "");
  const apiKey = process.env.MATERIAL_HUB_API_KEY || "";

  if (!baseUrl) {
    throw new MaterialHubError("MATERIAL_HUB_BASE_URL is not configured", "CONFIGURATION_ERROR", 503);
  }
  if (!apiKey) {
    throw new MaterialHubError("MATERIAL_HUB_API_KEY is not configured", "CONFIGURATION_ERROR", 503);
  }

  return {
    baseUrl,
    apiKey,
    pid: process.env.MATERIAL_HUB_PID || "8802",
    channel: process.env.MATERIAL_HUB_CHANNEL || "English",
    source: process.env.MATERIAL_HUB_SOURCE || "English"
  };
}

// ---------------------------------------------------------------------------
// Transport
// ---------------------------------------------------------------------------

async function hubGet<T>(
  path: string,
  query: Record<string, string> = {},
  revalidate = 300
): Promise<T> {
  const config = materialHubConfig();
  const url = new URL(`${config.baseUrl}${path}`);
  url.searchParams.set("pid", config.pid);
  url.searchParams.set("channel", config.channel);
  url.searchParams.set("source", config.source);
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }

  let lastError: unknown = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "X-API-Key": config.apiKey
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        next: { revalidate }
      });

      if (response.status >= 500) {
        lastError = new MaterialHubError(`Material Hub responded ${response.status}`, "UPSTREAM_ERROR", 502);
        continue;
      }
      if (!response.ok) {
        throw new MaterialHubError(`Material Hub responded ${response.status}`, "UPSTREAM_ERROR", 502);
      }

      const body = (await response.json()) as { code?: number; data?: unknown; msg?: string };
      // A successful envelope is `code === 1`; HTTP 200 with `code: 0` is a failure.
      if (body.code !== 1) {
        const detail = isObject(body.data) ? asString(body.data.error) : "";
        throw new MaterialHubError(
          body.msg || detail || "素材目录服务返回异常",
          detail || "MATERIAL_HUB_REJECTED",
          502
        );
      }

      return body.data as T;
    } catch (cause) {
      if (cause instanceof MaterialHubError && cause.status === 502 && cause.code === "UPSTREAM_ERROR") {
        lastError = cause;
        await new Promise((resolve) => setTimeout(resolve, 350 * 2 ** attempt));
        continue;
      }
      if (cause instanceof MaterialHubError) throw cause;
      lastError = cause;
      await new Promise((resolve) => setTimeout(resolve, 350 * 2 ** attempt));
    }
  }

  throw lastError instanceof MaterialHubError
    ? lastError
    : new MaterialHubError("素材目录服务暂时不可用", "UPSTREAM_UNAVAILABLE", 502);
}

// ---------------------------------------------------------------------------
// Raw shapes
// ---------------------------------------------------------------------------

type ValueField = {
  value?: unknown;
  data?: { id?: unknown; name?: unknown; cdn_url?: unknown } | null;
};

type RawCategoryNode = {
  id?: unknown;
  name?: unknown;
  code?: unknown;
  translation?: { lang?: Record<string, { content?: unknown } | undefined> } | null;
  children?: unknown;
};

type RawMaterial = {
  id?: unknown;
  material_id?: unknown;
  listing_status?: unknown;
  publish_status?: unknown;
  create_time?: unknown;
  update_time?: unknown;
  public_properties?: unknown;
  independent_properties?: unknown;
};

// ---------------------------------------------------------------------------
// Normalisation
// ---------------------------------------------------------------------------

const CATEGORY_NAME_OVERRIDES: Record<string, string> = {
  Hot: "热门",
  Fresh: "上新",
  Cozy_Healing: "治愈",
  Comedy: "搞笑",
  Adventure: "奇幻冒险",
  Talent: "才艺",
  Festival: "节日",
  Poster: "海报",
  "3D": "3D",
  Video: "视频",
  Test_Category: "测试"
};

function localizedCategoryName(node: RawCategoryNode, code: string): string {
  const lang = safeObject(node.translation).lang;
  const languages = isObject(lang) ? lang : {};
  const zh = asString(safeObject(languages["zh-cn"]).content);
  const en = asString(safeObject(languages["en"]).content);
  const fallback = asString(node.name) || code;
  return CATEGORY_NAME_OVERRIDES[code] ?? zh ?? en ?? fallback;
}

function readValueField(source: unknown, key: string): ValueField | null {
  const field = safeObject(source)[key];
  return isObject(field) ? (field as ValueField) : null;
}

function mediaUrl(field: ValueField | null): string {
  const url = asString(field?.data?.cdn_url);
  return /^https:\/\//i.test(url) ? url : "";
}

function mediaName(field: ValueField | null): string {
  return asString(field?.data?.name);
}

function materialConfigOf(raw: RawMaterial): JsonObject {
  const rawConfig = safeArray<string>(readValueField(raw.public_properties, "material_config")?.value)[0];
  if (!rawConfig) return {};
  try {
    return safeObject(JSON.parse(rawConfig));
  } catch {
    return {};
  }
}

function kindFromConfig(config: JsonObject): TemplateKind {
  const preset = asString(config.preset);
  if (preset === "image_to_video") return "video";
  if (preset === "image_to_image") return "image";
  const type = asNumber(config.type);
  return type === 3 ? "video" : "image";
}

function titleOf(raw: RawMaterial): string {
  const langField = readValueField(raw.independent_properties, "material_lang");
  const langData = safeObject(langField?.data);
  const languages = safeObject(langData.lang);

  for (const key of ["zh-cn", "en"]) {
    const content = asString(safeObject(languages[key]).content).trim();
    if (content) return content;
  }

  const internalName = safeArray<string>(readValueField(raw.independent_properties, "material_internal_name")?.value)[0];
  if (internalName && internalName.trim()) return internalName.trim();

  return asString(raw.material_id) || asString(raw.id);
}

/**
 * Normalises one Material Hub row into a renderable template.
 * Returns `null` for rows the app cannot generate from, mirroring the iOS rules:
 * unpublished rows, rows without a material_config, rows needing more than one
 * reference image, and rows without a prompt are dropped.
 */
export function normalizeMaterial(raw: RawMaterial, category: { id: string; name: string }): Template | null {
  const listingStatus = asNumber(raw.listing_status) ?? 1;
  const publishStatus = asNumber(raw.publish_status) ?? 1;
  if (listingStatus === 0 || publishStatus === 0) return null;

  const config = materialConfigOf(raw);
  if (Object.keys(config).length === 0) return null;

  const imageCount = asNumber(config.image_count) ?? -1;
  const prompt = asString(config.prompt).trim();
  // The backend's task contract accepts exactly one reference image.
  if (imageCount !== 1 || !prompt) return null;

  const kind = kindFromConfig(config);
  const type = (asNumber(config.type) ?? 0) as TemplateCoverType;

  const thumbnail = mediaUrl(readValueField(raw.independent_properties, "thumbnail_file_id"));
  const original = mediaUrl(readValueField(raw.public_properties, "original_file_id"));
  const videoPreview = mediaUrl(readValueField(raw.independent_properties, "video_preview_file_id"));
  const fileUrlField = readValueField(raw.public_properties, "file_url");
  const fileUrl = mediaUrl(fileUrlField) || (() => {
    const inline = asString(config.file_url);
    return /^https:\/\//i.test(inline) ? inline : "";
  })();

  // Same fallback order as the app: curated cover → video preview → original → thumbnail.
  const preview = fileUrl || videoPreview || original || thumbnail;
  const previewName = fileUrl
    ? mediaName(fileUrlField) || asString(config.file_name)
    : videoPreview
      ? mediaName(readValueField(raw.independent_properties, "video_preview_file_id"))
      : mediaName(readValueField(raw.public_properties, "original_file_id"));

  const marks = safeArray<string>(readValueField(raw.independent_properties, "material_mark_list")?.value);

  const coverType: TemplateCoverType =
    type === 1 || type === 2 ? type : isVideoAsset(preview, previewName) ? 3 : 2;

  const price =
    asNumber(safeArray<unknown>(readValueField(raw.independent_properties, "price")?.value)[0]) ??
    asNumber(config.price) ??
    0;

  return {
    id: asString(raw.material_id) || asString(raw.id),
    relationId: asString(raw.id),
    title: titleOf(raw),
    kind,
    coverType,
    imageCount,
    price,
    prompt,
    categoryId: category.id,
    categoryName: category.name,
    coverUrl: thumbnail || preview,
    previewUrl: preview,
    resultUrl: fileUrl || original || preview,
    beforeImageUrl: coverType === 1 ? thumbnail || null : null,
    afterImageUrl: coverType === 1 ? fileUrl || preview || null : null,
    videoDuration: asNumber(config.video_duration),
    videoResolution: asString(config.video_resolution) || null,
    businessMode: asString(safeObject(safeObject(config.extensions).ai_pet_studio).business_mode) || null,
    isHot: marks.some((mark) => mark.toLowerCase().includes("hot")),
    marks,
    updatedAt: formatTimestamp(raw.update_time ?? raw.create_time)
  };
}

function isVideoAsset(url: string, name: string): boolean {
  const haystack = `${url} ${name}`.toLowerCase();
  return /\.(mp4|mov|m4v|webm)(\?|$)/.test(haystack) || haystack.includes("video");
}

function formatTimestamp(value: unknown): string | null {
  const numeric = asNumber(value);
  if (numeric === null) return null;
  // Material Hub stores seconds; values that look like milliseconds are scaled.
  const ms = numeric > 1e12 ? numeric : numeric * 1000;
  const date = new Date(ms);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** The business root category that holds AI Pet Studio's template categories. */
const PRODUCT_ROOT_CODE = "Nano_Banana";

type CategoryTreeData = { list?: RawCategoryNode[] };

export async function fetchCategories(): Promise<TemplateCategory[]> {
  const data = await hubGet<CategoryTreeData>("/api/v1/product-material-category/ids/tree-list", {
    page: "1",
    page_size: "100"
  });

  const roots = safeArray<RawCategoryNode>(data.list);
  const root = roots.find((node) => asString(node.code) === PRODUCT_ROOT_CODE) ?? roots[0];
  if (!root) return [];

  return safeArray<RawCategoryNode>(root.children).map((child) => {
    const code = asString(child.code);
    return {
      id: asString(child.id),
      code,
      name: localizedCategoryName(child, code),
      count: 0
    };
  });
}

type CategoryGroupPage = {
  list?: RawMaterial[];
  pager?: { page?: unknown; page_size?: unknown; total?: unknown };
};

/**
 * Reads every published template in one category, following the pager until the
 * reported total is reached. `MAX_PAGES` bounds a runaway pager.
 */
export async function fetchTemplatesForCategory(
  category: { id: string; name: string },
  revalidate = 300
): Promise<Template[]> {
  const collected: Template[] = [];
  const seen = new Set<string>();
  let total = Number.POSITIVE_INFINITY;

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const data = await hubGet<CategoryGroupPage>(
      `/api/v1/product-material/category-group/${encodeURIComponent(category.id)}`,
      { page: String(page), page_size: String(DEFAULT_PAGE_SIZE) },
      revalidate
    );

    const rows = safeArray<RawMaterial>(data.list);
    total = asNumber(data.pager?.total) ?? rows.length;

    for (const row of rows) {
      const template = normalizeMaterial(row, category);
      if (template && !seen.has(template.id)) {
        seen.add(template.id);
        collected.push(template);
      }
    }

    if (rows.length === 0 || collected.length >= total) break;
  }

  return collected;
}

export async function fetchCatalog(revalidate = 300): Promise<Catalog> {
  const categories = await fetchCategories();
  if (categories.length === 0) return { categories: [], templates: [] };

  const perCategory = await Promise.all(
    categories.map(async (category) => ({
      category,
      templates: await fetchTemplatesForCategory(category, revalidate).catch(() => [])
    }))
  );

  const templates: Template[] = [];
  const seen = new Set<string>();

  for (const { category, templates: items } of perCategory) {
    category.count = items.length;
    for (const item of items) {
      // A material can be listed in several categories; keep the first.
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      templates.push(item);
    }
  }

  templates.sort((a, b) => {
    if (a.isHot !== b.isHot) return a.isHot ? -1 : 1;
    return (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "");
  });

  return { categories, templates };
}

export async function fetchTemplate(id: string, revalidate = 300): Promise<Template | null> {
  try {
    const raw = await hubGet<RawMaterial>(
      `/api/v1/product-material/${encodeURIComponent(id)}`,
      {},
      revalidate
    );
    const categoryId = asString(safeObject(raw).category_id) || "";
    return normalizeMaterial(raw, { id: categoryId, name: "" });
  } catch (cause) {
    if (cause instanceof MaterialHubError && cause.code === "MATERIAL_NOT_FOUND") return null;
    // Fall back to the catalog when the detail endpoint rejects the id.
    const catalog = await fetchCatalog(revalidate);
    return catalog.templates.find((template) => template.id === id) ?? null;
  }
}
