import { NextRequest, NextResponse } from 'next/server'
import { fal } from "@fal-ai/client"

/**
 * POST /api/external/flux-pro-image-combine
 * 
 * External API endpoint for combining multiple images using Flux Pro Multi model.
 * This endpoint allows external applications to combine multiple input images
 * into a single new image without requiring authentication.
 * 
 * Supports two input methods:
 * 1. JSON with imageUrls array (existing functionality)
 * 2. multipart/form-data with uploaded files and/or URLs (new functionality)
 * 
 * JSON Body parameters:
 * - prompt (required): Text description for how to combine the images
 * - imageUrls (required): Array of image URLs to combine (minimum 2 images)
 * - jsonOptions (optional): JSON enhancement configuration  
 *   - customText: Custom enhancement description (if not provided, uses enhancement_text: "Make the first image have the style of the other image. Same color palette and same background. People must be kept realistic but rendered in purple and white, with diagonal or curved line textures giving a screen-printed, retro feel.")
 *   - intensity: Enhancement intensity (0.1-1.0, default: 1.0)
 * 
 * JSON Enhancement is always enabled and automatically appends enhancement_text to the user prompt.
 * RAG enhancement has been disabled for simplicity.
 * - settings (optional): Advanced generation settings
 * 
 * Form Data parameters:
 * - prompt (required): Text description for how to combine the images
 * - image0, image1, image2... (optional): Image files to upload and combine
 * - imageUrl0, imageUrl1, imageUrl2... (optional): Image URLs to combine
 * - useRAG (optional): Whether to enhance prompt with branding guidelines (default: false)
 * - useJSONEnhancement (optional): Whether to apply JSON-based prompt enhancement (default: true)
 * - jsonOptions (optional): JSON string with enhancement configuration
 * - settings (optional): JSON string with advanced generation settings
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
    // Detect content type to handle both JSON and form data
    const contentType = request.headers.get('content-type') || ''
    let body: any = {}
    let imageFiles: File[] = []
    let imageUrls: string[] = []
    
    if (contentType.includes('multipart/form-data')) {
      // Handle multipart/form-data for file uploads
      const formData = await request.formData()
      
      // Extract basic parameters
      body.prompt = formData.get("prompt") as string
      body.useRAG = false // Disabled for simplicity
      body.useJSONEnhancement = true // Always enabled by default
      
      // Parse JSON options if provided
      const jsonOptionsStr = formData.get("jsonOptions") as string
      if (jsonOptionsStr) {
        try {
          body.jsonOptions = JSON.parse(jsonOptionsStr)
        } catch (error) {
          console.warn("[External Flux Combine] Failed to parse JSON options:", error)
          body.jsonOptions = {}
        }
      } else {
        body.jsonOptions = {}
      }
      
      // Parse settings if provided
      const settingsStr = formData.get("settings") as string
      if (settingsStr) {
        try {
          body.settings = JSON.parse(settingsStr)
        } catch (error) {
          console.warn("[External Flux Combine] Failed to parse settings:", error)
          body.settings = {}
        }
      } else {
        body.settings = {}
      }
      
      // Extract image files and URLs
      for (const [key, value] of formData.entries()) {
        if (key.startsWith('image') && value instanceof File && key.match(/^image\d+$/)) {
          imageFiles.push(value)
          console.log(`[External Flux Combine] Found image file: ${key}, size: ${value.size}, type: ${value.type}`)
        } else if (key.startsWith('imageUrl') && typeof value === 'string' && value.trim()) {
          imageUrls.push(value.trim())
          console.log(`[External Flux Combine] Found image URL: ${key}, url: ${value}`)
        }
      }
      
      console.log("[External Flux Combine] Form data processing complete:")
      console.log("  - Image files:", imageFiles.length)
      console.log("  - Image URLs:", imageUrls.length)
      
    } else {
      // Handle JSON requests (existing functionality)
      body = await request.json()
      imageUrls = body.imageUrls || []
      
      // Set defaults for JSON requests
      body.useRAG = false // Disabled for simplicity  
      body.useJSONEnhancement = true // Always enabled
      body.jsonOptions = body.jsonOptions || {}
    }
    
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

    // Validate that we have at least 2 images (files + URLs)
    const totalImages = imageFiles.length + imageUrls.length
    if (totalImages < 2) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing or insufficient images",
          details: `At least 2 images are required for combination. Found ${imageFiles.length} files and ${imageUrls.length} URLs (total: ${totalImages})`
        },
        { status: 400 }
      )
    }

    // Validate that all imageUrls are valid strings
    const invalidUrls = imageUrls.filter((url: any) => !url || typeof url !== 'string' || !url.trim())
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

    // Validate image files
    const maxFileSize = 10 * 1024 * 1024 // 10MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    
    for (const file of imageFiles) {
      if (file.size > maxFileSize) {
        return NextResponse.json(
          {
            success: false,
            error: "File too large",
            details: `File ${file.name} is ${Math.round(file.size / 1024 / 1024)}MB. Maximum allowed size is 10MB.`
          },
          { status: 413 }
        )
      }
      
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          {
            success: false,
            error: "Unsupported file type",
            details: `File ${file.name} has type ${file.type}. Allowed types: ${allowedTypes.join(', ')}`
          },
          { status: 415 }
        )
      }
    }

    // Extract parameters with defaults
    const {
      prompt,
      useRAG = false, // RAG disabled for image combination
      useJSONEnhancement = true, // JSON enhancement enabled by default
      jsonOptions = {},
      settings = {}
    } = body

    // Set default values for jsonOptions if not provided
    const defaultJsonOptions = {
      intensity: 1.0, // Default intensity at 100% for Combine Images
      customText: '', // Will use edit_enhancement_text if empty
      ...jsonOptions
    }

    console.log("[External Flux Combine] Request received:")
    console.log("  - Prompt:", prompt.substring(0, 100) + "...")
    console.log("  - Image files count:", imageFiles.length)
    console.log("  - Image URLs count:", imageUrls.length)
    console.log("  - Total images:", totalImages)
    console.log("  - Use RAG:", useRAG, "(disabled for combination)")
    console.log("  - Use JSON Enhancement:", useJSONEnhancement)
    console.log("  - JSON Options:", defaultJsonOptions)
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

    // Apply JSON enhancement with enhancement_text (always enabled for Combine Images)
    let finalPrompt = prompt
    let enhancementText = defaultJsonOptions.customText
    
    if (!enhancementText) {
      // Try to load enhancement_text from config first
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/enhancement-config`)
        const { success, config } = await response.json()
        if (success && config?.enhancement_text) {
          enhancementText = config.enhancement_text
          console.log("[External Flux Combine] Loaded enhancement_text:", enhancementText)
        }
      } catch (error) {
        console.warn("[External Flux Combine] Could not load from API:", error)
      }
      
      // Fallback to hardcoded enhancement_text if API failed
      if (!enhancementText) {
        enhancementText = "Make the first image have the style of the other image. Same color palette and same background. People must be kept realistic but rendered in purple and white, with diagonal or curved line textures giving a screen-printed, retro feel."
        console.log("[External Flux Combine] Using hardcoded enhancement_text")
      }
    }

    // Apply enhancement text directly to the prompt
    finalPrompt = `${prompt}, ${enhancementText}`
    console.log("[External Flux Combine] Enhanced prompt:", finalPrompt)

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

    // Upload image files to fal.ai storage if any
    const allImageUrls: string[] = [...imageUrls]
    
    if (imageFiles.length > 0) {
      console.log("[External Flux Combine] Uploading image files to fal.ai storage...")
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i]
        try {
          console.log(`[External Flux Combine] Uploading image ${i + 1}/${imageFiles.length}: ${file.name} (${file.size} bytes)`)
          const uploadedUrl = await fal.storage.upload(file)
          allImageUrls.push(uploadedUrl)
          console.log(`[External Flux Combine] Image ${i + 1} uploaded successfully: ${uploadedUrl}`)
        } catch (uploadError) {
          console.error(`[External Flux Combine] Failed to upload image ${i + 1}:`, uploadError)
          return NextResponse.json({ 
            success: false,
            error: `Failed to upload image ${i + 1}: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`,
            details: `File: ${file.name}, Size: ${file.size} bytes`
          }, { status: 500 })
        }
      }
    }

    console.log("[External Flux Combine] All image URLs ready:", allImageUrls.length, "total images")

    // Prepare input for Flux Pro Multi
    const input: any = {
      prompt: finalPrompt,
      image_urls: allImageUrls, // Combined URLs from uploads and direct URLs
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
    console.log("  - Input images:", allImageUrls.length)
    console.log("  - Files uploaded:", imageFiles.length)
    console.log("  - Direct URLs:", imageUrls.length)
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
          inputImages: allImageUrls.length,
          uploadedFiles: imageFiles.length,
          directUrls: imageUrls.length,
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
        fallbackFormData.append("prompt", finalPrompt) // Use enhanced prompt
        fallbackFormData.append("useRag", "false") // Disable RAG for image combination
        fallbackFormData.append("activeRAGId", "none")
        fallbackFormData.append("activeRAGName", "None")
        fallbackFormData.append("orgType", "general")
        
        // Add image URLs to form data
        allImageUrls.forEach((url: string, index: number) => {
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
              inputImages: allImageUrls.length,
              uploadedFiles: imageFiles.length,
              directUrls: imageUrls.length,
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
