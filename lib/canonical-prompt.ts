// DEPRECATED: Canonical prompt functionality has been removed
// This stub file exists only to prevent compilation errors during migration

export interface CanonicalPromptConfig {
  userInput?: string;
  keepOptions?: any;
  preserveOptions?: any;
  combineOptions?: any;
  preserveSecondaryOptions?: any;
  secondaryFidelityLevel?: string;
  applyStyle?: any;
  subjectFraming?: string;
  subjectComposition?: string;
}

export class CanonicalPromptProcessor {
  generateCanonicalPrompt(config: any): any {
    console.warn("CanonicalPromptProcessor.generateCanonicalPrompt is deprecated and does nothing");
    return { canonicalPrompt: "", processedUserInput: "" };
  }
  
  getAvailableOptions(): any {
    console.warn("CanonicalPromptProcessor.getAvailableOptions is deprecated and does nothing");
    return {};
  }
}

export const canonicalPromptProcessor = new CanonicalPromptProcessor();
