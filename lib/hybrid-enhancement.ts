// Hybrid Enhancement System
// Combines RAG branding with JSON technical enhancement

import { enhancePromptWithBranding } from './rag-system-optimized'
import { enhancePromptWithJSON, type JSONEnhancementResult } from './json-enhancement'

export interface HybridEnhancementOptions {
  useRAG: boolean
  useJSONEnhancement: boolean
  ragContext?: {
    activeRAGId?: string
    activeRAGName?: string
  }
  jsonOptions?: {
    useDefaults?: boolean
    customSelection?: Record<string, string>
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
  }
  jsonResult?: JSONEnhancementResult
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
  let ragResult: any = null
  let jsonResult: JSONEnhancementResult | null = null
  const enhancementSources: string[] = []
  let totalEnhancements = 0

  // STEP 1: RAG Enhancement (if enabled)
  if (options.useRAG) {
    try {
      console.log('[HYBRID] Applying RAG enhancement...')
      ragResult = await enhancePromptWithBranding(originalPrompt, options.ragContext)
      currentPrompt = ragResult.enhancedPrompt
      enhancementSources.push('RAG')
      totalEnhancements += ragResult.metadata?.enhancementsApplied || 0
      
      console.log('[HYBRID] RAG applied:', ragResult.metadata?.enhancementsApplied || 0, 'enhancements')
    } catch (error) {
      console.warn('[HYBRID] RAG enhancement failed:', error)
    }
  }

  // STEP 2: JSON Enhancement (if enabled)
  if (options.useJSONEnhancement) {
    try {
      console.log('[HYBRID] Applying JSON enhancement...')
      // Apply JSON enhancement to the current prompt (which may already be RAG-enhanced)
      jsonResult = await enhancePromptWithJSON(currentPrompt, options.jsonOptions)
      currentPrompt = jsonResult.enhancedPrompt
      enhancementSources.push('JSON')
      totalEnhancements += jsonResult.metadata.totalEnhancements
      
      console.log('[HYBRID] JSON applied:', jsonResult.metadata.totalEnhancements, 'enhancements')
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
