/**
 * Filesystem-based RAG types.
 *
 * The retrieval layer is a pure search tool: it does NOT call any model.
 * It loads markdown files with YAML frontmatter, indexes them with MiniSearch,
 * and returns ranked text fragments for ChangeAgent (Open WebUI) to consume.
 */

export type BotId = string

export interface KnowledgeFrontmatter {
  title?: string
  tags?: string[]
  "group-size"?: string | string[]
  archetype?: string | string[]
  difficulty?: string
  "content-type"?: string
  source?: string
  "last-updated"?: string
  [key: string]: unknown
}

export interface KnowledgeDoc {
  id: string
  bot: BotId
  path: string
  absolutePath: string
  folder: string
  title: string
  tags: string[]
  body: string
  frontmatter: KnowledgeFrontmatter
  mtimeMs: number
}

export interface KnowledgeChunk {
  id: string
  bot: BotId
  path: string
  absolutePath: string
  folder: string
  title: string
  tags: string[]
  heading: string | null
  anchor: string | null
  body: string
  frontmatter: KnowledgeFrontmatter
  mtimeMs: number
  ordinal: number
}

export interface SearchRequest {
  bot: BotId
  query?: string
  tags?: string[]
  folders?: string[]
  maxResults?: number
  maxTokens?: number
  tagMatchMode?: "any" | "all"
}

export interface SearchHit {
  path: string
  title: string
  heading?: string | null
  anchor?: string | null
  tags: string[]
  score: number
  matchedTags: string[]
  excerpt: string
  frontmatter: KnowledgeFrontmatter
}

export interface DerivedFilters {
  tags: string[]
  folders: string[]
  signals: Record<string, unknown>
}

export interface SearchMeta {
  totalCandidates: number
  filteredByTags: number
  filteredByFolders: number
  returned: number
  elapsedMs: number
  indexedDocs: number
  derived?: DerivedFilters
  note?: "no_matches" | "tag_only_match"
}

export interface SearchResponse {
  success: true
  bot: BotId
  query: string | null
  tags: string[]
  folders: string[]
  results: SearchHit[]
  contextBundle: string
  /**
   * Backwards-compatible alias of `contextBundle`.
   * Kept temporarily for older clients.
   */
  bundle?: string
  meta: SearchMeta
}

export interface SearchErrorResponse {
  success: false
  error: string
  details?: string
  availableBots?: BotId[]
}

export interface BotIndexStats {
  bot: BotId
  rootPath: string
  indexedDocs: number
  builtAt: number
  rootMtimeMs: number
  folders: string[]
  tagFrequency: Record<string, number>
}
