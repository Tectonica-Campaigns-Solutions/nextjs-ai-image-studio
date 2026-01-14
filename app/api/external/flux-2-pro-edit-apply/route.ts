import { NextRequest, NextResponse } from "next/server"
import { fal } from "@fal-ai/client"
import sharp from 'sharp'
import fs from 'fs/promises'
import path from 'path'

/**
 * Helper: Resize image to respect fal.ai megapixel limits
 * For 2 images (1 user + 1 reference):
 * - First image (user): max 4 MP (2048x2048)
 * - Second image (reference): max 1 MP (1024x1024)
 * - Total: 5 MP input + output within 9 MP limit
 */
async function resizeImageForFalAI(buffer: Buffer, isFirstImage: boolean): Promise<Buffer> {
  const maxMegapixels = isFirstImage ? 4_000_000 : 1_000_000
  const maxDimension = isFirstImage ? 2048 : 1024
  
  const metadata = await sharp(buffer).metadata()
  const currentPixels = (metadata.width || 0) * (metadata.height || 0)
  
  // If already within limits, return as-is
  if (currentPixels <= maxMegapixels && 
      (metadata.width || 0) <= maxDimension && 
      (metadata.height || 0) <= maxDimension) {
    return buffer
  }
  
  // Calculate resize dimensions while maintaining aspect ratio
  const aspectRatio = (metadata.width || 1) / (metadata.height || 1)
  let targetWidth: number
  let targetHeight: number
  
  if (aspectRatio > 1) {
    // Landscape
    targetWidth = Math.min(maxDimension, Math.floor(Math.sqrt(maxMegapixels * aspectRatio)))
    targetHeight = Math.floor(targetWidth / aspectRatio)
  } else {
    // Portrait or square
    targetHeight = Math.min(maxDimension, Math.floor(Math.sqrt(maxMegapixels / aspectRatio)))
    targetWidth = Math.floor(targetHeight * aspectRatio)
  }
  
  console.log(`[Flux 2 Pro Edit Apply] Resizing image from ${metadata.width}x${metadata.height} (${Math.round(currentPixels/1000000)}MP) to ${targetWidth}x${targetHeight} (${Math.round((targetWidth*targetHeight)/1000000)}MP)`)
  
  return sharp(buffer)
    .resize(targetWidth, targetHeight, { 
      fit: 'inside',
      withoutEnlargement: true
    })
    .jpeg({ quality: 90 })
    .toBuffer()
}

// Pre-configured reference images (1 style reference)
const STYLE_REFERENCE_IMAGES = [
  'TCTAIFront11.png',
].map(filename => `/tectonicaai-reference-images/${filename}`)

// Default prompt (can be customized)
const DEFAULT_PROMPT = "Combine the subject from @image1 with the artistic style and atmosphere of @image2. Do not modify the subject's pose. Do not add subject from @image2 to @image1."

/**
 * POST /api/external/flux-2-pro-edit-apply
 * 
 * External API endpoint for applying TectonicaAI style to user images.
 * This endpoint combines a user-provided image with 1 pre-loaded reference image.
 * 
 * Features:
 * - Auto-loaded style reference: 1 TectonicaAI image (TCTAIFront11.png)
 * - Required user image: Must provide exactly 1 image (@image1)
 * - Reference image: Automatically loaded as @image2
 * - Editable prompt: Default "Combine the subject from @image1 with the artistic style and atmosphere of @image2" (can be customized)
 * - Custom and preset sizes: Full flexibility
 * - Safety controls: Configurable tolerance (1-5) and safety checker
 * - Multiple formats: JPEG or PNG output
 * - Reproducibility: Seed support
 * 
 * Body parameters (JSON):
 * - prompt (optional): Custom prompt (default: "Combine the subject from @image1 with the artistic style and atmosphere of @image2")
 * - imageUrl (optional): Single image URL from user
 * - base64Image (optional): Single Base64 image from user
 * - settings (optional): Object with generation settings
 *   - image_size: "auto" | "square_hd" | "square" | "portrait_4_3" | "portrait_16_9" | "landscape_4_3" | "landscape_16_9" | {width, height}
 *   - safety_tolerance: 1-5 (default: 2)
 *   - enable_safety_checker: boolean (default: true)
 *   - output_format: "jpeg" | "png" (default: "jpeg")
 *   - seed: number (optional)
 * 
 * Response format:
 * {
 *   "success": true,
 *   "images": [{ 
 *     "url": "https://fal.ai/...",
 *     "width": 1024, 
 *     "height": 1024 
 *   }],
 *   "prompt": "Combine the subject from @image1 with the artistic style and atmosphere of @image2",
 *   "seed": 12345,
 *   "model": "fal-ai/flux-2-pro/edit",
 *   "provider": "fal.ai",
 *   "inputImages": 5,
 *   "styleReferences": 4,
 *   "userImages": 1
 * }
 */
export async function POST(request: NextRequest) {
  try {
    console.log("[Flux 2 Pro Edit Apply] Request received")
    
    // Check FAL_API_KEY
    const falApiKey = process.env.FAL_API_KEY
    if (!falApiKey) {
      console.error("[Flux 2 Pro Edit Apply] FAL_API_KEY not configured")
      return NextResponse.json({
        error: "Service configuration error",
        details: "FAL_API_KEY not configured"
      }, { status: 500 })
    }
    
    console.log("[Flux 2 Pro Edit Apply] FAL_API_KEY found")

    // Parse JSON body
    console.log("[Flux 2 Pro Edit Apply] Parsing request body...")
    const body = await request.json()
    console.log("[Flux 2 Pro Edit Apply] Body parsed successfully")
    
    const { 
      prompt = DEFAULT_PROMPT,
      imageUrl = null,
      base64Image = null,
      settings = {}
    } = body

    console.log("[Flux 2 Pro Edit Apply] Parameters:", {
      prompt: prompt,
      hasImageUrl: !!imageUrl,
      hasBase64Image: !!base64Image,
      settings
    })

    // Extract settings
    const imageSize = settings.image_size || settings.imageSize || "auto"
    const safetyTolerance = settings.safety_tolerance || settings.safetyTolerance || "2"
    const enableSafetyChecker = settings.enable_safety_checker !== false
    const outputFormat = settings.output_format || settings.outputFormat || "jpeg"
    const seed = settings.seed ? parseInt(settings.seed.toString()) : undefined

    // Validate that user provides exactly 1 image
    if (!imageUrl && !base64Image) {
      return NextResponse.json({
        error: "User image is required",
        details: "Please provide exactly 1 image via imageUrl or base64Image to apply style to"
      }, { status: 400 })
    }

    if (imageUrl && base64Image) {
      return NextResponse.json({
        error: "Too many user images",
        details: "Please provide either imageUrl OR base64Image, not both"
      }, { status: 400 })
    }

    // Validate image_size
    const validImageSizes = ["auto", "square_hd", "square", "portrait_4_3", "portrait_16_9", "landscape_4_3", "landscape_16_9"]
    const imageSizeStr = typeof imageSize === 'string' ? imageSize : 'custom'
    
    if (typeof imageSize === 'string' && !validImageSizes.includes(imageSizeStr)) {
      return NextResponse.json({
        error: "Invalid image_size",
        details: `image_size must be one of: ${validImageSizes.join(', ')}, or an object with width and height`
      }, { status: 400 })
    }
    
    // Validate custom dimensions if image_size is object
    if (typeof imageSize === 'object') {
      const { width, height } = imageSize
      
      if (!width || !height) {
        return NextResponse.json({
          error: "Custom dimensions required",
          details: "When image_size is an object, both width and height are required"
        }, { status: 400 })
      }
      
      if (width < 512 || width > 2048 || height < 512 || height > 2048) {
        return NextResponse.json({
          error: "Invalid custom dimensions",
          details: "Width and height must be between 512 and 2048 pixels"
        }, { status: 400 })
      }
    }
    
    // Validate safety_tolerance
    const safetyToleranceNum = parseInt(safetyTolerance)
    if (isNaN(safetyToleranceNum) || safetyToleranceNum < 1 || safetyToleranceNum > 5) {
      return NextResponse.json({
        error: "Invalid safety_tolerance",
        details: "safety_tolerance must be a number between 1 and 5"
      }, { status: 400 })
    }
    const safetyToleranceStr = safetyToleranceNum.toString()
    
    // Validate output_format
    if (!['jpeg', 'png'].includes(outputFormat)) {
      return NextResponse.json({
        error: "Invalid output_format",
        details: "output_format must be 'jpeg' or 'png'"
      }, { status: 400 })
    }

    const allImageUrls: string[] = []
    
    // FIRST: Process user image (this will be @image1)
    console.log(`[Flux 2 Pro Edit Apply] Processing user image (will be @image1)...`)
    
    if (base64Image) {
      try {
        // Parse Base64 data URL or raw Base64
        let imageBuffer: Buffer
        let mimeType = 'image/jpeg'
        
        if (base64Image.startsWith('data:')) {
          const matches = base64Image.match(/^data:([^;]+);base64,(.+)$/)
          if (!matches) {
            throw new Error(`Invalid Base64 data URL format`)
          }
          mimeType = matches[1]
          const base64String = matches[2]
          imageBuffer = Buffer.from(base64String, 'base64')
        } else {
          imageBuffer = Buffer.from(base64Image, 'base64')
        }
        
        // Normalize MIME type
        if (mimeType === 'image/jpg') {
          mimeType = 'image/jpeg'
        }
        
        console.log(`[Flux 2 Pro Edit Apply] Processing Base64 image, type: ${mimeType}`)
        
        // Validate image integrity
        try {
          const metadata = await sharp(imageBuffer).metadata()
          console.log(`[Flux 2 Pro Edit Apply] ✅ Image validated: ${metadata.format}, ${metadata.width}x${metadata.height}`)
        } catch (validationError) {
          const errorMsg = validationError instanceof Error ? validationError.message : String(validationError)
          console.error(`[Flux 2 Pro Edit Apply] ❌ CORRUPTED BASE64 IMAGE:`, errorMsg)
          throw new Error(`Base64 image is corrupted or incomplete`)
        }
        
        // Resize user image (first image, max 4 MP)
        let finalBuffer: Buffer
        let finalMimeType = 'image/jpeg'
        
        try {
          finalBuffer = await resizeImageForFalAI(imageBuffer, true)
          console.log(`[Flux 2 Pro Edit Apply] ✅ Processed: ${(imageBuffer.length / 1024).toFixed(1)} KB → ${(finalBuffer.length / 1024).toFixed(1)} KB`)
        } catch (sharpError) {
          console.warn(`[Flux 2 Pro Edit Apply] ⚠️  Processing failed, using original`)
          finalBuffer = imageBuffer
          finalMimeType = mimeType
        }
        
        // Upload using 2-step process
        const fileExtension = finalMimeType.split('/')[1] || 'jpeg'
        const fileName = `user-image.${fileExtension}`
        
        console.log(`[Flux 2 Pro Edit Apply] Uploading ${fileName}...`)
        
        const initiateResponse = await fetch('https://rest.alpha.fal.ai/storage/upload/initiate', {
          method: 'POST',
          headers: {
            'Authorization': `Key ${falApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            content_type: finalMimeType,
            file_name: fileName
          })
        })
        
        if (!initiateResponse.ok) {
          throw new Error(`Failed to initiate upload: ${initiateResponse.status}`)
        }
        
        const { upload_url, file_url } = await initiateResponse.json()
        
        const uint8Array = new Uint8Array(finalBuffer)
        const putResponse = await fetch(upload_url, {
          method: 'PUT',
          headers: {
            'Content-Type': finalMimeType,
            'Content-Length': finalBuffer.length.toString()
          },
          body: uint8Array
        })
        
        if (!putResponse.ok) {
          throw new Error(`Failed to PUT file: ${putResponse.status}`)
        }
        
        console.log(`[Flux 2 Pro Edit Apply] ✅ Uploaded user image (@image1): ${file_url}`)
        allImageUrls.push(file_url)
        
      } catch (base64Error) {
        console.error(`[Flux 2 Pro Edit Apply] Failed to process Base64 image:`, base64Error)
        return NextResponse.json({
          error: "Base64 image processing failed",
          details: `Failed to process Base64 image: ${base64Error instanceof Error ? base64Error.message : 'Unknown error'}`
        }, { status: 400 })
      }
    } else if (imageUrl) {
      // Validate and add user image URL
      console.log(`[Flux 2 Pro Edit Apply] Adding user image URL (@image1)...`)
      
      if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.trim()) {
        return NextResponse.json({
          error: "Invalid image URL",
          details: "Image URL is empty or invalid"
        }, { status: 400 })
      }
      
      // Basic URL validation
      try {
        new URL(imageUrl)
        allImageUrls.push(imageUrl)
        console.log(`[Flux 2 Pro Edit Apply] ✅ Added user image URL (@image1): ${imageUrl}`)
      } catch (urlError) {
        return NextResponse.json({
          error: "Invalid image URL format",
          details: `Invalid URL: ${imageUrl}`
        }, { status: 400 })
      }
    } else {
      return NextResponse.json({
        error: "No user image provided",
        details: "Please provide either imageUrl or base64Image"
      }, { status: 400 })
    }

    // SECOND: Upload style reference image (this will be @image2)
    console.log(`[Flux 2 Pro Edit Apply] Uploading style reference image (will be @image2)...`)
    
    const imagePath = STYLE_REFERENCE_IMAGES[0]
    const fullPath = path.join(process.cwd(), 'public', imagePath)
    
    try {
      console.log(`[Flux 2 Pro Edit Apply] Reading style reference: ${fullPath}`)
      
      // Read the file
      let imageBuffer = await fs.readFile(fullPath)
      
      // Resize reference image (second image, max 1 MP)
      imageBuffer = await resizeImageForFalAI(imageBuffer, false)
      
      // Upload as JPEG
      const mimeType = 'image/jpeg'
      const fileName = `style-ref.jpg`
      
      console.log(`[Flux 2 Pro Edit Apply] Uploading style reference: ${fileName} (${(imageBuffer.length / 1024).toFixed(1)} KB)`)
      
      const initiateResponse = await fetch('https://rest.alpha.fal.ai/storage/upload/initiate', {
        method: 'POST',
        headers: {
          'Authorization': `Key ${falApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content_type: mimeType,
          file_name: fileName
        })
      })
      
      if (!initiateResponse.ok) {
        throw new Error(`Failed to initiate upload: ${initiateResponse.status}`)
      }
      
      const { upload_url, file_url } = await initiateResponse.json()
      
      const uint8Array = new Uint8Array(imageBuffer)
      const putResponse = await fetch(upload_url, {
        method: 'PUT',
        headers: {
          'Content-Type': mimeType,
          'Content-Length': imageBuffer.length.toString()
        },
        body: uint8Array
      })
      
      if (!putResponse.ok) {
        throw new Error(`Failed to PUT file: ${putResponse.status}`)
      }
      
      console.log(`[Flux 2 Pro Edit Apply] ✅ Uploaded style reference (@image2): ${file_url}`)
      allImageUrls.push(file_url)
      
    } catch (uploadError) {
      console.error(`[Flux 2 Pro Edit Apply] Failed to upload style reference:`, uploadError)
      return NextResponse.json({
        error: "Failed to upload style reference image",
        details: `Failed to upload style reference: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`
      }, { status: 500 })
    }
    
    console.log(`[Flux 2 Pro Edit Apply] Total images: ${allImageUrls.length} (1 user + 1 style ref)`)

    // Prepare input for fal.ai
    const input: any = {
      prompt: prompt.trim() || DEFAULT_PROMPT,
      image_urls: allImageUrls,
      safety_tolerance: safetyToleranceStr,
      enable_safety_checker: enableSafetyChecker,
      output_format: outputFormat
    }
    
    // Add image_size
    if (typeof imageSize === 'object') {
      input.image_size = imageSize
    } else {
      input.image_size = imageSize
    }
    
    // Add seed if provided
    if (seed !== undefined) {
      input.seed = seed
    }

    // Configure Fal.ai client
    fal.config({
      credentials: falApiKey,
    })

    console.log("[Flux 2 Pro Edit Apply] Calling fal.ai...")
    console.log("[Flux 2 Pro Edit Apply] Input:", JSON.stringify({
      ...input,
      image_urls: `[${allImageUrls.length} URLs: 1 user + 1 style ref]`,
      prompt: input.prompt
    }, null, 2))

    try {
      const result = await fal.subscribe("fal-ai/flux-2-pro/edit", {
        input,
        logs: true,
        onQueueUpdate: (update) => {
          if (update.status === "IN_PROGRESS") {
            console.log("[Flux 2 Pro Edit Apply] Progress:", update.logs?.map(log => log.message).join(" ") || "Processing...")
          }
        }
      })

      console.log("[Flux 2 Pro Edit Apply] Generation successful")
      
      // Validate response
      if (!result.data || !result.data.images || !Array.isArray(result.data.images) || result.data.images.length === 0) {
        console.error("[Flux 2 Pro Edit Apply] Invalid response:", result)
        
        return NextResponse.json({
          error: "No images generated",
          details: "fal.ai API returned no images"
        }, { status: 500 })
      }

      console.log("[Flux 2 Pro Edit Apply] Generated", result.data.images.length, "images")

      // Process generated images
      const processedImages = []
      
      for (const img of result.data.images) {
        const originalImageUrl = img.url
        
        processedImages.push({
          url: originalImageUrl,
          width: img.width || 1024,
          height: img.height || 1024
        })
      }

      return NextResponse.json({
        success: true,
        images: processedImages,
        prompt: input.prompt,
        seed: result.data.seed,
        model: "fal-ai/flux-2-pro/edit",
        provider: "fal.ai",
        inputImages: allImageUrls.length,
        styleReferences: STYLE_REFERENCE_IMAGES.length,
        userImages: 1,
        settings: {
          image_size: input.image_size,
          safety_tolerance: safetyToleranceStr,
          enable_safety_checker: enableSafetyChecker,
          output_format: outputFormat
        },
        timestamp: new Date().toISOString()
      })

    } catch (falError) {
      console.error("[Flux 2 Pro Edit Apply] fal.ai API error:", falError)
      
      // Log full error for debugging
      if ((falError as any)?.body) {
        console.error("[Flux 2 Pro Edit Apply] Full error body:", JSON.stringify((falError as any).body, null, 2))
      }
      
      let errorMessage = "Failed to apply style with Flux 2 Pro"
      let errorDetails = falError instanceof Error ? falError.message : "Unknown error"
      
      // Extract validation errors
      if ((falError as any)?.body?.detail) {
        const details = (falError as any).body.detail
        if (Array.isArray(details) && details.length > 0) {
          errorDetails = details.map((d: any) => `${d.loc?.join('.')||'field'}: ${d.msg}`).join('; ')
        } else {
          errorDetails = (falError as any).body.detail
        }
      }
      
      return NextResponse.json({
        error: errorMessage,
        details: errorDetails,
        model: "fal-ai/flux-2-pro/edit",
        provider: "fal.ai",
        status: (falError as any)?.status
      }, { status: 500 })
    }

  } catch (error) {
    console.error("[Flux 2 Pro Edit Apply] Unexpected error:", error)
    console.error("[Flux 2 Pro Edit Apply] Error stack:", error instanceof Error ? error.stack : 'No stack trace')
    
    return NextResponse.json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
      stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}

/**
 * GET /api/external/flux-2-pro-edit-apply
 * 
 * Returns API documentation and usage information
 */
export async function GET() {
  return NextResponse.json({
    name: "FLUX.2 [pro] Style Apply API",
    description: "Apply TectonicaAI style to user images using 4 pre-loaded style references",
    version: "1.0.0",
    endpoint: "/api/external/flux-2-pro-edit-apply",
    method: "POST",
    contentType: "application/json",
    
    features: [
      "4 pre-loaded TectonicaAI style reference images",
      "Required: 1 user image to apply style to",
      "Total: 5 images (4 style refs + 1 user)",
      "Editable prompt with default: 'Make @image5 in the style of the other images.'",
      "Custom and preset sizes",
      "Configurable safety tolerance (1-5)",
      "JPEG or PNG output",
      "Seed support for reproducibility"
    ],
    
    styleReferences: {
      count: 4,
      location: "/public/tectonicaai-reference-images/",
      files: [
        "TCTAIFront01.png (index 0 = @image1)",
        "TCTAIFront03.png (index 1 = @image2)",
        "TCTAIFront11.png (index 2 = @image3)",
        "TCTAIFront18.png (index 3 = @image4)"
      ],
      note: "User image is automatically placed at index 4 (@image5)"
    },
    
    defaultPrompt: "Make @image5 in the style of the other images.",
    
    parameters: {
      prompt: {
        type: "string",
        required: false,
        description: "Custom prompt for image generation (uses default if not provided)",
        default: "Make @image5 in the style of the other images."
      },
      imageUrl: {
        type: "string",
        required: "one of imageUrl or base64Image",
        description: "User image URL (will be @image5)",
        alternative: "Can use base64Image instead"
      },
      base64Image: {
        type: "string",
        required: "one of imageUrl or base64Image",
        description: "User Base64 image (will be @image5)",
        alternative: "Can use imageUrl instead"
      },
      settings: {
        type: "object",
        required: false,
        properties: {
          image_size: {
            type: "string | object",
            options: ["auto", "square_hd", "square", "portrait_4_3", "portrait_16_9", "landscape_4_3", "landscape_16_9", "{width, height}"],
            default: "auto"
          },
          safety_tolerance: {
            type: "number",
            range: "1-5",
            default: 2,
            description: "Higher values allow more creative freedom"
          },
          enable_safety_checker: {
            type: "boolean",
            default: true
          },
          output_format: {
            type: "string",
            options: ["jpeg", "png"],
            default: "jpeg"
          },
          seed: {
            type: "number",
            required: false,
            description: "For reproducible results"
          }
        }
      }
    },
    
    response: {
      success: {
        success: true,
        images: [
          {
            url: "https://fal.ai/files/...",
            width: 1024,
            height: 1024
          }
        ],
        prompt: "Make @image5 in the style of the other images.",
        seed: 12345,
        model: "fal-ai/flux-2-pro/edit",
        provider: "fal.ai",
        inputImages: 5,
        styleReferences: 4,
        userImages: 1,
        settings: {},
        timestamp: "2025-12-24T00:00:00.000Z"
      },
      error: {
        error: "Error description",
        details: "Additional details"
      }
    },
    
    examples: {
      withUrl: {
        description: "Applying style to user image via URL (will be @image5)",
        request: {
          prompt: "Make @image5 in the style of the other images.",
          imageUrl: "https://example.com/my-image.jpg",
          settings: {
            image_size: "square_hd",
            output_format: "jpeg"
          }
        }
      },
      withBase64: {
        description: "Applying style to user Base64 image (will be @image5)",
        request: {
          prompt: "Transform @image5 to match @image1, @image2, @image3, and @image4 style",
          base64Image: "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
          settings: {
            image_size: { width: 1920, height: 1080 }
          }
        }
      },
      withCustomPrompt: {
        description: "Using custom prompt",
        request: {
          prompt: "Create a cohesive image set where @image5 adopts the visual language of the references",
          imageUrl: "https://example.com/my-image.jpg"
        }
      }
    },
    
    notes: [
      "Style reference images (indices 0-3) are always the same 4 TectonicaAI images",
      "User image must be provided (becomes index 4 = @image5)",
      "Prompt is editable with a sensible default",
      "Use @image1 through @image5 to reference specific images in your prompt",
      "Processing time: 15-30 seconds depending on image size",
      "Maximum total: 5 images (4 style refs + 1 user)",
      "All images automatically resized to 0.8 MP for optimal performance"
    ]
  })
}
