import { type NextRequest, NextResponse } from "next/server"
import { fal } from "@fal-ai/client"
import { ContentModerationService } from "@/lib/content-moderation"
import { canonicalPromptProcessor, type CanonicalPromptConfig } from "@/lib/canonical-prompt"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const prompt = formData.get("prompt") as string
    const settingsJson = formData.get("settings") as string
    const useRag = formData.get("useRag") === "true"
    const activeRAGId = formData.get("activeRAGId") as string
    const activeRAGName = formData.get("activeRAGName") as string
    const orgType = formData.get("orgType") as string || "general" // Organization type for moderation
    
    // JSON Enhancement parameters
    const useJSONEnhancement = formData.get("useJSONEnhancement") === "true"
    const jsonOptionsStr = formData.get("jsonOptions") as string
    let jsonOptions: any = {}
    if (jsonOptionsStr) {
      try {
        jsonOptions = JSON.parse(jsonOptionsStr)
      } catch (error) {
        console.warn("[FLUX-COMBINE] Failed to parse JSON options:", error)
      }
    }

    // Canonical Prompt parameters
    const useCanonicalPrompt = formData.get("useCanonicalPrompt") === "true"
    const canonicalConfigStr = formData.get("canonicalConfig") as string
    let canonicalConfig: CanonicalPromptConfig = {}
    if (canonicalConfigStr) {
      try {
        canonicalConfig = JSON.parse(canonicalConfigStr)
      } catch (error) {
        console.warn("[FLUX-COMBINE] Failed to parse canonical config:", error)
      }
    }

    // Set default values for jsonOptions if not provided
    const defaultJsonOptions = {
      intensity: 1.0, // Default intensity at 100% for Combine Images
      customText: '', // Will use enhancement_text if empty
      ...jsonOptions
    }

    // Extract multiple image files
    const imageFiles: File[] = []
    const imageUrls: string[] = []
    const base64Images: string[] = []
    
    // Get all files with 'image' prefix from form data
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('image') && value instanceof File) {
        imageFiles.push(value)
        console.log(`[FLUX-COMBINE] Found image file: ${key}, size: ${value.size}, type: ${value.type}`)
      } else if (key.startsWith('imageUrl') && typeof value === 'string' && value.trim()) {
        imageUrls.push(value.trim())
        console.log(`[FLUX-COMBINE] Found image URL: ${key}, url: ${value}`)
      } else if (key.startsWith('imageBase64') && typeof value === 'string' && value.trim()) {
        base64Images.push(value.trim())
        console.log(`[FLUX-COMBINE] Found base64 image: ${key}, length: ${value.length}`)
      }
    }

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    if (imageFiles.length === 0 && imageUrls.length === 0 && base64Images.length === 0) {
      return NextResponse.json({ 
        error: "At least one image is required for combination" 
      }, { status: 400 })
    }

    // Validate exactly 2 images for enhanced pipeline
    const totalImages = imageFiles.length + imageUrls.length + base64Images.length
    if (totalImages !== 2) {
      return NextResponse.json({ 
        error: "Enhanced pipeline requires exactly 2 images",
        details: `Found ${imageFiles.length} files, ${imageUrls.length} URLs, and ${base64Images.length} base64 images (total: ${totalImages}). The enhanced pipeline processes image2 with seedream-v4-edit, then combines image1 with the processed result.`
      }, { status: 400 })
    }

    console.log("[FLUX-COMBINE] Image combination endpoint called")
    console.log("[FLUX-COMBINE] Original prompt:", prompt)
    console.log("[FLUX-COMBINE] Image files count:", imageFiles.length)
    console.log("[FLUX-COMBINE] Image URLs count:", imageUrls.length)
    console.log("[FLUX-COMBINE] Base64 images count:", base64Images.length)
    console.log("[FLUX-COMBINE] Total images:", imageFiles.length + imageUrls.length + base64Images.length)
    console.log("[FLUX-COMBINE] Use JSON Enhancement:", useJSONEnhancement)
    console.log("[FLUX-COMBINE] Use Canonical Prompt:", useCanonicalPrompt)
    console.log("[FLUX-COMBINE] JSON Options:", defaultJsonOptions)
    console.log("[FLUX-COMBINE] JSON Options:", jsonOptions)
    console.log("[FLUX-COMBINE] Canonical Config:", canonicalConfig)
    console.log("[FLUX-COMBINE] RAG enhancement: disabled for image combination")
    console.log("[FLUX-COMBINE] Settings JSON:", settingsJson)

    // Content moderation check
    try {
      console.log("[MODERATION] Checking content for Flux Combine prompt:", prompt.substring(0, 50) + "...")
      const moderationService = new ContentModerationService(orgType)
      const moderationResult = await moderationService.moderateContent({ prompt })
      
      if (!moderationResult.safe) {
        console.log("[MODERATION] Content blocked:", moderationResult.reason)
        return NextResponse.json({ 
          error: moderationResult.reason,
          category: moderationResult.category,
          blocked: true
        }, { status: 400 })
      }
      console.log("[MODERATION] Content approved")
    } catch (moderationError) {
      console.warn("[MODERATION] Moderation check failed, proceeding with generation:", moderationError)
      // Continue with generation if moderation fails to avoid blocking users
    }

    // Check if Fal.ai API key is available
    const falApiKey = process.env.FAL_API_KEY
    if (!falApiKey) {
      return NextResponse.json({ error: "FAL_API_KEY not configured" }, { status: 500 })
    }

    // Parse settings
    let settings: any = {}
    if (settingsJson) {
      try {
        settings = JSON.parse(settingsJson)
        console.log("[FLUX-COMBINE] Parsed settings:", settings)
      } catch (error) {
        console.warn("[FLUX-COMBINE] Failed to parse settings:", error)
      }
    }

    // RAG enhancement is now disabled for image combination
    // Original prompt will be used as-is
    let finalPrompt = prompt
    let ragMetadata = null

    // Check if canonical prompt should be used
    if (useCanonicalPrompt) {
      // Use canonical prompt processor
      console.log("[FLUX-COMBINE] Using canonical prompt structure")
      console.log("[FLUX-COMBINE] Canonical config:", canonicalConfig)
      
      // Set user input from original prompt
      canonicalConfig.userInput = prompt
      
      // Generate canonical prompt
      const result = canonicalPromptProcessor.generateCanonicalPrompt(canonicalConfig)
      finalPrompt = result.canonicalPrompt
      
      console.log("[FLUX-COMBINE] Generated canonical prompt:", finalPrompt)
      console.log("[FLUX-COMBINE] Processed user input:", result.processedUserInput)
    } else if (useJSONEnhancement) {
      // Apply JSON enhancement with enhancement_text (only if explicitly enabled)
      let enhancementText = defaultJsonOptions.customText
      
      if (!enhancementText) {
        // Try to load from config first
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/enhancement-config`)
          const { success, config } = await response.json()
          if (success && config?.enhancement_text) {
            enhancementText = config.enhancement_text
            console.log("[FLUX-COMBINE] Loaded enhancement_text:", enhancementText)
          }
        } catch (error) {
          console.warn("[FLUX-COMBINE] Could not load from API:", error)
        }
      }

      // Apply enhancement text directly to the prompt if available
      if (enhancementText) {
        finalPrompt = `${prompt}, ${enhancementText}`
        console.log("[FLUX-COMBINE] Enhanced prompt (JSON):", finalPrompt)
      } else {
        console.log("[FLUX-COMBINE] No enhancement text available, using original prompt")
      }
    } else {
      // No enhancement - use original prompt
      console.log("[FLUX-COMBINE] Using original prompt without enhancement")
    }

    console.log("[FLUX-COMBINE] Final prompt:", finalPrompt)

    // Configure Fal.ai client
    fal.config({
      credentials: falApiKey,
    })

    // ENHANCED PIPELINE IMPLEMENTATION
    // First, collect all image URLs (from direct URLs and uploads)
    const allImageUrls: string[] = [...imageUrls]
    
    // Process base64 images - convert to File and upload
    if (base64Images.length > 0) {
      console.log("[FLUX-COMBINE] Processing base64 images...")
      for (let i = 0; i < base64Images.length; i++) {
        const base64Data = base64Images[i]
        try {
          console.log(`[FLUX-COMBINE] Processing base64 image ${i + 1}/${base64Images.length}`)
          
          // Extract base64 data and mime type
          let base64String = base64Data
          let mimeType = 'image/jpeg' // default
          
          // Check if it has data URL prefix (data:image/jpeg;base64,...)
          if (base64Data.startsWith('data:')) {
            const matches = base64Data.match(/^data:([^;]+);base64,(.+)$/)
            if (matches) {
              mimeType = matches[1]
              base64String = matches[2]
              console.log(`[FLUX-COMBINE] Detected MIME type from data URL: ${mimeType}`)
            } else {
              console.warn(`[FLUX-COMBINE] Invalid data URL format, using raw data`)
              // Try to extract base64 part after comma
              const commaIndex = base64Data.indexOf(',')
              if (commaIndex !== -1) {
                base64String = base64Data.substring(commaIndex + 1)
              }
            }
          }
          
          // Validate base64 format
          if (!/^[A-Za-z0-9+/=]+$/.test(base64String)) {
            throw new Error(`Invalid base64 format for image ${i + 1}`)
          }
          
          // Convert base64 to buffer
          const imageBuffer = Buffer.from(base64String, 'base64')
          
          // Validate buffer size
          if (imageBuffer.length === 0) {
            throw new Error(`Empty image buffer for base64 image ${i + 1}`)
          }
          
          // Check size limit (10MB)
          const maxSize = 10 * 1024 * 1024
          if (imageBuffer.length > maxSize) {
            throw new Error(`Base64 image ${i + 1} is too large: ${(imageBuffer.length / 1024 / 1024).toFixed(2)}MB (max: 10MB)`)
          }
          
          console.log(`[FLUX-COMBINE] Base64 image ${i + 1} size: ${(imageBuffer.length / 1024).toFixed(2)}KB`)
          
          // Convert to Blob
          const blob = new Blob([imageBuffer], { type: mimeType })
          
          // Convert to File
          const file = new File([blob], `base64-image-${i + 1}.${mimeType.split('/')[1] || 'jpg'}`, { type: mimeType })
          
          // Upload to fal.ai storage
          console.log(`[FLUX-COMBINE] Uploading base64 image ${i + 1} to fal.ai storage...`)
          const uploadedUrl = await fal.storage.upload(file)
          allImageUrls.push(uploadedUrl)
          console.log(`[FLUX-COMBINE] Base64 image ${i + 1} uploaded successfully: ${uploadedUrl}`)
          
        } catch (base64Error) {
          console.error(`[FLUX-COMBINE] Failed to process base64 image ${i + 1}:`, base64Error)
          return NextResponse.json({ 
            error: `Failed to process base64 image ${i + 1}`,
            details: base64Error instanceof Error ? base64Error.message : 'Unknown error'
          }, { status: 400 })
        }
      }
    }
    
    if (imageFiles.length > 0) {
      console.log("[FLUX-COMBINE] Uploading image files to fal.ai storage...")
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i]
        try {
          console.log(`[FLUX-COMBINE] Uploading image ${i + 1}/${imageFiles.length}: ${file.name} (${file.size} bytes)`)
          const uploadedUrl = await fal.storage.upload(file)
          allImageUrls.push(uploadedUrl)
          console.log(`[FLUX-COMBINE] Image ${i + 1} uploaded successfully: ${uploadedUrl}`)
        } catch (uploadError) {
          console.error(`[FLUX-COMBINE] Failed to upload image ${i + 1}:`, uploadError)
          return NextResponse.json({ 
            error: `Failed to upload image ${i + 1}: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}` 
          }, { status: 500 })
        }
      }
    }

    console.log("[FLUX-COMBINE] All image URLs ready:", allImageUrls)
    console.log("[FLUX-COMBINE] Starting enhanced pipeline: seedream → combine")

    // ENHANCED PIPELINE: Step 1 - Process image2 (second image) with seedream-v4-edit
    console.log("[FLUX-COMBINE] Pipeline Step 1: Processing image2 with seedream-v4-edit")
    
    const image1Url = allImageUrls[0] // First image (remains unchanged)
    const image2Url = allImageUrls[1] // Second image (will be processed with seedream)
    
    console.log("[FLUX-COMBINE] Image1 (unchanged):", image1Url)
    console.log("[FLUX-COMBINE] Image2 (to be processed):", image2Url)

    let processedImage2Url: string
    let sedreamPrompt: string // Declare sedream prompt variable
    
    try {
      // Get sedream enhancement text from configuration
      const { getSedreamEnhancementText } = await import("@/lib/json-enhancement")
      sedreamPrompt = await getSedreamEnhancementText() || ""
      
      if (!sedreamPrompt) {
        console.error("[FLUX-COMBINE] No sedream_enhancement_text configured")
        return NextResponse.json({
          error: "Configuration error",
          details: "No SeDream enhancement text configured for image processing pipeline"
        }, { status: 500 })
      }

      console.log("[FLUX-COMBINE] Using sedream prompt:", sedreamPrompt.substring(0, 100) + "...")

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
      seedreamFormData.append("prompt", sedreamPrompt) // Use configured sedream prompt, NOT user prompt
      seedreamFormData.append("useJSONEnhancement", "false") // Use prompt as-is
      seedreamFormData.append("customEnhancementText", sedreamPrompt)
      seedreamFormData.append("aspect_ratio", settings?.aspect_ratio || "1:1")

      console.log("[FLUX-COMBINE] Calling seedream-v4-edit API...")
      
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
      console.log("[FLUX-COMBINE] ✅ SeDream processing complete:", processedImage2Url)
      
    } catch (seedreamError) {
      console.error("[FLUX-COMBINE] Pipeline Step 1 failed:", seedreamError)
      return NextResponse.json({
        error: "Pipeline step 1 failed",
        details: `SeDream processing failed: ${seedreamError instanceof Error ? seedreamError.message : 'Unknown error'}`,
        step: "seedream-v4-edit",
        failedImage: image2Url
      }, { status: 500 })
    }

    // ENHANCED PIPELINE: Step 2 - Combine image1 with processed image2
    console.log("[FLUX-COMBINE] Pipeline Step 2: Combining images with flux-pro-image-combine")
    console.log("[FLUX-COMBINE] Final combination:")
    console.log("  - Image1 (original):", image1Url)
    console.log("  - Image2 (processed):", processedImage2Url)
    console.log("  - User prompt:", finalPrompt)

    // Update image URLs for final combination (use processed image2)
    const uploadedImageUrls = [image1Url, processedImage2Url]

    // Prepare default settings for Flux Pro Combine
    const defaultSettings = {
      aspect_ratio: "1:1",
      guidance_scale: 3.5,
      num_images: 1, // Single combined image output
      safety_tolerance: 2,
      output_format: "jpeg",
      // seed removed - let each generation be unique
      enhance_prompt: false
    }

    const mergedSettings = { ...defaultSettings, ...settings }

    // Prepare input for Flux Pro Multi with image combination
    const input: any = {
      prompt: finalPrompt,
      image_urls: uploadedImageUrls, // Array of image URLs as expected by the model
      aspect_ratio: mergedSettings.aspect_ratio,
      guidance_scale: mergedSettings.guidance_scale,
      num_images: mergedSettings.num_images,
      safety_tolerance: mergedSettings.safety_tolerance,
      output_format: mergedSettings.output_format,
      enhance_prompt: mergedSettings.enhance_prompt
    }

    // Add seed if provided and not empty
    if (mergedSettings.seed !== undefined && mergedSettings.seed !== "" && mergedSettings.seed !== null) {
      input.seed = parseInt(mergedSettings.seed.toString())
    }

    // Validate required parameters
    if (!uploadedImageUrls || uploadedImageUrls.length < 2) {
      console.error("[FLUX-COMBINE] Invalid image URLs:", uploadedImageUrls)
      return NextResponse.json({ 
        error: "At least 2 images are required for combination" 
      }, { status: 400 })
    }

    if (!finalPrompt || finalPrompt.trim() === "") {
      console.error("[FLUX-COMBINE] Empty prompt")
      return NextResponse.json({ 
        error: "Prompt is required" 
      }, { status: 400 })
    }

    console.log("[FLUX-COMBINE] Final input object being sent to fal.ai:")
    console.log("=====================================")
    console.log("Model: fal-ai/flux-pro/kontext/max/multi")
    console.log("Input images count:", uploadedImageUrls.length)
    console.log("Image URLs:", uploadedImageUrls)
    console.log("Input:", JSON.stringify({
      ...input,
      image_urls: `[${uploadedImageUrls.length} URLs: ${uploadedImageUrls.map(url => url.substring(0, 50) + '...').join(', ')}]`
    }, null, 2))
    console.log("=====================================")

    try {
      console.log("[FLUX-COMBINE] Starting image combination with Flux Pro Kontext Max Multi...")
      const result = await fal.subscribe("fal-ai/flux-pro/kontext/max/multi", {
        input,
        logs: true,
        onQueueUpdate: (update: any) => {
          if (update.status === "IN_PROGRESS") {
            update.logs.map((log: any) => log.message).forEach(console.log)
          }
        },
      })

      console.log("[FLUX-COMBINE] Image combination completed successfully!")
      console.log("[FLUX-COMBINE] Result data structure:")
      console.log("  - data exists:", !!result.data)
      console.log("  - images exists:", !!result.data?.images)
      console.log("  - images length:", result.data?.images?.length || 0)
      
      if (result.data?.images?.[0]) {
        console.log("  - first image URL:", result.data.images[0].url)
        console.log("  - first image dimensions:", {
          width: result.data.images[0].width,
          height: result.data.images[0].height
        })
      }

      if (result.data && result.data.images && result.data.images.length > 0) {
        const combinedImage = result.data.images[0] // Single combined result
        
        return NextResponse.json({
          success: true,
          image: combinedImage.url,
          width: combinedImage.width,
          height: combinedImage.height,
          content_type: combinedImage.content_type || "image/jpeg",
          prompt: finalPrompt,
          originalPrompt: prompt,
          inputImages: 2, // Always 2 for enhanced pipeline
          ragMetadata: ragMetadata,
          jsonEnhancementUsed: useJSONEnhancement,
          jsonOptions: useJSONEnhancement ? jsonOptions : undefined,
          settings: mergedSettings,
          model: "flux-pro/kontext/max/multi",
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
              operation: "flux-pro-image-combine",
              inputImages: uploadedImageUrls,
              outputImage: combinedImage.url,
              prompt: finalPrompt
            }
          ]
        })
      } else {
        throw new Error("No combined image returned from Flux Pro Multi")
      }
    } catch (falError) {
      console.error("[FLUX-COMBINE] Fal.ai error:", falError)
      
      // Enhanced error logging for debugging
      if (falError && typeof falError === 'object') {
        console.error("[FLUX-COMBINE] Error details:")
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
        console.error("[FLUX-COMBINE] Input that caused error:")
        console.error(JSON.stringify(input, null, 2))
      }
      
      // Return more detailed error information
      let errorMessage = "Failed to combine images with Flux Pro Multi"
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
              console.error("[FLUX-COMBINE] Problematic URLs:", firstError.input)
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
        model: "flux-pro/kontext/max/multi",
        status: (falError as any)?.status,
        validationError: (falError as any)?.status === 422,
        fileDownloadError: (falError as any)?.body?.detail?.[0]?.type === 'file_download_error',
        inputParameters: Object.keys(input),
        problematicUrls: (falError as any)?.body?.detail?.[0]?.input,
        errorBody: (falError as any)?.body
      }, { status: 500 })
    }

  } catch (error) {
    console.error("[FLUX-COMBINE] Error:", error)
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
