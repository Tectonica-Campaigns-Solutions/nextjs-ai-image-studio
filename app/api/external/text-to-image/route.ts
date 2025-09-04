import { NextRequest, NextResponse } from 'next/server'
import { fal } from "@fal-ai/client"

/**
 * POST /api/external/text-to-image
 * 
 * External API endpoint for text-to-image generation using Qwen model.
 * This endpoint replicates the functionality of the main app's text-to-image
 * feature but without requiring authentication.
 * 
 * Body parameters:
 * - prompt (required): Text description for image generation
 * - useRAG (optional): Whether to enhance prompt with branding guidelines (default: true)
 * - useLoRA (optional): Whether to apply custom LoRA styling (default: false)
 * - settings (optional): Advanced generation settings
 * 
 * The endpoint automatically reads RAG and LoRA configuration from the main app state.
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

    // Prepare form data for internal API call
    const formData = new FormData()
    
    // Enhance prompt with LoRA trigger phrase if enabled
    let finalPrompt = prompt.trim()
    
    // Read LoRA configuration from app state (hardcoded for now, will be dynamic)
    const loraConfig = {
      url: "https://v3.fal.media/files/zebra/xfGohqkcp1ulBXtjat3OS_adapter.safetensors",
      triggerPhrase: "", // Will be read from app state
      scale: 1.0
    }
    
    if (useLoRA && loraConfig.triggerPhrase) {
      finalPrompt = `${finalPrompt}, ${loraConfig.triggerPhrase}`
    }
    
    formData.append("prompt", finalPrompt)
    formData.append("useRag", useRAG.toString())
    
    // Add RAG information (will be dynamic when app state is accessible)
    if (useRAG) {
      // TODO: Read from actual app state
      // const activeRAG = getActiveRAG()
      // if (activeRAG) {
      //   formData.append("activeRAGId", activeRAG.id)
      //   formData.append("activeRAGName", activeRAG.name)
      // }
    }
    
    // Prepare advanced settings
    const defaultSettings = {
      image_size: "landscape_4_3",
      num_inference_steps: 30,
      guidance_scale: 2.5,
      num_images: 1,
      output_format: "png",
      negative_prompt: "",
      acceleration: "none",
      enable_safety_checker: true,
      sync_mode: false
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
    
    // Convert string numbers to actual numbers
    if (mergedSettings.width) mergedSettings.width = parseInt(mergedSettings.width as string)
    if (mergedSettings.height) mergedSettings.height = parseInt(mergedSettings.height as string)
    if (mergedSettings.seed) mergedSettings.seed = parseInt(mergedSettings.seed as string)
    
    formData.append("settings", JSON.stringify(mergedSettings))
    formData.append("orgType", "general")

    // For external API, make direct call to Fal.ai to get URLs instead of base64
    try {
      // Configure Fal.ai client
      const falApiKey = process.env.FAL_API_KEY
      if (!falApiKey) {
        throw new Error("FAL_API_KEY not configured")
      }

      fal.config({
        credentials: falApiKey,
      })

      // Prepare input for Qwen-Image
      const input: any = {
        prompt: finalPrompt,
        image_size: mergedSettings.image_size || "landscape_4_3",
        num_inference_steps: mergedSettings.num_inference_steps || 30,
        seed: mergedSettings.seed || undefined,
        guidance_scale: mergedSettings.guidance_scale || 2.5,
        sync_mode: mergedSettings.sync_mode || false,
        num_images: mergedSettings.num_images || 1,
        enable_safety_checker: mergedSettings.enable_safety_checker !== false,
        output_format: mergedSettings.output_format || "png",
        negative_prompt: mergedSettings.negative_prompt || "",
        acceleration: mergedSettings.acceleration || "none",
        loras: mergedSettings.loras || []
      }

      // Handle custom image size
      if (mergedSettings.width && mergedSettings.height) {
        input.image_size = {
          width: mergedSettings.width,
          height: mergedSettings.height
        }
      }

      const result = await fal.subscribe("fal-ai/qwen-image", {
        input,
        logs: true,
        onQueueUpdate: (update: any) => {
          if (update.status === "IN_PROGRESS") {
            update.logs.map((log: any) => log.message).forEach(console.log)
          }
        },
      })

      console.log("[External Text-to-Image] Fal.ai result:", result)

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
            lora_applied: useLoRA
          },
          settings: mergedSettings,
          timestamp: new Date().toISOString()
        }

        return NextResponse.json(externalResponse)
      } else {
        throw new Error("No images returned from Fal.ai")
      }
    } catch (falError) {
      console.error("[External Text-to-Image] Direct Fal.ai call failed:", falError)
      
      // Fallback to internal API call
      console.log("[External Text-to-Image] Falling back to internal API...")
    }

    // Fallback: Make internal API call
    const response = await fetch(`${getBaseUrl()}/api/qwen-text-to-image`, {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      if (response.status === 400 && errorData?.error) {
        // Use the same moderation error handling as the main app
        const friendlyMessage = handleModerationError(errorData)
        return NextResponse.json(
          {
            success: false,
            error: friendlyMessage,
            moderation: true
          },
          { status: 400 }
        )
      }
      
      return NextResponse.json(
        {
          success: false,
          error: `Generation failed (${response.status})`,
          details: errorData?.error || "Server error"
        },
        { status: response.status }
      )
    }

    const result = await response.json()
    
    // Extract the URL from the result - handle both single image and multiple images formats
    let imageUrl = null;
    let images = [];
    
    if (result.images && result.images.length > 0) {
      // Multiple images format - use the first image URL
      imageUrl = result.images[0].url;
      images = result.images;
    } else if (result.image) {
      // Single image format - extract URL from base64 or use direct URL
      if (result.image.startsWith('data:')) {
        // If it's base64, we need to get the original URL from images array
        if (result.images && result.images.length > 0) {
          imageUrl = result.images[0].url;
          images = result.images;
        } else {
          // Fallback - keep the base64 data
          imageUrl = result.image;
          images = [{ url: result.image }];
        }
      } else {
        // Direct URL
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
        final: result.finalPrompt || result.prompt || finalPrompt,
        enhanced: useRAG,
        lora_applied: useLoRA
      },
      settings: mergedSettings,
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(externalResponse)

  } catch (error) {
    console.error('[External Text-to-Image API] Error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}

/**
 * OPTIONS /api/external/text-to-image
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
