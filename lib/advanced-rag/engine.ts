/**
 * Advanced RAG Engine
 * 
 * This is the main engine that coordinates semantic parsing, vector search,
 * dynamic weighting, and prompt enhancement for the EGP brand system.
 */

import { 
  EnhancedPrompt, 
  BrandContext, 
  ParsedConcept, 
  VectorSearchResult,
  AdvancedRAGConfig 
} from './types'
import { EGP_CONCEPT_TAXONOMY } from './egp-taxonomy'
import { SemanticParser } from './semantic-parser'

export class AdvancedRAGEngine {
  private parser: SemanticParser
  private config: AdvancedRAGConfig

  constructor(config?: Partial<AdvancedRAGConfig>) {
    this.parser = new SemanticParser()
    this.config = {
      enable_semantic_parsing: true,
      enable_vector_search: true,
      enable_dynamic_weighting: true,
      enable_conflict_resolution: true,
      similarity_threshold: 0.3,
      max_enhancements: 8,
      brand_alignment_weight: 0.8,
      context_window_size: 5,
      ...config
    }
  }

  /**
   * Main method to enhance a prompt with advanced RAG
   */
  async enhancePrompt(
    prompt: string, 
    brandContext?: BrandContext
  ): Promise<EnhancedPrompt> {
    const startTime = Date.now()
    
    try {
      // Step 1: Parse semantic concepts from prompt
      const parsedConcepts = this.config.enable_semantic_parsing 
        ? await this.parser.parsePrompt(prompt)
        : []

      // Step 2: Find relevant enhancements using vector search
      const searchResults = this.config.enable_vector_search
        ? await this.findRelevantEnhancements(parsedConcepts, prompt)
        : []

      // Step 3: Apply dynamic weighting
      const weightedResults = this.config.enable_dynamic_weighting
        ? this.applyDynamicWeights(searchResults, parsedConcepts, prompt)
        : searchResults

      // Step 4: Resolve conflicts and select best enhancements
      const selectedEnhancements = this.config.enable_conflict_resolution
        ? this.resolveConflicts(weightedResults)
        : weightedResults.slice(0, this.config.max_enhancements)

      // Step 5: Build enhanced prompt
      const enhancedPrompt = this.buildEnhancedPrompt(prompt, selectedEnhancements)

      // Step 6: Calculate scores and metadata
      const brandAlignmentScore = this.calculateBrandAlignment(parsedConcepts)
      const confidenceScore = this.calculateConfidence(parsedConcepts, selectedEnhancements)

      return {
        original_prompt: prompt,
        enhanced_prompt: enhancedPrompt,
        applied_concepts: parsedConcepts,
        enhancement_details: selectedEnhancements.map(result => ({
          category: result.concept_type,
          text: result.enhancement_text,
          weight: result.weight,
          reasoning: this.explainEnhancement(result, parsedConcepts)
        })),
        brand_alignment_score: brandAlignmentScore,
        confidence_score: confidenceScore,
        suggested_negative_prompt: this.generateNegativePrompt(parsedConcepts),
        metadata: {
          processing_time: Date.now() - startTime,
          concepts_found: parsedConcepts.length,
          enhancements_applied: selectedEnhancements.length,
          fallback_used: false
        }
      }

    } catch (error) {
      console.warn('[Advanced RAG] Enhancement failed, using fallback:', error)
      return this.getFallbackEnhancement(prompt, startTime)
    }
  }

  /**
   * Find relevant enhancements based on parsed concepts
   */
  private async findRelevantEnhancements(
    concepts: ParsedConcept[], 
    prompt: string
  ): Promise<VectorSearchResult[]> {
    const results: VectorSearchResult[] = []

    for (const concept of concepts) {
      const enhancements = this.getEnhancementsForConcept(concept, prompt)
      results.push(...enhancements)
    }

    // Add general EGP enhancements if no specific concepts found
    if (concepts.length === 0) {
      results.push(...this.getDefaultEGPEnhancements(prompt))
    }

    return results
      .filter(result => result.similarity >= this.config.similarity_threshold)
      .sort((a, b) => b.similarity - a.similarity)
  }

  /**
   * Get enhancements for a specific concept
   */
  private getEnhancementsForConcept(concept: ParsedConcept, prompt: string): VectorSearchResult[] {
    const results: VectorSearchResult[] = []

    switch (concept.type) {
      case 'style':
        const style = EGP_CONCEPT_TAXONOMY.photography_styles[concept.name]
        if (style) {
          results.push({
            concept: concept.name,
            concept_type: 'style',
            similarity: concept.confidence,
            context_match: this.calculateContextMatch(concept, prompt),
            brand_alignment: style.brand_alignment,
            enhancement_text: this.buildStyleEnhancement(style),
            weight: concept.confidence * style.brand_alignment
          })
        }
        break

      case 'mood':
        const mood = EGP_CONCEPT_TAXONOMY.moods[concept.name]
        if (mood) {
          results.push({
            concept: concept.name,
            concept_type: 'mood',
            similarity: concept.confidence,
            context_match: this.calculateContextMatch(concept, prompt),
            brand_alignment: 0.9, // Moods generally align well with EGP
            enhancement_text: this.buildMoodEnhancement(mood),
            weight: concept.confidence * 0.9
          })
        }
        break

      case 'composition':
        const comp = EGP_CONCEPT_TAXONOMY.compositions[concept.name]
        if (comp) {
          results.push({
            concept: concept.name,
            concept_type: 'composition',
            similarity: concept.confidence,
            context_match: this.calculateContextMatch(concept, prompt),
            brand_alignment: 0.8,
            enhancement_text: this.buildCompositionEnhancement(comp),
            weight: concept.confidence * 0.8
          })
        }
        break

      case 'color':
        const color = EGP_CONCEPT_TAXONOMY.colors[concept.name]
        if (color) {
          results.push({
            concept: concept.name,
            concept_type: 'color',
            similarity: concept.confidence,
            context_match: this.calculateContextMatch(concept, prompt),
            brand_alignment: color.brand_relevance,
            enhancement_text: this.buildColorEnhancement(color),
            weight: concept.confidence * color.brand_relevance
          })
        }
        break

      case 'lighting':
        const lighting = EGP_CONCEPT_TAXONOMY.lighting[concept.name]
        if (lighting) {
          results.push({
            concept: concept.name,
            concept_type: 'lighting',
            similarity: concept.confidence,
            context_match: this.calculateContextMatch(concept, prompt),
            brand_alignment: lighting.brand_fit,
            enhancement_text: this.buildLightingEnhancement(lighting),
            weight: concept.confidence * lighting.brand_fit
          })
        }
        break

      case 'subject':
        const subject = EGP_CONCEPT_TAXONOMY.subjects[concept.name]
        if (subject) {
          results.push({
            concept: concept.name,
            concept_type: 'subject',
            similarity: concept.confidence,
            context_match: this.calculateContextMatch(concept, prompt),
            brand_alignment: 0.85,
            enhancement_text: this.buildSubjectEnhancement(subject),
            weight: concept.confidence * 0.85
          })
        }
        break
    }

    return results
  }

  /**
   * Apply dynamic weighting based on context and brand alignment
   */
  private applyDynamicWeights(
    results: VectorSearchResult[], 
    concepts: ParsedConcept[], 
    prompt: string
  ): VectorSearchResult[] {
    return results.map(result => {
      let adjustedWeight = result.weight

      // Boost if multiple concepts point to similar enhancement
      const relatedConcepts = concepts.filter(c => 
        this.areConceptsRelated(c, result.concept, result.concept_type)
      )
      if (relatedConcepts.length > 1) {
        adjustedWeight *= 1.3
      }

      // Boost for high brand alignment
      if (result.brand_alignment > 0.8) {
        adjustedWeight *= 1.2
      }

      // Reduce for potential conflicts
      const conflictingResults = results.filter(r => 
        r !== result && this.areEnhancementsConflicting(result, r)
      )
      if (conflictingResults.length > 0) {
        adjustedWeight *= 0.8
      }

      return {
        ...result,
        weight: Math.min(adjustedWeight, 1.0)
      }
    })
  }

  /**
   * Resolve conflicts between competing enhancements
   */
  private resolveConflicts(results: VectorSearchResult[]): VectorSearchResult[] {
    const resolved: VectorSearchResult[] = []
    const used = new Set<string>()

    // Sort by weight (highest first)
    const sorted = results.sort((a, b) => b.weight - a.weight)

    for (const result of sorted) {
      if (resolved.length >= this.config.max_enhancements) break

      // Check for conflicts with already selected enhancements
      const hasConflict = resolved.some(selected => 
        this.areEnhancementsConflicting(result, selected)
      )

      if (!hasConflict) {
        resolved.push(result)
        used.add(`${result.concept_type}-${result.concept}`)
      }
    }

    return resolved
  }

  /**
   * Build the enhanced prompt from selected enhancements
   */
  private buildEnhancedPrompt(prompt: string, enhancements: VectorSearchResult[]): string {
    const enhancementTexts = enhancements
      .sort((a, b) => b.weight - a.weight)
      .map(e => e.enhancement_text)
      .filter(text => text.trim().length > 0)

    if (enhancementTexts.length === 0) {
      return `${prompt}, EGP lifestyle photography style, sustainable, authentic, welcoming`
    }

    return `${prompt}, ${enhancementTexts.join(', ')}`
  }

  /**
   * Helper methods for building specific enhancement types
   */
  private buildStyleEnhancement(style: any): string {
    const elements = [
      ...style.visual_cues.slice(0, 3),
      ...style.synonyms.slice(0, 2)
    ]
    return elements.join(', ')
  }

  private buildMoodEnhancement(mood: any): string {
    return [
      ...mood.visual_cues.slice(0, 2),
      ...mood.color_associations.slice(0, 2)
    ].join(', ')
  }

  private buildCompositionEnhancement(comp: any): string {
    return [
      ...comp.rules.slice(0, 2),
      ...comp.framing_preferences.slice(0, 1)
    ].join(', ')
  }

  private buildColorEnhancement(color: any): string {
    return [
      ...color.emotional_associations.slice(0, 2),
      `${color.hex_values[0]} color palette`
    ].join(', ')
  }

  private buildLightingEnhancement(lighting: any): string {
    return [
      ...lighting.technical_terms.slice(0, 2),
      ...lighting.mood_impact.slice(0, 1)
    ].join(', ')
  }

  private buildSubjectEnhancement(subject: any): string {
    return [
      ...subject.brand_representation.slice(0, 2),
      ...subject.composition_requirements.slice(0, 1)
    ].join(', ')
  }

  /**
   * Helper methods for calculations
   */
  private calculateContextMatch(concept: ParsedConcept, prompt: string): number {
    const contextRelevance = concept.context_words.length > 0 ? 0.8 : 0.5
    const positionRelevance = concept.position_in_prompt < prompt.length * 0.3 ? 0.9 : 0.7
    return (contextRelevance + positionRelevance) / 2
  }

  private calculateBrandAlignment(concepts: ParsedConcept[]): number {
    if (concepts.length === 0) return 0.7

    const alignmentScores = concepts.map(concept => {
      switch (concept.type) {
        case 'style':
          const style = EGP_CONCEPT_TAXONOMY.photography_styles[concept.name]
          return style ? style.brand_alignment : 0.5
        case 'color':
          const color = EGP_CONCEPT_TAXONOMY.colors[concept.name]
          return color ? color.brand_relevance : 0.5
        case 'lighting':
          const lighting = EGP_CONCEPT_TAXONOMY.lighting[concept.name]
          return lighting ? lighting.brand_fit : 0.5
        default:
          return 0.7
      }
    })

    return alignmentScores.reduce((sum, score) => sum + score, 0) / alignmentScores.length
  }

  private calculateConfidence(concepts: ParsedConcept[], enhancements: VectorSearchResult[]): number {
    const conceptConfidence = concepts.length > 0 
      ? concepts.reduce((sum, c) => sum + c.confidence, 0) / concepts.length 
      : 0.5
    
    const enhancementConfidence = enhancements.length > 0
      ? enhancements.reduce((sum, e) => sum + e.weight, 0) / enhancements.length
      : 0.5

    return (conceptConfidence + enhancementConfidence) / 2
  }

  private areConceptsRelated(concept: ParsedConcept, targetConcept: string, targetType: string): boolean {
    if (concept.type === targetType && concept.name === targetConcept) return true
    
    // Add logic for semantic relationships
    const relatedTerms = this.parser.getRelatedConcepts(concept)
    return relatedTerms.some(term => term.toLowerCase().includes(targetConcept.toLowerCase()))
  }

  private areEnhancementsConflicting(a: VectorSearchResult, b: VectorSearchResult): boolean {
    // Define conflicting pairs
    const conflicts = [
      ['corporate', 'lifestyle'],
      ['documentary', 'corporate'],
      ['bright_clear', 'warm_golden']
    ]

    return conflicts.some(([first, second]) => 
      (a.concept === first && b.concept === second) ||
      (a.concept === second && b.concept === first)
    )
  }

  private explainEnhancement(result: VectorSearchResult, concepts: ParsedConcept[]): string {
    const relatedConcepts = concepts.filter(c => 
      this.areConceptsRelated(c, result.concept, result.concept_type)
    )
    
    if (relatedConcepts.length > 0) {
      return `Enhanced based on detected ${result.concept_type}: ${result.concept}`
    }
    
    return `Applied EGP ${result.concept_type} guidelines for brand consistency`
  }

  private generateNegativePrompt(concepts: ParsedConcept[]): string {
    const baseNegative = "low quality, blurry, distorted, artificial, corporate stock photo"
    
    // Add specific negatives based on detected concepts
    const additionalNegatives: string[] = []
    
    if (concepts.some(c => c.type === 'style' && c.name === 'lifestyle')) {
      additionalNegatives.push("overly posed, artificial lighting, corporate setting")
    }
    
    if (concepts.some(c => c.type === 'mood' && c.name === 'welcoming')) {
      additionalNegatives.push("aggressive, confrontational, exclusive")
    }

    return additionalNegatives.length > 0 
      ? `${baseNegative}, ${additionalNegatives.join(', ')}`
      : baseNegative
  }

  private getDefaultEGPEnhancements(prompt: string): VectorSearchResult[] {
    return [
      {
        concept: 'lifestyle',
        concept_type: 'style',
        similarity: 0.7,
        context_match: 0.6,
        brand_alignment: 0.95,
        enhancement_text: 'lifestyle photography, authentic, sustainable, community-focused',
        weight: 0.8
      },
      {
        concept: 'egp_green',
        concept_type: 'color',
        similarity: 0.8,
        context_match: 0.7,
        brand_alignment: 1.0,
        enhancement_text: 'EGP green color palette, sustainable tones, environmental themes',
        weight: 0.9
      }
    ]
  }

  private getFallbackEnhancement(prompt: string, startTime: number): EnhancedPrompt {
    return {
      original_prompt: prompt,
      enhanced_prompt: `${prompt}, EGP lifestyle photography, sustainable, authentic, diverse representation, welcoming atmosphere`,
      applied_concepts: [],
      enhancement_details: [{
        category: 'fallback',
        text: 'EGP lifestyle photography, sustainable, authentic',
        weight: 0.7,
        reasoning: 'Applied default EGP branding due to parsing failure'
      }],
      brand_alignment_score: 0.8,
      confidence_score: 0.6,
      suggested_negative_prompt: "low quality, blurry, corporate stock photo, artificial",
      metadata: {
        processing_time: Date.now() - startTime,
        concepts_found: 0,
        enhancements_applied: 1,
        fallback_used: true
      }
    }
  }
}
