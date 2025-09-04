/**
 * Semantic Parser for Advanced RAG System
 * 
 * This module parses user prompts to extract semantic concepts and map them
 * to the EGP concept taxonomy for intelligent enhancement.
 */

import { ParsedConcept, ConceptType } from './types'
import { EGP_CONCEPT_TAXONOMY } from './egp-taxonomy'

export class SemanticParser {
  private stopWords = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
    'to', 'was', 'will', 'with', 'very', 'quite', 'some', 'many'
  ])

  /**
   * Parse a prompt and extract semantic concepts
   */
  async parsePrompt(prompt: string): Promise<ParsedConcept[]> {
    const concepts: ParsedConcept[] = []
    const words = this.tokenizePrompt(prompt)
    
    // Extract different types of concepts
    concepts.push(...this.extractStyleConcepts(prompt, words))
    concepts.push(...this.extractMoodConcepts(prompt, words))
    concepts.push(...this.extractCompositionConcepts(prompt, words))
    concepts.push(...this.extractColorConcepts(prompt, words))
    concepts.push(...this.extractLightingConcepts(prompt, words))
    concepts.push(...this.extractSubjectConcepts(prompt, words))

    // Sort by confidence and remove duplicates
    return this.deduplicateAndRank(concepts)
  }

  /**
   * Tokenize prompt into useful words and phrases
   */
  private tokenizePrompt(prompt: string): string[] {
    return prompt
      .toLowerCase()
      .replace(/[^\w\s-]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !this.stopWords.has(word))
  }

  /**
   * Extract photography style concepts
   */
  private extractStyleConcepts(prompt: string, words: string[]): ParsedConcept[] {
    const concepts: ParsedConcept[] = []
    const styles = EGP_CONCEPT_TAXONOMY.photography_styles

    for (const [styleName, styleData] of Object.entries(styles)) {
      let confidence = 0
      let matchedTerms: string[] = []

      // Check for direct style mentions
      if (prompt.toLowerCase().includes(styleName)) {
        confidence += 0.8
        matchedTerms.push(styleName)
      }

      // Check for synonyms
      for (const synonym of styleData.synonyms) {
        if (prompt.toLowerCase().includes(synonym)) {
          confidence += 0.6
          matchedTerms.push(synonym)
        }
      }

      // Check for visual cues
      for (const cue of styleData.visual_cues) {
        const cueWords = cue.toLowerCase().split(' ')
        if (cueWords.some(cueWord => words.includes(cueWord))) {
          confidence += 0.3
          matchedTerms.push(cue)
        }
      }

      if (confidence > 0.2) {
        concepts.push({
          type: 'style',
          name: styleName,
          confidence: Math.min(confidence, 1.0),
          original_text: matchedTerms.join(', '),
          position_in_prompt: this.findPositionInPrompt(prompt, matchedTerms[0] || styleName),
          context_words: this.extractContextWords(prompt, matchedTerms[0] || styleName)
        })
      }
    }

    return concepts
  }

  /**
   * Extract mood concepts
   */
  private extractMoodConcepts(prompt: string, words: string[]): ParsedConcept[] {
    const concepts: ParsedConcept[] = []
    const moods = EGP_CONCEPT_TAXONOMY.moods

    for (const [moodName, moodData] of Object.entries(moods)) {
      let confidence = 0
      let matchedTerms: string[] = []

      // Check for direct mood mentions
      if (prompt.toLowerCase().includes(moodName)) {
        confidence += 0.9
        matchedTerms.push(moodName)
      }

      // Check for visual cues
      for (const cue of moodData.visual_cues) {
        const cueWords = cue.toLowerCase().split(' ')
        if (cueWords.some(cueWord => words.includes(cueWord))) {
          confidence += 0.4
          matchedTerms.push(cue)
        }
      }

      // Check for color associations
      for (const color of moodData.color_associations) {
        const colorWords = color.toLowerCase().split(' ')
        if (colorWords.some(colorWord => words.includes(colorWord))) {
          confidence += 0.3
          matchedTerms.push(color)
        }
      }

      if (confidence > 0.25) {
        concepts.push({
          type: 'mood',
          name: moodName,
          confidence: Math.min(confidence, 1.0),
          original_text: matchedTerms.join(', '),
          position_in_prompt: this.findPositionInPrompt(prompt, matchedTerms[0] || moodName),
          context_words: this.extractContextWords(prompt, matchedTerms[0] || moodName)
        })
      }
    }

    return concepts
  }

  /**
   * Extract composition concepts
   */
  private extractCompositionConcepts(prompt: string, words: string[]): ParsedConcept[] {
    const concepts: ParsedConcept[] = []
    const compositions = EGP_CONCEPT_TAXONOMY.compositions

    for (const [compName, compData] of Object.entries(compositions)) {
      let confidence = 0
      let matchedTerms: string[] = []

      // Check for composition type mentions
      if (prompt.toLowerCase().includes(compName)) {
        confidence += 0.8
        matchedTerms.push(compName)
      }

      // Check for composition rules
      for (const rule of compData.rules) {
        const ruleWords = rule.toLowerCase().split(' ')
        if (ruleWords.some(ruleWord => words.includes(ruleWord))) {
          confidence += 0.4
          matchedTerms.push(rule)
        }
      }

      // Check for framing preferences
      for (const frame of compData.framing_preferences) {
        const frameWords = frame.toLowerCase().split(' ')
        if (frameWords.some(frameWord => words.includes(frameWord))) {
          confidence += 0.3
          matchedTerms.push(frame)
        }
      }

      if (confidence > 0.2) {
        concepts.push({
          type: 'composition',
          name: compName,
          confidence: Math.min(confidence, 1.0),
          original_text: matchedTerms.join(', '),
          position_in_prompt: this.findPositionInPrompt(prompt, matchedTerms[0] || compName),
          context_words: this.extractContextWords(prompt, matchedTerms[0] || compName)
        })
      }
    }

    return concepts
  }

  /**
   * Extract color concepts
   */
  private extractColorConcepts(prompt: string, words: string[]): ParsedConcept[] {
    const concepts: ParsedConcept[] = []
    const colors = EGP_CONCEPT_TAXONOMY.colors

    for (const [colorName, colorData] of Object.entries(colors)) {
      let confidence = 0
      let matchedTerms: string[] = []

      // Check for color name mentions
      if (prompt.toLowerCase().includes(colorName.replace('egp_', '').replace('_', ' '))) {
        confidence += 0.9
        matchedTerms.push(colorName)
      }

      // Check for emotional associations
      for (const emotion of colorData.emotional_associations) {
        if (words.includes(emotion.toLowerCase())) {
          confidence += 0.4
          matchedTerms.push(emotion)
        }
      }

      // Check for usage context
      for (const context of colorData.usage_context) {
        const contextWords = context.toLowerCase().split(' ')
        if (contextWords.some(contextWord => words.includes(contextWord))) {
          confidence += 0.3
          matchedTerms.push(context)
        }
      }

      if (confidence > 0.2) {
        concepts.push({
          type: 'color',
          name: colorName,
          confidence: Math.min(confidence, 1.0),
          original_text: matchedTerms.join(', '),
          position_in_prompt: this.findPositionInPrompt(prompt, matchedTerms[0] || colorName),
          context_words: this.extractContextWords(prompt, matchedTerms[0] || colorName)
        })
      }
    }

    return concepts
  }

  /**
   * Extract lighting concepts
   */
  private extractLightingConcepts(prompt: string, words: string[]): ParsedConcept[] {
    const concepts: ParsedConcept[] = []
    const lighting = EGP_CONCEPT_TAXONOMY.lighting

    for (const [lightName, lightData] of Object.entries(lighting)) {
      let confidence = 0
      let matchedTerms: string[] = []

      // Check for technical terms
      for (const term of lightData.technical_terms) {
        const termWords = term.toLowerCase().split(' ')
        if (termWords.every(termWord => words.includes(termWord))) {
          confidence += 0.7
          matchedTerms.push(term)
        } else if (termWords.some(termWord => words.includes(termWord))) {
          confidence += 0.3
          matchedTerms.push(term)
        }
      }

      // Check for mood impact
      for (const mood of lightData.mood_impact) {
        if (words.includes(mood.toLowerCase())) {
          confidence += 0.4
          matchedTerms.push(mood)
        }
      }

      if (confidence > 0.2) {
        concepts.push({
          type: 'lighting',
          name: lightName,
          confidence: Math.min(confidence, 1.0),
          original_text: matchedTerms.join(', '),
          position_in_prompt: this.findPositionInPrompt(prompt, matchedTerms[0] || lightName),
          context_words: this.extractContextWords(prompt, matchedTerms[0] || lightName)
        })
      }
    }

    return concepts
  }

  /**
   * Extract subject concepts
   */
  private extractSubjectConcepts(prompt: string, words: string[]): ParsedConcept[] {
    const concepts: ParsedConcept[] = []
    const subjects = EGP_CONCEPT_TAXONOMY.subjects

    for (const [subjectName, subjectData] of Object.entries(subjects)) {
      let confidence = 0
      let matchedTerms: string[] = []

      // Check for category mentions
      for (const category of subjectData.categories) {
        const categoryWords = category.toLowerCase().split(' ')
        if (categoryWords.some(categoryWord => words.includes(categoryWord))) {
          confidence += 0.5
          matchedTerms.push(category)
        }
      }

      // Check for brand representation terms
      for (const brand of subjectData.brand_representation) {
        const brandWords = brand.toLowerCase().split(' ')
        if (brandWords.some(brandWord => words.includes(brandWord))) {
          confidence += 0.4
          matchedTerms.push(brand)
        }
      }

      if (confidence > 0.3) {
        concepts.push({
          type: 'subject',
          name: subjectName,
          confidence: Math.min(confidence, 1.0),
          original_text: matchedTerms.join(', '),
          position_in_prompt: this.findPositionInPrompt(prompt, matchedTerms[0] || subjectName),
          context_words: this.extractContextWords(prompt, matchedTerms[0] || subjectName)
        })
      }
    }

    return concepts
  }

  /**
   * Find position of term in prompt
   */
  private findPositionInPrompt(prompt: string, term: string): number {
    const index = prompt.toLowerCase().indexOf(term.toLowerCase())
    return index >= 0 ? index : 0
  }

  /**
   * Extract context words around a term
   */
  private extractContextWords(prompt: string, term: string): string[] {
    const words = prompt.toLowerCase().split(/\s+/)
    const termIndex = words.findIndex(word => word.includes(term.toLowerCase()))
    
    if (termIndex === -1) return []
    
    const start = Math.max(0, termIndex - 2)
    const end = Math.min(words.length, termIndex + 3)
    
    return words.slice(start, end).filter(word => !this.stopWords.has(word))
  }

  /**
   * Remove duplicates and rank concepts by confidence
   */
  private deduplicateAndRank(concepts: ParsedConcept[]): ParsedConcept[] {
    const uniqueConcepts = new Map<string, ParsedConcept>()

    for (const concept of concepts) {
      const key = `${concept.type}-${concept.name}`
      const existing = uniqueConcepts.get(key)
      
      if (!existing || concept.confidence > existing.confidence) {
        uniqueConcepts.set(key, concept)
      }
    }

    return Array.from(uniqueConcepts.values())
      .sort((a, b) => b.confidence - a.confidence)
  }

  /**
   * Get related concepts based on semantic similarity
   */
  getRelatedConcepts(concept: ParsedConcept): string[] {
    const related: string[] = []
    
    switch (concept.type) {
      case 'style':
        const style = EGP_CONCEPT_TAXONOMY.photography_styles[concept.name]
        if (style) {
          related.push(...style.synonyms)
          related.push(...style.visual_cues)
        }
        break
      case 'mood':
        const mood = EGP_CONCEPT_TAXONOMY.moods[concept.name]
        if (mood) {
          related.push(...mood.visual_cues)
          related.push(...mood.color_associations)
        }
        break
      // Add more cases as needed
    }
    
    return related
  }
}
