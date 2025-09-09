import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createHash } from 'crypto'
import { readFile, writeFile, access } from 'fs/promises'
import { join } from 'path'

// Initialize OpenAI client with error handling
let openai: OpenAI | null = null

function getOpenAIClient(): OpenAI | null {
  if (!openai && process.env.OPENAI_API_KEY) {
    try {
      openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      })
    } catch (error) {
      console.warn('[OpenAI Embeddings API] Failed to initialize OpenAI client:', error)
      return null
    }
  }
  return openai
}

// File paths for embeddings cache
const EMBEDDINGS_DIR = join(process.cwd(), 'data', 'embeddings')
const EMBEDDINGS_INDEX = join(EMBEDDINGS_DIR, 'index.json')

// Cache management functions
async function loadEmbeddingsIndex(): Promise<Record<string, any>> {
  try {
    await access(EMBEDDINGS_INDEX)
    const data = await readFile(EMBEDDINGS_INDEX, 'utf-8')
    return JSON.parse(data)
  } catch {
    return {}
  }
}

async function saveEmbeddingsIndex(index: Record<string, any>): Promise<void> {
  try {
    // Ensure directory exists
    await writeFile(EMBEDDINGS_DIR + '/.gitkeep', '', { flag: 'w' }).catch(() => {})
    await writeFile(EMBEDDINGS_INDEX, JSON.stringify(index, null, 2))
  } catch (error) {
    console.warn('[OpenAI Embeddings API] Failed to save embeddings index:', error)
  }
}

async function getEmbeddingFromCache(hash: string): Promise<number[] | null> {
  try {
    const embeddingFile = join(EMBEDDINGS_DIR, `${hash}.json`)
    await access(embeddingFile)
    const data = await readFile(embeddingFile, 'utf-8')
    const parsed = JSON.parse(data)
    return parsed.embedding
  } catch {
    return null
  }
}

async function saveEmbeddingToCache(hash: string, embedding: number[], text: string): Promise<void> {
  try {
    const embeddingFile = join(EMBEDDINGS_DIR, `${hash}.json`)
    await writeFile(embeddingFile, JSON.stringify({
      hash,
      text: text.substring(0, 100), // Save first 100 chars for reference
      embedding,
      timestamp: Date.now()
    }))

    // Update index
    const index = await loadEmbeddingsIndex()
    index[hash] = {
      file: `${hash}.json`,
      preview: text.substring(0, 50),
      timestamp: Date.now()
    }
    await saveEmbeddingsIndex(index)
  } catch (error) {
    console.warn('[OpenAI Embeddings API] Failed to save embedding to cache:', error)
  }
}

// Main embedding function
async function getEmbedding(text: string): Promise<number[] | null> {
  const client = getOpenAIClient()
  if (!client) {
    console.warn('[OpenAI Embeddings API] OpenAI client not available')
    return null
  }

  // Create hash for caching
  const hash = createHash('sha256').update(text).digest('hex')

  // Try cache first
  const cached = await getEmbeddingFromCache(hash)
  if (cached) {
    console.log('[OpenAI Embeddings API] Using cached embedding for hash:', hash.substring(0, 8))
    return cached
  }

  try {
    console.log('[OpenAI Embeddings API] Generating new embedding for text length:', text.length)
    const response = await client.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    })

    const embedding = response.data[0].embedding

    // Cache the result
    await saveEmbeddingToCache(hash, embedding, text)

    console.log('[OpenAI Embeddings API] Generated and cached embedding with', embedding.length, 'dimensions')
    return embedding
  } catch (error) {
    console.error('[OpenAI Embeddings API] Error generating embedding:', error)
    return null
  }
}

// Similarity calculation
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, text, embeddings, queryEmbedding } = body

    switch (action) {
      case 'generate':
        if (!text) {
          return NextResponse.json({ error: 'Text is required' }, { status: 400 })
        }
        
        const embedding = await getEmbedding(text)
        if (!embedding) {
          return NextResponse.json({ error: 'Failed to generate embedding' }, { status: 500 })
        }
        
        return NextResponse.json({ embedding })

      case 'similarity':
        if (!embeddings || !queryEmbedding) {
          return NextResponse.json({ error: 'Embeddings and queryEmbedding are required' }, { status: 400 })
        }
        
        const similarities = embeddings.map((emb: any) => ({
          ...emb,
          similarity: cosineSimilarity(queryEmbedding, emb.embedding)
        }))
        
        return NextResponse.json({ similarities })

      case 'status':
        const client = getOpenAIClient()
        const index = await loadEmbeddingsIndex()
        
        return NextResponse.json({
          available: !!client,
          hasApiKey: !!process.env.OPENAI_API_KEY,
          cacheSize: Object.keys(index).length
        })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('[OpenAI Embeddings API] Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
