import { readFile, writeFile, access } from 'fs/promises';
import { join } from 'path';

// Platform environment detection
function isVercelEnvironment() {
  return !!(process.env.VERCEL || process.env.VERCEL_ENV)
}

function isRailwayEnvironment() {
  return !!(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_ENVIRONMENT_NAME)
}

function shouldUseFullRAG() {
  // Use full RAG on Railway and local development, simple RAG only on Vercel
  return !isVercelEnvironment()
}

function shouldUseOpenAIEmbeddings() {
  // Use OpenAI embeddings when API key is available and not in Vercel
  return !!(process.env.OPENAI_API_KEY && shouldUseFullRAG())
}

// Conditional import for transformers - only in non-Vercel environments
let pipeline: any = null;
let isTransformersAvailable = false;

// Initialize pipeline conditionally
async function initPipeline() {
  if (isVercelEnvironment()) {
    console.log('[RAG] Skipping transformers in Vercel environment');
    return null;
  }
  
  try {
    const transformers = await import('@xenova/transformers');
    pipeline = transformers.pipeline;
    isTransformersAvailable = true;
    console.log(`[RAG] Transformers loaded successfully in ${isRailwayEnvironment() ? 'Railway' : 'local'} environment`);
    return pipeline;
  } catch (error) {
    console.warn('[RAG] Failed to load transformers:', error);
    isTransformersAvailable = false;
    return null;
  }
}

// Cache for embeddings and pipeline
let embeddingPipeline: any = null;
let ragCache: {
  embeddings: any;
  metadata: any;
  lastLoaded: number;
  ragId?: string;
  ragName?: string;
} | null = null;

// File paths for persistent storage
const RAG_DATA_PATH = join(process.cwd(), 'data', 'rag');
const EMBEDDINGS_CACHE_PATH = join(RAG_DATA_PATH, 'embeddings-cache.json');
const METADATA_PATH = join(RAG_DATA_PATH, 'rag-metadata.json');

// Check if file exists
async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

// Load RAG data from persistent storage
async function loadRAGData(ragId?: string) {
  try {
    // Check if we have cached data that's still fresh (less than 1 hour old)
    if (ragCache && ragCache.ragId === ragId && (Date.now() - ragCache.lastLoaded) < 3600000) {
      console.log(`[RAG] Using cached RAG data for: ${ragId || 'default'}`);
      return ragCache;
    }

    console.log(`[RAG] Loading RAG data for: ${ragId || 'default'}`);
    
    // Try to load specific RAG content first
    let ragContent = null;
    if (ragId) {
      // Try to load specific RAG file from the store
      try {
        // First check if we have a specific file for this RAG
        const ragSpecificPath = join(RAG_DATA_PATH, `${ragId}.json`);
        if (await fileExists(ragSpecificPath)) {
          ragContent = JSON.parse(await readFile(ragSpecificPath, 'utf-8'));
          console.log(`[RAG] Loaded specific RAG content from: ${ragSpecificPath}`);
        }
      } catch (error) {
        console.log(`[RAG] No specific file found for RAG ${ragId}, trying alternative paths`);
      }
    }
    
    // If no specific RAG content found, load default embeddings
    if (!ragContent) {
      console.log('[RAG] Loading default RAG data from persistent storage...');
      
      // Load embeddings cache
      const embeddingsExist = await fileExists(EMBEDDINGS_CACHE_PATH);
      const metadataExist = await fileExists(METADATA_PATH);
      
      if (!embeddingsExist || !metadataExist) {
        console.warn('[RAG] RAG data files not found in persistent storage');
        return null;
      }

      const embeddingsData = JSON.parse(await readFile(EMBEDDINGS_CACHE_PATH, 'utf-8'));
      const metadataData = JSON.parse(await readFile(METADATA_PATH, 'utf-8'));

      ragCache = {
        embeddings: embeddingsData,
        metadata: metadataData,
        ragId: ragId || 'default',
        lastLoaded: Date.now()
      };
    } else {
      // Use specific RAG content
      ragCache = {
        embeddings: ragContent.embeddings || {},
        metadata: ragContent.metadata || ragContent,
        ragId: ragId || 'default',
        ragName: ragContent.name,
        lastLoaded: Date.now()
      };
    }

    console.log(`[RAG] Loaded ${Object.keys(ragCache.embeddings?.embeddings || ragCache.embeddings || {}).length} embeddings from cache`);
    return ragCache;

  } catch (error) {
    console.error('[RAG] Error loading RAG data:', error);
    return null;
  }
}

// Calculate embeddings for RAG data
async function calculateEmbeddings() {
  if (!shouldUseFullRAG()) {
    console.log('[RAG] Skipping embedding calculation in Vercel');
    return false;
  }

  try {
    console.log('[RAG] Calculating embeddings...');
    
    if (!embeddingPipeline) {
      const pipelineFactory = await initPipeline();
      if (!pipelineFactory) {
        console.warn('[RAG] No embedding pipeline available');
        isTransformersAvailable = false;
        return false;
      }
      
      try {
        embeddingPipeline = await pipelineFactory('feature-extraction', 'sentence-transformers/all-MiniLM-L6-v2');
      } catch (modelError) {
        console.warn('[RAG] Failed to load embedding model, will use keyword fallback:', modelError);
        isTransformersAvailable = false;
        return false;
      }
    }

    const ragData = await loadRAGData();
    if (!ragData) {
      console.warn('[RAG] No RAG data to process');
      return false;
    }

    let hasNewEmbeddings = false;

    // Calculate embeddings for each entry that doesn't have them
    for (const [key, entry] of Object.entries(ragData.embeddings.embeddings)) {
      const embeddingEntry = entry as any;
      if (!embeddingEntry.embedding) {
        console.log(`[RAG] Calculating embedding for: ${key}`);
        const embedding = await embeddingPipeline(embeddingEntry.text);
        embeddingEntry.embedding = Array.from(embedding.data);
        hasNewEmbeddings = true;
      }
    }

    // Save updated embeddings if we calculated new ones
    if (hasNewEmbeddings) {
      await writeFile(EMBEDDINGS_CACHE_PATH, JSON.stringify(ragData.embeddings, null, 2));
      console.log('[RAG] Saved updated embeddings to cache');
      
      // Update our cache
      ragCache = {
        ...ragData,
        lastLoaded: Date.now()
      };
    }

    return true;

  } catch (error) {
    console.error('[RAG] Error calculating embeddings:', error);
    return false;
  }
}

// Calculate cosine similarity between two vectors
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

// Find similar embeddings for a given prompt
async function findSimilarEmbeddings(prompt: string, threshold: number = 0.75) {
  // Priority 1: Use OpenAI embeddings for maximum precision
  if (shouldUseOpenAIEmbeddings()) {
    return await findSimilarEmbeddingsWithOpenAI(prompt, threshold);
  }
  
  // Priority 2: Use transformers if available (legacy support)
  if (shouldUseFullRAG() && isTransformersAvailable) {
    console.log('[RAG] Using transformers embeddings (fallback)');
    return await findSimilarEmbeddingsWithTransformers(prompt, threshold);
  }
  
  // Priority 3: Use keyword matching as final fallback
  console.log('[RAG] Using simple keyword matching (final fallback)');
  return findKeywordMatches(prompt);
}

// OpenAI embeddings implementation (primary method)
async function findSimilarEmbeddingsWithOpenAI(prompt: string, threshold: number = 0.75) {
  try {
    console.log('[RAG] Using OpenAI embeddings for maximum precision');
    
    // Dynamic import to avoid build-time issues
    const { getOpenAIEmbedding, calculateCosineSimilarity, generateEGPCategoryEmbeddings } = await import('./openai-embeddings');
    
    // Generate embedding for the input prompt
    const promptEmbedding = await getOpenAIEmbedding(prompt);
    if (!promptEmbedding) {
      console.warn('[RAG] Failed to generate OpenAI embedding, falling back');
      return findKeywordMatches(prompt);
    }

    // Generate or load EGP category embeddings
    const categoryEmbeddings = await generateEGPCategoryEmbeddings();
    
    const similarities: Array<{
      key: string;
      entry: any;
      similarity: number;
    }> = [];

    // Compare with each category
    for (const [category, categoryEmbedding] of Object.entries(categoryEmbeddings)) {
      const similarity = calculateCosineSimilarity(promptEmbedding, categoryEmbedding);
      
      if (similarity >= threshold) {
        similarities.push({
          key: category,
          entry: {
            keywords: getCategoryKeywords(category),
            weight: getCategoryWeight(category)
          },
          similarity
        });
      }
    }

    // Sort by similarity (highest first)
    similarities.sort((a, b) => b.similarity - a.similarity);
    
    console.log(`[RAG] Found ${similarities.length} similar categories using OpenAI embeddings`);
    return similarities;

  } catch (error) {
    console.error('[RAG] Error with OpenAI embeddings:', error);
    return findKeywordMatches(prompt);
  }
}

// Helper functions for EGP categories
function getCategoryKeywords(category: string): string[] {
  const categoryKeywords: { [key: string]: string[] } = {
    brand_essence: ["civil rights", "social justice", "equality", "freedom", "democracy", "human rights", "advocacy", "protection"],
    photography_style: ["documentary", "photojournalism", "candid", "authentic", "natural lighting", "professional", "portrait"],
    color_primary: ["EGP green", "yellow", "pink", "vibrant colors", "sustainable colors", "nature-inspired"],
    color_secondary: ["warm tones", "natural", "diverse", "authentic", "skin tones"],
    composition: ["centered", "rule of thirds", "protest", "rally", "portrait composition", "demonstration"],
    lighting: ["natural lighting", "dramatic", "high contrast", "documentary style", "authentic"],
    mood_emotion: ["empowerment", "determination", "hope", "justice", "dignity", "strength", "solidarity", "community"],
    visual_elements: ["community", "EGP branding", "green elements", "sustainability", "diverse people", "collaboration"]
  };
  
  return categoryKeywords[category] || [];
}

function getCategoryWeight(category: string): number {
  const categoryWeights: { [key: string]: number } = {
    brand_essence: 1.3,
    photography_style: 1.2,
    color_primary: 1.1,
    color_secondary: 1.0,
    composition: 1.0,
    lighting: 0.9,
    mood_emotion: 1.1,
    visual_elements: 1.0
  };
  
  return categoryWeights[category] || 1.0;
}

// Legacy transformers implementation (fallback)
async function findSimilarEmbeddingsWithTransformers(prompt: string, threshold: number = 0.65) {
  try {
    // Ensure embeddings are calculated
    await calculateEmbeddings();

    if (!embeddingPipeline) {
      const pipelineFactory = await initPipeline();
      if (!pipelineFactory) {
        console.log('[RAG] Pipeline not available, falling back to keyword matching');
        return findKeywordMatches(prompt);
      }
      
      try {
        embeddingPipeline = await pipelineFactory('feature-extraction', 'sentence-transformers/all-MiniLM-L6-v2');
      } catch (modelError) {
        console.warn('[RAG] Failed to load embedding model in findSimilarEmbeddings, using keyword fallback:', modelError);
        return findKeywordMatches(prompt);
      }
    }

    const ragData = await loadRAGData();
    if (!ragData) {
      return [];
    }

    // Verify pipeline is available before using it
    if (!embeddingPipeline) {
      console.warn('[RAG] Embedding pipeline not available for similarity calculation');
      return [];
    }

    // Calculate embedding for the input prompt
    const promptEmbedding = await embeddingPipeline(prompt);
    const promptVector = Array.from(promptEmbedding.data) as number[];

    const similarities: Array<{
      key: string;
      entry: any;
      similarity: number;
    }> = [];

    // Compare with all cached embeddings
    for (const [key, entry] of Object.entries(ragData.embeddings.embeddings)) {
      const embeddingEntry = entry as any;
      if (embeddingEntry.embedding) {
        const similarity = cosineSimilarity(promptVector, embeddingEntry.embedding);
        if (similarity >= threshold) {
          similarities.push({
            key,
            entry: embeddingEntry,
            similarity
          });
        }
      }
    }

    // Sort by similarity (highest first)
    similarities.sort((a, b) => b.similarity - a.similarity);

    console.log(`[RAG] Found ${similarities.length} similar embeddings above threshold ${threshold}`);
    return similarities;

  } catch (error) {
    console.error('[RAG] Error finding similar embeddings:', error);
    console.log('[RAG] Falling back to keyword matching due to error');
    return findKeywordMatches(prompt);
  }
}

// Fallback keyword matching for Vercel or when embeddings fail
function findKeywordMatches(prompt: string) {
  const ragData = ragCache?.embeddings?.embeddings;
  if (!ragData) {
    return [];
  }

  const promptLower = prompt.toLowerCase();
  const matches: Array<{
    key: string;
    entry: any;
    similarity: number;
  }> = [];

  for (const [key, entry] of Object.entries(ragData)) {
    const embeddingEntry = entry as any;
    let matchScore = 0;
    let totalKeywords = embeddingEntry.keywords.length;

    // Check keyword matches
    for (const keyword of embeddingEntry.keywords) {
      if (promptLower.includes(keyword.toLowerCase())) {
        matchScore++;
      }
    }

    // Calculate similarity as percentage of keyword matches
    const similarity = matchScore / totalKeywords;
    if (similarity > 0.2) { // 20% keyword match threshold
      matches.push({
        key,
        entry: embeddingEntry,
        similarity
      });
    }
  }

  matches.sort((a, b) => b.similarity - a.similarity);
  return matches;
}

// Enhanced prompt with EGP branding
export async function enhancePromptWithBranding(originalPrompt: string, context?: { activeRAGId?: string; activeRAGName?: string }) {
  try {
    const ragName = context?.activeRAGName || 'EGP';
    console.log(`[RAG] Enhancing prompt with ${ragName} branding:`, originalPrompt);

    // Load RAG data if not already loaded or if we need a different RAG
    if (!ragCache || ragCache.ragId !== context?.activeRAGId) {
      await loadRAGData(context?.activeRAGId);
    }

    if (!ragCache) {
      console.warn('[RAG] No RAG data available, using simple enhancement');
      return getSimpleEnhancement(originalPrompt, ragName);
    }

    // Find similar embeddings
    const similarities = await findSimilarEmbeddings(originalPrompt);
    
    if (similarities.length === 0) {
      console.log('[RAG] No similar embeddings found, using simple enhancement');
      return getSimpleEnhancement(originalPrompt, ragName);
    }

    // Build enhanced prompt
    let enhancedPrompt = originalPrompt;
    const appliedEnhancements: string[] = [];
    const suggestedColors: string[] = [];
    const brandingElements: any[] = [];

    // Group similarities by category and apply enhancements
    const categorizedEnhancements: { [category: string]: any[] } = {};
    
    for (const sim of similarities) {
      const category = sim.entry.category;
      if (!categorizedEnhancements[category]) {
        categorizedEnhancements[category] = [];
      }
      categorizedEnhancements[category].push(sim);
    }

    // Apply enhancements based on category priority and limits
    const metadata = ragCache.metadata;
    for (const [category, enhancements] of Object.entries(categorizedEnhancements)) {
      const categoryInfo = metadata.categories[category];
      if (!categoryInfo) continue;

      const maxEnhancements = metadata.enhancement_rules.max_enhancements_per_category;
      const relevantEnhancements = enhancements.slice(0, maxEnhancements);

      for (const enhancement of relevantEnhancements) {
        const weight = enhancement.entry.weight * categoryInfo.enhancement_strength;
        
        // Extract relevant keywords based on similarity
        const relevantKeywords = enhancement.entry.keywords
          .filter((keyword: string) => originalPrompt.toLowerCase().includes(keyword.toLowerCase()) || enhancement.similarity > 0.8)
          .slice(0, 3); // Max 3 keywords per enhancement

        if (relevantKeywords.length > 0) {
          const enhancementText = relevantKeywords.join(', ');
          appliedEnhancements.push(enhancementText);

          // Add to branding elements
          brandingElements.push({
            category: category,
            text: enhancementText,
            weight: weight,
            similarity: enhancement.similarity
          });

          // Extract colors if it's a color category
          if (category.includes('color')) {
            const colorKeywords = relevantKeywords.filter((k: string) => k.includes('#') || k.includes('red') || k.includes('blue'));
            suggestedColors.push(...colorKeywords);
          }
        }
      }
    }

    // Build final enhanced prompt
    if (appliedEnhancements.length > 0) {
      enhancedPrompt = `${originalPrompt}, ${appliedEnhancements.join(', ')}`;
    }

    // Add mandatory negative prompts
    const negativePrompts = metadata.enhancement_rules.mandatory_negative_prompts.join(', ');

    const result = {
      enhancedPrompt,
      suggestedColors: [...new Set(suggestedColors)], // Remove duplicates
      suggestedFormat: "high-quality, professional EGP branding",
      negativePrompt: negativePrompts,
      brandingElements,
      metadata: {
        originalPrompt,
        enhancementsApplied: appliedEnhancements.length,
        categoriesUsed: Object.keys(categorizedEnhancements).length,
        ragMethod: shouldUseFullRAG() ? 'full-embedding' : 'keyword-matching',
        similarityScores: similarities.map(s => s.similarity)
      }
    };

    console.log('[RAG] Enhanced prompt generated:', result.enhancedPrompt);
    return result;

  } catch (error) {
    console.error('[RAG] Error enhancing prompt:', error);
    const ragName = context?.activeRAGName || 'EGP';
    return getSimpleEnhancement(originalPrompt, ragName);
  }
}

// Simple EGP enhancement fallback
function getSimpleEnhancement(prompt: string, ragName?: string) {
  // EGP enhancement - now the only default option
  return {
    enhancedPrompt: `${prompt}, lifestyle photography, authentic poses, diverse representation, EGP green colors, inspiring and empowering, sustainable and democratic`,
    suggestedColors: ['#57B45F', '#FFDC2E', '#FF70BD'], // EGP green, yellow, pink
    suggestedFormat: "professional EGP lifestyle style",
    negativePrompt: "no stock photo look, no neon colors, avoid red, no clichés, no single race groups, overly posed, synthetic-looking",
    brandingElements: [
      { category: 'lifestyle', text: 'lifestyle photography with diverse representation', weight: 1.0 },
      { category: 'environmental', text: 'sustainable and democratic values', weight: 1.1 }
    ],
    metadata: {
      ragMethod: 'simple-fallback',
      ragName: ragName || 'EGP'
    }
  };
}

// Legacy function renamed to reflect EGP default
function getSimpleEGPEnhancement(prompt: string) {
  return getSimpleEnhancement(prompt, 'EGP');
}

// Initialize RAG system (call this once on startup)
export async function initializeRAGSystem() {
  console.log('[RAG] Initializing RAG system...');
  
  if (shouldUseFullRAG()) {
    await loadRAGData();
    await calculateEmbeddings();
    console.log('[RAG] Full RAG system initialized');
  } else {
    console.log('[RAG] Simple RAG system initialized for Vercel');
  }
}

// Export for compatibility
export { loadRAGData, calculateEmbeddings };
