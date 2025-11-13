import { NextRequest, NextResponse } from 'next/server'
import { fal } from "@fal-ai/client"
import { ContentModerationService } from "@/lib/content-moderation"
import sharp from 'sharp'

/**
 * POST /api/external/seedream-v4-edit
 * 
 * External API endpoint for SeDream v4 image style transfer.
 * This endpoint replicates the functionality of the main app's SeDream v4 feature
 * but without requiring authentication and with simplified parameters.
 * 
 * Body parameters (JSON or FormData):
 * - base64Image (optional): Base64-encoded image data
 * - imageUrl (optional): URL of image to transform
 * - image (optional): Image file to transform (PNG, JPG, JPEG, WEBP)
 * - aspect_ratio (optional): Output aspect ratio - one of: 1:1, 16:9, 9:16, 4:3, 3:4 (default: 1:1)
 *   Note: aspect_ratio is mapped to image_size parameter for the SeDream model
 * 
 * The endpoint automatically uses:
 * - A pre-configured style prompt from sedream_enhancement_text configuration
 * 
 * Response format:
 * Success: { success: true, images: [{ url: string, width: number, height: number }], prompt: string, inputImage: string }
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
    
    // ============================================================================
    // DUAL PARSER: Support both JSON (Base64/URLs) and FormData (File uploads)
    // ============================================================================
    const contentType = request.headers.get('content-type') || ''
    const isJSON = contentType.includes('application/json')
    
    console.log(`[External SeDream v4] Content-Type: ${contentType}`)
    console.log(`[External SeDream v4] Using ${isJSON ? 'JSON' : 'FormData'} parser`)
    
    let imageFile: File | null = null
    let imageUrl: string | null = null
    let base64Image: string | null = null
    let aspectRatio = '1:1'
    
    if (isJSON) {
      // Parse JSON body for Base64 or URL inputs
      const jsonBody = await request.json()
      base64Image = jsonBody.base64Image || null
      imageUrl = jsonBody.imageUrl || null
      aspectRatio = jsonBody.aspect_ratio || jsonBody.aspectRatio || '1:1'
      
      console.log('[External SeDream v4] JSON input:', {
        hasBase64: !!base64Image,
        base64Length: base64Image?.length || 0,
        hasImageUrl: !!imageUrl,
        imageUrl: imageUrl || 'N/A',
        aspectRatio
      })
    } else {
      // Parse FormData for File uploads
      const formData = await request.formData()
      imageFile = formData.get('image') as File | null
      imageUrl = (formData.get('imageUrl') as string) || null
      aspectRatio = (formData.get('aspect_ratio') as string) || '1:1'
      
      console.log('[External SeDream v4] FormData input:', {
        hasFile: !!imageFile,
        fileSize: imageFile?.size || 0,
        fileName: imageFile?.name || 'N/A',
        hasImageUrl: !!imageUrl,
        aspectRatio
      })
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

    // Validate that at least one image source is provided
    if (!imageFile && !imageUrl && !base64Image) {
      return NextResponse.json({ 
        success: false,
        error: "Missing required image parameter",
        details: "Either an image file, imageUrl, or base64Image is required for SeDream v4 style transfer"
      }, { status: 400 })
    }

    // Validate file type if File was provided
    if (imageFile) {
      const validMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      if (!validMimeTypes.includes(imageFile.type)) {
        return NextResponse.json({
          success: false,
          error: "Invalid file type",
          details: `File must be one of: ${validMimeTypes.join(', ')}. Received: ${imageFile.type}`
        }, { status: 400 })
      }

      // Validate file size (max 10MB)
      const maxFileSize = 10 * 1024 * 1024 // 10MB
      if (imageFile.size > maxFileSize) {
        return NextResponse.json({
          success: false,
          error: "File too large",
          details: `Maximum file size is 10MB. Received: ${(imageFile.size / 1024 / 1024).toFixed(2)}MB`
        }, { status: 400 })
      }
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

    // Content moderation check
    try {
      console.log("[MODERATION] Checking content for External SeDream v4 prompt:", finalPrompt.substring(0, 50) + "...")
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

    // ============================================================================
    // PROCESS BASE64 IMAGE (if provided)
    // ============================================================================
    let finalImageUrl = imageUrl // Start with URL if provided
    
    if (base64Image && !finalImageUrl) {
      console.log('[External SeDream v4] Processing Base64 image...')
      console.log('[External SeDream v4] Base64 length:', base64Image.length)
      
      try {
        // Remove data:image/...;base64, prefix if present
        const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '')
        const imageBuffer = Buffer.from(base64Data, 'base64')
        
        console.log('[External SeDream v4] Base64 decoded, buffer size:', imageBuffer.length)
        
        // Validate with Sharp (ensures it's a valid image)
        try {
          const metadata = await sharp(imageBuffer).metadata()
          console.log('[External SeDream v4] Image validation - Format:', metadata.format, 'Size:', metadata.width, 'x', metadata.height)
        } catch (validationError) {
          console.error('[External SeDream v4] Invalid image data:', validationError)
          return NextResponse.json({
            success: false,
            error: 'Invalid image data',
            details: 'The provided Base64 data is not a valid image'
          }, { status: 400 })
        }

        // Normalize image to JPEG with Sharp (max 2048px, 85% quality for 2MB limit)
        try {
          const processedBuffer = await sharp(imageBuffer)
            .resize(2048, 2048, { 
              fit: 'inside', 
              withoutEnlargement: true 
            })
            .jpeg({ quality: 85 })
            .toBuffer()
          
          console.log('[External SeDream v4] Image normalized - Original:', imageBuffer.length, 'Processed:', processedBuffer.length)
          
          // 2-step upload to fal.ai storage
          console.log('[External SeDream v4] Initiating fal.ai storage upload...')
          
          const initResponse = await fetch('https://rest.alpha.fal.ai/storage/upload/initiate', {
            method: 'POST',
            headers: {
              'Authorization': `Key ${falApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              file_name: 'seedream-v4-edit-external.jpg',
              content_type: 'image/jpeg'
            })
          })

          if (!initResponse.ok) {
            const errorText = await initResponse.text()
            console.error('[External SeDream v4] Storage initiate failed:', initResponse.status, errorText)
            throw new Error(`Storage initiate failed: ${initResponse.status} ${errorText}`)
          }

          const { upload_url, file_url } = await initResponse.json()
          console.log('[External SeDream v4] Got presigned URL, uploading file...')

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
            console.error('[External SeDream v4] File upload failed:', uploadResponse.status, errorText)
            throw new Error(`File upload failed: ${uploadResponse.status}`)
          }

          console.log('[External SeDream v4] ✅ Base64 image uploaded successfully:', file_url)
          finalImageUrl = file_url

        } catch (sharpError: unknown) {
          const errorMessage = sharpError instanceof Error ? sharpError.message : 'Unknown Sharp error'
          console.error('[External SeDream v4] Sharp processing failed:', errorMessage)
          return NextResponse.json({
            success: false,
            error: 'Image processing failed',
            details: errorMessage
          }, { status: 500 })
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error processing Base64'
        console.error('[External SeDream v4] Base64 processing error:', errorMessage)
        return NextResponse.json({
          success: false,
          error: 'Failed to process Base64 image',
          details: errorMessage
        }, { status: 500 })
      }
    }

    // ============================================================================
    // UPLOAD FILE (if File object was provided)
    // ============================================================================
    if (imageFile && !finalImageUrl) {
      console.log("[External SeDream v4] Uploading image file to fal.ai storage...")
      
      try {
        finalImageUrl = await fal.storage.upload(imageFile)
        console.log("[External SeDream v4] File uploaded successfully:", finalImageUrl)
      } catch (uploadError) {
        const errorMessage = uploadError instanceof Error ? uploadError.message : 'Unknown upload error'
        console.error("[External SeDream v4] File upload failed:", errorMessage)
        return NextResponse.json({
          success: false,
          error: "File upload failed",
          details: errorMessage
        }, { status: 500 })
      }
    }
    
    // Validate that we have a final image URL
    if (!finalImageUrl) {
      return NextResponse.json({
        success: false,
        error: "No image provided",
        details: "Please provide either an image file, image URL, or Base64 image"
      }, { status: 400 })
    }

    console.log(`[External SeDream v4] Using final image URL: ${finalImageUrl}`)

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

    // Reference image for style transfer
    const referenceImageUrl = "https://v3.fal.media/files/monkey/huuJHd0OJn7pBsJc37rh5_Reference.jpg"

    // Prepare input for SeDream v4 Edit (uses image_urls array with user image and reference)
    const negativePromptString = negativePrompts.join(", ")
    const input = {
      prompt: finalPrompt,
      negative_prompt: negativePromptString,
      image_urls: [finalImageUrl, referenceImageUrl],
      num_images: 1,
      enable_safety_checker: true,
      image_size: imageSize
    }

    try {
      console.log("[External SeDream v4] API Input:", {
        prompt: input.prompt,
        negativePrompt: `${negativePromptString.substring(0, 100)}...`,
        negativePromptTerms: negativePrompts.length,
        imageUrls: input.image_urls,
        numImages: input.num_images,
        aspectRatio: aspectRatio,
        imageSize: input.image_size,
        inputImage: finalImageUrl,
        referenceImage: referenceImageUrl
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
        inputImage: finalImageUrl,
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
        details: "Additional error details",
        category: "Content category (for moderation errors)",
        blocked: "Boolean indicating if content was blocked",
        moderation: "Boolean indicating if this was a moderation error"
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
      "  • Unified content moderation with ContentModerationService",
      "  • NSFW content prevention with 25+ negative terms",
      "  • Age bias prevention to avoid inappropriate age modifications",
      "  • Human integrity protection to maintain realistic proportions",
      "  • Built-in content moderation and safety checker",
      "Multiple layers of protection ensure ethical and appropriate results"
    ]
  })
}