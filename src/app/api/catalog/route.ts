import { NextResponse } from "next/server";
import { fetchCatalog, MaterialHubError, type Catalog } from "@/lib/material-hub";

export const revalidate = 300;

/**
 * Catalog proxy.
 *
 * Material Hub sends no CORS headers and its product API key must stay on the
 * server, so the browser only ever talks to this route. Responses are cached
 * for five minutes at the fetch layer.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const kind = url.searchParams.get("kind");
  const category = url.searchParams.get("category");
  const query = (url.searchParams.get("q") || "").trim().toLowerCase();

  try {
    const catalog = await fetchCatalog();

    let templates = catalog.templates;
    if (kind === "image" || kind === "video") {
      templates = templates.filter((template) => template.kind === kind);
    }
    if (category) {
      templates = templates.filter((template) => template.categoryId === category);
    }
    if (query) {
      templates = templates.filter(
        (template) =>
          template.title.toLowerCase().includes(query) ||
          template.prompt.toLowerCase().includes(query)
      );
    }

    const payload: Catalog & { total: number } = {
      categories: catalog.categories,
      templates,
      total: templates.length
    };

    return NextResponse.json(payload, {
      headers: { "cache-control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600" }
    });
  } catch (cause) {
    if (cause instanceof MaterialHubError) {
      return NextResponse.json(
        { error: { code: cause.code, message: cause.message } },
        { status: cause.status }
      );
    }
    console.error("Catalog request failed", cause);
    return NextResponse.json(
      { error: { code: "CATALOG_UNAVAILABLE", message: "素材目录暂时不可用" } },
      { status: 502 }
    );
  }
}
