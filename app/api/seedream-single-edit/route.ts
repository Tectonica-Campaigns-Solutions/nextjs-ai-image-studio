import { type NextRequest, NextResponse } from "next/server"
import { fal } from "@fal-ai/client"
import { ContentModerationService } from "@/lib/content-moderation"
import { addDisclaimerToImage } from "@/lib/image-disclaimer"

/**
 * POST /api/seedream-single-edit
 * 
 * Internal API endpoint for single image editing using Seedream-v4 via fal.ai.
 * This endpoint allows editing a single image based on a text prompt.
 * 
 * ⚠️  IMPORTANT: Use JSON format (application/json) for Base64 images.
 * FormData should ONLY be used for actual file uploads (File objects).
 * 
 * Body parameters:
 * 
 * JSON FORMAT (RECOMMENDED for Base64/URLs):
 * {
 *   "prompt": "your edit prompt here",
 *   "imageUrl": "https://...",           // optional - image URL
 *   "base64Image": "data:image/jpeg;base64,...", // optional - Base64 image
 *   "settings": {
 *     "aspect_ratio": "1:1",
 *     "num_images": 1,
 *     "strength": 0.8
 *   },
 *   "orgType": "general"
 * }
 * 
 * FORMDATA FORMAT (ONLY for file uploads):
 * - prompt (required): Text description for the image edit
 * - image (optional): Image file to edit
 * - imageUrl (optional): Image URL to edit
 * - imageBase64 (optional): Base64 image (NOT RECOMMENDED - use JSON instead)
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
 * NOTE: Next.js 15 has a hardcoded 1MB limit for FormData bodies.
 * Always use JSON for Base64 images to avoid truncation issues.
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
    
    // Check Content-Type to determine if JSON or FormData
    const contentType = request.headers.get('content-type') || ''
    const isJSON = contentType.includes('application/json')
    
    console.log(`[SEEDREAM-SINGLE-EDIT] Content-Type: ${contentType}, isJSON: ${isJSON}`)
    
    let prompt: string
    let orgType: string
    let settings: any = {}
    let imageFile: File | null = null
    let imageUrl: string | undefined
    let base64Image: string | undefined
    
    if (isJSON) {
      // JSON payload (for Base64 images or URLs)
      console.log("[SEEDREAM-SINGLE-EDIT] 📦 Processing JSON payload")
      
      const jsonBody = await request.json()
      
      prompt = jsonBody.prompt
      orgType = jsonBody.orgType || "general"
      settings = jsonBody.settings || {}
      imageUrl = jsonBody.imageUrl
      base64Image = jsonBody.base64Image
      
      if (base64Image) {
        console.log(`[SEEDREAM-SINGLE-EDIT] Found Base64 image: ${base64Image.length} chars (${(base64Image.length / 1024 / 1024).toFixed(2)} MB)`)
      }
      
    } else {
      // FormData payload (standard path for file uploads)
      console.log("[SEEDREAM-SINGLE-EDIT] 📦 Processing FormData payload")
      
      const formData = await request.formData()
      
      // Extract parameters
      prompt = formData.get("prompt") as string
      orgType = formData.get("orgType") as string || "general"
      
      // Parse settings
      const settingsStr = formData.get("settings") as string
      if (settingsStr) {
        try {
          settings = JSON.parse(settingsStr)
        } catch (error) {
          console.warn("[SEEDREAM-SINGLE-EDIT] Failed to parse settings:", error)
        }
      }
      
      // Get image file
      const image = formData.get("image")
      if (image instanceof File && image.size > 0) {
        imageFile = image
        console.log(`[SEEDREAM-SINGLE-EDIT] Found image file: ${image.name}, size: ${image.size}, type: ${image.type}`)
      }
      
      // Get image URL
      const url = formData.get("imageUrl")
      if (url && typeof url === 'string' && url.trim()) {
        imageUrl = url.trim()
        console.log(`[SEEDREAM-SINGLE-EDIT] Found image URL: ${imageUrl}`)
      }
      
      // Get Base64 image
      const b64 = formData.get("imageBase64")
      if (b64 && typeof b64 === 'string' && b64.trim()) {
        base64Image = b64.trim()
        console.log(`[SEEDREAM-SINGLE-EDIT] Found Base64 image: ${base64Image.length} chars (${(base64Image.length / 1024 / 1024).toFixed(2)} MB)`)
        
        // Check if Base64 might be truncated
        const last4 = base64Image.slice(-4)
        if (!last4.match(/[A-Za-z0-9+/=]{4}$/)) {
          console.warn(`[SEEDREAM-SINGLE-EDIT] ⚠️  WARNING: Base64 image might be truncated (unusual ending: "${last4}")`)
        }
      }
    }
    
    // Extract fal.ai specific settings with defaults (simplified)
    const aspectRatio = settings.aspect_ratio || "1:1"
    const customWidth = settings.custom_width ? parseInt(settings.custom_width.toString()) : undefined
    const customHeight = settings.custom_height ? parseInt(settings.custom_height.toString()) : undefined
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
    const validAspectRatios = ["1:1", "16:9", "9:16", "4:3", "3:4", "custom"]
    if (!validAspectRatios.includes(aspectRatio)) {
      return NextResponse.json({
        error: "Invalid aspect ratio",
        details: `Aspect ratio must be one of: ${validAspectRatios.join(', ')}`
      }, { status: 400 })
    }
    
    // Validate custom dimensions if aspect_ratio is custom
    if (aspectRatio === "custom") {
      if (!customWidth || !customHeight) {
        return NextResponse.json({
          error: "Custom dimensions required",
          details: "When aspect_ratio is 'custom', both custom_width and custom_height must be provided"
        }, { status: 400 })
      }
      
      // Validate dimension ranges (Seedream typically supports 512-2048)
      if (customWidth < 512 || customWidth > 2048 || customHeight < 512 || customHeight > 2048) {
        return NextResponse.json({
          error: "Invalid custom dimensions",
          details: "Width and height must be between 512 and 2048 pixels"
        }, { status: 400 })
      }
      
      // Validate minimum total area (Seedream v4 requirement: 921600 pixels minimum)
      const totalArea = customWidth * customHeight
      const minArea = 921600
      if (totalArea < minArea) {
        return NextResponse.json({
          error: "Image area too small",
          details: `Custom dimensions must have a minimum total area of ${minArea} pixels (e.g., 960x960). Your request: ${customWidth}x${customHeight} = ${totalArea} pixels. The API will automatically scale up images below this threshold.`
        }, { status: 400 })
      }
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

    // Process Base64 image if provided
    let finalImageUrl: string | undefined = imageUrl
    
    if (base64Image && !finalImageUrl) {
      console.log("[SEEDREAM-SINGLE-EDIT] Processing Base64 image...")
      
      try {
        // Parse Base64 data URL or raw Base64
        let imageBuffer: Buffer
        let mimeType = 'image/jpeg' // Default
        
        if (base64Image.startsWith('data:')) {
          // Extract MIME type and Base64 data from data URL
          const matches = base64Image.match(/^data:([^;]+);base64,(.+)$/)
          if (!matches) {
            throw new Error("Invalid Base64 data URL format")
          }
          mimeType = matches[1]
          const base64String = matches[2]
          imageBuffer = Buffer.from(base64String, 'base64')
        } else {
          // Raw Base64 string
          imageBuffer = Buffer.from(base64Image, 'base64')
        }
        
        // Normalize MIME type
        if (mimeType === 'image/jpg') {
          mimeType = 'image/jpeg'
          console.log("[SEEDREAM-SINGLE-EDIT] Normalized MIME type from image/jpg to image/jpeg")
        }
        
        console.log(`[SEEDREAM-SINGLE-EDIT] Base64 image original size: ${(imageBuffer.length / 1024 / 1024).toFixed(2)} MB, type: ${mimeType}`)
        
        // CRITICAL: Validate image integrity BEFORE processing
        const sharpModule = await import('sharp')
        const sharp = sharpModule.default
        
        try {
          const metadata = await sharp(imageBuffer).metadata()
          console.log(`[SEEDREAM-SINGLE-EDIT] ✅ Image validated: ${metadata.format}, ${metadata.width}x${metadata.height}`)
        } catch (validationError) {
          const errorMsg = validationError instanceof Error ? validationError.message : String(validationError)
          console.error(`[SEEDREAM-SINGLE-EDIT] ❌ CORRUPTED BASE64 IMAGE DETECTED:`, errorMsg)
          throw new Error(`Base64 image is corrupted or incomplete. Error: ${errorMsg}. Please ensure the Base64 string is complete and correctly formatted.`)
        }
        
        let finalBuffer: Buffer = imageBuffer
        let finalMimeType = 'image/jpeg' // Always use standard JPEG
        
        try {
          console.log(`[SEEDREAM-SINGLE-EDIT] Normalizing to JPEG with Sharp...`)
          
          // Convert to standardized JPEG: 90% quality, max 2048px
          const normalizedBuffer = await sharp(imageBuffer)
            .resize(2048, 2048, {
              fit: 'inside',
              withoutEnlargement: true
            })
            .jpeg({ quality: 90 })
            .toBuffer()
          
          console.log(`[SEEDREAM-SINGLE-EDIT] ✅ Normalized to JPEG: ${(imageBuffer.length / 1024 / 1024).toFixed(2)} MB → ${(normalizedBuffer.length / 1024 / 1024).toFixed(2)} MB`)
          
          finalBuffer = normalizedBuffer
          
        } catch (sharpError: unknown) {
          const errorMsg = sharpError instanceof Error ? sharpError.message : String(sharpError)
          console.error(`[SEEDREAM-SINGLE-EDIT] ❌ JPEG normalization failed:`, errorMsg)
          console.warn(`[SEEDREAM-SINGLE-EDIT] ⚠️  WARNING: Using original image without normalization`)
        }
        
        // Upload using 2-step process: initiate → PUT
        const fileExtension = finalMimeType.split('/')[1] || 'jpeg'
        const fileName = `base64-edit-image.${fileExtension}`
        
        console.log(`[SEEDREAM-SINGLE-EDIT] Uploading ${fileName}: ${finalBuffer.length} bytes (${(finalBuffer.length / 1024 / 1024).toFixed(2)} MB)`)
        
        // Step 1: Initiate upload to get presigned URL
        const initiateResponse = await fetch('https://rest.alpha.fal.ai/storage/upload/initiate', {
          method: 'POST',
          headers: {
            'Authorization': `Key ${falApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            content_type: finalMimeType,
            file_name: fileName
          })
        })
        
        if (!initiateResponse.ok) {
          const errorText = await initiateResponse.text()
          throw new Error(`Failed to initiate upload: ${initiateResponse.status} - ${errorText}`)
        }
        
        const { upload_url, file_url } = await initiateResponse.json()
        
        console.log(`[SEEDREAM-SINGLE-EDIT] Initiated upload for ${fileName}`)
        console.log(`[SEEDREAM-SINGLE-EDIT] File URL: ${file_url}`)
        
        // Step 2: PUT the file to the presigned URL using Uint8Array
        const uint8Array = new Uint8Array(finalBuffer)
        
        const uploadResponse = await fetch(upload_url, {
          method: 'PUT',
          headers: {
            'Content-Type': finalMimeType,
          },
          body: uint8Array
        })
        
        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text()
          throw new Error(`Failed to upload file: ${uploadResponse.status} - ${errorText}`)
        }
        
        console.log(`[SEEDREAM-SINGLE-EDIT] ✅ Successfully uploaded Base64 image: ${file_url}`)
        finalImageUrl = file_url
        
      } catch (error) {
        console.error(`[SEEDREAM-SINGLE-EDIT] Failed to process Base64 image:`, error)
        return NextResponse.json({
          error: "Base64 image processing failed",
          details: `Failed to process Base64 image: ${error instanceof Error ? error.message : 'Unknown error'}`
        }, { status: 500 })
      }
    }
    // Upload file if provided
    if (imageFile && imageFile.size > 0 && !finalImageUrl) {
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
        finalImageUrl = await fal.storage.upload(imageFile)
        console.log(`[SEEDREAM-SINGLE-EDIT] Successfully uploaded: ${finalImageUrl}`)
      } catch (error) {
        console.error(`[SEEDREAM-SINGLE-EDIT] Failed to upload file:`, error)
        return NextResponse.json({
          error: "File upload failed",
          details: `Failed to upload file ${imageFile.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
        }, { status: 500 })
      }
    }
    
    // Validate that we have an image
    if (!finalImageUrl) {
      return NextResponse.json({
        error: "No image provided",
        details: "Please provide either an image file, image URL, or Base64 image for editing"
      }, { status: 400 })
    }

    console.log(`[SEEDREAM-SINGLE-EDIT] Using image URL: ${finalImageUrl}`)

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
    console.log("  - Image URL:", finalImageUrl)
    console.log("  - Prompt:", prompt)
    console.log("  - Aspect Ratio:", aspectRatio)
    console.log("  - Num Images:", numImages)

    // Map aspect ratio to fal.ai image_size format or custom dimensions
    let imageSize: string | undefined
    let imageDimensions: { width: number; height: number } | undefined
    
    if (aspectRatio === "custom") {
      imageSize = "custom"
      imageDimensions = { width: customWidth!, height: customHeight! }
      console.log("[SEEDREAM-SINGLE-EDIT] Using custom dimensions:", imageDimensions)
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
    }

    // Prepare input for fal.ai Seedream v4 edit
    const input: any = {
      image_urls: [finalImageUrl],
      prompt: prompt,
      enable_safety_checker: enableSafetyChecker
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

      // Add disclaimer to the first image
      console.log("[SEEDREAM-SINGLE-EDIT] Adding disclaimer to edited image...")
      const primaryImage = images[0]
      let imageWithDisclaimer: string
      
      try {
        imageWithDisclaimer = await addDisclaimerToImage(
          primaryImage.url,
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
        console.log("[SEEDREAM-SINGLE-EDIT] Disclaimer added successfully")
      } catch (disclaimerError) {
        console.error("[SEEDREAM-SINGLE-EDIT] Failed to add disclaimer:", disclaimerError)
        // If disclaimer fails, return original image
        return NextResponse.json({
          success: true,
          image: primaryImage.url,
          images,
          prompt,
          originalPrompt: prompt,
          model: "fal-ai/bytedance/seedream/v4/edit",
          provider: "fal.ai",
          inputImage: finalImageUrl,
          settings: {
            aspect_ratio: aspectRatio,
            ...(aspectRatio === "custom" && imageDimensions ? {
              custom_width: imageDimensions.width,
              custom_height: imageDimensions.height
            } : {}),
            num_images: numImages,
            enable_safety_checker: enableSafetyChecker,
            note: "This endpoint uses simplified settings for compatibility with Seedream v4 edit model"
          },
          timestamp: new Date().toISOString(),
          disclaimerError: disclaimerError instanceof Error ? disclaimerError.message : "Failed to add disclaimer"
        })
      }

      // Return successful response with disclaimer
      return NextResponse.json({
        success: true,
        image: imageWithDisclaimer, // Base64 image with disclaimer
        originalImageUrl: primaryImage.url, // Original URL from Fal.ai
        images, // All images for completeness
        prompt,
        originalPrompt: prompt,
        model: "fal-ai/bytedance/seedream/v4/edit",
        provider: "fal.ai",
        inputImage: finalImageUrl,
        settings: {
          aspect_ratio: aspectRatio,
          ...(aspectRatio === "custom" && imageDimensions ? {
            custom_width: imageDimensions.width,
            custom_height: imageDimensions.height
          } : {}),
          num_images: numImages,
          enable_safety_checker: enableSafetyChecker,
          note: "This endpoint uses simplified settings for compatibility with Seedream v4 edit model"
        },
        timestamp: new Date().toISOString(),
        disclaimerAdded: true
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