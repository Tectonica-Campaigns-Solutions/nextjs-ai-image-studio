// Enhanced RAG system with advanced semantic capabilities and multi-RAG support
import { useRAGStore } from './rag-store'

// Import advanced RAG system
import { 
  enhancePromptWithAdvancedRAG, 
  enhancePromptWithBranding as enhancePromptWithBrandingAdvanced 
} from './advanced-rag'

// Configuration for advanced RAG system
const ENABLE_ADVANCED_RAG = true // Set to false to use legacy system only

// Main integration with multi-RAG store and advanced RAG capabilities
export async function enhancePromptWithBranding(prompt: string) {
  try {
    // Check if we're in browser environment
    if (typeof window === 'undefined') {
      // Server-side: use optimized system with advanced RAG if enabled
      if (ENABLE_ADVANCED_RAG) {
        try {
          const advancedResult = await enhancePromptWithAdvancedRAG(prompt)
          console.log('[RAG] Server-side advanced RAG enhancement applied')
          return advancedResult
        } catch (advancedError) {
          console.warn('[RAG] Advanced RAG failed on server-side, falling back to optimized:', advancedError)
        }
      }
      
      const { enhancePromptWithBranding: serverEnhance } = await import('./rag-system-optimized')
      return await serverEnhance(prompt)
    }

    // Client-side: try advanced RAG first, then use active RAG from store
    if (ENABLE_ADVANCED_RAG) {
      try {
        const advancedResult = await enhancePromptWithAdvancedRAG(prompt)
        console.log('[RAG] Client-side advanced RAG enhancement applied')
        return advancedResult
      } catch (advancedError) {
        console.warn('[RAG] Advanced RAG failed on client-side, falling back to legacy system:', advancedError)
      }
    }

    // Legacy system fallback
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

// Initialize RAG system with advanced capabilities
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
    
    // Initialize advanced RAG system if enabled
    if (ENABLE_ADVANCED_RAG) {
      try {
        console.log('[RAG] Advanced RAG system initialized')
        // The advanced RAG system is stateless and doesn't require explicit initialization
        // but we can test it's working here
        const testResult = await enhancePromptWithAdvancedRAG('test photography prompt')
        if (testResult.confidence_score > 0) {
          console.log('[RAG] Advanced RAG system test successful')
        }
      } catch (error) {
        console.warn('[RAG] Advanced RAG initialization test failed:', error)
      }
    }
    
    return true
    
  } catch (error) {
    console.error('[RAG] Failed to initialize RAG system:', error)
    return false
  }
}

// Utility function to toggle advanced RAG system
export function setAdvancedRAGEnabled(enabled: boolean) {
  // This would typically update a configuration store
  // For now, we log the change
  console.log(`[RAG] Advanced RAG system ${enabled ? 'enabled' : 'disabled'}`)
}

// Function to get current RAG system status
export function getRAGSystemStatus() {
  return {
    advancedRAGEnabled: ENABLE_ADVANCED_RAG,
    legacyRAGAvailable: true,
    serverSideOptimizedAvailable: typeof window === 'undefined'
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
