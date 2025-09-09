// Hybrid Enhancement System
// Combines RAG branding with JSON technical enhancement

// Dynamic RAG import to handle missing file
async function getRAGEnhancement() {
  try {
    // For now, return a simple fallback since rag-system-optimized is empty
    return (prompt: string, context?: any) => {
      return {
        enhancedPrompt: `${prompt}, high quality, professional`,
        brandingElements: [{ category: 'fallback', text: 'high quality, professional' }],
        suggestedColors: ['neutral tones'],
        suggestedFormat: 'professional photography',
        negativePrompt: 'blurry, low quality, amateur',
        metadata: {
          method: 'fallback',
          enhancementsApplied: 1
        }
      };
    };
  } catch (error) {
    console.warn('[HYBRID] RAG system not available:', error);
    return null;
  }
}

import { enhancePromptWithJSON, type JSONEnhancementResult, type JSONEnhancementOptions } from './json-enhancement'

export interface HybridEnhancementOptions {
  useRAG: boolean
  useJSONEnhancement: boolean
  ragContext?: {
    activeRAGId?: string
    activeRAGName?: string
  }
  jsonOptions?: {
    useDefaults?: boolean
    customText?: string
    intensity?: number
  }
}

export interface HybridEnhancementResult {
  enhancedPrompt: string
  originalPrompt: string
  finalNegativePrompt: string
  ragResult?: {
    enhancedPrompt: string
    brandingElements: Array<{ category: string; text: string }>
    suggestedColors: string[]
    suggestedFormat: string
    negativePrompt: string
    metadata: any
  } | null
  jsonResult?: JSONEnhancementResult | null
  metadata: {
    ragApplied: boolean
    jsonApplied: boolean
    enhancementSources: string[]
    processingTime: number
    strategy: string
    totalEnhancements: number
  }
}

// Main hybrid enhancement function
export async function enhancePromptHybrid(
  originalPrompt: string,
  options: HybridEnhancementOptions
): Promise<HybridEnhancementResult> {
  const startTime = Date.now()
  
  console.log('[HYBRID] Starting enhancement with strategy:', getStrategyName(options))
  console.log('[HYBRID] Original prompt:', originalPrompt.substring(0, 100) + '...')
  
  let currentPrompt = originalPrompt
  let ragResult: any = null;
  let jsonResult: JSONEnhancementResult | null = null;
  const enhancementSources: string[] = []
  let totalEnhancements = 0

  // STEP 1: RAG Enhancement (if enabled)
  if (options.useRAG) {
    try {
      console.log('[HYBRID] Applying RAG enhancement...')
      const ragFunction = await getRAGEnhancement()
      if (ragFunction) {
        ragResult = await ragFunction(originalPrompt, options.ragContext)
        currentPrompt = ragResult.enhancedPrompt
        enhancementSources.push('RAG')
        totalEnhancements += ragResult.metadata?.enhancementsApplied || 0
        
        console.log('[HYBRID] RAG applied:', ragResult.metadata?.enhancementsApplied || 0, 'enhancements')
      } else {
        console.warn('[HYBRID] RAG enhancement not available')
      }
    } catch (error) {
      console.warn('[HYBRID] RAG enhancement failed:', error)
    }
  }

  // STEP 2: JSON Enhancement (if enabled)
  if (options.useJSONEnhancement) {
    try {
      console.log('[HYBRID] Applying JSON enhancement...')
      const jsonOptions: JSONEnhancementOptions = {
        useDefaults: options.jsonOptions?.useDefaults ?? true,
        customText: options.jsonOptions?.customText,
        intensity: options.jsonOptions?.intensity ?? 0.8
      }
      
      jsonResult = await enhancePromptWithJSON(currentPrompt, jsonOptions);
      currentPrompt = jsonResult.enhancedPrompt;
      enhancementSources.push('JSON');
      totalEnhancements += jsonResult.appliedText ? 1 : 0; // Count 1 if text was applied
      
      console.log('[HYBRID] JSON applied:', jsonResult.appliedText ? 'text enhancement' : 'no enhancement')
    } catch (error) {
      console.warn('[HYBRID] JSON enhancement failed:', error)
    }
  }

  // STEP 3: Fallback if no enhancements were applied
  if (enhancementSources.length === 0) {
    console.log('[HYBRID] No enhancements applied, using basic fallback')
    currentPrompt = `${originalPrompt}, high quality, professional`
    enhancementSources.push('FALLBACK')
    totalEnhancements = 1
  }

  // STEP 4: Combine negative prompts
  const negativePrompts = []
  if (ragResult?.negativePrompt) {
    negativePrompts.push(ragResult.negativePrompt)
  }
  if (jsonResult?.negativePrompt) {
    negativePrompts.push(jsonResult.negativePrompt)
  }
  
  // Remove duplicates and join
  const uniqueNegatives = [...new Set(negativePrompts.flatMap(np => np.split(', ')))]
  const finalNegativePrompt = uniqueNegatives.join(', ')

  const result: HybridEnhancementResult = {
    enhancedPrompt: currentPrompt,
    originalPrompt,
    finalNegativePrompt,
    ragResult,
    jsonResult,
    metadata: {
      ragApplied: !!ragResult,
      jsonApplied: !!jsonResult,
      enhancementSources,
      processingTime: Date.now() - startTime,
      strategy: getStrategyName(options),
      totalEnhancements
    }
  }

  console.log('[HYBRID] Enhancement completed in', result.metadata.processingTime, 'ms')
  console.log('[HYBRID] Strategy:', result.metadata.strategy)
  console.log('[HYBRID] Sources:', enhancementSources.join(' + '))
  console.log('[HYBRID] Final prompt length:', currentPrompt.length)
  
  return result
}

// Helper function to get strategy name
function getStrategyName(options: HybridEnhancementOptions): string {
  if (options.useRAG && options.useJSONEnhancement) {
    return 'Hybrid (RAG + JSON)'
  }
  if (options.useRAG) {
    return 'RAG Only'
  }
  if (options.useJSONEnhancement) {
    return 'JSON Only'
  }
  return 'Basic (No Enhancement)'
}

// Helper function to get strategy description
export function getStrategyDescription(options: HybridEnhancementOptions): string {
  if (options.useRAG && options.useJSONEnhancement) {
    return 'Brand guidelines + technical style enhancement'
  }
  if (options.useRAG) {
    return 'Brand consistency with organizational guidelines'
  }
  if (options.useJSONEnhancement) {
    return 'Technical style and quality enhancement'
  }
  return 'Basic prompt without enhancements'
}

// Helper function to validate hybrid options
export function validateHybridOptions(options: HybridEnhancementOptions): {
  valid: boolean
  warnings: string[]
} {
  const warnings: string[] = []
  
  if (!options.useRAG && !options.useJSONEnhancement) {
    warnings.push('No enhancement methods enabled - prompt will not be enhanced')
  }
  
  if (options.useRAG && !options.ragContext?.activeRAGId) {
    warnings.push('RAG enabled but no active RAG ID provided')
  }
  
  if (options.useJSONEnhancement && options.jsonOptions?.intensity && 
      (options.jsonOptions.intensity < 0.1 || options.jsonOptions.intensity > 1.0)) {
    warnings.push('JSON intensity should be between 0.1 and 1.0')
  }
  
  return {
    valid: true, // Always valid, just warnings
    warnings
  }
}
