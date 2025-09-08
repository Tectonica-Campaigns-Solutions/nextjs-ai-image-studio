import { type NextRequest, NextResponse } from "next/server"
import { fal } from "@fal-ai/client"
import { ContentModerationService } from "@/lib/content-moderation"

// Dynamic import for platform compatibility
async function getRAGSystem() {
  // Check if we should use full RAG (Railway, local) or simple RAG (Vercel)
  const useFullRAG = !process.env.VERCEL
  
  if (useFullRAG) {
    // In Railway/local environment, use optimized RAG system
    try {
      const { enhancePromptWithBranding } = await import("@/lib/rag-system-optimized")
      console.log('[RAG] Using optimized RAG system')
      return enhancePromptWithBranding
    } catch (error) {
      console.warn("Optimized RAG not available, falling back to simple RAG:", error)
      const { enhanceWithEGPBranding } = await import("../simple-rag/route")
      return enhanceWithEGPBranding
    }
  } else {
    // In Vercel environment, use simple hardcoded RAG
    try {
      const { enhanceWithEGPBranding } = await import("../simple-rag/route")
      console.log('[RAG] Using simple RAG system (Vercel)')
      return enhanceWithEGPBranding
    } catch (error) {
      console.warn("Simple RAG not available:", error)
      return null
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const prompt = formData.get("prompt") as string
    const settingsJson = formData.get("settings") as string
    const useRag = formData.get("useRag") === "true"
    const activeRAGId = formData.get("activeRAGId") as string
    const activeRAGName = formData.get("activeRAGName") as string
    const orgType = formData.get("orgType") as string || "general" // Organization type for moderation

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    console.log("[FLUX-PRO-MULTI] Multi-generation endpoint called")
    console.log("[FLUX-PRO-MULTI] Original prompt:", prompt)
    console.log("[FLUX-PRO-MULTI] Use RAG:", useRag)
    console.log("[FLUX-PRO-MULTI] Settings JSON:", settingsJson)
    
    // Log all form data for debugging
    console.log("[FLUX-PRO-MULTI] All FormData entries:")
    for (const [key, value] of formData.entries()) {
      console.log(`  ${key}: ${value}`)
    }

    // Content moderation check
    try {
      console.log("[MODERATION] Checking content for Flux Pro Multi prompt:", prompt.substring(0, 50) + "...")
      const moderationService = new ContentModerationService(orgType)
      const moderationResult = await moderationService.moderateContent({ prompt })
      
      if (!moderationResult.safe) {
        console.log("[MODERATION] Content blocked:", moderationResult.reason)
        return NextResponse.json({ 
          error: moderationResult.reason,
          category: moderationResult.category,
          blocked: true
        }, { status: 400 })
      }
      console.log("[MODERATION] Content approved")
    } catch (moderationError) {
      console.warn("[MODERATION] Moderation check failed, proceeding with generation:", moderationError)
      // Continue with generation if moderation fails to avoid blocking users
    }

    // Check if Fal.ai API key is available
    const falApiKey = process.env.FAL_API_KEY
    if (!falApiKey) {
      return NextResponse.json({ error: "FAL_API_KEY not configured" }, { status: 500 })
    }

    // Parse settings
    let settings: any = {}
    if (settingsJson) {
      try {
        settings = JSON.parse(settingsJson)
        console.log("[FLUX-PRO-MULTI] Parsed settings:", settings)
      } catch (error) {
        console.warn("[FLUX-PRO-MULTI] Failed to parse settings:", error)
      }
    }

    // Enhance prompt with RAG if requested
    let finalPrompt = prompt
    let ragMetadata = null

    if (useRag && activeRAGId && prompt) {
      console.log(`[RAG] Starting enhancement with ${activeRAGName} (${activeRAGId})`)
      const ragSystem = await getRAGSystem()
      
      if (ragSystem) {
        try {
          console.log("[FLUX-PRO-MULTI] Enhancing prompt with RAG...")
          const enhancement = await ragSystem(prompt, {
            projectId: activeRAGId,
            projectName: activeRAGName
          })
          
          console.log(`[RAG] Enhancement result:`, enhancement)
          
          if (enhancement && typeof enhancement === 'object') {
            finalPrompt = enhancement.enhancedPrompt || enhancement.prompt || prompt
            ragMetadata = {
              originalPrompt: prompt,
              enhancedPrompt: finalPrompt,
              suggestedColors: enhancement.suggestedColors || [],
              suggestedFormat: enhancement.suggestedFormat || "",
              negativePrompt: enhancement.negativePrompt || "",
              brandingElements: enhancement.brandingElements?.length || 0
            }
          } else if (typeof enhancement === 'string') {
            finalPrompt = enhancement
            ragMetadata = {
              originalPrompt: prompt,
              enhancedPrompt: finalPrompt,
              brandingElements: 0
            }
          }
          console.log("[FLUX-PRO-MULTI] RAG enhanced prompt:", finalPrompt)
          console.log("[FLUX-PRO-MULTI] RAG suggested colors:", ragMetadata?.suggestedColors)
          console.log("[FLUX-PRO-MULTI] RAG negative prompt:", ragMetadata?.negativePrompt)
        } catch (error) {
          console.error('[RAG] Enhancement failed:', error)
          finalPrompt = prompt
        }
      } else {
        console.warn("[FLUX-PRO-MULTI] RAG system not available")
        finalPrompt = prompt
      }
    } else {
      console.log('[RAG] Skipping enhancement:', { 
        useRag, 
        hasActiveRAGId: !!activeRAGId, 
        hasPrompt: !!prompt 
      })
      finalPrompt = prompt
    }

    // Configure Fal.ai client
    fal.config({
      credentials: falApiKey,
    })

    // Prepare default settings for Flux Pro Multi
    const defaultSettings = {
      image_size: "landscape_4_3",
      num_inference_steps: 30,
      guidance_scale: 3.5,
      num_images: 4, // Multi generation default
      safety_tolerance: 2,
      output_format: "jpg",
      seed: undefined
    }

    const mergedSettings = { ...defaultSettings, ...settings }

    // Prepare input for Flux Pro Multi
    const input: any = {
      prompt: finalPrompt,
      image_size: mergedSettings.image_size,
      num_inference_steps: mergedSettings.num_inference_steps,
      guidance_scale: mergedSettings.guidance_scale,
      num_images: mergedSettings.num_images,
      safety_tolerance: mergedSettings.safety_tolerance,
      output_format: mergedSettings.output_format
    }

    // Add seed if provided
    if (mergedSettings.seed !== undefined) {
      input.seed = mergedSettings.seed
    }

    // Handle custom image size for Flux Pro Multi
    if (mergedSettings.width && mergedSettings.height) {
      input.image_size = {
        width: parseInt(mergedSettings.width.toString()),
        height: parseInt(mergedSettings.height.toString())
      }
    }

    // Add LoRA support for Flux Pro Multi
    console.log("[FLUX-PRO-MULTI] Checking LoRA configuration...")
    console.log("[FLUX-PRO-MULTI] mergedSettings.loras:", mergedSettings.loras)
    console.log("[FLUX-PRO-MULTI] Is array?", Array.isArray(mergedSettings.loras))
    console.log("[FLUX-PRO-MULTI] Length:", mergedSettings.loras?.length)
    
    if (mergedSettings.loras && Array.isArray(mergedSettings.loras) && mergedSettings.loras.length > 0) {
      console.log("[FLUX-PRO-MULTI] Processing LoRAs...")
      mergedSettings.loras.forEach((lora: any, index: number) => {
        console.log(`[FLUX-PRO-MULTI] LoRA ${index}:`, {
          path: lora.path,
          scale: lora.scale,
          originalScale: typeof lora.scale,
          parsedScale: parseFloat(lora.scale) || 1.0
        })
      })
      
      input.loras = mergedSettings.loras.map((lora: any) => ({
        path: lora.path,
        scale: parseFloat(lora.scale) || 1.0
      }))
      console.log("[FLUX-PRO-MULTI] LoRAs configured for Flux Pro Multi:", input.loras)
    } else {
      console.log("[FLUX-PRO-MULTI] No LoRAs configured - will use base model")
    }

    console.log("[FLUX-PRO-MULTI] Final input object being sent to fal.ai:")
    console.log("=====================================")
    console.log("Model: fal-ai/flux-pro/kontext/max/multi")
    console.log("Input:", JSON.stringify(input, null, 2))
    console.log("=====================================")

    try {
      console.log("[FLUX-PRO-MULTI] Starting multi-generation with Flux Pro Kontext Max Multi...")
      const result = await fal.subscribe("fal-ai/flux-pro/kontext/max/multi", {
        input,
        logs: true,
        onQueueUpdate: (update: any) => {
          if (update.status === "IN_PROGRESS") {
            update.logs.map((log: any) => log.message).forEach(console.log)
          }
        },
      })

      console.log("[FLUX-PRO-MULTI] Multi-generation completed successfully!")
      console.log("[FLUX-PRO-MULTI] Result data structure:")
      console.log("  - data exists:", !!result.data)
      console.log("  - images exists:", !!result.data?.images)
      console.log("  - images length:", result.data?.images?.length || 0)
      
      if (result.data?.images?.[0]) {
        console.log("  - first image URL:", result.data.images[0].url)
        console.log("  - first image dimensions:", {
          width: result.data.images[0].width,
          height: result.data.images[0].height
        })
      }
      
      // Check if LoRAs were actually applied
      if (input.loras && input.loras.length > 0) {
        console.log("[FLUX-PRO-MULTI] ✅ LoRAs were sent to the model:")
        input.loras.forEach((lora: any, index: number) => {
          console.log(`  LoRA ${index + 1}: ${lora.path} (scale: ${lora.scale})`)
        })
      } else {
        console.log("[FLUX-PRO-MULTI] ⚠️ No LoRAs were applied to this generation")
      }

      if (result.data && result.data.images && result.data.images.length > 0) {
        const images = result.data.images.map((img: any) => ({
          url: img.url,
          width: img.width,
          height: img.height,
          content_type: img.content_type || "image/jpg"
        }))

        return NextResponse.json({
          success: true,
          images: images,
          image: images[0].url, // First image for compatibility
          finalPrompt: finalPrompt,
          originalPrompt: prompt,
          ragMetadata: ragMetadata,
          settings: mergedSettings,
          model: "flux-pro/kontext/max/multi",
          timestamp: new Date().toISOString()
        })
      } else {
        throw new Error("No images returned from Flux Pro Multi")
      }
    } catch (falError) {
      console.error("[FLUX-PRO-MULTI] Fal.ai error:", falError)
      return NextResponse.json({ 
        error: "Failed to generate images with Flux Pro Multi",
        details: falError instanceof Error ? falError.message : "Unknown error",
        model: "flux-pro/kontext/max/multi"
      }, { status: 500 })
    }

  } catch (error) {
    console.error("[FLUX-PRO-MULTI] Error:", error)
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
