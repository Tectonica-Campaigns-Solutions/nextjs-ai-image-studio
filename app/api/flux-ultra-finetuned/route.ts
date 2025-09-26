import { type NextRequest, NextResponse } from "next/server"
import { fal } from "@fal-ai/client"
import { ContentModerationService } from "@/lib/content-moderation"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const prompt = formData.get("prompt") as string
    const settingsJson = formData.get("settings") as string
    const finetuneId = formData.get("finetuneId") as string
    const finetuneStrength = formData.get("finetuneStrength") as string
    const triggerPhrase = formData.get("triggerPhrase") as string
    const orgType = formData.get("orgType") as string || "general"

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    if (!finetuneId) {
      return NextResponse.json({ error: "Fine-tune ID is required" }, { status: 400 })
    }

    if (!triggerPhrase) {
      return NextResponse.json({ error: "Trigger phrase is required" }, { status: 400 })
    }

    // Construct final prompt with trigger phrase at the beginning
    const finalPrompt = `${triggerPhrase}, ${prompt}`

    console.log("[FLUX-ULTRA-FINETUNED] Ultra finetuned endpoint called")
    console.log("[FLUX-ULTRA-FINETUNED] Original prompt:", prompt)
    console.log("[FLUX-ULTRA-FINETUNED] Trigger phrase:", triggerPhrase)
    console.log("[FLUX-ULTRA-FINETUNED] Final prompt:", finalPrompt)
    console.log("[FLUX-ULTRA-FINETUNED] Fine-tune ID:", finetuneId)
    console.log("[FLUX-ULTRA-FINETUNED] Fine-tune Strength:", finetuneStrength)
    console.log("[FLUX-ULTRA-FINETUNED] Settings JSON:", settingsJson)

    // Content moderation check
    try {
      console.log("[MODERATION] Checking content for Flux Ultra prompt:", finalPrompt.substring(0, 50) + "...")
      const moderationService = new ContentModerationService(orgType)
      const moderationResult = await moderationService.moderateContent({ prompt: finalPrompt })
      
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
        console.log("[FLUX-ULTRA-FINETUNED] Parsed settings:", settings)
      } catch (error) {
        console.warn("[FLUX-ULTRA-FINETUNED] Failed to parse settings:", error)
      }
    }

    // Configure Fal.ai client
    fal.config({
      credentials: falApiKey,
    })

    // Prepare default settings for Flux Ultra Finetuned
    const defaultSettings = {
      aspect_ratio: "1:1",
      num_images: 1,
      safety_tolerance: 1,
      output_format: "jpeg",
      enable_safety_checker: true,
      raw: false, // Default raw mode disabled
      seed: 1234 // Default seed for consistent results
    }

    const mergedSettings = { ...defaultSettings, ...settings }

    // Prepare input for Flux Ultra Finetuned
    const input: any = {
      prompt: finalPrompt,
      finetune_id: finetuneId,
      finetune_strength: parseFloat(finetuneStrength) || 1.3,
      aspect_ratio: mergedSettings.aspect_ratio,
      num_images: mergedSettings.num_images,
      safety_tolerance: mergedSettings.safety_tolerance,
      output_format: mergedSettings.output_format,
      enable_safety_checker: mergedSettings.enable_safety_checker,
      raw: mergedSettings.raw
    }

    // Add seed if provided
    if (mergedSettings.seed !== undefined && mergedSettings.seed !== null && mergedSettings.seed !== "") {
      input.seed = parseInt(mergedSettings.seed.toString())
    }

    console.log("[FLUX-ULTRA-FINETUNED] Final input object being sent to fal.ai:")
    console.log("=====================================")
    console.log("Model: fal-ai/flux-pro/v1.1-ultra-finetuned")
    console.log("Input:", JSON.stringify(input, null, 2))
    console.log("=====================================")

    try {
      console.log("[FLUX-ULTRA-FINETUNED] Starting image generation with Flux Ultra Finetuned...")
      const result = await fal.subscribe("fal-ai/flux-pro/v1.1-ultra-finetuned", {
        input,
        logs: true,
        onQueueUpdate: (update: any) => {
          if (update.status === "IN_PROGRESS") {
            update.logs.map((log: any) => log.message).forEach(console.log)
          }
        },
      })

      console.log("[FLUX-ULTRA-FINETUNED] Image generation completed successfully!")
      console.log("[FLUX-ULTRA-FINETUNED] Result data structure:")
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
        const generatedImage = result.data.images[0]
        
        return NextResponse.json({
          success: true,
          image: generatedImage.url,
          width: generatedImage.width,
          height: generatedImage.height,
          content_type: generatedImage.content_type || "image/jpeg",
          finalPrompt: finalPrompt,
          originalPrompt: prompt,
          triggerPhrase: triggerPhrase,
          finetuneId: finetuneId,
          finetuneStrength: parseFloat(finetuneStrength) || 1.3,
          settings: mergedSettings,
          model: "flux-pro/v1.1-ultra-finetuned",
          timestamp: new Date().toISOString()
        })
      } else {
        throw new Error("No image returned from Flux Ultra Finetuned")
      }
    } catch (falError) {
      console.error("[FLUX-ULTRA-FINETUNED] Fal.ai error:", falError)
      return NextResponse.json({ 
        error: "Failed to generate image with Flux Ultra Finetuned",
        details: falError instanceof Error ? falError.message : "Unknown error",
        model: "flux-pro/v1.1-ultra-finetuned"
      }, { status: 500 })
    }

  } catch (error) {
    console.error("[FLUX-ULTRA-FINETUNED] Error:", error)
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
