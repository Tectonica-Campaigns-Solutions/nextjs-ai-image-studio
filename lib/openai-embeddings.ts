// OpenAI Embeddings Client for Frontend
// Uses API routes to avoid fs/promises issues in client-side code

interface EmbeddingResponse {
  embedding?: number[]
  error?: string
}

interface SimilarityResponse {
  similarities?: Array<{
    content: string
    metadata?: any
    similarity: number
    embedding: number[]
  }>
  error?: string
}

interface StatusResponse {
  available: boolean
  hasApiKey: boolean
  cacheSize: number
}

// Generate embedding for a given text using API
export async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    console.log('[OpenAI Embeddings Client] Generating embedding for text length:', text.length)
    
    const response = await fetch('/api/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'generate',
        text: text
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('[OpenAI Embeddings Client] API error:', response.status, errorData)
      return null
    }

    const data: EmbeddingResponse = await response.json()
    
    if (data.error) {
      console.error('[OpenAI Embeddings Client] Error from API:', data.error)
      return null
    }

    if (!data.embedding) {
      console.error('[OpenAI Embeddings Client] No embedding in response')
      return null
    }

    console.log('[OpenAI Embeddings Client] Successfully generated embedding with', data.embedding.length, 'dimensions')
    return data.embedding
    
  } catch (error) {
    console.error('[OpenAI Embeddings Client] Network error:', error)
    return null
  }
}

// Calculate similarities between query and multiple embeddings
export async function calculateSimilarities(
  queryEmbedding: number[],
  embeddings: Array<{
    content: string
    metadata?: any
    embedding: number[]
  }>
): Promise<Array<{
  content: string
  metadata?: any
  similarity: number
  embedding: number[]
}> | null> {
  try {
    console.log('[OpenAI Embeddings Client] Calculating similarities for', embeddings.length, 'embeddings')
    
    const response = await fetch('/api/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'similarity',
        queryEmbedding,
        embeddings
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('[OpenAI Embeddings Client] Similarity API error:', response.status, errorData)
      return null
    }

    const data: SimilarityResponse = await response.json()
    
    if (data.error) {
      console.error('[OpenAI Embeddings Client] Similarity error from API:', data.error)
      return null
    }

    if (!data.similarities) {
      console.error('[OpenAI Embeddings Client] No similarities in response')
      return null
    }

    console.log('[OpenAI Embeddings Client] Successfully calculated', data.similarities.length, 'similarities')
    return data.similarities
    
  } catch (error) {
    console.error('[OpenAI Embeddings Client] Similarity network error:', error)
    return null
  }
}

// Get embeddings service status
export async function getEmbeddingsStatus(): Promise<StatusResponse | null> {
  try {
    const response = await fetch('/api/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'status'
      })
    })

    if (!response.ok) {
      console.error('[OpenAI Embeddings Client] Status API error:', response.status)
      return null
    }

    const data: StatusResponse = await response.json()
    console.log('[OpenAI Embeddings Client] Service status:', data)
    return data
    
  } catch (error) {
    console.error('[OpenAI Embeddings Client] Status network error:', error)
    return null
  }
}

// Legacy function compatibility
export async function getEmbedding(prompt: string): Promise<number[] | null> {
  return generateEmbedding(prompt)
}

// Legacy function for similarity calculation
export function cosineSimilarity(a: number[], b: number[]): number {
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

// Batch processing function for multiple texts
export async function generateMultipleEmbeddings(texts: string[]): Promise<Array<{
  text: string
  embedding: number[] | null
  index: number
}>> {
  console.log('[OpenAI Embeddings Client] Generating embeddings for', texts.length, 'texts')
  
  const results = await Promise.all(
    texts.map(async (text, index) => ({
      text,
      embedding: await generateEmbedding(text),
      index
    }))
  )

  const successCount = results.filter(r => r.embedding !== null).length
  console.log('[OpenAI Embeddings Client] Successfully generated', successCount, 'of', texts.length, 'embeddings')
  
  return results
}

// Helper function to check if embeddings are available
export async function isEmbeddingsAvailable(): Promise<boolean> {
  const status = await getEmbeddingsStatus()
  return status?.available && status?.hasApiKey || false
}

// Legacy compatibility export
export async function generateEmbeddings(prompts: string[]): Promise<Array<{ prompt: string; embedding: number[] | null; index: number }>> {
  const results = await generateMultipleEmbeddings(prompts)
  return results.map(r => ({
    prompt: r.text,
    embedding: r.embedding,
    index: r.index
  }))
}
