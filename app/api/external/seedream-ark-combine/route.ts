import { type NextRequest, NextResponse } from "next/server"
import { fal } from "@fal-ai/client"
import { ContentModerationService } from "@/lib/content-moderation"
import { canonicalPromptProcessor, type CanonicalPromptConfig } from "@/lib/canonical-prompt"
import { getSedreamEnhancementText } from "@/lib/json-enhancement"

/**
 * POST /api/external/seedream-ark-combine
 * 
 * External API endpoint for combining images using Seedream-v4 via fal.ai with enhanced pipeline.
 * 
 * ENHANCED PIPELINE (conditional 2-step or direct combination):
 * Step 1 (optional): If processSecondImage=true, process target image with seedream-v4-edit using sedream_enhancement_text
 *   - CA origin: Processes first image (index 0)
 *   - TCN origin: Processes second image (index 1)
 * Step 2: Combine both images (one processed, one original) using user's prompt (canonical or enhanced)
 * 
 * ⚠️  IMPORTANT: Use JSON format (application/json) for Base64 images and URLs.
 * FormData should ONLY be used for actual file uploads (File objects).
 * 
 * Body parameters:
 * 
 * JSON FORMAT (RECOMMENDED for Base64/URLs):
 * {
 *   "prompt": "your prompt here",
 *   "imageUrls": ["url1", "url2"],        // optional - array of image URLs
 *   "base64Images": ["base64...", "..."], // optional - array of Base64 strings
 *   "settings": { 
 *     "aspect_ratio": "1:1",              // or "16:9", "9:16", "4:3", "3:4", "custom"
 *     "custom_width": 1080,               // required if aspect_ratio is "custom"
 *     "custom_height": 1350,              // required if aspect_ratio is "custom"
 *     "processSecondImage": true,
 *     "origin": "CA"
 *   },
 *   "useCanonicalPrompt": true,
 *   "canonicalConfig": { ... },
 *   "orgType": "general"
 * }
 * 
 * FORMDATA FORMAT (ONLY for file uploads):
 * - prompt (required): Text description for image combination
 * - image0, image1: Exactly 2 image files to upload
 * - imageUrl0, imageUrl1: Image URLs (if not using files)
 * - imageBase640, imageBase641: Base64 images (NOT RECOMMENDED - use JSON instead)
 * - settings: JSON string with generation settings
 *   - aspect_ratio: "1:1" | "16:9" | "9:16" | "4:3" | "3:4" | "custom" (default: "1:1") 
 *   - custom_width: number (512-2048, required if aspect_ratio is "custom")
 *   - custom_height: number (512-2048, required if aspect_ratio is "custom")
 *   - enable_safety_checker: boolean (default: true)
 *   - processSecondImage: boolean (default: true) - Enable 2-step processing with seedream-v4-edit
 *   - origin: "CA" | "TCN" (default: "CA") - Determines which image to process in Step 1
 *     * "CA": Process first image (index 0)
 *     * "TCN": Process second image (index 1)
 * - useCanonicalPrompt: "true" or "false"
 * - canonicalConfig: JSON string with canonical config
 * - orgType: Organization type for moderation
 * 
 * NOTE: Next.js 15 has a hardcoded 1MB limit for FormData bodies.
 * Always use JSON for Base64 images to avoid truncation issues.
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
 *   "settings": {...},
 *   "enhancedPipeline": true,
 *   "pipelineSteps": [...]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    console.log("[External Seedream Combine] Request received")
    
    // Validate Content-Type
    const contentType = request.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      return NextResponse.json({
        success: false,
        error: "Invalid Content-Type",
        details: "This endpoint only accepts application/json. Received: " + contentType
      }, { status: 415 }) // 415 Unsupported Media Type
    }
    
    console.log(`[External Seedream Combine] Content-Type: ${contentType}`)
    
    // ============================================================================
    // JSON-ONLY PARSER: Accepts only Base64 images and URLs
    // ============================================================================
    const body = await request.json()
    
    const prompt: string = body.prompt
    const orgType: string = body.orgType || "general"
    const useCanonicalPrompt = body.useCanonicalPrompt === true || body.useCanonicalPrompt === "true"
    const canonicalConfig: CanonicalPromptConfig | undefined = body.canonicalConfig
    
    // Extract settings (support both body.settings.* and body.* for backward compatibility)
    const aspectRatio = body.settings?.aspect_ratio || body.aspect_ratio || "1:1"
    
    let settings: any = {
      aspect_ratio: aspectRatio,
      enable_safety_checker: body.enable_safety_checker !== false,
      processSecondImage: body.settings?.processSecondImage !== false, // Default: true
      origin: body.settings?.origin || "CA", // Default: CA
      custom_width: body.settings?.custom_width,
      custom_height: body.settings?.custom_height
    }
    
    let imageUrls: string[] = []
    let base64Images: string[] = []
    
    // Extract image URLs and Base64 from JSON
    if (body.imageUrls && Array.isArray(body.imageUrls)) {
      imageUrls = body.imageUrls.filter((url: string) => url && url.trim())
      console.log(`[External Seedream Combine] Found ${imageUrls.length} image URLs in JSON`)
    }
    
    if (body.base64Images && Array.isArray(body.base64Images)) {
      base64Images = body.base64Images.filter((b64: string) => b64 && b64.trim())
      console.log(`[External Seedream Combine] Found ${base64Images.length} Base64 images in JSON`)
      
      // Log sizes to verify no truncation
      base64Images.forEach((b64, i) => {
        console.log(`[External Seedream Combine] Base64 image ${i + 1}: ${b64.length} chars (${(b64.length / 1024 / 1024).toFixed(2)} MB)`)
      })
    }

    const enableSafetyChecker = settings.enable_safety_checker !== false // Default to true
    const processSecondImage = settings.processSecondImage !== false // Default to true
    const origin = settings.origin || "CA" // Default to CA
    const customWidth = settings.custom_width ? parseInt(settings.custom_width.toString()) : undefined
    const customHeight = settings.custom_height ? parseInt(settings.custom_height.toString()) : undefined
    
    // Validate origin parameter
    const validOrigins = ["CA", "TCN"]
    if (!validOrigins.includes(origin)) {
      return NextResponse.json({
        success: false,
        error: "Invalid origin parameter",
        details: `origin must be one of: ${validOrigins.join(', ')}. Received: ${origin}`
      }, { status: 400 })
    }
    
    // Validate custom dimensions if aspect_ratio is custom
    if (aspectRatio === "custom") {
      if (!customWidth || !customHeight) {
        return NextResponse.json({
          success: false,
          error: "Custom dimensions required",
          details: "When aspect_ratio is 'custom', both custom_width and custom_height must be provided in settings"
        }, { status: 400 })
      }
      
      // Validate dimension ranges
      if (customWidth < 512 || customWidth > 2048 || customHeight < 512 || customHeight > 2048) {
        return NextResponse.json({
          success: false,
          error: "Invalid custom dimensions",
          details: "Width and height must be between 512 and 2048 pixels"
        }, { status: 400 })
      }
      
      // Validate minimum total area (Seedream v4 requirement: 921600 pixels minimum)
      const totalArea = customWidth * customHeight
      const minArea = 921600
      if (totalArea < minArea) {
        return NextResponse.json({
          success: false,
          error: "Image area too small",
          details: `Custom dimensions must have a minimum total area of ${minArea} pixels (e.g., 960x960). Your request: ${customWidth}x${customHeight} = ${totalArea} pixels. The API will automatically scale up images below this threshold.`
        }, { status: 400 })
      }
    }

    // Validate prompt
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json({
        success: false,
        error: "Prompt is required",
        details: "Please provide a text description for image combination"
      }, { status: 400 })
    }

    console.log("[External Seedream Combine] Parameters:", {
      prompt: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
      aspectRatio,
      enableSafetyChecker,
      processSecondImage,
      origin,
      orgType,
      useCanonicalPrompt
    })
    
    // Validate that we have exactly 2 images for enhanced pipeline
    const totalImages = imageUrls.length + base64Images.length
    if (totalImages !== 2) {
      return NextResponse.json({
        success: false,
        error: "Enhanced pipeline requires exactly 2 images",
        details: `Found ${imageUrls.length} URLs and ${base64Images.length} Base64 images (total: ${totalImages}). The enhanced pipeline requires exactly 2 images.`
      }, { status: 400 })
    }

    // Content moderation check
    try {
      console.log("[MODERATION] Checking content for External Seedream Combine prompt:", prompt.substring(0, 50) + "...")
      const moderationService = new ContentModerationService(orgType)
      const moderationResult = await moderationService.moderateContent({ prompt })
      
      if (!moderationResult.safe) {
        console.log("[MODERATION] Content blocked:", moderationResult.reason)
        return NextResponse.json({ 
          success: false,
          error: moderationResult.reason,
          category: moderationResult.category,
          blocked: true
        }, { status: 400 })
      }
      console.log("[MODERATION] Content approved")
    } catch (moderationError) {
      console.warn("[MODERATION] Moderation check failed, proceeding with generation:", moderationError)
    }

    // Check if Fal.ai API key is available
    const falApiKey = process.env.FAL_API_KEY
    if (!falApiKey) {
      return NextResponse.json({ 
        success: false,
        error: "FAL_API_KEY not configured" 
      }, { status: 500 })
    }

    // Configure Fal.ai client
    fal.config({
      credentials: falApiKey,
    })

    // Collect all image URLs (upload files first if needed)
    const allImageUrls: string[] = [...imageUrls]
    
    // Process Base64 images first (if any)
    if (base64Images.length > 0) {
      console.log(`[External Seedream Combine] Processing ${base64Images.length} Base64 images...`)
      
      // Get FAL API key
      const falApiKey = process.env.FAL_API_KEY
      if (!falApiKey) {
        throw new Error("FAL_API_KEY environment variable is not set")
      }
      
      for (let i = 0; i < base64Images.length; i++) {
        const base64Data = base64Images[i]
        
        try {
          // Parse Base64 data URL or raw Base64
          let imageBuffer: Buffer
          let mimeType = 'image/jpeg' // Default
          
          if (base64Data.startsWith('data:')) {
            // Extract MIME type and Base64 data from data URL
            const matches = base64Data.match(/^data:([^;]+);base64,(.+)$/)
            if (!matches) {
              throw new Error(`Invalid Base64 data URL format for image ${i + 1}`)
            }
            mimeType = matches[1]
            const base64String = matches[2]
            imageBuffer = Buffer.from(base64String, 'base64')
          } else {
            // Raw Base64 string
            imageBuffer = Buffer.from(base64Data, 'base64')
          }
          
          // Normalize MIME type
          if (mimeType === 'image/jpg') {
            mimeType = 'image/jpeg'
            console.log(`[External Seedream Combine] Normalized MIME type from image/jpg to image/jpeg for image ${i + 1}`)
          }
          
          console.log(`[External Seedream Combine] Processing Base64 image ${i + 1}/${base64Images.length}, type: ${mimeType}`)
          
          let finalBuffer: Buffer = imageBuffer
          let finalMimeType = 'image/jpeg' // Always use standard JPEG
          
          console.log(`[External Seedream Combine] Base64 image ${i + 1} original size: ${(imageBuffer.length / 1024 / 1024).toFixed(2)} MB, type: ${mimeType}`)
          
          // CRITICAL: Validate image integrity BEFORE processing
          const sharpModule = await import('sharp')
          const sharp = sharpModule.default
          
          try {
            const metadata = await sharp(imageBuffer).metadata()
            console.log(`[External Seedream Combine] ✅ Image validated: ${metadata.format}, ${metadata.width}x${metadata.height}`)
          } catch (validationError) {
            const errorMsg = validationError instanceof Error ? validationError.message : String(validationError)
            console.error(`[External Seedream Combine] ❌ CORRUPTED BASE64 IMAGE DETECTED:`, errorMsg)
            throw new Error(`Base64 image ${i + 1} is corrupted or incomplete. Error: ${errorMsg}. Please ensure the Base64 string is complete and correctly formatted.`)
          }
          
          try {
            console.log(`[External Seedream Combine] Normalizing to JPEG with Sharp...`)
            
            // Convert to standardized JPEG: 90% quality, max 2048px
            const normalizedBuffer = await sharp(imageBuffer)
              .resize(2048, 2048, {
                fit: 'inside',
                withoutEnlargement: true
              })
              .jpeg({ quality: 90 })
              .toBuffer()
            
            console.log(`[External Seedream Combine] ✅ Normalized to JPEG: ${(imageBuffer.length / 1024 / 1024).toFixed(2)} MB → ${(normalizedBuffer.length / 1024 / 1024).toFixed(2)} MB`)
            
            finalBuffer = normalizedBuffer
            
          } catch (sharpError: unknown) {
            const errorMsg = sharpError instanceof Error ? sharpError.message : String(sharpError)
            console.error(`[External Seedream Combine] ❌ JPEG normalization failed:`, errorMsg)
            console.warn(`[External Seedream Combine] ⚠️  WARNING: Using original image without normalization`)
          }
          
          // Upload using 2-step process: initiate → PUT
          const fileExtension = finalMimeType.split('/')[1] || 'jpeg'
          const fileName = `base64-image-${i + 1}.${fileExtension}`
          
          console.log(`[External Seedream Combine] Uploading ${fileName}: ${finalBuffer.length} bytes (${(finalBuffer.length / 1024 / 1024).toFixed(2)} MB)`)
          
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
          
          console.log(`[External Seedream Combine] Initiated upload for ${fileName}`)
          console.log(`[External Seedream Combine] Upload URL: ${upload_url.substring(0, 100)}...`)
          console.log(`[External Seedream Combine] File URL: ${file_url}`)
          
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
          
          console.log(`[External Seedream Combine] ✅ Successfully uploaded Base64 image ${i + 1}: ${file_url}`)
          allImageUrls.push(file_url)
          
        } catch (error) {
          console.error(`[External Seedream Combine] Failed to process Base64 image ${i + 1}:`, error)
          return NextResponse.json({
            success: false,
            error: "Base64 image processing failed",
            details: `Failed to process Base64 image ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`
          }, { status: 500 })
        }
      }
    }

    if (allImageUrls.length !== 2) {
      return NextResponse.json({
        success: false,
        error: "Exactly 2 image URLs required",
        details: `Expected 2 image URLs, but got ${allImageUrls.length}`
      }, { status: 400 })
    }

    // Process canonical prompt if enabled
    let finalPrompt = prompt
    let tempCanonicalConfig = canonicalConfig
    if (useCanonicalPrompt) {
      console.log("[External Seedream Combine] Processing canonical prompt...")
      console.log("[External Seedream Combine] Original prompt:", prompt)
      console.log("[External Seedream Combine] Canonical config:", JSON.stringify(tempCanonicalConfig, null, 2))
      
      // Set user input from original prompt
      if (!tempCanonicalConfig) {
        tempCanonicalConfig = {}
      }
      tempCanonicalConfig.userInput = prompt
      
      try {
        // Generate canonical prompt
        const result = canonicalPromptProcessor.generateCanonicalPrompt(tempCanonicalConfig)
        finalPrompt = result.canonicalPrompt
        
        console.log("[External Seedream Combine] Generated canonical prompt:", finalPrompt)
        console.log("[External Seedream Combine] Processed user input:", result.processedUserInput)
      } catch (canonicalError) {
        console.error("[External Seedream Combine] Error processing canonical prompt:", canonicalError)
        console.log("[External Seedream Combine] Falling back to original prompt")
        // Fall back to original prompt if canonical processing fails
      }
    } else {
      console.log("[External Seedream Combine] Canonical prompt disabled, using original prompt")
    }

    console.log("[External Seedream Combine] All image URLs ready:", allImageUrls)
    console.log("[External Seedream Combine] Starting enhanced pipeline: seedream → combine")

    // ENHANCED PIPELINE: Conditionally process image based on origin and processSecondImage flag
    // CA: Process first image (index 0)
    // TCN: Process second image (index 1)
    let image1Url: string
    let image2Url: string
    let imageToProcess: string
    let imageToProcessLabel: string
    
    if (origin === "CA") {
      image1Url = allImageUrls[0] // First image - will be processed if enabled
      image2Url = allImageUrls[1] // Second image - kept original
      imageToProcess = image1Url
      imageToProcessLabel = "image1 (first image)"
      console.log("[External Seedream Combine] CA mode: Will process first image (index 0)")
    } else {
      image1Url = allImageUrls[0] // First image - kept original
      image2Url = allImageUrls[1] // Second image - will be processed if enabled
      imageToProcess = image2Url
      imageToProcessLabel = "image2 (second image)"
      console.log("[External Seedream Combine] TCN mode: Will process second image (index 1)")
    }
    
    console.log("[External Seedream Combine] Image1:", image1Url)
    console.log("[External Seedream Combine] Image2:", image2Url)
    console.log("[External Seedream Combine] Process second image:", processSecondImage)
    console.log("[External Seedream Combine] Image to process:", imageToProcessLabel)

    let processedImage1Url: string = image1Url // Default: use original
    let processedImage2Url: string = image2Url // Default: use original
    let sedreamPrompt: string = "" // Declare sedream prompt variable
    
    if (processSecondImage) {
      // PIPELINE STEP 1: Process target image with seedream-v4-edit
      console.log(`[External Seedream Combine] Pipeline Step 1: Processing ${imageToProcessLabel} with seedream-v4-edit`)
      
      try {
        // Get sedream enhancement text from configuration
        sedreamPrompt = await getSedreamEnhancementText() || ""
      
      if (!sedreamPrompt) {
        console.error("[External Seedream Combine] No sedream_enhancement_text configured")
        return NextResponse.json({
          success: false,
          error: "Configuration error",
          details: "No SeDream enhancement text configured for image processing pipeline"
        }, { status: 500 })
      }

      console.log("[External Seedream Combine] Using sedream prompt:", sedreamPrompt.substring(0, 100) + "...")

      // Call internal seedream-v4-edit to process target image
      const seedreamFormData = new FormData()
      
      // Download target image to create a File object for seedream
      const imageResponse = await fetch(imageToProcess)
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch ${imageToProcessLabel}: ${imageResponse.status}`)
      }
      
      const imageBlob = await imageResponse.blob()
      const imageFile = new File([imageBlob], 'image.jpg', { type: 'image/jpeg' })
      
      seedreamFormData.append("image", imageFile)
      seedreamFormData.append("prompt", "") // Empty prompt - use only customEnhancementText
      seedreamFormData.append("useJSONEnhancement", "false") // Use customEnhancementText as-is
      seedreamFormData.append("customEnhancementText", sedreamPrompt)
      // seedream-v4-edit doesn't support "custom" - use "1:1" for custom dimensions
      seedreamFormData.append("aspect_ratio", aspectRatio === "custom" ? "1:1" : aspectRatio)

      console.log("[External Seedream Combine] Calling internal seedream-v4-edit API...")
      
      const seedreamResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/seedream-v4-edit`, {
        method: 'POST',
        body: seedreamFormData,
      })

      if (!seedreamResponse.ok) {
        const errorText = await seedreamResponse.text()
        throw new Error(`SeDream API failed: ${seedreamResponse.status} - ${errorText}`)
      }

      const seedreamResult = await seedreamResponse.json()
      
      if (!seedreamResult.images || !seedreamResult.images[0] || !seedreamResult.images[0].url) {
        throw new Error("SeDream API returned invalid response")
      }

        const processedUrl = seedreamResult.images[0].url
        
        if (origin === "CA") {
          processedImage1Url = processedUrl
          console.log("[External Seedream Combine] ✅ SeDream processing complete (image1):", processedImage1Url)
        } else {
          processedImage2Url = processedUrl
          console.log("[External Seedream Combine] ✅ SeDream processing complete (image2):", processedImage2Url)
        }
        
      } catch (seedreamError) {
        console.error("[External Seedream Combine] Pipeline Step 1 failed:", seedreamError)
        return NextResponse.json({
          success: false,
          error: "Pipeline step 1 failed",
          details: `SeDream processing failed: ${seedreamError instanceof Error ? seedreamError.message : 'Unknown error'}`,
          step: "seedream-v4-edit",
          failedImage: imageToProcess
        }, { status: 500 })
      }
    } else {
      // Skip Step 1: Use both original images directly
      console.log("[External Seedream Combine] Skipping Step 1: Using both original images directly")
    }

    // PIPELINE STEP 2: Combine images
    let step2Label: string
    if (processSecondImage) {
      step2Label = origin === "CA" 
        ? "Combining images (with processed image1)" 
        : "Combining images (with processed image2)"
    } else {
      step2Label = "Combining images (both original)"
    }
    
    console.log(`[External Seedream Combine] Pipeline Step 2: ${step2Label}`)
    console.log("[External Seedream Combine] Final combination:")
    console.log(`  - Image1 (${origin === "CA" && processSecondImage ? 'processed' : 'original'}):`, processedImage1Url)
    console.log(`  - Image2 (${origin === "TCN" && processSecondImage ? 'processed' : 'original'}):`, processedImage2Url)
    console.log("  - User prompt:", finalPrompt)

    // Update image URLs for final combination
    const combinedImageUrls = [processedImage1Url, processedImage2Url]

    // Map aspect ratio to fal.ai image_size format or custom dimensions
    let imageSize: string | undefined
    let imageDimensions: { width: number; height: number } | undefined
    
    if (aspectRatio === "custom") {
      imageSize = "custom"
      imageDimensions = { width: customWidth!, height: customHeight! }
      console.log("[External Seedream Combine] Using custom dimensions:", imageDimensions)
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

    // Prepare input for fal.ai Seedream v4 edit (final combination)
    const input: any = {
      image_urls: combinedImageUrls, // Image1 + Processed Image2
      prompt: finalPrompt, // User's prompt (canonical or enhanced)
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

    console.log("[External Seedream Combine] Final input object being sent to fal.ai:")
    console.log("=====================================")
    console.log("Model: fal-ai/bytedance/seedream/v4/edit")
    console.log("Input images count:", combinedImageUrls.length)
    console.log("Image URLs:", combinedImageUrls)
    console.log("Input:", JSON.stringify({
      ...input,
      image_urls: `[${combinedImageUrls.length} URLs: ${combinedImageUrls.map(url => url.substring(0, 50) + '...').join(', ')}]`
    }, null, 2))
    console.log("=====================================")

    console.log("[External Seedream Combine] Calling fal.ai Seedream v4...")
    
    try {
      const result = await fal.subscribe("fal-ai/bytedance/seedream/v4/edit", {
        input,
        logs: true,
        onQueueUpdate: (update) => {
          if (update.status === "IN_PROGRESS") {
            console.log("[External Seedream Combine] Progress:", update.logs?.map(log => log.message).join(" ") || "Processing...")
          }
        }
      })

      console.log("[External Seedream Combine] fal.ai response received")
      
      // Validate response
      if (!result.data || !result.data.images || !Array.isArray(result.data.images) || result.data.images.length === 0) {
        console.error("[External Seedream Combine] Invalid response format")
        
        return NextResponse.json({
          success: false,
          error: "No images generated",
          details: "fal.ai API returned no images. Check the prompt and input images."
        }, { status: 500 })
      }

      console.log("[External Seedream Combine] Successfully generated", result.data.images.length, "images")

      // Format response to match expected structure
      const images = result.data.images.map((img: any) => ({
        url: img.url,
        width: img.width || 1024,
        height: img.height || 1024
      }))

      // Return successful response with enhanced pipeline metadata
      return NextResponse.json({
        success: true,
        image: images[0]?.url || images[0], // Primary image for UI compatibility
        images, // All images for completeness
        prompt: finalPrompt,
        originalPrompt: prompt,
        model: "fal-ai/bytedance/seedream/v4/edit",
        provider: "fal.ai",
        inputImages: 2, // Always 2 for enhanced pipeline
        settings: {
          aspect_ratio: aspectRatio,
          enable_safety_checker: enableSafetyChecker,
          image_size: imageSize,
          use_canonical_prompt: useCanonicalPrompt
        },
        timestamp: new Date().toISOString(),
        // Enhanced pipeline metadata
        enhancedPipeline: true,
        pipelineSteps: processSecondImage ? [
          {
            step: 1,
            operation: "seedream-v4-edit",
            inputImage: origin === "CA" ? image1Url : image2Url,
            outputImage: origin === "CA" ? processedImage1Url : processedImage2Url,
            prompt: sedreamPrompt,
            processedImageIndex: origin === "CA" ? 0 : 1,
            origin: origin
          },
          {
            step: 2,
            operation: "seedream-v4-edit-combine",
            inputImages: combinedImageUrls,
            outputImage: images[0]?.url,
            prompt: finalPrompt
          }
        ] : [
          {
            step: 1,
            operation: "seedream-v4-edit-combine",
            inputImages: combinedImageUrls,
            outputImage: images[0]?.url,
            prompt: finalPrompt,
            note: "Direct combination without pre-processing"
          }
        ]
      })

    } catch (falError) {
      console.error("[External Seedream Combine] fal.ai API error:", falError)
      
      return NextResponse.json({
        success: false,
        error: "Failed to combine images with Seedream v4",
        details: falError instanceof Error ? falError.message : "Unknown error",
        model: "fal-ai/bytedance/seedream/v4/edit",
        provider: "fal.ai"
      }, { status: 500 })
    }

  } catch (error) {
    console.error("[External Seedream Combine] Unexpected error:", error)
    
    return NextResponse.json({
      success: false,
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

/**
 * GET /api/external/seedream-ark-combine
 * 
 * Returns API documentation and usage information
 */
export async function GET() {
  return NextResponse.json({
    name: "Seedream Combine API (Enhanced Pipeline)",
    description: "Combine two images using Seedream v4 with AI-powered style transfer and composition",
    version: "2.0.0",
    endpoint: "/api/external/seedream-ark-combine",
    method: "POST",
    contentType: "multipart/form-data",
    pipeline: {
      description: "Conditional 2-step pipeline for optimal results (Step 1 optional based on processSecondImage flag)",
      steps: [
        {
          step: 1,
          name: "Style Transfer (Optional)",
          description: "Process target image with Seedream v4 using configured style prompt (only if processSecondImage=true)",
          enabled: "Controlled by settings.processSecondImage (default: true)",
          targetImage: "Determined by origin parameter: CA=first image (index 0), TCN=second image (index 1)"
        },
        {
          step: 2,
          name: "Image Combination",
          description: "Combine both images (one processed, one original) using user prompt"
        }
      ]
    },
    parameters: {
      prompt: {
        type: "string",
        required: true,
        description: "Text description for the final image combination (used in step 2)"
      },
      "image0 & image1": {
        type: "file",
        required: true,
        description: "Exactly 2 image files (PNG, JPG, JPEG, WEBP)",
        maxSize: "10MB each",
        alternative: "Can use imageUrl0 and imageUrl1 instead"
      },
      "imageUrl0 & imageUrl1": {
        type: "string",
        required: "alternative",
        description: "Exactly 2 image URLs",
        alternative: "Can use image0 and image1 files instead"
      },
      settings: {
        type: "JSON string",
        required: false,
        description: "Generation settings",
        properties: {
          aspect_ratio: {
            type: "string",
            options: ["1:1", "16:9", "9:16", "4:3", "3:4"],
            default: "1:1"
          },
          enable_safety_checker: {
            type: "boolean",
            default: true
          },
          processSecondImage: {
            type: "boolean",
            default: true,
            description: "Enable 2-step pipeline: process target image with Seedream v4 before combination. When false, both images are used as-is."
          },
          origin: {
            type: "string",
            default: "CA",
            options: ["CA", "TCN"],
            description: "Determines which image to process in Step 1: 'CA' processes first image (index 0), 'TCN' processes second image (index 1)"
          }
        }
      },
      useCanonicalPrompt: {
        type: "boolean",
        required: false,
        description: "Enable canonical prompt processing for advanced control",
        default: false
      },
      canonicalConfig: {
        type: "JSON string",
        required: false,
        description: "Configuration for canonical prompt (when useCanonicalPrompt is true)"
      },
      orgType: {
        type: "string",
        required: false,
        description: "Organization type for content moderation",
        default: "general"
      }
    },
    response: {
      success: {
        success: true,
        image: "https://example.com/combined-image.png",
        images: [
          {
            url: "https://example.com/combined-image.png",
            width: 1280,
            height: 1280
          }
        ],
        prompt: "Final processed prompt used",
        originalPrompt: "User's original prompt",
        model: "fal-ai/bytedance/seedream/image-to-image-v4",
        provider: "fal.ai",
        inputImages: 2,
        settings: {
          aspect_ratio: "1:1",
          enable_safety_checker: true,
          image_size: "square_hd",
          use_canonical_prompt: false
        },
        timestamp: "2025-10-29T00:00:00.000Z",
        enhancedPipeline: true,
        pipelineSteps: [
          {
            step: 1,
            operation: "seedream-v4-edit",
            inputImage: "https://...",
            outputImage: "https://...",
            prompt: "Configured style transfer prompt"
          },
          {
            step: 2,
            operation: "seedream-v4-edit-combine",
            inputImages: ["https://...", "https://..."],
            outputImage: "https://...",
            prompt: "User's final prompt"
          }
        ]
      },
      error: {
        success: false,
        error: "Error description",
        details: "Additional error details",
        category: "Content category (for moderation errors)",
        blocked: "Boolean indicating if content was blocked"
      }
    },
    examples: {
      curl: `curl -X POST https://your-domain.com/api/external/seedream-ark-combine \\
  -F "prompt=Combine these images with vibrant colors" \\
  -F "image0=@/path/to/first-image.jpg" \\
  -F "image1=@/path/to/second-image.jpg" \\
  -F 'settings={"aspect_ratio":"16:9","processSecondImage":false}'`,
      
      javascript: `const formData = new FormData();
formData.append('prompt', 'Combine these images with vibrant colors');
formData.append('image0', firstImageFile);
formData.append('image1', secondImageFile);
formData.append('settings', JSON.stringify({
  aspect_ratio: '16:9',
  processSecondImage: false // Set to true to enable 2-step processing
}));

const response = await fetch('/api/external/seedream-ark-combine', {
  method: 'POST',
  body: formData
});

const result = await response.json();`
    },
    notes: [
      "Requires exactly 2 images for combination",
      "Conditional 2-step pipeline controlled by processSecondImage flag (default: false)",
      "  • When false: Both images combined directly without preprocessing",
      "  • When true: Step 1 processes second image with configured style, Step 2 combines with first image",
      "Processing time: 15-30 seconds (direct) or 30-60 seconds (with preprocessing)",
      "Maximum file size: 10MB per image",
      "Supported formats: PNG, JPG, JPEG, WEBP",
      "Built-in content moderation for safe results",
      "Optional canonical prompt for advanced composition control"
    ]
  })
}
