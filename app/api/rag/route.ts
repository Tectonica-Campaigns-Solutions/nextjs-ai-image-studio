import { NextRequest, NextResponse } from 'next/server'
import { readFile, writeFile, access } from 'fs/promises'
import { join } from 'path'
import { getEmbedding } from '../../../lib/openai-embeddings-server'

// Platform environment detection
function isVercelEnvironment() {
  return !!(process.env.VERCEL || process.env.VERCEL_ENV)
}

function isRailwayEnvironment() {
  return !!(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_ENVIRONMENT_NAME)
}

function shouldUseFullRAG() {
  return !isVercelEnvironment()
}

function shouldUseOpenAIEmbeddings() {
  return !!(process.env.OPENAI_API_KEY && shouldUseFullRAG())
}

// RAG Data paths
const RAG_DATA_DIR = join(process.cwd(), 'data', 'rag')

interface RAGDocument {
  id: string
  name: string
  type: 'brand-guidelines' | 'style-guide' | 'content-template' | 'custom'
  content: string
  metadata: {
    created: string
    lastModified: string
    tags: string[]
    category: string
    priority: number
  }
  embedding?: number[]
}

// Load RAG documents
async function loadRAGDocuments(): Promise<RAGDocument[]> {
  try {
    const indexPath = join(RAG_DATA_DIR, 'index.json')
    await access(indexPath)
    const indexData = await readFile(indexPath, 'utf-8')
    const index = JSON.parse(indexData)
    
    const documents: RAGDocument[] = []
    
    for (const item of index.rags || []) {
      try {
        const filePath = join(RAG_DATA_DIR, item.file)
        await access(filePath)
        const content = await readFile(filePath, 'utf-8')
        const doc = JSON.parse(content)
        documents.push({
          id: item.id,
          name: item.name,
          type: item.type || 'custom',
          content: doc.content || content,
          metadata: {
            created: item.created || new Date().toISOString(),
            lastModified: item.lastModified || new Date().toISOString(),
            tags: item.tags || [],
            category: item.category || 'general',
            priority: item.priority || 1
          },
          embedding: doc.embedding
        })
      } catch (error) {
        console.warn(`[RAG API] Failed to load document ${item.id}:`, error)
      }
    }
    
    console.log(`[RAG API] Loaded ${documents.length} RAG documents`)
    return documents
  } catch (error) {
    console.warn('[RAG API] Failed to load RAG documents:', error)
    return []
  }
}

// Simple text-based similarity (fallback when OpenAI embeddings are not available)
function calculateTextSimilarity(query: string, text: string): number {
  const queryWords = query.toLowerCase().split(/\s+/)
  const textWords = text.toLowerCase().split(/\s+/)
  
  const querySet = new Set(queryWords)
  const textSet = new Set(textWords)
  
  const intersection = new Set([...querySet].filter(x => textSet.has(x)))
  const union = new Set([...querySet, ...textSet])
  
  return intersection.size / union.size
}

// Enhanced text similarity with keywords and semantic matching
function enhancedTextSimilarity(query: string, document: RAGDocument): number {
  const queryLower = query.toLowerCase()
  const contentLower = document.content.toLowerCase()
  const nameLower = document.name.toLowerCase()
  
  let score = 0
  
  // Direct keyword matching
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2)
  const contentWords = contentLower.split(/\s+/)
  
  for (const word of queryWords) {
    if (contentLower.includes(word)) {
      score += 0.3
    }
    if (nameLower.includes(word)) {
      score += 0.5
    }
  }
  
  // Category and type matching
  if (document.metadata.category && queryLower.includes(document.metadata.category.toLowerCase())) {
    score += 0.4
  }
  
  // Tags matching
  for (const tag of document.metadata.tags) {
    if (queryLower.includes(tag.toLowerCase())) {
      score += 0.3
    }
  }
  
  // Jaccard similarity
  score += calculateTextSimilarity(query, document.content) * 0.2
  
  return Math.min(score, 1.0)
}

// Main RAG enhancement function
async function enhancePromptWithRAG(
  originalPrompt: string,
  activeRAGId?: string,
  activeRAGName?: string
): Promise<{
  enhancedPrompt: string
  brandingElements: Array<{ category: string; text: string }>
  suggestedColors: string[]
  suggestedFormat: string
  negativePrompt: string
  metadata: any
}> {
  try {
    console.log('[RAG API] Enhancing prompt with RAG system')
    const documents = await loadRAGDocuments()
    
    if (documents.length === 0) {
      console.log('[RAG API] No RAG documents available, using basic enhancement')
      return {
        enhancedPrompt: `${originalPrompt}, high quality, professional`,
        brandingElements: [{ category: 'fallback', text: 'high quality, professional' }],
        suggestedColors: ['neutral tones'],
        suggestedFormat: 'professional photography',
        negativePrompt: 'blurry, low quality, amateur',
        metadata: {
          method: 'fallback',
          documentsFound: 0,
          enhancementsApplied: 1
        }
      }
    }
    
    let relevantDocuments = documents
    
    // If specific RAG is requested, filter for it
    if (activeRAGId) {
      const specificDoc = documents.find(doc => doc.id === activeRAGId)
      if (specificDoc) {
        relevantDocuments = [specificDoc]
        console.log(`[RAG API] Using specific RAG document: ${specificDoc.name}`)
      }
    }
    
    // Use embeddings if available
    if (shouldUseOpenAIEmbeddings()) {
      console.log('[RAG API] Using OpenAI embeddings for similarity')
      // This would require the embeddings API to be working
      // For now, fall back to text similarity
    }
    
    // Calculate similarities using text matching
    const similarities = relevantDocuments.map(doc => ({
      document: doc,
      similarity: enhancedTextSimilarity(originalPrompt, doc)
    })).sort((a, b) => b.similarity - a.similarity)
    
    const topDocuments = similarities.slice(0, 3).filter(s => s.similarity > 0.1)
    
    if (topDocuments.length === 0) {
      console.log('[RAG API] No relevant documents found')
      return {
        enhancedPrompt: `${originalPrompt}, high quality, professional`,
        brandingElements: [{ category: 'fallback', text: 'high quality, professional' }],
        suggestedColors: ['neutral tones'],
        suggestedFormat: 'professional photography',
        negativePrompt: 'blurry, low quality, amateur',
        metadata: {
          method: 'text-similarity',
          documentsFound: documents.length,
          relevantDocuments: 0,
          enhancementsApplied: 1
        }
      }
    }
    
    // Extract branding elements
    const brandingElements: Array<{ category: string; text: string }> = []
    const suggestedColors: string[] = []
    let suggestedFormat = 'professional photography'
    let negativePrompt = 'blurry, low quality, amateur'
    
    for (const { document } of topDocuments) {
      // Extract colors, styles, and formats from content
      const content = document.content.toLowerCase()
      
      // Color extraction
      const colorMatches = content.match(/(?:color|colour)s?[:\s]+([^.!?]+)/gi)
      if (colorMatches) {
        suggestedColors.push(...colorMatches.map(m => m.replace(/(?:color|colour)s?[:\s]+/i, '').trim()))
      }
      
      // Style extraction
      const styleMatches = content.match(/(?:style|aesthetic|look)[:\s]+([^.!?]+)/gi)
      if (styleMatches) {
        brandingElements.push({
          category: 'style',
          text: styleMatches.map(m => m.replace(/(?:style|aesthetic|look)[:\s]+/i, '').trim()).join(', ')
        })
      }
      
      // Brand elements
      brandingElements.push({
        category: document.type,
        text: document.content.substring(0, 200) + '...'
      })
    }
    
    // Build enhanced prompt
    const enhancements = brandingElements.map(be => be.text).join(', ')
    const enhancedPrompt = `${originalPrompt}, ${enhancements}`
    
    console.log(`[RAG API] Enhanced prompt with ${topDocuments.length} relevant documents`)
    
    return {
      enhancedPrompt,
      brandingElements,
      suggestedColors: suggestedColors.slice(0, 3),
      suggestedFormat,
      negativePrompt,
      metadata: {
        method: 'text-similarity',
        documentsFound: documents.length,
        relevantDocuments: topDocuments.length,
        enhancementsApplied: brandingElements.length,
        similarities: topDocuments.map(t => ({ id: t.document.id, similarity: t.similarity }))
      }
    }
    
  } catch (error) {
    console.error('[RAG API] Error in RAG enhancement:', error)
    return {
      enhancedPrompt: `${originalPrompt}, high quality, professional`,
      brandingElements: [{ category: 'error-fallback', text: 'high quality, professional' }],
      suggestedColors: ['neutral tones'],
      suggestedFormat: 'professional photography',
      negativePrompt: 'blurry, low quality, amateur',
      metadata: {
        method: 'error-fallback',
        error: error instanceof Error ? error.message : 'Unknown error',
        enhancementsApplied: 1
      }
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, prompt, activeRAGId, activeRAGName } = body
    
    switch (action) {
      case 'enhance':
        if (!prompt) {
          return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
        }
        
        const result = await enhancePromptWithRAG(prompt, activeRAGId, activeRAGName)
        return NextResponse.json(result)
        
      case 'status':
        const documents = await loadRAGDocuments()
        return NextResponse.json({
          available: true,
          documentsCount: documents.length,
          useEmbeddings: shouldUseOpenAIEmbeddings(),
          environment: {
            isVercel: isVercelEnvironment(),
            isRailway: isRailwayEnvironment(),
            hasOpenAI: !!process.env.OPENAI_API_KEY
          }
        })
        
      case 'documents':
        const allDocuments = await loadRAGDocuments()
        return NextResponse.json({
          documents: allDocuments.map(doc => ({
            id: doc.id,
            name: doc.name,
            type: doc.type,
            metadata: doc.metadata
          }))
        })
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('[RAG API] Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
