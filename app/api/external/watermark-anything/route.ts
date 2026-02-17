import { NextRequest, NextResponse } from 'next/server'
import { fal } from "@fal-ai/client"
import { getClientApiKey } from "@/lib/api-keys"
import sharp from 'sharp'

// Configure runtime and timeout
export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes for processing

/**
 * Invisible Watermarking using LSB (Least Significant Bit) Steganography
 * 
 * This technique embeds text data into the least significant bits of image pixels,
 * making the watermark imperceptible to the human eye while allowing extraction later.
 */

/**
 * Embed invisible watermark into image using LSB steganography
 */
async function embedWatermark(imageBuffer: Buffer, watermarkText: string): Promise<Buffer> {
  // Get image metadata and pixel data
  const image = sharp(imageBuffer)
  const metadata = await image.metadata()
  const { data, info } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  // Convert watermark text to binary
  const watermarkBinary = textToBinary(watermarkText)
  
  // Add length prefix (32 bits for text length)
  const lengthBinary = numberToBinary(watermarkText.length, 32)
  const fullWatermark = lengthBinary + watermarkBinary
  
  console.log(`[Watermark Embed] Text length: ${watermarkText.length}, Binary length: ${fullWatermark.length} bits`)
  
  // Check if image has enough capacity
  const maxCapacity = (data.length / info.channels) * 3 // Use RGB channels only
  if (fullWatermark.length > maxCapacity) {
    throw new Error(`Watermark too long. Max capacity: ${Math.floor(maxCapacity / 8)} characters, provided: ${watermarkText.length}`)
  }
  
  // Embed watermark in LSBs of RGB channels
  let bitIndex = 0
  for (let i = 0; i < data.length && bitIndex < fullWatermark.length; i++) {
    // Skip alpha channel (every 4th byte if RGBA)
    if (info.channels === 4 && (i % 4 === 3)) {
      continue
    }
    
    // Modify LSB of current byte
    const bit = parseInt(fullWatermark[bitIndex])
    data[i] = (data[i] & 0xFE) | bit
    bitIndex++
  }
  
  console.log(`[Watermark Embed] Embedded ${bitIndex} bits into image`)
  
  // Convert back to image
  return sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: info.channels
    }
  })
    .png({ compressionLevel: 9, quality: 100 })
    .toBuffer()
}

/**
 * Extract invisible watermark from image using LSB steganography
 */
async function extractWatermark(imageBuffer: Buffer): Promise<string> {
  // Get pixel data
  const { data, info } = await sharp(imageBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  
  // Extract length (first 32 bits)
  let binaryString = ''
  let bitIndex = 0
  
  for (let i = 0; i < data.length && bitIndex < 32; i++) {
    if (info.channels === 4 && (i % 4 === 3)) {
      continue
    }
    binaryString += (data[i] & 1).toString()
    bitIndex++
  }
  
  const textLength = parseInt(binaryString, 2)
  console.log(`[Watermark Extract] Text length: ${textLength}`)
  
  if (textLength <= 0 || textLength > 10000) {
    throw new Error('Invalid watermark or watermark not found')
  }
  
  // Extract watermark text
  binaryString = ''
  const bitsNeeded = textLength * 8
  
  for (let i = 0; i < data.length && bitIndex < 32 + bitsNeeded; i++) {
    if (info.channels === 4 && (i % 4 === 3)) {
      continue
    }
    if (bitIndex >= 32) {
      binaryString += (data[i] & 1).toString()
    }
    bitIndex++
  }
  
  console.log(`[Watermark Extract] Extracted ${binaryString.length} bits`)
  
  // Convert binary back to text
  return binaryToText(binaryString)
}

/**
 * Convert text to binary string
 */
function textToBinary(text: string): string {
  return text
    .split('')
    .map(char => char.charCodeAt(0).toString(2).padStart(8, '0'))
    .join('')
}

/**
 * Convert binary string to text
 */
function binaryToText(binary: string): string {
  const chars = []
  for (let i = 0; i < binary.length; i += 8) {
    const byte = binary.slice(i, i + 8)
    if (byte.length === 8) {
      chars.push(String.fromCharCode(parseInt(byte, 2)))
    }
  }
  return chars.join('')
}

/**
 * Convert number to binary string with fixed length
 */
function numberToBinary(num: number, bits: number): string {
  return num.toString(2).padStart(bits, '0')
}

/**
 * POST /api/external/watermark-anything
 * 
 * External API endpoint for adding invisible watermarks to images using LSB steganography.
 * This endpoint embeds imperceptible watermarks into images locally using Sharp,
 * without relying on external AI services.
 * 
 * IMPORTANT: This endpoint ONLY accepts JSON payloads with Content-Type: application/json
 * 
 * Body parameters (JSON):
 * - imageUrl (required): URL of the image to watermark
 * - watermark (optional): Text to embed as invisible watermark (default: "TectonicaAI")
 * - orgType (optional): Organization type for FAL API key selection (default: "general")
 * - extract (optional): If true, extract watermark instead of embedding (default: false)
 * 
 * The watermarked image is uploaded to FAL storage and the URL is returned.
 * 
 * Response format (embed):
 * Success: { 
 *   success: true, 
 *   watermarkedImageUrl: string,
 *   watermark: string,
 *   originalImageUrl: string,
 *   method: "LSB Steganography"
 * }
 * 
 * Response format (extract):
 * Success: {
 *   success: true,
 *   extractedWatermark: string,
 *   imageUrl: string
 * }
 * 
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
      }, { status: 415 })
    }
    
    // Parse JSON body
    const body = await request.json()
    
    // Extract parameters
    const imageUrl = body.imageUrl || null
    const watermark = body.watermark || "TectonicaAI"
    const orgType = body.orgType || 'general'
    const extract = body.extract === true
    
    console.log('[External Watermark Anything] Input parameters:', {
      hasImageUrl: !!imageUrl,
      imageUrl: imageUrl || 'N/A',
      watermark: extract ? '(extracting)' : watermark,
      orgType: orgType,
      mode: extract ? 'extract' : 'embed'
    })
    
    // Validate required parameters
    if (!imageUrl || !imageUrl.trim()) {
      return NextResponse.json({ 
        success: false,
        error: "Missing required 'imageUrl' parameter",
        details: "Please provide a valid image URL"
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

    // Download image
    console.log("[External Watermark Anything] Downloading image...")
    let imageBuffer: Buffer
    try {
      const response = await fetch(imageUrl)
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.statusText}`)
      }
      const arrayBuffer = await response.arrayBuffer()
      imageBuffer = Buffer.from(arrayBuffer)
      console.log(`[External Watermark Anything] Downloaded ${(imageBuffer.length / 1024).toFixed(2)}KB`)
    } catch (error: any) {
      console.error("[External Watermark Anything] Download failed:", error)
      return NextResponse.json({
        success: false,
        error: "Failed to download image",
        details: error.message
      }, { status: 500 })
    }

    // EXTRACT MODE: Extract watermark from image
    if (extract) {
      console.log("[External Watermark Anything] Extracting watermark...")
      try {
        const extractedText = await extractWatermark(imageBuffer)
        console.log(`[External Watermark Anything] Extracted watermark: "${extractedText}"`)
        
        return NextResponse.json({
          success: true,
          extractedWatermark: extractedText,
          imageUrl: imageUrl,
          method: "LSB Steganography",
          watermarkLength: extractedText.length
        })
      } catch (error: any) {
        console.error("[External Watermark Anything] Extraction failed:", error)
        return NextResponse.json({
          success: false,
          error: "Failed to extract watermark",
          details: error.message
        }, { status: 500 })
      }
    }

    // EMBED MODE: Add watermark to image
    
    // Validate watermark text
    if (!watermark || !watermark.trim()) {
      return NextResponse.json({
        success: false,
        error: "Invalid watermark parameter",
        details: "Watermark text cannot be empty"
      }, { status: 400 })
    }

    // Check watermark length (max 1000 characters for safety)
    if (watermark.length > 1000) {
      return NextResponse.json({
        success: false,
        error: "Watermark too long",
        details: "Maximum watermark length is 1000 characters"
      }, { status: 400 })
    }

    console.log("[External Watermark Anything] Embedding watermark...")
    let watermarkedBuffer: Buffer
    try {
      watermarkedBuffer = await embedWatermark(imageBuffer, watermark)
      console.log(`[External Watermark Anything] Watermark embedded, output size: ${(watermarkedBuffer.length / 1024).toFixed(2)}KB`)
    } catch (error: any) {
      console.error("[External Watermark Anything] Embedding failed:", error)
      return NextResponse.json({
        success: false,
        error: "Failed to embed watermark",
        details: error.message
      }, { status: 500 })
    }

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
      const uint8Array = new Uint8Array(watermarkedBuffer)
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
        watermark: watermark,
        originalImageUrl: imageUrl,
        method: "LSB Steganography",
        serviceMetadata: {
          technique: "Least Significant Bit Steganography",
          local: true,
          orgType: orgType,
          originalSize: imageBuffer.length,
          watermarkedSize: watermarkedBuffer.length,
          watermarkLength: watermark.length
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
    service: "Local LSB Steganography",
    platform: "Server-side (Sharp)",
    description: "Add invisible watermarks to images using LSB (Least Significant Bit) steganography. Watermarks are embedded locally and can be extracted later. Does not rely on external AI services.",
    contentType: "application/json",
    parameters: {
      required: {
        imageUrl: "URL of the image to process (string)"
      },
      optional: {
        watermark: "Text to embed as invisible watermark (string, default: 'TectonicaAI', max: 1000 chars)",
        orgType: "Organization type for FAL API key selection (string, default: 'general')",
        extract: "If true, extract watermark instead of embedding (boolean, default: false)"
      }
    },
    examples: {
      embed: {
        imageUrl: "https://example.com/image.jpg",
        watermark: "TectonicaAI",
        orgType: "general"
      },
      extract: {
        imageUrl: "https://example.com/watermarked-image.jpg",
        extract: true
      }
    },
    responses: {
      embed: {
        success: "boolean",
        watermarkedImageUrl: "URL of the watermarked image in FAL storage",
        watermark: "Text that was embedded",
        originalImageUrl: "Original input image URL",
        method: "LSB Steganography",
        serviceMetadata: {
          technique: "Least Significant Bit Steganography",
          local: "true (processed server-side)",
          orgType: "Organization type used",
          originalSize: "Original image size in bytes",
          watermarkedSize: "Watermarked image size in bytes",
          watermarkLength: "Length of watermark text"
        }
      },
      extract: {
        success: "boolean",
        extractedWatermark: "The extracted watermark text",
        imageUrl: "Image URL that was processed",
        method: "LSB Steganography",
        watermarkLength: "Length of extracted text"
      }
    },
    features: [
      "Local processing - no external dependencies",
      "Invisible watermarking using LSB steganography",
      "Imperceptible to human eye",
      "Extraction capability to verify watermarks",
      "Supports up to 1000 characters",
      "PNG output for lossless watermark preservation",
      "Automatic upload to FAL storage"
    ],
    notes: [
      "Uses Least Significant Bit (LSB) technique to embed text in image pixels",
      "Watermarks are invisible but can be affected by heavy compression",
      "Best preserved with PNG format (lossless)",
      "Use 'extract: true' parameter to retrieve embedded watermark",
      "More reliable than external AI services (no downtime)",
      "Alternative to fal-ai/invisible-watermark service"
    ],
    limitations: [
      "Maximum watermark length: 1000 characters",
      "May be lost with heavy JPEG compression or aggressive image editing",
      "Requires sufficient image size (larger images = more capacity)"
    ]
  })
}
