/**
 * Canonical Prompt Generation System
 * 
 * This module provides structured prompt generation for text-to-image generation,
 * different from the image combination system. It focuses on generating images
 * from scratch with specific subject, appearance, style, and element configurations.
 */

// Configuration interfaces for generation-specific canonical prompts
export interface GenerationCanonicalConfig {
  subject: {
    type: 'individual' | 'group' | 'crowd' | 'object'
    objectDescription?: string  // For type: 'object'
    groupSize?: number         // For type: 'group' (2-5)
  }
  
  appearance: {
    colorRelevance: string[]   // Selected brand colors
    colorIntensity: 'subtle' | 'moderate' | 'prominent'
  }
  
  style: {
    type: 'realistic' | 'illustrative'
  }
  
  elements: {
    landmark?: string          // Free text
    city?: string             // Autocomplete selection
    others?: string           // Free text for additional elements
  }
  
  modifiers: {
    positives: string         // Terms to enhance
    negatives: string         // Terms to avoid
  }
}

// Generation-specific options loaded from config
export interface GenerationCanonicalOptions {
  subjects: {
    individual: string
    group: string
    crowd: string
    object: string
  }
  brandColors: string[]
  colorIntensity: {
    subtle: string
    moderate: string
    prominent: string
  }
  styles: {
    realistic: string
    illustrative: string
  }
  cities: string[]
  qualityStandards: string[]
}

/**
 * Generation Canonical Prompt Processor
 * Handles structured prompt generation for text-to-image creation
 */
export class GenerationCanonicalPromptProcessor {
  private options: GenerationCanonicalOptions | null = null
  private optionsPromise: Promise<void> | null = null

  constructor() {
    // Don't load options immediately in constructor
    // Wait for explicit call to avoid SSR issues
  }

  /**
   * Load generation-specific canonical options from configuration
   */
  private async loadOptions(): Promise<void> {
    try {
      // Load the configuration from public folder
      const response = await fetch('/generation-canonical-config.json')
      if (!response.ok) {
        throw new Error(`Failed to load config: ${response.status}`)
      }
      const config = await response.json()
      this.options = config.generation_canonical
      console.log('[Generation Canonical] Options loaded successfully')
    } catch (error) {
      console.error('[Generation Canonical] Failed to load options:', error)
      this.options = this.getDefaultOptions()
    }
  }

  /**
   * Ensure options are loaded before using them
   */
  private async ensureOptionsLoaded(): Promise<void> {
    if (this.options) {
      return // Already loaded
    }

    if (this.optionsPromise) {
      return this.optionsPromise // Already loading
    }

    this.optionsPromise = this.loadOptions()
    return this.optionsPromise
  }

  /**
   * Get default options if config file fails to load
   */
  private getDefaultOptions(): GenerationCanonicalOptions {
    return {
      subjects: {
        individual: "one person",
        group: "group of {count} people",
        crowd: "crowd of many people",
        object: "{description}"
      },
      brandColors: [
        "#6E3CCB deep violet",
        "#D8C8F0 light violet", 
        "#5C38F2 blue",
        "#F79533 orange"
      ],
      colorIntensity: {
        subtle: "with subtle color accents",
        moderate: "with balanced color presence",
        prominent: "with bold vibrant colors"
      },
      styles: {
        realistic: "photorealistic, high detail, professional photography",
        illustrative: "artistic illustration, stylized, digital art"
      },
      cities: [
        "New York", "London", "Paris", "Tokyo", "Madrid",
        "Barcelona", "Rome", "Amsterdam", "Berlin", "Sydney"
      ],
      qualityStandards: [
        "high detail",
        "clean composition",
        "professional quality",
        "crisp focus",
        "balanced lighting"
      ]
    }
  }

  /**
   * Get available options for UI configuration
   */
  public async getAvailableOptions(): Promise<GenerationCanonicalOptions | null> {
    await this.ensureOptionsLoaded()
    return this.options
  }

  /**
   * Generate canonical prompt for image generation
   */
  public async generateCanonicalPrompt(
    basePrompt: string,
    config: GenerationCanonicalConfig
  ): Promise<string> {
    await this.ensureOptionsLoaded()
    
    if (!this.options) {
      console.warn('[Generation Canonical] Options not loaded, using base prompt')
      return basePrompt
    }

    try {
      const sections: string[] = []

      // TASK section - always present
      const styleDetail = this.options.styles[config.style.type] || config.style.type
      sections.push(`TASK: Generate a ${styleDetail} image`)

      // SUBJECT section
      const subjectText = this.buildSubjectText(config.subject)
      if (subjectText) {
        sections.push(`SUBJECT: ${subjectText}`)
      }

      // APPEARANCE section - color palette
      const appearanceText = this.buildAppearanceText(config.appearance)
      if (appearanceText) {
        sections.push(`APPEARANCE: ${appearanceText}`)
      }

      // LOCATION section - city and landmark
      const locationText = this.buildLocationText(config.elements)
      if (locationText) {
        sections.push(`LOCATION: ${locationText}`)
      }

      // ELEMENTS section - additional elements
      if (config.elements.others?.trim()) {
        sections.push(`ELEMENTS: ${config.elements.others.trim()}`)
      }

      // USER PROMPT section - original user input
      if (basePrompt?.trim()) {
        sections.push(`PROMPT: ${basePrompt.trim()}`)
      }

      // ENHANCE section - positive modifiers
      const enhanceText = this.buildEnhanceText(config.modifiers.positives)
      if (enhanceText) {
        sections.push(`ENHANCE: ${enhanceText}`)
      }

      // AVOID section - negative modifiers  
      const avoidText = this.buildAvoidText(config.modifiers.negatives)
      if (avoidText) {
        sections.push(`AVOID: ${avoidText}`)
      }

      // QUALITY section - always include quality standards
      const qualityText = this.options.qualityStandards.join(', ')
      sections.push(`QUALITY: ${qualityText}`)

      const canonicalPrompt = sections.join('.\n\n') + '.'

      console.log('[Generation Canonical] Generated prompt:', canonicalPrompt)
      return canonicalPrompt

    } catch (error) {
      console.error('[Generation Canonical] Error generating prompt:', error)
      return basePrompt
    }
  }

  /**
   * Build subject text based on configuration
   */
  private buildSubjectText(subject: GenerationCanonicalConfig['subject']): string {
    if (!this.options) return ''

    switch (subject.type) {
      case 'individual':
        return this.options.subjects.individual

      case 'group':
        const count = subject.groupSize || 3
        return this.options.subjects.group.replace('{count}', count.toString())

      case 'crowd':
        return this.options.subjects.crowd

      case 'object':
        return subject.objectDescription?.trim() 
          ? this.options.subjects.object.replace('{description}', subject.objectDescription.trim())
          : ''

      default:
        return ''
    }
  }

  /**
   * Build appearance text for color relevance
   */
  private buildAppearanceText(appearance: GenerationCanonicalConfig['appearance']): string {
    if (!this.options) return ''

    const parts: string[] = []

    // Add selected colors
    if (appearance.colorRelevance.length > 0) {
      const colorText = appearance.colorRelevance.join(', ')
      parts.push(`Using color palette: ${colorText}`)
    }

    // Add color intensity
    const intensityText = this.options.colorIntensity[appearance.colorIntensity]
    if (intensityText) {
      parts.push(intensityText)
    }

    return parts.join(' ')
  }

  /**
   * Build location text from city and landmark
   */
  private buildLocationText(elements: GenerationCanonicalConfig['elements']): string {
    const parts: string[] = []

    if (elements.city?.trim()) {
      parts.push(`in ${elements.city.trim()}`)
    }

    if (elements.landmark?.trim()) {
      parts.push(`at ${elements.landmark.trim()}`)
    }

    return parts.join(', ')
  }

  /**
   * Build enhance text from positive modifiers
   */
  private buildEnhanceText(positives: string): string {
    const terms = positives?.trim()
    if (!terms) return ''

    // Split by common delimiters and clean up
    const enhanceTerms = terms
      .split(/[,;|\n]/)
      .map(term => term.trim())
      .filter(term => term.length > 0)

    return enhanceTerms.join(', ')
  }

  /**
   * Build avoid text from negative modifiers
   */
  private buildAvoidText(negatives: string): string {
    const terms = negatives?.trim()
    if (!terms) return ''

    // Split by common delimiters and clean up
    const avoidTerms = terms
      .split(/[,;|\n]/)
      .map(term => term.trim())
      .filter(term => term.length > 0)

    return avoidTerms.join(', ')
  }

  /**
   * Preview canonical prompt without full generation
   */
  public async previewCanonicalPrompt(
    basePrompt: string,
    config: GenerationCanonicalConfig
  ): Promise<string> {
    return this.generateCanonicalPrompt(basePrompt, config)
  }
}

// Export singleton instance
export const generationCanonicalPromptProcessor = new GenerationCanonicalPromptProcessor()

// Export default for easier importing
export default generationCanonicalPromptProcessor