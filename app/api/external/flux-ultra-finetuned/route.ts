import { NextRequest, NextResponse } from 'next/server'
import { fal } from "@fal-ai/client"

/**
 * Content Moderation Helper
 */
async function moderateContent(content: string) {
  try {
    // Import the content moderation service
    const { ContentModerationService } = await import("@/lib/content-moderation")
    const moderationService = new ContentModerationService("general")
    const result = await moderationService.moderateContent({ prompt: content })
    
    return {
      allowed: result.safe,
      reason: result.reason
    }
  } catch (error) {
    console.warn("[External Flux Ultra] Moderation failed, allowing content:", error)
    return { allowed: true, reason: null }
  }
}

/**
 * Handle moderation errors with user-friendly messages
 */
function handleModerationError(errorData: any): string {
  if (!errorData?.error) return "Could not generate image. Please try with different content."
  
  const errorMessage = errorData.error.toLowerCase()
  
  // Check for specific moderation reasons
  if (errorMessage.includes('explicit') || errorMessage.includes('sexual') || errorMessage.includes('nude')) {
    return "This content contains explicit material that is not permitted. Try descriptions like 'professionals in meeting' or 'natural landscape'."
  }
  
  if (errorMessage.includes('violence') || errorMessage.includes('weapon') || errorMessage.includes('violent')) {
    return "This content includes violent elements that are not permitted. Try descriptions like 'peaceful demonstration' or 'community event'."
  }
  
  if (errorMessage.includes('public figure') || errorMessage.includes('celebrity') || errorMessage.includes('politician')) {
    return "We cannot generate images of public figures or celebrities. Describe generic people like 'community leader' or 'organizational spokesperson'."
  }
  
  if (errorMessage.includes('fake news') || errorMessage.includes('misinformation') || errorMessage.includes('false')) {
    return "This content could include misinformation. Make sure to describe accurate and truthful information for your organization."
  }
  
  if (errorMessage.includes('inappropriate language') || errorMessage.includes('offensive')) {
    return "The language used is not appropriate. Rephrase your description in a more professional and constructive manner."
  }
  
  if (errorMessage.includes('blocked by content moderation')) {
    return "This content does not comply with our usage policies. Try descriptions appropriate like 'educational campaign' or 'informational material'."
  }
  
  // Generic moderation message
  return "This content is not permitted according to our policies. Try descriptions appropriate for professional organizational use."
}

/**
 * POST /api/external/flux-ultra-finetuned
 * 
 * External API endpoint for text-to-image generation using Flux Ultra v1.1 Finetuned.
 * This endpoint provides professional-grade image generation with custom fine-tuned models
 * and safety-focused configuration without requiring authentication.
 * 
 * Body parameters:
 * - prompt (required): Text description for image generation
 * - finetuneId (optional): Fine-tune model ID for custom styling (default: "a4bd761c-0f90-41cc-be78-c7b6cf22285a")
 * - triggerPhrase (optional): Trigger phrase for the fine-tuned model (default: "TCT-AI-8")
 * - finetuneStrength (optional): Fine-tune strength (0.1-2.0, default: 1.0)
 * - settings (optional): Advanced generation settings
 * 
 * Advanced settings include:
 * - aspect_ratio: Image dimensions (1:1, 4:3, 3:4, 16:9, 9:16, 21:9, default: 1:1)
 * - num_images: Number of images to generate (1-4, default: 1)
 * - safety_tolerance: Content safety level (1-3, default: 1 - most strict)
 * - output_format: Image format (jpg, png, webp, default: jpg)
 * - enable_safety_checker: Whether to enable safety checking (default: true)
 * - seed: Random seed for reproducible results
 * 
 * Response format:
 * - success: boolean indicating if generation was successful
 * - image: Generated image URL (if successful)
 * - width/height: Image dimensions
 * - finalPrompt: The final prompt used (with trigger phrase)
 * - error: Error message (if failed)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required parameters - only prompt is required now
    if (!body.prompt || typeof body.prompt !== 'string' || !body.prompt.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing or invalid 'prompt' parameter",
          details: "Prompt must be a non-empty string"
        },
        { status: 400 }
      )
    }

    // Extract parameters with defaults
    const {
      prompt,
      finetuneId = "a4bd761c-0f90-41cc-be78-c7b6cf22285a", // Default fine-tune ID
      triggerPhrase = "TCT-AI-8", // Default trigger phrase
      finetuneStrength = 1.0, // Default strength 1.0
      settings = {}
    } = body

    // Construct final prompt with trigger phrase at the beginning (same as internal API)
    const finalPrompt = `${triggerPhrase.trim()}, ${prompt.trim()}`

    console.log("[External Flux Ultra] Processing request:")
    console.log("  - Original prompt:", prompt.trim())
    console.log("  - Trigger phrase:", triggerPhrase.trim())
    console.log("  - Final prompt:", finalPrompt)
    console.log("  - Fine-tune ID:", finetuneId.trim())
    console.log("  - Fine-tune Strength:", finetuneStrength)

    // Apply content moderation early
    const moderationResult = await moderateContent(finalPrompt)
    if (!moderationResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: handleModerationError({ error: moderationResult.reason }),
          moderation: true
        },
        { status: 400 }
      )
    }

    // Check if Fal.ai API key is available
    const falApiKey = process.env.FAL_API_KEY
    if (!falApiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Service temporarily unavailable",
          details: "FAL_API_KEY not configured"
        },
        { status: 500 }
      )
    }

    // Configure Fal.ai client
    fal.config({
      credentials: falApiKey,
    })

    // Prepare default settings for Flux Ultra Finetuned (updated defaults)
    const defaultSettings = {
      aspect_ratio: "1:1",
      num_images: 1,
      safety_tolerance: 1, // Most strict by default
      output_format: "jpg", // Changed to jpg as requested
      enable_safety_checker: true,
      seed: undefined
    }
    
    const mergedSettings = { ...defaultSettings, ...settings }

    // Validate and clamp settings
    if (mergedSettings.safety_tolerance) {
      mergedSettings.safety_tolerance = Math.max(1, Math.min(3, parseInt(mergedSettings.safety_tolerance.toString())))
    }
    
    if (mergedSettings.num_images) {
      mergedSettings.num_images = Math.max(1, Math.min(4, parseInt(mergedSettings.num_images.toString())))
    }

    const clampedFinetuneStrength = Math.max(0.1, Math.min(2.0, parseFloat(finetuneStrength.toString())))

    // Prepare input for Flux Ultra Finetuned (same structure as internal API)
    const input: any = {
      prompt: finalPrompt,
      finetune_id: finetuneId.trim(),
      finetune_strength: clampedFinetuneStrength,
      aspect_ratio: mergedSettings.aspect_ratio,
      num_images: mergedSettings.num_images,
      safety_tolerance: mergedSettings.safety_tolerance,
      output_format: mergedSettings.output_format,
      enable_safety_checker: mergedSettings.enable_safety_checker
    }

    // Add seed if provided
    if (mergedSettings.seed !== undefined && mergedSettings.seed !== null && mergedSettings.seed !== "") {
      input.seed = parseInt(mergedSettings.seed.toString())
    }

    console.log("[External Flux Ultra] Final input object being sent to fal.ai:")
    console.log("=====================================")
    console.log("Model: fal-ai/flux-pro/v1.1-ultra-finetuned")
    console.log("Input:", JSON.stringify(input, null, 2))
    console.log("=====================================")

    try {
      console.log("[External Flux Ultra] Starting image generation with Flux Ultra Finetuned...")
      const result = await fal.subscribe("fal-ai/flux-pro/v1.1-ultra-finetuned", {
        input,
        logs: true,
        onQueueUpdate: (update: any) => {
          if (update.status === "IN_PROGRESS") {
            update.logs.map((log: any) => log.message).forEach(console.log)
          }
        },
      })

      console.log("[External Flux Ultra] Image generation completed successfully!")
      console.log("[External Flux Ultra] Result data structure:")
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
        const generatedImage = result.data.images[0]
        
        return NextResponse.json({
          success: true,
          image: generatedImage.url,
          width: generatedImage.width,
          height: generatedImage.height,
          content_type: generatedImage.content_type || "image/jpeg",
          finalPrompt: finalPrompt,
          originalPrompt: prompt.trim(),
          triggerPhrase: triggerPhrase.trim(),
          finetuneId: finetuneId.trim(),
          finetuneStrength: clampedFinetuneStrength,
          settings: mergedSettings,
          model: "flux-pro/v1.1-ultra-finetuned",
          timestamp: new Date().toISOString()
        })
      } else {
        throw new Error("No image returned from Flux Ultra Finetuned")
      }
    } catch (falError: any) {
      console.error("[External Flux Ultra] Direct Fal.ai call failed:", falError)
      console.error("[External Flux Ultra] Error details:", {
        message: falError?.message,
        status: falError?.status,
        body: falError?.body,
        stack: falError?.stack
      })
      
      // If it's a validation error, log the exact input that caused it
      if (falError?.status === 422) {
        console.error("[External Flux Ultra] Validation error - Input that caused the error:")
        console.error("Final prompt:", finalPrompt)
        console.error("Fine-tune config:", { finetuneId: finetuneId.trim(), finetuneStrength: clampedFinetuneStrength })
        console.error("Merged settings:", JSON.stringify(mergedSettings, null, 2))
      }
      
      // Fallback to internal API call
      console.log("[External Flux Ultra] Falling back to internal API...")
      
      try {
        const fallbackFormData = new FormData()
        fallbackFormData.append("prompt", prompt.trim())
        fallbackFormData.append("finetuneId", finetuneId.trim())
        fallbackFormData.append("finetuneStrength", clampedFinetuneStrength.toString())
        fallbackFormData.append("triggerPhrase", triggerPhrase.trim())
        fallbackFormData.append("settings", JSON.stringify(mergedSettings))
        fallbackFormData.append("orgType", "general")

        const fallbackResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/flux-ultra-finetuned`, {
          method: "POST",
          body: fallbackFormData,
        })

        if (!fallbackResponse.ok) {
          const fallbackError = await fallbackResponse.json().catch(() => null)
          throw new Error(fallbackError?.error || `Fallback API error (${fallbackResponse.status})`)
        }

        const fallbackResult = await fallbackResponse.json()
        console.log("[External Flux Ultra] Fallback successful!")
        
        return NextResponse.json({
          success: true,
          image: fallbackResult.image,
          width: fallbackResult.width,
          height: fallbackResult.height,
          content_type: fallbackResult.content_type,
          finalPrompt: fallbackResult.finalPrompt,
          originalPrompt: fallbackResult.originalPrompt,
          triggerPhrase: fallbackResult.triggerPhrase,
          finetuneId: fallbackResult.finetuneId,
          finetuneStrength: fallbackResult.finetuneStrength,
          settings: fallbackResult.settings,
          model: fallbackResult.model,
          timestamp: fallbackResult.timestamp,
          fallback: true
        })
      } catch (fallbackError) {
        console.error("[External Flux Ultra] Fallback also failed:", fallbackError)
        
        return NextResponse.json(
          {
            success: false,
            error: "Failed to generate image with Flux Ultra Finetuned",
            details: falError?.message || "Unknown error",
            model: "flux-pro/v1.1-ultra-finetuned"
          },
          { status: 500 }
        )
      }
    }

  } catch (error) {
    console.error("[External Flux Ultra] Request processing error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Invalid request format",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 400 }
    )
  }
}

/**
 * GET /api/external/flux-ultra-finetuned
 * 
 * Returns API documentation and available parameters
 */
export async function GET() {
  return NextResponse.json({
    name: "Flux Ultra Finetuned External API",
    version: "1.0.0",
    description: "Generate high-quality images using Flux Ultra v1.1 with custom fine-tuned models",
    model: "fal-ai/flux-pro/v1.1-ultra-finetuned",
    endpoint: "/api/external/flux-ultra-finetuned",
    method: "POST",
    authentication: "None required",
    rateLimit: "None",
    parameters: {
      required: {
        prompt: {
          type: "string",
          description: "Text description for image generation",
          example: "a beautiful landscape with mountains and lakes"
        }
      },
      optional: {
        finetuneId: {
          type: "string",
          description: "Fine-tune model ID for custom styling",
          default: "a4bd761c-0f90-41cc-be78-c7b6cf22285a",
          example: "a4bd761c-0f90-41cc-be78-c7b6cf22285a"
        },
        triggerPhrase: {
          type: "string",
          description: "Trigger phrase for the fine-tuned model",
          default: "TCT-AI-8",
          example: "TCT-AI-8"
        },
        finetuneStrength: {
          type: "number",
          description: "Fine-tune strength (0.1-2.0)",
          default: 1.0,
          range: "0.1 to 2.0"
        },
        settings: {
          type: "object",
          description: "Advanced generation settings",
          properties: {
            aspect_ratio: {
              type: "string",
              description: "Image dimensions",
              default: "1:1",
              options: ["1:1", "4:3", "3:4", "16:9", "9:16", "21:9"]
            },
            num_images: {
              type: "integer",
              description: "Number of images to generate",
              default: 1,
              range: "1 to 4"
            },
            safety_tolerance: {
              type: "integer",
              description: "Content safety level (1=most strict, 3=least strict)",
              default: 1,
              range: "1 to 3"
            },
            output_format: {
              type: "string",
              description: "Image format",
              default: "jpg",
              options: ["jpg", "png", "webp"]
            },
            enable_safety_checker: {
              type: "boolean",
              description: "Whether to enable safety checking",
              default: true
            },
            seed: {
              type: "integer",
              description: "Random seed for reproducible results",
              default: null
            }
          }
        }
      }
    },
    response: {
      success: {
        success: true,
        image: "string (URL)",
        width: "number",
        height: "number",
        content_type: "string",
        finalPrompt: "string",
        originalPrompt: "string",
        triggerPhrase: "string",
        finetuneId: "string",
        finetuneStrength: "number",
        settings: "object",
        model: "string",
        timestamp: "string (ISO)"
      },
      error: {
        success: false,
        error: "string",
        details: "string"
      }
    },
    examples: {
      basicRequest: {
        prompt: "a professional team meeting in a modern office"
      },
      customModelRequest: {
        prompt: "a sustainable city with green buildings and clean energy",
        finetuneId: "my-custom-model-id",
        triggerPhrase: "MY-CUSTOM-TRIGGER"
      },
      advancedRequest: {
        prompt: "a beautiful landscape with mountains and lakes",
        finetuneStrength: 1.2,
        settings: {
          aspect_ratio: "16:9",
          num_images: 2,
          safety_tolerance: 1,
          output_format: "png",
          seed: 12345
        }
      }
    }
  })
}
