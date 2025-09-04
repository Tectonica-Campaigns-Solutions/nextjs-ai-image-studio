/**
 * Advanced RAG System - Main Entry Point
 * 
 * This module provides the main interface for the advanced RAG system,
 * integrating semantic parsing, concept taxonomy, and intelligent enhancement.
 */

export { ConceptTaxonomy, EnhancedPrompt, BrandContext, AdvancedRAGConfig } from './types'
export { EGP_CONCEPT_TAXONOMY } from './egp-taxonomy'
export { SemanticParser } from './semantic-parser'
export { AdvancedRAGEngine } from './engine'

import { AdvancedRAGEngine } from './engine'
import { EnhancedPrompt, BrandContext } from './types'

// Create a global instance with default EGP configuration
const defaultEngine = new AdvancedRAGEngine({
  enable_semantic_parsing: true,
  enable_vector_search: true,
  enable_dynamic_weighting: true,
  enable_conflict_resolution: true,
  similarity_threshold: 0.3,
  max_enhancements: 6,
  brand_alignment_weight: 0.8,
  context_window_size: 5
})

/**
 * Main function to enhance prompts with advanced RAG
 * This replaces the basic RAG system in existing code
 */
export async function enhancePromptWithAdvancedRAG(
  prompt: string,
  context?: { activeRAGId?: string; activeRAGName?: string }
): Promise<EnhancedPrompt> {
  console.log('[Advanced RAG] Processing prompt:', prompt.substring(0, 50) + '...')
  
  // Create brand context for EGP
  const brandContext: BrandContext = {
    brand_name: context?.activeRAGName || 'EGP',
    primary_values: [
      'sustainability', 'democracy', 'social justice', 'environmental protection',
      'transparency', 'inclusion', 'community', 'progressive values'
    ],
    visual_identity: {
      colors: ['#57B45F', '#FFDC2E', '#FF70BD'], // EGP green, yellow, pink
      styles: ['lifestyle', 'environmental', 'documentary'],
      moods: ['welcoming', 'hopeful', 'empowering', 'collaborative']
    },
    target_audience: [
      'diverse communities', 'young voters', 'environmental activists',
      'progressive citizens', 'democratic participants'
    ],
    content_guidelines: [
      'authentic representation', 'environmental focus', 'inclusive imagery',
      'democratic values', 'sustainable lifestyle', 'community engagement'
    ]
  }

  return await defaultEngine.enhancePrompt(prompt, brandContext)
}

/**
 * Compatibility function for existing RAG system
 * Returns the enhanced prompt in the expected format
 */
export async function enhancePromptWithBranding(
  prompt: string,
  context?: { activeRAGId?: string; activeRAGName?: string }
): Promise<{
  enhancedPrompt: string
  suggestedColors: string[]
  suggestedFormat: string
  negativePrompt: string
  brandingElements: Array<{ category: string; text: string }>
  metadata: {
    originalPrompt: string
    enhancementsApplied: number
    categoriesUsed: number
    ragMethod: string
    similarityScores: number[]
  }
}> {
  try {
    const advancedResult = await enhancePromptWithAdvancedRAG(prompt, context)
    
    // Convert to legacy format for backward compatibility
    return {
      enhancedPrompt: advancedResult.enhanced_prompt,
      suggestedColors: ['#57B45F', '#FFDC2E', '#FF70BD'], // EGP colors
      suggestedFormat: 'professional EGP lifestyle photography',
      negativePrompt: advancedResult.suggested_negative_prompt,
      brandingElements: advancedResult.enhancement_details.map(detail => ({
        category: detail.category,
        text: detail.text
      })),
      metadata: {
        originalPrompt: advancedResult.original_prompt,
        enhancementsApplied: advancedResult.metadata.enhancements_applied,
        categoriesUsed: new Set(advancedResult.enhancement_details.map(d => d.category)).size,
        ragMethod: 'advanced-semantic',
        similarityScores: advancedResult.enhancement_details.map(d => d.weight)
      }
    }
  } catch (error) {
    console.error('[Advanced RAG] Error, falling back to simple enhancement:', error)
    
    // Fallback to simple enhancement
    return {
      enhancedPrompt: `${prompt}, EGP lifestyle photography, sustainable, authentic, diverse representation, welcoming atmosphere`,
      suggestedColors: ['#57B45F', '#FFDC2E', '#FF70BD'],
      suggestedFormat: 'professional EGP lifestyle photography',
      negativePrompt: 'low quality, blurry, corporate stock photo, artificial',
      brandingElements: [
        { category: 'style', text: 'lifestyle photography' },
        { category: 'mood', text: 'welcoming atmosphere' },
        { category: 'brand', text: 'EGP sustainable values' }
      ],
      metadata: {
        originalPrompt: prompt,
        enhancementsApplied: 3,
        categoriesUsed: 3,
        ragMethod: 'fallback-simple',
        similarityScores: [0.8, 0.7, 0.9]
      }
    }
  }
}

/**
 * Test function to validate the advanced RAG system
 */
export async function testAdvancedRAG(testPrompts: string[] = [
  'professional portrait of a climate activist',
  'group of diverse people in a community garden',
  'sustainable lifestyle photography with natural lighting',
  'environmental demonstration with hopeful mood',
  'corporate meeting about renewable energy'
]): Promise<void> {
  console.log('\n=== Advanced RAG System Test ===\n')
  
  for (const prompt of testPrompts) {
    console.log(`🧪 Testing: "${prompt}"`)
    
    try {
      const result = await enhancePromptWithAdvancedRAG(prompt)
      
      console.log(`📊 Concepts found: ${result.applied_concepts.length}`)
      console.log(`🎯 Brand alignment: ${(result.brand_alignment_score * 100).toFixed(1)}%`)
      console.log(`🔍 Confidence: ${(result.confidence_score * 100).toFixed(1)}%`)
      console.log(`⚡ Processing time: ${result.metadata.processing_time}ms`)
      console.log(`✨ Enhanced: "${result.enhanced_prompt}"`)
      console.log(`🚫 Negative: "${result.suggested_negative_prompt}"`)
      
      if (result.applied_concepts.length > 0) {
        console.log('📝 Detected concepts:')
        result.applied_concepts.forEach(concept => {
          console.log(`   - ${concept.type}: ${concept.name} (${(concept.confidence * 100).toFixed(1)}%)`)
        })
      }
      
      console.log('🔧 Applied enhancements:')
      result.enhancement_details.forEach(detail => {
        console.log(`   - ${detail.category}: ${detail.text} (weight: ${detail.weight.toFixed(2)})`)
      })
      
    } catch (error) {
      console.error(`❌ Error testing prompt: ${error}`)
    }
    
    console.log('\n---\n')
  }
  
  console.log('=== Test Complete ===\n')
}

/**
 * Debug function to analyze taxonomy coverage
 */
export function analyzeTaxonomyCoverage(): void {
  console.log('\n=== EGP Taxonomy Coverage Analysis ===\n')
  
  const taxonomy = require('./egp-taxonomy').EGP_CONCEPT_TAXONOMY
  
  Object.entries(taxonomy).forEach(([category, items]) => {
    console.log(`📁 ${category.toUpperCase()}:`)
    console.log(`   Items: ${Object.keys(items).length}`)
    
    Object.entries(items).forEach(([itemName, itemData]: [string, any]) => {
      const synonymCount = itemData.synonyms?.length || 0
      const cuesCount = itemData.visual_cues?.length || 0
      const brandAlignment = itemData.brand_alignment || itemData.brand_relevance || itemData.brand_fit || 'N/A'
      
      console.log(`   - ${itemName}: ${synonymCount} synonyms, ${cuesCount} cues, alignment: ${brandAlignment}`)
    })
    
    console.log('')
  })
  
  console.log('=== Analysis Complete ===\n')
}
