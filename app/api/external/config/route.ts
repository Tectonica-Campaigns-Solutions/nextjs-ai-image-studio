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
        defaultUrl: "https://v3.fal.media/files/lion/p9zfHVb60jBBiVEbb8ahw_adapter.safetensors",
        defaultScale: 1.0,
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
