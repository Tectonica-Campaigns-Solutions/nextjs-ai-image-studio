import { type NextRequest, NextResponse } from "next/server"
import { fal } from "@fal-ai/client"
import { ContentModerationService } from "@/lib/content-moderation"

/**
 * POST /api/seedream-ark-combine
 * 
 * Internal API endpoint for combining images using Seedream-v4 via fal.ai.
 * This is a simplified version compared to flux-pro-image-combine - it directly 
 * combines images without preprocessing the second image.
 * 
 * Body parameters (multipart/form-data):
 * - prompt (required): Text description for image combination
 * - image0, image1 (optional): Image files to upload and combine
 * - imageUrl0, imageUrl1 (optional): Image URLs to combine
 * - settings (optional): JSON string with generation settings
 *   - aspect_ratio: "1:1" | "16:9" | "9:16" | "4:3" | "3:4" (default: "1:1") 
 *   - num_images: Number of images to generate (1-4, default: 1)
 *   - enable_safety_checker: boolean (default: true)
 *   - negative_prompt: string (optional negative prompt)
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
 *   "model": "fal-ai/bytedance/seedream/image-to-image-v4",
 *   "inputImages": 2,
 *   "settings": {...}
 * }
 */
export async function POST(request: NextRequest) {
  try {
    console.log("[SEEDREAM-COMBINE] Request received")
    
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
        console.warn("[SEEDREAM-COMBINE] Failed to parse settings:", error)
      }
    }
    
    // Extract fal.ai specific settings
    const aspectRatio = settings.aspect_ratio || "1:1"
    const numImages = Math.min(Math.max(parseInt(settings.num_images) || 1, 1), 4)
    const enableSafetyChecker = settings.enable_safety_checker !== false // Default to true
    const negativePrompt = settings.negative_prompt || ""

    // Validate prompt
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json({
        error: "Prompt is required",
        details: "Please provide a text description for image combination"
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
        details: "FAL API key is required for Seedream image generation"
      }, { status: 500 })
    }

    console.log("[SEEDREAM-COMBINE] Fal API Key exists:", !!falApiKey)
    
    // Configure fal.ai client with API key
    fal.config({
      credentials: falApiKey,
    })

    console.log("[SEEDREAM-COMBINE] Parameters:", {
      prompt: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
      aspectRatio,
      numImages,
      enableSafetyChecker,
      negativePrompt: negativePrompt ? negativePrompt.substring(0, 50) + '...' : 'none',
      orgType
    })

    // Extract image files and URLs
    const imageFiles: File[] = []
    const imageUrls: string[] = []
    
    // Get image files (image0, image1, etc.)
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('image') && key.match(/^image\d+$/) && value instanceof File && value.size > 0) {
        imageFiles.push(value)
        console.log(`[SEEDREAM-COMBINE] Found image file: ${key}, size: ${value.size}, type: ${value.type}`)
      } else if (key.startsWith('imageUrl') && key.match(/^imageUrl\d+$/) && typeof value === 'string' && value.trim()) {
        imageUrls.push(value.trim())
        console.log(`[SEEDREAM-COMBINE] Found image URL: ${key}, url: ${value}`)
      }
    }

    // Validate that we have at least 2 images for combination
    const totalImages = imageFiles.length + imageUrls.length
    if (totalImages < 2) {
      return NextResponse.json({
        error: "At least 2 images are required for combination",
        details: `Found ${imageFiles.length} files and ${imageUrls.length} URLs (total: ${totalImages}). Please provide at least 2 images.`
      }, { status: 400 })
    }

    if (totalImages > 2) {
      return NextResponse.json({
        error: "Maximum 2 images allowed for combination",
        details: `Found ${totalImages} images. This simplified endpoint supports exactly 2 images for combination.`
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
          blocked: true,
          moderation: true
        }, { status: 400 })
      }
      console.log("[MODERATION] Content approved")
    } catch (moderationError) {
      console.warn("[MODERATION] Moderation check failed, proceeding with generation:", moderationError)
      // Continue with generation if moderation fails to avoid blocking users
    }

    // Process images - upload files to fal.ai storage or use provided URLs
    const allImageUrls: string[] = [...imageUrls]
    
    if (imageFiles.length > 0) {
      console.log("[SEEDREAM-COMBINE] Uploading files to fal.ai storage...")
      
      for (const file of imageFiles) {
        try {
          // Validate file type
          if (!file.type.startsWith('image/')) {
            return NextResponse.json({
              error: "Invalid file type",
              details: `File ${file.name} is not an image. Only image files are allowed.`
            }, { status: 400 })
          }

          // Validate file size (10MB limit)
          const maxSize = 10 * 1024 * 1024 // 10MB
          if (file.size > maxSize) {
            return NextResponse.json({
              error: "File too large",
              details: `File ${file.name} is ${Math.round(file.size / 1024 / 1024)}MB. Maximum size is 10MB.`
            }, { status: 400 })
          }

          // Upload to fal.ai storage
          console.log(`[SEEDREAM-COMBINE] Uploading ${file.name} to fal.ai storage...`)
          const uploadedUrl = await fal.storage.upload(file)
          allImageUrls.push(uploadedUrl)
          
          console.log(`[SEEDREAM-COMBINE] Successfully uploaded ${file.name}: ${uploadedUrl}`)
          
        } catch (error) {
          console.error(`[SEEDREAM-COMBINE] Failed to upload file ${file.name}:`, error)
          return NextResponse.json({
            error: "File upload failed",
            details: `Failed to upload file ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
          }, { status: 500 })
        }
      }
    }

    if (allImageUrls.length !== 2) {
      return NextResponse.json({
        error: "Exactly 2 image URLs required",
        details: `Expected 2 image URLs, but got ${allImageUrls.length}`
      }, { status: 400 })
    }

    console.log("[SEEDREAM-COMBINE] Processing image combination:")
    console.log("  - Image URLs:", allImageUrls.length)
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
    // For combination, we use both images as input images
    const input = {
      image_urls: allImageUrls, // Both images for combination
      prompt: prompt,
      negative_prompt: negativePrompt,
      image_size: imageSize,
      num_images: numImages,
      enable_safety_checker: enableSafetyChecker
    }

    console.log("[SEEDREAM-COMBINE] Calling fal.ai Seedream v4...")
    
    try {
      const result = await fal.subscribe("fal-ai/bytedance/seedream/v4/edit", {
        input,
        logs: true,
        onQueueUpdate: (update) => {
          if (update.status === "IN_PROGRESS") {
            console.log("[SEEDREAM-COMBINE] Progress:", update.logs?.map(log => log.message).join(" ") || "Processing...")
          }
        }
      })

      console.log("[SEEDREAM-COMBINE] fal.ai response received")
      
      // Debug: Log the full response structure
      console.log("[SEEDREAM-COMBINE] Full response structure:", JSON.stringify(result, null, 2))
      console.log("[SEEDREAM-COMBINE] Response analysis:", {
        hasData: !!result.data,
        hasImages: !!result.data?.images,
        imageCount: result.data?.images?.length || 0,
        dataKeys: result.data ? Object.keys(result.data) : [],
        resultKeys: Object.keys(result)
      })
      
      // Validate response
      if (!result.data || !result.data.images || !Array.isArray(result.data.images) || result.data.images.length === 0) {
        console.error("[SEEDREAM-COMBINE] Invalid response format - detailed analysis:")
        console.error("- result exists:", !!result)
        console.error("- result.data exists:", !!result.data)
        console.error("- result.data.images exists:", !!result.data?.images)
        console.error("- result.data.images is array:", Array.isArray(result.data?.images))
        console.error("- images length:", result.data?.images?.length || 0)
        console.error("- Full result object:", JSON.stringify(result, null, 2))
        
        return NextResponse.json({
          error: "No images generated",
          details: "fal.ai API returned no images. Check the prompt and input images.",
          debugInfo: {
            hasData: !!result.data,
            hasImages: !!result.data?.images,
            imageCount: result.data?.images?.length || 0,
            fullResponse: result
          }
        }, { status: 500 })
      }

      console.log("[SEEDREAM-COMBINE] Successfully generated", result.data.images.length, "images")

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
        inputImages: totalImages,
        settings: {
          aspect_ratio: aspectRatio,
          num_images: numImages,
          enable_safety_checker: enableSafetyChecker,
          negative_prompt: negativePrompt,
          image_size: imageSize
        },
        timestamp: new Date().toISOString()
      })

    } catch (falError) {
      console.error("[SEEDREAM-COMBINE] fal.ai API error:", falError)
      
      return NextResponse.json({
        error: "fal.ai API request failed",
        details: falError instanceof Error ? falError.message : "Unknown fal.ai API error",
        provider: "fal.ai",
        model: "fal-ai/bytedance/seedream/v4/edit"
      }, { status: 500 })
    }

  } catch (error) {
    console.error("[SEEDREAM-COMBINE] Unexpected error:", error)
    
    return NextResponse.json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}