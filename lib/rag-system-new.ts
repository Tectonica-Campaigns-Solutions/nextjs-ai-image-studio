// Enhanced RAG system with persistent file storage
export { enhancePromptWithBranding, initializeRAGSystem } from './rag-system-optimized'

// Fallback exports for compatibility
export async function enhancePromptSimple(prompt: string) {
  return {
    enhancedPrompt: `${prompt}, lifestyle photography style, warm colors, EGP branding`,
    suggestedColors: ['#ef404e', '#0055aa'],
    brandingElements: []
  }
}
