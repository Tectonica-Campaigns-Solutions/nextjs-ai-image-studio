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

    // Extract multiple image files
    const imageFiles: File[] = []
    const imageUrls: string[] = []
    
    // Get all files with 'image' prefix from form data
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('image') && value instanceof File) {
        imageFiles.push(value)
        console.log(`[FLUX-COMBINE] Found image file: ${key}, size: ${value.size}, type: ${value.type}`)
      } else if (key.startsWith('imageUrl') && typeof value === 'string' && value.trim()) {
        imageUrls.push(value.trim())
        console.log(`[FLUX-COMBINE] Found image URL: ${key}, url: ${value}`)
      }
    }

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    if (imageFiles.length === 0 && imageUrls.length === 0) {
      return NextResponse.json({ 
        error: "At least one image is required for combination" 
      }, { status: 400 })
    }

    if (imageFiles.length + imageUrls.length < 2) {
      return NextResponse.json({ 
        error: "At least 2 images are required for combination" 
      }, { status: 400 })
    }

    console.log("[FLUX-COMBINE] Image combination endpoint called")
    console.log("[FLUX-COMBINE] Original prompt:", prompt)
    console.log("[FLUX-COMBINE] Image files count:", imageFiles.length)
    console.log("[FLUX-COMBINE] Image URLs count:", imageUrls.length)
    console.log("[FLUX-COMBINE] Total images:", imageFiles.length + imageUrls.length)
    console.log("[FLUX-COMBINE] Use RAG:", useRag)
    console.log("[FLUX-COMBINE] Settings JSON:", settingsJson)

    // Content moderation check
    try {
      console.log("[MODERATION] Checking content for Flux Combine prompt:", prompt.substring(0, 50) + "...")
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
        console.log("[FLUX-COMBINE] Parsed settings:", settings)
      } catch (error) {
        console.warn("[FLUX-COMBINE] Failed to parse settings:", error)
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
          console.log("[FLUX-COMBINE] Enhancing prompt with RAG...")
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
          console.log("[FLUX-COMBINE] RAG enhanced prompt:", finalPrompt)
          console.log("[FLUX-COMBINE] RAG suggested colors:", ragMetadata?.suggestedColors)
          console.log("[FLUX-COMBINE] RAG negative prompt:", ragMetadata?.negativePrompt)
        } catch (error) {
          console.error('[RAG] Enhancement failed:', error)
          finalPrompt = prompt
        }
      } else {
        console.warn("[FLUX-COMBINE] RAG system not available")
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

    // Upload image files to fal.ai storage if any
    const uploadedImageUrls: string[] = [...imageUrls]
    
    if (imageFiles.length > 0) {
      console.log("[FLUX-COMBINE] Uploading image files to fal.ai storage...")
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i]
        try {
          console.log(`[FLUX-COMBINE] Uploading image ${i + 1}/${imageFiles.length}: ${file.name} (${file.size} bytes)`)
          const uploadedUrl = await fal.storage.upload(file)
          uploadedImageUrls.push(uploadedUrl)
          console.log(`[FLUX-COMBINE] Image ${i + 1} uploaded successfully: ${uploadedUrl}`)
        } catch (uploadError) {
          console.error(`[FLUX-COMBINE] Failed to upload image ${i + 1}:`, uploadError)
          return NextResponse.json({ 
            error: `Failed to upload image ${i + 1}: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}` 
          }, { status: 500 })
        }
      }
    }

    console.log("[FLUX-COMBINE] All image URLs ready:", uploadedImageUrls)

    // Prepare default settings for Flux Pro Combine
    const defaultSettings = {
      aspect_ratio: "1:1",
      guidance_scale: 3.5,
      num_images: 1, // Single combined image output
      safety_tolerance: 2,
      output_format: "jpeg",
      seed: undefined,
      enhance_prompt: false
    }

    const mergedSettings = { ...defaultSettings, ...settings }

    // Prepare input for Flux Pro Multi with image combination
    const input: any = {
      prompt: finalPrompt,
      image_urls: uploadedImageUrls, // Multiple input images
      aspect_ratio: mergedSettings.aspect_ratio,
      guidance_scale: mergedSettings.guidance_scale,
      num_images: mergedSettings.num_images,
      safety_tolerance: mergedSettings.safety_tolerance,
      output_format: mergedSettings.output_format,
      enhance_prompt: mergedSettings.enhance_prompt
    }

    // Add seed if provided
    if (mergedSettings.seed !== undefined) {
      input.seed = mergedSettings.seed
    }

    console.log("[FLUX-COMBINE] Final input object being sent to fal.ai:")
    console.log("=====================================")
    console.log("Model: fal-ai/flux-pro/kontext/max/multi")
    console.log("Input images count:", uploadedImageUrls.length)
    console.log("Input:", JSON.stringify({
      ...input,
      image_urls: `[${uploadedImageUrls.length} image URLs]` // Don't log full URLs for privacy
    }, null, 2))
    console.log("=====================================")

    try {
      console.log("[FLUX-COMBINE] Starting image combination with Flux Pro Kontext Max Multi...")
      const result = await fal.subscribe("fal-ai/flux-pro/kontext/max/multi", {
        input,
        logs: true,
        onQueueUpdate: (update: any) => {
          if (update.status === "IN_PROGRESS") {
            update.logs.map((log: any) => log.message).forEach(console.log)
          }
        },
      })

      console.log("[FLUX-COMBINE] Image combination completed successfully!")
      console.log("[FLUX-COMBINE] Result data structure:")
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

      if (result.data && result.data.images && result.data.images.length > 0) {
        const combinedImage = result.data.images[0] // Single combined result
        
        return NextResponse.json({
          success: true,
          image: combinedImage.url,
          width: combinedImage.width,
          height: combinedImage.height,
          content_type: combinedImage.content_type || "image/jpeg",
          finalPrompt: finalPrompt,
          originalPrompt: prompt,
          inputImages: uploadedImageUrls.length,
          ragMetadata: ragMetadata,
          settings: mergedSettings,
          model: "flux-pro/kontext/max/multi",
          timestamp: new Date().toISOString()
        })
      } else {
        throw new Error("No combined image returned from Flux Pro Multi")
      }
    } catch (falError) {
      console.error("[FLUX-COMBINE] Fal.ai error:", falError)
      return NextResponse.json({ 
        error: "Failed to combine images with Flux Pro Multi",
        details: falError instanceof Error ? falError.message : "Unknown error",
        model: "flux-pro/kontext/max/multi"
      }, { status: 500 })
    }

  } catch (error) {
    console.error("[FLUX-COMBINE] Error:", error)
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
