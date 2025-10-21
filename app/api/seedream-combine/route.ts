import { type NextRequest, NextResponse } from "next/server"
import { ContentModerationService } from "@/lib/content-moderation"
import { createArkClient, ArkApiClient } from "@/lib/ark-client"

/**
 * POST /api/seedream-combine
 * 
 * Internal API endpoint for combining images using Ark Seedream-4-0-250828 model.
 * This endpoint uses the Ark API directly instead of fal.ai.
 * 
 * Body parameters (multipart/form-data):
 * - prompt (required): Text description for image combination
 * - image0, image1 (required): Exactly 2 image files to upload and combine
 * - imageUrl0, imageUrl1 (optional): Exactly 2 image URLs to combine
 * - useJSONEnhancement (optional): Whether to apply JSON-based prompt enhancement (default: false)
 * - jsonOptions (optional): JSON string with enhancement configuration
 * - settings (optional): JSON string with advanced generation settings
 * - orgType (optional): Organization type for content moderation (default: "general")
 * 
 * Advanced settings include:
 * - sequential_image_generation: "auto" | "manual" (default: "auto")
 * - max_images: Number of images to generate (default: 1, max: 3)
 * - response_format: "url" | "b64_json" (default: "url")
 * - size: "1K" | "2K" | "4K" (default: "2K")
 * - stream: boolean (default: false)
 * - watermark: boolean (default: true)
 * 
 * Response format:
 * {
 *   "success": true,
 *   "images": [{"url": "...", "width": 1024, "height": 1024}],
 *   "prompt": "enhanced prompt used",
 *   "originalPrompt": "user's original prompt",
 *   "model": "seedream-4-0-250828",
 *   "inputImages": 2,
 *   "settings": {...}
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const prompt = formData.get("prompt") as string
    const settingsJson = formData.get("settings") as string
    const orgType = formData.get("orgType") as string || "general"
    
    // JSON Enhancement parameters
    const useJSONEnhancement = formData.get("useJSONEnhancement") === "true"
    const jsonOptionsStr = formData.get("jsonOptions") as string
    let jsonOptions: any = {}
    if (jsonOptionsStr) {
      try {
        jsonOptions = JSON.parse(jsonOptionsStr)
      } catch (error) {
        console.warn("[SEEDREAM-COMBINE] Failed to parse JSON options:", error)
      }
    }

    // Set default values for jsonOptions if not provided
    const defaultJsonOptions = {
      intensity: 1.0,
      customText: '',
      ...jsonOptions
    }

    // Extract image files and URLs
    const imageFiles: File[] = []
    const imageUrls: string[] = []
    
    // Get all files with 'image' prefix from form data
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('image') && value instanceof File) {
        imageFiles.push(value)
        console.log(`[SEEDREAM-COMBINE] Found image file: ${key}, size: ${value.size}, type: ${value.type}`)
      } else if (key.startsWith('imageUrl') && typeof value === 'string' && value.trim()) {
        imageUrls.push(value.trim())
        console.log(`[SEEDREAM-COMBINE] Found image URL: ${key}, url: ${value}`)
      }
    }

    console.log("[SEEDREAM-COMBINE] Seedream image combination endpoint called")
    console.log("[SEEDREAM-COMBINE] Original prompt:", prompt)
    console.log("[SEEDREAM-COMBINE] Image files count:", imageFiles.length)
    console.log("[SEEDREAM-COMBINE] Image URLs count:", imageUrls.length)
    console.log("[SEEDREAM-COMBINE] Use JSON Enhancement:", useJSONEnhancement)
    console.log("[SEEDREAM-COMBINE] JSON Options:", defaultJsonOptions)

    // Validation
    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    if (imageFiles.length === 0 && imageUrls.length === 0) {
      return NextResponse.json({ 
        error: "At least one image is required for combination" 
      }, { status: 400 })
    }

    // Validate exactly 2 images total
    const totalImages = imageFiles.length + imageUrls.length
    if (totalImages !== 2) {
      return NextResponse.json({ 
        error: "Exactly 2 images are required",
        details: `Found ${imageFiles.length} files and ${imageUrls.length} URLs (total: ${totalImages}). Seedream combine requires exactly 2 images.`
      }, { status: 400 })
    }

    // Content moderation check
    try {
      console.log("[MODERATION] Checking content for Seedream Combine prompt:", prompt.substring(0, 50) + "...")
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

    // Initialize Ark API client
    let arkClient: ArkApiClient
    try {
      arkClient = createArkClient()
    } catch (error) {
      console.error("[SEEDREAM-COMBINE] Failed to create Ark client:", error)
      return NextResponse.json({ 
        error: "ARK_API_KEY not configured",
        details: error instanceof Error ? error.message : "Unknown error"
      }, { status: 500 })
    }

    // Parse settings
    let settings: any = {}
    if (settingsJson) {
      try {
        settings = JSON.parse(settingsJson)
        console.log("[SEEDREAM-COMBINE] Parsed settings:", settings)
      } catch (error) {
        console.warn("[SEEDREAM-COMBINE] Failed to parse settings:", error)
      }
    }

    // Apply JSON enhancement if requested
    let finalPrompt = prompt
    if (useJSONEnhancement) {
      let enhancementText = defaultJsonOptions.customText
      
      if (!enhancementText) {
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/enhancement-config`)
          const { success, config } = await response.json()
          if (success && config?.enhancement_text) {
            enhancementText = config.enhancement_text
            console.log("[SEEDREAM-COMBINE] Loaded enhancement_text:", enhancementText)
          }
        } catch (error) {
          console.warn("[SEEDREAM-COMBINE] Could not load enhancement config:", error)
        }
      }

      if (enhancementText) {
        finalPrompt = `${prompt}, ${enhancementText}`
        console.log("[SEEDREAM-COMBINE] Enhanced prompt:", finalPrompt)
      }
    }

    console.log("[SEEDREAM-COMBINE] Final prompt:", finalPrompt)

    // Prepare image URLs for API (convert files to URLs if needed)
    const allImageUrls: string[] = [...imageUrls]
    
    // For uploaded files, we need to convert them to accessible URLs
    // Since Ark API expects image URLs, we'll need to upload files to a temporary storage
    // For now, we'll use base64 encoding as a workaround or expect only URLs
    if (imageFiles.length > 0) {
      return NextResponse.json({ 
        error: "File uploads not yet supported",
        details: "Please use image URLs instead. File upload support will be added in a future update."
      }, { status: 400 })
    }

    // Prepare default settings for Seedream
    const defaultSettings = {
      maxImages: 1,
      size: "2K" as const,
      sequentialGeneration: "auto" as const,
      responseFormat: "url" as const,
      stream: false,
      watermark: true
    }

    const mergedSettings = { ...defaultSettings, ...settings }

    console.log("[SEEDREAM-COMBINE] Using Ark client for image combination")
    console.log("[SEEDREAM-COMBINE] Input images:", allImageUrls)
    console.log("[SEEDREAM-COMBINE] Settings:", mergedSettings)

    try {
      console.log("[SEEDREAM-COMBINE] Starting image combination with Ark Seedream...")
      
      const result = await arkClient.combineImages(
        finalPrompt,
        allImageUrls[0],
        allImageUrls[1],
        {
          size: mergedSettings.size,
          sequentialGeneration: mergedSettings.sequentialGeneration,
          responseFormat: mergedSettings.responseFormat,
          stream: mergedSettings.stream,
          watermark: mergedSettings.watermark
        }
      )

      console.log("[SEEDREAM-COMBINE] Ark API response received")
      
      // Extract images using the client helper
      const images = ArkApiClient.extractImages(result)

      if (images.length === 0) {
        console.error("[SEEDREAM-COMBINE] No images in response:", result)
        return NextResponse.json({ 
          error: "No images generated",
          details: "Ark API returned empty result",
          response: result
        }, { status: 500 })
      }

      console.log("[SEEDREAM-COMBINE] Image combination completed successfully!")
      console.log("[SEEDREAM-COMBINE] Generated images:", images.length)

      return NextResponse.json({
        success: true,
        images: images.map(img => ({
          url: img.url,
          width: img.width,
          height: img.height,
          content_type: "image/jpeg"
        })),
        prompt: finalPrompt,
        originalPrompt: prompt,
        inputImages: 2,
        jsonEnhancementUsed: useJSONEnhancement,
        jsonOptions: useJSONEnhancement ? jsonOptions : undefined,
        settings: mergedSettings,
        model: "seedream-4-0-250828",
        provider: "ark",
        timestamp: new Date().toISOString()
      })

    } catch (arkError) {
      console.error("[SEEDREAM-COMBINE] Ark API error:", arkError)
      
      let errorMessage = "Failed to combine images with Seedream"
      let errorDetails = arkError instanceof Error ? arkError.message : "Unknown error"
      
      return NextResponse.json({ 
        error: errorMessage,
        details: errorDetails,
        model: "seedream-4-0-250828",
        provider: "ark"
      }, { status: 500 })
    }

  } catch (error) {
    console.error("[SEEDREAM-COMBINE] Error:", error)
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}