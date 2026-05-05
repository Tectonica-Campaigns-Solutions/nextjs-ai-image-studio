import MiniSearch from "minisearch";
import type {
  DerivedFilters,
  KnowledgeChunk,
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
  ms: MiniSearch<KnowledgeChunk>;
  docsById: Map<string, KnowledgeChunk>;
  docs: KnowledgeChunk[];
  tagCatalog: Set<string>;
  folderCatalog: Set<string>;
}

export function buildIndex(docs: KnowledgeChunk[]): BotIndex {
  const ms = new MiniSearch<KnowledgeChunk>({
    idField: "id",
    fields: ["title", "tags", "heading", "body", "folder"],
    storeFields: ["id"],
    extractField: (doc, fieldName) => {
      const value = (doc as unknown as Record<string, unknown>)[fieldName];
      if (Array.isArray(value)) return value.join(" ");
      return value == null ? "" : String(value);
    },
    searchOptions: {
      boost: { heading: 3, title: 2.5, tags: 2, body: 1, folder: 1.5 },
      fuzzy: 0.2,
      prefix: true,
      combineWith: "OR",
    },
  });
  ms.addAll(docs);
  const docsById = new Map(docs.map((d) => [d.id, d]));
  const tagCatalog = new Set<string>();
  const folderCatalog = new Set<string>();
  for (const d of docs) {
    for (const t of d.tags) tagCatalog.add(t);
    if (d.folder) folderCatalog.add(d.folder);
  }
  return { ms, docsById, docs, tagCatalog, folderCatalog };
}

function applyTagFilter(
  docs: KnowledgeChunk[],
  tags: string[],
  mode: "any" | "all",
): KnowledgeChunk[] {
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
  docs: KnowledgeChunk[],
  folders: string[],
): KnowledgeChunk[] {
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

function buildExcerpt(doc: KnowledgeChunk, query: string | null): string {
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

function tokenizeQuery(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9\p{L}\p{N}]+/u)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3);
}

function inferFromQuery(index: BotIndex, query: string): DerivedFilters {
  const q = query.toLowerCase();
  const tokens = tokenizeQuery(query);

  // Alias patterns for common tactic names and concepts.
  const aliasPatterns: Array<{ pattern: RegExp; tag: string; folders?: string[] }> = [
    { pattern: /\b(p2p|peer[-\s]?to[-\s]?peer)\b/i, tag: "peer-to-peer", folders: ["tactics/peer-to-peer"] },
    { pattern: /\bcall\s*bank(ing)?\b|\bphone\s*bank(ing)?\b/i, tag: "call-banking", folders: ["tactics/call-banking"] },
    { pattern: /\bwhatsapp\b|\bsms\b|\btext\b/i, tag: "sms-whatsapp", folders: ["tactics/sms-whatsapp"] },
    { pattern: /\bcrowdfund(ing)?\b/i, tag: "crowdfunding", folders: ["tactics/crowdfunding"] },
    { pattern: /\bgiving\s*day(s)?\b/i, tag: "giving-days", folders: ["tactics/giving-days"] },
    { pattern: /\bgala\b|\bdinner\s*fundraiser\b/i, tag: "gala", folders: ["tactics/gala"] },
    { pattern: /\braffle(s)?\b/i, tag: "raffle", folders: ["tactics/raffle"] },
    { pattern: /\bsweepstakes\b/i, tag: "sweepstakes", folders: ["tactics/sweepstakes"] },
    { pattern: /\bmatching\s*gift\b|\bdonor\s*match\b|\bmatch\s*campaign\b/i, tag: "matching", folders: ["tactics/matching-sub-a", "tactics/matching-sub-b"] },
    { pattern: /\btribute\b|\bmemorial\b/i, tag: "tribute", folders: ["tactics/tribute-memorial", "tactics/tribute-occasion"] },
    { pattern: /\bsocial\s*media\b/i, tag: "social-media", folders: ["tactics/social-media"] },
    { pattern: /\bemail\b|\bemail\s*appeal(s)?\b/i, tag: "email-appeals", folders: ["tactics/email-appeals"] },
    { pattern: /\bhouse\s*party\b|\bsalon\b/i, tag: "house-parties", folders: ["tactics/house-parties"] },
    { pattern: /\bin[-\s]?person\b|\bone[-\s]?on[-\s]?one\b/i, tag: "in-person-ask", folders: ["tactics/in-person-ask"] },
    { pattern: /\bwalk\b|\brun\b|\bride[-\s]?a[-\s]?thon\b|\bwalk[-\s]?a[-\s]?thon\b/i, tag: "walk-a-thon", folders: ["tactics/walk-a-thon"] },
    { pattern: /\bmerch\b|\bmerchandise\b|\bproduct\s*sales\b/i, tag: "merchandise", folders: ["tactics/merchandise"] },
    { pattern: /\blocal\s*business\b|\bpartnership\b/i, tag: "local-business", folders: ["tactics/local-business"] },
    { pattern: /\bcommunity\s*event(s)?\b/i, tag: "community-events", folders: ["tactics/community-events"] },
  ];

  const derivedTags = new Set<string>();
  const derivedFolders = new Set<string>();
  const signals: Record<string, unknown> = {};

  for (const a of aliasPatterns) {
    if (a.pattern.test(q)) {
      derivedTags.add(a.tag);
      for (const f of a.folders ?? []) derivedFolders.add(f);
    }
  }

  // If the query literally contains any known tag, pick it up.
  for (const tag of index.tagCatalog) {
    if (tag.length < 3) continue;
    if (q.includes(tag)) derivedTags.add(tag);
  }

  // Infer common archetype tags if present in catalog.
  const archetypeHints: Array<{ pattern: RegExp; tag: string }> = [
    { pattern: /\bfirst[-\s]?time(r)?\b|\bno\s*experience\b/i, tag: "first-timer" },
    { pattern: /\bexperienced\b|\bseasoned\b/i, tag: "experienced-leader" },
    { pattern: /\bfear\s+of\s+asking\b|\bnervous\b|\banxious\b/i, tag: "fear-of-asking" },
  ];
  for (const hint of archetypeHints) {
    if (hint.pattern.test(q) && index.tagCatalog.has(hint.tag)) {
      derivedTags.add(hint.tag);
    }
  }

  // Capture simple numeric signals for observability (not used for filtering yet).
  const weeks = /\b(\d+)\s*week(s)?\b/i.exec(query);
  if (weeks) signals.leadTimeWeeks = Number(weeks[1]);
  const dollars = /\$?\b(\d+(?:,\d{3})*|\d+)\s*(k|K)?\b/.exec(query);
  if (dollars) {
    const raw = Number(String(dollars[1]).replace(/,/g, ""));
    const mult = dollars[2] ? 1000 : 1;
    const amt = raw * mult;
    if (Number.isFinite(amt) && amt >= 100) signals.targetAmount = amt;
  }

  // If we derived folders that do not exist in the current knowledge tree, drop them.
  const normalizedFolders = Array.from(derivedFolders).filter((f) => {
    // Any doc in that subtree?
    return index.docs.some((d) => d.folder === f || d.folder.startsWith(`${f}/`) || d.path.startsWith(`${f}/`));
  });

  // Limit to keep retrieval flexible.
  const stopDerivedTags = new Set([
    "all",
    "both",
    "tactic",
    "language",
    "framework",
    "rule",
    "rules",
    "group",
    "solo",
  ]);
  const tagsOut = Array.from(derivedTags)
    .filter((t) => !stopDerivedTags.has(t))
    .slice(0, 8);
  const foldersOut = normalizedFolders.slice(0, 5);

  // Also add token matches (word overlaps) as weak tag hints if they exist in catalog.
  for (const tok of tokens) {
    if (index.tagCatalog.has(tok)) derivedTags.add(tok);
  }

  return {
    tags: tagsOut,
    folders: foldersOut,
    signals,
  };
}

function formatBundle(
  hits: Array<{ doc: KnowledgeChunk; score: number }>,
): string {
  if (hits.length === 0) return "";
  const sections = hits.map(({ doc }) => {
    const tagLine = doc.tags.length > 0 ? `_tags: ${doc.tags.join(", ")}_` : "";
    const sectionLabel =
      doc.heading && doc.heading.trim().length > 0
        ? `${doc.title} → ${doc.heading}`
        : doc.title;
    const sourceAnchor = doc.anchor ? `${doc.path}#${doc.anchor}` : doc.path;
    const header = `## ${sectionLabel}\n_source: ${sourceAnchor}_${tagLine ? `\n${tagLine}` : ""}`;
    return `${header}\n\n${doc.body.trim()}`;
  });
  return sections.join("\n\n---\n\n");
}

function trimByTokenBudget(
  hits: Array<{ doc: KnowledgeChunk; score: number; matchedTags: string[] }>,
  maxTokens: number,
): Array<{ doc: KnowledgeChunk; score: number; matchedTags: string[] }> {
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
  const explicitTags = (request.tags ?? [])
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  const explicitFolders = (request.folders ?? [])
    .map((f) => f.trim())
    .filter(Boolean);
  const maxResults = Math.max(
    1,
    Math.min(50, request.maxResults ?? DEFAULT_MAX_RESULTS),
  );
  const maxTokens = Math.max(0, request.maxTokens ?? DEFAULT_MAX_TOKENS);
  const tagMode = request.tagMatchMode ?? "any";

  const derived =
    query && explicitTags.length === 0 && explicitFolders.length === 0
      ? inferFromQuery(index, query)
      : ({ tags: [], folders: [], signals: {} } as DerivedFilters);

  const tags = explicitTags.length > 0 ? explicitTags : derived.tags;
  const folders = explicitFolders.length > 0 ? explicitFolders : derived.folders;

  const totalCandidates = index.docs.length;
  const folderFiltered = applyFolderFilter(index.docs, folders);
  const tagFiltered = applyTagFilter(folderFiltered, tags, tagMode);
  const allowedIds = new Set(tagFiltered.map((d) => d.id));

  type Scored = { doc: KnowledgeChunk; score: number; matchedTags: string[] };
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

  // Limit chunks per file for diversity.
  const perPathCount = new Map<string, number>();
  const diverse: Scored[] = [];
  for (const s of scored) {
    const c = perPathCount.get(s.doc.path) ?? 0;
    if (c >= 2) continue;
    perPathCount.set(s.doc.path, c + 1);
    diverse.push(s);
    if (diverse.length >= maxResults) break;
  }

  const topByCount = diverse;
  const topByBudget = trimByTokenBudget(topByCount, maxTokens);

  const results: SearchHit[] = topByBudget.map(
    ({ doc, score, matchedTags }) => ({
      path: doc.path,
      title: doc.title,
      heading: doc.heading,
      anchor: doc.anchor,
      tags: doc.tags,
      score: Number(score.toFixed(3)),
      matchedTags,
      excerpt: buildExcerpt(doc, query),
      frontmatter: doc.frontmatter,
    }),
  );

  const contextBundle = formatBundle(topByBudget);
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
    ...(query && (derived.tags.length > 0 || derived.folders.length > 0)
      ? { derived }
      : {}),
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
      derived: meta.derived ?? null,
    }),
  );

  return {
    success: true,
    bot,
    query,
    tags,
    folders,
    results,
    contextBundle,
    bundle: contextBundle,
    meta,
  };
}
