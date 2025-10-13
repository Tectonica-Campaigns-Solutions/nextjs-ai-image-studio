import { NextRequest, NextResponse } from 'next/server'
import { fal } from "@fal-ai/client"

/**
 * POST /api/external/seedream-v4-edit
 * 
 * External API endpoint for SeDream v4 image style transfer.
 * This endpoint replicates the functionality of the main app's SeDream v4 feature
 * but without requiring authentication and with simplified parameters.
 * 
 * Body parameters (multipart/form-data):
 * - image (required): Image file to transform (PNG, JPG, JPEG, WEBP)
 * - aspect_ratio (optional): Output aspect ratio - one of: 1:1, 16:9, 9:16, 4:3, 3:4 (default: 1:1)
 *   Note: aspect_ratio is mapped to image_size parameter for the SeDream model
 * 
 * The endpoint automatically uses:
 * - A pre-configured style prompt from sedream_enhancement_text configuration
 * - A reference image for style transfer: https://v3.fal.media/files/monkey/huuJHd0OJn7pBsJc37rh5_Reference.jpg
 * 
 * Response format:
 * Success: { success: true, images: [{ url: string, width: number, height: number }], prompt: string }
 * Error: { success: false, error: string, details?: string }
 */

export async function POST(request: NextRequest) {
  try {
    console.log("[External SeDream v4] Processing request...")
    
    // Check if Fal.ai API key is available
    const falApiKey = process.env.FAL_API_KEY
    if (!falApiKey) {
      return NextResponse.json({ 
        success: false,
        error: "FAL_API_KEY not configured" 
      }, { status: 500 })
    }
    
    console.log("[External SeDream v4] Fal API Key exists:", !!falApiKey)
    
    // Configure fal.ai client with API key
    fal.config({
      credentials: falApiKey,
    })
    
    const formData = await request.formData()
    
    // Extract and validate required parameters
    const image = formData.get('image') as File
    const aspectRatio = (formData.get('aspect_ratio') as string) || '1:1'
    
    // Validate aspect_ratio parameter
    const validAspectRatios = ['1:1', '16:9', '9:16', '4:3', '3:4']
    if (!validAspectRatios.includes(aspectRatio)) {
      return NextResponse.json({ 
        success: false,
        error: "Invalid aspect_ratio parameter",
        details: `aspect_ratio must be one of: ${validAspectRatios.join(', ')}. Received: ${aspectRatio}`
      }, { status: 400 })
    }
    
    console.log("[External SeDream v4] Request parameters:", {
      hasImage: !!image,
      imageSize: image ? `${image.size} bytes` : "N/A",
      aspectRatio
    })

    // Validate required parameters
    if (!image) {
      return NextResponse.json({ 
        success: false,
        error: "Missing required 'image' parameter",
        details: "An image file is required for SeDream v4 style transfer"
      }, { status: 400 })
    }

    // Load the configured SeDream enhancement text
    let finalPrompt: string
    try {
      const { getSedreamEnhancementText } = await import("@/lib/json-enhancement")
      const configuredPrompt = await getSedreamEnhancementText()
      
      if (!configuredPrompt || !configuredPrompt.trim()) {
        console.error("[External SeDream v4] No sedream_enhancement_text configured")
        return NextResponse.json({ 
          success: false,
          error: "Configuration error",
          details: "No SeDream enhancement text configured"
        }, { status: 500 })
      }
      
      finalPrompt = configuredPrompt.trim()
      console.log("[External SeDream v4] Using configured prompt:", finalPrompt.substring(0, 100) + "...")
    } catch (configError) {
      console.error("[External SeDream v4] Config load error:", configError)
      return NextResponse.json({ 
        success: false,
        error: "Configuration error",
        details: "Failed to load SeDream enhancement configuration"
      }, { status: 500 })
    }

    // Validate file type
    const validMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!validMimeTypes.includes(image.type)) {
      return NextResponse.json({
        success: false,
        error: "Invalid file type",
        details: `File must be one of: ${validMimeTypes.join(', ')}. Received: ${image.type}`
      }, { status: 400 })
    }

    // Validate file size (max 10MB)
    const maxFileSize = 10 * 1024 * 1024 // 10MB
    if (image.size > maxFileSize) {
      return NextResponse.json({
        success: false,
        error: "File too large",
        details: `Maximum file size is 10MB. Received: ${(image.size / 1024 / 1024).toFixed(2)}MB`
      }, { status: 400 })
    }

    console.log("[External SeDream v4] Final prompt:", finalPrompt)

    // Load negative prompts from configuration
    let negativePrompts: string[] = []
    try {
      const fs = await import('fs').then(m => m.promises)
      const path = await import('path')
      const configPath = path.join(process.cwd(), 'data', 'rag', 'prompt-enhacement.json')
      const configData = await fs.readFile(configPath, 'utf-8')
      const config = JSON.parse(configData)
      
      // Combine all negative prompt categories for maximum protection
      const allNegatives = [
        ...(config.enforced_negatives || []),
        ...(config.enforced_negatives_nsfw || []),
        ...(config.enforced_negatives_age || []),
        ...(config.enforced_negatives_human_integrity || [])
      ]
      
      negativePrompts = allNegatives
      console.log("[External SeDream v4] Loaded negative prompts:", negativePrompts.length, "terms")
      console.log("[External SeDream v4] NSFW protection terms:", config.enforced_negatives_nsfw?.length || 0)
      console.log("[External SeDream v4] Age bias protection terms:", config.enforced_negatives_age?.length || 0)
      console.log("[External SeDream v4] Human integrity protection terms:", config.enforced_negatives_human_integrity?.length || 0)
      
    } catch (error) {
      console.warn("[External SeDream v4] Could not load negative prompts from config:", error)
      // Fallback to basic safety terms if config fails
      negativePrompts = [
        "naked", "nude", "sexual", "revealing", "inappropriate", "nsfw", "explicit",
        "younger", "child-like", "age regression", "juvenile appearance",
        "unrealistic proportions", "sexualized", "distorted anatomy"
      ]
      console.log("[External SeDream v4] Using fallback negative prompts:", negativePrompts.length, "terms")
    }

    // Upload image to fal.ai storage first
    console.log("[External SeDream v4] Uploading image to fal.ai storage...")
    
    try {
      // Upload the image and get URL
      const imageUrl = await fal.storage.upload(image)
      console.log("[External SeDream v4] Image uploaded successfully:", imageUrl)

      // Reference image URL (fixed, invisible to user)
      const referenceImageUrl = "https://v3.fal.media/files/monkey/huuJHd0OJn7pBsJc37rh5_Reference.jpg"

      console.log("[External SeDream v4] Calling fal.ai API...")

      // Calculate image_size from aspect ratio selection
      let imageSize: string | { width: number; height: number }
      
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

      // Prepare input for SeDream v4 Edit (uses image_urls array, not single image)
      const negativePromptString = negativePrompts.join(", ")
      const input = {
        prompt: finalPrompt,
        negative_prompt: negativePromptString,
        image_urls: [imageUrl, referenceImageUrl],
        num_images: 1,
        enable_safety_checker: true,
        image_size: imageSize
      }

      console.log("[External SeDream v4] API Input:", {
        prompt: input.prompt,
        negativePrompt: `${negativePromptString.substring(0, 100)}...`,
        negativePromptTerms: negativePrompts.length,
        imageUrls: input.image_urls,
        numImages: input.num_images,
        aspectRatio: aspectRatio,
        imageSize: input.image_size
      })

      // Call SeDream v4 Edit API
      const result = await fal.subscribe("fal-ai/bytedance/seedream/v4/edit", {
        input,
        logs: true,
        onQueueUpdate: (update) => {
          if (update.status === "IN_PROGRESS") {
            console.log("[External SeDream v4] Progress:", update.logs?.map(log => log.message).join(" ") || "Processing...")
          }
        }
      })

      console.log("[External SeDream v4] API Response:", {
        hasData: !!result.data,
        hasImages: !!result.data?.images,
        imageCount: result.data?.images?.length || 0
      })

      // Validate response
      if (!result.data || !result.data.images || !Array.isArray(result.data.images) || result.data.images.length === 0) {
        console.error("[External SeDream v4] Invalid response format:", result)
        return NextResponse.json({ 
          success: false,
          error: "Invalid response from SeDream API",
          details: "No images were generated"
        }, { status: 500 })
      }

      console.log("[External SeDream v4] Successfully processed with SeDream v4")
      
      // Return the result in external API format
      return NextResponse.json({
        success: true,
        images: result.data.images,
        prompt: finalPrompt,
        negativePrompt: negativePromptString,
        safetyProtections: {
          negativeTermsApplied: negativePrompts.length,
          nsfwProtection: true,
          ageBiasProtection: true,
          humanIntegrityProtection: true,
          safetyCheckerEnabled: true
        },
        referenceUsed: referenceImageUrl
      })

    } catch (uploadError) {
      console.error("[External SeDream v4] Upload error:", uploadError)
      return NextResponse.json({
        success: false,
        error: "Failed to upload image",
        details: uploadError instanceof Error ? uploadError.message : "Unknown upload error"
      }, { status: 500 })
    }

  } catch (error: any) {
    console.error("[External SeDream v4] API Error:", error)
    
    // Handle specific fal.ai errors
    if (error.message?.includes('ValidationError')) {
      return NextResponse.json({ 
        success: false,
        error: "Invalid input parameters",
        details: error.message
      }, { status: 400 })
    }
    
    if (error.status === 401) {
      return NextResponse.json({ 
        success: false,
        error: "Authentication failed",
        details: "Invalid or missing FAL_API_KEY"
      }, { status: 401 })
    }
    
    if (error.status === 429) {
      return NextResponse.json({ 
        success: false,
        error: "Rate limit exceeded",
        details: "Too many requests, please try again later"
      }, { status: 429 })
    }

    return NextResponse.json({ 
      success: false,
      error: "Internal server error",
      details: error.message || "Failed to process SeDream v4 edit request"
    }, { status: 500 })
  }
}

/**
 * GET /api/external/seedream-v4-edit
 * 
 * Returns API documentation and usage information
 */
export async function GET() {
  return NextResponse.json({
    name: "SeDream v4 Style Transfer API",
    description: "Transform images with AI-powered style transfer using SeDream v4",
    version: "1.0.0",
    endpoint: "/api/external/seedream-v4-edit",
    method: "POST",
    contentType: "multipart/form-data",
    parameters: {
      image: {
        type: "file",
        required: true,
        description: "Image file to transform (PNG, JPG, JPEG, WEBP)",
        maxSize: "10MB"
      },
      aspect_ratio: {
        type: "string",
        required: false,
        description: "Output aspect ratio",
        options: ["1:1", "16:9", "9:16", "4:3", "3:4"],
        default: "1:1"
      }
    },
    response: {
      success: {
        success: true,
        images: [
          {
            url: "https://example.com/generated-image.png",
            width: 1280,
            height: 1280
          }
        ],
        prompt: "Final prompt used for generation",
        negativePrompt: "Combined negative prompts for safety",
        safetyProtections: {
          negativeTermsApplied: 70,
          nsfwProtection: true,
          ageBiasProtection: true,
          humanIntegrityProtection: true,
          safetyCheckerEnabled: true
        },
        referenceUsed: "https://v3.fal.media/files/monkey/huuJHd0OJn7pBsJc37rh5_Reference.jpg"
      },
      error: {
        success: false,
        error: "Error description",
        details: "Additional error details"
      }
    },
    examples: {
      curl: `curl -X POST https://your-domain.com/api/external/seedream-v4-edit \\
  -F "image=@/path/to/your/image.jpg" \\
  -F "aspect_ratio=16:9"`
    },
    notes: [
      "Uses a pre-configured style prompt from sedream_enhancement_text configuration",
      "A reference image is automatically used for style transfer",
      "The transformation preserves the main subject while applying the configured style",
      "Processing time varies based on image complexity and server load",
      "No prompt input required - the style is automatically applied",
      "Advanced safety protections automatically applied:",
      "  • NSFW content prevention with 25+ negative terms",
      "  • Age bias prevention to avoid inappropriate age modifications",
      "  • Human integrity protection to maintain realistic proportions",
      "  • Built-in content moderation and safety checker",
      "Multiple layers of protection ensure ethical and appropriate results"
    ]
  })
}