// Server-side OpenAI embeddings - only for API routes
import OpenAI from 'openai'

let openai: OpenAI | null = null

function getOpenAIClient(): OpenAI | null {
  if (!openai && process.env.OPENAI_API_KEY) {
    try {
      openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      })
    } catch (error) {
      console.warn('[OpenAI Embeddings Server] Failed to initialize OpenAI client:', error)
      return null
    }
  }
  return openai
}

export async function getEmbedding(text: string): Promise<number[] | null> {
  const client = getOpenAIClient()
  if (!client) {
    console.warn('[OpenAI Embeddings Server] OpenAI client not available')
    return null
  }

  try {
    console.log('[OpenAI Embeddings Server] Generating embedding for text length:', text.length)
    const response = await client.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    })

    const embedding = response.data[0].embedding
    console.log('[OpenAI Embeddings Server] Generated embedding with', embedding.length, 'dimensions')
    return embedding
  } catch (error) {
    console.error('[OpenAI Embeddings Server] Error generating embedding:', error)
    return null
  }
}
