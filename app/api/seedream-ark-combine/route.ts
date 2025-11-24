import { type NextRequest, NextResponse } from "next/server"
import { fal } from "@fal-ai/client"
import { ContentModerationService } from "@/lib/content-moderation"
import { canonicalPromptProcessor, type CanonicalPromptConfig } from "@/lib/canonical-prompt"
import { getSedreamEnhancementText } from "@/lib/json-enhancement"

/**
 * POST /api/seedream-ark-combine
 * 
 * Internal API endpoint for combining images using Seedream-v4 via fal.ai with enhanced pipeline.
 * 
 * ENHANCED PIPELINE (conditional 2-step or direct combination):
 * Step 1 (optional): If processSecondImage=true, process image2 with seedream-v4-edit using sedream_enhancement_text
 * Step 2: Combine image1 with image2 (processed or original) using user's prompt (canonical or enhanced)
 * 
 * Body parameters (multipart/form-data):
 * - prompt (required): Text description for image combination (used in Step 2)
 * - image0, image1 (required): Exactly 2 image files to upload and combine
 *   OR
 * - imageUrl0, imageUrl1 (required): Exactly 2 image URLs to combine
 * - settings (optional): JSON string with generation settings
 *   - aspect_ratio: "1:1" | "16:9" | "9:16" | "4:3" | "3:4" (default: "1:1") 
 *   - enable_safety_checker: boolean (default: true)
 *   - processSecondImage: boolean (default: true) - Enable 2-step processing with seedream-v4-edit
 * - useCanonicalPrompt (optional): boolean (enable canonical prompt processing)
 * - canonicalConfig (optional): JSON string with canonical prompt configuration
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
 *   "settings": {...},
 *   "enhancedPipeline": true,
 *   "pipelineSteps": [...]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    console.log("[SEEDREAM-COMBINE] Request received")
    
    // Check Content-Type to determine if JSON or FormData
    const contentType = request.headers.get('content-type') || ''
    const isJSON = contentType.includes('application/json')
    
    console.log(`[SEEDREAM-COMBINE] Content-Type: ${contentType}, isJSON: ${isJSON}`)
    
    let prompt: string
    let orgType: string
    let settings: any = {}
    let useCanonicalPrompt = false
    let canonicalConfig: CanonicalPromptConfig | undefined
    let imageFiles: File[] = []
    let imageUrls: string[] = []
    let base64Images: string[] = []
    
    if (isJSON) {
      // JSON payload (for large Base64 images >900KB to avoid FormData 1MB truncation)
      console.log("[SEEDREAM-COMBINE] 📦 Processing JSON payload (large Base64 workaround)")
      
      const jsonBody = await request.json()
      
      prompt = jsonBody.prompt
      orgType = jsonBody.orgType || "general"
      settings = jsonBody.settings || {}
      useCanonicalPrompt = jsonBody.useCanonicalPrompt === true || jsonBody.useCanonicalPrompt === "true"
      
      if (jsonBody.canonicalConfig) {
        canonicalConfig = jsonBody.canonicalConfig
      }
      
      // Extract image URLs and Base64 from JSON
      if (jsonBody.imageUrls && Array.isArray(jsonBody.imageUrls)) {
        imageUrls = jsonBody.imageUrls.filter((url: string) => url && url.trim())
        console.log(`[SEEDREAM-COMBINE] Found ${imageUrls.length} image URLs in JSON`)
      }
      
      if (jsonBody.base64Images && Array.isArray(jsonBody.base64Images)) {
        base64Images = jsonBody.base64Images.filter((b64: string) => b64 && b64.trim())
        console.log(`[SEEDREAM-COMBINE] Found ${base64Images.length} Base64 images in JSON`)
        
        // Log sizes to verify no truncation
        base64Images.forEach((b64, i) => {
          console.log(`[SEEDREAM-COMBINE] JSON Base64 image ${i + 1}: ${b64.length} chars (${(b64.length / 1024 / 1024).toFixed(2)} MB)`)
        })
      }
      
    } else {
      // FormData payload (standard path for file uploads or small Base64)
      console.log("[SEEDREAM-COMBINE] 📦 Processing FormData payload")
      
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
          console.warn("[SEEDREAM-COMBINE] Failed to parse settings:", error)
        }
      }

      // Canonical Prompt parameters
      useCanonicalPrompt = formData.get("useCanonicalPrompt") === "true"
      const canonicalConfigStr = formData.get("canonicalConfig") as string
      if (canonicalConfigStr) {
        try {
          canonicalConfig = JSON.parse(canonicalConfigStr)
        } catch (error) {
          console.warn("[SEEDREAM-COMBINE] Failed to parse canonical config:", error)
        }
      }
      
      // Get image files (image0, image1, etc.)
      for (const [key, value] of formData.entries()) {
        if (key.startsWith('image') && key.match(/^image\d+$/) && value instanceof File && value.size > 0) {
          imageFiles.push(value)
          console.log(`[SEEDREAM-COMBINE] Found image file: ${key}, size: ${value.size}, type: ${value.type}`)
        } else if (key.startsWith('imageUrl') && key.match(/^imageUrl\d+$/) && typeof value === 'string' && value.trim()) {
          imageUrls.push(value.trim())
          console.log(`[SEEDREAM-COMBINE] Found image URL: ${key}, url: ${value}`)
        } else if (key.startsWith('imageBase64') && typeof value === 'string' && value.trim()) {
          const base64String = value.trim()
          base64Images.push(base64String)
          console.log(`[SEEDREAM-COMBINE] Found Base64 image: ${key}, length: ${base64String.length} chars (${(base64String.length / 1024 / 1024).toFixed(2)} MB)`)
          
          // Check if Base64 might be truncated
          const last4 = base64String.slice(-4)
          if (!last4.match(/[A-Za-z0-9+/=]{4}$/)) {
            console.warn(`[SEEDREAM-COMBINE] ⚠️  WARNING: Base64 image ${key} might be truncated (unusual ending: "${last4}")`)
          }
        }
      }
    }
    
    console.log("[SEEDREAM-COMBINE] Canonical prompt parameters:")
    console.log("  - useCanonicalPrompt:", useCanonicalPrompt)
    console.log("  - canonicalConfig:", JSON.stringify(canonicalConfig, null, 2))
    
    // Extract fal.ai specific settings
    const aspectRatio = settings.aspect_ratio || "1:1"
    const customWidth = settings.custom_width ? parseInt(settings.custom_width.toString()) : undefined
    const customHeight = settings.custom_height ? parseInt(settings.custom_height.toString()) : undefined
    const enableSafetyChecker = settings.enable_safety_checker !== false // Default to true
    const processSecondImage = settings.processSecondImage !== false // Default to true

    // Validate prompt
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json({
        error: "Prompt is required",
        details: "Please provide a text description for image combination"
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
      enableSafetyChecker,
      processSecondImage,
      orgType
    })

    // Validate that we have exactly 2 images for enhanced pipeline
    const totalImages = imageFiles.length + imageUrls.length + base64Images.length
    if (totalImages !== 2) {
      return NextResponse.json({
        error: "Enhanced pipeline requires exactly 2 images",
        details: `Found ${imageFiles.length} files, ${imageUrls.length} URLs, and ${base64Images.length} Base64 images (total: ${totalImages}). The enhanced pipeline processes image2 with seedream-v4-edit, then combines image1 with the processed result.`
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
    
    // Process Base64 images first
    if (base64Images.length > 0) {
      console.log(`[SEEDREAM-COMBINE] Processing ${base64Images.length} Base64 images...`)
      
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
            console.log(`[SEEDREAM-COMBINE] Normalized MIME type from image/jpg to image/jpeg for image ${i + 1}`)
          }
          
          console.log(`[SEEDREAM-COMBINE] Processing Base64 image ${i + 1}/${base64Images.length}, type: ${mimeType}`)
          
          let finalBuffer: Buffer = imageBuffer
          let finalMimeType = 'image/jpeg' // Always use standard JPEG
          
          console.log(`[SEEDREAM-COMBINE] Base64 image ${i + 1} original size: ${(imageBuffer.length / 1024 / 1024).toFixed(2)} MB, type: ${mimeType}`)
          
          // CRITICAL: Validate image integrity BEFORE processing
          const sharpModule = await import('sharp')
          const sharp = sharpModule.default
          
          try {
            const metadata = await sharp(imageBuffer).metadata()
            console.log(`[SEEDREAM-COMBINE] ✅ Image validated: ${metadata.format}, ${metadata.width}x${metadata.height}`)
          } catch (validationError) {
            const errorMsg = validationError instanceof Error ? validationError.message : String(validationError)
            console.error(`[SEEDREAM-COMBINE] ❌ CORRUPTED BASE64 IMAGE DETECTED:`, errorMsg)
            throw new Error(`Base64 image ${i + 1} is corrupted or incomplete. Error: ${errorMsg}. Please ensure the Base64 string is complete and correctly formatted.`)
          }
          
          try {
            console.log(`[SEEDREAM-COMBINE] Normalizing to JPEG with Sharp...`)
            
            // Convert to standardized JPEG: 90% quality, max 2048px
            const normalizedBuffer = await sharp(imageBuffer)
              .resize(2048, 2048, {
                fit: 'inside',
                withoutEnlargement: true
              })
              .jpeg({ quality: 90 })
              .toBuffer()
            
            console.log(`[SEEDREAM-COMBINE] ✅ Normalized to JPEG: ${(imageBuffer.length / 1024 / 1024).toFixed(2)} MB → ${(normalizedBuffer.length / 1024 / 1024).toFixed(2)} MB`)
            
            finalBuffer = normalizedBuffer
            
          } catch (sharpError: unknown) {
            const errorMsg = sharpError instanceof Error ? sharpError.message : String(sharpError)
            console.error(`[SEEDREAM-COMBINE] ❌ JPEG normalization failed:`, errorMsg)
            console.warn(`[SEEDREAM-COMBINE] ⚠️  WARNING: Using original image without normalization`)
          }
          
          // Upload using 2-step process: initiate → PUT
          const fileExtension = finalMimeType.split('/')[1] || 'jpeg'
          const fileName = `base64-image-${i + 1}.${fileExtension}`
          
          console.log(`[SEEDREAM-COMBINE] Uploading ${fileName}: ${finalBuffer.length} bytes (${(finalBuffer.length / 1024 / 1024).toFixed(2)} MB)`)
          
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
          
          const { upload_url, file_url } = await initiateResponse.json() as { 
            upload_url: string
            file_url: string 
          }
          
          console.log(`[SEEDREAM-COMBINE] Got presigned URL, uploading ${finalBuffer.length} bytes...`)
          
          // Step 2: PUT the actual file data to presigned URL
          const uint8Array = new Uint8Array(finalBuffer)
          const putResponse = await fetch(upload_url, {
            method: 'PUT',
            headers: {
              'Content-Type': finalMimeType,
              'Content-Length': finalBuffer.length.toString()
            },
            body: uint8Array
          })
          
          if (!putResponse.ok) {
            const errorText = await putResponse.text()
            throw new Error(`Failed to PUT file: ${putResponse.status} - ${errorText}`)
          }
          
          const uploadedUrl = file_url
          
          console.log(`[SEEDREAM-COMBINE] ✅ Uploaded successfully: ${uploadedUrl}`)
          console.log(`[SEEDREAM-COMBINE]    Original: ${imageBuffer.length} bytes → Sharp: ${finalBuffer.length} bytes → Sent: ${uint8Array.byteLength} bytes`)
          
          allImageUrls.push(uploadedUrl)
          console.log(`[SEEDREAM-COMBINE] Base64 image ${i + 1} uploaded successfully: ${uploadedUrl}`)
          console.log(`[SEEDREAM-COMBINE] Upload verified: ${finalMimeType}, ${finalBuffer.length} bytes`)
          
        } catch (base64Error) {
          console.error(`[SEEDREAM-COMBINE] Failed to process Base64 image ${i + 1}:`, base64Error)
          return NextResponse.json({
            error: "Base64 image processing failed",
            details: `Failed to process Base64 image ${i + 1}: ${base64Error instanceof Error ? base64Error.message : 'Unknown error'}. Ensure the Base64 string is valid and complete (not truncated).`
          }, { status: 400 })
        }
      }
    }
    
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

    // Process canonical prompt if enabled
    let finalPrompt = prompt
    if (useCanonicalPrompt) {
      console.log("[SEEDREAM-COMBINE] Processing canonical prompt...")
      console.log("[SEEDREAM-COMBINE] Original prompt:", prompt)
      console.log("[SEEDREAM-COMBINE] Canonical config:", JSON.stringify(canonicalConfig, null, 2))
      
      // Set user input from original prompt
      if (!canonicalConfig) {
        canonicalConfig = {}
      }
      canonicalConfig.userInput = prompt
      
      try {
        // Generate canonical prompt
        const result = canonicalPromptProcessor.generateCanonicalPrompt(canonicalConfig)
        finalPrompt = result.canonicalPrompt
        
        console.log("[SEEDREAM-COMBINE] Generated canonical prompt:", finalPrompt)
        console.log("[SEEDREAM-COMBINE] Processed user input:", result.processedUserInput)
      } catch (canonicalError) {
        console.error("[SEEDREAM-COMBINE] Error processing canonical prompt:", canonicalError)
        console.log("[SEEDREAM-COMBINE] Falling back to original prompt")
        // Fall back to original prompt if canonical processing fails
      }
    } else {
      console.log("[SEEDREAM-COMBINE] Canonical prompt disabled, using original prompt")
    }

    console.log("[SEEDREAM-COMBINE] All image URLs ready:", allImageUrls)
    console.log("[SEEDREAM-COMBINE] Starting pipeline with processSecondImage:", processSecondImage)

    // ENHANCED PIPELINE: Conditionally process image2 based on processSecondImage flag
    const image1Url = allImageUrls[0] // First image (always unchanged)
    const image2Url = allImageUrls[1] // Second image
    
    console.log("[SEEDREAM-COMBINE] Image1 (unchanged):", image1Url)
    console.log("[SEEDREAM-COMBINE] Image2 (original):", image2Url)
    console.log("[SEEDREAM-COMBINE] Process second image:", processSecondImage)

    let processedImage2Url: string
    let sedreamPrompt: string = "" // Declare sedream prompt variableiable
    
    if (processSecondImage) {
      // PIPELINE STEP 1: Process image2 with seedream-v4-edit
      console.log("[SEEDREAM-COMBINE] Pipeline Step 1: Processing image2 with seedream-v4-edit")
      
      try {
        // Get sedream enhancement text from configuration
        sedreamPrompt = await getSedreamEnhancementText() || ""
      
      if (!sedreamPrompt) {
        console.error("[SEEDREAM-COMBINE] No sedream_enhancement_text configured")
        return NextResponse.json({
          error: "Configuration error",
          details: "No SeDream enhancement text configured for image processing pipeline"
        }, { status: 500 })
      }

      console.log("[SEEDREAM-COMBINE] Using sedream prompt:", sedreamPrompt.substring(0, 100) + "...")

      // Call seedream-v4-edit to process image2
      const seedreamFormData = new FormData()
      
      // Download image2 to create a File object for seedream
      const image2Response = await fetch(image2Url)
      if (!image2Response.ok) {
        throw new Error(`Failed to fetch image2: ${image2Response.status}`)
      }
      
      const image2Blob = await image2Response.blob()
      const image2File = new File([image2Blob], 'image2.jpg', { type: 'image/jpeg' })
      
      seedreamFormData.append("image", image2File)
      seedreamFormData.append("prompt", "") // Empty prompt - use only customEnhancementText
      seedreamFormData.append("useJSONEnhancement", "false") // Use customEnhancementText as-is
      seedreamFormData.append("customEnhancementText", sedreamPrompt)
      seedreamFormData.append("aspect_ratio", aspectRatio)

      console.log("[SEEDREAM-COMBINE] Calling seedream-v4-edit API...")
      
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

      processedImage2Url = seedreamResult.images[0].url
      console.log("[SEEDREAM-COMBINE] ✅ SeDream processing complete:", processedImage2Url)
      
    } catch (seedreamError) {
      console.error("[SEEDREAM-COMBINE] Pipeline Step 1 failed:", seedreamError)
      return NextResponse.json({
        error: "Pipeline step 1 failed",
        details: `SeDream processing failed: ${seedreamError instanceof Error ? seedreamError.message : 'Unknown error'}`,
        step: "seedream-v4-edit",
        failedImage: image2Url
      }, { status: 500 })
    }
  } else {
    // Skip Step 1: Use original image2 directly
    console.log("[SEEDREAM-COMBINE] Skipping Step 1: Using original image2 directly")
    processedImage2Url = image2Url
  }

    // ENHANCED PIPELINE: Step 2 - Combine image1 with processed image2
    // PIPELINE STEP 2: Combine images
    const step2Label = processSecondImage ? "Combining images (with processed image2)" : "Combining images (both original)"
    console.log(`[SEEDREAM-COMBINE] Pipeline Step 2: ${step2Label}`)
    console.log("[SEEDREAM-COMBINE] Final combination:")
    console.log("  - Image1 (original):", image1Url)
    console.log(`  - Image2 (${processSecondImage ? 'processed' : 'original'}):`, processedImage2Url)
    console.log("  - User prompt:", finalPrompt)

    // Update image URLs for final combination (use processed image2)
    const combinedImageUrls = [image1Url, processedImage2Url]

    // Map aspect ratio to fal.ai image_size format or custom dimensions
    let imageSize: string | undefined
    let imageDimensions: { width: number; height: number } | undefined
    
    if (aspectRatio === "custom") {
      imageSize = "custom"
      imageDimensions = { width: customWidth!, height: customHeight! }
      console.log("[SEEDREAM-COMBINE] Using custom dimensions:", imageDimensions)
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
      image_size: imageSize,
      enable_safety_checker: enableSafetyChecker
    }
    
    // Add custom dimensions if using custom size
    if (aspectRatio === "custom" && imageDimensions) {
      input.width = imageDimensions.width
      input.height = imageDimensions.height
    }

    console.log("[SEEDREAM-COMBINE] Final input object being sent to fal.ai:")
    console.log("=====================================")
    console.log("Model: fal-ai/bytedance/seedream/v4/edit")
    console.log("Input images count:", combinedImageUrls.length)
    console.log("Image URLs:", combinedImageUrls)
    console.log("Input:", JSON.stringify({
      ...input,
      image_urls: `[${combinedImageUrls.length} URLs: ${combinedImageUrls.map(url => url.substring(0, 50) + '...').join(', ')}]`
    }, null, 2))
    console.log("=====================================")

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
          use_canonical_prompt: useCanonicalPrompt,
          ...(aspectRatio === "custom" && imageDimensions ? {
            custom_width: imageDimensions.width,
            custom_height: imageDimensions.height
          } : {})
        },
        timestamp: new Date().toISOString(),
        // Enhanced pipeline metadata
        enhancedPipeline: true,
        pipelineSteps: [
          {
            step: 1,
            operation: "seedream-v4-edit",
            inputImage: image2Url,
            outputImage: processedImage2Url,
            prompt: sedreamPrompt
          },
          {
            step: 2,
            operation: "seedream-v4-edit-combine",
            inputImages: combinedImageUrls,
            outputImage: images[0]?.url,
            prompt: finalPrompt
          }
        ]
      })

    } catch (falError) {
      console.error("[SEEDREAM-COMBINE] fal.ai API error:", falError)
      
      // Enhanced error logging for debugging
      if (falError && typeof falError === 'object') {
        console.error("[SEEDREAM-COMBINE] Error details:")
        console.error("  - Status:", (falError as any).status)
        console.error("  - Message:", (falError as any).message)
        
        // Log the full error body for ValidationError
        if ((falError as any).body) {
          console.error("  - Full Error Body:", JSON.stringify((falError as any).body, null, 2))
          
          // Try to extract validation details
          if ((falError as any).body.detail) {
            console.error("  - Validation Details:", (falError as any).body.detail)
          }
          
          if ((falError as any).body.errors) {
            console.error("  - Validation Errors:", (falError as any).body.errors)
          }
        }
        
        // Log the input that caused the error
        console.error("[SEEDREAM-COMBINE] Input that caused error:")
        console.error(JSON.stringify(input, null, 2))
      }
      
      // Return more detailed error information
      let errorMessage = "Failed to combine images with Seedream v4"
      let errorDetails = falError instanceof Error ? falError.message : "Unknown error"
      
      // Extract specific validation errors if available
      if ((falError as any)?.body?.detail) {
        const details = (falError as any).body.detail
        if (Array.isArray(details) && details.length > 0) {
          const firstError = details[0]
          
          // Handle file download errors specifically
          if (firstError.type === 'file_download_error') {
            errorMessage = "Image URL download failed"
            errorDetails = `One or more image URLs cannot be accessed by fal.ai. ${firstError.msg}`
            
            if (firstError.input && Array.isArray(firstError.input)) {
              console.error("[SEEDREAM-COMBINE] Problematic URLs:", firstError.input)
              errorDetails += `\n\nProblematic URLs:\n${firstError.input.join('\n')}`
            }
          } else {
            errorDetails = firstError.msg || JSON.stringify(details)
          }
        } else {
          errorDetails = (falError as any).body.detail
        }
      } else if ((falError as any)?.body?.errors) {
        errorDetails = JSON.stringify((falError as any).body.errors)
      }
      
      return NextResponse.json({
        error: errorMessage,
        details: errorDetails,
        model: "fal-ai/bytedance/seedream/v4/edit",
        provider: "fal.ai",
        status: (falError as any)?.status,
        validationError: (falError as any)?.status === 422,
        fileDownloadError: (falError as any)?.body?.detail?.[0]?.type === 'file_download_error',
        inputParameters: Object.keys(input),
        problematicUrls: (falError as any)?.body?.detail?.[0]?.input,
        errorBody: (falError as any)?.body
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