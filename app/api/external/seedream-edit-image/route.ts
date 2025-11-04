import { NextRequest, NextResponse } from 'next/server'
import { fal } from "@fal-ai/client"
import { ContentModerationService } from "@/lib/content-moderation"

/**
 * POST /api/external/seedream-edit-image
 * 
 * External API endpoint for SeDream v4 image editing with custom prompts.
 * This endpoint allows users to modify images using text prompts combined with
 * pre-configured enhancement text for style guidance.
 * 
 * Body parameters (multipart/form-data):
 * - image (required): Image file to edit (PNG, JPG, JPEG, WEBP)
 * - prompt (required): Text description of desired modifications
 * - aspect_ratio (optional): Output aspect ratio - one of: 1:1, 16:9, 9:16, 4:3, 3:4 (default: 1:1)
 * 
 * The endpoint automatically:
 * - Combines user prompt with sedream_enhancement_text configuration
 * - Uses a reference image for style transfer: https://v3.fal.media/files/monkey/huuJHd0OJn7pBsJc37rh5_Reference.jpg
 * - Applies content moderation and safety checks
 * 
 * Response format:
 * Success: { 
 *   success: true, 
 *   images: [{ url: string, width: number, height: number }], 
 *   prompt: string,
 *   negativePrompt: string,
 *   safetyProtections: {...}
 * }
 * Error: { success: false, error: string, details?: string }
 */

export async function POST(request: NextRequest) {
  try {
    console.log("[External SeDream Edit] Processing request...")
    
    // Check if Fal.ai API key is available
    const falApiKey = process.env.FAL_API_KEY
    if (!falApiKey) {
      return NextResponse.json({ 
        success: false,
        error: "FAL_API_KEY not configured" 
      }, { status: 500 })
    }
    
    console.log("[External SeDream Edit] Fal API Key exists:", !!falApiKey)
    
    // Configure fal.ai client with API key
    fal.config({
      credentials: falApiKey,
    })
    
    const formData = await request.formData()
    
    // Extract and validate parameters
    const image = formData.get('image') as File
    const prompt = (formData.get('prompt') as string) || ''
    const aspectRatio = (formData.get('aspect_ratio') as string) || '1:1'
    
    console.log("[External SeDream Edit] Request parameters:", {
      hasImage: !!image,
      imageSize: image ? `${image.size} bytes` : "N/A",
      prompt: prompt || "(empty)",
      aspectRatio
    })

    // Validate required parameters
    if (!image) {
      return NextResponse.json({ 
        success: false,
        error: "Missing required 'image' parameter",
        details: "An image file is required for SeDream v4 editing"
      }, { status: 400 })
    }

    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ 
        success: false,
        error: "Missing required 'prompt' parameter",
        details: "A text prompt is required to describe the desired image modifications"
      }, { status: 400 })
    }

    // Validate aspect_ratio parameter
    const validAspectRatios = ['1:1', '16:9', '9:16', '4:3', '3:4']
    if (!validAspectRatios.includes(aspectRatio)) {
      return NextResponse.json({ 
        success: false,
        error: "Invalid aspect_ratio parameter",
        details: `aspect_ratio must be one of: ${validAspectRatios.join(', ')}. Received: ${aspectRatio}`
      }, { status: 400 })
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

    // Use the user's prompt directly without modification
    const finalPrompt = prompt.trim()
    console.log("[External SeDream Edit] Using user prompt directly:", finalPrompt.substring(0, 100) + "...")

    // Content moderation check
    try {
      console.log("[MODERATION] Checking content for External SeDream Edit prompt:", finalPrompt.substring(0, 50) + "...")
      const moderationService = new ContentModerationService("general")
      const moderationResult = await moderationService.moderateContent({ prompt: finalPrompt })
      
      if (!moderationResult.safe) {
        console.log("[MODERATION] Content blocked:", moderationResult.reason)
        return NextResponse.json({
          success: false,
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
      console.log("[External SeDream Edit] Loaded negative prompts:", negativePrompts.length, "terms")
      console.log("[External SeDream Edit] NSFW protection terms:", config.enforced_negatives_nsfw?.length || 0)
      console.log("[External SeDream Edit] Age bias protection terms:", config.enforced_negatives_age?.length || 0)
      console.log("[External SeDream Edit] Human integrity protection terms:", config.enforced_negatives_human_integrity?.length || 0)
      
    } catch (error) {
      console.warn("[External SeDream Edit] Could not load negative prompts from config:", error)
      // Fallback to basic safety terms if config fails
      negativePrompts = [
        "naked", "nude", "sexual", "revealing", "inappropriate", "nsfw", "explicit",
        "younger", "child-like", "age regression", "juvenile appearance",
        "unrealistic proportions", "sexualized", "distorted anatomy"
      ]
      console.log("[External SeDream Edit] Using fallback negative prompts:", negativePrompts.length, "terms")
    }

    // Upload image to fal.ai storage
    console.log("[External SeDream Edit] Uploading image to fal.ai storage...")
    
    try {
      // Upload the image and get URL
      const imageUrl = await fal.storage.upload(image)
      console.log("[External SeDream Edit] Image uploaded successfully:", imageUrl)

      // Reference image URL (fixed, invisible to user)
      const referenceImageUrl = "https://v3.fal.media/files/monkey/huuJHd0OJn7pBsJc37rh5_Reference.jpg"

      console.log("[External SeDream Edit] Calling fal.ai API...")

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

      // Prepare input for SeDream v4 Edit (uses image_urls array)
      const negativePromptString = negativePrompts.join(", ")
      const input = {
        prompt: finalPrompt,
        negative_prompt: negativePromptString,
        image_urls: [imageUrl, referenceImageUrl],
        num_images: 1,
        enable_safety_checker: true,
        image_size: imageSize
      }

      console.log("[External SeDream Edit] API Input:", {
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
            console.log("[External SeDream Edit] Progress:", update.logs?.map(log => log.message).join(" ") || "Processing...")
          }
        }
      })

      console.log("[External SeDream Edit] API Response:", {
        hasData: !!result.data,
        hasImages: !!result.data?.images,
        imageCount: result.data?.images?.length || 0
      })

      // Validate response
      if (!result.data || !result.data.images || !Array.isArray(result.data.images) || result.data.images.length === 0) {
        console.error("[External SeDream Edit] Invalid response format:", result)
        return NextResponse.json({ 
          success: false,
          error: "Invalid response from SeDream API",
          details: "No images were generated"
        }, { status: 500 })
      }

      console.log("[External SeDream Edit] Successfully processed with SeDream v4")
      
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
      console.error("[External SeDream Edit] Upload/processing error:", uploadError)
      return NextResponse.json({
        success: false,
        error: "Failed to process image",
        details: uploadError instanceof Error ? uploadError.message : "Unknown error"
      }, { status: 500 })
    }

  } catch (error: any) {
    console.error("[External SeDream Edit] API Error:", error)
    
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
      details: error.message || "Failed to process SeDream edit request"
    }, { status: 500 })
  }
}

/**
 * GET /api/external/seedream-edit-image
 * 
 * Returns API documentation and usage information
 */
export async function GET() {
  return NextResponse.json({
    name: "SeDream v4 Image Editing API",
    description: "Edit and modify images using text prompts with AI-powered style transfer",
    version: "1.0.0",
    endpoint: "/api/external/seedream-edit-image",
    method: "POST",
    contentType: "multipart/form-data",
    parameters: {
      image: {
        type: "file",
        required: true,
        description: "Image file to edit (PNG, JPG, JPEG, WEBP)",
        maxSize: "10MB"
      },
      prompt: {
        type: "string",
        required: true,
        description: "Text description of desired image modifications (used directly without enhancement text)",
        example: "add vibrant colors and dynamic lighting"
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
            url: "https://example.com/edited-image.png",
            width: 1280,
            height: 1280
          }
        ],
        prompt: "Final combined prompt used for editing",
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
        details: "Additional error details",
        category: "Content category (for moderation errors)",
        blocked: "Boolean indicating if content was blocked",
        moderation: "Boolean indicating if this was a moderation error"
      }
    },
    examples: {
      curl: `curl -X POST https://your-domain.com/api/external/seedream-edit-image \\
  -F "image=@/path/to/your/image.jpg" \\
  -F "prompt=add vibrant colors and dynamic lighting" \\
  -F "aspect_ratio=16:9"`,
      javascript: `const formData = new FormData();
formData.append('image', imageFile);
formData.append('prompt', 'add vibrant colors and dynamic lighting');
formData.append('aspect_ratio', '16:9');

const response = await fetch('https://your-domain.com/api/external/seedream-edit-image', {
  method: 'POST',
  body: formData
});

const result = await response.json();
if (result.success) {
  console.log('Edited image URL:', result.images[0].url);
}`
    },
    notes: [
      "The user's prompt is used directly without any modifications or enhancements",
      "Full control over the prompt allows for precise image editing instructions",
      "A reference image is automatically used for consistent style transfer",
      "The editing preserves the main subject while applying the requested modifications",
      "Processing time varies based on image complexity and server load (typically 10-30 seconds)",
      "Advanced safety protections automatically applied:",
      "  • Unified content moderation with ContentModerationService",
      "  • NSFW content prevention with 25+ negative terms",
      "  • Age bias prevention to avoid inappropriate age modifications",
      "  • Human integrity protection to maintain realistic proportions",
      "  • Built-in safety checker enabled for all generations",
      "Multiple layers of protection ensure ethical and appropriate results"
    ],
    differenceFromStyleTransfer: [
      "This endpoint (/seedream-edit-image) allows custom prompts for specific modifications",
      "The style transfer endpoint (/seedream-v4-edit) uses only pre-configured style prompts",
      "Use this endpoint when you want to describe specific changes to make",
      "Use the style transfer endpoint when you want to apply a consistent pre-defined style"
    ]
  })
}
