import { NextRequest, NextResponse } from 'next/server'
import { Client } from "@gradio/client"
import { fal } from "@fal-ai/client"
import { getClientApiKey } from "@/lib/api-keys"

// Configure runtime and timeout
export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes for processing

/**
 * POST /api/external/watermark-anything
 * 
 * External API endpoint for adding invisible watermarks to images using Meta's Watermark Anything.
 * This endpoint uses the facebook/watermark-anything Hugging Face Space to embed imperceptible
 * watermarks into images that persist through transformations.
 * 
 * IMPORTANT: This endpoint ONLY accepts JSON payloads with Content-Type: application/json
 * 
 * Body parameters (JSON):
 * - imageUrl (required): URL of the image to watermark
 * - watermark (optional): Text to embed as invisible watermark (default: "TectonicaAI")
 * - orgType (optional): Organization type for FAL API key selection (default: "general")
 * 
 * The watermarked image is uploaded to FAL storage and the URL is returned.
 * 
 * Response format:
 * Success: { 
 *   success: true, 
 *   watermarkedImageUrl: string,
 *   watermark: string,
 *   originalImageUrl: string,
 *   falStorageUrl: string
 * }
 * Error: { success: false, error: string, details?: string }
 */

export async function POST(request: NextRequest) {
  try {
    console.log("[External Watermark Anything] Processing request...")
    
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
    
    console.log('[External Watermark Anything] Input parameters:', {
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

    // Validate Hugging Face API key
    const hfApiKey = process.env.HUGGINGFACE_API_KEY
    if (!hfApiKey) {
      console.error("[External Watermark Anything] Missing HUGGINGFACE_API_KEY")
      return NextResponse.json({
        success: false,
        error: "Service Configuration Error",
        details: "Hugging Face API key not configured"
      }, { status: 500 })
    }

    console.log("[External Watermark Anything] Connecting to Hugging Face Space...")
    
    // Connect to the Watermark Anything space
    let client: Awaited<ReturnType<typeof Client.connect>>
    try {
      client = await Client.connect("facebook/watermark-anything")
      console.log("[External Watermark Anything] Connected to space successfully")
    } catch (error: any) {
      console.error("[External Watermark Anything] Failed to connect to space:", error)
      return NextResponse.json({
        success: false,
        error: "Failed to connect to Watermark service",
        details: error.message || "Could not establish connection to facebook/watermark-anything"
      }, { status: 503 })
    }

    console.log("[External Watermark Anything] Applying invisible watermark...")
    console.log("[External Watermark Anything] Parameters:", {
      image_url: imageUrl,
      watermark_text: watermark
    })

    // Apply watermark using the space
    // The facebook/watermark-anything space typically has a prediction endpoint
    // that accepts an image and watermark text
    let result: any
    try {
      result = await client.predict("/predict", {
        image: imageUrl,
        watermark_text: watermark,
        watermark_type: "invisible"  // Ensure invisible watermark
      })
      console.log("[External Watermark Anything] Watermark applied successfully")
      console.log("[External Watermark Anything] Result keys:", Object.keys(result))
    } catch (error: any) {
      console.error("[External Watermark Anything] Prediction failed:", error)
      return NextResponse.json({
        success: false,
        error: "Watermark application failed",
        details: error.message || "Failed to apply watermark to image"
      }, { status: 500 })
    }

    // Extract the watermarked image from result
    // The result structure may vary, check common patterns
    let watermarkedImageData: any = null
    
    if (result.data && Array.isArray(result.data) && result.data.length > 0) {
      watermarkedImageData = result.data[0]
    } else if (result.image) {
      watermarkedImageData = result.image
    } else if (result.output) {
      watermarkedImageData = result.output
    }

    if (!watermarkedImageData) {
      console.error("[External Watermark Anything] No watermarked image in result:", JSON.stringify(result, null, 2))
      return NextResponse.json({
        success: false,
        error: "Service did not return a watermarked image",
        details: "The Hugging Face space completed but did not provide an output image",
        rawResult: result
      }, { status: 500 })
    }

    console.log("[External Watermark Anything] Watermarked image data type:", typeof watermarkedImageData)

    // Download the watermarked image
    let imageBuffer: Buffer
    try {
      // Check if watermarkedImageData is a URL or base64
      if (typeof watermarkedImageData === 'string') {
        if (watermarkedImageData.startsWith('http')) {
          // It's a URL, download it
          console.log("[External Watermark Anything] Downloading watermarked image from URL...")
          const imageResponse = await fetch(watermarkedImageData)
          if (!imageResponse.ok) {
            throw new Error(`Failed to download image: ${imageResponse.statusText}`)
          }
          const arrayBuffer = await imageResponse.arrayBuffer()
          imageBuffer = Buffer.from(arrayBuffer)
        } else if (watermarkedImageData.startsWith('data:')) {
          // It's a base64 data URI
          console.log("[External Watermark Anything] Converting base64 to buffer...")
          const base64Data = watermarkedImageData.split(',')[1]
          imageBuffer = Buffer.from(base64Data, 'base64')
        } else {
          // Assume raw base64
          console.log("[External Watermark Anything] Converting raw base64 to buffer...")
          imageBuffer = Buffer.from(watermarkedImageData, 'base64')
        }
      } else if (watermarkedImageData.url) {
        // Object with url property
        console.log("[External Watermark Anything] Downloading from result.url...")
        const imageResponse = await fetch(watermarkedImageData.url)
        if (!imageResponse.ok) {
          throw new Error(`Failed to download image: ${imageResponse.statusText}`)
        }
        const arrayBuffer = await imageResponse.arrayBuffer()
        imageBuffer = Buffer.from(arrayBuffer)
      } else {
        throw new Error("Unknown watermarked image data format")
      }
    } catch (error: any) {
      console.error("[External Watermark Anything] Failed to download watermarked image:", error)
      return NextResponse.json({
        success: false,
        error: "Failed to download watermarked image",
        details: error.message
      }, { status: 500 })
    }

    console.log(`[External Watermark Anything] Image downloaded, size: ${(imageBuffer.length / 1024).toFixed(2)}KB`)

    // Get organization-specific API key for FAL
    const falApiKey = getClientApiKey(orgType)
    console.log("[External Watermark Anything] FAL API Key exists:", !!falApiKey)
    
    // Configure fal.ai client with API key
    fal.config({
      credentials: falApiKey,
    })

    // Upload to FAL storage
    console.log("[External Watermark Anything] Uploading to FAL storage...")
    try {
      const filename = `watermarked-${Date.now()}.png`
      // Convert Buffer to Uint8Array for File constructor compatibility
      const uint8Array = new Uint8Array(imageBuffer)
      const file = new File([uint8Array], filename, { type: 'image/png' })
      
      const uploadPromise = fal.storage.upload(file)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Upload timeout after 4 minutes')), 240000)
      })

      const falStorageUrl = await Promise.race([uploadPromise, timeoutPromise]) as string
      console.log(`[External Watermark Anything] Upload successful: ${falStorageUrl}`)

      // Return success response
      return NextResponse.json({
        success: true,
        watermarkedImageUrl: falStorageUrl,
        falStorageUrl: falStorageUrl,
        watermark: watermark,
        originalImageUrl: imageUrl,
        serviceMetadata: {
          service: "facebook/watermark-anything",
          space: "Hugging Face",
          orgType: orgType,
          imageSize: imageBuffer.length
        }
      })

    } catch (error: any) {
      console.error("[External Watermark Anything] FAL upload failed:", error)
      
      if (error.message.includes('timeout')) {
        return NextResponse.json({
          success: false,
          error: "Upload timeout",
          details: "Image upload to FAL storage timed out. Try with a smaller image."
        }, { status: 408 })
      }

      return NextResponse.json({
        success: false,
        error: "Failed to upload to FAL storage",
        details: error.message
      }, { status: 500 })
    }

  } catch (error: any) {
    console.error("[External Watermark Anything] Error:", error)
    
    // Handle common errors
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
    endpoint: "/api/external/watermark-anything",
    method: "POST",
    service: "facebook/watermark-anything",
    platform: "Hugging Face Spaces",
    description: "Add invisible watermarks to images using Meta's Watermark Anything model. The watermarked image is uploaded to FAL storage.",
    contentType: "application/json",
    parameters: {
      required: {
        imageUrl: "URL of the image to watermark (string)"
      },
      optional: {
        watermark: "Text to embed as invisible watermark (string, default: 'TectonicaAI')",
        orgType: "Organization type for FAL API key selection (string, default: 'general')"
      }
    },
    example: {
      imageUrl: "https://example.com/image.jpg",
      watermark: "TectonicaAI",
      orgType: "general"
    },
    response: {
      success: "boolean",
      watermarkedImageUrl: "URL of the watermarked image in FAL storage",
      falStorageUrl: "FAL storage URL (same as watermarkedImageUrl)",
      watermark: "Text that was embedded",
      originalImageUrl: "Original input image URL",
      serviceMetadata: {
        service: "Service identifier",
        space: "Platform name",
        orgType: "Organization type used",
        imageSize: "Size in bytes"
      }
    },
    notes: [
      "This service uses Meta's Watermark Anything model for imperceptible watermark embedding",
      "Watermarks persist through common image transformations",
      "The watermarked image is automatically uploaded to FAL storage",
      "Alternative to fal-ai/invisible-watermark service"
    ]
  })
}
