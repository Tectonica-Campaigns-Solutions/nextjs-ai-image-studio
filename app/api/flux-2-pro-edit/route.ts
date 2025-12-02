import { NextRequest, NextResponse } from "next/server"
import { fal } from "@fal-ai/client"
import { ContentModerationService } from "@/lib/content-moderation"
import { canonicalPromptProcessor, type CanonicalPromptConfig } from "@/lib/canonical-prompt"
import { addDisclaimerToImage } from "@/lib/image-disclaimer"
import sharp from 'sharp'

/**
 * Helper: Resize image to respect fal.ai megapixel limits
 * First image: max 4 MP (2048x2048)
 * Subsequent images: max 1 MP (1024x1024)
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
  
  console.log(`[Flux 2 Pro Edit] Resizing image from ${metadata.width}x${metadata.height} (${Math.round(currentPixels/1000000)}MP) to ${targetWidth}x${targetHeight} (${Math.round((targetWidth*targetHeight)/1000000)}MP)`)
  
  return sharp(buffer)
    .resize(targetWidth, targetHeight, { 
      fit: 'inside',
      withoutEnlargement: true
    })
    .jpeg({ quality: 90 })
    .toBuffer()
}

/**
 * POST /api/flux-2-pro-edit
 * 
 * Internal API endpoint for FLUX.2 [pro] image editing with multi-reference support.
 * Production-grade image editing optimized for speed and reliability.
 * 
 * Features:
 * - Multi-image editing: Up to 9 reference images (9 MP total input)
 * - Image referencing: Use @image1, @image2 syntax or "image 1", "image 2" in prompts
 * - JSON structured prompts: Advanced control over scene, subjects, camera, etc.
 * - HEX color control: Precise color matching with #HEX codes
 * - Custom and preset sizes: Full flexibility in output dimensions
 * - Safety controls: Configurable safety tolerance (1-5) and safety checker
 * - Multiple formats: JPEG or PNG output
 * - Reproducibility: Seed support for consistent results
 * 
 * Body parameters (multipart/form-data or JSON):
 * - prompt (required): Text description for the edit
 * - image0, image1, ..., image8 (FormData): Up to 9 image files
 * - imageUrl0, imageUrl1, ..., imageUrl8 (FormData): Up to 9 image URLs
 * - imageUrls (JSON): Array of image URLs
 * - base64Images (JSON): Array of Base64 images
 * - settings (optional): JSON string with generation settings
 *   - image_size: "auto" | "square_hd" | "square" | "portrait_4_3" | "portrait_16_9" | "landscape_4_3" | "landscape_16_9" (default: "auto")
 *   - custom_width: number (512-2048, required if image_size is custom object)
 *   - custom_height: number (512-2048, required if image_size is custom object)
 *   - safety_tolerance: 1-5 (1=strict, 5=permissive, default: 2)
 *   - enable_safety_checker: boolean (default: true)
 *   - output_format: "jpeg" | "png" (default: "jpeg")
 *   - seed: number (optional, for reproducibility)
 * - useCanonicalPrompt (optional): boolean (enable canonical prompt processing)
 * - canonicalConfig (optional): JSON string with canonical prompt configuration
 * - orgType (optional): Organization type for moderation (default: general)
 * 
 * Response format:
 * {
 *   "success": true,
 *   "images": [{ "url": "base64...", "width": 1024, "height": 1024 }],
 *   "originalImageUrl": "https://...",
 *   "prompt": "enhanced prompt used",
 *   "originalPrompt": "user's original prompt",
 *   "seed": 12345,
 *   "model": "fal-ai/flux-2-pro/edit",
 *   "inputImages": 2,
 *   "settings": {...}
 * }
 */
export async function POST(request: NextRequest) {
  try {
    console.log("[Flux 2 Pro Edit] Request received")
    
    // Check Content-Type to determine if JSON or FormData
    const contentType = request.headers.get('content-type') || ''
    const isJSON = contentType.includes('application/json')
    
    console.log(`[Flux 2 Pro Edit] Content-Type: ${contentType}, isJSON: ${isJSON}`)
    
    let prompt: string
    let orgType: string
    let settings: any = {}
    let useCanonicalPrompt = false
    let canonicalConfig: CanonicalPromptConfig | undefined
    let imageFiles: File[] = []
    let imageUrls: string[] = []
    let base64Images: string[] = []
    
    if (isJSON) {
      // JSON payload (for large Base64 images)
      console.log("[Flux 2 Pro Edit] 📦 Processing JSON payload")
      
      const jsonBody = await request.json()
      
      prompt = jsonBody.prompt
      orgType = jsonBody.orgType || "general"
      settings = jsonBody.settings || {}
      useCanonicalPrompt = jsonBody.useCanonicalPrompt === true || jsonBody.useCanonicalPrompt === "true"
      
      if (jsonBody.canonicalConfig) {
        canonicalConfig = jsonBody.canonicalConfig
      }
      
      // Extract image URLs and Base64 from JSON
      if (jsonBody.imageUrls && Array.isArray(jsonBody.imageUrls)) {
        imageUrls = jsonBody.imageUrls.filter((url: string) => url && url.trim())
        console.log(`[Flux 2 Pro Edit] Found ${imageUrls.length} image URLs in JSON`)
      }
      
      if (jsonBody.base64Images && Array.isArray(jsonBody.base64Images)) {
        base64Images = jsonBody.base64Images.filter((b64: string) => b64 && b64.trim())
        console.log(`[Flux 2 Pro Edit] Found ${base64Images.length} Base64 images in JSON`)
        
        // Log sizes to verify no truncation
        base64Images.forEach((b64, i) => {
          console.log(`[Flux 2 Pro Edit] JSON Base64 image ${i + 1}: ${b64.length} chars (${(b64.length / 1024 / 1024).toFixed(2)} MB)`)
        })
      }
      
    } else {
      // FormData payload
      console.log("[Flux 2 Pro Edit] 📦 Processing FormData payload")
      
      const formData = await request.formData()
      
      // Extract parameters
      prompt = formData.get("prompt") as string
      orgType = formData.get("orgType") as string || "general"
      
      // Parse settings
      const settingsStr = formData.get("settings") as string
      if (settingsStr) {
        try {
          settings = JSON.parse(settingsStr)
        } catch (error) {
          console.warn("[Flux 2 Pro Edit] Failed to parse settings:", error)
        }
      }

      // Canonical Prompt parameters
      useCanonicalPrompt = formData.get("useCanonicalPrompt") === "true"
      const canonicalConfigStr = formData.get("canonicalConfig") as string
      if (canonicalConfigStr) {
        try {
          canonicalConfig = JSON.parse(canonicalConfigStr)
        } catch (error) {
          console.warn("[Flux 2 Pro Edit] Failed to parse canonical config:", error)
        }
      }
      
      // Get image files (image0, image1, ..., image8)
      for (let i = 0; i < 9; i++) {
        const fileKey = `image${i}`
        const file = formData.get(fileKey) as File | null
        if (file && file.size > 0) {
          imageFiles.push(file)
          console.log(`[Flux 2 Pro Edit] Found image file: ${fileKey}, size: ${file.size}, type: ${file.type}`)
        }
        
        const urlKey = `imageUrl${i}`
        const url = formData.get(urlKey) as string | null
        if (url && url.trim()) {
          imageUrls.push(url.trim())
          console.log(`[Flux 2 Pro Edit] Found image URL: ${urlKey}, url: ${url}`)
        }
        
        const base64Key = `imageBase64${i}`
        const base64 = formData.get(base64Key) as string | null
        if (base64 && base64.trim()) {
          base64Images.push(base64.trim())
          console.log(`[Flux 2 Pro Edit] Found Base64 image: ${base64Key}, length: ${base64.length} chars`)
        }
      }
    }
    
    console.log("[Flux 2 Pro Edit] Canonical prompt parameters:")
    console.log("  - useCanonicalPrompt:", useCanonicalPrompt)
    console.log("  - canonicalConfig:", JSON.stringify(canonicalConfig, null, 2))
    
    // Extract settings
    const imageSize = settings.image_size || settings.imageSize || "auto"
    const customWidth = settings.custom_width ? parseInt(settings.custom_width.toString()) : undefined
    const customHeight = settings.custom_height ? parseInt(settings.custom_height.toString()) : undefined
    const safetyTolerance = settings.safety_tolerance || settings.safetyTolerance || "2"
    const enableSafetyChecker = settings.enable_safety_checker !== false
    const outputFormat = settings.output_format || settings.outputFormat || "jpeg"
    const seed = settings.seed ? parseInt(settings.seed.toString()) : undefined

    // Validate prompt
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json({
        error: "Prompt is required",
        details: "Please provide a text description for the edit"
      }, { status: 400 })
    }

    // Validate image_size
    const validImageSizes = ["auto", "square_hd", "square", "portrait_4_3", "portrait_16_9", "landscape_4_3", "landscape_16_9", "custom"]
    const imageSizeStr = typeof imageSize === 'string' ? imageSize : 'custom'
    
    if (!validImageSizes.includes(imageSizeStr)) {
      return NextResponse.json({
        error: "Invalid image_size",
        details: `image_size must be one of: ${validImageSizes.filter(s => s !== 'custom').join(', ')}, or a custom object with width and height`
      }, { status: 400 })
    }
    
    // Validate custom dimensions if image_size is custom object
    if (typeof imageSize === 'object' || imageSizeStr === 'custom') {
      const width = typeof imageSize === 'object' ? imageSize.width : customWidth
      const height = typeof imageSize === 'object' ? imageSize.height : customHeight
      
      if (!width || !height) {
        return NextResponse.json({
          error: "Custom dimensions required",
          details: "When image_size is custom, both width and height must be provided"
        }, { status: 400 })
      }
      
      // Validate dimension ranges (512-2048 pixels)
      if (width < 512 || width > 2048 || height < 512 || height > 2048) {
        return NextResponse.json({
          error: "Invalid custom dimensions",
          details: "Width and height must be between 512 and 2048 pixels"
        }, { status: 400 })
      }
    }
    
    // Validate safety_tolerance
    const validSafetyTolerances = ["1", "2", "3", "4", "5"]
    const safetyToleranceStr = safetyTolerance.toString()
    if (!validSafetyTolerances.includes(safetyToleranceStr)) {
      return NextResponse.json({
        error: "Invalid safety_tolerance",
        details: "safety_tolerance must be between 1 (strict) and 5 (permissive)"
      }, { status: 400 })
    }
    
    // Validate output_format
    const validOutputFormats = ["jpeg", "png"]
    if (!validOutputFormats.includes(outputFormat)) {
      return NextResponse.json({
        error: "Invalid output_format",
        details: `output_format must be one of: ${validOutputFormats.join(', ')}`
      }, { status: 400 })
    }

    // Check if Fal.ai API key is available
    const falApiKey = process.env.FAL_API_KEY
    if (!falApiKey) {
      return NextResponse.json({
        error: "FAL_API_KEY not configured",
        details: "FAL API key is required for Flux 2 Pro image editing"
      }, { status: 500 })
    }

    console.log("[Flux 2 Pro Edit] Fal API Key exists:", !!falApiKey)
    
    // Configure fal.ai client with API key
    fal.config({
      credentials: falApiKey,
    })

    console.log("[Flux 2 Pro Edit] Parameters:", {
      prompt: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
      imageSize: imageSizeStr,
      safetyTolerance,
      enableSafetyChecker,
      outputFormat,
      seed: seed || 'auto',
      orgType
    })

    // Validate that we have at least 1 image (max 9)
    const totalImages = imageFiles.length + imageUrls.length + base64Images.length
    if (totalImages === 0) {
      return NextResponse.json({
        error: "At least one image required",
        details: "Flux 2 Pro Edit requires at least 1 image (maximum 9 images)"
      }, { status: 400 })
    }
    
    if (totalImages > 9) {
      return NextResponse.json({
        error: "Too many images",
        details: `Found ${totalImages} images. Flux 2 Pro Edit supports a maximum of 9 images (9 MP total)`
      }, { status: 400 })
    }

    // Content moderation check
    try {
      console.log("[MODERATION] Checking content for Flux 2 Pro Edit prompt:", prompt.substring(0, 50) + "...")
      const moderationService = new ContentModerationService(orgType)
      const moderationResult = await moderationService.moderateContent({ prompt })
      
      if (!moderationResult.safe) {
        console.log("[MODERATION] Content blocked:", moderationResult.reason)
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

    // Process images - upload files to fal.ai storage or use provided URLs
    const allImageUrls: string[] = [...imageUrls]
    
    // Process Base64 images first
    if (base64Images.length > 0) {
      console.log(`[Flux 2 Pro Edit] Processing ${base64Images.length} Base64 images...`)
      
      for (let i = 0; i < base64Images.length; i++) {
        const base64Data = base64Images[i]
        const isFirstImage = allImageUrls.length === 0
        
        try {
          // Parse Base64 data URL or raw Base64
          let imageBuffer: Buffer
          let mimeType = 'image/jpeg' // Default
          
          if (base64Data.startsWith('data:')) {
            // Extract MIME type and Base64 data from data URL
            const matches = base64Data.match(/^data:([^;]+);base64,(.+)$/)
            if (!matches) {
              throw new Error(`Invalid Base64 data URL format for image ${i + 1}`)
            }
            mimeType = matches[1]
            const base64String = matches[2]
            imageBuffer = Buffer.from(base64String, 'base64')
          } else {
            // Raw Base64 string
            imageBuffer = Buffer.from(base64Data, 'base64')
          }
          
          // Normalize MIME type
          if (mimeType === 'image/jpg') {
            mimeType = 'image/jpeg'
          }
          
          console.log(`[Flux 2 Pro Edit] Processing Base64 image ${i + 1}/${base64Images.length}, type: ${mimeType}`)
          
          // Validate image integrity
          try {
            const metadata = await sharp(imageBuffer).metadata()
            console.log(`[Flux 2 Pro Edit] ✅ Image validated: ${metadata.format}, ${metadata.width}x${metadata.height}`)
          } catch (validationError) {
            const errorMsg = validationError instanceof Error ? validationError.message : String(validationError)
            console.error(`[Flux 2 Pro Edit] ❌ CORRUPTED BASE64 IMAGE DETECTED:`, errorMsg)
            throw new Error(`Base64 image ${i + 1} is corrupted or incomplete. Error: ${errorMsg}`)
          }
          
          // Resize to respect fal.ai megapixel limits
          let finalBuffer: Buffer
          let finalMimeType = 'image/jpeg'
          
          try {
            finalBuffer = await resizeImageForFalAI(imageBuffer, isFirstImage)
            console.log(`[Flux 2 Pro Edit] ✅ Processed: ${(imageBuffer.length / 1024 / 1024).toFixed(2)} MB → ${(finalBuffer.length / 1024 / 1024).toFixed(2)} MB`)
          } catch (sharpError: unknown) {
            console.warn(`[Flux 2 Pro Edit] ⚠️  Image processing failed, using original`)
            finalBuffer = imageBuffer
            finalMimeType = mimeType
          }
          
          // Upload using 2-step process: initiate → PUT
          const fileExtension = finalMimeType.split('/')[1] || 'jpeg'
          const fileName = `flux2pro-edit-image-${i + 1}.${fileExtension}`
          
          console.log(`[Flux 2 Pro Edit] Uploading ${fileName}: ${finalBuffer.length} bytes`)
          
          // Step 1: Initiate upload
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
            const errorText = await initiateResponse.text()
            throw new Error(`Failed to initiate upload: ${initiateResponse.status} - ${errorText}`)
          }
          
          const { upload_url, file_url } = await initiateResponse.json()
          
          // Step 2: PUT the file
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
            const errorText = await putResponse.text()
            throw new Error(`Failed to PUT file: ${putResponse.status} - ${errorText}`)
          }
          
          console.log(`[Flux 2 Pro Edit] ✅ Uploaded successfully: ${file_url}`)
          allImageUrls.push(file_url)
          
        } catch (base64Error) {
          console.error(`[Flux 2 Pro Edit] Failed to process Base64 image ${i + 1}:`, base64Error)
          return NextResponse.json({
            error: "Base64 image processing failed",
            details: `Failed to process Base64 image ${i + 1}: ${base64Error instanceof Error ? base64Error.message : 'Unknown error'}`
          }, { status: 400 })
        }
      }
    }
    
    // Upload File objects
    if (imageFiles.length > 0) {
      console.log("[Flux 2 Pro Edit] Uploading files to fal.ai storage...")
      
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i]
        const isFirstImage = allImageUrls.length === 0
        
        try {
          // Validate file type
          if (!file.type.startsWith('image/')) {
            return NextResponse.json({
              error: "Invalid file type",
              details: `File ${file.name} is not an image. Only image files are allowed.`
            }, { status: 400 })
          }

          // Validate file size (10MB limit)
          const maxSize = 10 * 1024 * 1024 // 10MB
          if (file.size > maxSize) {
            return NextResponse.json({
              error: "File too large",
              details: `File ${file.name} is ${Math.round(file.size / 1024 / 1024)}MB. Maximum size is 10MB.`
            }, { status: 400 })
          }

          // Convert file to buffer and resize if needed
          console.log(`[Flux 2 Pro Edit] Processing ${file.name} (${Math.round(file.size/1024)}KB)...`)
          const arrayBuffer = await file.arrayBuffer()
          const originalBuffer = Buffer.from(arrayBuffer)
          
          // Resize to respect fal.ai limits
          const resizedBuffer = await resizeImageForFalAI(originalBuffer, isFirstImage)
          
          // Create a new File object with resized buffer
          const uint8Array = new Uint8Array(resizedBuffer)
          const resizedFile = new File([uint8Array], file.name, { type: 'image/jpeg' })
          
          // Upload to fal.ai storage
          console.log(`[Flux 2 Pro Edit] Uploading ${file.name} to fal.ai storage...`)
          const uploadedUrl = await fal.storage.upload(resizedFile)
          allImageUrls.push(uploadedUrl)
          
          console.log(`[Flux 2 Pro Edit] Successfully uploaded ${file.name}: ${uploadedUrl}`)
          
        } catch (error) {
          console.error(`[Flux 2 Pro Edit] Failed to upload file ${file.name}:`, error)
          return NextResponse.json({
            error: "File upload failed",
            details: `Failed to upload file ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
          }, { status: 500 })
        }
      }
    }

    console.log(`[Flux 2 Pro Edit] Total images ready: ${allImageUrls.length}`)
    console.log("[Flux 2 Pro Edit] Image URLs:", allImageUrls.map((url, i) => `${i + 1}: ${url.substring(0, 60)}...`))

    // Process canonical prompt if enabled
    let finalPrompt = prompt
    if (useCanonicalPrompt) {
      console.log("[Flux 2 Pro Edit] Processing canonical prompt...")
      console.log("[Flux 2 Pro Edit] Original prompt:", prompt)
      
      if (!canonicalConfig) {
        canonicalConfig = {}
      }
      canonicalConfig.userInput = prompt
      
      try {
        const result = canonicalPromptProcessor.generateCanonicalPrompt(canonicalConfig)
        finalPrompt = result.canonicalPrompt
        
        console.log("[Flux 2 Pro Edit] Generated canonical prompt:", finalPrompt)
      } catch (canonicalError) {
        console.error("[Flux 2 Pro Edit] Error processing canonical prompt:", canonicalError)
        console.log("[Flux 2 Pro Edit] Falling back to original prompt")
      }
    } else {
      console.log("[Flux 2 Pro Edit] Canonical prompt disabled, using original prompt")
    }

    // Prepare input for fal.ai Flux 2 Pro Edit
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
    } else if (imageSizeStr === 'custom') {
      input.image_size = {
        width: customWidth!,
        height: customHeight!
      }
    } else {
      input.image_size = imageSize
    }
    
    // Add seed if provided
    if (seed !== undefined) {
      input.seed = seed
    }

    console.log("[Flux 2 Pro Edit] Final input object being sent to fal.ai:")
    console.log("=====================================")
    console.log("Model: fal-ai/flux-2-pro/edit")
    console.log("Input images count:", allImageUrls.length)
    console.log("Input:", JSON.stringify({
      ...input,
      image_urls: `[${allImageUrls.length} URLs]`,
      prompt: input.prompt.substring(0, 100) + '...'
    }, null, 2))
    console.log("=====================================")

    console.log("[Flux 2 Pro Edit] Calling fal.ai Flux 2 Pro Edit...")
    
    try {
      const result = await fal.subscribe("fal-ai/flux-2-pro/edit", {
        input,
        logs: true,
        onQueueUpdate: (update) => {
          if (update.status === "IN_PROGRESS") {
            console.log("[Flux 2 Pro Edit] Progress:", update.logs?.map(log => log.message).join(" ") || "Processing...")
          }
        }
      })

      console.log("[Flux 2 Pro Edit] fal.ai response received")
      
      // Validate response
      if (!result.data || !result.data.images || !Array.isArray(result.data.images) || result.data.images.length === 0) {
        console.error("[Flux 2 Pro Edit] Invalid response format:", result)
        
        return NextResponse.json({
          error: "No images generated",
          details: "fal.ai API returned no images. Check the prompt and input images."
        }, { status: 500 })
      }

      console.log("[Flux 2 Pro Edit] Successfully generated", result.data.images.length, "images")

      // Format response
      const images = result.data.images.map((img: any) => ({
        url: img.url,
        width: img.width || 1024,
        height: img.height || 1024
      }))

      // Add disclaimer to the result image
      let resultImageUrl = images[0]?.url
      let originalImageUrl = resultImageUrl
      
      if (resultImageUrl) {
        try {
          console.log("[Flux 2 Pro Edit] Adding disclaimer to result image...")
          const imageWithDisclaimer = await addDisclaimerToImage(
            resultImageUrl,
            undefined,
            {
              removeExisting: false, // Input images don't have disclaimers
              preserveMethod: 'resize',
            }
          )
          
          console.log("[Flux 2 Pro Edit] Disclaimer added successfully")
          resultImageUrl = imageWithDisclaimer
          
        } catch (disclaimerError) {
          console.error("[Flux 2 Pro Edit] Error adding disclaimer:", disclaimerError)
          console.log("[Flux 2 Pro Edit] Returning original image without disclaimer")
          // Return original if disclaimer fails
        }
      }

      // Return successful response
      return NextResponse.json({
        success: true,
        images: [{ url: resultImageUrl, width: images[0]?.width, height: images[0]?.height }],
        originalImageUrl, // Original without disclaimer for reference
        prompt: finalPrompt,
        originalPrompt: prompt,
        seed: result.data.seed,
        model: "fal-ai/flux-2-pro/edit",
        provider: "fal.ai",
        inputImages: allImageUrls.length,
        settings: {
          image_size: input.image_size,
          safety_tolerance: safetyToleranceStr,
          enable_safety_checker: enableSafetyChecker,
          output_format: outputFormat,
          use_canonical_prompt: useCanonicalPrompt
        },
        timestamp: new Date().toISOString()
      })

    } catch (falError) {
      console.error("[Flux 2 Pro Edit] fal.ai API error:", falError)
      
      // Log the full error body for debugging
      if ((falError as any)?.body) {
        console.error("[Flux 2 Pro Edit] Full error body:", JSON.stringify((falError as any).body, null, 2))
      }
      
      let errorMessage = "Failed to edit image with Flux 2 Pro"
      let errorDetails = falError instanceof Error ? falError.message : "Unknown error"
      
      // Extract specific validation errors if available
      if ((falError as any)?.body?.detail) {
        const details = (falError as any).body.detail
        if (Array.isArray(details) && details.length > 0) {
          errorDetails = details.map((d: any) => `${d.loc?.join('.')||'field'}: ${d.msg}`).join('; ') || JSON.stringify(details)
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
    console.error("[Flux 2 Pro Edit] Unexpected error:", error)
    
    return NextResponse.json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
