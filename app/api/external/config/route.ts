import { NextRequest, NextResponse } from 'next/server'
import { useRAGStore } from '@/lib/rag-store'

/**
 * GET /api/external/config
 * 
 * Returns the current application configuration including:
 * - Active RAG configuration
 * - LoRA settings
 * - Available models and settings
 * 
 * This endpoint allows external applications to understand the current
 * configuration state before making text-to-image or edit-image requests.
 */
export async function GET(request: NextRequest) {
  try {
    // Get RAG store state (this needs to be handled server-side)
    // Since Zustand stores are client-side, we'll need to handle this differently
    // For now, we'll return a basic configuration structure
    
    const config = {
      rag: {
        available: true,
        activeRAG: null, // Will be populated when RAG is selected in the main app
        description: "RAG (Retrieval Augmented Generation) enhances prompts with organizational branding guidelines"
      },
      lora: {
        available: true,
        // defaultUrl: "https://v3.fal.media/files/zebra/xfGohqkcp1ulBXtjat3OS_adapter.safetensors",
        // defaultUrl: "https://v3.fal.media/files/lion/p9zfHVb60jBBiVEbb8ahw_adapter.safetensors",
        defaultUrl: "https://v3.fal.media/files/elephant/YOSyiUVvNDHBF-V3pLTM1_pytorch_lora_weights.safetensors",
        defaultScale: 1.3,
        defaultTriggerPhrase: "MDF-9-9-2025B",
        description: "LoRA models allow custom style training and application"
      },
      textToImage: {
        endpoint: "/api/external/text-to-image",
        model: "qwen",
        supportedFormats: ["png", "jpg", "webp"],
        maxImages: 4,
        imageSizes: [
          "square_hd",
          "square", 
          "portrait_4_3",
          "portrait_16_9",
          "landscape_4_3",
          "landscape_16_9"
        ],
        accelerationModes: ["none", "regular", "high"],
        settings: {
          num_inference_steps: { min: 1, max: 100, default: 30 },
          guidance_scale: { min: 1, max: 20, default: 2.5, step: 0.1 },
          num_images: { min: 1, max: 4, default: 1 },
          seed: { type: "number", optional: true, description: "Random if not provided" }
        }
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
      editImage: {
        endpoint: "/api/external/edit-image",
        model: "qwen-image-edit",
        supportedInputFormats: ["png", "jpg", "jpeg", "webp"],
        supportedOutputFormats: ["png", "jpg", "webp"],
        maxFileSize: "10MB",
        description: "Edit existing images with AI-powered modifications",
        additionalSettings: {
          image_size: {
            options: [
              "square_hd",
              "square", 
              "portrait_4_3",
              "portrait_16_9",
              "landscape_4_3",
              "landscape_16_9",
              "custom"
            ],
            default: "square_hd",
            description: "Output image size/aspect ratio",
            customFields: {
              width: { type: "number", min: 256, max: 2048, step: 64, description: "Custom width in pixels (required when image_size is 'custom'). Note: Final output may vary due to model constraints." },
              height: { type: "number", min: 256, max: 2048, step: 64, description: "Custom height in pixels (required when image_size is 'custom'). Note: Final output may vary due to model constraints." }
            }
          }
        }
      },
      imageToImage: {
        endpoint: "/api/external/image-to-image",
        model: "qwen-image",
        supportedInputFormats: ["png", "jpg", "jpeg", "webp"],
        supportedOutputFormats: ["png", "jpg", "webp"],
        maxFileSize: "10MB",
        description: "Transform existing images using AI with image-to-image generation",
        additionalSettings: {
          image_size: {
            options: [
              "square_hd",
              "square", 
              "portrait_4_3",
              "portrait_16_9",
              "landscape_4_3",
              "landscape_16_9"
            ],
            default: "landscape_4_3",
            description: "Output image size/aspect ratio"
          },
          strength: {
            type: "number",
            min: 0.1,
            max: 1.0,
            step: 0.1,
            default: 0.8,
            description: "Transformation strength (0.1 = subtle changes, 1.0 = major changes)"
          },
          guidance_scale: {
            type: "number",
            min: 1.0,
            max: 20.0,
            step: 0.1,
            default: 2.5,
            description: "How closely to follow the prompt"
          },
          num_inference_steps: {
            type: "number",
            min: 1,
            max: 100,
            default: 30,
            description: "Number of denoising steps"
          },
          num_images: {
            type: "number",
            min: 1,
            max: 4,
            default: 1,
            description: "Number of images to generate"
          }
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
