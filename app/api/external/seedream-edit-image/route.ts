import { NextRequest, NextResponse } from 'next/server'
import { fal } from "@fal-ai/client"
import { ContentModerationService } from "@/lib/content-moderation"
import { addDisclaimerToImage } from "@/lib/image-disclaimer"
import sharp from 'sharp'

/**
 * POST /api/external/seedream-edit-image
 * 
 * External API endpoint for SeDream v4 image editing with custom prompts.
 * This endpoint allows users to modify images using text prompts.
 * 
 * IMPORTANT: This endpoint ONLY accepts JSON payloads with Content-Type: application/json
 * 
 * Body parameters (JSON):
 * - base64Image (optional): Base64-encoded image data (with or without data:image prefix)
 * - imageUrl (optional): URL of image to edit
 * - prompt (required): Text description of desired modifications
 * - aspect_ratio (optional): Output aspect ratio - one of: 1:1, 16:9, 9:16, 4:3, 3:4, custom (default: 1:1)
 * - custom_width (optional): Width in pixels (512-2048, required if aspect_ratio is 'custom')
 * - custom_height (optional): Height in pixels (512-2048, required if aspect_ratio is 'custom')
 * 
 * Note: Provide either base64Image OR imageUrl (not both)
 * 
 * The endpoint automatically:
 * - Validates and processes Base64 images
 * - Applies content moderation and safety checks
 * - Adds negative prompts for safety
 * 
 * Response format:
 * Success: { 
 *   success: true, 
 *   images: [{ url: string, width: number, height: number }], 
 *   prompt: string,
 *   negativePrompt: string,
 *   safetyProtections: {...},
 *   inputImage: string,
 *   aspectRatio: string
 * }
 * Error: { success: false, error: string, details?: string }
 */

export async function POST(request: NextRequest) {
  try {
    console.log("[External SeDream Edit] Processing request...")
    
    // Validate Content-Type
    const contentType = request.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      return NextResponse.json({
        success: false,
        error: "Invalid Content-Type",
        details: "This endpoint only accepts application/json. Received: " + contentType
      }, { status: 415 }) // 415 Unsupported Media Type
    }
    
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
    
    // ============================================================================
    // JSON-ONLY PARSER: Accepts only Base64 images and URLs
    // ============================================================================
    const body = await request.json()
    
    // Support both direct parameters and nested settings object
    const settings = body.settings || {}
    
    const base64Image = body.base64Image || null
    const imageUrl = body.imageUrl || null
    const prompt = body.prompt || ''
    
    // Prioritize direct parameters over settings
    const aspectRatio = body.aspect_ratio || settings.aspect_ratio || '1:1'
    const customWidth = body.custom_width || settings.custom_width
    const customHeight = body.custom_height || settings.custom_height
    
    const parsedCustomWidth = customWidth ? parseInt(customWidth.toString()) : undefined
    const parsedCustomHeight = customHeight ? parseInt(customHeight.toString()) : undefined
    
    console.log('[External SeDream Edit] JSON input:', {
      hasBase64: !!base64Image,
      base64Length: base64Image?.length || 0,
      hasImageUrl: !!imageUrl,
      imageUrl: imageUrl || 'N/A',
      prompt: prompt.substring(0, 50) + '...',
      aspectRatio,
      customWidth: parsedCustomWidth,
      customHeight: parsedCustomHeight
    })
    
    // Validate prompt
    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ 
        success: false,
        error: "Missing required 'prompt' parameter",
        details: "A text prompt is required to describe the desired image modifications"
      }, { status: 400 })
    }

    // Validate that at least one image source is provided
    if (!imageUrl && !base64Image) {
      return NextResponse.json({ 
        success: false,
        error: "No image provided",
        details: "Please provide either 'imageUrl' or 'base64Image' parameter"
      }, { status: 400 })
    }

    // Validate aspect_ratio parameter
    const validAspectRatios = ['1:1', '16:9', '9:16', '4:3', '3:4', 'custom']
    if (!validAspectRatios.includes(aspectRatio)) {
      return NextResponse.json({ 
        success: false,
        error: "Invalid aspect_ratio parameter",
        details: `aspect_ratio must be one of: ${validAspectRatios.join(', ')}. Received: ${aspectRatio}`
      }, { status: 400 })
    }
    
    // Validate custom dimensions if aspect_ratio is custom
    if (aspectRatio === "custom") {
      if (!parsedCustomWidth || !parsedCustomHeight) {
        return NextResponse.json({
          success: false,
          error: "custom_width and custom_height are required when aspect_ratio is 'custom'",
          details: `Received customWidth: ${parsedCustomWidth}, customHeight: ${parsedCustomHeight}`
        }, { status: 400 })
      }
      
      // Validate dimension ranges (Seedream supports 512-2048)
      if (parsedCustomWidth < 512 || parsedCustomWidth > 2048 || parsedCustomHeight < 512 || parsedCustomHeight > 2048) {
        return NextResponse.json({
          success: false,
          error: "custom_width and custom_height must be between 512 and 2048 pixels",
          details: `Received customWidth: ${parsedCustomWidth}, customHeight: ${parsedCustomHeight}`
        }, { status: 400 })
      }
      
      // Validate minimum total area (Seedream v4 requirement: 921600 pixels minimum)
      const totalArea = parsedCustomWidth * parsedCustomHeight
      const minArea = 921600
      if (totalArea < minArea) {
        return NextResponse.json({
          success: false,
          error: "Image area too small",
          details: `Custom dimensions must have a minimum total area of ${minArea} pixels (e.g., 960x960). Your request: ${parsedCustomWidth}x${parsedCustomHeight} = ${totalArea} pixels. The API will automatically scale up images below this threshold, which may not match your exact dimensions.`
        }, { status: 400 })
      }
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

    // ============================================================================
    // PROCESS BASE64 IMAGE (if provided)
    // ============================================================================
    let finalImageUrl = imageUrl // Start with URL if provided
    
    if (base64Image && !finalImageUrl) {
      console.log('[External SeDream Edit] Processing Base64 image...')
      console.log('[External SeDream Edit] Base64 length:', base64Image.length)
      
      try {
        // Remove data:image/...;base64, prefix if present
        const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '')
        const imageBuffer = Buffer.from(base64Data, 'base64')
        
        console.log('[External SeDream Edit] Base64 decoded, buffer size:', imageBuffer.length)
        
        // Validate with Sharp (ensures it's a valid image)
        try {
          const metadata = await sharp(imageBuffer).metadata()
          console.log('[External SeDream Edit] Image validation - Format:', metadata.format, 'Size:', metadata.width, 'x', metadata.height)
        } catch (validationError) {
          console.error('[External SeDream Edit] Invalid image data:', validationError)
          return NextResponse.json({
            success: false,
            error: 'Invalid image data',
            details: 'The provided Base64 data is not a valid image'
          }, { status: 400 })
        }

        // Normalize image to JPEG with Sharp (max 2048px, 90% quality)
        try {
          const processedBuffer = await sharp(imageBuffer)
            .resize(2048, 2048, { 
              fit: 'inside', 
              withoutEnlargement: true 
            })
            .jpeg({ quality: 90 })
            .toBuffer()
          
          console.log('[External SeDream Edit] Image normalized - Original:', imageBuffer.length, 'Processed:', processedBuffer.length)
          
          // 2-step upload to fal.ai storage
          console.log('[External SeDream Edit] Initiating fal.ai storage upload...')
          
          const initResponse = await fetch('https://rest.alpha.fal.ai/storage/upload/initiate', {
            method: 'POST',
            headers: {
              'Authorization': `Key ${falApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              file_name: 'seedream-edit-image.jpg',
              content_type: 'image/jpeg'
            })
          })

          if (!initResponse.ok) {
            const errorText = await initResponse.text()
            console.error('[External SeDream Edit] Storage initiate failed:', initResponse.status, errorText)
            throw new Error(`Storage initiate failed: ${initResponse.status} ${errorText}`)
          }

          const { upload_url, file_url } = await initResponse.json()
          console.log('[External SeDream Edit] Got presigned URL, uploading file...')

          // PUT the image to the presigned URL
          const uploadResponse = await fetch(upload_url, {
            method: 'PUT',
            headers: {
              'Content-Type': 'image/jpeg'
            },
            body: new Uint8Array(processedBuffer)
          })

          if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text()
            console.error('[External SeDream Edit] File upload failed:', uploadResponse.status, errorText)
            throw new Error(`File upload failed: ${uploadResponse.status}`)
          }

          console.log('[External SeDream Edit] ✅ Base64 image uploaded successfully:', file_url)
          finalImageUrl = file_url

        } catch (sharpError: unknown) {
          const errorMessage = sharpError instanceof Error ? sharpError.message : 'Unknown Sharp error'
          console.error('[External SeDream Edit] Sharp processing failed:', errorMessage)
          return NextResponse.json({
            success: false,
            error: 'Image processing failed',
            details: errorMessage
          }, { status: 500 })
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error processing Base64'
        console.error('[External SeDream Edit] Base64 processing error:', errorMessage)
        return NextResponse.json({
          success: false,
          error: 'Failed to process Base64 image',
          details: errorMessage
        }, { status: 500 })
      }
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

    // Validate that we have a final image URL
    if (!finalImageUrl) {
      return NextResponse.json({
        success: false,
        error: "No image URL available",
        details: "Failed to process the provided image"
      }, { status: 400 })
    }

    console.log(`[External SeDream Edit] Using final image URL: ${finalImageUrl}`)

    console.log("[External SeDream Edit] Calling fal.ai API...")

    // Calculate image_size from aspect ratio selection
    let imageSize: string | undefined
    let imageDimensions: { width: number; height: number } | undefined
    
    if (aspectRatio === "custom") {
      imageDimensions = { width: parsedCustomWidth!, height: parsedCustomHeight! }
      console.log("[External SeDream Edit] Using custom dimensions:", imageDimensions)
    } else {
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
      console.log("[External SeDream Edit] Using preset aspect ratio:", imageSize)
    }

    // Prepare input for SeDream v4 Edit (uses image_urls array)
    // Note: negative_prompt is NOT sent to maintain compatibility with custom dimensions
    const input: any = {
      image_urls: [finalImageUrl],
      prompt: finalPrompt,
      enable_safety_checker: true
    }
    
    // Add image_size (string for presets, object for custom dimensions)
    if (aspectRatio === "custom" && imageDimensions) {
      // For custom dimensions, send as object with width and height
      input.image_size = {
        width: imageDimensions.width,
        height: imageDimensions.height
      }
    } else {
      // For preset aspect ratios, use string value
      input.image_size = imageSize
    }

    console.log("[External SeDream Edit] API Input:", {
      prompt: input.prompt,
      imageUrls: input.image_urls,
      aspectRatio: aspectRatio,
      imageSize: input.image_size,
      enableSafetyChecker: input.enable_safety_checker
    })
    
    console.log("[External SeDream Edit] Full input object:", JSON.stringify(input, null, 2))

    // Call SeDream v4 Edit API
    try {
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
      
      // Add disclaimer to the edited image
      console.log("[External SeDream Edit] Adding disclaimer to edited image...")
      const editedImage = result.data.images[0]
      let imageWithDisclaimer: string
      
      try {
        imageWithDisclaimer = await addDisclaimerToImage(
          editedImage.url,
          undefined,
          {
            fontSize: 30,
            padding: 15,
            textColor: '#FFFFFF',
            shadowColor: '#000000',
            shadowBlur: 2,
            removeExisting: true,    // Remove any existing disclaimer before adding new one
            cropHeight: 80,          // Crop 80px from bottom (enough for 2-line disclaimer)
            preserveMethod: 'resize' // Use proportional resize to maintain original dimensions
          }
        )
        console.log("[External SeDream Edit] Disclaimer added successfully")
      } catch (disclaimerError) {
        console.error("[External SeDream Edit] Failed to add disclaimer:", disclaimerError)
        // If disclaimer fails, return original images without disclaimer
        return NextResponse.json({
          success: true,
          images: result.data.images,
          prompt: finalPrompt,
          safetyProtections: {
            negativeTermsApplied: negativePrompts.length,
            nsfwProtection: true,
            ageBiasProtection: true,
            humanIntegrityProtection: true,
            safetyCheckerEnabled: true
          },
          inputImage: finalImageUrl,
          aspectRatio: aspectRatio,
          ...(aspectRatio === "custom" && imageDimensions ? {
            customDimensions: {
              width: imageDimensions.width,
              height: imageDimensions.height
            }
          } : {}),
          disclaimerError: disclaimerError instanceof Error ? disclaimerError.message : "Failed to add disclaimer"
        })
      }
      
      // Update images array with disclaimer
      const imagesWithDisclaimer = [{
        url: imageWithDisclaimer,
        width: editedImage.width,
        height: editedImage.height,
        content_type: 'image/jpeg'
      }]
      
      // Return the result in external API format with disclaimer
      return NextResponse.json({
        success: true,
        images: imagesWithDisclaimer,
        originalImageUrl: editedImage.url, // Original URL from Fal.ai
        prompt: finalPrompt,
        safetyProtections: {
          negativeTermsApplied: negativePrompts.length,
          nsfwProtection: true,
          ageBiasProtection: true,
          humanIntegrityProtection: true,
          safetyCheckerEnabled: true
        },
        inputImage: finalImageUrl,
        aspectRatio: aspectRatio,
        ...(aspectRatio === "custom" && imageDimensions ? {
          customDimensions: {
            width: imageDimensions.width,
            height: imageDimensions.height
          }
        } : {}),
        disclaimerAdded: true
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
    contentType: "application/json",
    parameters: {
      base64Image: {
        type: "string",
        required: false,
        description: "Base64-encoded image data (with or without data:image prefix)",
        example: "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
      },
      imageUrl: {
        type: "string",
        required: false,
        description: "URL of image to edit",
        example: "https://example.com/image.jpg"
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
        inputImage: "https://v3.fal.media/files/...",
        aspectRatio: "1:1"
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
  -H "Content-Type: application/json" \\
  -d '{
    "imageUrl": "https://example.com/image.jpg",
    "prompt": "add vibrant colors and dynamic lighting",
    "aspect_ratio": "16:9"
  }'`,
      javascript: `const response = await fetch('https://your-domain.com/api/external/seedream-edit-image', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    imageUrl: 'https://example.com/image.jpg',
    prompt: 'add vibrant colors and dynamic lighting',
    aspect_ratio: '16:9'
  })
});

const result = await response.json();
if (result.success) {
  console.log('Edited image URL:', result.images[0].url);
}`
    },
    notes: [
      "This endpoint ONLY accepts JSON payloads with Content-Type: application/json",
      "Provide either base64Image OR imageUrl (not both)",
      "The user's prompt is used directly without any modifications or enhancements",
      "Full control over the prompt allows for precise image editing instructions",
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
