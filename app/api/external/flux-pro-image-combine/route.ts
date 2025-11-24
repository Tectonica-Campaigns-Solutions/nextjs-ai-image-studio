import { NextRequest, NextResponse } from 'next/server'
import { fal } from "@fal-ai/client"
import { canonicalPromptProcessor, type CanonicalPromptConfig } from "@/lib/canonical-prompt"

// Route segment config for App Router
export const maxDuration = 300 // 5 minutes for long-running AI operations
export const dynamic = 'force-dynamic'

/**
 * POST /api/external/flux-pro-image-combine
 * 
 * Enhanced External API endpoint for combining images using a two-step processing pipeline:
 * 1. Process image2 with seedream-v4-edit using configured style prompt
 * 2. Combine image1 with processed image2 using flux-pro-image-combine
 * 
 * This endpoint allows external applications to create enhanced image combinations
 * without requiring authentication.
 * 
 * ENHANCED PIPELINE:
 * Input: [image1, image2] + user_prompt
 *   ↓
 * Step 1: seedream-v4-edit(image2, sedream_enhancement_text) → processed_image2
 *   ↓  
 * Step 2: flux-pro-image-combine([image1, processed_image2], user_prompt) → final_result
 * 
 * Supports two input methods:
 * 1. JSON with imageUrls array (existing functionality)
 * 2. multipart/form-data with uploaded files and/or URLs (new functionality)
 * 
 * IMPORTANT: Exactly 2 images are required for the enhanced pipeline.
 * 
 * JSON Body parameters:
 * - prompt (required): Text description for final image combination (used in Step 2)
 * - imageUrls (required): Array with exactly 2 image URLs [image1, image2]
 * - jsonOptions (optional): JSON enhancement configuration for final combination
 *   - customText: Custom enhancement description for Step 2
 *   - intensity: Enhancement intensity (0.1-1.0, default: 1.0)
 * 
 * Canonical Prompt Structure is enabled by default for Step 2 (final combination).
 * JSON Enhancement is disabled by default. RAG enhancement has been disabled for simplicity.
 * - settings (optional): Advanced generation settings for Step 2
 * 
 * Form Data parameters:
 * - prompt (required): Text description for final image combination (used in Step 2)
 * - image0, image1 (required): Exactly 2 image files to upload and process
 * - imageUrl0, imageUrl1 (optional): Exactly 2 image URLs to process
 * - useCanonicalPrompt (optional): Whether to use canonical prompt structure in Step 2 (default: false)
 * - canonicalConfig (optional): JSON string with canonical prompt configuration for Step 2
 * - useRAG (optional): Whether to enhance prompt with branding guidelines (default: false)
 * - useJSONEnhancement (optional): Whether to apply JSON-based prompt enhancement in Step 2 (default: false)
 * - jsonOptions (optional): JSON string with enhancement configuration for Step 2
 * - settings (optional): JSON string with advanced generation settings for Step 2
 * 
 * Advanced settings include (applied to Step 2):
 * - aspect_ratio: Output aspect ratio (1:1, 4:3, 3:4, 16:9, 9:16, 21:9, default: 1:1)
 * - guidance_scale: Prompt adherence (1-20, default: 3.5)
 * - num_images: Number of combined images to generate (always 1 for combination)
 * - seed: Random seed for reproducible results
 * - safety_tolerance: Content safety level (1-6, default: 2)
 * - output_format: Image format (jpeg, png, webp, default: jpeg)
 * - enhance_prompt: Whether to automatically enhance the prompt (default: false)
 * 
 * Response format:
 * {
 *   "success": true,
 *   "image": "https://fal.media/files/...",
 *   "width": 1024,
 *   "height": 1024,
 *   "content_type": "image/jpeg",
 *   "prompt": "enhanced prompt used in final combination",
 *   "originalPrompt": "user's original prompt",
 *   "model": "flux-pro/kontext/max/multi",
 *   "inputImages": 2,
 *   "enhancedPipeline": true,
 *   "pipelineSteps": [
 *     {
 *       "step": 1,
 *       "operation": "seedream-v4-edit",
 *       "inputImage": "image2_url",
 *       "outputImage": "processed_image2_url",
 *       "prompt": "configured_sedream_enhancement_text"
 *     },
 *     {
 *       "step": 2,
 *       "operation": "flux-pro-image-combine", 
 *       "inputImages": ["image1_url", "processed_image2_url"],
 *       "outputImage": "final_combined_url",
 *       "prompt": "user_prompt_enhanced"
 *     }
 *   ],
 *   "settings": {...}
 * }
 */
export async function POST(request: NextRequest) {
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  console.log(`\n========== [External Flux Combine ${requestId}] REQUEST START ==========`)
  
  try {
    // Detect content type to handle both JSON and form data
    const contentType = request.headers.get('content-type') || ''
    let body: any = {}
    let imageFiles: File[] = []
    let imageUrls: string[] = []
    
    if (contentType.includes('multipart/form-data')) {
      // Handle multipart/form-data for file uploads
      const formData = await request.formData()
      
      // Extract basic parameters
      body.prompt = formData.get("prompt") as string
      body.useRAG = false // Disabled for simplicity
      body.useJSONEnhancement = formData.get("useJSONEnhancement") === "true" || false // Default false
      body.useCanonicalPrompt = formData.get("useCanonicalPrompt") === "true" // Default false
      
      // Parse canonical config if provided
      const canonicalConfigStr = formData.get("canonicalConfig") as string
      if (canonicalConfigStr) {
        try {
          body.canonicalConfig = JSON.parse(canonicalConfigStr)
        } catch (error) {
          console.warn("[External Flux Combine] Failed to parse canonical config:", error)
          body.canonicalConfig = {}
        }
      } else {
        body.canonicalConfig = {}
      }
      
      // Parse JSON options if provided
      const jsonOptionsStr = formData.get("jsonOptions") as string
      if (jsonOptionsStr) {
        try {
          body.jsonOptions = JSON.parse(jsonOptionsStr)
        } catch (error) {
          console.warn("[External Flux Combine] Failed to parse JSON options:", error)
          body.jsonOptions = {}
        }
      } else {
        body.jsonOptions = {}
      }
      
      // Parse settings if provided
      const settingsStr = formData.get("settings") as string
      if (settingsStr) {
        try {
          body.settings = JSON.parse(settingsStr)
        } catch (error) {
          console.warn("[External Flux Combine] Failed to parse settings:", error)
          body.settings = {}
        }
      } else {
        body.settings = {}
      }
      
      // Extract image files, URLs, and Base64 images
      const base64Images: string[] = []
      
      for (const [key, value] of formData.entries()) {
        if (key.startsWith('image') && value instanceof File && key.match(/^image\d+$/)) {
          imageFiles.push(value)
          console.log(`[External Flux Combine] Found image file: ${key}, size: ${value.size}, type: ${value.type}`)
        } else if (key.startsWith('imageUrl') && typeof value === 'string' && value.trim() && key.match(/^imageUrl\d+$/)) {
          imageUrls.push(value.trim())
          console.log(`[External Flux Combine] Found image URL: ${key}, url: ${value}`)
        } else if (key.startsWith('imageBase64') && typeof value === 'string' && value.trim()) {
          const base64String = value.trim()
          base64Images.push(base64String)
          console.log(`[External Flux Combine] Found Base64 image: ${key}, length: ${base64String.length} chars (${(base64String.length / 1024 / 1024).toFixed(2)} MB)`)
          
          // Check if Base64 might be truncated (doesn't end properly)
          // Valid Base64 should end with = padding or alphanumeric chars
          const last4 = base64String.slice(-4)
          if (!last4.match(/[A-Za-z0-9+/=]{4}$/)) {
            console.warn(`[External Flux Combine] ⚠️  WARNING: Base64 image ${key} might be truncated (unusual ending: "${last4}")`)
          }
        }
      }
      
      console.log("[External Flux Combine] Form data processing complete:")
      console.log("  - Image files:", imageFiles.length)
      console.log("  - Image URLs:", imageUrls.length)
      console.log("  - Base64 images:", base64Images.length)
      
      // Store base64Images for later processing
      body.base64Images = base64Images
      
    } else {
      // Handle JSON requests (existing functionality)
      body = await request.json()
      imageUrls = body.imageUrls || []
      
      // Set defaults for JSON requests
      body.useRAG = false // Disabled for simplicity  
      body.useJSONEnhancement = body.useJSONEnhancement !== undefined ? body.useJSONEnhancement : false // Default false
      body.useCanonicalPrompt = body.useCanonicalPrompt !== undefined ? body.useCanonicalPrompt : false // Default false
      body.canonicalConfig = body.canonicalConfig || {}
      body.jsonOptions = body.jsonOptions || {}
      
      // Extract Base64 images from JSON body
      const base64Images: string[] = []
      Object.keys(body).forEach((key) => {
        if (key.startsWith('imageBase64') && typeof body[key] === 'string' && body[key].trim()) {
          const base64String = body[key].trim()
          base64Images.push(base64String)
          console.log(`[External Flux Combine] Found Base64 image: ${key}, length: ${base64String.length} chars (${(base64String.length / 1024 / 1024).toFixed(2)} MB)`)
        }
      })
      
      if (base64Images.length > 0) {
        console.log(`[External Flux Combine] Processing ${base64Images.length} Base64 images...`)
      }
      
      // Store base64Images for later processing
      body.base64Images = base64Images
    }
    
    // Validate required parameters
    if (!body.prompt || typeof body.prompt !== 'string' || !body.prompt.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing or invalid 'prompt' parameter",
          details: "Prompt must be a non-empty string"
        },
        { status: 400 }
      )
    }

    // Validate that we have exactly 2 images for enhanced pipeline (files + URLs + Base64)
    const base64Images = body.base64Images || []
    const totalImages = imageFiles.length + imageUrls.length + base64Images.length
    if (totalImages !== 2) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid number of images",
          details: `Exactly 2 images are required for enhanced combination pipeline. Found ${imageFiles.length} files, ${imageUrls.length} URLs, and ${base64Images.length} Base64 images (total: ${totalImages}). The pipeline will process image2 with seedream-v4-edit, then combine image1 with the processed result.`
        },
        { status: 400 }
      )
    }

    // Validate that all imageUrls are valid strings
    const invalidUrls = imageUrls.filter((url: any) => !url || typeof url !== 'string' || !url.trim())
    if (invalidUrls.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid image URLs detected",
          details: "All imageUrls must be non-empty strings"
        },
        { status: 400 }
      )
    }

    // Validate image files
    const maxFileSize = 10 * 1024 * 1024 // 10MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    
    for (const file of imageFiles) {
      if (file.size > maxFileSize) {
        return NextResponse.json(
          {
            success: false,
            error: "File too large",
            details: `File ${file.name} is ${Math.round(file.size / 1024 / 1024)}MB. Maximum allowed size is 10MB.`
          },
          { status: 413 }
        )
      }
      
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          {
            success: false,
            error: "Unsupported file type",
            details: `File ${file.name} has type ${file.type}. Allowed types: ${allowedTypes.join(', ')}`
          },
          { status: 415 }
        )
      }
    }

    // Extract parameters with defaults
    const {
      prompt,
      useRAG = false, // RAG disabled for image combination
      useJSONEnhancement,
      useCanonicalPrompt,
      canonicalConfig,
      jsonOptions = {},
      settings = {}
    } = body

    // Set default values for jsonOptions if not provided
    const defaultJsonOptions = {
      intensity: 1.0, // Default intensity at 100% for Combine Images
      customText: '', // Will use enhancement_text if empty
      ...jsonOptions
    }

    console.log("[External Flux Combine] Request received:")
    console.log("  - Prompt:", prompt.substring(0, 100) + "...")
    console.log("  - Image files count:", imageFiles.length)
    console.log("  - Image URLs count:", imageUrls.length)
    console.log("  - Base64 images count:", base64Images.length)
    console.log("  - Total images:", totalImages)
    console.log("  - Use RAG:", useRAG, "(disabled for combination)")
    console.log("  - Use JSON Enhancement:", useJSONEnhancement)
    console.log("  - Use Canonical Prompt:", useCanonicalPrompt)
    console.log("  - JSON Options:", defaultJsonOptions)
    console.log("  - Canonical Config:", canonicalConfig)
    console.log("  - Settings:", settings)

    // Basic content moderation
    const moderationResult = await basicContentModeration(prompt)
    if (!moderationResult.safe) {
      console.log("[External Flux Combine] Content blocked:", moderationResult.reason)
      return NextResponse.json(
        {
          success: false,
          error: "Content moderation failed",
          details: moderationResult.reason,
          category: moderationResult.category
        },
        { status: 400 }
      )
    }

    // Check if Fal.ai API key is available
    const falApiKey = process.env.FAL_API_KEY
    if (!falApiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Service configuration error",
          details: "Image generation service not available"
        },
        { status: 500 }
      )
    }

    // Process prompt using canonical or JSON enhancement
    let finalPrompt = prompt

    // Check if canonical prompt should be used
    if (useCanonicalPrompt) {
      // Use canonical prompt processor (same as internal endpoint)
      console.log("[External Flux Combine] Using canonical prompt structure")
      console.log("[External Flux Combine] Canonical config:", canonicalConfig)
      
      // Set user input from original prompt
      const completeCanonicalConfig = { ...canonicalConfig, userInput: prompt }
      
      // Generate canonical prompt
      const result = canonicalPromptProcessor.generateCanonicalPrompt(completeCanonicalConfig)
      finalPrompt = result.canonicalPrompt
      
      console.log("[External Flux Combine] Generated canonical prompt:", finalPrompt)
      console.log("[External Flux Combine] Processed user input:", result.processedUserInput)
    } else if (useJSONEnhancement) {
      // Apply JSON enhancement with enhancement_text (legacy method)
      let enhancementText = defaultJsonOptions.customText
      
      if (!enhancementText) {
        // Try to load enhancement_text from config first
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/enhancement-config`)
          const { success, config } = await response.json()
          if (success && config?.enhancement_text) {
            enhancementText = config.enhancement_text
            console.log("[External Flux Combine] Loaded enhancement_text:", enhancementText)
          }
        } catch (error) {
          console.warn("[External Flux Combine] Could not load from API:", error)
        }
      }

      // Apply enhancement text directly to the prompt if available
      if (enhancementText) {
        finalPrompt = `${prompt}, ${enhancementText}`
        console.log("[External Flux Combine] Enhanced prompt (legacy):", finalPrompt)
      } else {
        console.log("[External Flux Combine] No enhancement text available, using original prompt")
      }
    }

    console.log("[External Flux Combine] Final prompt:", finalPrompt)

    // Prepare default settings
    const defaultSettings = {
      aspect_ratio: "1:1",
      guidance_scale: 3.5,
      num_images: 1, // Always 1 for combination
      safety_tolerance: 2,
      output_format: "jpeg",
      // seed removed - let each generation be unique
      enhance_prompt: false
    }

    const mergedSettings = { ...defaultSettings, ...settings }

    // Configure Fal.ai client
    fal.config({
      credentials: falApiKey,
    })

    // Upload image files to fal.ai storage if any
    const allImageUrls: string[] = [...imageUrls]
    
    if (imageFiles.length > 0) {
      console.log("[External Flux Combine] Uploading image files to fal.ai storage...")
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i]
        try {
          console.log(`[External Flux Combine] Uploading image ${i + 1}/${imageFiles.length}: ${file.name} (${file.size} bytes)`)
          const uploadedUrl = await fal.storage.upload(file)
          allImageUrls.push(uploadedUrl)
          console.log(`[External Flux Combine] Image ${i + 1} uploaded successfully: ${uploadedUrl}`)
        } catch (uploadError) {
          console.error(`[External Flux Combine] Failed to upload image ${i + 1}:`, uploadError)
          return NextResponse.json({ 
            success: false,
            error: `Failed to upload image ${i + 1}: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`,
            details: `File: ${file.name}, Size: ${file.size} bytes`
          }, { status: 500 })
        }
      }
    }

    // Process Base64 images if any
    if (base64Images.length > 0) {
      console.log("[External Flux Combine] Processing Base64 images...")
      for (let i = 0; i < base64Images.length; i++) {
        const base64Data = base64Images[i]
        try {
          // Extract MIME type and base64 string
          let base64String = base64Data
          let mimeType = 'image/jpeg' // Default MIME type
          
          if (base64Data.startsWith('data:')) {
            const matches = base64Data.match(/^data:([^;]+);base64,(.+)$/)
            if (matches) {
              mimeType = matches[1]
              base64String = matches[2]
              
              // Normalize MIME type: image/jpg -> image/jpeg (for compatibility)
              if (mimeType === 'image/jpg') {
                mimeType = 'image/jpeg'
                console.log(`[External Flux Combine] Normalized MIME type from image/jpg to image/jpeg for image ${i + 1}`)
              }
            } else {
              throw new Error("Invalid data URL format")
            }
          }

          // Validate MIME type
          if (!allowedTypes.includes(mimeType)) {
            return NextResponse.json(
              {
                success: false,
                error: "Unsupported Base64 image type",
                details: `Image ${i + 1} has type ${mimeType}. Allowed types: ${allowedTypes.join(', ')}`
              },
              { status: 415 }
            )
          }

          // Validate base64 format
          if (!/^[A-Za-z0-9+/=]+$/.test(base64String)) {
            return NextResponse.json(
              {
                success: false,
                error: "Invalid Base64 format",
                details: `Base64 image ${i + 1} contains invalid characters`
              },
              { status: 400 }
            )
          }

          console.log(`[External Flux Combine] Processing Base64 image ${i + 1}/${base64Images.length}, type: ${mimeType}`)

          // Convert to Buffer
          const imageBuffer = Buffer.from(base64String, 'base64')

          // Validate size (10MB max)
          if (imageBuffer.length > maxFileSize) {
            return NextResponse.json(
              {
                success: false,
                error: "Base64 image too large",
                details: `Base64 image ${i + 1} is ${Math.round(imageBuffer.length / 1024 / 1024)}MB. Maximum allowed size is 10MB.`
              },
              { status: 413 }
            )
          }

          // ALWAYS normalize to proper JPEG format for maximum compatibility
          let finalBuffer: Buffer = imageBuffer
          let finalMimeType = 'image/jpeg' // Always use standard JPEG
          
          console.log(`[External Flux Combine] Base64 image ${i + 1} original size: ${(imageBuffer.length / 1024 / 1024).toFixed(2)} MB, type: ${mimeType}`)
          
          // CRITICAL: Validate image integrity BEFORE processing
          const sharpModule = await import('sharp')
          const sharp = sharpModule.default
          
          try {
            const metadata = await sharp(imageBuffer).metadata()
            console.log(`[External Flux Combine] ✅ Image validated: ${metadata.format}, ${metadata.width}x${metadata.height}`)
          } catch (validationError) {
            const errorMsg = validationError instanceof Error ? validationError.message : String(validationError)
            console.error(`[External Flux Combine] ❌ CORRUPTED BASE64 IMAGE DETECTED:`, errorMsg)
            throw new Error(`Base64 image ${i + 1} is corrupted or incomplete. Error: ${errorMsg}. Please ensure the Base64 string is complete and correctly formatted.`)
          }
          
          try {
            console.log(`[External Flux Combine] Normalizing to JPEG with Sharp...`)
            
            // Convert to standardized JPEG: 90% quality, max 2048px
            // This ensures compatibility with all fal.ai models
            const normalizedBuffer = await sharp(imageBuffer)
              .resize(2048, 2048, {
                fit: 'inside',
                withoutEnlargement: true
              })
              .jpeg({ quality: 90 })
              .toBuffer()
            
            console.log(`[External Flux Combine] ✅ Normalized to JPEG: ${(imageBuffer.length / 1024 / 1024).toFixed(2)} MB → ${(normalizedBuffer.length / 1024 / 1024).toFixed(2)} MB`)
            
            finalBuffer = normalizedBuffer
            
          } catch (sharpError: unknown) {
            const errorMsg = sharpError instanceof Error ? sharpError.message : String(sharpError)
            const errorStack = sharpError instanceof Error ? sharpError.stack : 'N/A'
            console.error(`[External Flux Combine] ❌ JPEG normalization failed:`, errorMsg)
            console.error(`[External Flux Combine] Error stack:`, errorStack)
            console.warn(`[External Flux Combine] ⚠️  WARNING: Using original image without normalization - MAY CAUSE COMPATIBILITY ISSUES`)
          }
          
          // Upload using 2-step process: initiate → PUT direct to storage
          // This avoids File object truncation issues in Node.js
          const fileExtension = finalMimeType.split('/')[1] || 'jpeg'
          const fileName = `base64-image-${i + 1}.${fileExtension}`
          
          console.log(`[External Flux Combine] Uploading ${fileName}: ${finalBuffer.length} bytes (${(finalBuffer.length / 1024 / 1024).toFixed(2)} MB)`)
          
          // Get FAL API key
          const falApiKey = process.env.FAL_API_KEY
          if (!falApiKey) {
            throw new Error("FAL_API_KEY not configured")
          }
          
          // Step 1: Initiate upload to get presigned URL
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
          
          const { upload_url, file_url } = await initiateResponse.json() as { 
            upload_url: string
            file_url: string 
          }
          
          console.log(`[External Flux Combine] Got presigned URL, uploading ${finalBuffer.length} bytes...`)
          
          // Step 2: PUT the actual file data to presigned URL
          // Convert Buffer to Uint8Array for fetch compatibility
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
          
          const uploadedUrl = file_url
          
          console.log(`[External Flux Combine] ✅ Uploaded successfully: ${uploadedUrl}`)
          console.log(`[External Flux Combine]    Original: ${imageBuffer.length} bytes → Sharp: ${finalBuffer.length} bytes → Sent: ${uint8Array.byteLength} bytes`)
          allImageUrls.push(uploadedUrl)
          console.log(`[External Flux Combine] Base64 image ${i + 1} uploaded successfully: ${uploadedUrl}`)
          
          // Verify upload by checking if URL is accessible
          try {
            const verifyResponse = await fetch(uploadedUrl, { method: 'HEAD' })
            if (!verifyResponse.ok) {
              console.warn(`[External Flux Combine] Warning: Uploaded file may not be accessible (Status: ${verifyResponse.status})`)
            } else {
              console.log(`[External Flux Combine] Upload verified: ${verifyResponse.headers.get('content-type')}, ${verifyResponse.headers.get('content-length')} bytes`)
            }
          } catch (verifyError: unknown) {
            const errorMsg = verifyError instanceof Error ? verifyError.message : String(verifyError)
            console.warn(`[External Flux Combine] Could not verify upload:`, errorMsg)
          }
        } catch (base64Error) {
          console.error(`[External Flux Combine] Failed to process Base64 image ${i + 1}:`, base64Error)
          return NextResponse.json({ 
            success: false,
            error: `Failed to process Base64 image ${i + 1}: ${base64Error instanceof Error ? base64Error.message : 'Unknown error'}`,
            details: "Ensure the Base64 string is valid and the image is within the 10MB size limit"
          }, { status: 400 })
        }
      }
    }

    console.log("[External Flux Combine] All image URLs ready:", allImageUrls.length, "total images")
    console.log("[External Flux Combine] Starting enhanced pipeline: seedream → combine")

    // Build base URL for internal API calls - more robust for production environments
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : process.env.NEXT_PUBLIC_APP_URL 
      ? process.env.NEXT_PUBLIC_APP_URL
      : request.nextUrl.origin || 'http://localhost:3000'
    
    console.log("[External Flux Combine] Using base URL for internal calls:", baseUrl)

    // ENHANCED PIPELINE: Step 1 - Process image2 (second image) with seedream-v4-edit
    console.log("[External Flux Combine] Pipeline Step 1: Processing image2 with seedream-v4-edit")
    
    const image1Url = allImageUrls[0] // First image (remains unchanged)
    const image2Url = allImageUrls[1] // Second image (will be processed with seedream)
    
    console.log("[External Flux Combine] Image1 (unchanged):", image1Url)
    console.log("[External Flux Combine] Image2 (to be processed):", image2Url)

    let processedImage2Url: string
    let sedreamPrompt: string // Declare sedream prompt variable
    
    try {
      // Get sedream enhancement text from configuration
      const { getSedreamEnhancementText } = await import("@/lib/json-enhancement")
      sedreamPrompt = await getSedreamEnhancementText() || ""
      
      if (!sedreamPrompt) {
        console.error("[External Flux Combine] No sedream_enhancement_text configured")
        return NextResponse.json({
          success: false,
          error: "Configuration error",
          details: "No SeDream enhancement text configured for image processing pipeline"
        }, { status: 500 })
      }

      console.log("[External Flux Combine] Using sedream prompt:", sedreamPrompt.substring(0, 100) + "...")

      // Call seedream-v4-edit to process image2
      const seedreamFormData = new FormData()
      
      // Pass image2 URL directly to seedream (no need to download and re-upload)
      console.log(`[External Flux Combine] Passing image2 URL directly to SeDream: ${image2Url}`)
      seedreamFormData.append("imageUrl", image2Url)
      seedreamFormData.append("prompt", sedreamPrompt) // Use configured sedream prompt, NOT user prompt
      seedreamFormData.append("useJSONEnhancement", "false") // Use prompt as-is
      seedreamFormData.append("customEnhancementText", sedreamPrompt)
      seedreamFormData.append("aspect_ratio", mergedSettings.aspect_ratio || "1:1")

      console.log(`[External Flux Combine ${requestId}] Calling seedream-v4-edit API...`)
      
      const seedreamResponse = await fetch(`${baseUrl}/api/seedream-v4-edit`, {
        method: 'POST',
        body: seedreamFormData,
      })

      // const seedreamResponse = await fetch(`https://jpg-invalid-remains-buying.trycloudflare.com/api/seedream-v4-edit`, {
      //   method: 'POST',
      //   body: seedreamFormData,
      // })

      if (!seedreamResponse.ok) {
        const errorText = await seedreamResponse.text()
        throw new Error(`SeDream API failed: ${seedreamResponse.status} - ${errorText}`)
      }

      const seedreamResult = await seedreamResponse.json()
      
      if (!seedreamResult.images || !seedreamResult.images[0] || !seedreamResult.images[0].url) {
        throw new Error("SeDream API returned invalid response")
      }

      processedImage2Url = seedreamResult.images[0].url
      console.log(`[External Flux Combine ${requestId}] ✅ SeDream processing complete:`, processedImage2Url)
      
    } catch (seedreamError) {
      console.error("[External Flux Combine] Pipeline Step 1 failed:", seedreamError)
      return NextResponse.json({
        success: false,
        error: "Pipeline step 1 failed",
        details: `SeDream processing failed: ${seedreamError instanceof Error ? seedreamError.message : 'Unknown error'}`,
        step: "seedream-v4-edit",
        failedImage: image2Url
      }, { status: 500 })
    }

    // ENHANCED PIPELINE: Step 2 - Combine image1 with processed image2
    console.log("[External Flux Combine] Pipeline Step 2: Combining images with flux-pro-image-combine")
    console.log("[External Flux Combine] Final combination:")
    console.log("  - Image1 (original):", image1Url)
    console.log("  - Image2 (processed):", processedImage2Url)
    console.log("  - User prompt:", finalPrompt)

    // Prepare final image URLs for combination
    const finalImageUrls = [image1Url, processedImage2Url]

    // Prepare input for Flux Pro Multi (Step 2 of pipeline)
    const input: any = {
      prompt: finalPrompt, // Use user's prompt for final combination
      image_urls: finalImageUrls, // image1 + processed image2
      aspect_ratio: mergedSettings.aspect_ratio,
      guidance_scale: mergedSettings.guidance_scale,
      num_images: mergedSettings.num_images,
      safety_tolerance: mergedSettings.safety_tolerance,
      output_format: mergedSettings.output_format,
      enhance_prompt: mergedSettings.enhance_prompt
    }

    // Add seed if provided
    if (mergedSettings.seed !== undefined && mergedSettings.seed !== null && mergedSettings.seed !== "") {
      input.seed = parseInt(mergedSettings.seed.toString())
    }

    console.log(`[External Flux Combine ${requestId}] Calling fal.ai with enhanced pipeline input:`)
    console.log("  - Model: fal-ai/flux-pro/kontext/max/multi")
    console.log("  - Input images:", finalImageUrls.length)
    console.log("  - Original files uploaded:", imageFiles.length)
    console.log("  - Original direct URLs:", imageUrls.length)
    console.log("  - Settings:", JSON.stringify(mergedSettings, null, 2))

    try {
      // Direct call to fal.ai for final combination
      const result = await fal.subscribe("fal-ai/flux-pro/kontext/max/multi", {
        input,
        logs: true,
        onQueueUpdate: (update: any) => {
          if (update.status === "IN_PROGRESS") {
            update.logs.map((log: any) => log.message).forEach(console.log)
          }
        },
      })

      console.log("[External Flux Combine] Fal.ai result:", result)

      if (result.data && result.data.images && result.data.images.length > 0) {
        const combinedImage = result.data.images[0] // Single combined result
        
        // Format response for external API with enhanced pipeline metadata
        const externalResponse = {
          success: true,
          image: combinedImage.url,
          width: combinedImage.width,
          height: combinedImage.height,
          content_type: combinedImage.content_type || "image/jpeg",
          prompt: finalPrompt,
          originalPrompt: prompt,
          inputImages: 2, // Always 2 for enhanced pipeline
          uploadedFiles: imageFiles.length,
          directUrls: imageUrls.length,
          canonicalPromptUsed: useCanonicalPrompt,
          canonicalConfig: useCanonicalPrompt ? canonicalConfig : undefined,
          jsonEnhancementUsed: useJSONEnhancement,
          jsonOptions: useJSONEnhancement ? defaultJsonOptions : undefined,
          settings: mergedSettings,
          model: "flux-pro/kontext/max/multi",
          timestamp: new Date().toISOString(),
          ragEnhanced: useRAG,
          // Enhanced pipeline metadata
          enhancedPipeline: true,
          pipelineSteps: [
            {
              step: 1,
              operation: "seedream-v4-edit",
              inputImage: image2Url,
              outputImage: processedImage2Url,
              prompt: sedreamPrompt
            },
            {
              step: 2,
              operation: "flux-pro-image-combine",
              inputImages: finalImageUrls,
              outputImage: combinedImage.url,
              prompt: finalPrompt
            }
          ]
        }

        console.log(`[External Flux Combine ${requestId}] ✅ Enhanced pipeline completed successfully`)
        console.log(`========== [External Flux Combine ${requestId}] REQUEST END ==========\n`)
        return NextResponse.json(externalResponse)
      } else {
        throw new Error("No combined image returned from Flux Pro Multi")
      }
    } catch (falError) {
      console.error("[External Flux Combine] Pipeline Step 2 failed:", falError)
      
      // Fallback to internal API for step 2
      console.log("[External Flux Combine] Falling back to internal API for step 2...")
      
      try {
        const fallbackFormData = new FormData()
        fallbackFormData.append("prompt", finalPrompt) // Use enhanced prompt
        fallbackFormData.append("useRag", "false") // Disable RAG for image combination
        fallbackFormData.append("activeRAGId", "none")
        fallbackFormData.append("activeRAGName", "None")
        fallbackFormData.append("orgType", "general")
        
        // Add canonical prompt parameters
        fallbackFormData.append("useCanonicalPrompt", useCanonicalPrompt.toString())
        if (useCanonicalPrompt && canonicalConfig) {
          fallbackFormData.append("canonicalConfig", JSON.stringify(canonicalConfig))
        }
        
        // Add JSON enhancement parameters
        fallbackFormData.append("useJSONEnhancement", useJSONEnhancement.toString())
        if (useJSONEnhancement) {
          fallbackFormData.append("jsonOptions", JSON.stringify(defaultJsonOptions))
        }
        
        // Add final processed image URLs to form data
        finalImageUrls.forEach((url: string, index: number) => {
          fallbackFormData.append(`imageUrl${index}`, url)
        })
        
        fallbackFormData.append("settings", JSON.stringify(settings))

        console.log("[External Flux Combine] Calling internal flux-pro-image-combine API...")

        const internalResponse = await fetch(`${baseUrl}/api/flux-pro-image-combine`, {
          method: 'POST',
          body: fallbackFormData,
        })

        if (internalResponse.ok) {
          const internalResult = await internalResponse.json()
          
          if (internalResult.success && internalResult.image) {
            // Format response for external API with enhanced pipeline metadata
            const externalResponse = {
              success: true,
              image: internalResult.image,
              width: internalResult.width,
              height: internalResult.height,
              content_type: internalResult.content_type || "image/jpeg",
              prompt: internalResult.finalPrompt || finalPrompt,
              originalPrompt: prompt,
              inputImages: 2, // Always 2 for enhanced pipeline
              uploadedFiles: imageFiles.length,
              directUrls: imageUrls.length,
              canonicalPromptUsed: useCanonicalPrompt,
              canonicalConfig: useCanonicalPrompt ? canonicalConfig : undefined,
              jsonEnhancementUsed: useJSONEnhancement,
              jsonOptions: useJSONEnhancement ? defaultJsonOptions : undefined,
              settings: internalResult.settings || mergedSettings,
              model: "flux-pro/kontext/max/multi",
              timestamp: new Date().toISOString(),
              ragEnhanced: useRAG,
              fallback: true,
              // Enhanced pipeline metadata
              enhancedPipeline: true,
              pipelineSteps: [
                {
                  step: 1,
                  operation: "seedream-v4-edit",
                  inputImage: image2Url,
                  outputImage: processedImage2Url,
                  prompt: sedreamPrompt
                },
                {
                  step: 2,
                  operation: "flux-pro-image-combine-fallback",
                  inputImages: finalImageUrls,
                  outputImage: internalResult.image,
                  prompt: internalResult.finalPrompt || finalPrompt
                }
              ]
            }

            console.log("[External Flux Combine] ✅ Enhanced pipeline fallback successful")
            return NextResponse.json(externalResponse)
          }
        }
        
        console.error("[External Flux Combine] Fallback also failed:", await internalResponse.text())
        throw new Error("Both direct and fallback methods failed for step 2")
      } catch (fallbackError) {
        console.error("[External Flux Combine] Step 2 fallback failed:", fallbackError)
        throw falError // Re-throw original error
      }
    }

  } catch (error) {
    console.error(`[External Flux Combine ${requestId}] API Error:`, error)
    console.log(`========== [External Flux Combine ${requestId}] REQUEST END (ERROR) ==========\n`)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to combine images',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}

/**
 * OPTIONS /api/external/flux-pro-image-combine
 * 
 * CORS preflight handler for external image combination endpoint
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  })
}

/**
 * Unified content moderation function
 * This uses the same comprehensive moderation logic as all other endpoints
 */
function moderateContent(text: string): { allowed: boolean; reason?: string; flaggedTerms?: string[] } {
  const lowerText = text.toLowerCase()
  
  // Comprehensive NSFW and inappropriate content detection
  const nsfwTerms = [
    'naked', 'nude', 'topless', 'undressed', 'bare', 'exposed', 'revealing',
    'breast', 'breasts', 'nipple', 'nipples', 'cleavage', 'bare chest',
    'underwear', 'lingerie', 'bikini', 'swimsuit', 'bra', 'panties',
    'sexual', 'erotic', 'seductive', 'sensual', 'provocative', 'suggestive',
    'intimate', 'arousing', 'lustful', 'passionate', 'orgasm', 'climax',
    'nsfw', 'adult content', 'mature content', 'explicit', 'inappropriate',
    'sex', 'sexy', 'horny', 'kinky', 'fetish', 'porn', 'pornographic'
  ]
  
  // Violence and harmful content
  const violenceTerms = [
    'violence', 'violent', 'kill', 'murder', 'death', 'blood', 'gore',
    'weapon', 'gun', 'knife', 'sword', 'bomb', 'explosion', 'torture',
    'harm', 'hurt', 'pain', 'suffering', 'abuse', 'assault'
  ]
  
  // Age-related inappropriate content
  const ageTerms = [
    'younger', 'child', 'kid', 'minor', 'underage', 'teen', 'teenager',
    'juvenile', 'adolescent', 'schoolgirl', 'schoolboy', 'loli', 'shota'
  ]
  
  const allTerms = [...nsfwTerms, ...violenceTerms, ...ageTerms]
  const flaggedTerms: string[] = []
  
  // Check for exact matches and partial matches
  for (const term of allTerms) {
    if (lowerText.includes(term)) {
      flaggedTerms.push(term)
    }
  }
  
  // Additional pattern-based detection for problematic phrases
  const problematicPatterns = [
    /make.*naked/i,
    /remove.*cloth/i,
    /without.*cloth/i,
    /show.*breast/i,
    /visible.*breast/i,
    /expose.*body/i,
    /bare.*skin/i,
    /strip.*down/i,
    /undress/i,
    /sexual.*pose/i,
    /erotic.*scene/i
  ]
  
  for (const pattern of problematicPatterns) {
    if (pattern.test(text)) {
      flaggedTerms.push(`Pattern: ${pattern.source}`)
    }
  }
  
  if (flaggedTerms.length > 0) {
    console.warn(`[External Flux Combine] Content moderation blocked request. Flagged terms:`, flaggedTerms)
    return {
      allowed: false,
      reason: "Content contains inappropriate or harmful material",
      flaggedTerms
    }
  }
  
  return { allowed: true }
}

/**
 * Adapter function to maintain compatibility with existing code
 */
async function basicContentModeration(prompt: string): Promise<{ safe: boolean; reason?: string; category?: string }> {
  const result = moderateContent(prompt)
  return {
    safe: result.allowed,
    reason: result.reason,
    category: result.allowed ? undefined : 'inappropriate_content'
  }
}
