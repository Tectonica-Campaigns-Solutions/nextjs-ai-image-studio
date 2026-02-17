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

// Magic number to identify watermarked images (ASCII "WM01" = 0x574D3031)
const WATERMARK_MAGIC = 0x574D3031

/**
 * Embed invisible watermark into image using LSB steganography
 */
async function embedWatermark(imageBuffer: Buffer, watermarkText: string): Promise<Buffer> {
  // Get image metadata and pixel data
  const image = sharp(imageBuffer)
  const metadata = await image.metadata()
  
  console.log(`[Watermark Embed] Image metadata:`, {
    format: metadata.format,
    width: metadata.width,
    height: metadata.height,
    channels: metadata.channels,
    hasAlpha: metadata.hasAlpha
  })
  
  const { data, info } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  console.log(`[Watermark Embed] Raw data info:`, {
    dataLength: data.length,
    width: info.width,
    height: info.height,
    channels: info.channels
  })

  // Convert watermark text to binary
  const watermarkBinary = textToBinary(watermarkText)
  
  // Build complete watermark data:
  // 1. Magic number (32 bits) - to identify watermarked images
  // 2. Text length (32 bits)
  // 3. Text data (variable length)
  const magicBinary = numberToBinary(WATERMARK_MAGIC, 32)
  const lengthBinary = numberToBinary(watermarkText.length, 32)
  const fullWatermark = magicBinary + lengthBinary + watermarkBinary
  
  console.log(`[Watermark Embed] Text: "${watermarkText}"`)
  console.log(`[Watermark Embed] Magic number: ${WATERMARK_MAGIC.toString(16)} (${magicBinary})`)
  console.log(`[Watermark Embed] Text length: ${watermarkText.length}`)
  console.log(`[Watermark Embed] Length binary: ${lengthBinary}`)
  console.log(`[Watermark Embed] Total bits to embed: ${fullWatermark.length} (magic: 32, length: 32, text: ${watermarkBinary.length})`)
  
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
  // IMPORTANT: Use compressionLevel 0 to preserve LSBs exactly
  return sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: info.channels
    }
  })
    .png({ 
      compressionLevel: 0,  // No compression to preserve LSBs
      adaptiveFiltering: false,  // Disable filtering
      palette: false  // Disable palette
    })
    .toBuffer()
}

/**
 * Extract invisible watermark from image using LSB steganography
 */
async function extractWatermark(imageBuffer: Buffer): Promise<string> {
  // Get image info first
  const metadata = await sharp(imageBuffer).metadata()
  console.log(`[Watermark Extract] Image metadata:`, {
    format: metadata.format,
    width: metadata.width,
    height: metadata.height,
    channels: metadata.channels,
    hasAlpha: metadata.hasAlpha
  })
  
  // Get pixel data - ensure we process it the same way as embedding
  const { data, info } = await sharp(imageBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  
  console.log(`[Watermark Extract] Raw data info:`, {
    dataLength: data.length,
    width: info.width,
    height: info.height,
    channels: info.channels,
    totalPixels: info.width * info.height,
    bytesPerPixel: info.channels
  })
  
  // Extract all bits in one pass
  let bitIndex = 0
  let byteIndex = 0
  const extractedBits: string[] = []
  
  // Extract enough bits for magic (32) + length (32) + max text (10000 * 8)
  const maxBitsToExtract = 64 + (10000 * 8)
  
  while (byteIndex < data.length && extractedBits.length < maxBitsToExtract) {
    // Skip alpha channel
    if (info.channels === 4 && (byteIndex % 4 === 3)) {
      byteIndex++
      continue
    }
    
    // Extract LSB
    extractedBits.push((data[byteIndex] & 1).toString())
    byteIndex++
  }
  
  console.log(`[Watermark Extract] Extracted ${extractedBits.length} bits from ${byteIndex} bytes`)
  
  // Parse magic number (bits 0-31)
  const magicBinary = extractedBits.slice(0, 32).join('')
  const extractedMagic = parseInt(magicBinary, 2)
  
  console.log(`[Watermark Extract] Magic number: ${extractedMagic.toString(16)} (expected: ${WATERMARK_MAGIC.toString(16)})`)
  console.log(`[Watermark Extract] Magic binary: ${magicBinary}`)
  
  if (extractedMagic !== WATERMARK_MAGIC) {
    throw new Error(`Invalid watermark magic number. Expected ${WATERMARK_MAGIC.toString(16)}, got ${extractedMagic.toString(16)}. This image may not contain a watermark or was compressed/modified.`)
  }
  
  // Parse length (bits 32-63)
  const lengthBinary = extractedBits.slice(32, 64).join('')
  const textLength = parseInt(lengthBinary, 2)
  
  console.log(`[Watermark Extract] Length binary (bits 32-63): ${lengthBinary}`)
  console.log(`[Watermark Extract] Decoded text length: ${textLength}`)
  
  if (textLength <= 0 || textLength > 10000) {
    throw new Error(`Invalid watermark text length: ${textLength}. Expected 1-10000.`)
  }
  
  // Parse text data (bits 64 onwards)
  const bitsNeeded = textLength * 8
  const textBinary = extractedBits.slice(64, 64 + bitsNeeded).join('')
  
  console.log(`[Watermark Extract] Extracting ${bitsNeeded} bits for text`)
  console.log(`[Watermark Extract] Extracted ${textBinary.length} bits (expected ${bitsNeeded})`)
  console.log(`[Watermark Extract] First 64 bits of text: ${textBinary.substring(0, 64)}`)
  
  if (textBinary.length < bitsNeeded) {
    throw new Error(`Insufficient data. Expected ${bitsNeeded} bits, got ${textBinary.length} bits.`)
  }
  
  // Convert binary back to text
  const extractedText = binaryToText(textBinary)
  console.log(`[Watermark Extract] Extracted text: "${extractedText}"`)
  console.log(`[Watermark Extract] Text char codes:`, extractedText.split('').map(c => c.charCodeAt(0)))
  
  return extractedText
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
 * SMART RE-WATERMARKING PREVENTION:
 * Before embedding, the endpoint checks if the image already contains a valid watermark.
 * If a watermark is detected, the original image URL is returned without processing,
 * preventing watermark overwriting in chained operations (apply → edit → edit).
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
 * If a watermark already exists, the original URL is returned without upload.
 * 
 * Response format (embed):
 * Success: { 
 *   success: true, 
 *   watermarkedImageUrl: string,
 *   watermark: string,
 *   originalImageUrl: string,
 *   method: "LSB Steganography",
 *   alreadyWatermarked?: boolean,  // Present if watermark was already embedded
 *   skippedUpload?: boolean  // Present if upload was skipped
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

    // Check if image already has a watermark to avoid re-watermarking
    console.log("[External Watermark Anything] Checking for existing watermark...")
    try {
      const existingWatermark = await extractWatermark(imageBuffer)
      console.log(`[External Watermark Anything] Image already watermarked with: "${existingWatermark}"`)
      console.log(`[External Watermark Anything] Skipping embed to avoid overwriting existing watermark`)
      
      // Return original image URL without processing
      return NextResponse.json({
        success: true,
        watermarkedImageUrl: imageUrl,
        watermark: existingWatermark,
        originalImageUrl: imageUrl,
        method: "LSB Steganography",
        alreadyWatermarked: true,
        skippedUpload: true,
        serviceMetadata: {
          technique: "Skipped - Already Watermarked",
          existingWatermark: existingWatermark,
          watermarkLength: existingWatermark.length,
          reason: "Image already contains a valid watermark"
        }
      })
    } catch (extractError: any) {
      // No valid watermark found (or watermark corrupted/truncated)
      console.log(`[External Watermark Anything] No valid watermark detected: ${extractError.message}`)
      console.log(`[External Watermark Anything] Proceeding with watermark embedding...`)
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
        watermarkedImageUrl: "URL of the watermarked image in FAL storage (or original URL if already watermarked)",
        watermark: "Text that was embedded (or existing watermark if already present)",
        originalImageUrl: "Original input image URL",
        method: "LSB Steganography",
        alreadyWatermarked: "boolean (optional) - true if image already had a watermark and processing was skipped",
        skippedUpload: "boolean (optional) - true if FAL upload was skipped due to existing watermark",
        serviceMetadata: {
          technique: "Least Significant Bit Steganography (or 'Skipped - Already Watermarked')",
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
      "Automatic upload to FAL storage",
      "Smart detection: skips re-watermarking if watermark already exists",
      "Idempotent: safe to call multiple times on same image"
    ],
    notes: [
      "Uses Least Significant Bit (LSB) technique to embed text in image pixels",
      "Watermarks are invisible but can be affected by heavy compression",
      "Best preserved with PNG format (lossless)",
      "Use 'extract: true' parameter to retrieve embedded watermark",
      "More reliable than external AI services (no downtime)",
      "Alternative to fal-ai/invisible-watermark service",
      "Automatically detects existing watermarks to prevent overwriting",
      "Returns original URL if watermark already exists (saves processing time)",
      "Check 'alreadyWatermarked' field in response to know if processing was skipped"
    ],
    limitations: [
      "Maximum watermark length: 1000 characters",
      "May be lost with heavy JPEG compression or aggressive image editing",
      "Requires sufficient image size (larger images = more capacity)"
    ]
  })
}
