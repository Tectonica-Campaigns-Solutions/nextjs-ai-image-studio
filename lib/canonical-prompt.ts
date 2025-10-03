import promptEnhancement from '../data/rag/prompt-enhacement.json';

interface CanonicalPromptConfig {
  userInput?: string;
  keepOptions?: {
    identity?: boolean;
    pose?: boolean;
    layout?: boolean;
    text?: boolean;
  };
  preserveOptions?: {
    preserve_primary?: boolean;
  };
  combineOptions?: {
    force_integration?: boolean;
  };
  preserveSecondaryOptions?: {
    architectural_elements?: boolean;
    statues_sculptures?: boolean;
    furniture_objects?: boolean;
    decorative_items?: boolean;
    structural_features?: boolean;
    text_signs?: boolean;
    natural_elements?: boolean;
    vehicles_machinery?: boolean;
  };
  secondaryFidelityLevel?: 'strict' | 'moderate' | 'adaptive';
  applyStyle?: {
    texture?: string;
    overlay?: string;
  };
  subjectFraming?: string;
  subjectComposition?: string;
}

interface ProcessedPromptResult {
  canonicalPrompt: string;
  processedUserInput: string;
}

export class CanonicalPromptProcessor {
  private canonicalConfig = (promptEnhancement as any).canonical_prompt;

  /**
   * Process synonyms and cardinality mapping in user input
   */
  private processUserInput(input: string): string {
    if (!input) return '';

    let processed = input.toLowerCase();

    // Apply synonyms mapping
    Object.entries(this.canonicalConfig.synonyms).forEach(([key, value]) => {
      const regex = new RegExp(`\\b${key}\\b`, 'gi');
      processed = processed.replace(regex, String(value));
    });

    // Apply cardinality mapping
    Object.entries(this.canonicalConfig.cardinality_mapping).forEach(([key, value]) => {
      const regex = new RegExp(`\\b${key}\\b`, 'gi');
      processed = processed.replace(regex, String(value));
    });

    return processed;
  }

  /**
   * Build the KEEP section of the prompt
   */
  private buildKeepSection(keepOptions: CanonicalPromptConfig['keepOptions'] = {}): string {
    const defaults = this.canonicalConfig.keep_options;
    const selectedOptions: string[] = [];

    // Use provided options or defaults
    const finalOptions = {
      identity: keepOptions.identity !== undefined ? keepOptions.identity : defaults.identity.default,
      pose: keepOptions.pose !== undefined ? keepOptions.pose : defaults.pose.default,
      layout: keepOptions.layout !== undefined ? keepOptions.layout : defaults.layout.default,
      text: keepOptions.text !== undefined ? keepOptions.text : defaults.text.default,
    };

    // Build keep list
    Object.entries(finalOptions).forEach(([key, enabled]) => {
      if (enabled) {
        selectedOptions.push(key);
      }
    });

    return selectedOptions.length > 0 ? selectedOptions.join(', ') : 'original composition';
  }

  /**
   * Build the PRESERVE section of the prompt
   */
  private buildPreserveSection(preserveOptions: CanonicalPromptConfig['preserveOptions'] = {}): string {
    const defaults = this.canonicalConfig.preserve_options;
    
    const preservePrimary = preserveOptions.preserve_primary !== undefined ? 
      preserveOptions.preserve_primary : defaults.preserve_primary.default;

    if (preservePrimary) {
      return 'primary subject original colors, textures, and details';
    }
    
    return '';
  }

  /**
   * Build the COMBINE section of the prompt
   */
  private buildCombineSection(combineOptions: CanonicalPromptConfig['combineOptions'] = {}): string {
    const defaults = this.canonicalConfig.combine_options;
    
    const forceIntegration = combineOptions.force_integration !== undefined ? 
      combineOptions.force_integration : defaults.force_integration.default;

    if (forceIntegration) {
      return 'ensure visible integration of secondary image elements';
    }
    
    return '';
  }

  /**
   * Build the PRESERVE_SECONDARY section of the prompt
   */
  private buildPreserveSecondarySection(
    preserveSecondaryOptions: CanonicalPromptConfig['preserveSecondaryOptions'] = {},
    fidelityLevel: CanonicalPromptConfig['secondaryFidelityLevel'] = 'moderate'
  ): string {
    const defaults = this.canonicalConfig.preserve_secondary_options;
    
    // Collect active preservation options
    const activeOptions: string[] = [];
    
    Object.entries(preserveSecondaryOptions).forEach(([key, value]) => {
      const defaultValue = (defaults as any)[key]?.default;
      const isActive = value !== undefined ? value : defaultValue;
      if (isActive) {
        const optionConfig = (defaults as any)[key];
        if (optionConfig) {
          // Convert key to readable format
          const readableKey = key.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
          activeOptions.push(readableKey);
        }
      }
    });

    if (activeOptions.length === 0) {
      return '';
    }

    // Build fidelity instruction based on level
    const fidelityConfig = this.canonicalConfig.secondary_fidelity_levels;
    let fidelityInstruction = '';
    
    switch (fidelityLevel) {
      case 'strict':
        fidelityInstruction = 'exactly as they appear in the secondary image. Maintain their original proportions, materials, and details without any modifications';
        break;
      case 'moderate':
        fidelityInstruction = 'as they appear in the secondary image while allowing minor stylistic adjustments to match the overall aesthetic';
        break;
      case 'adaptive':
        fidelityInstruction = 'while adapting their style to match the primary image aesthetic, but keeping their essential characteristics and recognizable features';
        break;
      default:
        fidelityInstruction = 'as they appear in the secondary image while allowing minor stylistic adjustments';
    }

    return `Keep all existing ${activeOptions.join(', ')} ${fidelityInstruction}`;
  }

  /**
   * Build the APPLY section of the prompt
   */
  private buildApplySection(applyStyle: CanonicalPromptConfig['applyStyle'] = {}): string {
    const styleConfig = this.canonicalConfig.apply_style;
    const paletteConfig = this.canonicalConfig.hardcoded_palette;

    const texture = applyStyle.texture || styleConfig.texture.default;
    const overlay = applyStyle.overlay || styleConfig.overlay.default;

    // Build parts array and only include non-'none' values
    const parts = [`palette ${paletteConfig.description}`];
    
    if (texture && texture !== 'none') {
      parts.push(`texture ${texture}`);
    }
    
    if (overlay && overlay !== 'none') {
      parts.push(`overlay ${overlay}`);
    }

    return parts.join(', ');
  }

  /**
   * Build the SUBJECT section
   */
  private buildSubjectSection(framing?: string, composition?: string): string {
    const subjectConfig = this.canonicalConfig.subject_templates;
    
    const selectedFraming = framing || subjectConfig.framing.default;
    const selectedComposition = composition || subjectConfig.composition.default;

    return `${selectedFraming}, ${selectedComposition}`;
  }

  /**
   * Build the QUALITY section
   */
  private buildQualitySection(): string {
    return this.canonicalConfig.quality_standards.join(', ');
  }

  /**
   * Build the NEGATIVE section
   */
  private buildNegativeSection(): string {
    return promptEnhancement.enforced_negatives.join(', ');
  }

  /**
   * Generate the complete canonical prompt
   */
  public generateCanonicalPrompt(config: CanonicalPromptConfig = {}): ProcessedPromptResult {
    const processedUserInput = this.processUserInput(config.userInput || '');
    
    // Build task section
    const taskPrefix = processedUserInput ? `${processedUserInput}. ` : '';
    const taskSection = `TASK: ${taskPrefix}${this.canonicalConfig.base_task}`;

    // Build all sections
    const preserveSection = this.buildPreserveSection(config.preserveOptions);
    const preserveSecondarySection = this.buildPreserveSecondarySection(
      config.preserveSecondaryOptions, 
      config.secondaryFidelityLevel
    );
    const keepSection = `KEEP (do not change): ${this.buildKeepSection(config.keepOptions)}.`;
    const applySection = `APPLY (style): ${this.buildApplySection(config.applyStyle)}.`;
    const combineSection = this.buildCombineSection(config.combineOptions);
    const subjectSection = `SUBJECT: ${this.buildSubjectSection(config.subjectFraming, config.subjectComposition)}.`;
    const qualitySection = `QUALITY: ${this.buildQualitySection()}.`;
    const negativeSection = `NEGATIVE: ${this.buildNegativeSection()}.`;

    // Combine all sections (only include non-empty optional sections)
    const sections = [taskSection];
    
    if (preserveSection) {
      sections.push('', `PRESERVE (keep exactly): ${preserveSection}.`);
    }
    
    if (preserveSecondarySection) {
      sections.push('', `PRESERVE_SECONDARY: ${preserveSecondarySection}.`);
    }
    
    sections.push('', keepSection, applySection);
    
    if (combineSection) {
      sections.push(`COMBINE (mandatory): ${combineSection}.`);
    }
    
    sections.push('', subjectSection, qualitySection, negativeSection);

    const canonicalPrompt = sections.join('\n');

    return {
      canonicalPrompt,
      processedUserInput
    };
  }

  /**
   * Get available options for UI components
   */
  public getAvailableOptions() {
    console.log('[CANONICAL-DEBUG] Loading options from config...');
    console.log('[CANONICAL-DEBUG] Apply style config:', this.canonicalConfig.apply_style);
    console.log('[CANONICAL-DEBUG] Texture options:', this.canonicalConfig.apply_style?.texture?.options);
    console.log('[CANONICAL-DEBUG] Overlay options:', this.canonicalConfig.apply_style?.overlay?.options);
    
    const options = {
      texture: this.canonicalConfig.apply_style?.texture?.options || [],
      overlay: this.canonicalConfig.apply_style?.overlay?.options || [],
      framing: this.canonicalConfig.subject_templates?.framing?.options || [],
      composition: this.canonicalConfig.subject_templates?.composition?.options || [],
      keepOptions: this.canonicalConfig.keep_options || {},
      preserveOptions: this.canonicalConfig.preserve_options || {},
      combineOptions: this.canonicalConfig.combine_options || {},
      preserveSecondaryOptions: this.canonicalConfig.preserve_secondary_options || {},
      secondaryFidelityLevels: this.canonicalConfig.secondary_fidelity_levels || {}
    };
    
    console.log('[CANONICAL-DEBUG] Final options object:', options);
    return options;
  }

  /**
   * Get default configuration
   */
  public getDefaults(): Required<CanonicalPromptConfig> {
    return {
      userInput: '',
      keepOptions: {
        identity: this.canonicalConfig.keep_options.identity.default,
        pose: this.canonicalConfig.keep_options.pose.default,
        layout: this.canonicalConfig.keep_options.layout.default,
        text: this.canonicalConfig.keep_options.text.default,
      },
      preserveOptions: {
        preserve_primary: this.canonicalConfig.preserve_options.preserve_primary.default,
      },
      combineOptions: {
        force_integration: this.canonicalConfig.combine_options.force_integration.default,
      },
      preserveSecondaryOptions: {
        architectural_elements: this.canonicalConfig.preserve_secondary_options.architectural_elements.default,
        statues_sculptures: this.canonicalConfig.preserve_secondary_options.statues_sculptures.default,
        furniture_objects: this.canonicalConfig.preserve_secondary_options.furniture_objects.default,
        decorative_items: this.canonicalConfig.preserve_secondary_options.decorative_items.default,
        structural_features: this.canonicalConfig.preserve_secondary_options.structural_features.default,
        text_signs: this.canonicalConfig.preserve_secondary_options.text_signs.default,
        natural_elements: this.canonicalConfig.preserve_secondary_options.natural_elements.default,
        vehicles_machinery: this.canonicalConfig.preserve_secondary_options.vehicles_machinery.default,
      },
      secondaryFidelityLevel: 'moderate' as const,
      applyStyle: {
        texture: this.canonicalConfig.apply_style?.texture?.default || "none",
        overlay: this.canonicalConfig.apply_style?.overlay?.default || "none",
      },
      subjectFraming: this.canonicalConfig.subject_templates.framing.default,
      subjectComposition: this.canonicalConfig.subject_templates.composition.default,
    };
  }
}

// Export a singleton instance
export const canonicalPromptProcessor = new CanonicalPromptProcessor();

// Export types for use in other files
export type { CanonicalPromptConfig, ProcessedPromptResult };