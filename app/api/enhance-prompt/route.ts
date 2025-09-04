import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json()

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    console.log("[RAG API] Enhancing prompt:", prompt)

    // Enhanced RAG system with platform-specific optimization
    let enhancement = null
    let ragMethod = "none"
    const useFullRAG = !process.env.VERCEL

    if (useFullRAG) {
      // In Railway/local environment, use full RAG system
      try {
        const { enhancePromptWithBranding } = await import("@/lib/rag-system")
        enhancement = await enhancePromptWithBranding(prompt)
        ragMethod = "full-rag"
        console.log("[RAG API] Using full RAG system")
      } catch (error) {
        console.warn("[RAG API] Full RAG failed, trying simple RAG:", error)
        try {
          const { enhanceWithEGPBranding } = await import("../simple-rag/route")
          enhancement = await enhanceWithEGPBranding(prompt)
          ragMethod = "simple-rag-fallback"
        } catch (fallbackError) {
          console.warn("[RAG API] All RAG methods failed:", fallbackError)
          enhancement = {
            enhancedPrompt: prompt,
            suggestedColors: [],
            brandingElements: []
          }
          ragMethod = "no-rag"
        }
      }
    } else {
      // In Vercel environment, use simple hardcoded RAG
      try {
        const { enhanceWithEGPBranding } = await import("../simple-rag/route")
        enhancement = await enhanceWithEGPBranding(prompt)
        ragMethod = "simple-rag"
        console.log("[RAG API] Using simple RAG in Vercel")
      } catch (error) {
        console.warn("[RAG API] Simple RAG failed:", error)
        enhancement = {
          enhancedPrompt: prompt,
          suggestedColors: [],
          brandingElements: []
        }
        ragMethod = "fallback"
      }
    }

    console.log("[RAG API] Enhanced prompt:", enhancement.enhancedPrompt || enhancement)

    return NextResponse.json({
      success: true,
      original_prompt: prompt,
      enhanced_prompt: enhancement.enhancedPrompt || enhancement,
      suggested_colors: enhancement.suggestedColors || [],
      suggested_format: enhancement.suggestedFormat || "high-quality, professional",
      negative_prompt: enhancement.negativePrompt || "low quality, blurry",
      branding_elements: enhancement.brandingElements || [],
      metadata: {
        elements_found: enhancement.brandingElements?.length || 0,
        colors_suggested: enhancement.suggestedColors?.length || 0,
        rag_method: ragMethod
      }
    })

  } catch (error) {
    console.error("[RAG API] Error enhancing prompt:", error)
    
    // Fallback: return original prompt if RAG fails
    try {
      const { prompt } = await request.json()
      return NextResponse.json({
        success: true,
        original_prompt: prompt,
        enhanced_prompt: prompt,
        suggested_colors: [],
        suggested_format: "high-quality, professional",
        negative_prompt: "low quality, blurry",
        branding_elements: [],
        metadata: {
          elements_found: 0,
          colors_suggested: 0,
          error: "RAG system unavailable"
        }
      })
    } catch (parseError) {
      return NextResponse.json({ 
        error: "Failed to enhance prompt",
        details: error instanceof Error ? error.message : "Unknown error"
      }, { status: 500 })
    }
  }
}
