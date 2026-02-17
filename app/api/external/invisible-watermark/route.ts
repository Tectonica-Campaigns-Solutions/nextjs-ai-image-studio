import { NextRequest, NextResponse } from 'next/server'
import { fal } from "@fal-ai/client"
import { getClientApiKey } from "@/lib/api-keys"

/**
 * POST /api/external/invisible-watermark
 * 
 * External API endpoint for adding invisible watermarks to images using fal-ai/invisible-watermark.
 * This endpoint embeds text watermarks into images that are imperceptible to the human eye 
 * but can be extracted later for verification and copyright protection.
 * 
 * IMPORTANT: This endpoint ONLY accepts JSON payloads with Content-Type: application/json
 * 
 * Body parameters (JSON):
 * - imageUrl (required): URL of the image to watermark
 * - watermark (optional): Text to embed as watermark (default: "TectonicaAI")
 * - orgType (optional): Organization type for API key selection (default: "general")
 * 
 * The invisible watermark technique:
 * - Embeds the text into the image's frequency domain
 * - Remains invisible to human observers
 * - Persists through common image transformations (compression, resizing, etc.)
 * - Can be extracted later to verify authenticity and ownership
 * 
 * Response format:
 * Success: { 
 *   success: true, 
 *   watermarkedImage: string,
 *   watermark: string,
 *   originalImageUrl: string
 * }
 * Error: { success: false, error: string, details?: string }
 */

export async function POST(request: NextRequest) {
  try {
    console.log("[External Invisible Watermark] Processing request...")
    
    // Validate Content-Type
    const contentType = request.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      return NextResponse.json({
        success: false,
        error: "Invalid Content-Type",
        details: "This endpoint only accepts application/json. Received: " + contentType
      }, { status: 415 }) // 415 Unsupported Media Type
    }
    
    // Parse JSON body
    const body = await request.json()
    
    // Extract parameters
    const imageUrl = body.imageUrl || null
    const watermark = body.watermark || "TectonicaAI"
    const orgType = body.orgType || 'general'
    
    console.log('[External Invisible Watermark] Input parameters:', {
      hasImageUrl: !!imageUrl,
      imageUrl: imageUrl || 'N/A',
      watermark: watermark,
      orgType: orgType
    })
    
    // Validate required parameters
    if (!imageUrl || !imageUrl.trim()) {
      return NextResponse.json({ 
        success: false,
        error: "Missing required 'imageUrl' parameter",
        details: "Please provide a valid image URL to watermark"
      }, { status: 400 })
    }

    // Validate imageUrl format
    try {
      new URL(imageUrl)
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: "Invalid imageUrl format",
        details: `The provided imageUrl is not a valid URL: ${imageUrl}`
      }, { status: 400 })
    }

    // Validate watermark (must not be empty)
    if (!watermark || !watermark.trim()) {
      return NextResponse.json({
        success: false,
        error: "Invalid watermark parameter",
        details: "Watermark text cannot be empty"
      }, { status: 400 })
    }

    // Get organization-specific API key
    const falApiKey = getClientApiKey(orgType)
    
    console.log("[External Invisible Watermark] Fal API Key exists:", !!falApiKey)
    
    // Configure fal.ai client with API key
    fal.config({
      credentials: falApiKey,
    })

    console.log("[External Invisible Watermark] Calling fal.ai service...")
    console.log("[External Invisible Watermark] Parameters:", {
      image_url: imageUrl,
      watermark: watermark
    })

    // Call fal.ai invisible watermark service
    const result = await fal.subscribe("fal-ai/invisible-watermark", {
      input: {
        image_url: imageUrl,
        watermark: watermark
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS" && update.logs) {
          update.logs.forEach((log) => {
            console.log("[External Invisible Watermark] Service log:", log.message)
          })
        }
      },
    }) as any

    console.log("[External Invisible Watermark] Service completed successfully")
    console.log("[External Invisible Watermark] Result keys:", Object.keys(result))

    // Extract the watermarked image URL from the result
    const watermarkedImageUrl = result.image?.url || result.image_url || result.output?.url || null

    if (!watermarkedImageUrl) {
      console.error("[External Invisible Watermark] No watermarked image in result:", JSON.stringify(result, null, 2))
      return NextResponse.json({
        success: false,
        error: "Service did not return a watermarked image",
        details: "The fal.ai service completed but did not provide an output image URL",
        rawResult: result
      }, { status: 500 })
    }

    // Return success response
    return NextResponse.json({
      success: true,
      watermarkedImage: watermarkedImageUrl,
      watermark: watermark,
      originalImageUrl: imageUrl,
      serviceMetadata: {
        service: "fal-ai/invisible-watermark",
        orgType: orgType
      }
    })

  } catch (error: any) {
    console.error("[External Invisible Watermark] Error:", error)
    
    // Handle common fal.ai errors
    if (error.message?.includes('API key')) {
      return NextResponse.json({
        success: false,
        error: "API Authentication Failed",
        details: "Invalid or missing fal.ai API key. Please check your configuration."
      }, { status: 401 })
    }

    if (error.message?.includes('rate limit')) {
      return NextResponse.json({
        success: false,
        error: "Rate Limit Exceeded",
        details: "Too many requests. Please try again later."
      }, { status: 429 })
    }

    if (error.message?.includes('not found') || error.message?.includes('404')) {
      return NextResponse.json({
        success: false,
        error: "Image Not Found",
        details: "The provided image URL could not be accessed or does not exist."
      }, { status: 404 })
    }

    // Generic error response
    return NextResponse.json({
      success: false,
      error: "Service Error",
      details: error.message || "An unexpected error occurred while processing the watermark",
      errorType: error.constructor.name
    }, { status: 500 })
  }
}

// Export GET method for API documentation/health check
export async function GET(request: NextRequest) {
  return NextResponse.json({
    endpoint: "/api/external/invisible-watermark",
    method: "POST",
    service: "fal-ai/invisible-watermark",
    description: "Add invisible watermarks to images for copyright protection and verification",
    contentType: "application/json",
    parameters: {
      required: {
        imageUrl: "URL of the image to watermark (string)"
      },
      optional: {
        watermark: "Text to embed as watermark (string, default: 'TectonicaAI')",
        orgType: "Organization type for API key selection (string, default: 'general')"
      }
    },
    example: {
      imageUrl: "https://example.com/image.jpg",
      watermark: "TectonicaAI",
      orgType: "general"
    },
    response: {
      success: "boolean",
      watermarkedImage: "URL of the watermarked image",
      watermark: "Text that was embedded",
      originalImageUrl: "Original input image URL",
      serviceMetadata: {
        service: "Service identifier",
        orgType: "Organization type used"
      }
    }
  })
}
