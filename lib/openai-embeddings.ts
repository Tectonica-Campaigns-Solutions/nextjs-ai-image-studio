import OpenAI from 'openai';
import { createHash } from 'crypto';
import { readFile, writeFile, access } from 'fs/promises';
import { join } from 'path';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Cache configuration
const EMBEDDINGS_CACHE_DIR = join(process.cwd(), 'data', 'rag');
const OPENAI_CACHE_FILE = join(EMBEDDINGS_CACHE_DIR, 'openai-embeddings-cache.json');

interface EmbeddingCacheEntry {
  prompt: string;
  embedding: number[];
  hash: string;
  timestamp: string;
  model: string;
  dimensions: number;
}

interface EmbeddingCache {
  [hash: string]: EmbeddingCacheEntry;
}

// Create hash for prompt to use as cache key
function createPromptHash(prompt: string): string {
  return createHash('sha256').update(prompt.trim().toLowerCase()).digest('hex');
}

// Check if file exists
async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

// Load embeddings cache
async function loadEmbeddingsCache(): Promise<EmbeddingCache> {
  try {
    if (await fileExists(OPENAI_CACHE_FILE)) {
      const cacheData = await readFile(OPENAI_CACHE_FILE, 'utf-8');
      return JSON.parse(cacheData);
    }
  } catch (error) {
    console.warn('[OpenAI Embeddings] Error loading cache:', error);
  }
  return {};
}

// Save embeddings cache
async function saveEmbeddingsCache(cache: EmbeddingCache): Promise<void> {
  try {
    await writeFile(OPENAI_CACHE_FILE, JSON.stringify(cache, null, 2));
  } catch (error) {
    console.error('[OpenAI Embeddings] Error saving cache:', error);
  }
}

// Get embedding for a text using OpenAI API with caching
export async function getOpenAIEmbedding(text: string): Promise<number[] | null> {
  const promptHash = createPromptHash(text);
  
  try {
    // Check cache first
    const cache = await loadEmbeddingsCache();
    
    if (cache[promptHash]) {
      console.log('[OpenAI Embeddings] Using cached embedding for prompt');
      return cache[promptHash].embedding;
    }

    // Call OpenAI API
    console.log('[OpenAI Embeddings] Generating new embedding via API');
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
      encoding_format: 'float',
    });

    const embedding = response.data[0].embedding;

    // Cache the result
    const cacheEntry: EmbeddingCacheEntry = {
      prompt: text,
      embedding,
      hash: promptHash,
      timestamp: new Date().toISOString(),
      model: 'text-embedding-3-small',
      dimensions: embedding.length,
    };

    cache[promptHash] = cacheEntry;
    await saveEmbeddingsCache(cache);

    console.log(`[OpenAI Embeddings] Generated and cached embedding with ${embedding.length} dimensions`);
    return embedding;

  } catch (error) {
    console.error('[OpenAI Embeddings] Error generating embedding:', error);
    
    // Check if it's a quota/billing error
    if (error instanceof Error && error.message.includes('429')) {
      console.warn('[OpenAI Embeddings] Quota exceeded - API credits may be exhausted');
      console.log('[OpenAI Embeddings] Please check your OpenAI billing at: https://platform.openai.com/account/billing');
    }
    
    return null;
  }
}

// Calculate cosine similarity between two embeddings
export function calculateCosineSimilarity(embedding1: number[], embedding2: number[]): number {
  if (embedding1.length !== embedding2.length) {
    throw new Error('Embeddings must have the same dimensions');
  }

  const dotProduct = embedding1.reduce((sum, a, i) => sum + a * embedding2[i], 0);
  const magnitude1 = Math.sqrt(embedding1.reduce((sum, a) => sum + a * a, 0));
  const magnitude2 = Math.sqrt(embedding2.reduce((sum, b) => sum + b * b, 0));
  
  return dotProduct / (magnitude1 * magnitude2);
}

// Batch process embeddings for ACLU categories
export async function generateACLUCategoryEmbeddings(): Promise<{ [category: string]: number[] }> {
  const aclucategories = {
    brand_essence: "civil rights, social justice, equality, freedom, democracy, human rights, advocacy, protection of liberties",
    photography_style: "documentary photography, photojournalism, candid shots, authentic moments, natural lighting, professional portraits",
    color_primary: "ACLU red, deep blue, black and white, high contrast, bold colors, patriotic colors",
    color_secondary: "warm tones, natural skin tones, diverse representation, authentic colors",
    composition: "centered subjects, rule of thirds, protest photography, rally documentation, portrait composition",
    lighting: "natural lighting, dramatic lighting, high contrast, documentary style lighting, authentic illumination",
    mood_emotion: "empowerment, determination, hope, justice, dignity, strength, solidarity, community",
    visual_elements: "text overlays, ACLU logo, banners, signs, demonstrations, diverse people, activism"
  };

  const categoryEmbeddings: { [category: string]: number[] } = {};

  for (const [category, description] of Object.entries(aclucategories)) {
    console.log(`[OpenAI Embeddings] Generating embedding for category: ${category}`);
    const embedding = await getOpenAIEmbedding(description);
    if (embedding) {
      categoryEmbeddings[category] = embedding;
    }
  }

  return categoryEmbeddings;
}
