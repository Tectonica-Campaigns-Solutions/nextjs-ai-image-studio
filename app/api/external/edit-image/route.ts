import { NextRequest, NextResponse } from 'next/server'
import { fal } from "@fal-ai/client"

/**
 * POST /api/external/edit-image
 * 
 * External API endpoint for image editing using qwen-image-edit model.
 * This endpoint replicates the functionality of the main app's edit-image
 * feature but without requiring authentication.
 * 
 * Body parameters (multipart/form-data):
 * - image (required): Image file to edit (PNG, JPG, JPEG, WEBP)
 * - prompt (required): Description of desired edits
 * - customText (optional): Custom enhancement text to use instead of edit_enhancement_text (default: "Keep style of the image. Same color palette and same background.")
 * - intensity (optional): Enhancement intensity from 0.0 to 1.0 (default: 1.0)
 * - image_size (optional): Output image size - one of: square_hd, square, portrait_4_3, portrait_16_9, landscape_4_3, landscape_16_9 (default: square_hd)
 * 
 * JSON Enhancement is always enabled and automatically appends edit_enhancement_text to the user prompt.
 * RAG enhancement has been disabled for simplicity - focuses on consistent style preservation.
 * 
 * The endpoint automatically reads RAG and JSON enhancement configuration from the main app state.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    
    // Extract and validate required parameters
    const image = formData.get('image') as File
    const prompt = formData.get('prompt') as string
    const useRAG = false // Disabled for simplicity - focus on JSON enhancement only
    const useJSONEnhancement = formData.get("useJSONEnhancement") === "true"
    const customText = formData.get('customText') as string
    const intensity = parseFloat(formData.get('intensity') as string) || 1.0 // default 1.0
    const imageSize = formData.get('image_size') as string || 'square_hd' // default to square_hd
    const customWidth = formData.get('width') as string
    const customHeight = formData.get('height') as string
    
    // Validate image_size parameter
    const validImageSizes = ['square_hd', 'square', 'portrait_4_3', 'portrait_16_9', 'landscape_4_3', 'landscape_16_9', 'custom']
    if (imageSize && !validImageSizes.includes(imageSize)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid 'image_size' parameter",
          details: `image_size must be one of: ${validImageSizes.join(', ')}. Received: ${imageSize}`
        },
        { status: 400 }
      )
    }
    
    // Validate custom dimensions if using custom image_size
    if (imageSize === 'custom') {
      if (!customWidth || !customHeight) {
        return NextResponse.json(
          {
            success: false,
            error: "Missing custom dimensions",
            details: "When using image_size 'custom', both 'width' and 'height' parameters are required"
          },
          { status: 400 }
        )
      }
      
      let width = parseInt(customWidth)
      let height = parseInt(customHeight)
      
      if (isNaN(width) || isNaN(height) || width < 256 || width > 2048 || height < 256 || height > 2048) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid custom dimensions",
            details: "Width and height must be numbers between 256 and 2048 pixels"
          },
          { status: 400 }
        )
      }
      
      // Ensure dimensions are multiples of 64 for better compatibility
      width = Math.round(width / 64) * 64
      height = Math.round(height / 64) * 64
      
      console.log("[External Edit-Image] Adjusted custom dimensions to multiples of 64:", { 
        original: { width: parseInt(customWidth), height: parseInt(customHeight) },
        adjusted: { width, height }
      })
    }
    
    // Validate image file
    if (!image || !(image instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing or invalid 'image' file",
          details: "Please provide a valid image file (PNG, JPG, JPEG, WEBP)"
        },
        { status: 400 }
      )
    }
    
    // Validate prompt
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing or invalid 'prompt' parameter",
          details: "Prompt must be a non-empty string describing the desired edits"
        },
        { status: 400 }
      )
    }

    // Validate file type (prioritize Fal.ai compatible formats)
    const allowedTypes = ['image/png', 'image/jpg', 'image/jpeg', 'image/webp']
    const falaiOptimalTypes = ['image/png', 'image/jpeg', 'image/jpg']
    
    if (!allowedTypes.includes(image.type)) {
      return NextResponse.json(
        {
          success: false,
          error: "Unsupported image format",
          details: `Supported formats: PNG, JPG, JPEG, WEBP. Received: ${image.type}`
        },
        { status: 400 }
      )
    }

    // Warn if not optimal for Fal.ai
    if (!falaiOptimalTypes.includes(image.type)) {
      console.warn(`[External Edit-Image] Image type ${image.type} may cause issues with Fal.ai. Optimal: PNG, JPG, JPEG`)
    }

    // Validate file size (stricter for AI processing)
    const maxSizeBytes = 5 * 1024 * 1024 // 5MB for better AI compatibility
    if (image.size > maxSizeBytes) {
      return NextResponse.json(
        {
          success: false,
          error: "File too large for AI processing",
          details: `Maximum file size is 5MB for optimal AI processing. Received: ${(image.size / 1024 / 1024).toFixed(2)}MB. Try compressing the image.`
        },
        { status: 400 }
      )
    }

    // Apply content moderation to prompt
    const moderationResult = await moderateContent(prompt)
    if (!moderationResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: handleModerationError({ error: moderationResult.reason }),
          moderation: true
        },
        { status: 400 }
      )
    }

    // Prepare form data for internal API call
    const internalFormData = new FormData()
    internalFormData.append("image", image)
    internalFormData.append("prompt", prompt.trim())
    internalFormData.append("useRAG", useRAG.toString())
    
    // Start with original prompt - skip RAG for simplicity
    let finalPrompt = prompt.trim()
    let ragMetadata = null
    let jsonMetadata = null
    
    // Apply JSON enhancement with edit_enhancement_text
    if (useJSONEnhancement) {
      try {
        // Load edit_enhancement_text directly or use custom text
        let enhancementText = customText
        
        if (!enhancementText) {
          // Try to load from config first
          try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/enhancement-config`)
            const { success, config } = await response.json()
            if (success && config?.edit_enhancement_text) {
              enhancementText = config.edit_enhancement_text
              console.log("[External Edit-Image] Loaded edit_enhancement_text:", enhancementText)
            }
          } catch (error) {
            console.warn("[External Edit-Image] Could not load from API:", error)
          }
          
          // Fallback to hardcoded value if API failed
          if (!enhancementText) {
            enhancementText = "Keep style of the image. Same color palette and same background."
            console.log("[External Edit-Image] Using hardcoded edit_enhancement_text")
          }
        }

        // Apply enhancement text directly to the prompt
        const originalPrompt = finalPrompt
        finalPrompt = `${originalPrompt}, ${enhancementText}`
        
        jsonMetadata = {
          originalPrompt: originalPrompt,
          enhancedPrompt: finalPrompt,
          appliedText: enhancementText,
          wasEnhanced: true,
          intensity: intensity
        }
        
        console.log("[External Edit-Image] Final enhanced prompt:", finalPrompt)
      } catch (error) {
        console.warn("[External Edit-Image] JSON enhancement failed, using current prompt:", error)
        jsonMetadata = {
          originalPrompt: finalPrompt,
          enhancedPrompt: finalPrompt,
          appliedText: null,
          wasEnhanced: false,
          intensity: intensity,
          error: String(error)
        }
      }
    } else {
      console.log("[External Edit-Image] Using prompt without JSON enhancement")
      jsonMetadata = {
        originalPrompt: finalPrompt,
        enhancedPrompt: finalPrompt,
        appliedText: null,
        wasEnhanced: false,
        intensity: 0,
        disabled: true
      }
    }
    
    // Add RAG information (will be dynamic when app state is accessible)
    if (useRAG) {
      // TODO: Read from actual app state
      // const activeRAG = getActiveRAG()
      // if (activeRAG) {
      //   internalFormData.append("activeRAGId", activeRAG.id)
      //   internalFormData.append("activeRAGName", activeRAG.name)
      // }
    }

    // For external API, we MUST get the URL directly from Fal.ai (no base64)
    // Make the Fal.ai call directly to ensure URL response
    const falApiKey = process.env.FAL_API_KEY
    if (!falApiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Service configuration error",
          details: "FAL_API_KEY not configured for external API"
        },
        { status: 500 }
      )
    }

    try {
      console.log("[External Edit-Image] Making direct Fal.ai call to ensure URL response...")
      console.log("[External Edit-Image] Image details:", {
        name: image.name,
        size: image.size,
        type: image.type
      })
      console.log("[External Edit-Image] Final prompt:", finalPrompt)
      
      fal.config({
        credentials: falApiKey,
      })

      // Process image exactly like the working internal API
      console.log("[External Edit-Image] Processing image - Name:", image.name, "Size:", image.size, "Type:", image.type)
      
      const imageBuffer = await image.arrayBuffer()
      const base64Image = Buffer.from(imageBuffer).toString("base64")
      console.log("[External Edit-Image] Base64 image length:", base64Image.length)

      // Validate image buffer
      if (imageBuffer.byteLength === 0) {
        throw new Error("Image buffer is empty")
      }

      // Check if image is too large (similar to size limits in many APIs)
      const maxSizeBytes = 5 * 1024 * 1024 // 5MB limit
      if (imageBuffer.byteLength > maxSizeBytes) {
        console.warn("[External Edit-Image] Image is large:", imageBuffer.byteLength, "bytes")
        return NextResponse.json(
          {
            success: false,
            error: "Image too large",
            details: `Image size (${Math.round(imageBuffer.byteLength / 1024)}KB) exceeds maximum allowed (${Math.round(maxSizeBytes / 1024)}KB). Please upload a smaller image.`
          },
          { status: 413 }
        )
      }

      // Use exactly same format as internal API (always jpeg regardless of input type)
      const imageDataUrl = `data:image/jpeg;base64,${base64Image}`
      console.log("[External Edit-Image] Image data URL prefix:", imageDataUrl.substring(0, 50) + "...")

      // Ensure finalPrompt is a string and validate
      let cleanPrompt = String(finalPrompt || prompt || "").trim()
      if (!cleanPrompt) {
        throw new Error("Prompt cannot be empty")
      }
      console.log("[External Edit-Image] Clean prompt:", cleanPrompt)
      console.log("[External Edit-Image] Clean prompt length:", cleanPrompt.length)

      console.log("[External Edit-Image] Making Fal.ai call with qwen-image-edit...")
      
      // Prepare input for Fal.ai call
      const falInput: any = {
        prompt: cleanPrompt,
        image_url: imageDataUrl,
        // Add some common parameters that might help with compatibility
        guidance_scale: 7.5,
        num_inference_steps: 50,
        strength: 0.8
      }

      // Log detailed request info for debugging
      const requestData = {
        model: "fal-ai/qwen-image-edit",
        input: {
          prompt: cleanPrompt.substring(0, 100) + "...",
          image_url: imageDataUrl.substring(0, 50) + "... (" + imageDataUrl.length + " chars total)",
          image_size: falInput.image_size || "custom (using width/height)",
          width: falInput.width || "not set",
          height: falInput.height || "not set"
        }
      }
      console.log("[External Edit-Image] Request data:", JSON.stringify(requestData, null, 2))
      
      // Handle image_size: if custom, use width/height instead of image_size
      if (imageSize === 'custom') {
        // Use the validated and adjusted dimensions
        let width = parseInt(customWidth)
        let height = parseInt(customHeight)
        
        // Ensure dimensions are multiples of 64 for better compatibility
        width = Math.round(width / 64) * 64
        height = Math.round(height / 64) * 64
        
        falInput.width = width
        falInput.height = height
        
        // Some models work better with aspect ratio hints
        const aspectRatio = width / height
        if (Math.abs(aspectRatio - 1) < 0.1) {
          falInput.aspect_ratio = "square"
        } else if (aspectRatio > 1.3) {
          falInput.aspect_ratio = "landscape"
        } else if (aspectRatio < 0.8) {
          falInput.aspect_ratio = "portrait"
        }
        
        console.log("[External Edit-Image] Using custom dimensions:", { 
          originalWidth: parseInt(customWidth),
          originalHeight: parseInt(customHeight),
          adjustedWidth: falInput.width, 
          adjustedHeight: falInput.height,
          aspectRatio: aspectRatio.toFixed(2),
          aspectRatioHint: falInput.aspect_ratio || "none"
        })
      } else {
        falInput.image_size = imageSize
        console.log("[External Edit-Image] Using preset image_size:", imageSize)
      }

      const result = await fal.subscribe("fal-ai/qwen-image-edit", {
        input: falInput,
        logs: true,
        onQueueUpdate: (update) => {
          console.log("[External Edit-Image] Fal.ai status:", update.status)
          if (update.status === "IN_PROGRESS") {
            update.logs.map((log) => log.message).forEach(console.log)
          }
        },
      })

      console.log("[External Edit-Image] Fal.ai result:", result)

      if (result.data && result.data.images && result.data.images.length > 0) {
        const imageUrl = result.data.images[0].url

        // Format response for external API with URL and RAG metadata
        const externalResponse = {
          success: true,
          image: imageUrl, // Always return URL from Fal.ai
          originalImage: {
            name: image.name,
            size: image.size,
            type: image.type
          },
          prompt: {
            original: prompt,
            final: finalPrompt,
            enhanced: jsonMetadata?.wasEnhanced || false,
            jsonMetadata: jsonMetadata
          },
          processing: {
            model: "qwen-image-edit",
            timestamp: new Date().toISOString(),
            jsonEnhancement: jsonMetadata?.wasEnhanced ? 'applied' : 'none',
            enhancementsApplied: jsonMetadata?.wasEnhanced ? 1 : 0
          }
        }

        return NextResponse.json(externalResponse)
      } else {
        console.error("[External Edit-Image] No images returned from Fal.ai")
        return NextResponse.json(
          {
            success: false,
            error: "Image generation failed",
            details: "No images were generated by the AI model"
          },
          { status: 500 }
        )
      }
    } catch (falError) {
      console.error("[External Edit-Image] Fal.ai call failed:", falError)
      
      // More specific error handling
      let errorMessage = "AI model processing error"
      let errorDetails = falError instanceof Error ? falError.message : "Unknown error"
      
      if (errorDetails.includes("Unprocessable Entity") || errorDetails.includes("422")) {
        errorMessage = "Image or prompt not processable"
        errorDetails = "The image format or prompt content cannot be processed by the AI model. Try with a different image (JPG/PNG) or simpler prompt."
      } else if (errorDetails.includes("401") || errorDetails.includes("Unauthorized")) {
        errorMessage = "Authentication failed"
        errorDetails = "API key is invalid or expired"
      } else if (errorDetails.includes("429") || errorDetails.includes("Too Many Requests")) {
        errorMessage = "Rate limit exceeded"
        errorDetails = "Too many requests. Please try again in a few minutes."
      } else if (errorDetails.includes("timeout") || errorDetails.includes("TIMEOUT")) {
        errorMessage = "Processing timeout"
        errorDetails = "Image processing took too long. Try with a smaller image."
      }
      
      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          details: errorDetails,
          debug: {
            originalError: falError instanceof Error ? falError.message : String(falError),
            imageSize: image.size,
            imageType: image.type,
            promptLength: finalPrompt.length
          }
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('[External Edit-Image API] Unexpected error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}

/**
 * OPTIONS /api/external/edit-image
 * 
 * CORS preflight support
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

// Helper functions

function getBaseUrl(): string {
  // Get the base URL for internal API calls
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}

async function moderateContent(text: string): Promise<{ allowed: boolean; reason?: string }> {
  // Basic content moderation - can be enhanced with external services
  const text_lower = text.toLowerCase()
  
  // Check for explicit content
  const explicitTerms = ['explicit', 'sexual', 'nude', 'naked']
  if (explicitTerms.some(term => text_lower.includes(term))) {
    return { allowed: false, reason: 'explicit content detected' }
  }
  
  // Check for violence
  const violentTerms = ['violence', 'violent', 'weapon', 'kill', 'murder']
  if (violentTerms.some(term => text_lower.includes(term))) {
    return { allowed: false, reason: 'violent content detected' }
  }
  
  // Allow by default
  return { allowed: true }
}

function handleModerationError(errorData: any): string {
  if (!errorData?.error) return "Could not edit image. Please try with different content."
  
  const errorMessage = errorData.error.toLowerCase()
  
  // Check for specific moderation reasons
  if (errorMessage.includes('explicit') || errorMessage.includes('sexual') || errorMessage.includes('nude')) {
    return "This content contains explicit material that is not permitted. Try descriptions like 'professionals in meeting' or 'natural landscape'."
  }
  
  if (errorMessage.includes('violence') || errorMessage.includes('weapon') || errorMessage.includes('violent')) {
    return "This content includes violent elements that are not permitted. Try descriptions like 'peaceful demonstration' or 'community event'."
  }
  
  if (errorMessage.includes('public figure') || errorMessage.includes('celebrity') || errorMessage.includes('politician')) {
    return "We cannot generate images of public figures or celebrities. Describe generic people like 'community leader' or 'organizational spokesperson'."
  }
  
  if (errorMessage.includes('fake news') || errorMessage.includes('misinformation') || errorMessage.includes('false')) {
    return "This content could include misinformation. Make sure to describe accurate and truthful information for your organization."
  }
  
  if (errorMessage.includes('inappropriate language') || errorMessage.includes('offensive')) {
    return "The language used is not appropriate. Rephrase your description in a more professional and constructive manner."
  }
  
  if (errorMessage.includes('blocked by content moderation')) {
    return "This content does not comply with our usage policies. Try descriptions appropriate like 'educational campaign' or 'informational material'."
  }
  
  // Generic moderation message
  return "This content is not permitted according to our policies. Try descriptions appropriate for professional organizational use."
}
