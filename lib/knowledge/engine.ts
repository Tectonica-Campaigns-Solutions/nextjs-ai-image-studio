import MiniSearch from "minisearch";
import type {
  KnowledgeDoc,
  SearchHit,
  SearchMeta,
  SearchRequest,
  SearchResponse,
} from "./types";

const LOG_PREFIX = "[knowledge/engine]";

const DEFAULT_MAX_RESULTS = 5;
const DEFAULT_MAX_TOKENS = 2000;
const TAG_BONUS = 0.5;
const EXCERPT_LENGTH = 280;
const APPROX_CHARS_PER_TOKEN = 4;

export interface BotIndex {
  ms: MiniSearch<KnowledgeDoc>;
  docsById: Map<string, KnowledgeDoc>;
  docs: KnowledgeDoc[];
}

export function buildIndex(docs: KnowledgeDoc[]): BotIndex {
  const ms = new MiniSearch<KnowledgeDoc>({
    idField: "id",
    fields: ["title", "tags", "body", "folder"],
    storeFields: ["id"],
    extractField: (doc, fieldName) => {
      const value = (doc as unknown as Record<string, unknown>)[fieldName];
      if (Array.isArray(value)) return value.join(" ");
      return value == null ? "" : String(value);
    },
    searchOptions: {
      boost: { title: 3, tags: 2, body: 1, folder: 1.5 },
      fuzzy: 0.2,
      prefix: true,
      combineWith: "OR",
    },
  });
  ms.addAll(docs);
  const docsById = new Map(docs.map((d) => [d.id, d]));
  return { ms, docsById, docs };
}

function applyTagFilter(
  docs: KnowledgeDoc[],
  tags: string[],
  mode: "any" | "all",
): KnowledgeDoc[] {
  if (tags.length === 0) return docs;
  const wanted = tags.map((t) => t.trim().toLowerCase()).filter(Boolean);
  if (wanted.length === 0) return docs;
  return docs.filter((doc) => {
    if (mode === "all") {
      return wanted.every((t) => doc.tags.includes(t));
    }
    return wanted.some((t) => doc.tags.includes(t));
  });
}

function applyFolderFilter(
  docs: KnowledgeDoc[],
  folders: string[],
): KnowledgeDoc[] {
  if (folders.length === 0) return docs;
  const prefixes = folders
    .map((f) => f.trim().replace(/^\/+|\/+$/g, ""))
    .filter(Boolean);
  if (prefixes.length === 0) return docs;
  return docs.filter((doc) => {
    const docPath = doc.path.replace(/\\/g, "/");
    return prefixes.some(
      (p) =>
        docPath === p ||
        docPath.startsWith(`${p}/`) ||
        doc.folder === p ||
        doc.folder.startsWith(`${p}/`),
    );
  });
}

function buildExcerpt(doc: KnowledgeDoc, query: string | null): string {
  const text = doc.body.replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (text.length <= EXCERPT_LENGTH) return text;

  if (query) {
    const lowered = text.toLowerCase();
    const terms = query
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 2);
    let bestIdx = -1;
    for (const term of terms) {
      const idx = lowered.indexOf(term);
      if (idx >= 0 && (bestIdx < 0 || idx < bestIdx)) bestIdx = idx;
    }
    if (bestIdx >= 0) {
      const start = Math.max(0, bestIdx - 80);
      const end = Math.min(text.length, start + EXCERPT_LENGTH);
      const prefix = start > 0 ? "…" : "";
      const suffix = end < text.length ? "…" : "";
      return `${prefix}${text.slice(start, end).trim()}${suffix}`;
    }
  }

  return `${text.slice(0, EXCERPT_LENGTH).trim()}…`;
}

function formatBundle(
  hits: Array<{ doc: KnowledgeDoc; score: number }>,
): string {
  if (hits.length === 0) return "";
  const sections = hits.map(({ doc }) => {
    const tagLine = doc.tags.length > 0 ? `_tags: ${doc.tags.join(", ")}_` : "";
    const header = `## ${doc.title}\n_source: ${doc.path}_${tagLine ? `\n${tagLine}` : ""}`;
    return `${header}\n\n${doc.body.trim()}`;
  });
  return sections.join("\n\n---\n\n");
}

function trimByTokenBudget(
  hits: Array<{ doc: KnowledgeDoc; score: number; matchedTags: string[] }>,
  maxTokens: number,
): Array<{ doc: KnowledgeDoc; score: number; matchedTags: string[] }> {
  if (maxTokens <= 0) return hits;
  const charBudget = maxTokens * APPROX_CHARS_PER_TOKEN;
  const out: typeof hits = [];
  let used = 0;
  for (const hit of hits) {
    const cost = hit.doc.body.length + hit.doc.title.length + 100;
    if (out.length === 0) {
      out.push(hit);
      used += cost;
      continue;
    }
    if (used + cost > charBudget) break;
    out.push(hit);
    used += cost;
  }
  return out;
}

export function search(
  index: BotIndex,
  request: SearchRequest,
): SearchResponse {
  const t0 = Date.now();
  const bot = request.bot;
  const query = (request.query ?? "").trim() || null;
  const tags = (request.tags ?? [])
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  const folders = (request.folders ?? []).map((f) => f.trim()).filter(Boolean);
  const maxResults = Math.max(
    1,
    Math.min(50, request.maxResults ?? DEFAULT_MAX_RESULTS),
  );
  const maxTokens = Math.max(0, request.maxTokens ?? DEFAULT_MAX_TOKENS);
  const tagMode = request.tagMatchMode ?? "any";

  const totalCandidates = index.docs.length;
  const folderFiltered = applyFolderFilter(index.docs, folders);
  const tagFiltered = applyTagFilter(folderFiltered, tags, tagMode);
  const allowedIds = new Set(tagFiltered.map((d) => d.id));

  type Scored = { doc: KnowledgeDoc; score: number; matchedTags: string[] };
  let scored: Scored[] = [];

  if (query) {
    const raw = index.ms.search(query, {
      filter: (result) => allowedIds.has(String(result.id)),
    });
    scored = raw
      .map((r) => {
        const doc = index.docsById.get(String(r.id));
        if (!doc) return null;
        const matchedTags = tags.filter((t) => doc.tags.includes(t));
        const bonus = matchedTags.length * TAG_BONUS;
        return { doc, score: r.score + bonus, matchedTags };
      })
      .filter((x): x is Scored => x !== null);
  } else {
    scored = tagFiltered.map((doc) => {
      const matchedTags = tags.filter((t) => doc.tags.includes(t));
      return { doc, score: matchedTags.length * TAG_BONUS, matchedTags };
    });
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.doc.path.localeCompare(b.doc.path);
  });

  const topByCount = scored.slice(0, maxResults);
  const topByBudget = trimByTokenBudget(topByCount, maxTokens);

  const results: SearchHit[] = topByBudget.map(
    ({ doc, score, matchedTags }) => ({
      path: doc.path,
      title: doc.title,
      tags: doc.tags,
      score: Number(score.toFixed(3)),
      matchedTags,
      excerpt: buildExcerpt(doc, query),
      frontmatter: doc.frontmatter,
    }),
  );

  const bundle = formatBundle(topByBudget);
  const elapsedMs = Date.now() - t0;

  let note: SearchMeta["note"] | undefined;
  if (results.length === 0) {
    note = "no_matches";
  } else if (!query && tags.length > 0) {
    note = "tag_only_match";
  }

  const meta: SearchMeta = {
    totalCandidates,
    filteredByFolders: folderFiltered.length,
    filteredByTags: tagFiltered.length,
    returned: results.length,
    elapsedMs,
    indexedDocs: index.docs.length,
    ...(note ? { note } : {}),
  };

  console.log(
    `${LOG_PREFIX} kb_search`,
    JSON.stringify({
      event: "kb_search",
      bot,
      query,
      tags,
      folders,
      tagMode,
      candidates: totalCandidates,
      filteredByFolders: meta.filteredByFolders,
      filteredByTags: meta.filteredByTags,
      returned: meta.returned,
      returnedPaths: results.map((r) => r.path),
      elapsedMs,
    }),
  );

  return {
    success: true,
    bot,
    query,
    tags,
    folders,
    results,
    bundle,
    meta,
  };
}
