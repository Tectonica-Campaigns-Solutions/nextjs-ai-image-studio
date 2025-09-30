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
    
    // JSON Enhancement parameters - always enabled by default
    const useJSONEnhancement = true // Always enabled for consistent enhancement
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
    
    // Get all files with 'image' prefix from form data
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('image') && value instanceof File) {
        imageFiles.push(value)
        console.log(`[FLUX-COMBINE] Found image file: ${key}, size: ${value.size}, type: ${value.type}`)
      } else if (key.startsWith('imageUrl') && typeof value === 'string' && value.trim()) {
        imageUrls.push(value.trim())
        console.log(`[FLUX-COMBINE] Found image URL: ${key}, url: ${value}`)
      }
    }

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    if (imageFiles.length === 0 && imageUrls.length === 0) {
      return NextResponse.json({ 
        error: "At least one image is required for combination" 
      }, { status: 400 })
    }

    if (imageFiles.length + imageUrls.length < 2) {
      return NextResponse.json({ 
        error: "At least 2 images are required for combination" 
      }, { status: 400 })
    }

    console.log("[FLUX-COMBINE] Image combination endpoint called")
    console.log("[FLUX-COMBINE] Original prompt:", prompt)
    console.log("[FLUX-COMBINE] Image files count:", imageFiles.length)
    console.log("[FLUX-COMBINE] Image URLs count:", imageUrls.length)
    console.log("[FLUX-COMBINE] Total images:", imageFiles.length + imageUrls.length)
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
    } else {
      // Apply JSON enhancement with enhancement_text (legacy method)
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
        console.log("[FLUX-COMBINE] Enhanced prompt (legacy):", finalPrompt)
      } else {
        console.log("[FLUX-COMBINE] No enhancement text available, using original prompt")
      }
    }

    console.log("[FLUX-COMBINE] Final prompt:", finalPrompt)

    // Configure Fal.ai client
    fal.config({
      credentials: falApiKey,
    })

    // Upload image files to fal.ai storage if any
    const uploadedImageUrls: string[] = []
    
    // First, add existing image URLs and test their accessibility
    for (let i = 0; i < imageUrls.length; i++) {
      const url = imageUrls[i]
      try {
        console.log(`[FLUX-COMBINE] Testing existing URL ${i + 1}: ${url.substring(0, 100)}...`)
        const response = await fetch(url, { method: 'HEAD' })
        if (response.ok) {
          uploadedImageUrls.push(url)
          console.log(`[FLUX-COMBINE] URL ${i + 1} is accessible, using directly`)
        } else {
          console.warn(`[FLUX-COMBINE] URL ${i + 1} not directly accessible (${response.status}), will re-upload through fal.ai`)
          // Download and re-upload through fal.ai
          const imageResponse = await fetch(url)
          if (imageResponse.ok) {
            const imageBlob = await imageResponse.blob()
            const reuploadedUrl = await fal.storage.upload(imageBlob)
            uploadedImageUrls.push(reuploadedUrl)
            console.log(`[FLUX-COMBINE] URL ${i + 1} re-uploaded successfully: ${reuploadedUrl}`)
          } else {
            throw new Error(`Cannot download image from URL: ${response.status}`)
          }
        }
      } catch (urlError) {
        console.error(`[FLUX-COMBINE] Failed to process URL ${i + 1}:`, urlError)
        return NextResponse.json({ 
          error: `Failed to process image URL ${i + 1}`,
          details: urlError instanceof Error ? urlError.message : "Network error",
          problematicUrl: url
        }, { status: 400 })
      }
    }
    
    if (imageFiles.length > 0) {
      console.log("[FLUX-COMBINE] Uploading image files to fal.ai storage...")
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i]
        try {
          console.log(`[FLUX-COMBINE] Uploading image ${i + 1}/${imageFiles.length}: ${file.name} (${file.size} bytes)`)
          const uploadedUrl = await fal.storage.upload(file)
          uploadedImageUrls.push(uploadedUrl)
          console.log(`[FLUX-COMBINE] Image ${i + 1} uploaded successfully: ${uploadedUrl}`)
        } catch (uploadError) {
          console.error(`[FLUX-COMBINE] Failed to upload image ${i + 1}:`, uploadError)
          return NextResponse.json({ 
            error: `Failed to upload image ${i + 1}: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}` 
          }, { status: 500 })
        }
      }
    }

    console.log("[FLUX-COMBINE] All image URLs ready:", uploadedImageUrls)

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
          inputImages: uploadedImageUrls.length,
          ragMetadata: ragMetadata,
          jsonEnhancementUsed: useJSONEnhancement,
          jsonOptions: useJSONEnhancement ? jsonOptions : undefined,
          settings: mergedSettings,
          model: "flux-pro/kontext/max/multi",
          timestamp: new Date().toISOString()
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
