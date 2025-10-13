import { NextRequest, NextResponse } from "next/server"
import { fal } from "@fal-ai/client"
import { ContentModerationService } from "@/lib/content-moderation"

/**
 * SeDream v4 Edit API Endpoint
 * 
 * Uses fal-ai/bytedance/seedream/v4/edit to transform images with style transfer
 * 
 * Request body (FormData):
 * - image: File (required) - The input image to be transformed
 * - prompt: string (optional) - Additional prompt for style guidance
 * - useJSONEnhancement: boolean (optional) - Whether to apply JSON enhancement to prompt
 * - jsonIntensity: number (optional) - JSON enhancement intensity (0.1-1.0)
 * - customEnhancementText: string (optional) - Custom enhancement text
 * 
 * The endpoint automatically uses a reference image for style transfer:
 * https://v3.fal.media/files/monkey/huuJHd0OJn7pBsJc37rh5_Reference.jpg
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
    
    const formData = await request.formData()
    const image = formData.get("image") as File
    const prompt = (formData.get("prompt") as string) || ""
    const useJSONEnhancement = formData.get("useJSONEnhancement") === "true"
    const jsonIntensity = parseFloat(formData.get("jsonIntensity") as string) || 1.0
    const customEnhancementText = (formData.get("customEnhancementText") as string) || ""
    const aspectRatio = (formData.get("aspect_ratio") as string) || "1:1"
    
    // Debug logging for aspect_ratio
    console.log("[SeDream v4 Edit] Raw FormData entries:")
    for (const [key, value] of formData.entries()) {
      if (key !== "image") {
        console.log(`  ${key}: "${value}"`)
      }
    }
    console.log("[SeDream v4 Edit] Extracted aspect_ratio:", aspectRatio)
    
    // Validate aspect_ratio parameter
    const validAspectRatios = ["1:1", "16:9", "9:16", "4:3", "3:4"]
    if (!validAspectRatios.includes(aspectRatio)) {
      console.error("[SeDream v4 Edit] Invalid aspect_ratio received:", aspectRatio)
      return NextResponse.json({ 
        error: "Invalid aspect_ratio parameter",
        details: `aspect_ratio must be one of: ${validAspectRatios.join(', ')}. Received: ${aspectRatio}`
      }, { status: 400 })
    }
    
    // Parse JSON options from frontend
    const jsonOptionsStr = formData.get("jsonOptions") as string
    let jsonOptions: any = {}
    if (jsonOptionsStr) {
      try {
        jsonOptions = JSON.parse(jsonOptionsStr)
      } catch (error) {
        console.warn("[SeDream v4 Edit] Failed to parse JSON options:", error)
      }
    }

    // Set default values for jsonOptions if not provided
    const defaultJsonOptions = {
      intensity: jsonIntensity,
      customText: jsonOptions.customText || '',
      ...jsonOptions
    }

    console.log("[SeDream v4 Edit] Request parameters:", {
      hasImage: !!image,
      prompt: prompt || "(empty)",
      useJSONEnhancement,
      jsonIntensity,
      hasCustomText: !!customEnhancementText,
      aspectRatio
    })

    // Validate required parameters
    if (!image) {
      return NextResponse.json({ 
        error: "Missing required image parameter",
        details: "An image file is required for SeDream v4 edit"
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

    // Upload image to fal.ai storage first
    console.log("[SeDream v4 Edit] Uploading image to fal.ai storage...")
    const imageBuffer = Buffer.from(await image.arrayBuffer())
    
    // Upload the image and get URL
    const imageUrl = await fal.storage.upload(image)

    // Reference image URL (fixed, invisible to user)
    const referenceImageUrl = "https://v3.fal.media/files/monkey/huuJHd0OJn7pBsJc37rh5_Reference.jpg"

    console.log("[SeDream v4 Edit] Calling fal.ai API...")

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

    console.log("[SeDream v4 Edit] API Input:", {
      prompt: input.prompt,
      negativePrompt: `${negativePromptString.substring(0, 100)}...`,
      negativePromptTerms: negativePrompts.length,
      imageUrls: input.image_urls,
      numImages: input.num_images,
      aspectRatio: aspectRatio,
      imageSize: input.image_size,
      imageBufferSize: `${imageBuffer.length} bytes`
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

    // Return the result
    return NextResponse.json({
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