import { type NextRequest, NextResponse } from "next/server"
import { fal } from "@fal-ai/client"
import { ContentModerationService } from "@/lib/content-moderation"

// Dynamic import for Vercel compatibility
async function getRAGSystem() {
  if (process.env.VERCEL) {
    // In Vercel environment, use simple hardcoded RAG
    try {
      const { enhanceWithACLUBranding } = await import("../simple-rag/route")
      return enhanceWithACLUBranding
    } catch (error) {
      console.warn("Simple RAG not available:", error)
      return null
    }
  } else {
    // In local development, try to use the full RAG system
    try {
      const { enhancePromptWithBranding } = await import("@/lib/rag-system")
      return enhancePromptWithBranding
    } catch (error) {
      console.warn("Full RAG not available, falling back to simple RAG:", error)
      const { enhanceWithACLUBranding } = await import("../simple-rag/route")
      return enhanceWithACLUBranding
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const image = formData.get("image") as File
    const prompt = formData.get("prompt") as string
    const useRAG = formData.get("useRAG") === "true"
    const settingsString = formData.get("settings") as string
    const orgType = formData.get("orgType") as string || "general" // Organization type for moderation

    console.log("[v0] Qwen Image-to-Image endpoint called")
    console.log("[v0] Image provided:", !!image)
    console.log("[v0] Original prompt:", prompt)
    console.log("[v0] Use RAG:", useRAG)
    console.log("[v0] Settings:", settingsString)

    if (!image || !prompt) {
      return NextResponse.json({ error: "Image and prompt are required" }, { status: 400 })
    }

    // Content moderation check
    try {
      console.log("[MODERATION] Checking content for image-to-image prompt:", prompt.substring(0, 50) + "...")
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
    if (settingsString) {
      try {
        settings = JSON.parse(settingsString)
        console.log("[v0] Parsed settings:", settings)
      } catch (error) {
        console.warn("[v0] Failed to parse settings:", error)
      }
    }

    // Enhance prompt with RAG if requested
    let finalPrompt = prompt
    let ragMetadata = null

    if (useRAG) {
      try {
        console.log("[v0] Enhancing prompt with RAG...")
        const enhancePromptWithBranding = await getRAGSystem()
        if (enhancePromptWithBranding) {
          const enhancement = await enhancePromptWithBranding(prompt)
          finalPrompt = enhancement.enhancedPrompt
          ragMetadata = {
            originalPrompt: prompt,
            enhancedPrompt: enhancement.enhancedPrompt,
            suggestedColors: enhancement.suggestedColors,
            suggestedFormat: enhancement.suggestedFormat,
            negativePrompt: enhancement.negativePrompt,
            brandingElements: enhancement.brandingElements.length
          }
          console.log("[v0] RAG enhanced prompt:", finalPrompt)
          console.log("[v0] RAG enhanced prompt:", finalPrompt)
          console.log("[v0] RAG suggested colors:", enhancement.suggestedColors)
          console.log("[v0] RAG negative prompt:", enhancement.negativePrompt)
        } else {
          console.warn("[v0] RAG system not available")
        }
      } catch (error) {
        console.warn("[v0] RAG enhancement failed, using original prompt:", error)
        ragMetadata = { error: "RAG enhancement failed" }
      }
    }

    // Process the input image
    const imageBuffer = await image.arrayBuffer()
    const base64Image = Buffer.from(imageBuffer).toString("base64")
    console.log("[v0] Base64 image length:", base64Image.length)

    // Configure Fal.ai client
    fal.config({
      credentials: falApiKey,
    })

    // Prepare input for Qwen Image-to-Image
    const input: any = {
      prompt: finalPrompt,
      image_url: `data:image/jpeg;base64,${base64Image}`,
    }

    // Apply settings with validation and defaults
    const qwenSettings = {
      // Image generation settings
      image_size: settings.image_size || "landscape_4_3",
      num_inference_steps: Math.min(Math.max(settings.num_inference_steps || 30, 1), 100),
      guidance_scale: Math.min(Math.max(settings.guidance_scale || 2.5, 1), 20),
      num_images: Math.min(Math.max(settings.num_images || 1, 1), 4),
      
      // Output settings
      output_format: settings.output_format || "png",
      
      // Advanced settings
      acceleration: settings.acceleration || "none",
      enable_safety_checker: settings.enable_safety_checker !== false,
      sync_mode: settings.sync_mode || false,
      
      // Image-to-image specific settings
      strength: Math.min(Math.max(settings.strength || 0.8, 0.1), 1.0),
      
      // Optional settings
      ...(settings.seed && { seed: parseInt(settings.seed as string) }),
      ...(settings.width && { width: Math.min(Math.max(parseInt(settings.width as string), 256), 2048) }),
      ...(settings.height && { height: Math.min(Math.max(parseInt(settings.height as string), 256), 2048) }),
    }

    // Add RAG-enhanced negative prompt
    if (useRAG && ragMetadata && ragMetadata.negativePrompt) {
      const userNegativePrompt = settings.negative_prompt || ""
      qwenSettings.negative_prompt = userNegativePrompt 
        ? `${userNegativePrompt}, ${ragMetadata.negativePrompt}`
        : ragMetadata.negativePrompt
    } else if (settings.negative_prompt) {
      qwenSettings.negative_prompt = settings.negative_prompt
    }

    // Merge settings into input
    Object.assign(input, qwenSettings)

    console.log("[v0] Final input parameters:", {
      prompt: input.prompt,
      negative_prompt: input.negative_prompt,
      image_size: input.image_size,
      num_inference_steps: input.num_inference_steps,
      guidance_scale: input.guidance_scale,
      strength: input.strength,
      num_images: input.num_images,
      output_format: input.output_format,
      acceleration: input.acceleration,
      enable_safety_checker: input.enable_safety_checker,
      sync_mode: input.sync_mode,
      seed: input.seed,
      width: input.width,
      height: input.height
    })

    console.log("[v0] Using Qwen Image-to-Image for generation...")

    const result = await fal.subscribe("fal-ai/qwen-image", {
      input,
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          update.logs.map((log) => log.message).forEach(console.log)
        }
      },
    })

    console.log("[v0] Qwen Image-to-Image output:", result)

    if (result.data && result.data.images && result.data.images.length > 0) {
      const images = result.data.images.map((img: any) => img.url)
      console.log("[v0] Got", images.length, "images from Qwen Image-to-Image")

      // Convert images to base64
      const base64Images = []
      for (const imageUrl of images) {
        try {
          const imageResponse = await fetch(imageUrl)
          const imageBlob = await imageResponse.blob()
          const arrayBuffer = await imageBlob.arrayBuffer()
          const base64Result = Buffer.from(arrayBuffer).toString('base64')
          base64Images.push(`data:image/${input.output_format};base64,${base64Result}`)
        } catch (error) {
          console.error("[v0] Error converting image to base64:", error)
          base64Images.push(imageUrl) // Fallback to URL
        }
      }

      console.log("[v0] Successfully generated", base64Images.length, "images with Qwen Image-to-Image")

      return NextResponse.json({
        success: true,
        images: base64Images,
        finalPrompt: finalPrompt, // Include the final prompt used
        settings_used: qwenSettings,
        ragMetadata: ragMetadata,
        model_info: {
          model: "fal-ai/qwen-image",
          type: "image-to-image",
          input_image_size: base64Image.length,
          output_count: base64Images.length
        }
      })

    } else {
      console.log("[v0] Unexpected Qwen Image-to-Image output format:", result)
      return NextResponse.json({ 
        error: "Unexpected output format from Qwen Image-to-Image",
        details: result
      }, { status: 500 })
    }

  } catch (error) {
    console.error("[v0] Qwen Image-to-Image failed:", error)
    
    // Enhanced error logging
    if (error && typeof error === 'object' && 'body' in error) {
      console.error("[v0] Error body:", JSON.stringify(error.body, null, 2))
    }
    
    return NextResponse.json({
      error: "Qwen Image-to-Image processing failed",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
