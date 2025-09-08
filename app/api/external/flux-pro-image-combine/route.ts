import { NextRequest, NextResponse } from 'next/server'
import { fal } from "@fal-ai/client"

/**
 * POST /api/external/flux-pro-image-combine
 * 
 * External API endpoint for combining multiple images using Flux Pro Multi model.
 * This endpoint allows external applications to combine multiple input images
 * into a single new image without requiring authentication.
 * 
 * Body parameters:
 * - prompt (required): Text description for how to combine the images
 * - imageUrls (required): Array of image URLs to combine (minimum 2 images)
 * - useRAG (optional): Whether to enhance prompt with branding guidelines (default: true)
 * - settings (optional): Advanced generation settings
 * 
 * Advanced settings include:
 * - aspect_ratio: Output aspect ratio (1:1, 4:3, 3:4, 16:9, 9:16, 21:9, default: 1:1)
 * - guidance_scale: Prompt adherence (1-20, default: 3.5)
 * - num_images: Number of combined images to generate (always 1 for combination)
 * - seed: Random seed for reproducible results
 * - safety_tolerance: Content safety level (1-6, default: 2)
 * - output_format: Image format (jpeg, png, webp, default: jpeg)
 * - enhance_prompt: Whether to automatically enhance the prompt (default: false)
 * 
 * Response format:
 * {
 *   "success": true,
 *   "image": "https://fal.media/files/...",
 *   "width": 1024,
 *   "height": 1024,
 *   "content_type": "image/jpeg",
 *   "prompt": "enhanced prompt used",
 *   "model": "flux-pro/kontext/max/multi",
 *   "inputImages": 2,
 *   "settings": {...}
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required parameters
    if (!body.prompt || typeof body.prompt !== 'string' || !body.prompt.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing or invalid 'prompt' parameter",
          details: "Prompt must be a non-empty string"
        },
        { status: 400 }
      )
    }

    if (!body.imageUrls || !Array.isArray(body.imageUrls) || body.imageUrls.length < 2) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing or invalid 'imageUrls' parameter",
          details: "imageUrls must be an array with at least 2 image URLs"
        },
        { status: 400 }
      )
    }

    // Validate that all imageUrls are valid strings
    const invalidUrls = body.imageUrls.filter((url: any) => !url || typeof url !== 'string' || !url.trim())
    if (invalidUrls.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid image URLs detected",
          details: "All imageUrls must be non-empty strings"
        },
        { status: 400 }
      )
    }

    // Extract parameters with defaults
    const {
      prompt,
      imageUrls,
      useRAG = true,
      settings = {}
    } = body

    console.log("[External Flux Combine] Request received:")
    console.log("  - Prompt:", prompt.substring(0, 100) + "...")
    console.log("  - Image URLs count:", imageUrls.length)
    console.log("  - Use RAG:", useRAG)
    console.log("  - Settings:", settings)

    // Basic content moderation
    const moderationResult = await basicContentModeration(prompt)
    if (!moderationResult.safe) {
      console.log("[External Flux Combine] Content blocked:", moderationResult.reason)
      return NextResponse.json(
        {
          success: false,
          error: "Content moderation failed",
          details: moderationResult.reason,
          category: moderationResult.category
        },
        { status: 400 }
      )
    }

    // Check if Fal.ai API key is available
    const falApiKey = process.env.FAL_API_KEY
    if (!falApiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Service configuration error",
          details: "Image generation service not available"
        },
        { status: 500 }
      )
    }

    // Enhance prompt with RAG if requested
    let finalPrompt = prompt
    if (useRAG) {
      try {
        // Simple hardcoded branding enhancement for external API
        const brandingContext = `
Style guidelines: Create professional, high-quality, visually appealing compositions.
Ensure good lighting, proper contrast, and cohesive visual elements.
Maintain brand consistency with clean, modern aesthetics.
`
        finalPrompt = `${prompt}\n\n${brandingContext}`
        console.log("[External Flux Combine] Enhanced prompt with branding guidelines")
      } catch (error) {
        console.warn("[External Flux Combine] RAG enhancement failed, using original prompt:", error)
        finalPrompt = prompt
      }
    }

    // Configure Fal.ai client
    fal.config({
      credentials: falApiKey,
    })

    // Prepare default settings
    const defaultSettings = {
      aspect_ratio: "1:1",
      guidance_scale: 3.5,
      num_images: 1, // Always 1 for combination
      safety_tolerance: 2,
      output_format: "jpeg",
      enhance_prompt: false
    }

    const mergedSettings = { ...defaultSettings, ...settings }

    // Prepare input for Flux Pro Multi
    const input: any = {
      prompt: finalPrompt,
      image_urls: imageUrls, // Multiple input images
      aspect_ratio: mergedSettings.aspect_ratio,
      guidance_scale: mergedSettings.guidance_scale,
      num_images: mergedSettings.num_images,
      safety_tolerance: mergedSettings.safety_tolerance,
      output_format: mergedSettings.output_format,
      enhance_prompt: mergedSettings.enhance_prompt
    }

    // Add seed if provided
    if (mergedSettings.seed !== undefined && mergedSettings.seed !== null && mergedSettings.seed !== "") {
      input.seed = parseInt(mergedSettings.seed.toString())
    }

    console.log("[External Flux Combine] Calling fal.ai with input:")
    console.log("  - Model: fal-ai/flux-pro/kontext/max/multi")
    console.log("  - Input images:", imageUrls.length)
    console.log("  - Settings:", JSON.stringify(mergedSettings, null, 2))

    try {
      // Direct call to fal.ai
      const result = await fal.subscribe("fal-ai/flux-pro/kontext/max/multi", {
        input,
        logs: true,
        onQueueUpdate: (update: any) => {
          if (update.status === "IN_PROGRESS") {
            update.logs.map((log: any) => log.message).forEach(console.log)
          }
        },
      })

      console.log("[External Flux Combine] Fal.ai result:", result)

      if (result.data && result.data.images && result.data.images.length > 0) {
        const combinedImage = result.data.images[0] // Single combined result
        
        // Format response for external API with URLs
        const externalResponse = {
          success: true,
          image: combinedImage.url,
          width: combinedImage.width,
          height: combinedImage.height,
          content_type: combinedImage.content_type || "image/jpeg",
          prompt: finalPrompt,
          originalPrompt: prompt,
          inputImages: imageUrls.length,
          settings: mergedSettings,
          model: "flux-pro/kontext/max/multi",
          timestamp: new Date().toISOString(),
          ragEnhanced: useRAG
        }

        console.log("[External Flux Combine] ✅ Image combination successful")
        return NextResponse.json(externalResponse)
      } else {
        throw new Error("No combined image returned from Flux Pro Multi")
      }
    } catch (falError) {
      console.error("[External Flux Combine] Direct Fal.ai call failed:", falError)
      
      // Fallback to internal API
      console.log("[External Flux Combine] Falling back to internal API...")
      
      try {
        const fallbackFormData = new FormData()
        fallbackFormData.append("prompt", prompt)
        fallbackFormData.append("useRag", useRAG.toString())
        fallbackFormData.append("activeRAGId", "external-branding")
        fallbackFormData.append("activeRAGName", "External Branding")
        fallbackFormData.append("orgType", "general")
        
        // Add image URLs to form data
        imageUrls.forEach((url: string, index: number) => {
          fallbackFormData.append(`imageUrl${index}`, url)
        })
        
        fallbackFormData.append("settings", JSON.stringify(settings))

        const internalResponse = await fetch(`${request.nextUrl.origin}/api/flux-pro-image-combine`, {
          method: 'POST',
          body: fallbackFormData,
        })

        if (internalResponse.ok) {
          const internalResult = await internalResponse.json()
          
          if (internalResult.success && internalResult.image) {
            // Format response for external API
            const externalResponse = {
              success: true,
              image: internalResult.image,
              width: internalResult.width,
              height: internalResult.height,
              content_type: internalResult.content_type || "image/jpeg",
              prompt: internalResult.finalPrompt || finalPrompt,
              originalPrompt: prompt,
              inputImages: imageUrls.length,
              settings: internalResult.settings || mergedSettings,
              model: "flux-pro/kontext/max/multi",
              timestamp: new Date().toISOString(),
              ragEnhanced: useRAG,
              fallback: true
            }

            console.log("[External Flux Combine] ✅ Fallback successful")
            return NextResponse.json(externalResponse)
          }
        }
        
        console.error("[External Flux Combine] Fallback also failed:", await internalResponse.text())
        throw new Error("Both direct and fallback methods failed")
      } catch (fallbackError) {
        console.error("[External Flux Combine] Fallback failed:", fallbackError)
        throw falError // Re-throw original error
      }
    }

  } catch (error) {
    console.error('[External Flux Combine API] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to combine images',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}

/**
 * OPTIONS /api/external/flux-pro-image-combine
 * 
 * CORS preflight handler for external image combination endpoint
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  })
}

/**
 * Basic content moderation function
 * This is a simple implementation - can be enhanced with external services
 */
async function basicContentModeration(prompt: string): Promise<{ safe: boolean; reason?: string; category?: string }> {
  // Basic content moderation - can be enhanced with external services
  const blockedTerms = [
    'nude', 'naked', 'sex', 'explicit', 'porn', 'violence', 'gore', 'blood', 'weapon',
    'drug', 'hate', 'racist', 'discriminat', 'illegal', 'terrorist', 'bomb', 'kill'
  ]
  
  const lowerPrompt = prompt.toLowerCase()
  const foundTerm = blockedTerms.find(term => lowerPrompt.includes(term))
  
  if (foundTerm) {
    return {
      safe: false,
      reason: `Content contains inappropriate material: ${foundTerm}`,
      category: 'inappropriate_content'
    }
  }
  
  return { safe: true }
}
