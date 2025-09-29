import promptEnhancement from '../data/rag/prompt-enhacement.json';

interface CanonicalPromptConfig {
  userInput?: string;
  keepOptions?: {
    identity?: boolean;
    pose?: boolean;
    layout?: boolean;
    text?: boolean;
  };
  applyStyle?: {
    materials?: string;
    lighting?: string;
    texture?: string;
    contrast?: string;
  };
  styleBackground?: string;
  subjectFraming?: string;
  subjectComposition?: string;
}

interface ProcessedPromptResult {
  canonicalPrompt: string;
  processedUserInput: string;
}

export class CanonicalPromptProcessor {
  private canonicalConfig = promptEnhancement.canonical_prompt;

  /**
   * Process synonyms and cardinality mapping in user input
   */
  private processUserInput(input: string): string {
    if (!input) return '';

    let processed = input.toLowerCase();

    // Apply synonyms mapping
    Object.entries(this.canonicalConfig.synonyms).forEach(([key, value]) => {
      const regex = new RegExp(`\\b${key}\\b`, 'gi');
      processed = processed.replace(regex, value);
    });

    // Apply cardinality mapping
    Object.entries(this.canonicalConfig.cardinality_mapping).forEach(([key, value]) => {
      const regex = new RegExp(`\\b${key}\\b`, 'gi');
      processed = processed.replace(regex, value);
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
   * Build the APPLY section of the prompt
   */
  private buildApplySection(applyStyle: CanonicalPromptConfig['applyStyle'] = {}): string {
    const styleConfig = this.canonicalConfig.apply_style;
    const paletteConfig = this.canonicalConfig.hardcoded_palette;

    const materials = applyStyle.materials || styleConfig.materials.default;
    const lighting = applyStyle.lighting || styleConfig.lighting.default;
    const texture = applyStyle.texture || styleConfig.texture.default;
    const contrast = applyStyle.contrast || styleConfig.contrast.default;

    return `palette ${paletteConfig.description}, materials ${materials}, lighting ${lighting}, texture ${texture}, contrast ${contrast}`;
  }

  /**
   * Build the STYLE section for background
   */
  private buildStyleSection(styleBackground?: string): string {
    const backgroundOptions = this.canonicalConfig.style_backgrounds;
    const selectedBackground = styleBackground || backgroundOptions.default;
    
    return selectedBackground;
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
    const keepSection = `KEEP (do not change): ${this.buildKeepSection(config.keepOptions)}.`;
    const applySection = `APPLY (style): ${this.buildApplySection(config.applyStyle)}.`;
    const styleSection = `STYLE (background): ${this.buildStyleSection(config.styleBackground)}.`;
    const subjectSection = `SUBJECT: ${this.buildSubjectSection(config.subjectFraming, config.subjectComposition)}.`;
    const qualitySection = `QUALITY: ${this.buildQualitySection()}.`;
    const negativeSection = `NEGATIVE: ${this.buildNegativeSection()}.`;

    // Combine all sections
    const canonicalPrompt = [
      taskSection,
      '',
      keepSection,
      applySection,
      '',
      styleSection,
      subjectSection,
      qualitySection,
      negativeSection
    ].join('\n');

    return {
      canonicalPrompt,
      processedUserInput
    };
  }

  /**
   * Get available options for UI components
   */
  public getAvailableOptions() {
    return {
      materials: this.canonicalConfig.apply_style.materials.options,
      lighting: this.canonicalConfig.apply_style.lighting.options,
      texture: this.canonicalConfig.apply_style.texture.options,
      contrast: this.canonicalConfig.apply_style.contrast.options,
      styleBackgrounds: this.canonicalConfig.style_backgrounds.options,
      framing: this.canonicalConfig.subject_templates.framing.options,
      composition: this.canonicalConfig.subject_templates.composition.options,
      keepOptions: this.canonicalConfig.keep_options
    };
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
      applyStyle: {
        materials: this.canonicalConfig.apply_style.materials.default,
        lighting: this.canonicalConfig.apply_style.lighting.default,
        texture: this.canonicalConfig.apply_style.texture.default,
        contrast: this.canonicalConfig.apply_style.contrast.default,
      },
      styleBackground: this.canonicalConfig.style_backgrounds.default,
      subjectFraming: this.canonicalConfig.subject_templates.framing.default,
      subjectComposition: this.canonicalConfig.subject_templates.composition.default,
    };
  }
}

// Export a singleton instance
export const canonicalPromptProcessor = new CanonicalPromptProcessor();

// Export types for use in other files
export type { CanonicalPromptConfig, ProcessedPromptResult };