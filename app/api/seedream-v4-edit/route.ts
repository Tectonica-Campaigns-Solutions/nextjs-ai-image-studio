import { NextRequest, NextResponse } from "next/server"
import { fal } from "@fal-ai/client"
import { ContentModerationService } from "@/lib/content-moderation"
import sharp from 'sharp'
import { addDisclaimerToImage } from "@/lib/image-disclaimer"

/**
 * SeDream v4 Edit API Endpoint
 * 
 * Uses fal-ai/bytedance/seedream/v4/edit to transform images with style transfer
 * 
 * Request body (JSON or FormData):
 * - base64Image (optional): Base64-encoded image data
 * - imageUrl (optional): URL of image to edit
 * - image (optional): File - The input image to be transformed
 * - prompt: string (optional) - Additional prompt for style guidance
 * - useJSONEnhancement: boolean (optional) - Whether to apply JSON enhancement to prompt
 * - jsonIntensity: number (optional) - JSON enhancement intensity (0.1-1.0)
 * - customEnhancementText: string (optional) - Custom enhancement text
 * - aspect_ratio: string (optional) - Output aspect ratio (original, 1:1, 16:9, 9:16, 4:3, 3:4, custom) - Default: 'original'
 * - custom_width: number (optional) - Custom width in pixels (512-2048, required if aspect_ratio is 'custom')
 * - custom_height: number (optional) - Custom height in pixels (512-2048, required if aspect_ratio is 'custom')
 * 
 * Response format:
 * Success: { images: [{ url: string, width: number, height: number }] }
 * Error: { error: string, details?: string }
 */

export async function POST(request: NextRequest) {
  try {
    console.log("[SeDream v4 Edit] Processing request...")
    
    // Check if Fal.ai API key is available
    const falApiKey = process.env.FAL_API_KEY
    if (!falApiKey) {
      return NextResponse.json({ error: "FAL_API_KEY not configured" }, { status: 500 })
    }
    
    console.log("[SeDream v4 Edit] Fal API Key exists:", !!falApiKey)
    
    // Configure fal.ai client with API key
    fal.config({
      credentials: falApiKey,
    })
    
    // ============================================================================
    // DUAL PARSER: Support both JSON (Base64/URLs) and FormData (File uploads)
    // ============================================================================
    const contentType = request.headers.get('content-type') || ''
    const isJSON = contentType.includes('application/json')
    
    console.log(`[SeDream v4 Edit] Content-Type: ${contentType}`)
    console.log(`[SeDream v4 Edit] Using ${isJSON ? 'JSON' : 'FormData'} parser`)
    
    let imageFile: File | null = null
    let imageUrl: string | null = null
    let base64Image: string | null = null
    let prompt = ''
    let useJSONEnhancement = false
    let jsonIntensity = 1.0
    let customEnhancementText = ''
    let aspectRatio = 'original'
    let jsonOptions: any = {}
    let customWidth: number | undefined = undefined
    let customHeight: number | undefined = undefined
    
    if (isJSON) {
      // Parse JSON body for Base64 or URL inputs
      const jsonBody = await request.json()
      base64Image = jsonBody.base64Image || null
      imageUrl = jsonBody.imageUrl || null
      prompt = jsonBody.prompt || ''
      useJSONEnhancement = jsonBody.useJSONEnhancement === true
      jsonIntensity = parseFloat(jsonBody.jsonIntensity) || 1.0
      customEnhancementText = jsonBody.customEnhancementText || ''
      aspectRatio = jsonBody.aspect_ratio || jsonBody.aspectRatio || 'original'
      jsonOptions = jsonBody.jsonOptions || {}
      
      customWidth = jsonBody.custom_width ? parseInt(jsonBody.custom_width.toString()) : undefined
      customHeight = jsonBody.custom_height ? parseInt(jsonBody.custom_height.toString()) : undefined
      
      console.log('[SeDream v4 Edit] JSON input:', {
        hasBase64: !!base64Image,
        base64Length: base64Image?.length || 0,
        hasImageUrl: !!imageUrl,
        imageUrl: imageUrl || 'N/A',
        prompt: prompt.substring(0, 50) + '...',
        aspectRatio,
        useJSONEnhancement
      })
    } else {
      // Parse FormData for File uploads
      const formData = await request.formData()
      imageFile = formData.get("image") as File | null
      imageUrl = (formData.get("imageUrl") as string) || null
      prompt = (formData.get("prompt") as string) || ""
      useJSONEnhancement = formData.get("useJSONEnhancement") === "true"
      jsonIntensity = parseFloat(formData.get("jsonIntensity") as string) || 1.0
      customEnhancementText = (formData.get("customEnhancementText") as string) || ""
      aspectRatio = (formData.get("aspect_ratio") as string) || "original"
      
      const customWidthStr = formData.get("custom_width") as string
      const customHeightStr = formData.get("custom_height") as string
      customWidth = customWidthStr ? parseInt(customWidthStr) : undefined
      customHeight = customHeightStr ? parseInt(customHeightStr) : undefined
      
      // Parse JSON options from frontend
      const jsonOptionsStr = formData.get("jsonOptions") as string
      if (jsonOptionsStr) {
        try {
          jsonOptions = JSON.parse(jsonOptionsStr)
        } catch (error) {
          console.warn("[SeDream v4 Edit] Failed to parse JSON options:", error)
        }
      }
      
      console.log('[SeDream v4 Edit] FormData input:', {
        hasFile: !!imageFile,
        fileSize: imageFile?.size || 0,
        fileName: imageFile?.name || 'N/A',
        hasImageUrl: !!imageUrl,
        prompt: prompt.substring(0, 50) + '...',
        aspectRatio
      })
    }
    
    // Set default values for jsonOptions if not provided
    const defaultJsonOptions = {
      intensity: jsonIntensity,
      customText: jsonOptions.customText || '',
      ...jsonOptions
    }
    
    // Validate aspect_ratio parameter
    const validAspectRatios = ["original", "1:1", "16:9", "9:16", "4:3", "3:4", "custom"]
    if (!validAspectRatios.includes(aspectRatio)) {
      console.error("[SeDream v4 Edit] Invalid aspect_ratio received:", aspectRatio)
      return NextResponse.json({ 
        error: "Invalid aspect_ratio parameter",
        details: `aspect_ratio must be one of: ${validAspectRatios.join(', ')}. Received: ${aspectRatio}`
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
      
      // Validate dimension ranges (512-2048 pixels)
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

    // Validate that at least one image source is provided
    if (!imageFile && !imageUrl && !base64Image) {
      return NextResponse.json({ 
        error: "Missing required image parameter",
        details: "Either an image file, imageUrl, or base64Image is required for SeDream v4 edit"
      }, { status: 400 })
    }

    // Validate that customEnhancementText is provided (it's now mandatory)
    if (!customEnhancementText || !customEnhancementText.trim()) {
      return NextResponse.json({ 
        error: "Missing required custom enhancement text",
        details: "Custom Enhancement Text is required for SeDream v4 style transfer"
      }, { status: 400 })
    }

    console.log("[SeDream v4 Edit] Debug - received parameters:")
    console.log("  - prompt:", prompt ? `"${prompt.substring(0, 100)}..."` : "empty")
    console.log("  - useJSONEnhancement:", useJSONEnhancement)
    console.log("  - defaultJsonOptions:", defaultJsonOptions)

    // Use original prompt and apply SeDream enhancement (always enabled)
    let finalPrompt = prompt
    let enhancementText = defaultJsonOptions.customText
    
    if (!enhancementText) {
      // Try to load sedream_enhancement_text from config first
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/enhancement-config`)
        const { success, config } = await response.json()
        if (success && config?.sedream_enhancement_text) {
          enhancementText = config.sedream_enhancement_text
          console.log("[SeDream v4 Edit] Loaded sedream_enhancement_text:", enhancementText.substring(0, 100) + "...")
        }
      } catch (error) {
        console.warn("[SeDream v4 Edit] Could not load from API:", error)
      }
    }

    // Apply enhancement text directly to the prompt if available
    if (enhancementText && prompt.trim()) {
      finalPrompt = `${prompt}, ${enhancementText}`
      console.log("[SeDream v4 Edit] Enhanced prompt:", finalPrompt.substring(0, 100) + "...")
    } else if (!prompt.trim()) {
      console.log("[SeDream v4 Edit] No prompt provided, using enhancement text only")
      finalPrompt = enhancementText || ""
    } else {
      console.log("[SeDream v4 Edit] No enhancement text available, using original prompt")
    }

    console.log("[SeDream v4 Edit] Final prompt:", finalPrompt || "(no prompt)")

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
      console.log("[SeDream v4 Edit] Loaded negative prompts:", negativePrompts.length, "terms")
      console.log("[SeDream v4 Edit] NSFW protection terms:", config.enforced_negatives_nsfw?.length || 0)
      console.log("[SeDream v4 Edit] Age bias protection terms:", config.enforced_negatives_age?.length || 0)
      console.log("[SeDream v4 Edit] Human integrity protection terms:", config.enforced_negatives_human_integrity?.length || 0)
      
    } catch (error) {
      console.warn("[SeDream v4 Edit] Could not load negative prompts from config:", error)
      // Fallback to basic safety terms if config fails
      negativePrompts = [
        "naked", "nude", "sexual", "revealing", "inappropriate", "nsfw", "explicit",
        "younger", "child-like", "age regression", "juvenile appearance",
        "unrealistic proportions", "sexualized", "distorted anatomy"
      ]
      console.log("[SeDream v4 Edit] Using fallback negative prompts:", negativePrompts.length, "terms")
    }

    // Content moderation
    if (finalPrompt.trim()) {
      try {
        const moderationService = new ContentModerationService("freemium")
        const moderationResult = await moderationService.moderateContent({ prompt: finalPrompt })
        
        if (!moderationResult.safe) {
          console.log("[SeDream v4 Edit] Content flagged by moderation:", moderationResult.reason)
          return NextResponse.json({ 
            error: moderationResult.reason,
            category: moderationResult.category,
            blocked: true
          }, { status: 400 })
        }
      } catch (moderationError) {
        console.warn("[SeDream v4 Edit] Content moderation error:", moderationError)
        // Continue if moderation service fails
      }
    }

    // ============================================================================
    // PROCESS BASE64 IMAGE (if provided)
    // ============================================================================
    let finalImageUrl = imageUrl // Start with URL if provided
    let originalImageWidth: number | undefined = undefined
    let originalImageHeight: number | undefined = undefined
    
    if (base64Image && !finalImageUrl) {
      console.log('[SeDream v4 Edit] Processing Base64 image...')
      console.log('[SeDream v4 Edit] Base64 length:', base64Image.length)
      
      try {
        // Remove data:image/...;base64, prefix if present
        const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '')
        const imageBuffer = Buffer.from(base64Data, 'base64')
        
        console.log('[SeDream v4 Edit] Base64 decoded, buffer size:', imageBuffer.length)
        
        // Validate with Sharp (ensures it's a valid image)
        try {
          const metadata = await sharp(imageBuffer).metadata()
          console.log('[SeDream v4 Edit] Image validation - Format:', metadata.format, 'Size:', metadata.width, 'x', metadata.height)
          // Store original dimensions
          originalImageWidth = metadata.width
          originalImageHeight = metadata.height
        } catch (validationError) {
          console.error('[SeDream v4 Edit] Invalid image data:', validationError)
          return NextResponse.json({
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
          
          console.log('[SeDream v4 Edit] Image normalized - Original:', imageBuffer.length, 'Processed:', processedBuffer.length)
          
          // 2-step upload to fal.ai storage
          console.log('[SeDream v4 Edit] Initiating fal.ai storage upload...')
          
          const initResponse = await fetch('https://rest.alpha.fal.ai/storage/upload/initiate', {
            method: 'POST',
            headers: {
              'Authorization': `Key ${falApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              file_name: 'seedream-v4-edit-image.jpg',
              content_type: 'image/jpeg'
            })
          })

          if (!initResponse.ok) {
            const errorText = await initResponse.text()
            console.error('[SeDream v4 Edit] Storage initiate failed:', initResponse.status, errorText)
            throw new Error(`Storage initiate failed: ${initResponse.status} ${errorText}`)
          }

          const { upload_url, file_url } = await initResponse.json()
          console.log('[SeDream v4 Edit] Got presigned URL, uploading file...')

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
            console.error('[SeDream v4 Edit] File upload failed:', uploadResponse.status, errorText)
            throw new Error(`File upload failed: ${uploadResponse.status}`)
          }

          console.log('[SeDream v4 Edit] ✅ Base64 image uploaded successfully:', file_url)
          finalImageUrl = file_url

        } catch (sharpError: unknown) {
          const errorMessage = sharpError instanceof Error ? sharpError.message : 'Unknown Sharp error'
          console.error('[SeDream v4 Edit] Sharp processing failed:', errorMessage)
          return NextResponse.json({
            error: 'Image processing failed',
            details: errorMessage
          }, { status: 500 })
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error processing Base64'
        console.error('[SeDream v4 Edit] Base64 processing error:', errorMessage)
        return NextResponse.json({
          error: 'Failed to process Base64 image',
          details: errorMessage
        }, { status: 500 })
      }
    }

    // ============================================================================
    // UPLOAD FILE (if File object was provided)
    // ============================================================================
    if (imageFile && !finalImageUrl) {
      console.log("[SeDream v4 Edit] Uploading image file to fal.ai storage...")
      const imageBuffer = Buffer.from(await imageFile.arrayBuffer())
      console.log(`[SeDream v4 Edit] Image details: ${imageFile.name}, ${imageFile.size} bytes (${(imageFile.size / 1024 / 1024).toFixed(2)} MB), type: ${imageFile.type}`)
      
      // Get original dimensions using Sharp
      try {
        const metadata = await sharp(imageBuffer).metadata()
        originalImageWidth = metadata.width
        originalImageHeight = metadata.height
        console.log(`[SeDream v4 Edit] Original image dimensions: ${originalImageWidth}x${originalImageHeight}`)
      } catch (metadataError) {
        console.warn("[SeDream v4 Edit] Could not read image metadata:", metadataError)
      }
      
      // Check if image is too large for SeDream (limit: 2MB)
      const MAX_SIZE_BYTES = 2 * 1024 * 1024 // 2MB
      let finalImage: File = imageFile
      
      if (imageFile.size > MAX_SIZE_BYTES) {
        console.log(`[SeDream v4 Edit] Image size (${(imageFile.size / 1024 / 1024).toFixed(2)} MB) exceeds 2MB limit, compressing...`)
        
        try {
          // Compress to JPEG with 85% quality, resize if needed
          const compressedBuffer = await sharp(imageBuffer)
            .resize(2048, 2048, {
              fit: 'inside',
              withoutEnlargement: true
            })
            .jpeg({ quality: 85 })
            .toBuffer()
          
          console.log(`[SeDream v4 Edit] Compressed from ${(imageFile.size / 1024 / 1024).toFixed(2)} MB to ${(compressedBuffer.length / 1024 / 1024).toFixed(2)} MB`)
          
          // Create new File from compressed buffer via Blob
          const compressedBlob = new Blob([compressedBuffer as any], { type: 'image/jpeg' })
          finalImage = new File([compressedBlob], imageFile.name.replace(/\.[^.]+$/, '.jpg'), { 
            type: 'image/jpeg',
            lastModified: Date.now()
          })
          
        } catch (sharpError: unknown) {
          const errorMsg = sharpError instanceof Error ? sharpError.message : String(sharpError)
          console.warn(`[SeDream v4 Edit] Sharp compression failed: ${errorMsg}, using original image`)
        }
      }
      
      // Upload the (possibly compressed) image and get URL
      finalImageUrl = await fal.storage.upload(finalImage)
      console.log(`[SeDream v4 Edit] Image uploaded: ${finalImageUrl}`)
    }
    
    // Validate that we have a final image URL
    if (!finalImageUrl) {
      return NextResponse.json({
        error: "No image provided",
        details: "Please provide either an image file, image URL, or Base64 image for editing"
      }, { status: 400 })
    }

    console.log(`[SeDream v4 Edit] Using final image URL: ${finalImageUrl}`)

    console.log("[SeDream v4 Edit] Calling fal.ai API...")

    // Calculate image_size from aspect ratio selection
    let imageSize: string | { width: number; height: number } | undefined
    let imageDimensions: { width: number; height: number } | undefined
    
    if (aspectRatio === "original") {
      // Use original image dimensions if available
      if (originalImageWidth && originalImageHeight) {
        imageDimensions = { width: originalImageWidth, height: originalImageHeight }
        console.log("[SeDream v4 Edit] Using original image dimensions:", imageDimensions)
      } else {
        // Fallback to square_hd if original dimensions couldn't be detected
        console.warn("[SeDream v4 Edit] Original dimensions not available, falling back to square_hd")
        imageSize = "square_hd"
      }
    } else if (aspectRatio === "custom") {
      imageDimensions = { width: customWidth!, height: customHeight! }
      console.log("[SeDream v4 Edit] Using custom dimensions:", imageDimensions)
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
      console.log("[SeDream v4 Edit] Using preset aspect ratio:", imageSize)
    }

    // Reference image for style transfer
    const referenceImageUrl = "https://v3.fal.media/files/monkey/huuJHd0OJn7pBsJc37rh5_Reference.jpg"

    // Prepare input for SeDream v4 Edit (uses image_urls array with user image and reference)
    const negativePromptString = negativePrompts.join(", ")
    const input: any = {
      prompt: finalPrompt,
      negative_prompt: negativePromptString,
      image_urls: [finalImageUrl, referenceImageUrl],
      num_images: 1,
      enable_safety_checker: true
    }
    
    // Add image_size (string for presets, object for custom/original dimensions)
    if ((aspectRatio === "custom" || aspectRatio === "original") && imageDimensions) {
      input.image_size = {
        width: imageDimensions.width,
        height: imageDimensions.height
      }
    } else if (imageSize) {
      input.image_size = imageSize
    } else {
      // Fallback to square_hd if nothing else was set (should not happen in normal flow)
      input.image_size = "square_hd"
    }

    console.log("[SeDream v4 Edit] API Input:", {
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
    
    console.log("[SeDream v4 Edit] Full input object being sent to fal.ai:")
    console.log(JSON.stringify(input, null, 2))

    // Call SeDream v4 Edit API
    const result = await fal.subscribe("fal-ai/bytedance/seedream/v4/edit", {
      input,
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          console.log("[SeDream v4 Edit] Progress:", update.logs?.map(log => log.message).join(" ") || "Processing...")
        }
      }
    })

    console.log("[SeDream v4 Edit] API Response:", {
      hasData: !!result.data,
      hasImages: !!result.data?.images,
      imageCount: result.data?.images?.length || 0
    })

    // Validate response
    if (!result.data || !result.data.images || !Array.isArray(result.data.images) || result.data.images.length === 0) {
      console.error("[SeDream v4 Edit] Invalid response format:", result)
      return NextResponse.json({ 
        error: "Invalid response from SeDream API",
        details: "No images were generated"
      }, { status: 500 })
    }

    // Add disclaimer to the result image
    let resultImageUrl = result.data.images[0]?.url
    let originalImageUrl = resultImageUrl
    
    if (resultImageUrl) {
      try {
        console.log("[SeDream v4 Edit] Adding disclaimer to result image...")
        const imageWithDisclaimer = await addDisclaimerToImage(
          resultImageUrl,
          undefined,
          {
            removeExisting: false, // Input images don't have disclaimers
            preserveMethod: 'resize',
          }
        )
        
        console.log("[SeDream v4 Edit] Disclaimer added successfully")
        resultImageUrl = imageWithDisclaimer
        
      } catch (disclaimerError) {
        console.error("[SeDream v4 Edit] Error adding disclaimer:", disclaimerError)
        console.log("[SeDream v4 Edit] Returning original image without disclaimer")
        // Return original if disclaimer fails
      }
    }

    // Return the result
    return NextResponse.json({
      images: [{ url: resultImageUrl, width: result.data.images[0]?.width, height: result.data.images[0]?.height }],
      originalImageUrl, // Original without disclaimer for reference
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
      referenceUsed: referenceImageUrl,
      enhancementApplied: useJSONEnhancement
    })

  } catch (error: any) {
    console.error("[SeDream v4 Edit] API Error:", error)
    
    // Handle specific fal.ai errors
    if (error.message?.includes('ValidationError')) {
      return NextResponse.json({ 
        error: "Invalid input parameters",
        details: error.message
      }, { status: 400 })
    }
    
    if (error.status === 401) {
      return NextResponse.json({ 
        error: "Authentication failed",
        details: "Invalid or missing FAL_API_KEY"
      }, { status: 401 })
    }
    
    if (error.status === 429) {
      return NextResponse.json({ 
        error: "Rate limit exceeded",
        details: "Too many requests, please try again later"
      }, { status: 429 })
    }

    return NextResponse.json({ 
      error: "Internal server error",
      details: error.message || "Failed to process SeDream v4 edit request"
    }, { status: 500 })
  }
}