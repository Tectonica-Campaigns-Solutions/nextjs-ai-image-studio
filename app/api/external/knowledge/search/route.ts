import { NextRequest, NextResponse } from "next/server";
import { requireExternalAuth } from "@/lib/api-auth";
import { buildIndex, search } from "@/lib/knowledge/engine";
import {
  botExists,
  listAvailableBots,
  loadBotChunks,
} from "@/lib/knowledge/loader";
import type { SearchErrorResponse, SearchRequest } from "@/lib/knowledge/types";
import { asNumber, asStringArray } from "@/lib/utils";

const LOG_PREFIX = "[knowledge/search]";

export const dynamic = "force-dynamic";

/**
 * POST /api/external/knowledge/search
 *
 * Filesystem-based RAG retrieval (Strategy A — Direct Retrieval).
 *
 * Body parameters:
 * - bot (required): bot identifier; must match a folder under `knowledge/`
 * - query (optional): free-text query for full-text search
 * - tags (optional): array of tags to filter on (matched against frontmatter tags)
 * - folders (optional): array of folder path prefixes to scope the search
 * - maxResults (optional): max number of hits to return (default 5, capped at 50)
 * - maxTokens (optional): approximate token budget for the bundle (default 2000)
 * - tagMatchMode (optional): "any" (default) or "all"
 *
 * At least one of `query` or `tags` must be provided.
 */
export async function POST(request: NextRequest) {
  const authError = await requireExternalAuth(request);
  if (authError) return authError;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json<SearchErrorResponse>(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const bot = typeof body.bot === "string" ? body.bot.trim() : "";
  if (!bot) {
    return NextResponse.json<SearchErrorResponse>(
      { success: false, error: "Missing required field: bot" },
      { status: 400 },
    );
  }

  const query = typeof body.query === "string" ? body.query.trim() : "";
  const tags = asStringArray(body.tags);
  const folders = asStringArray(body.folders);

  if (!query && tags.length === 0) {
    return NextResponse.json<SearchErrorResponse>(
      {
        success: false,
        error: "Either 'query' or 'tags' must be provided",
      },
      { status: 400 },
    );
  }

  const tagMatchMode = body.tagMatchMode === "all" ? "all" : "any";

  const searchRequest: SearchRequest = {
    bot,
    query: query || undefined,
    tags,
    folders,
    maxResults: asNumber(body.maxResults, 5),
    maxTokens: asNumber(body.maxTokens, 2000),
    tagMatchMode,
  };

  try {
    const exists = await botExists(bot);
    if (!exists) {
      return NextResponse.json<SearchErrorResponse>(
        {
          success: false,
          error: `Bot "${bot}" not found`,
          availableBots: await listAvailableBots(),
        },
        { status: 404 },
      );
    }

    const chunks = await loadBotChunks(bot);
    const index = buildIndex(chunks);
    const response = search(index, searchRequest);
    return NextResponse.json(response);
  } catch (err) {
    const error = err as Error & { code?: string; availableBots?: string[] };
    console.error(`${LOG_PREFIX} Search failed for bot "${bot}":`, error);
    return NextResponse.json<SearchErrorResponse>(
      {
        success: false,
        error: "Search failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
