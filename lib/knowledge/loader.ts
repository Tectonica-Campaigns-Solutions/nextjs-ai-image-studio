import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";
import type { BotId, KnowledgeDoc, KnowledgeFrontmatter } from "./types";

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
  const tags = normalizeTags(frontmatter.tags);
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
