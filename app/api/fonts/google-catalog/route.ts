import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import type { GoogleFontCatalogEntry } from "@/app/(studio)/standalone/studio/types/google-font-catalog";

const FONTSOURCE_URL = "https://api.fontsource.org/v1/fonts";

type FontsourceRow = {
  family: string;
  type: string;
  weights: number[];
  styles: string[];
  variable: boolean;
};

const fetchGoogleCatalog = unstable_cache(
  async (): Promise<GoogleFontCatalogEntry[]> => {
    const res = await fetch(FONTSOURCE_URL, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) {
      throw new Error(`Fontsource HTTP ${res.status}`);
    }
    const data = (await res.json()) as FontsourceRow[];
    if (!Array.isArray(data)) {
      throw new Error("Fontsource: invalid JSON");
    }
    return data
      .filter((row) => row.type === "google" && typeof row.family === "string")
      .map((row) => ({
        family: row.family,
        weights: Array.isArray(row.weights) ? row.weights : [400],
        styles: Array.isArray(row.styles) ? row.styles : ["normal"],
        variable: Boolean(row.variable),
      }));
  },
  ["google-fonts-catalog-fontsource"],
  { revalidate: 86400 },
);

/**
 * GET /api/fonts/google-catalog
 * Cached list of Google families + metadata for css2 URLs (Fontsource).
 */
export async function GET() {
  try {
    const fonts = await fetchGoogleCatalog();
    return NextResponse.json({ fonts });
  } catch (e) {
    console.error("[google-catalog]", e);
    return NextResponse.json(
      { fonts: [] as GoogleFontCatalogEntry[], error: "catalog_unavailable" },
      { status: 503 },
    );
  }
}
