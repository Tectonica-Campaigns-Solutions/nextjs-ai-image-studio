// Enhanced RAG system with multi-RAG support
import { useRAGStore } from './rag-store'

// Main integration with multi-RAG store
export async function enhancePromptWithBranding(prompt: string) {
  try {
    // Check if we're in browser environment
    if (typeof window === 'undefined') {
      // Server-side: use optimized system
      const { enhancePromptWithBranding: serverEnhance } = await import('./rag-system-optimized')
      return await serverEnhance(prompt)
    }

    // Client-side: use active RAG from store
    const store = useRAGStore.getState()
    const activeRAG = store.getActiveRAG()

    if (!activeRAG) {
      console.warn('[RAG] No active RAG selected, using fallback')
      return enhancePromptSimple(prompt)
    }

    console.log('[RAG] Using active RAG:', activeRAG.name)
    
    // Parse RAG content
    let brandingData
    try {
      brandingData = JSON.parse(activeRAG.content)
    } catch (error) {
      console.error('[RAG] Failed to parse active RAG content:', error)
      return enhancePromptSimple(prompt)
    }

    // Use the branding data to enhance the prompt
    return await enhancePromptWithRAGData(prompt, brandingData)

  } catch (error) {
    console.error('[RAG] Error in enhancePromptWithBranding:', error)
    return enhancePromptSimple(prompt)
  }
}

// Enhanced prompt processing with RAG data
async function enhancePromptWithRAGData(prompt: string, brandingData: any) {
  try {
    const colors = brandingData.principalColors || []
    const style = brandingData.visualStyle || {}
    const guidelines = brandingData.brandGuidelines || {}
    
    // Build enhanced prompt
    let enhancedPrompt = prompt
    
    // Add style elements
    if (style.imageStyle) {
      enhancedPrompt += `, ${style.imageStyle}`
    }
    
    if (style.mood) {
      enhancedPrompt += `, ${style.mood} mood`
    }
    
    if (style.techniques) {
      enhancedPrompt += `, ${style.techniques.join(', ')}`
    }
    
    // Add branding elements
    const brandingElements = []
    if (guidelines.messagingTone) {
      brandingElements.push(`${guidelines.messagingTone} tone`)
    }
    
    if (guidelines.keyValues) {
      brandingElements.push(...guidelines.keyValues)
    }

    return {
      enhancedPrompt,
      suggestedColors: colors,
      brandingElements,
      confidence: 0.85,
      ragSource: brandingData.organizationName || 'Unknown',
      appliedGuidelines: Object.keys(guidelines)
    }
    
  } catch (error) {
    console.error('[RAG] Error processing RAG data:', error)
    return enhancePromptSimple(prompt)
  }
}

// Initialize RAG system
export async function initializeRAGSystem() {
  try {
    if (typeof window === 'undefined') {
      // Server-side initialization
      const { initializeRAGSystem: serverInit } = await import('./rag-system-optimized')
      return await serverInit()
    }

    // Client-side: ensure store is ready
    const store = useRAGStore.getState()
    console.log(`[RAG] Client-side system initialized with ${store.getAllRAGs().length} RAGs`)
    return true
    
  } catch (error) {
    console.error('[RAG] Failed to initialize RAG system:', error)
    return false
  }
}

// Re-export optimized functions for server-side use
export { enhancePromptWithBranding as enhancePromptWithBrandingOptimized } from './rag-system-optimized'

// Fallback function for simple enhancement
export async function enhancePromptSimple(prompt: string) {
  return {
    enhancedPrompt: `${prompt}, documentary photography style, high contrast, professional branding`,
    suggestedColors: ['#ef404e', '#0055aa'],
    brandingElements: ['professional', 'clean', 'authoritative'],
    confidence: 0.3,
    ragSource: 'Fallback',
    appliedGuidelines: []
  }
}
