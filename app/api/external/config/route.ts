import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/external/config
 * 
 * Returns the current application configuration including:
 * - LoRA settings
 * - Available models and settings
 * 
 * This endpoint allows external applications to understand the current
 * configuration state before making text-to-image or edit-image requests.
 */
export async function GET(request: NextRequest) {
  try {
    const config = {
      // Expose available chat models / LLMs for external clients
      chatModels: {
        default: "qwen-chat",
        available: [
          "qwen-chat",
        ],
        description: "Available chat/LLM models for conversational features"
      },
      lora: {
        available: true,
        defaultUrl: "https://v3.fal.media/files/elephant/YOSyiUVvNDHBF-V3pLTM1_pytorch_lora_weights.safetensors",
        defaultScale: 1.3,
        defaultTriggerPhrase: "MDF-9-9-2025B",
        description: "LoRA models allow custom style training and application"
      },
      fluxProTextToImage: {
        endpoint: "/api/external/flux-pro-text-to-image",
        model: "flux-pro/kontext/max",
        description: "Professional-grade text-to-image generation with superior quality",
        supportedFormats: ["jpg", "png", "webp"],
        maxImages: 4,
        imageSizes: [
          "square_hd",
          "square", 
          "portrait_4_3",
          "portrait_16_9",
          "landscape_4_3",
          "landscape_16_9"
        ],
        lora: {
          supported: true,
          customUrl: true,
          triggerPhrase: true,
          scaleRange: { min: 0.1, max: 2.0, default: 1.3, step: 0.1 }
        },
        settings: {
          num_inference_steps: { min: 1, max: 50, default: 30 },
          guidance_scale: { min: 1, max: 20, default: 3.5, step: 0.1 },
          num_images: { min: 1, max: 4, default: 1 },
          safety_tolerance: { min: 1, max: 6, default: 2, description: "Content safety level" },
          seed: { type: "number", optional: true, description: "Random if not provided" }
        }
      },
      imageCombine: {
        endpoint: "/api/external/flux-pro-image-combine",
        model: "flux-pro/kontext/max/multi",
        supportedInputFormats: ["png", "jpg", "jpeg", "webp"],
        supportedOutputFormats: ["jpeg", "png", "webp"],
        minImages: 2,
        maxImages: 10,
        maxFileSize: "10MB",
        description: "Combine multiple images into a single new image using advanced AI",
        additionalSettings: {
          aspect_ratio: {
            options: [
              "1:1",
              "4:3",
              "3:4", 
              "16:9",
              "9:16",
              "21:9"
            ],
            default: "1:1",
            description: "Output image aspect ratio"
          },
          guidance_scale: {
            type: "number",
            min: 1.0,
            max: 20.0,
            step: 0.1,
            default: 3.5,
            description: "How closely to follow the prompt"
          },
          safety_tolerance: {
            type: "number",
            min: 1,
            max: 6,
            default: 2,
            description: "Content safety level (1=strict, 6=permissive)"
          },
          seed: {
            type: "number",
            min: 0,
            max: 2147483647,
            description: "Random seed for reproducible results (optional)"
          },
          enhance_prompt: {
            type: "boolean",
            default: false,
            description: "Automatically enhance the prompt for better results"
          },
          output_format: {
            options: ["jpeg", "png", "webp"],
            default: "jpeg",
            description: "Output image format"
          }
        }
      },
      guardrails: {
        enabled: true,
        contentModeration: true,
        description: "All requests are automatically screened for appropriate content"
      },
      version: "1.0.0",
      timestamp: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      config
    })

  } catch (error) {
    console.error('[External Config API] Error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve configuration",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}

/**
 * OPTIONS /api/external/config
 * 
 * CORS preflight support
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
