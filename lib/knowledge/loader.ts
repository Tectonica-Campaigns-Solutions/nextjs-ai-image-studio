import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";
import type {
  BotId,
  KnowledgeChunk,
  KnowledgeDoc,
  KnowledgeFrontmatter,
} from "./types";

const LOG_PREFIX = "[knowledge/loader]";

const KNOWLEDGE_ROOT_DIRNAME = "knowledge";
const MARKDOWN_EXTENSIONS = new Set([".md", ".markdown"]);

export function getKnowledgeRoot(): string {
  return path.join(process.cwd(), KNOWLEDGE_ROOT_DIRNAME);
}

export function getBotRoot(bot: BotId): string {
  return path.join(getKnowledgeRoot(), bot);
}

export async function botExists(bot: BotId): Promise<boolean> {
  try {
    const stats = await fs.stat(getBotRoot(bot));
    return stats.isDirectory();
  } catch {
    return false;
  }
}

export async function listAvailableBots(): Promise<BotId[]> {
  try {
    const entries = await fs.readdir(getKnowledgeRoot(), {
      withFileTypes: true,
    });
    return entries
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
      .map((entry) => entry.name)
      .sort();
  } catch (err) {
    console.warn(`${LOG_PREFIX} Could not list bots:`, err);
    return [];
  }
}

async function walkDir(
  dir: string,
  rootDir: string,
  acc: string[] = [],
): Promise<string[]> {
  let entries: import("fs").Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (err) {
    console.warn(`${LOG_PREFIX} Cannot read directory ${dir}:`, err);
    return acc;
  }

  for (const entry of entries) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkDir(fullPath, rootDir, acc);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (MARKDOWN_EXTENSIONS.has(ext)) {
        acc.push(fullPath);
      }
    }
  }
  return acc;
}

function normalizeTags(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .filter(
        (v): v is string | number =>
          typeof v === "string" || typeof v === "number",
      )
      .map((v) => String(v).trim().toLowerCase())
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
  }
  return [];
}

function normalizeTagValue(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return normalizeTags(value);
  if (typeof value === "string") return normalizeTags(value);
  if (typeof value === "number") return [String(value)];
  return [];
}

function collectFrontmatterTags(frontmatter: KnowledgeFrontmatter): string[] {
  const tags = new Set<string>();

  // Primary tags array.
  for (const t of normalizeTags(frontmatter.tags)) tags.add(t);

  // Common single-value fields that behave like facets.
  const facetKeys = [
    "tactic",
    "content-type",
    "context",
    "viability",
    "tier",
    "group-mode",
    "difficulty",
    "source",
  ];
  for (const key of facetKeys) {
    const v = (frontmatter as Record<string, unknown>)[key];
    for (const t of normalizeTagValue(v)) tags.add(t);
  }

  // Multi-valued facets.
  for (const t of normalizeTagValue(frontmatter["group-size"])) tags.add(t);
  for (const t of normalizeTagValue(frontmatter.archetype)) tags.add(t);

  // Often comma-separated.
  for (const t of normalizeTagValue((frontmatter as Record<string, unknown>)["brief-section"]))
    tags.add(t);

  return Array.from(tags).filter(Boolean);
}

function deriveTitleFromFilename(filePath: string): string {
  const base = path.basename(filePath, path.extname(filePath));
  return base
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function deriveFolder(relativePath: string): string {
  const dir = path.dirname(relativePath);
  if (dir === "." || dir === "") return "";
  return dir.split(path.sep).join("/");
}

async function parseDoc(
  bot: BotId,
  botRoot: string,
  absolutePath: string,
): Promise<KnowledgeDoc | null> {
  let raw: string;
  let mtimeMs: number;
  try {
    raw = await fs.readFile(absolutePath, "utf-8");
    const stats = await fs.stat(absolutePath);
    mtimeMs = stats.mtimeMs;
  } catch (err) {
    console.warn(`${LOG_PREFIX} Failed to read ${absolutePath}:`, err);
    return null;
  }

  let parsed: ReturnType<typeof matter>;
  try {
    parsed = matter(raw);
  } catch (err) {
    console.warn(
      `${LOG_PREFIX} Malformed frontmatter in ${absolutePath} — indexing with defaults:`,
      err,
    );
    parsed = matter("") as unknown as ReturnType<typeof matter>;
    parsed.content = raw;
    parsed.data = {};
  }

  const frontmatter = (parsed.data || {}) as KnowledgeFrontmatter;
  const body = (parsed.content || "").trim();
  const relativePath = path
    .relative(botRoot, absolutePath)
    .split(path.sep)
    .join("/");
  const tags = collectFrontmatterTags(frontmatter);
  const title =
    typeof frontmatter.title === "string" && frontmatter.title.trim().length > 0
      ? frontmatter.title.trim()
      : deriveTitleFromFilename(absolutePath);

  return {
    id: `${bot}::${relativePath}`,
    bot,
    path: relativePath,
    absolutePath,
    folder: deriveFolder(relativePath),
    title,
    tags,
    body,
    frontmatter,
    mtimeMs,
  };
}

function slugifyAnchor(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function chunkMarkdown(doc: KnowledgeDoc): KnowledgeChunk[] {
  const lines = doc.body.split(/\r?\n/);

  type Heading = { level: number; text: string; lineIndex: number };
  const headings: Heading[] = [];

  for (let i = 0; i < lines.length; i++) {
    const m = /^(#{1,6})\s+(.+?)\s*$/.exec(lines[i] ?? "");
    if (!m) continue;
    const level = m[1].length;
    const text = m[2].trim();
    if (!text) continue;
    headings.push({ level, text, lineIndex: i });
  }

  // If there are no headings, treat the whole doc as a single chunk.
  if (headings.length === 0) {
    return [
      {
        id: `${doc.id}::chunk:0`,
        bot: doc.bot,
        path: doc.path,
        absolutePath: doc.absolutePath,
        folder: doc.folder,
        title: doc.title,
        tags: doc.tags,
        heading: null,
        anchor: null,
        body: doc.body.trim(),
        frontmatter: doc.frontmatter,
        mtimeMs: doc.mtimeMs,
        ordinal: 0,
      },
    ];
  }

  const chunks: KnowledgeChunk[] = [];
  let ordinal = 0;

  for (let h = 0; h < headings.length; h++) {
    const current = headings[h];
    const next = headings[h + 1];

    // Prefer chunks starting at level >=2; but if the doc only has level 1,
    // we still chunk on it.
    const start = current.lineIndex;
    const end = next ? next.lineIndex : lines.length;

    const headingLine = lines[start] ?? "";
    const sectionBody = lines.slice(start + 1, end).join("\n").trim();

    // Skip headings that have no content under them.
    if (!sectionBody) continue;

    const anchor = slugifyAnchor(current.text) || null;
    chunks.push({
      id: `${doc.id}::chunk:${ordinal}`,
      bot: doc.bot,
      path: doc.path,
      absolutePath: doc.absolutePath,
      folder: doc.folder,
      title: doc.title,
      tags: doc.tags,
      heading: current.text,
      anchor,
      body: `${headingLine}\n\n${sectionBody}`.trim(),
      frontmatter: doc.frontmatter,
      mtimeMs: doc.mtimeMs,
      ordinal,
    });
    ordinal++;
  }

  // If we skipped everything (e.g., headings but empty sections), fall back.
  if (chunks.length === 0) {
    return [
      {
        id: `${doc.id}::chunk:0`,
        bot: doc.bot,
        path: doc.path,
        absolutePath: doc.absolutePath,
        folder: doc.folder,
        title: doc.title,
        tags: doc.tags,
        heading: null,
        anchor: null,
        body: doc.body.trim(),
        frontmatter: doc.frontmatter,
        mtimeMs: doc.mtimeMs,
        ordinal: 0,
      },
    ];
  }

  return chunks;
}

export async function loadBotDocs(bot: BotId): Promise<KnowledgeDoc[]> {
  const botRoot = getBotRoot(bot);
  const exists = await botExists(bot);
  if (!exists) {
    throw new Error(`Bot "${bot}" not found at ${botRoot}`);
  }
  const files = await walkDir(botRoot, botRoot);
  const docs: KnowledgeDoc[] = [];
  for (const file of files) {
    const doc = await parseDoc(bot, botRoot, file);
    if (doc) docs.push(doc);
  }
  console.log(
    `${LOG_PREFIX} Loaded ${docs.length} docs for bot "${bot}" from ${botRoot}`,
  );
  return docs;
}

export async function loadBotChunks(bot: BotId): Promise<KnowledgeChunk[]> {
  const docs = await loadBotDocs(bot);
  const chunks: KnowledgeChunk[] = [];
  for (const doc of docs) {
    chunks.push(...chunkMarkdown(doc));
  }
  console.log(
    `${LOG_PREFIX} Built ${chunks.length} chunks for bot "${bot}" from ${docs.length} docs`,
  );
  return chunks;
}

export async function getRootMtimeMs(bot: BotId): Promise<number> {
  const botRoot = getBotRoot(bot);
  let maxMtime = 0;

  async function visit(dir: string): Promise<void> {
    let stats: import("fs").Stats;
    try {
      stats = await fs.stat(dir);
    } catch {
      return;
    }
    if (stats.mtimeMs > maxMtime) maxMtime = stats.mtimeMs;
    if (!stats.isDirectory()) return;
    let entries: import("fs").Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
      await visit(path.join(dir, entry.name));
    }
  }

  await visit(botRoot);
  return maxMtime;
}
