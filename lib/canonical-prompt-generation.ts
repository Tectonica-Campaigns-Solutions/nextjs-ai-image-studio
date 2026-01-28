// DEPRECATED: Generation canonical prompt functionality has been removed
// This stub file exists only to prevent compilation errors during migration

export interface GenerationCanonicalConfig {
  subject?: any;
  appearance?: any;
  style?: any;
  elements?: any;
  modifiers?: any;
}

export class GenerationCanonicalPromptProcessor {
  async generateCanonicalPrompt(prompt: string, config?: any): Promise<string> {
    console.warn("GenerationCanonicalPromptProcessor.generateCanonicalPrompt is deprecated, returning original prompt");
    return prompt;
  }
  
  async getAvailableOptions(): Promise<any> {
    console.warn("GenerationCanonicalPromptProcessor.getAvailableOptions is deprecated and returns empty object");
    return {};
  }
}

export const generationCanonicalPromptProcessor = new GenerationCanonicalPromptProcessor();
