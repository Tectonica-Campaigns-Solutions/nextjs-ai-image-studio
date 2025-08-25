import { NextRequest, NextResponse } from "next/server"

export async function GET() {
  try {
    console.log('[TEST-RAG] Starting RAG system test');
    console.log('[TEST-RAG] Environment:', process.env.VERCEL ? 'Vercel' : 'Local');
    
    // Dynamic import for Vercel compatibility
    const getRAGSystem = async () => {
      if (process.env.VERCEL) {
        try {
          const module = await import("@/lib/rag-system")
          return module.enhancePromptWithBranding
        } catch (error) {
          console.error("[TEST-RAG] RAG system not available in Vercel environment:", error)
          return null
        }
      } else {
        const { enhancePromptWithBranding } = await import("@/lib/rag-system")
        return enhancePromptWithBranding
      }
    }

    const enhancePromptWithBranding = await getRAGSystem()
    
    if (!enhancePromptWithBranding) {
      return NextResponse.json({
        success: false,
        error: "RAG system not available",
        environment: process.env.VERCEL ? 'Vercel' : 'Local'
      })
    }

    console.log('[TEST-RAG] Testing with sample prompt');
    const testPrompt = "people marching for civil rights"
    const result = await enhancePromptWithBranding(testPrompt)
    
    console.log('[TEST-RAG] Test completed successfully');
    
    return NextResponse.json({
      success: true,
      environment: process.env.VERCEL ? 'Vercel' : 'Local',
      testPrompt: testPrompt,
      result: {
        enhancedPrompt: result.enhancedPrompt,
        brandingElementsCount: result.brandingElements.length,
        suggestedColorsCount: result.suggestedColors.length,
        hasNegativePrompt: !!result.negativePrompt
      }
    })
    
  } catch (error) {
    console.error('[TEST-RAG] Error testing RAG system:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      environment: process.env.VERCEL ? 'Vercel' : 'Local'
    }, { status: 500 })
  }
}
