import { NextRequest, NextResponse } from 'next/server'
import { fal } from "@fal-ai/client"

/**
 * POST /api/external/flux-pro-text-to-image
 * 
 * External API endpoint for text-to-image generation using Flux Pro model.
 * This endpoint provides professional-grade image generation with advanced settings
 * and LoRA support without requiring authentication.
 * 
 * Body parameters:
 * - prompt (required): Text description for image generation
 * - useRAG (optional): Whether to enhance prompt with branding guidelines (default: true)
 * - useLoRA (optional): Whether to apply custom LoRA styling (default: false)
 * - loraUrl (optional): Custom LoRA URL to use
 * - loraTriggerPhrase (optional): Trigger phrase for the LoRA
 * - loraScale (optional): LoRA strength scale (0.1-2.0, default: 1.0)
 * - settings (optional): Advanced generation settings
 * 
 * Advanced settings include:
 * - image_size: Image dimensions (landscape_4_3, square_hd, portrait_4_3, etc.)
 * - num_inference_steps: Generation quality steps (1-50, default: 30)
 * - guidance_scale: Prompt adherence (1-20, default: 3.5)
 * - num_images: Number of images to generate (1-4, default: 1)
 * - seed: Random seed for reproducible results
 * - safety_tolerance: Content safety level (1-6, default: 2)
 * - output_format: Image format (webp, jpg, png, default: jpg)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required parameters
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
      useRAG = true,
      useLoRA = false,
      loraUrl = "",
      loraTriggerPhrase = "",
      loraScale = 1.0,
      settings = {}
    } = body

    // Apply content moderation early
    const moderationResult = await moderateContent(prompt)
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

    // Enhance prompt with LoRA trigger phrase if enabled
    let finalPrompt = prompt.trim()
    
    // Use provided LoRA configuration or default
    const loraConfig = {
      url: loraUrl || "https://v3.fal.media/files/kangaroo/bUQL-AZq6ctnB1gifw2ku_pytorch_lora_weights.safetensors",
      triggerPhrase: loraTriggerPhrase || "", // Can be empty
      scale: Math.max(0.1, Math.min(2.0, loraScale)) // Clamp between 0.1 and 2.0
    }
    
    if (useLoRA && loraConfig.triggerPhrase) {
      finalPrompt = `${finalPrompt}, ${loraConfig.triggerPhrase}`
    }

    // Prepare advanced settings for Flux Pro
    const defaultSettings = {
      image_size: "landscape_4_3",
      num_inference_steps: 30,
      guidance_scale: 3.5,
      num_images: 1,
      safety_tolerance: 2,
      output_format: "jpg",
      seed: undefined
    }
    
    const mergedSettings = { ...defaultSettings, ...settings }
    
    // Add LoRA configuration if enabled
    if (useLoRA && loraConfig.url) {
      mergedSettings.loras = [{
        path: loraConfig.url,
        scale: loraConfig.scale
      }]
    }
    
    // Validate and clean settings
    Object.keys(mergedSettings).forEach(key => {
      const value = mergedSettings[key]
      if (value === "" || value === null || value === undefined) {
        delete mergedSettings[key]
      }
    })
    
    // Convert and validate numeric parameters
    if (mergedSettings.num_inference_steps) {
      mergedSettings.num_inference_steps = Math.max(1, Math.min(50, parseInt(mergedSettings.num_inference_steps as string)))
    }
    if (mergedSettings.guidance_scale) {
      mergedSettings.guidance_scale = Math.max(1, Math.min(20, parseFloat(mergedSettings.guidance_scale as string)))
    }
    if (mergedSettings.num_images) {
      mergedSettings.num_images = Math.max(1, Math.min(4, parseInt(mergedSettings.num_images as string)))
    }
    if (mergedSettings.safety_tolerance) {
      mergedSettings.safety_tolerance = Math.max(1, Math.min(6, parseInt(mergedSettings.safety_tolerance as string)))
    }
    if (mergedSettings.seed) {
      mergedSettings.seed = parseInt(mergedSettings.seed as string)
    }

    // Direct call to Fal.ai Flux Pro
    try {
      // Configure Fal.ai client
      const falApiKey = process.env.FAL_API_KEY
      if (!falApiKey) {
        throw new Error("FAL_API_KEY not configured")
      }

      fal.config({
        credentials: falApiKey,
      })

      // Prepare input for Flux Pro
      const input: any = {
        prompt: finalPrompt,
        image_size: mergedSettings.image_size,
        num_inference_steps: mergedSettings.num_inference_steps,
        guidance_scale: mergedSettings.guidance_scale,
        num_images: mergedSettings.num_images,
        safety_tolerance: mergedSettings.safety_tolerance,
        output_format: mergedSettings.output_format,
        loras: mergedSettings.loras || []
      }

      // Add seed if provided
      if (mergedSettings.seed !== undefined) {
        input.seed = mergedSettings.seed
      }

      console.log("[External Flux Pro] Generating with input:", {
        prompt: finalPrompt,
        image_size: input.image_size,
        num_inference_steps: input.num_inference_steps,
        guidance_scale: input.guidance_scale,
        num_images: input.num_images,
        safety_tolerance: input.safety_tolerance,
        output_format: input.output_format,
        loras_count: input.loras.length,
        seed: input.seed
      })

      const result = await fal.subscribe("fal-ai/flux-pro/kontext/max/text-to-image", {
        input,
        logs: true,
        onQueueUpdate: (update: any) => {
          if (update.status === "IN_PROGRESS") {
            update.logs.map((log: any) => log.message).forEach(console.log)
          }
        },
      })

      console.log("[External Flux Pro] Fal.ai result:", result)

      if (result.data && result.data.images && result.data.images.length > 0) {
        const images = result.data.images.map((img: any) => ({
          url: img.url,
          width: img.width,
          height: img.height,
          content_type: img.content_type
        }))

        // Format response for external API with URLs
        const externalResponse = {
          success: true,
          image: images[0].url,
          images: images,
          prompt: {
            original: prompt,
            final: finalPrompt,
            enhanced: useRAG,
            lora_applied: useLoRA,
            lora_config: useLoRA ? {
              url: loraConfig.url,
              trigger_phrase: loraConfig.triggerPhrase,
              scale: loraConfig.scale
            } : null
          },
          settings: mergedSettings,
          model: "flux-pro/kontext/max",
          timestamp: new Date().toISOString()
        }

        return NextResponse.json(externalResponse)
      } else {
        throw new Error("No images returned from Flux Pro")
      }
    } catch (falError) {
      console.error("[External Flux Pro] Direct Fal.ai call failed:", falError)
      
      // Fallback to internal API call
      console.log("[External Flux Pro] Falling back to internal API...")
      
      try {
        const formData = new FormData()
        formData.append("prompt", finalPrompt)
        formData.append("useRag", useRAG.toString())
        
        // Add RAG information if available
        if (useRAG) {
          // TODO: Read from actual app state when available
          // formData.append("activeRAGId", activeRAG?.id)
          // formData.append("activeRAGName", activeRAG?.name)
        }
        
        // Add LoRA information
        if (useLoRA) {
          formData.append("useLoRA", "true")
          formData.append("loraUrl", loraConfig.url)
          formData.append("loraTriggerPhrase", loraConfig.triggerPhrase)
          formData.append("loraScale", loraConfig.scale.toString())
        }
        
        formData.append("settings", JSON.stringify(mergedSettings))
        formData.append("orgType", "general")

        const response = await fetch(`${getBaseUrl()}/api/flux-pro-text-to-image`, {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => null)
          throw new Error(errorData?.error || `HTTP ${response.status}`)
        }

        const result = await response.json()
        
        // Extract the URL from the result
        let imageUrl = null;
        let images = [];
        
        if (result.images && result.images.length > 0) {
          imageUrl = result.images[0].url;
          images = result.images;
        } else if (result.image) {
          if (result.image.startsWith('data:')) {
            if (result.images && result.images.length > 0) {
              imageUrl = result.images[0].url;
              images = result.images;
            } else {
              imageUrl = result.image;
              images = [{ url: result.image }];
            }
          } else {
            imageUrl = result.image;
            images = [{ url: result.image }];
          }
        }
        
        // Format response for external API
        const externalResponse = {
          success: true,
          image: imageUrl,
          images: images,
          prompt: {
            original: prompt,
            final: result.finalPrompt || finalPrompt,
            enhanced: useRAG,
            lora_applied: useLoRA,
            lora_config: useLoRA ? {
              url: loraConfig.url,
              trigger_phrase: loraConfig.triggerPhrase,
              scale: loraConfig.scale
            } : null
          },
          settings: mergedSettings,
          model: "flux-pro/kontext/max",
          timestamp: new Date().toISOString()
        }

        return NextResponse.json(externalResponse)
      } catch (fallbackError) {
        console.error("[External Flux Pro] Fallback also failed:", fallbackError)
        throw fallbackError
      }
    }

  } catch (error) {
    console.error('[External Flux Pro API] Error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
        model: "flux-pro/kontext/max"
      },
      { status: 500 }
    )
  }
}

/**
 * OPTIONS /api/external/flux-pro-text-to-image
 * 
 * CORS preflight support
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

// Helper functions

function getBaseUrl(): string {
  // Get the base URL for internal API calls
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}

async function moderateContent(text: string): Promise<{ allowed: boolean; reason?: string }> {
  // Basic content moderation - can be enhanced with external services
  const text_lower = text.toLowerCase()
  
  // Check for explicit content
  const explicitTerms = ['explicit', 'sexual', 'nude', 'naked']
  if (explicitTerms.some(term => text_lower.includes(term))) {
    return { allowed: false, reason: 'explicit content detected' }
  }
  
  // Check for violence
  const violentTerms = ['violence', 'violent', 'weapon', 'kill', 'murder']
  if (violentTerms.some(term => text_lower.includes(term))) {
    return { allowed: false, reason: 'violent content detected' }
  }
  
  // Allow by default
  return { allowed: true }
}

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
