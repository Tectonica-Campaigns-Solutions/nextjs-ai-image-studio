import { NextRequest, NextResponse } from "next/server"

// Hardcoded ACLU branding enhancement - guaranteed to work in Vercel
export function enhanceWithACLUBranding(userPrompt: string) {
  console.log('[SIMPLE-RAG] Processing prompt:', userPrompt);
  
  let enhancedPrompt = userPrompt;
  
  // Add ACLU photographic style if not present
  const documentaryKeywords = ['documentary', 'photojournalism', 'protest', 'march', 'civil rights'];
  const hasDocumentaryStyle = documentaryKeywords.some(keyword => 
    userPrompt.toLowerCase().includes(keyword.toLowerCase())
  );
  
  if (!hasDocumentaryStyle) {
    enhancedPrompt += ', documentary photography style, photojournalism, high contrast, natural daylight, authentic and real';
  }
  
  // Add specific ACLU elements for people/protest scenes
  if (userPrompt.toLowerCase().includes('people') || 
      userPrompt.toLowerCase().includes('person') ||
      userPrompt.toLowerCase().includes('group') ||
      userPrompt.toLowerCase().includes('crowd')) {
    enhancedPrompt += ', diverse group of people, determined expressions, unity and solidarity';
  }
  
  const result = {
    enhancedPrompt,
    brandingElements: [
      { category: 'style', text: 'documentary photography style' },
      { category: 'lighting', text: 'natural daylight' },
      { category: 'treatment', text: 'high contrast' }
    ],
    suggestedColors: [
      'ACLU Red: #ef404e',
      'ACLU Blue: #002f6c'
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
    const enhancement = enhanceWithACLUBranding(prompt);
    
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
