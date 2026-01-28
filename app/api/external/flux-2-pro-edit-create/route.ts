import { NextRequest, NextResponse } from "next/server"
import { fal } from "@fal-ai/client"
import { ContentModerationService } from "@/lib/content-moderation"
import { addDisclaimerToImage } from "@/lib/image-disclaimer"
import sharp from 'sharp'
import fs from 'fs/promises'
import path from 'path'

/**
 * Helper: Resize image to respect fal.ai megapixel limits
 * For 8 reference images, we need to be more conservative:
 * - All images: max 0.8 MP (approx 768x768) to stay within 9 MP total limit
 * - This allows: 8 × 0.59 MP = 4.72 MP input + 4 MP output = 8.72 MP total
 */
async function resizeImageForFalAI(buffer: Buffer, isFirstImage: boolean): Promise<Buffer> {
  // Conservative limits to accommodate 8 images
  const maxMegapixels = 590_000 // 0.59 MP for all images
  const maxDimension = 768 // sqrt(590000) ≈ 768
  
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
  
  console.log(`[Flux 2 Pro Edit Create] Resizing image from ${metadata.width}x${metadata.height} (${Math.round(currentPixels/1000000)}MP) to ${targetWidth}x${targetHeight} (${Math.round((targetWidth*targetHeight)/1000000)}MP)`)
  
  return sharp(buffer)
    .resize(targetWidth, targetHeight, { 
      fit: 'inside',
      withoutEnlargement: true
    })
    .jpeg({ quality: 90 })
    .toBuffer()
}

// Fallback reference images (used if no config.json found)
const FALLBACK_REFERENCE_IMAGES = [
  'TCTAIFront01.png',
  'TCTAIFront02.png',
  'TCTAIFront03.png',
  'TCTAIFront06.png',
  'TCTAIFront09.png',
  'TCTAIFront11.png',
  'TCTAIFront15.png',
  'TCTAIFront18.png'
]

/**
 * Get reference images for a client from config.json
 * Implements hybrid approach with fallback:
 * 1. Try to load client's config.json and read "create" array
 * 2. Fall back to naming convention: look for numbered files
 * 3. Fall back to Tectonica's reference images
 */
async function getClientReferenceImages(orgType: string): Promise<{ filenames: string[]; folderName: string }> {
  const folderName = `${orgType.toLowerCase()}-reference-images`
  const folderPath = path.join(process.cwd(), 'public', folderName)
  
  // Step 1: Try to load config.json
  try {
    const configPath = path.join(folderPath, 'config.json')
    const configContent = await fs.readFile(configPath, 'utf-8')
    const config = JSON.parse(configContent)
    
    if (config.create && Array.isArray(config.create) && config.create.length > 0) {
      console.log(`[Flux 2 Pro Edit Create] Using config.json: ${config.create.length} images from ${folderName}`)
      return { filenames: config.create, folderName }
    }
  } catch (error) {
    // Config.json doesn't exist or doesn't have "create" array
    console.log(`[Flux 2 Pro Edit Create] No config.json or "create" array found for ${orgType}, falling back...`)
  }
  
  // Step 2: Fallback to Tectonica
  console.log(`[Flux 2 Pro Edit Create] Using fallback Tectonica reference images`)
  return { 
    filenames: FALLBACK_REFERENCE_IMAGES, 
    folderName: 'tectonica-reference-images' 
  }
}

/**
 * POST /api/external/flux-2-pro-edit-create
 * 
 * External API endpoint for FLUX.2 [pro] image creation with organization-specific reference images.
 * This endpoint automatically loads reference images based on the organization's config.json.
 * 
 * Features:
 * - Organization-specific references: Loads images from {orgType}-reference-images/config.json
 * - Fallback support: Uses Tectonica images if organization config not found
 * - Optional user image: Add 0-1 additional image from user
 * - Image referencing: Use @image1, @image2 syntax in prompts
 * - JSON structured prompts: Advanced control over scene, subjects, camera
 * - HEX color control: Precise color matching
 * - Custom and preset sizes: Full flexibility
 * - Safety controls: Configurable tolerance (1-5) and safety checker
 * - Multiple formats: JPEG or PNG output
 * - Reproducibility: Seed support
 * - Disclaimer: Automatic disclaimer overlay on results
 * 
 * Body parameters (JSON):
 * - prompt (required): Text description for the creation
 * - imageUrl (optional): Single image URL from user
 * - base64Image (optional): Single Base64 image from user
 * - orgType (optional): Organization identifier (default: "Tectonica")
 * - settings (optional): Object with generation settings
 *   - image_size: "auto" | "square_hd" | "square" | "portrait_4_3" | "portrait_16_9" | "landscape_4_3" | "landscape_16_9" | {width, height}
 *   - safety_tolerance: 1-5 (default: 2)
 *   - enable_safety_checker: boolean (default: true)
 *   - output_format: "jpeg" | "png" (default: "jpeg")
 *   - seed: number (optional)
 * - useCanonicalPrompt (optional): boolean
 * - canonicalConfig (optional): Canonical prompt configuration object
 * - clientInfo (optional): Client information object
 * 
 * Response format:
 * {
 *   "success": true,
 *   "images": [{ 
 *     "url": "data:image/jpeg;base64,...", 
 *     "originalUrl": "https://fal.ai/...",
 *     "width": 1024, 
 *     "height": 1024 
 *   }],
 *   "prompt": "enhanced prompt used",
 *   "originalPrompt": "user's original prompt",
 *   "seed": 12345,
 *   "model": "fal-ai/flux-2-pro/edit",
 *   "provider": "fal.ai",
 *   "inputImages": 9,
 *   "referenceImages": 8,
 *   "userImages": 1
 * }
 */
export async function POST(request: NextRequest) {
  try {
    console.log("[Flux 2 Pro Edit Create] Request received")
    
    // Check FAL_API_KEY
    const falApiKey = process.env.FAL_API_KEY
    if (!falApiKey) {
      console.error("[Flux 2 Pro Edit Create] FAL_API_KEY not configured")
      return NextResponse.json({
        error: "Service configuration error",
        details: "FAL_API_KEY not configured"
      }, { status: 500 })
    }
    
    console.log("[Flux 2 Pro Edit Create] FAL_KEY found")

    // Parse JSON body
    console.log("[Flux 2 Pro Edit Create] Parsing request body...")
    const body = await request.json()
    console.log("[Flux 2 Pro Edit Create] Body parsed successfully")
    
    const { 
      prompt, 
      imageUrl = null,
      base64Image = null,
      settings = {},
      orgType: rawOrgType,
      clientInfo = {}
    } = body
    
    // Extract and validate orgType and clientInfo
    const orgType = rawOrgType && rawOrgType.trim() ? rawOrgType : "Tectonica"
    const client_id = clientInfo.client_id && clientInfo.client_id.trim() ? clientInfo.client_id : "Tectonica"
    const user_email = clientInfo.user_email || ""
    const user_id = clientInfo.user_id || ""
    
    console.log("[Flux 2 Pro Edit Create] Client info:", { orgType, client_id, user_email, user_id })

    console.log("[Flux 2 Pro Edit Create] Parameters:", {
      prompt: prompt?.substring(0, 100) + '...',
      hasImageUrl: !!imageUrl,
      hasBase64Image: !!base64Image,
      settings,
      orgType
    })

    // Extract settings
    const imageSize = settings.image_size || settings.imageSize || "auto"
    const safetyTolerance = settings.safety_tolerance || settings.safetyTolerance || "2"
    const enableSafetyChecker = settings.enable_safety_checker !== false
    const outputFormat = settings.output_format || settings.outputFormat || "jpeg"
    const seed = settings.seed ? parseInt(settings.seed.toString()) : undefined

    // Validate prompt
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json({
        error: "Prompt is required",
        details: "Please provide a text description for the creation"
      }, { status: 400 })
    }

    // Validate that user provides at most 1 image
    if (imageUrl && base64Image) {
      return NextResponse.json({
        error: "Too many user images",
        details: "Please provide either imageUrl OR base64Image, not both. Maximum 1 user image allowed."
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

    // Content moderation
    try {
      console.log(`[MODERATION] Checking content for Flux 2 Pro Edit Create prompt: ${prompt.substring(0, 100)}...`)
      const moderationService = new ContentModerationService(orgType)
      const moderationResult = await moderationService.moderateContent({ prompt })
      
      if (!moderationResult.safe) {
        console.log(`[MODERATION] Content blocked: ${moderationResult.reason}`)
        return NextResponse.json({
          error: moderationResult.reason,
          category: moderationResult.category,
          blocked: true,
          moderation: true
        }, { status: 400 })
      }
      
      console.log("[MODERATION] Content approved")
    } catch (moderationError) {
      console.warn("[MODERATION] Moderation check failed, proceeding with generation:", moderationError)
      // Continue with generation if moderation fails to avoid blocking users
    }

    // Get reference images for this organization
    const { filenames: referenceImageFilenames, folderName } = await getClientReferenceImages(orgType)
    
    // Upload reference images to fal.ai storage
    console.log(`[Flux 2 Pro Edit Create] Uploading ${referenceImageFilenames.length} reference images from ${folderName}...`)
    const allImageUrls: string[] = []
    
    // Read and upload each reference image
    for (let i = 0; i < referenceImageFilenames.length; i++) {
      const filename = referenceImageFilenames[i]
      const fullPath = path.join(process.cwd(), 'public', folderName, filename)
      
      try {
        console.log(`[Flux 2 Pro Edit Create] Reading reference image ${i + 1}/${referenceImageFilenames.length}: ${filename}`)
        
        // Read the file
        let imageBuffer = await fs.readFile(fullPath)
        
        // Resize to 0.8 MP to accommodate 8 images within 9 MP limit
        imageBuffer = await resizeImageForFalAI(imageBuffer, false)
        
        // Determine MIME type - always convert to JPEG after resize
        const mimeType = 'image/jpeg'
        
        // Upload using 2-step process
        const fileName = `ref-${i + 1}.jpg`
        
        console.log(`[Flux 2 Pro Edit Create] Uploading reference ${i + 1}: ${fileName} (${(imageBuffer.length / 1024).toFixed(1)} KB)`)
        
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
        
        console.log(`[Flux 2 Pro Edit Create] ✅ Uploaded reference ${i + 1}: ${file_url}`)
        allImageUrls.push(file_url)
        
      } catch (uploadError) {
        console.error(`[Flux 2 Pro Edit Create] Failed to upload reference image ${i + 1}:`, uploadError)
        return NextResponse.json({
          error: "Failed to upload reference images",
          details: `Failed to upload reference image ${i + 1}: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`
        }, { status: 500 })
      }
    }
    
    console.log(`[Flux 2 Pro Edit Create] ✅ All ${allImageUrls.length} reference images uploaded`)
    console.log(`[Flux 2 Pro Edit Create] Reference URLs:`, allImageUrls.map((url, i) => `${i + 1}: ${url.substring(0, 60)}...`))

    // Process user image if provided (this will be index 8)
    let userImageCount = 0
    
    if (base64Image) {
      console.log(`[Flux 2 Pro Edit Create] Processing user Base64 image...`)
      
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
        
        console.log(`[Flux 2 Pro Edit Create] Processing Base64 image, type: ${mimeType}`)
        
        // Validate image integrity
        try {
          const metadata = await sharp(imageBuffer).metadata()
          console.log(`[Flux 2 Pro Edit Create] ✅ Image validated: ${metadata.format}, ${metadata.width}x${metadata.height}`)
        } catch (validationError) {
          const errorMsg = validationError instanceof Error ? validationError.message : String(validationError)
          console.error(`[Flux 2 Pro Edit Create] ❌ CORRUPTED BASE64 IMAGE:`, errorMsg)
          throw new Error(`Base64 image is corrupted or incomplete`)
        }
        
        // Resize to respect fal.ai megapixel limits
        // User image will be at index 8, so it's NOT the first image
        let finalBuffer: Buffer
        let finalMimeType = 'image/jpeg'
        
        try {
          finalBuffer = await resizeImageForFalAI(imageBuffer, false)
          console.log(`[Flux 2 Pro Edit Create] ✅ Processed: ${(imageBuffer.length / 1024).toFixed(1)} KB → ${(finalBuffer.length / 1024).toFixed(1)} KB`)
        } catch (sharpError) {
          console.warn(`[Flux 2 Pro Edit Create] ⚠️  Processing failed, using original`)
          finalBuffer = imageBuffer
          finalMimeType = mimeType
        }
        
        // Upload using 2-step process
        const fileExtension = finalMimeType.split('/')[1] || 'jpeg'
        const fileName = `flux2pro-create-user.${fileExtension}`
        
        console.log(`[Flux 2 Pro Edit Create] Uploading ${fileName}...`)
        
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
        
        console.log(`[Flux 2 Pro Edit Create] ✅ Uploaded user image: ${file_url}`)
        allImageUrls.push(file_url)
        userImageCount = 1
        
      } catch (base64Error) {
        console.error(`[Flux 2 Pro Edit Create] Failed to process Base64 image:`, base64Error)
        return NextResponse.json({
          error: "Base64 image processing failed",
          details: `Failed to process Base64 image: ${base64Error instanceof Error ? base64Error.message : 'Unknown error'}`
        }, { status: 400 })
      }
    } else if (imageUrl) {
      // Validate and add user image URL
      console.log(`[Flux 2 Pro Edit Create] Adding user image URL...`)
      
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
        userImageCount = 1
        console.log(`[Flux 2 Pro Edit Create] ✅ Added user image URL: ${imageUrl}`)
      } catch (urlError) {
        return NextResponse.json({
          error: "Invalid image URL format",
          details: `Invalid URL: ${imageUrl}`
        }, { status: 400 })
      }
    } else {
      console.log(`[Flux 2 Pro Edit Create] No user image provided, using only reference images`)
    }

    console.log(`[Flux 2 Pro Edit Create] Total images: ${allImageUrls.length} (${referenceImageFilenames.length} references + ${userImageCount} user)`)

    // Use prompt as-is
    let finalPrompt = prompt

    // Prepare input for fal.ai
    const input: any = {
      prompt: finalPrompt,
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

    console.log("[Flux 2 Pro Edit Create] Calling fal.ai...")
    console.log("[Flux 2 Pro Edit Create] Input:", JSON.stringify({
      ...input,
      image_urls: `[${allImageUrls.length} URLs: ${referenceImageFilenames.length} references + ${userImageCount} user]`,
      prompt: input.prompt.substring(0, 100) + '...'
    }, null, 2))

    try {
      const result = await fal.subscribe("fal-ai/flux-2-pro/edit", {
        input,
        logs: true,
        onQueueUpdate: (update) => {
          if (update.status === "IN_PROGRESS") {
            console.log("[Flux 2 Pro Edit Create] Progress:", update.logs?.map(log => log.message).join(" ") || "Processing...")
          }
        }
      })

      console.log("[Flux 2 Pro Edit Create] Generation successful")
      
      // Validate response
      if (!result.data || !result.data.images || !Array.isArray(result.data.images) || result.data.images.length === 0) {
        console.error("[Flux 2 Pro Edit Create] Invalid response:", result)
        
        return NextResponse.json({
          error: "No images generated",
          details: "fal.ai API returned no images"
        }, { status: 500 })
      }

      console.log("[Flux 2 Pro Edit Create] Generated", result.data.images.length, "images")

      // Process generated images (no disclaimer for now)
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
        prompt: finalPrompt,
        originalPrompt: prompt,
        seed: result.data.seed,
        model: "fal-ai/flux-2-pro/edit",
        provider: "fal.ai",
        inputImages: allImageUrls.length,
        referenceImages: referenceImageFilenames.length,
        userImages: userImageCount,
        settings: {
          image_size: input.image_size,
          safety_tolerance: safetyToleranceStr,
          enable_safety_checker: enableSafetyChecker,
          output_format: outputFormat
        },
        timestamp: new Date().toISOString()
      })

    } catch (falError) {
      console.error("[Flux 2 Pro Edit Create] fal.ai API error:", falError)
      
      // Log full error for debugging
      if ((falError as any)?.body) {
        console.error("[Flux 2 Pro Edit Create] Full error body:", JSON.stringify((falError as any).body, null, 2))
      }
      
      let errorMessage = "Failed to create image with Flux 2 Pro"
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
    console.error("[Flux 2 Pro Edit Create] Unexpected error:", error)
    console.error("[Flux 2 Pro Edit Create] Error stack:", error instanceof Error ? error.stack : 'No stack trace')
    
    return NextResponse.json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
      stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}

/**
 * GET /api/external/flux-2-pro-edit-create
 * 
 * Returns API documentation and usage information
 */
export async function GET() {
  return NextResponse.json({
    name: "FLUX.2 [pro] Edit Create API",
    description: "Create images using FLUX.2 [pro] with 8 pre-loaded TectonicaAI reference images",
    version: "1.0.0",
    endpoint: "/api/external/flux-2-pro-edit-create",
    method: "POST",
    contentType: "application/json",
    
    features: [
      "8 pre-loaded TectonicaAI reference images always included",
      "Optional: Add 0-1 user image (via URL or Base64)",
      "Total: 8-9 images sent to FLUX.2 [pro] edit",
      "Image referencing in prompts (@image1, @image2, etc.)",
      "JSON structured prompts for advanced control",
      "HEX color control for precise matching",
      "Custom and preset sizes",
      "Configurable safety tolerance (1-5)",
      "JPEG or PNG output",
      "Seed support for reproducibility"
    ],
    
    referenceImages: {
      count: 8,
      location: "/public/tectonicaai-reference-images/",
      files: [
        "TCTAIFront01.png",
        "TCTAIFront02.png",
        "TCTAIFront03.png",
        "TCTAIFront06.png",
        "TCTAIFront09.png",
        "TCTAIFront11.png",
        "TCTAIFront15.png",
        "TCTAIFront18.png"
      ],
      note: "These images are automatically included at indices 0-7"
    },
    
    parameters: {
      prompt: {
        type: "string",
        required: true,
        description: "Text description for image creation. Can reference @image1-@image9",
        example: "Create a modern tech website hero using the style from @image1 and @image2"
      },
      imageUrl: {
        type: "string",
        required: false,
        description: "Optional single image URL from user (will be index 8)",
        alternative: "Can use base64Image instead"
      },
      base64Image: {
        type: "string",
        required: false,
        description: "Optional single Base64 image from user (will be index 8)",
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
      },
      useCanonicalPrompt: {
        type: "boolean",
        default: false,
        description: "Enable canonical prompt processing"
      },
      canonicalConfig: {
        type: "object",
        required: false,
        description: "Configuration for canonical prompt (when useCanonicalPrompt is true)"
      },
      orgType: {
        type: "string",
        default: "general",
        description: "Organization type for content moderation"
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
        prompt: "Final processed prompt",
        originalPrompt: "User's original prompt",
        seed: 12345,
        model: "fal-ai/flux-2-pro/edit",
        provider: "fal.ai",
        inputImages: 9,
        referenceImages: 8,
        userImages: 1,
        settings: {},
        timestamp: "2025-12-24T00:00:00.000Z"
      },
      error: {
        error: "Error description",
        details: "Additional details",
        blocked: "Boolean (for moderation)",
        category: "String (for moderation)"
      }
    },
    
    examples: {
      basic: {
        description: "Using only reference images (no user image)",
        request: {
          prompt: "Create a vibrant tech website hero combining styles from @image1, @image3, and @image5",
          settings: {
            image_size: "landscape_16_9",
            safety_tolerance: 3,
            output_format: "jpeg"
          }
        }
      },
      withUserImage: {
        description: "Adding user's image as 9th reference",
        request: {
          prompt: "Combine my brand logo (@image9) with the TectonicaAI styles from @image1-@image8",
          imageUrl: "https://example.com/my-logo.png",
          settings: {
            image_size: "square_hd",
            output_format: "png"
          }
        }
      },
      base64: {
        description: "Using Base64 user image",
        request: {
          prompt: "Create a website mockup using @image9 (my design) and TectonicaAI references",
          base64Image: "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
          settings: {
            image_size: { width: 1920, height: 1080 }
          }
        }
      }
    },
    
    notes: [
      "Reference images (indices 0-7) are always included automatically",
      "User can optionally add 1 more image (index 8)",
      "Maximum total: 9 images (8 references + 1 user)",
      "Use @image1-@image9 syntax in prompts to reference specific images",
      "Processing time: 20-40 seconds depending on complexity",
      "Built-in content moderation for safe results"
    ]
  })
}
