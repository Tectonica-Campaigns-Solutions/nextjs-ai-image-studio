import { NextRequest, NextResponse } from "next/server"
import { fal } from "@fal-ai/client"
import sharp from 'sharp'
import fs from 'fs/promises'
import path from 'path'
import { getClientApiKey } from '@/lib/api-keys'
import { requireExternalAuth } from '@/lib/api-auth'
import { addDisclaimerToImage, restoreDisclaimerZone } from '@/lib/image-disclaimer'
import crypto from 'crypto'

/**
 * Helper: Resize image to respect fal.ai megapixel limits
 * For 3 images (1 user + 2 references):
 * - User image: max 4 MP (2048x2048)
 * - Each reference image: max 0.5 MP (~707x707)
 * - Total: ~5 MP input + output within 9 MP limit
 */
async function resizeImageForFalAI(buffer: Buffer, imageRole: 'user' | 'reference'): Promise<Buffer> {
  const maxMegapixels = imageRole === 'user' ? 4_000_000 : 500_000
  const maxDimension = imageRole === 'user' ? 2048 : 1024
  
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

// Scene type configurations
type SceneType = 'people' | 'landscape' | 'urban' | 'monument'

interface SceneConfig {
  defaultPrompt: string
}

const SCENE_CONFIGS: Record<SceneType, SceneConfig> = {
  people: {
    defaultPrompt: "@image1 is the PRIMARY subject. Apply the artistic style, color palette, lighting mood, and atmospheric treatment of @image2 to the subject(s) in @image1. @image2 is a STYLE REFERENCE ONLY — do not introduce any structures, elements, or visual content from @image2 into the output. Preserve the exact pose, facial expression, anatomy, clothing, and identity of all subjects in @image1. Respect @image2 color scale."
  },
  landscape: {
    defaultPrompt: "Combine the natural landscape scene from @image1 with the artistic style, color palette, lighting mood, and surface textures of @image2. Preserve the exact composition, viewpoint, horizon line, scale, and all geographical features from @image1 (mountains, coastline, rivers, trees, clouds). Do not add, remove, or relocate any elements. Do not introduce animals, people, buildings, or objects from @image2. Keep all shapes and contours unchanged; apply only stylistic rendering (brushwork/material feel), atmosphere, and color grading. Respect @image2 color scale."
  },
  urban: {
    defaultPrompt: "Combine the urban cityscape from @image1 with the artistic style and atmosphere of @image2. Strictly preserve @image1's geometry, perspective lines, building silhouettes, street layout, signage placement, windows/doors proportions, and all object positions. Do not add or remove buildings, vehicles, people, street furniture, or text. Do not import any recognizable objects, landmarks, or patterns from @image2. Apply only stylistic transformation: color palette, lighting mood, material/texture rendering, and overall artistic treatment while keeping the scene structure identical. Respect @image2 color scale."
  },
  monument: {
    defaultPrompt: "Combine the monument and its surroundings from @image1 with the artistic style and atmosphere of @image2. Preserve the monument's exact architecture and proportions: silhouette, edges, carvings/reliefs placement, material boundaries, inscriptions, and all structural details. Keep the camera angle, framing, and perspective identical to @image1. Do not add or remove architectural elements, statues, people, flags, or decorative features. Do not bring any landmark features from @image2 into @image1. Apply only stylistic rendering (texture/brushwork), lighting mood, and color palette, without altering the monument's geometry. Respect @image2 color scale."
  }
}

// Default Tectonica reference images (fallback)
const TECTONICA_REFERENCE_IMAGES: Record<SceneType, string> = {
  people: 'TCT-AI-Landmark.png',
  landscape: 'TCT-AI-Landmark-2.png',
  urban: 'TCT-AI-Landmark-3.png',
  monument: 'TCT-AI-Landmark.png'
}

/**
 * Get reference image filename and scene prompt for a client and scene type.
 * Implements hybrid approach with fallback:
 * 1. Try to load client's config.json (with prompts support)
 * 2. Fall back to naming convention: {sceneType}.png or {sceneType}.jpg
 * 3. Fall back to Tectonica's reference images
 * 4. Prompts fallback to SCENE_CONFIGS if not in config.json
 */
async function getClientSceneConfig(
  orgType: string, 
  sceneType: SceneType
): Promise<{ filenames: string[]; folderName: string; prompt: string }> {
  const folderName = `${orgType.toLowerCase()}-reference-images`
  const folderPath = path.join(process.cwd(), 'public', folderName)
  let customPrompt: string | null = null
  
  // Step 1: Try to load config.json
  try {
    const configPath = path.join(folderPath, 'config.json')
    const configContent = await fs.readFile(configPath, 'utf-8')
    const config = JSON.parse(configContent)
    
    // Check for custom prompt in config.json
    if (config.prompts && config.prompts[sceneType]) {
      customPrompt = config.prompts[sceneType]
      console.log(`[Flux 2 Pro Edit Apply] Using custom prompt from config.json for ${sceneType}`)
    }
    
    if (config[sceneType]) {
      const rawValue = config[sceneType]
      let filenames: string[]
      if (Array.isArray(rawValue)) {
        filenames = rawValue.filter((f: unknown) => typeof f === 'string') as string[]
        console.log(`[Flux 2 Pro Edit Apply] Using config.json mapping: ${sceneType} -> [${filenames.join(', ')}]`)
      } else if (typeof rawValue === 'string') {
        filenames = [rawValue]
        console.log(`[Flux 2 Pro Edit Apply] Using config.json mapping: ${sceneType} -> ${rawValue}`)
      } else {
        filenames = []
      }
      if (filenames.length > 0) {
        return { 
          filenames, 
          folderName,
          prompt: customPrompt || SCENE_CONFIGS[sceneType].defaultPrompt
        }
      }
    }
  } catch (error) {
    // Config.json doesn't exist or is invalid, continue to next strategy
    console.log(`[Flux 2 Pro Edit Apply] No config.json found for ${orgType}, trying naming convention...`)
  }
  
  // Step 2: Try naming convention: {sceneType}.png or {sceneType}.jpg
  const extensions = ['png', 'jpg', 'jpeg']
  for (const ext of extensions) {
    const conventionFilename = `${sceneType}.${ext}`
    const conventionPath = path.join(folderPath, conventionFilename)
    
    try {
      await fs.access(conventionPath)
      console.log(`[Flux 2 Pro Edit Apply] Found by convention: ${conventionFilename}`)
      return { 
        filenames: [conventionFilename], 
        folderName,
        prompt: customPrompt || SCENE_CONFIGS[sceneType].defaultPrompt
      }
    } catch {
      // File doesn't exist, try next extension
    }
  }
  
  // Step 3: Fallback to Tectonica
  console.log(`[Flux 2 Pro Edit Apply] No reference image found for ${orgType}, falling back to Tectonica`)
  const tectonicaFilename = TECTONICA_REFERENCE_IMAGES[sceneType]
  return { 
    filenames: [tectonicaFilename], 
    folderName: 'tectonicaai-reference-images',
    prompt: customPrompt || SCENE_CONFIGS[sceneType].defaultPrompt
  }
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
 * Get the createElementIsolation prompt text from the organization's config.json.
 * Returns null if not found.
 */
async function getElementIsolationText(orgType: string): Promise<string | null> {
  try {
    const folderName = `${orgType.toLowerCase()}-reference-images`
    const folderPath = path.join(process.cwd(), 'public', folderName)
    const configPath = path.join(folderPath, 'config.json')
    const configContent = await fs.readFile(configPath, 'utf-8')
    const config = JSON.parse(configContent)
    if (config.prompts?.createElementIsolation && typeof config.prompts.createElementIsolation === 'string') {
      return config.prompts.createElementIsolation
    }
  } catch {
    // Config not found or unreadable — silently ignore
  }
  return null
}

// Default scene type
const DEFAULT_SCENE_TYPE: SceneType = 'people'

// ── TEMPORARY FLAG ──────────────────────────────────────────────────────────
// Set to true to disable reference image upload (passes only the user image).
// When disabled, the scene base prompt is also skipped so @image2 refs are gone.
const DISABLE_REFERENCE_IMAGES = true
// ────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/external/flux-2-pro-edit-apply
 * 
 * External API endpoint for applying TectonicaAI style to user images with scene-specific optimization.
 * This endpoint combines a user-provided image with a scene-appropriate reference image and prompt.
 * 
 * Features:
 * - Scene-based style transfer: 4 scene types (people, landscape, urban, monument)
 * - Auto-selected reference image based on scene type
 * - Scene-optimized prompts with optional custom additions
 * - Required user image: Must provide exactly 1 image (@image1)
 * - Reference image: Automatically loaded as @image2 based on sceneType
 * - Custom and preset sizes: Full flexibility
 * - Safety controls: Configurable tolerance (1-5) and safety checker
 * - Multiple formats: JPEG or PNG output
 * - Reproducibility: Seed support
 * 
 * Body parameters (JSON):
 * - sceneType (optional): "people" | "landscape" | "urban" | "monument" (default: "people")
 * - prompt (optional): Custom prompt to APPEND after the mandatory scene-based prompt
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
 *   "sceneType": "people",
 *   "prompt": "[full prompt with base + custom]",
 *   "basePrompt": "[scene-specific base prompt]",
 *   "customPrompt": "[custom addition or null]",
 *   "seed": 12345,
 *   "model": "fal-ai/flux-2-pro/edit",
 *   "provider": "fal.ai",
 *   "inputImages": 2,
 *   "referenceImage": "TCT-AI-Individual-Hispanic-Female-Young.png",
 *   "userImages": 1
 * }
 */
export async function POST(request: NextRequest) {
  const authError = await requireExternalAuth(request)
  if (authError) return authError

  try {
    console.log("[Flux 2 Pro Edit Apply] Request received")
    
    // Parse JSON body first to get orgType
    console.log("[Flux 2 Pro Edit Apply] Parsing request body...")
    const body = await request.json()
    console.log("[Flux 2 Pro Edit Apply] Body parsed successfully")
    
    const { 
      sceneType: rawSceneType,
      prompt: customPrompt,
      imageUrl = null,
      base64Image = null,
      settings = {},
      orgType: rawOrgType,
      clientInfo = {},
      compositionRule = null,
      removeInputDisclaimer = true
    } = body
    
    // Extract and validate orgType and clientInfo
    const orgType = rawOrgType && rawOrgType.trim() ? rawOrgType : "Tectonica"
    
    // Get client-specific API key
    let falApiKey: string
    try {
      falApiKey = getClientApiKey(orgType)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "API key not configured"
      console.error(`[Flux 2 Pro Edit Apply] ${errorMsg}`)
      return NextResponse.json({
        error: "API key configuration error",
        details: errorMsg
      }, { status: 500 })
    }
    
    console.log(`[Flux 2 Pro Edit Apply] API key retrieved for organization: ${orgType}`)
    const client_id = clientInfo.client_id && clientInfo.client_id.trim() ? clientInfo.client_id : "Tectonica"
    const user_email = clientInfo.user_email || ""
    const user_id = clientInfo.user_id || ""
    
    console.log("[Flux 2 Pro Edit Apply] Client info:", { orgType, client_id, user_email, user_id })

    // Normalize and validate sceneType
    const sceneType: SceneType = (rawSceneType && typeof rawSceneType === 'string' && 
                                   ['people', 'landscape', 'urban', 'monument'].includes(rawSceneType.toLowerCase())) 
                                   ? rawSceneType.toLowerCase() as SceneType 
                                   : DEFAULT_SCENE_TYPE
    
    // Get scene configuration (image and prompt) for this client
    const sceneConfig = await getClientSceneConfig(orgType, sceneType)
    
    // Build final prompt: base scene prompt + optional custom prompt at the end
    const basePrompt = sceneConfig.prompt
    let finalPrompt = customPrompt && typeof customPrompt === 'string' && customPrompt.trim()
                        ? `${basePrompt} ${customPrompt.trim()}`
                        : basePrompt

    // Apply composition rule if provided
    const compositionRuleText = compositionRule ? await getCompositionRuleText(orgType, compositionRule) : null
    if (compositionRuleText) {
      finalPrompt = `${finalPrompt}\n${compositionRuleText}`
      console.log(`[Flux 2 Pro Edit Apply] Applied composition rule '${compositionRule}'`)
    }

    // Always apply createElementIsolation rule
    const elementIsolationText = await getElementIsolationText(orgType)
    if (elementIsolationText) {
      // finalPrompt = `${finalPrompt}\n${elementIsolationText}`
      finalPrompt = `${finalPrompt}`
      console.log(`[Flux 2 Pro Edit Apply] Applied createElementIsolation rule`)
    }

    console.log("[Flux 2 Pro Edit Apply] Parameters:", {
      sceneType: sceneType,
      basePrompt: basePrompt.substring(0, 80) + '...',
      hasCustomPrompt: !!customPrompt,
      finalPromptLength: finalPrompt.length,
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

        // Restore disclaimer zone if enabled (reverse alpha-composite to remove branding from input)
        if (removeInputDisclaimer) {
          try {
            imageBuffer = Buffer.from(await restoreDisclaimerZone(imageBuffer))
            console.log(`[Flux 2 Pro Edit Apply] ✅ Disclaimer zone restored`)
          } catch (restoreError) {
            console.warn(`[Flux 2 Pro Edit Apply] ⚠️  restoreDisclaimerZone failed, using original:`, restoreError)
          }
        }

        // Resize user image (first image, max 4 MP)
        let finalBuffer: Buffer
        let finalMimeType = 'image/jpeg'
        
        try {
          finalBuffer = await resizeImageForFalAI(imageBuffer, 'user')
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

        if (removeInputDisclaimer) {
          try {
            const dlRes = await fetch(imageUrl)
            if (!dlRes.ok) throw new Error(`HTTP ${dlRes.status}`)
            const dlBuffer = Buffer.from(await dlRes.arrayBuffer())
            const restoredBuffer = Buffer.from(await restoreDisclaimerZone(dlBuffer))

            const initiateRes = await fetch('https://rest.alpha.fal.ai/storage/upload/initiate', {
              method: 'POST',
              headers: { 'Authorization': `Key ${falApiKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ content_type: 'image/jpeg', file_name: 'user-image-restored.jpeg' })
            })
            if (!initiateRes.ok) throw new Error(`Initiate failed: ${initiateRes.status}`)
            const { upload_url: restoredUploadUrl, file_url: restoredFileUrl } = await initiateRes.json()
            const putRes = await fetch(restoredUploadUrl, {
              method: 'PUT',
              headers: { 'Content-Type': 'image/jpeg', 'Content-Length': restoredBuffer.length.toString() },
              body: new Uint8Array(restoredBuffer)
            })
            if (!putRes.ok) throw new Error(`PUT failed: ${putRes.status}`)
            allImageUrls.push(restoredFileUrl)
            console.log(`[Flux 2 Pro Edit Apply] ✅ Restored disclaimer zone and re-uploaded (@image1): ${restoredFileUrl}`)
          } catch (restoreError) {
            console.warn(`[Flux 2 Pro Edit Apply] ⚠️  Restore failed, using original URL:`, restoreError)
            allImageUrls.push(imageUrl)
          }
        } else {
          allImageUrls.push(imageUrl)
        }
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

    // SECOND: Upload style reference images (these will be @image2, @image3, ...)
    const referenceImageFilenames = sceneConfig.filenames
    const folderName = sceneConfig.folderName

    if (DISABLE_REFERENCE_IMAGES) {
      console.log(`[Flux 2 Pro Edit Apply] ⚠️  Reference images DISABLED — skipping style reference upload`)
    } else {
    console.log(`[Flux 2 Pro Edit Apply] Uploading ${referenceImageFilenames.length} style reference image(s) for scene type '${sceneType}'...`)

    for (let refIndex = 0; refIndex < referenceImageFilenames.length; refIndex++) {
      const refFilename = referenceImageFilenames[refIndex]
      const imageLabel = `@image${refIndex + 2}`
      const fullPath = path.join(process.cwd(), 'public', folderName, refFilename)

      console.log(`[Flux 2 Pro Edit Apply] Using reference ${imageLabel}: ${folderName}/${refFilename}`)

      try {
        console.log(`[Flux 2 Pro Edit Apply] Reading style reference: ${fullPath}`)

        // Read the file
        let imageBuffer = await fs.readFile(fullPath)

        // Resize reference image (max 0.5 MP each)
        imageBuffer = await resizeImageForFalAI(imageBuffer, 'reference')

        // Upload as JPEG
        const mimeType = 'image/jpeg'
        const fileName = `style-ref-${refIndex + 1}.jpg`

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

        console.log(`[Flux 2 Pro Edit Apply] ✅ Uploaded style reference (${imageLabel}): ${file_url}`)
        allImageUrls.push(file_url)

      } catch (uploadError) {
        console.error(`[Flux 2 Pro Edit Apply] Failed to upload style reference ${imageLabel}:`, uploadError)
        return NextResponse.json({
          error: "Failed to upload style reference image",
          details: `Failed to upload style reference ${imageLabel}: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`
        }, { status: 500 })
      }
    }
    } // end if (!DISABLE_REFERENCE_IMAGES)

    console.log(`[Flux 2 Pro Edit Apply] Total images: ${allImageUrls.length} (1 user + ${DISABLE_REFERENCE_IMAGES ? 0 : referenceImageFilenames.length} style ref(s))`)

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

    console.log("[Flux 2 Pro Edit Apply] Calling fal.ai...")
    console.log("[Flux 2 Pro Edit Apply] Input:", JSON.stringify({
      ...input,
      image_urls: `[${allImageUrls.length} URLs: 1 user + ${referenceImageFilenames.length} style ref(s)]`,
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
        let finalUrl = originalImageUrl

        try {
          const disclaimerBase64 = await addDisclaimerToImage(originalImageUrl)
          const base64Match = disclaimerBase64.match(/^data:[^;]+;base64,(.+)$/)
          if (!base64Match) throw new Error('Invalid disclaimer base64 output')
          const disclaimerBuffer = Buffer.from(base64Match[1], 'base64')
          const hash = crypto.createHash('sha256').update(disclaimerBuffer).digest('hex').slice(0, 10)
          const timestamp = Date.now()
          const disclaimerFileName = `flux2pro-apply-result-${timestamp}-${hash}.jpg`
          const initiateRes = await fetch('https://rest.alpha.fal.ai/storage/upload/initiate', {
            method: 'POST',
            headers: { 'Authorization': `Key ${falApiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ content_type: 'image/jpeg', file_name: disclaimerFileName })
          })
          if (!initiateRes.ok) throw new Error(`Initiate failed: ${initiateRes.status}`)
          const { upload_url: disclaimerUploadUrl, file_url: disclaimerFileUrl } = await initiateRes.json()
          const putRes = await fetch(disclaimerUploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': 'image/jpeg', 'Content-Length': disclaimerBuffer.length.toString() },
            body: new Uint8Array(disclaimerBuffer)
          })
          if (!putRes.ok) throw new Error(`PUT failed: ${putRes.status}`)
          finalUrl = disclaimerFileUrl
          console.log(`[Flux 2 Pro Edit Apply] ✅ Disclaimer applied and uploaded: ${finalUrl}`)
        } catch (disclaimerError) {
          console.warn(`[Flux 2 Pro Edit Apply] ⚠️  Disclaimer pipeline failed, using original URL:`, disclaimerError)
        }

        processedImages.push({
          url: finalUrl,
          width: img.width || 1024,
          height: img.height || 1024
        })
      }

      return NextResponse.json({
        success: true,
        images: processedImages,
        sceneType: sceneType,
        prompt: input.prompt,
        basePrompt: basePrompt,
        customPrompt: customPrompt || null,
        seed: result.data.seed,
        model: "fal-ai/flux-2-pro/edit",
        provider: "fal.ai",
        inputImages: allImageUrls.length,
        referenceImages: referenceImageFilenames,
        referenceImage: referenceImageFilenames[0],
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
    name: "FLUX.2 [pro] Scene-Based Style Apply API",
    description: "Apply TectonicaAI style to user images with scene-specific reference images and prompts",
    version: "2.0.0",
    endpoint: "/api/external/flux-2-pro-edit-apply",
    method: "POST",
    contentType: "application/json",
    
    features: [
      "4 scene types with optimized reference images and prompts",
      "Scene-specific style transfer (people, landscape, urban, monument)",
      "Required: 1 user image to apply style to",
      "Total: 2 images (1 style ref + 1 user)",
      "Mandatory scene-based prompt with optional custom additions",
      "Custom and preset sizes",
      "Configurable safety tolerance (1-5)",
      "JPEG or PNG output",
      "Seed support for reproducibility"
    ],
    
    sceneTypes: {
      people: {
        referenceImage: "TCT-AI-Landmark.png",
        description: "For portraits and images with people",
        defaultPrompt: "@image1 is the PRIMARY subject. Apply the artistic style, color palette, lighting mood, and atmospheric treatment of @image2 to the subject(s) in @image1. @image2 is a STYLE REFERENCE ONLY — do not introduce any structures, elements, or visual content from @image2 into the output. Preserve the exact pose, facial expression, anatomy, clothing, and identity of all subjects in @image1."
      },
      landscape: {
        referenceImage: "TCT-AI-Landmark-2.png",
        description: "For natural landscapes and outdoor scenes",
        defaultPrompt: "Combine the natural landscape scene from @image1 with the artistic style, color palette, lighting mood, and surface textures of @image2. Preserve exact composition, viewpoint, horizon line, scale, and all geographical features. Apply only stylistic rendering, atmosphere, and color grading."
      },
      urban: {
        referenceImage: "TCT-AI-Landmark-3.png",
        description: "For cityscapes and urban environments",
        defaultPrompt: "Combine the urban cityscape from @image1 with the artistic style and atmosphere of @image2. Preserve geometry, perspective lines, building silhouettes, and street layout. Apply only stylistic transformation: color palette, lighting mood, and material rendering."
      },
      monument: {
        referenceImage: "TCT-AI-Landmark.png",
        description: "For monuments, statues, and architectural landmarks",
        defaultPrompt: "Combine the monument and its surroundings from @image1 with the artistic style and atmosphere of @image2. Preserve exact architecture, proportions, and structural details. Apply only stylistic rendering, lighting mood, and color palette."
      }
    },
    
    defaultSceneType: "people",
    
    parameters: {
      sceneType: {
        type: "string",
        required: false,
        options: ["people", "landscape", "urban", "monument"],
        default: "people",
        description: "Type of scene to apply style transfer for (determines reference image and base prompt)"
      },
      prompt: {
        type: "string",
        required: false,
        description: "Optional custom prompt to APPEND at the end of the mandatory scene-based prompt",
        note: "Scene base prompt is always included. Custom prompt adds additional instructions."
      },
      imageUrl: {
        type: "string",
        required: "one of imageUrl or base64Image",
        description: "User image URL (will be @image1)",
        alternative: "Can use base64Image instead"
      },
      base64Image: {
        type: "string",
        required: "one of imageUrl or base64Image",
        description: "User Base64 image (will be @image1)",
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
        sceneType: "people",
        prompt: "[Full prompt including base + custom]",
        basePrompt: "[Scene-specific base prompt]",
        customPrompt: "[User's custom addition or null]",
        seed: 12345,
        model: "fal-ai/flux-2-pro/edit",
        provider: "fal.ai",
        inputImages: 2,
        referenceImage: "TCT-AI-Individual-Hispanic-Female-Young.png",
        userImages: 1,
        settings: {},
        timestamp: "2026-01-20T00:00:00.000Z"
      },
      error: {
        error: "Error description",
        details: "Additional details"
      }
    },
    
    examples: {
      peopleSceneUrl: {
        description: "Applying people style to portrait via URL",
        request: {
          sceneType: "people",
          imageUrl: "https://example.com/portrait.jpg",
          settings: {
            image_size: "portrait_4_3",
            output_format: "jpeg"
          }
        }
      },
      landscapeSceneBase64: {
        description: "Applying landscape style to nature photo",
        request: {
          sceneType: "landscape",
          base64Image: "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
          settings: {
            image_size: "landscape_16_9"
          }
        }
      },
      urbanWithCustomPrompt: {
        description: "Urban scene with custom prompt addition",
        request: {
          sceneType: "urban",
          prompt: "Add vibrant sunset lighting",
          imageUrl: "https://example.com/cityscape.jpg"
        },
        note: "Final prompt will be: [urban base prompt] + 'Add vibrant sunset lighting'"
      },
      monumentDefault: {
        description: "Monument style with default settings",
        request: {
          sceneType: "monument",
          imageUrl: "https://example.com/statue.jpg"
        }
      }
    },
    
    notes: [
      "Each sceneType uses a specific optimized reference image (@image2)",
      "User image is always @image1, reference image is @image2",
      "Base prompt from sceneType is MANDATORY and always included",
      "Custom prompt (if provided) is APPENDED to the base prompt",
      "Default sceneType is 'people' if not specified or invalid",
      "Processing time: 15-30 seconds depending on image size",
      "Total: 2 images (1 user + 1 scene-specific reference)",
      "Images automatically resized to respect fal.ai megapixel limits"
    ]
  })
}
