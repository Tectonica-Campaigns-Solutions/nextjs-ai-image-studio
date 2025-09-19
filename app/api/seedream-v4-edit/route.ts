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

    console.log("[SeDream v4 Edit] Request parameters:", {
      hasImage: !!image,
      prompt: prompt || "(empty)",
      useJSONEnhancement,
      jsonIntensity,
      hasCustomText: !!customEnhancementText
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

    // Use the prompt if provided (already enhanced by frontend), otherwise use customEnhancementText
    let finalPrompt = prompt.trim() || customEnhancementText.trim()
    
    // Only apply JSON Enhancement if no prompt provided (fallback case)
    if (!prompt.trim() && useJSONEnhancement && customEnhancementText.trim()) {
      try {
        const { enhancePromptWithJSON } = await import("@/lib/json-enhancement")
        
        console.log("[SeDream v4 Edit] No enhanced prompt provided, applying JSON enhancement to custom text...")
        
        const enhancementResult = await enhancePromptWithJSON(
          customEnhancementText,
          { 
            intensity: jsonIntensity,
            enhancementType: 'sedream'
          }
        )
        
        if (enhancementResult && enhancementResult.enhancedPrompt) {
          finalPrompt = enhancementResult.enhancedPrompt
          console.log("[SeDream v4 Edit] Enhancement applied successfully")
        } else {
          console.warn("[SeDream v4 Edit] Enhancement failed, using original custom text")
          finalPrompt = customEnhancementText.trim()
        }
      } catch (enhancementError) {
        console.error("[SeDream v4 Edit] Enhancement error:", enhancementError)
        finalPrompt = customEnhancementText.trim()
      }
    } else if (prompt.trim()) {
      console.log("[SeDream v4 Edit] Using enhanced prompt from frontend")
    }

    console.log("[SeDream v4 Edit] Final prompt:", finalPrompt || "(no prompt)")

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

    // Prepare input for SeDream v4 Edit (uses image_urls array, not single image)
    const input = {
      prompt: finalPrompt,
      image_urls: [imageUrl, referenceImageUrl],
      num_images: 1,
      enable_safety_checker: true
    }

    console.log("[SeDream v4 Edit] API Input:", {
      prompt: input.prompt,
      imageUrls: input.image_urls,
      numImages: input.num_images,
      imageSize: `${imageBuffer.length} bytes`
    })

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