import { NextRequest, NextResponse } from 'next/server'
import { fal } from "@fal-ai/client"
import { ContentModerationService } from "@/lib/content-moderation"
import { url } from 'inspector'

/**
 * POST /api/external/image-to-image
 * 
 * External API endpoint for image-to-image transformation using qwen-image model.
 * This endpoint replicates the functionality of the main app's image-to-image
 * feature but without requiring authentication.
 * 
 * Body parameters (multipart/form-data):
 * - image (required): Source image file to transform (PNG, JPG, JPEG, WEBP)
 * - prompt (required): Description of the desired transformation
 * - useRAG (optional): Whether to enhance prompt with branding guidelines (default: true)
 * - useLoRA (optional): Whether to apply custom LoRA styling (default: false)
 * - settings (optional): JSON string with advanced settings
 * 
 * The endpoint automatically reads RAG and LoRA configuration from the main app state.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    
    // Extract and validate required parameters
    const image = formData.get('image') as File
    const prompt = formData.get('prompt') as string
    const useRAG = formData.get('useRAG') === 'true' // default false (JSON-only)
    const activeRAGId = formData.get('activeRAGId') as string
    const activeRAGName = formData.get('activeRAGName') as string
    const useLoRA = formData.get('useLoRA') !== 'false' // default true
    const settingsString = formData.get('settings') as string

    if (!image || !prompt) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required parameters: 'image' and 'prompt'",
          details: "Please provide both an image file and a transformation prompt"
        },
        { status: 400 }
      )
    }

    // Validate image file
    if (!image.type.startsWith('image/')) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid file type",
          details: "Please upload a valid image file (PNG, JPG, JPEG, WEBP)"
        },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    if (image.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        {
          success: false,
          error: "File too large",
          details: "Image file must be smaller than 10MB"
        },
        { status: 413 }
      )
    }

    // Content moderation check
    try {
      const moderationService = new ContentModerationService("general")
      const moderationResult = await moderationService.moderateContent({ prompt })
      
      if (!moderationResult.safe) {
        return NextResponse.json(
          {
            success: false,
            error: moderationResult.reason,
            category: moderationResult.category,
            moderation: true
          },
          { status: 400 }
        )
      }
    } catch (moderationError) {
      console.warn("[External Image-to-Image] Moderation check failed, proceeding:", moderationError)
    }

    // Prepare form data for internal API call
    const internalFormData = new FormData()
    
    // Enhance prompt with LoRA trigger phrase if enabled
    let finalPrompt = prompt.trim()
    
    // Read LoRA configuration from app state (hardcoded for now, will be dynamic)
    const loraConfig = {
      // url: "https://v3.fal.media/files/lion/p9zfHVb60jBBiVEbb8ahw_adapter.safetensors",
    //   url: "https://storage.googleapis.com/isolate-dev-hot-rooster_toolkit_public_bucket/github_110602490/0f076a59f424409db92b2f0e4e16402a_pytorch_lora_weights.safetensors",
      url: "https://v3.fal.media/files/elephant/YOSyiUVvNDHBF-V3pLTM1_pytorch_lora_weights.safetensors",
      triggerPhrase: "MDF-9-9-2025B", // Will be read from app state
      scale: 1.3
    }
    
    if (useLoRA && loraConfig.triggerPhrase) {
      finalPrompt = `${loraConfig.triggerPhrase}, ${finalPrompt}`
    }
    
    internalFormData.append("image", image)
    internalFormData.append("prompt", finalPrompt)
    internalFormData.append("useRAG", useRAG.toString())
    
    // Add RAG information if provided
    if (useRAG && activeRAGId) {
      internalFormData.append("activeRAGId", activeRAGId)
      if (activeRAGName) {
        internalFormData.append("activeRAGName", activeRAGName)
      }
    }
    
    // Parse and prepare settings
    let settings: any = {}
    if (settingsString) {
      try {
        settings = JSON.parse(settingsString)
      } catch (error) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid settings format",
            details: "Settings must be valid JSON"
          },
          { status: 400 }
        )
      }
    }
    
    // Prepare default settings
    const defaultSettings = {
      image_size: "landscape_4_3",
      num_inference_steps: 30,
      guidance_scale: 2.5,
      strength: 0.8,
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
    
    internalFormData.append("settings", JSON.stringify(mergedSettings))

    // Call internal API
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : process.env.NEXTAUTH_URL || 'http://localhost:3000'
    
    const response = await fetch(`${baseUrl}/api/qwen-image-to-image`, {
      method: 'POST',
      body: internalFormData
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || `Internal API error: ${response.status}`)
    }

    // Transform response for external API format
    return NextResponse.json({
      success: true,
      images: result.images || [],
      originalImage: {
        name: image.name,
        size: image.size,
        type: image.type
      },
      prompt: {
        original: prompt,
        final: result.finalPrompt || finalPrompt,
        enhanced: useRAG,
        lora_applied: useLoRA
      },
      settings: mergedSettings,
      processing: {
        model: "qwen-image",
        type: "image-to-image",
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('[External Image-to-Image API] Error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error occurred"
      },
      { status: 500 }
    )
  }
}
