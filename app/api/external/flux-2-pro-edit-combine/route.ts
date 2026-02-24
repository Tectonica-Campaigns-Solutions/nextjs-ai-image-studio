import { NextRequest, NextResponse } from "next/server"
import { fal } from "@fal-ai/client"
import { ContentModerationService } from "@/lib/content-moderation"
import { addDisclaimerToImage } from "@/lib/image-disclaimer"
import sharp from 'sharp'
import path from 'path'
import fs from 'fs/promises'
import { getClientApiKey } from '@/lib/api-keys'

// Configuration: TectonicaAI style preset (text-based, no reference image)
// COMMENTED: Text-based style description approach (backup)
// const TECTONICA_STYLE_PRESET = {
//   description: 'Risograph printing style with duotone color scheme. Dominant saturated indigo/violet ink. Sunset gradient sky in pink, lilac and warm orange tones. Visible halftone dot screening texture, slight ink registration offset. Bold graphic illustration, simplified shapes, high contrast. Preserve the original composition and subject details.',
//   avoid: 'photorealistic look, full-color palette, glossy HDR, heavy shadows, neon greens, realistic skin texture, extra objects, added text/logos, paper borders, poster frame'
// }

// COMMENTED: @image1 style reference approach (backup)
// const TECTONICA_STYLE_PRESET = {
//   description: 'Apply the artistic style, color palette, and visual treatment from @image1. Match the tone, mood, and aesthetic qualities. Preserve the composition and subject matter from both images.'
// }

// COMMENTED: Simplified @image1 style reference (backup)
// const TECTONICA_STYLE_PRESET = {
//   description: 'Use the style and atmosphere of @image1 and respect @image1 color scale.'
// }

/**
 * Get combine with branding prompt suffix from organization's config.json
 * Returns the combineWithBranding field from prompts if available, null otherwise
 */
async function getCombineWithBrandingSuffix(orgType: string): Promise<string | null> {
  try {
    const folderName = `${orgType.toLowerCase()}-reference-images`
    const folderPath = path.join(process.cwd(), 'public', folderName)
    const configPath = path.join(folderPath, 'config.json')
    
    const configContent = await fs.readFile(configPath, 'utf-8')
    const config = JSON.parse(configContent)
    
    if (config.prompts?.combineWithBranding && typeof config.prompts.combineWithBranding === 'string') {
      console.log(`[External Flux 2 Pro Combine] Using combine with branding suffix from config.json: ${config.prompts.combineWithBranding}`)
      return config.prompts.combineWithBranding
    }
  } catch (error) {
    console.log(`[External Flux 2 Pro Combine] No combineWithBranding found in config.json for ${orgType}`)
  }
  
  return null
}

/**
 * Builds a prompt (currently disabled - returns user prompt as-is)
 */
function buildStyleTransferPrompt(userPrompt: string): string {
  return userPrompt
}

/**
 * Get the text associated with a composition rule from the organization's config.json.
 * Returns null if the rule is not found or the config cannot be read.
 */
async function getCompositionRuleText(orgType: string, compositionRule: string): Promise<string | null> {
  try {
    const folderName = `${orgType.toLowerCase()}-reference-images`
    const folderPath = path.join(process.cwd(), 'public', folderName)
    const configPath = path.join(folderPath, 'config.json')
    const configContent = await fs.readFile(configPath, 'utf-8')
    const config = JSON.parse(configContent)
    if (config.prompts?.compositionRules && typeof config.prompts.compositionRules[compositionRule] === 'string') {
      return config.prompts.compositionRules[compositionRule]
    }
  } catch {
    // Config not found or unreadable — silently ignore
  }
  return null
}

/**
 * Helper: Resize image to respect fal.ai megapixel limits
 * First image: max 4 MP (2048x2048)
 * Second and third images: max 1 MP (1024x1024)
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
  
  console.log(`[External Flux 2 Pro Combine] Resizing image from ${metadata.width}x${metadata.height} (${Math.round(currentPixels/1000000)}MP) to ${targetWidth}x${targetHeight} (${Math.round((targetWidth*targetHeight)/1000000)}MP)`)
  
  return sharp(buffer)
    .resize(targetWidth, targetHeight, { 
      fit: 'inside',
      withoutEnlargement: true
    })
    .jpeg({ quality: 90 })
    .toBuffer()
}

/**
 * POST /api/external/flux-2-pro-edit-combine
 * 
 * External API endpoint for FLUX.2 [pro] image combining.
 * Combines 2 user images + 1 automatic style reference using AI with advanced editing capabilities.
 * 
 * Features:
 * - Dual image combining: Exactly 2 input images (4 MP + 1 MP) + 1 style reference (@image3)
 * - Image referencing: Use @image1, @image2 syntax in prompts (@image3 is auto-added style reference)
 * - JSON structured prompts: Advanced control over scene, subjects, camera
 * - HEX color control: Precise color matching
 * - Custom and preset sizes: Full flexibility
 * - Safety controls: Configurable tolerance (1-5) and safety checker
 * - Multiple formats: JPEG or PNG output
 * - Reproducibility: Seed support
 * - Disclaimer: Automatic disclaimer overlay on results
 * 
 * Body parameters (FormData or JSON):
 * - prompt (required): Text description for combining the images
 * - image0, image1 (FormData): 2 image files
 * - imageUrl0, imageUrl1 (FormData): 2 image URLs
 * - imageBase640, imageBase641 (FormData): 2 Base64 images
 * - imageUrls (JSON): Array with exactly 2 image URLs
 * - base64Images (JSON): Array with exactly 2 Base64 images
 * - settings (optional): Object with generation settings
 *   - image_size: "auto" | "square_hd" | "square" | "portrait_4_3" | "portrait_16_9" | "landscape_4_3" | "landscape_16_9" | {width, height}
 *   - safety_tolerance: 1-5 (default: 2)
 *   - enable_safety_checker: boolean (default: true)
 *   - output_format: "jpeg" | "png" (default: "jpeg")
 *   - seed: number (optional)
 * - useCanonicalPrompt (optional): boolean
 * - canonicalConfig (optional): Canonical prompt configuration object
 * - orgType (optional): Organization type for moderation (default: general)
 * 
 * Response format:
 * {
 *   "success": true,
 *   "images": [{ 
 *     "url": "https://fal.ai/...",
 *     "width": 1024, 
 *     "height": 1024 
 *   }],
 *   "prompt": "enhanced prompt used",
 *   "originalPrompt": "user's original prompt",
 *   "seed": 12345,
 *   "model": "fal-ai/flux-2-pro/edit",
 *   "provider": "fal.ai",
 *   "inputImages": 3,
 *   "userImages": 2,
 *   "styleReference": "TCT-AI-Landmark-3.png"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    console.log("[External Flux 2 Pro Combine] Request received")
    
    // Check Content-Type to determine if JSON or FormData
    const contentType = request.headers.get('content-type') || ''
    const isJSON = contentType.includes('application/json')
    
    console.log(`[External Flux 2 Pro Combine] Content-Type: ${contentType}, isJSON: ${isJSON}`)
    
    let prompt: string
    let orgType: string
    let settings: any = {}
    let imageFiles: File[] = []
    let imageUrls: string[] = []
    let base64Images: string[] = []
    let compositionRule: string | null = null
    
    if (isJSON) {
      // JSON payload
      console.log("[External Flux 2 Pro Combine] 📦 Processing JSON payload")
      
      const jsonBody = await request.json()
      
      prompt = jsonBody.prompt
      compositionRule = jsonBody.compositionRule || null
      const rawOrgType = jsonBody.orgType
      
      // Extract and validate orgType
      orgType = rawOrgType && rawOrgType.trim() ? rawOrgType : "Tectonica"
      
      settings = jsonBody.settings || {}
      
      // Extract image URLs and Base64 from JSON
      if (jsonBody.imageUrls && Array.isArray(jsonBody.imageUrls)) {
        imageUrls = jsonBody.imageUrls.filter((url: string) => url && url.trim())
        console.log(`[External Flux 2 Pro Combine] Found ${imageUrls.length} image URLs in JSON`)
      }
      
      if (jsonBody.base64Images && Array.isArray(jsonBody.base64Images)) {
        base64Images = jsonBody.base64Images.filter((b64: string) => b64 && b64.trim())
        console.log(`[External Flux 2 Pro Combine] Found ${base64Images.length} Base64 images in JSON`)
      }
      
    } else {
      // FormData payload
      console.log("[External Flux 2 Pro Combine] 📦 Processing FormData payload")
      
      try {
        const formData = await request.formData()
        console.log("[External Flux 2 Pro Combine] FormData parsed successfully")
        
        // Extract parameters
        prompt = formData.get("prompt") as string
        compositionRule = (formData.get("compositionRule") as string) || null
        console.log("[External Flux 2 Pro Combine] Prompt extracted:", prompt?.substring(0, 50))
        
        const rawOrgType = formData.get("orgType") as string
        const clientInfoStr = formData.get("clientInfo") as string
        let clientInfo: any = {}
        
        if (clientInfoStr) {
          try {
            clientInfo = JSON.parse(clientInfoStr)
          } catch (error) {
            console.warn("[External Flux 2 Pro Combine] Failed to parse clientInfo:", error)
          }
        }
        
        // Extract and validate orgType and clientInfo
        orgType = rawOrgType && rawOrgType.trim() ? rawOrgType : "Tectonica"
        const client_id = clientInfo.client_id && clientInfo.client_id.trim() ? clientInfo.client_id : "Tectonica"
        const user_email = clientInfo.user_email || ""
        const user_id = clientInfo.user_id || ""
        
        console.log("[External Flux 2 Pro Combine] Client info:", { orgType, client_id, user_email, user_id })
      
        // Parse settings
        const settingsStr = formData.get("settings") as string
        console.log("[External Flux 2 Pro Combine] Settings string:", settingsStr)
        if (settingsStr) {
          try {
            settings = JSON.parse(settingsStr)
            console.log("[External Flux 2 Pro Combine] Settings parsed successfully")
          } catch (error) {
            console.warn("[External Flux 2 Pro Combine] Failed to parse settings:", error)
          }
        }
        
        console.log("[External Flux 2 Pro Combine] Checking for images...")
        
        // Get image0 and image1 (2 images)
        for (let i = 0; i < 2; i++) {
          const file = formData.get(`image${i}`) as File | null
          if (file && file.size > 0) {
            imageFiles.push(file)
            console.log(`[External Flux 2 Pro Combine] Found image file: image${i}, size: ${file.size}, type: ${file.type}`)
          }
          
          const url = formData.get(`imageUrl${i}`) as string | null
          if (url && url.trim()) {
            imageUrls.push(url.trim())
            console.log(`[External Flux 2 Pro Combine] Found image URL: imageUrl${i}, url: ${url}`)
          }
          
          const base64 = formData.get(`imageBase64${i}`) as string | null
          if (base64 && base64.trim()) {
            base64Images.push(base64.trim())
            console.log(`[External Flux 2 Pro Combine] Found Base64 image: imageBase64${i}, length: ${base64.length} chars`)
          }
        }
        
        console.log("[External Flux 2 Pro Combine] FormData processing complete")
        
      } catch (formDataError) {
        console.error("[External Flux 2 Pro Combine] Error processing FormData:", formDataError)
        throw formDataError
      }
    }

    // Get client-specific API key (after orgType is determined)
    let falApiKey: string
    try {
      falApiKey = getClientApiKey(orgType)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "API key not configured"
      console.error(`[External Flux 2 Pro Combine] ${errorMsg}`)
      return NextResponse.json({
        error: "API key configuration error",
        details: errorMsg
      }, { status: 500 })
    }
    
    console.log(`[External Flux 2 Pro Combine] API key retrieved for organization: ${orgType}`)

    console.log("[External Flux 2 Pro Combine] Parameters:", {
      prompt: prompt?.substring(0, 100) + '...',
      imageFilesCount: imageFiles.length,
      imageUrlsCount: imageUrls.length,
      base64ImagesCount: base64Images.length,
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
        details: "Please provide a text description for combining the images"
      }, { status: 400 })
    }

    // Validate exactly 2 images
    const totalImageSources = imageFiles.length + imageUrls.length + base64Images.length
    if (totalImageSources < 2) {
      return NextResponse.json({
        error: "Not enough images",
        details: `This endpoint requires exactly 2 images. You provided ${totalImageSources} image(s).`
      }, { status: 400 })
    }

    if (totalImageSources > 2) {
      return NextResponse.json({
        error: "Too many images",
        details: `This endpoint accepts exactly 2 images. You provided ${totalImageSources} images.`
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
      console.log(`[MODERATION] Checking content for External Flux 2 Pro Combine prompt: ${prompt.substring(0, 100)}...`)
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

    // Process images - upload to fal.ai storage
    const allImageUrls: string[] = []
    
    // Process File images first (from FormData)
    if (imageFiles.length > 0) {
      console.log(`[External Flux 2 Pro Combine] Processing ${imageFiles.length} File images...`)
      
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i]
        const isFirstImage = allImageUrls.length === 0
        
        try {
          const arrayBuffer = await file.arrayBuffer()
          const imageBuffer = Buffer.from(arrayBuffer)
          
          console.log(`[External Flux 2 Pro Combine] Processing File image ${i + 1}/${imageFiles.length}, type: ${file.type}`)
          
          // Validate image integrity
          try {
            const metadata = await sharp(imageBuffer).metadata()
            console.log(`[External Flux 2 Pro Combine] ✅ Image validated: ${metadata.format}, ${metadata.width}x${metadata.height}`)
          } catch (validationError) {
            const errorMsg = validationError instanceof Error ? validationError.message : String(validationError)
            console.error(`[External Flux 2 Pro Combine] ❌ CORRUPTED FILE IMAGE:`, errorMsg)
            throw new Error(`File image ${i + 1} is corrupted or invalid`)
          }
          
          // Resize to respect fal.ai megapixel limits
          let finalBuffer: Buffer
          let finalMimeType = 'image/jpeg'
          
          try {
            finalBuffer = await resizeImageForFalAI(imageBuffer, isFirstImage)
            console.log(`[External Flux 2 Pro Combine] ✅ Processed: ${(imageBuffer.length / 1024).toFixed(1)} KB → ${(finalBuffer.length / 1024).toFixed(1)} KB`)
          } catch (sharpError) {
            console.warn(`[External Flux 2 Pro Combine] ⚠️  Processing failed, using original`)
            finalBuffer = imageBuffer
            finalMimeType = file.type || 'image/jpeg'
          }
          
          // Upload using 2-step process
          const fileExtension = finalMimeType.split('/')[1] || 'jpeg'
          const fileName = `flux2pro-combine-file-${i + 1}.${fileExtension}`
          
          console.log(`[External Flux 2 Pro Combine] Uploading ${fileName}...`)
          
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
          
          console.log(`[External Flux 2 Pro Combine] ✅ Uploaded: ${file_url}`)
          allImageUrls.push(file_url)
          
        } catch (fileError) {
          console.error(`[External Flux 2 Pro Combine] Failed to process File image ${i + 1}:`, fileError)
          return NextResponse.json({
            error: "File image processing failed",
            details: `Failed to process File image ${i + 1}: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`
          }, { status: 400 })
        }
      }
    }
    
    // Process Base64 images
    if (base64Images.length > 0) {
      console.log(`[External Flux 2 Pro Combine] Processing ${base64Images.length} Base64 images...`)
      
      for (let i = 0; i < base64Images.length; i++) {
        const base64Data = base64Images[i]
        const isFirstImage = allImageUrls.length === 0
        
        try {
          // Parse Base64 data URL or raw Base64
          let imageBuffer: Buffer
          let mimeType = 'image/jpeg'
          
          if (base64Data.startsWith('data:')) {
            const matches = base64Data.match(/^data:([^;]+);base64,(.+)$/)
            if (!matches) {
              throw new Error(`Invalid Base64 data URL format for image ${i + 1}`)
            }
            mimeType = matches[1]
            const base64String = matches[2]
            imageBuffer = Buffer.from(base64String, 'base64')
          } else {
            imageBuffer = Buffer.from(base64Data, 'base64')
          }
          
          // Normalize MIME type
          if (mimeType === 'image/jpg') {
            mimeType = 'image/jpeg'
          }
          
          console.log(`[External Flux 2 Pro Combine] Processing Base64 image ${i + 1}/${base64Images.length}, type: ${mimeType}`)
          
          // Validate image integrity
          try {
            const metadata = await sharp(imageBuffer).metadata()
            console.log(`[External Flux 2 Pro Combine] ✅ Image validated: ${metadata.format}, ${metadata.width}x${metadata.height}`)
          } catch (validationError) {
            const errorMsg = validationError instanceof Error ? validationError.message : String(validationError)
            console.error(`[External Flux 2 Pro Combine] ❌ CORRUPTED BASE64 IMAGE:`, errorMsg)
            throw new Error(`Base64 image ${i + 1} is corrupted or incomplete`)
          }
          
          // Resize to respect fal.ai megapixel limits
          let finalBuffer: Buffer
          let finalMimeType = 'image/jpeg'
          
          try {
            finalBuffer = await resizeImageForFalAI(imageBuffer, isFirstImage)
            console.log(`[External Flux 2 Pro Combine] ✅ Processed: ${(imageBuffer.length / 1024).toFixed(1)} KB → ${(finalBuffer.length / 1024).toFixed(1)} KB`)
          } catch (sharpError) {
            console.warn(`[External Flux 2 Pro Combine] ⚠️  Processing failed, using original`)
            finalBuffer = imageBuffer
            finalMimeType = mimeType
          }
          
          // Upload using 2-step process
          const fileExtension = finalMimeType.split('/')[1] || 'jpeg'
          const fileName = `flux2pro-combine-${i + 1}.${fileExtension}`
          
          console.log(`[External Flux 2 Pro Combine] Uploading ${fileName}...`)
          
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
          
          console.log(`[External Flux 2 Pro Combine] ✅ Uploaded: ${file_url}`)
          allImageUrls.push(file_url)
          
        } catch (base64Error) {
          console.error(`[External Flux 2 Pro Combine] Failed to process Base64 image ${i + 1}:`, base64Error)
          return NextResponse.json({
            error: "Base64 image processing failed",
            details: `Failed to process Base64 image ${i + 1}: ${base64Error instanceof Error ? base64Error.message : 'Unknown error'}`
          }, { status: 400 })
        }
      }
    }
    
    // Add provided image URLs
    if (imageUrls.length > 0) {
      console.log(`[External Flux 2 Pro Combine] Adding ${imageUrls.length} image URLs...`)
      
      for (const url of imageUrls) {
        if (!url || typeof url !== 'string' || !url.trim()) {
          return NextResponse.json({
            error: "Invalid image URL",
            details: "One or more image URLs are empty or invalid"
          }, { status: 400 })
        }
        
        // Basic URL validation
        try {
          new URL(url)
          allImageUrls.push(url)
        } catch (urlError) {
          return NextResponse.json({
            error: "Invalid image URL format",
            details: `Invalid URL: ${url}`
          }, { status: 400 })
        }
      }
    }

    console.log(`[External Flux 2 Pro Combine] Total images ready: ${allImageUrls.length}`)

    // Build the final prompt with style preset (text-based, no reference image)
    let finalPrompt = buildStyleTransferPrompt(prompt)
    
    // If images were provided via URL, append the combine with branding suffix from config.json
    if (imageUrls.length > 0) {
      const brandingSuffix = await getCombineWithBrandingSuffix(orgType)
      if (brandingSuffix) {
        finalPrompt = `${finalPrompt} ${brandingSuffix}`
        console.log(`[External Flux 2 Pro Combine] Added combine with branding suffix to prompt`)
      }
    }

    // Apply composition rule if provided
    const compositionRuleText = compositionRule ? await getCompositionRuleText(orgType, compositionRule) : null
    if (compositionRuleText) {
      finalPrompt = `${finalPrompt}\n${compositionRuleText}`
      console.log(`[External Flux 2 Pro Combine] Applied composition rule '${compositionRule}'`)
    }
    
    console.log(`[External Flux 2 Pro Combine] Built prompt with TectonicaAI style preset`)

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

    console.log("[External Flux 2 Pro Combine] Calling fal.ai...")
    console.log("[External Flux 2 Pro Combine] Input:", JSON.stringify({
      ...input,
      image_urls: `[${allImageUrls.length} URLs]`,
      prompt: input.prompt.substring(0, 100) + '...'
    }, null, 2))

    try {
      const result = await fal.subscribe("fal-ai/flux-2-pro/edit", {
        input,
        logs: true,
        onQueueUpdate: (update) => {
          if (update.status === "IN_PROGRESS") {
            console.log("[External Flux 2 Pro Combine] Progress:", update.logs?.map(log => log.message).join(" ") || "Processing...")
          }
        }
      })

      console.log("[External Flux 2 Pro Combine] Generation successful")
      
      // Validate response
      if (!result.data || !result.data.images || !Array.isArray(result.data.images) || result.data.images.length === 0) {
        console.error("[External Flux 2 Pro Combine] Invalid response:", result)
        
        return NextResponse.json({
          error: "No images generated",
          details: "fal.ai API returned no images"
        }, { status: 500 })
      }

      console.log("[External Flux 2 Pro Combine] Generated", result.data.images.length, "images")

      // Process images (no disclaimer by default)
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
        userImages: 2,
        stylePreset: "TectonicaAI Risograph",
        settings: {
          image_size: input.image_size,
          safety_tolerance: safetyToleranceStr,
          enable_safety_checker: enableSafetyChecker,
          output_format: outputFormat
        },
        timestamp: new Date().toISOString()
      })

    } catch (falError) {
      console.error("[External Flux 2 Pro Combine] fal.ai API error:", falError)
      
      // Log full error for debugging
      if ((falError as any)?.body) {
        console.error("[External Flux 2 Pro Combine] Full error body:", JSON.stringify((falError as any).body, null, 2))
      }
      
      let errorMessage = "Failed to combine images with Flux 2 Pro"
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
    console.error("[External Flux 2 Pro Combine] Unexpected error:", error)
    console.error("[External Flux 2 Pro Combine] Error stack:", error instanceof Error ? error.stack : "No stack trace")
    
    return NextResponse.json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
      stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
