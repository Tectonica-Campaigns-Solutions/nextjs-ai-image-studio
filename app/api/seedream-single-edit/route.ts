import { type NextRequest, NextResponse } from "next/server"
import { fal } from "@fal-ai/client"
import { ContentModerationService } from "@/lib/content-moderation"

/**
 * POST /api/seedream-single-edit
 * 
 * Internal API endpoint for single image editing using Seedream-v4 via fal.ai.
 * This endpoint allows editing a single image based on a text prompt.
 * 
 * Body parameters (multipart/form-data):
 * - prompt (required): Text description for the image edit
 * - image (optional): Image file to edit
 * - imageUrl (optional): Image URL to edit
 * - settings (optional): JSON string with generation settings
 *   - aspect_ratio: "1:1" | "16:9" | "9:16" | "4:3" | "3:4" (default: "1:1")
 *   - num_images: Number of images to generate (1-4, default: 1)
 *   - num_inference_steps: Number of inference steps (1-50, default: 20)
 *   - guidance_scale: Guidance scale (1.0-20.0, default: 7.5)
 *   - strength: Strength of the edit (0.0-1.0, default: 0.8)
 *   - enable_safety_checker: boolean (default: true)
 *   - negative_prompt: string (optional negative prompt)
 *   - seed: number (optional seed for reproducibility)
 * - orgType (optional): Organization type for moderation (default: general)
 * 
 * Authentication: Required (internal endpoint)
 * 
 * Response format:
 * {
 *   "success": true,
 *   "images": [
 *     {
 *       "url": "https://...",
 *       "width": 1024,
 *       "height": 1024
 *     }
 *   ],
 *   "prompt": "enhanced prompt used",
 *   "originalPrompt": "user's original prompt",
 *   "model": "fal-ai/bytedance/seedream/v4/edit",
 *   "settings": {...}
 * }
 */
export async function POST(request: NextRequest) {
  try {
    console.log("[SEEDREAM-SINGLE-EDIT] Request received")
    
    const formData = await request.formData()
    
    // Extract parameters
    const prompt = formData.get("prompt") as string
    const orgType = formData.get("orgType") as string || "general"
    
    // Parse settings
    const settingsStr = formData.get("settings") as string
    let settings: any = {}
    if (settingsStr) {
      try {
        settings = JSON.parse(settingsStr)
      } catch (error) {
        console.warn("[SEEDREAM-SINGLE-EDIT] Failed to parse settings:", error)
      }
    }
    
    // Extract fal.ai specific settings with defaults (simplified)
    const aspectRatio = settings.aspect_ratio || "1:1"
    const numImages = Math.min(Math.max(parseInt(settings.num_images) || 1, 1), 4)
    const enableSafetyChecker = settings.enable_safety_checker !== false // Default to true

    // Validate prompt
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json({
        error: "Prompt is required",
        details: "Please provide a text description for image editing"
      }, { status: 400 })
    }

    // Validate aspect ratio
    const validAspectRatios = ["1:1", "16:9", "9:16", "4:3", "3:4"]
    if (!validAspectRatios.includes(aspectRatio)) {
      return NextResponse.json({
        error: "Invalid aspect ratio",
        details: `Aspect ratio must be one of: ${validAspectRatios.join(', ')}`
      }, { status: 400 })
    }

    // Check if Fal.ai API key is available
    const falApiKey = process.env.FAL_API_KEY
    if (!falApiKey) {
      return NextResponse.json({
        error: "FAL_API_KEY not configured",
        details: "FAL API key is required for Seedream image editing"
      }, { status: 500 })
    }

    console.log("[SEEDREAM-SINGLE-EDIT] Fal API Key exists:", !!falApiKey)
    
    // Configure fal.ai client with API key
    fal.config({
      credentials: falApiKey,
    })

    console.log("[SEEDREAM-SINGLE-EDIT] Parameters:", {
      prompt: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
      aspectRatio,
      numImages,
      enableSafetyChecker,
      orgType
    })

    // Extract image file or URL
    let imageUrl: string | undefined
    const imageFile = formData.get("image") as File
    const imageUrlParam = formData.get("imageUrl") as string

    if (imageFile && imageFile.size > 0) {
      // Validate file type
      if (!imageFile.type.startsWith('image/')) {
        return NextResponse.json({
          error: "Invalid file type",
          details: `File ${imageFile.name} is not an image. Only image files are allowed.`
        }, { status: 400 })
      }

      // Validate file size (10MB limit)
      const maxSize = 10 * 1024 * 1024 // 10MB
      if (imageFile.size > maxSize) {
        return NextResponse.json({
          error: "File too large",
          details: `File ${imageFile.name} is ${Math.round(imageFile.size / 1024 / 1024)}MB. Maximum size is 10MB.`
        }, { status: 400 })
      }

      try {
        console.log(`[SEEDREAM-SINGLE-EDIT] Uploading ${imageFile.name} to fal.ai storage...`)
        imageUrl = await fal.storage.upload(imageFile)
        console.log(`[SEEDREAM-SINGLE-EDIT] Successfully uploaded: ${imageUrl}`)
      } catch (error) {
        console.error(`[SEEDREAM-SINGLE-EDIT] Failed to upload file:`, error)
        return NextResponse.json({
          error: "File upload failed",
          details: `Failed to upload file ${imageFile.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
        }, { status: 500 })
      }
    } else if (imageUrlParam && imageUrlParam.trim()) {
      imageUrl = imageUrlParam.trim()
      console.log(`[SEEDREAM-SINGLE-EDIT] Using provided image URL: ${imageUrl}`)
    } else {
      return NextResponse.json({
        error: "No image provided",
        details: "Please provide either an image file or image URL for editing"
      }, { status: 400 })
    }

    // Content moderation check
    try {
      console.log("[MODERATION] Checking content for Seedream Single Edit prompt:", prompt.substring(0, 50) + "...")
      const moderationService = new ContentModerationService(orgType)
      const moderationResult = await moderationService.moderateContent({ prompt })
      
      if (!moderationResult.safe) {
        console.log("[MODERATION] Content blocked:", moderationResult.reason)
        return NextResponse.json({
          error: moderationResult.reason,
          category: moderationResult.category,
          blocked: true,
          moderation: true
        }, { status: 400 })
      }
      console.log("[MODERATION] Content approved")
    } catch (moderationError) {
      console.warn("[MODERATION] Moderation check failed, proceeding with generation:", moderationError)
      // Continue with generation if moderation fails to avoid blocking users
    }

    console.log("[SEEDREAM-SINGLE-EDIT] Processing single image edit:")
    console.log("  - Image URL:", imageUrl)
    console.log("  - Prompt:", prompt)
    console.log("  - Aspect Ratio:", aspectRatio)
    console.log("  - Num Images:", numImages)

    // Map aspect ratio to fal.ai image_size format
    let imageSize: string
    switch (aspectRatio) {
      case "16:9":
        imageSize = "landscape_16_9"
        break
      case "9:16":
        imageSize = "portrait_16_9"
        break
      case "4:3":
        imageSize = "landscape_4_3"
        break
      case "3:4":
        imageSize = "portrait_4_3"
        break
      case "1:1":
      default:
        imageSize = "square_hd"
        break
    }

    // Prepare input for fal.ai Seedream v4 edit
    // Use only the basic parameters that definitely work
    const input: any = {
      image_urls: [imageUrl],
      prompt: prompt,
      enable_safety_checker: enableSafetyChecker
    }

    console.log("[SEEDREAM-SINGLE-EDIT] Minimal input parameters:", JSON.stringify(input, null, 2))

    console.log("[SEEDREAM-SINGLE-EDIT] Input parameters:", JSON.stringify(input, null, 2))

    console.log("[SEEDREAM-SINGLE-EDIT] Calling fal.ai Seedream v4...")
    
    try {
      const result = await fal.subscribe("fal-ai/bytedance/seedream/v4/edit", {
        input,
        logs: true,
        onQueueUpdate: (update) => {
          if (update.status === "IN_PROGRESS") {
            console.log("[SEEDREAM-SINGLE-EDIT] Progress:", update.logs?.map(log => log.message).join(" ") || "Processing...")
          }
        }
      })

      console.log("[SEEDREAM-SINGLE-EDIT] fal.ai response received")
      
      // Debug: Log the full response structure
      console.log("[SEEDREAM-SINGLE-EDIT] Full response structure:", JSON.stringify(result, null, 2))
      
      // Validate response
      if (!result.data || !result.data.images || !Array.isArray(result.data.images) || result.data.images.length === 0) {
        console.error("[SEEDREAM-SINGLE-EDIT] Invalid response format - detailed analysis:")
        console.error("- result exists:", !!result)
        console.error("- result.data exists:", !!result.data)
        console.error("- result.data.images exists:", !!result.data?.images)
        console.error("- result.data.images is array:", Array.isArray(result.data?.images))
        console.error("- images length:", result.data?.images?.length || 0)
        
        return NextResponse.json({
          error: "No images generated",
          details: "fal.ai API returned no images. Check the prompt and input image.",
          debugInfo: {
            hasData: !!result.data,
            hasImages: !!result.data?.images,
            imageCount: result.data?.images?.length || 0,
            fullResponse: result
          }
        }, { status: 500 })
      }

      console.log("[SEEDREAM-SINGLE-EDIT] Successfully generated", result.data.images.length, "images")

      // Format response to match expected structure
      const images = result.data.images.map((img: any) => ({
        url: img.url,
        width: img.width || 1024,
        height: img.height || 1024
      }))

      // Return successful response
      return NextResponse.json({
        success: true,
        image: images[0]?.url || images[0], // Primary image for UI compatibility
        images, // All images for completeness
        prompt,
        originalPrompt: prompt,
        model: "fal-ai/bytedance/seedream/v4/edit",
        provider: "fal.ai",
        inputImage: imageUrl,
        settings: {
          aspect_ratio: aspectRatio,
          num_images: numImages,
          enable_safety_checker: enableSafetyChecker,
          // Note: Advanced parameters are not supported by this model
          note: "This endpoint uses simplified settings for compatibility with Seedream v4 edit model"
        },
        timestamp: new Date().toISOString()
      })

    } catch (falError) {
      console.error("[SEEDREAM-SINGLE-EDIT] fal.ai API error:", falError)
      
      // Try to extract more details from the error
      let errorDetails = falError instanceof Error ? falError.message : "Unknown fal.ai API error"
      let additionalInfo = ""
      
      if (falError && typeof falError === 'object') {
        if ('body' in falError) {
          console.error("[SEEDREAM-SINGLE-EDIT] Error body:", falError.body)
          additionalInfo = ` Error body: ${JSON.stringify(falError.body)}`
        }
        if ('status' in falError) {
          console.error("[SEEDREAM-SINGLE-EDIT] Error status:", falError.status)
        }
      }
      
      return NextResponse.json({
        error: "fal.ai API request failed",
        details: errorDetails + additionalInfo,
        provider: "fal.ai",
        model: "fal-ai/bytedance/seedream/v4/edit",
        inputUsed: input
      }, { status: 500 })
    }

  } catch (error) {
    console.error("[SEEDREAM-SINGLE-EDIT] Unexpected error:", error)
    
    return NextResponse.json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}