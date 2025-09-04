import { NextRequest, NextResponse } from "next/server"

    // Try enhanced generation with EGP brand context first
export function enhanceWithEGPBranding(userPrompt: string) {
  console.log('[SIMPLE-RAG] Processing prompt:', userPrompt);
  
  let enhancedPrompt = userPrompt;
  
  // Add EGP photographic style if not present
  const lifestyleKeywords = ['lifestyle', 'photography', 'green', 'sustainable', 'nature'];
  const hasLifestyleStyle = lifestyleKeywords.some(keyword => 
    userPrompt.toLowerCase().includes(keyword.toLowerCase())
  );
  
  if (!hasLifestyleStyle) {
    enhancedPrompt += ', lifestyle photography style, sustainable, green living, natural colors, warm and welcoming';
  }
  
  // Add specific EGP elements for people/lifestyle scenes
  if (userPrompt.toLowerCase().includes('people') || 
      userPrompt.toLowerCase().includes('person') ||
      userPrompt.toLowerCase().includes('group') ||
      userPrompt.toLowerCase().includes('crowd')) {
    enhancedPrompt += ', diverse group of people, optimistic expressions, community and collaboration';
  }
  
  const result = {
    enhancedPrompt,
    brandingElements: [
      { category: 'style', text: 'lifestyle photography style' },
      { category: 'lighting', text: 'natural colors' },
      { category: 'treatment', text: 'warm and welcoming' }
    ],
    suggestedColors: [
      'EGP Green: #57B45F',
      'EGP Yellow: #FFDC2E',
      'EGP Pink: #FF70BD'
    ],
    suggestedFormat: {},
    negativePrompt: 'no text, no words, no signs with text, no letters, no logos, no branded content'
  };
  
  console.log('[SIMPLE-RAG] Enhanced prompt:', result.enhancedPrompt);
  return result;
}

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();
    
    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }
    
    console.log('[SIMPLE-RAG] Input prompt:', prompt);
    const enhancement = enhanceWithEGPBranding(prompt);
    
    return NextResponse.json({
      success: true,
      original: prompt,
      enhanced: enhancement.enhancedPrompt,
      metadata: {
        brandingElements: enhancement.brandingElements,
        suggestedColors: enhancement.suggestedColors,
        negativePrompt: enhancement.negativePrompt
      }
    });
    
  } catch (error) {
    console.error('[SIMPLE-RAG] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
