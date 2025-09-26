import { NextRequest, NextResponse } from 'next/server'
import { fal } from "@fal-ai/client"

/**
 * POST /api/external/flux-pro-text-to-image
 * 
 * External API endpoint for text-to-image generation using Flux Pro mode    } catch (falError: any) {
      console.error("[External Flux LoRA] Direct Fal.ai call failed:", falError)
      console.error("[External Flux LoRA] Error details:", {
        message: falError?.message,
        status: falError?.status,
        body: falError?.body,
        stack: falError?.stack
      })
      
      // If it's a validation error, log the exact input that caused it
      if (falError?.status === 422) {
        console.error("[External Flux LoRA] Validation error - Input that caused the error:")
        console.error("Final prompt:", finalPrompt)
        console.error("LoRA config:", loraConfig)
        console.error("Merged settings:", JSON.stringify(mergedSettings, null, 2))
      }
      
      // Fallback to internal API call
      console.log("[External Flux LoRA] Falling back to internal API...")t provides professional-grade image generation with advanced settings
 * and LoRA support without requiring authentication.
 * 
 * Body parameters:
 * - prompt (required): Text description for image generation
 * - useRAG (optional): Whether to enhance prompt with branding guidelines (default: false)
 * - useLoRA (optional): Whether to apply custom LoRA styling (default: true)
 * - useJSONEnhancement (optional): Whether to apply JSON-based prompt enhancement (default: true)
 * - jsonOptions (optional): JSON enhancement configuration
 *   - customText: Custom enhancement description (if not provided, uses defaults)
 *   - intensity: Enhancement intensity (0.1-1.0, default: 0.8)
 * - loraUrl (optional): Custom LoRA URL to use (default: Tectonica LoRA)
 * - loraTriggerPhrase (optional): Trigger phrase for the LoRA (default: "TCT-AI-9-9-2025A")
 * - loraScale (optional): LoRA strength scale (0.1-2.0, default: 1.3)
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
      useRAG = false, // JSON-only by default
      useLoRA = true, // LoRA enabled by default as requested
      useJSONEnhancement = true, // JSON enhancement enabled by default
      jsonOptions = {},
      loraUrl = "",
      loraTriggerPhrase = "",
      loraScale = 1.3,
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
    
    // Apply JSON enhancement if enabled (before adding trigger phrase)
    if (useJSONEnhancement) {
      try {
        // Import the hybrid enhancement system
        const { enhancePromptHybrid } = await import("@/lib/hybrid-enhancement")
        
        const hybridOptions = {
          useRAG: false, // RAG disabled for external API
          useJSONEnhancement: true,
          jsonOptions: {
            useDefaults: !jsonOptions.customText,
            customText: jsonOptions.customText,
            intensity: jsonOptions.intensity || 0.8
          }
        }

        const enhancementResult = await enhancePromptHybrid(prompt, hybridOptions)
        finalPrompt = enhancementResult.enhancedPrompt
        
        console.log("[External Flux LoRA] Enhanced prompt with JSON:", finalPrompt.substring(0, 100) + "...")
      } catch (error) {
        console.warn("[External Flux LoRA] JSON enhancement failed, using original prompt:", error)
        finalPrompt = prompt.trim()
      }
    } else {
      console.log("[External Flux LoRA] Using original prompt without JSON enhancement")
    }
    
    // Use provided LoRA configuration or defaults (same as internal API)
    const loraConfig = {
      url: loraUrl || "https://v3.fal.media/files/elephant/YOSyiUVvNDHBF-V3pLTM1_pytorch_lora_weights.safetensors", // Default LoRA from internal API
      triggerPhrase: loraTriggerPhrase || "MDF-9-9-2025B", // Default trigger phrase from internal API
      scale: Math.max(0.1, Math.min(2.0, loraScale)) // Clamp between 0.1 and 2.0
    }
    
    // Add trigger phrase if LoRA is enabled (at the beginning of the prompt)
    if (useLoRA && loraConfig.triggerPhrase) {
      finalPrompt = `${loraConfig.triggerPhrase}, ${finalPrompt}`
    }

    // Prepare advanced settings for Flux LoRA
    const defaultSettings = {
      image_size: "landscape_4_3",
      num_inference_steps: 30,
      guidance_scale: 3.5,
      num_images: 1,
      enable_safety_checker: true,
      output_format: "png",
      seed: 1234 // Default seed for consistent results
    }
    
    const mergedSettings = { ...defaultSettings, ...settings }
    
    // Add LoRA configuration if enabled (same logic as internal API)
    if (useLoRA && loraConfig.url) {
      mergedSettings.loras = [{
        path: loraConfig.url,
        scale: loraConfig.scale
      }]
      console.log("[External Flux LoRA] LoRA configured:", mergedSettings.loras[0])
    } else {
      console.log("[External Flux LoRA] LoRA disabled or no URL provided")
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
    if (mergedSettings.enable_safety_checker !== undefined) {
      mergedSettings.enable_safety_checker = Boolean(mergedSettings.enable_safety_checker)
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

      // Prepare input for Flux LoRA
      const input: any = {
        prompt: finalPrompt,
        image_size: mergedSettings.image_size,
        num_inference_steps: mergedSettings.num_inference_steps,
        guidance_scale: mergedSettings.guidance_scale,
        num_images: mergedSettings.num_images,
        enable_safety_checker: mergedSettings.enable_safety_checker,
        output_format: mergedSettings.output_format
      }

      // Only add LoRAs if they are properly configured
      if (mergedSettings.loras && mergedSettings.loras.length > 0) {
        input.loras = mergedSettings.loras
        console.log("[External Flux LoRA] ✅ LoRAs will be applied:", input.loras)
      } else {
        console.log("[External Flux LoRA] ⚠️ No LoRAs configured - using base model")
      }

      // Add seed if provided
      if (mergedSettings.seed !== undefined) {
        input.seed = mergedSettings.seed
      }

      console.log("[External Flux LoRA] Generating with input:")
      console.log("=====================================")
      console.log("Model: fal-ai/flux-lora")
      console.log("Enhanced Strategy:")
      console.log("  1. RAG Enhancement:", useRAG ? "✅ Applied" : "❌ Skipped")
      console.log("  2. JSON Enhancement:", useJSONEnhancement ? "✅ Applied" : "❌ Skipped")
      console.log("  3. LoRA Integration:", useLoRA ? "✅ Applied" : "❌ Skipped")
      console.log("  4. Original prompt:", prompt.substring(0, 100) + "...")
      console.log("  5. Final prompt:", finalPrompt.substring(0, 100) + "...")
      console.log("Prompt structure: [trigger phrase] + [user prompt] + [enhancement text]")
      console.log("LoRA enabled:", useLoRA)
      console.log("LoRA config:", loraConfig)
      console.log("JSON Enhancement enabled:", useJSONEnhancement)
      console.log("JSON Options:", jsonOptions)
      console.log("Input object:", JSON.stringify(input, null, 2))
      console.log("=====================================")

      const result = await fal.subscribe("fal-ai/flux-lora", {
        input,
        logs: true,
        onQueueUpdate: (update: any) => {
          if (update.status === "IN_PROGRESS") {
            update.logs.map((log: any) => log.message).forEach(console.log)
          }
        },
      })

      console.log("[External Flux LoRA] Fal.ai result:", result)

      // Check if LoRAs were actually applied
      if (input.loras && input.loras.length > 0) {
        console.log("[External Flux LoRA] ✅ LoRAs were sent to the model:")
        input.loras.forEach((lora: any, index: number) => {
          console.log(`  LoRA ${index + 1}: ${lora.path} (scale: ${lora.scale})`)
        })
      } else {
        console.log("[External Flux LoRA] ⚠️ No LoRAs were applied to this generation")
      }

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
            json_enhanced: useJSONEnhancement,
            json_options: useJSONEnhancement ? jsonOptions : undefined,
            lora_applied: useLoRA,
            lora_config: useLoRA ? {
              url: loraConfig.url,
              trigger_phrase: loraConfig.triggerPhrase,
              scale: loraConfig.scale
            } : null
          },
          settings: mergedSettings,
          model: "flux-lora",
          timestamp: new Date().toISOString()
        }

        return NextResponse.json(externalResponse)
      } else {
        throw new Error("No images returned from Flux LoRA")
      }
    } catch (falError: any) {
      console.error("[External Flux LoRA] Direct Fal.ai call failed:", falError)
      console.error("[External Flux LoRA] Error details:", {
        message: falError?.message,
        status: falError?.status,
        body: falError?.body,
        stack: falError?.stack
      })
      
      // If it's a validation error, log the exact input that caused it
      if (falError?.status === 422) {
        console.error("[External Flux LoRA] Validation error - Input that caused the error:")
        console.error("Final prompt:", finalPrompt)
        console.error("LoRA config:", loraConfig)
        console.error("Merged settings:", JSON.stringify(mergedSettings, null, 2))
      }
      
      // Fallback to internal API call
      console.log("[External Flux LoRA] Falling back to internal API...")
      
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
            json_enhanced: useJSONEnhancement,
            json_options: useJSONEnhancement ? jsonOptions : undefined,
            lora_applied: useLoRA,
            lora_config: useLoRA ? {
              url: loraConfig.url,
              trigger_phrase: loraConfig.triggerPhrase,
              scale: loraConfig.scale
            } : null
          },
          settings: mergedSettings,
          model: "flux-lora",
          timestamp: new Date().toISOString()
        }

        return NextResponse.json(externalResponse)
      } catch (fallbackError) {
        console.error("[External Flux LoRA] Fallback also failed:", fallbackError)
        throw fallbackError
      }
    }

  } catch (error) {
    console.error('[External Flux LoRA API] Error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
        model: "flux-lora"
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
