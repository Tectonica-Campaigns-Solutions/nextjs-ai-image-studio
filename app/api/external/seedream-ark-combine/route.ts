import { type NextRequest, NextResponse } from "next/server"
import { fal } from "@fal-ai/client"
import { ContentModerationService } from "@/lib/content-moderation"
import { canonicalPromptProcessor, type CanonicalPromptConfig } from "@/lib/canonical-prompt"
import { getSedreamEnhancementText } from "@/lib/json-enhancement"

/**
 * POST /api/external/seedream-ark-combine
 * 
 * External API endpoint for combining images using Seedream-v4 via fal.ai with enhanced pipeline.
 * 
 * ENHANCED PIPELINE (2 steps):
 * Step 1: Process image2 (second image) with seedream-v4-edit using configured sedream_enhancement_text
 * Step 2: Combine image1 (original) with processed_image2 using user's prompt (canonical or enhanced)
 * 
 * Body parameters (multipart/form-data):
 * - prompt (required): Text description for image combination (used in Step 2)
 * - image0, image1 (required): Exactly 2 image files to upload and combine
 *   OR
 * - imageUrl0, imageUrl1 (required): Exactly 2 image URLs to combine
 * - settings (optional): JSON string with generation settings
 *   - aspect_ratio: "1:1" | "16:9" | "9:16" | "4:3" | "3:4" (default: "1:1") 
 *   - enable_safety_checker: boolean (default: true)
 * - useCanonicalPrompt (optional): boolean (enable canonical prompt processing)
 * - canonicalConfig (optional): JSON string with canonical prompt configuration
 * - orgType (optional): Organization type for moderation (default: general)
 * 
 * Response format:
 * {
 *   "success": true,
 *   "images": [
 *     {
 *       "url": "https://...",
 *       "width": 1024,
 *       "height": 1024
 *     }
 *   ],
 *   "prompt": "enhanced prompt used",
 *   "originalPrompt": "user's original prompt",
 *   "model": "fal-ai/bytedance/seedream/image-to-image-v4",
 *   "inputImages": 2,
 *   "settings": {...},
 *   "enhancedPipeline": true,
 *   "pipelineSteps": [...]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    console.log("[External Seedream Combine] Request received")
    
    const formData = await request.formData()
    
    // Extract parameters
    const prompt = formData.get("prompt") as string
    const orgType = formData.get("orgType") as string || "general"
    
    // Settings
    const settingsJson = formData.get("settings") as string
    let settings: any = {}
    if (settingsJson) {
      try {
        settings = JSON.parse(settingsJson)
      } catch (error) {
        console.warn("[External Seedream Combine] Failed to parse settings:", error)
      }
    }

    // Canonical Prompt parameters
    const useCanonicalPrompt = formData.get("useCanonicalPrompt") === "true"
    const canonicalConfigStr = formData.get("canonicalConfig") as string
    let canonicalConfig: CanonicalPromptConfig = {}
    if (canonicalConfigStr) {
      try {
        canonicalConfig = JSON.parse(canonicalConfigStr)
      } catch (error) {
        console.warn("[External Seedream Combine] Failed to parse canonical config:", error)
      }
    }

    // Extract fal.ai specific settings
    const aspectRatio = settings.aspect_ratio || "1:1"
    const enableSafetyChecker = settings.enable_safety_checker !== false // Default to true

    // Validate prompt
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json({
        success: false,
        error: "Prompt is required",
        details: "Please provide a text description for image combination"
      }, { status: 400 })
    }

    console.log("[External Seedream Combine] Parameters:", {
      prompt: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
      aspectRatio,
      enableSafetyChecker,
      orgType,
      useCanonicalPrompt
    })

    // Extract image files and URLs
    const imageFiles: File[] = []
    const imageUrls: string[] = []
    
    // Get image files (image0, image1, etc.)
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('image') && key.match(/^image\d+$/) && value instanceof File && value.size > 0) {
        imageFiles.push(value)
        console.log(`[External Seedream Combine] Found image file: ${key}, size: ${value.size}, type: ${value.type}`)
      } else if (key.startsWith('imageUrl') && key.match(/^imageUrl\d+$/) && typeof value === 'string' && value.trim()) {
        imageUrls.push(value.trim())
        console.log(`[External Seedream Combine] Found image URL: ${key}, url: ${value}`)
      }
    }

    // Validate that we have exactly 2 images for enhanced pipeline
    const totalImages = imageFiles.length + imageUrls.length
    if (totalImages !== 2) {
      return NextResponse.json({
        success: false,
        error: "Enhanced pipeline requires exactly 2 images",
        details: `Found ${imageFiles.length} files and ${imageUrls.length} URLs (total: ${totalImages}). The enhanced pipeline processes image2 with seedream-v4-edit, then combines image1 with the processed result.`
      }, { status: 400 })
    }

    // Content moderation check
    try {
      console.log("[MODERATION] Checking content for External Seedream Combine prompt:", prompt.substring(0, 50) + "...")
      const moderationService = new ContentModerationService(orgType)
      const moderationResult = await moderationService.moderateContent({ prompt })
      
      if (!moderationResult.safe) {
        console.log("[MODERATION] Content blocked:", moderationResult.reason)
        return NextResponse.json({ 
          success: false,
          error: moderationResult.reason,
          category: moderationResult.category,
          blocked: true
        }, { status: 400 })
      }
      console.log("[MODERATION] Content approved")
    } catch (moderationError) {
      console.warn("[MODERATION] Moderation check failed, proceeding with generation:", moderationError)
    }

    // Check if Fal.ai API key is available
    const falApiKey = process.env.FAL_API_KEY
    if (!falApiKey) {
      return NextResponse.json({ 
        success: false,
        error: "FAL_API_KEY not configured" 
      }, { status: 500 })
    }

    // Configure Fal.ai client
    fal.config({
      credentials: falApiKey,
    })

    // Collect all image URLs (upload files first if needed)
    const allImageUrls: string[] = [...imageUrls]
    
    if (imageFiles.length > 0) {
      console.log("[External Seedream Combine] Uploading image files...")
      
      for (const file of imageFiles) {
        try {
          // Validate file type
          const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
          if (!validTypes.includes(file.type)) {
            return NextResponse.json({
              success: false,
              error: "Invalid file type",
              details: `File ${file.name} has type ${file.type}. Allowed types: ${validTypes.join(', ')}`
            }, { status: 400 })
          }

          // Validate file size (10MB limit)
          const maxSize = 10 * 1024 * 1024 // 10MB
          if (file.size > maxSize) {
            return NextResponse.json({
              success: false,
              error: "File too large",
              details: `File ${file.name} is ${Math.round(file.size / 1024 / 1024)}MB. Maximum size is 10MB.`
            }, { status: 400 })
          }

          // Upload to fal.ai storage
          console.log(`[External Seedream Combine] Uploading ${file.name} to fal.ai storage...`)
          const uploadedUrl = await fal.storage.upload(file)
          allImageUrls.push(uploadedUrl)
          
          console.log(`[External Seedream Combine] Successfully uploaded ${file.name}: ${uploadedUrl}`)
          
        } catch (error) {
          console.error(`[External Seedream Combine] Failed to upload file ${file.name}:`, error)
          return NextResponse.json({
            success: false,
            error: "File upload failed",
            details: `Failed to upload file ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
          }, { status: 500 })
        }
      }
    }

    if (allImageUrls.length !== 2) {
      return NextResponse.json({
        success: false,
        error: "Exactly 2 image URLs required",
        details: `Expected 2 image URLs, but got ${allImageUrls.length}`
      }, { status: 400 })
    }

    // Process canonical prompt if enabled
    let finalPrompt = prompt
    if (useCanonicalPrompt) {
      console.log("[External Seedream Combine] Processing canonical prompt...")
      console.log("[External Seedream Combine] Original prompt:", prompt)
      console.log("[External Seedream Combine] Canonical config:", JSON.stringify(canonicalConfig, null, 2))
      
      // Set user input from original prompt
      canonicalConfig.userInput = prompt
      
      try {
        // Generate canonical prompt
        const result = canonicalPromptProcessor.generateCanonicalPrompt(canonicalConfig)
        finalPrompt = result.canonicalPrompt
        
        console.log("[External Seedream Combine] Generated canonical prompt:", finalPrompt)
        console.log("[External Seedream Combine] Processed user input:", result.processedUserInput)
      } catch (canonicalError) {
        console.error("[External Seedream Combine] Error processing canonical prompt:", canonicalError)
        console.log("[External Seedream Combine] Falling back to original prompt")
        // Fall back to original prompt if canonical processing fails
      }
    } else {
      console.log("[External Seedream Combine] Canonical prompt disabled, using original prompt")
    }

    console.log("[External Seedream Combine] All image URLs ready:", allImageUrls)
    console.log("[External Seedream Combine] Starting enhanced pipeline: seedream → combine")

    // ENHANCED PIPELINE: Step 1 - Process image2 (second image) with seedream-v4-edit
    console.log("[External Seedream Combine] Pipeline Step 1: Processing image2 with seedream-v4-edit")
    
    const image1Url = allImageUrls[0] // First image (remains unchanged)
    const image2Url = allImageUrls[1] // Second image (will be processed with seedream)
    
    console.log("[External Seedream Combine] Image1 (unchanged):", image1Url)
    console.log("[External Seedream Combine] Image2 (to be processed):", image2Url)

    let processedImage2Url: string
    let sedreamPrompt: string // Declare sedream prompt variable
    
    try {
      // Get sedream enhancement text from configuration
      sedreamPrompt = await getSedreamEnhancementText() || ""
      
      if (!sedreamPrompt) {
        console.error("[External Seedream Combine] No sedream_enhancement_text configured")
        return NextResponse.json({
          success: false,
          error: "Configuration error",
          details: "No SeDream enhancement text configured for image processing pipeline"
        }, { status: 500 })
      }

      console.log("[External Seedream Combine] Using sedream prompt:", sedreamPrompt.substring(0, 100) + "...")

      // Call internal seedream-v4-edit to process image2
      const seedreamFormData = new FormData()
      
      // Download image2 to create a File object for seedream
      const image2Response = await fetch(image2Url)
      if (!image2Response.ok) {
        throw new Error(`Failed to fetch image2: ${image2Response.status}`)
      }
      
      const image2Blob = await image2Response.blob()
      const image2File = new File([image2Blob], 'image2.jpg', { type: 'image/jpeg' })
      
      seedreamFormData.append("image", image2File)
      seedreamFormData.append("prompt", "") // Empty prompt - use only customEnhancementText
      seedreamFormData.append("useJSONEnhancement", "false") // Use customEnhancementText as-is
      seedreamFormData.append("customEnhancementText", sedreamPrompt)
      seedreamFormData.append("aspect_ratio", aspectRatio)

      console.log("[External Seedream Combine] Calling internal seedream-v4-edit API...")
      
      const seedreamResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/seedream-v4-edit`, {
        method: 'POST',
        body: seedreamFormData,
      })

      if (!seedreamResponse.ok) {
        const errorText = await seedreamResponse.text()
        throw new Error(`SeDream API failed: ${seedreamResponse.status} - ${errorText}`)
      }

      const seedreamResult = await seedreamResponse.json()
      
      if (!seedreamResult.images || !seedreamResult.images[0] || !seedreamResult.images[0].url) {
        throw new Error("SeDream API returned invalid response")
      }

      processedImage2Url = seedreamResult.images[0].url
      console.log("[External Seedream Combine] ✅ SeDream processing complete:", processedImage2Url)
      
    } catch (seedreamError) {
      console.error("[External Seedream Combine] Pipeline Step 1 failed:", seedreamError)
      return NextResponse.json({
        success: false,
        error: "Pipeline step 1 failed",
        details: `SeDream processing failed: ${seedreamError instanceof Error ? seedreamError.message : 'Unknown error'}`,
        step: "seedream-v4-edit",
        failedImage: image2Url
      }, { status: 500 })
    }

    // ENHANCED PIPELINE: Step 2 - Combine image1 with processed image2
    console.log("[External Seedream Combine] Pipeline Step 2: Combining images with seedream-v4-edit")
    console.log("[External Seedream Combine] Final combination:")
    console.log("  - Image1 (original):", image1Url)
    console.log("  - Image2 (processed):", processedImage2Url)
    console.log("  - User prompt:", finalPrompt)

    // Update image URLs for final combination (use processed image2)
    const combinedImageUrls = [image1Url, processedImage2Url]

    // Map aspect ratio to fal.ai image_size format
    let imageSize: string
    switch (aspectRatio) {
      case "16:9":
        imageSize = "landscape_16_9"
        break
      case "9:16":
        imageSize = "portrait_16_9"
        break
      case "4:3":
        imageSize = "landscape_4_3"
        break
      case "3:4":
        imageSize = "portrait_4_3"
        break
      case "1:1":
      default:
        imageSize = "square_hd"
        break
    }

    // Prepare input for fal.ai Seedream v4 edit (final combination)
    const input = {
      image_urls: combinedImageUrls, // Image1 + Processed Image2
      prompt: finalPrompt, // User's prompt (canonical or enhanced)
      image_size: imageSize,
      enable_safety_checker: enableSafetyChecker
    }

    console.log("[External Seedream Combine] Final input object being sent to fal.ai:")
    console.log("=====================================")
    console.log("Model: fal-ai/bytedance/seedream/v4/edit")
    console.log("Input images count:", combinedImageUrls.length)
    console.log("Image URLs:", combinedImageUrls)
    console.log("Input:", JSON.stringify({
      ...input,
      image_urls: `[${combinedImageUrls.length} URLs: ${combinedImageUrls.map(url => url.substring(0, 50) + '...').join(', ')}]`
    }, null, 2))
    console.log("=====================================")

    console.log("[External Seedream Combine] Calling fal.ai Seedream v4...")
    
    try {
      const result = await fal.subscribe("fal-ai/bytedance/seedream/v4/edit", {
        input,
        logs: true,
        onQueueUpdate: (update) => {
          if (update.status === "IN_PROGRESS") {
            console.log("[External Seedream Combine] Progress:", update.logs?.map(log => log.message).join(" ") || "Processing...")
          }
        }
      })

      console.log("[External Seedream Combine] fal.ai response received")
      
      // Validate response
      if (!result.data || !result.data.images || !Array.isArray(result.data.images) || result.data.images.length === 0) {
        console.error("[External Seedream Combine] Invalid response format")
        
        return NextResponse.json({
          success: false,
          error: "No images generated",
          details: "fal.ai API returned no images. Check the prompt and input images."
        }, { status: 500 })
      }

      console.log("[External Seedream Combine] Successfully generated", result.data.images.length, "images")

      // Format response to match expected structure
      const images = result.data.images.map((img: any) => ({
        url: img.url,
        width: img.width || 1024,
        height: img.height || 1024
      }))

      // Return successful response with enhanced pipeline metadata
      return NextResponse.json({
        success: true,
        image: images[0]?.url || images[0], // Primary image for UI compatibility
        images, // All images for completeness
        prompt: finalPrompt,
        originalPrompt: prompt,
        model: "fal-ai/bytedance/seedream/v4/edit",
        provider: "fal.ai",
        inputImages: 2, // Always 2 for enhanced pipeline
        settings: {
          aspect_ratio: aspectRatio,
          enable_safety_checker: enableSafetyChecker,
          image_size: imageSize,
          use_canonical_prompt: useCanonicalPrompt
        },
        timestamp: new Date().toISOString(),
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
            operation: "seedream-v4-edit-combine",
            inputImages: combinedImageUrls,
            outputImage: images[0]?.url,
            prompt: finalPrompt
          }
        ]
      })

    } catch (falError) {
      console.error("[External Seedream Combine] fal.ai API error:", falError)
      
      return NextResponse.json({
        success: false,
        error: "Failed to combine images with Seedream v4",
        details: falError instanceof Error ? falError.message : "Unknown error",
        model: "fal-ai/bytedance/seedream/v4/edit",
        provider: "fal.ai"
      }, { status: 500 })
    }

  } catch (error) {
    console.error("[External Seedream Combine] Unexpected error:", error)
    
    return NextResponse.json({
      success: false,
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

/**
 * GET /api/external/seedream-ark-combine
 * 
 * Returns API documentation and usage information
 */
export async function GET() {
  return NextResponse.json({
    name: "Seedream Combine API (Enhanced Pipeline)",
    description: "Combine two images using Seedream v4 with AI-powered style transfer and composition",
    version: "2.0.0",
    endpoint: "/api/external/seedream-ark-combine",
    method: "POST",
    contentType: "multipart/form-data",
    pipeline: {
      description: "Two-step enhanced pipeline for optimal results",
      steps: [
        {
          step: 1,
          name: "Style Transfer",
          description: "Process second image with Seedream v4 using configured style prompt"
        },
        {
          step: 2,
          name: "Image Combination",
          description: "Combine first image with style-processed second image using user prompt"
        }
      ]
    },
    parameters: {
      prompt: {
        type: "string",
        required: true,
        description: "Text description for the final image combination (used in step 2)"
      },
      "image0 & image1": {
        type: "file",
        required: true,
        description: "Exactly 2 image files (PNG, JPG, JPEG, WEBP)",
        maxSize: "10MB each",
        alternative: "Can use imageUrl0 and imageUrl1 instead"
      },
      "imageUrl0 & imageUrl1": {
        type: "string",
        required: "alternative",
        description: "Exactly 2 image URLs",
        alternative: "Can use image0 and image1 files instead"
      },
      settings: {
        type: "JSON string",
        required: false,
        description: "Generation settings",
        properties: {
          aspect_ratio: {
            type: "string",
            options: ["1:1", "16:9", "9:16", "4:3", "3:4"],
            default: "1:1"
          },
          enable_safety_checker: {
            type: "boolean",
            default: true
          }
        }
      },
      useCanonicalPrompt: {
        type: "boolean",
        required: false,
        description: "Enable canonical prompt processing for advanced control",
        default: false
      },
      canonicalConfig: {
        type: "JSON string",
        required: false,
        description: "Configuration for canonical prompt (when useCanonicalPrompt is true)"
      },
      orgType: {
        type: "string",
        required: false,
        description: "Organization type for content moderation",
        default: "general"
      }
    },
    response: {
      success: {
        success: true,
        image: "https://example.com/combined-image.png",
        images: [
          {
            url: "https://example.com/combined-image.png",
            width: 1280,
            height: 1280
          }
        ],
        prompt: "Final processed prompt used",
        originalPrompt: "User's original prompt",
        model: "fal-ai/bytedance/seedream/image-to-image-v4",
        provider: "fal.ai",
        inputImages: 2,
        settings: {
          aspect_ratio: "1:1",
          enable_safety_checker: true,
          image_size: "square_hd",
          use_canonical_prompt: false
        },
        timestamp: "2025-10-29T00:00:00.000Z",
        enhancedPipeline: true,
        pipelineSteps: [
          {
            step: 1,
            operation: "seedream-v4-edit",
            inputImage: "https://...",
            outputImage: "https://...",
            prompt: "Configured style transfer prompt"
          },
          {
            step: 2,
            operation: "seedream-v4-edit-combine",
            inputImages: ["https://...", "https://..."],
            outputImage: "https://...",
            prompt: "User's final prompt"
          }
        ]
      },
      error: {
        success: false,
        error: "Error description",
        details: "Additional error details",
        category: "Content category (for moderation errors)",
        blocked: "Boolean indicating if content was blocked"
      }
    },
    examples: {
      curl: `curl -X POST https://your-domain.com/api/external/seedream-ark-combine \\
  -F "prompt=Combine these images with vibrant colors" \\
  -F "image0=@/path/to/first-image.jpg" \\
  -F "image1=@/path/to/second-image.jpg" \\
  -F 'settings={"aspect_ratio":"16:9","enable_safety_checker":true}'`,
      
      javascript: `const formData = new FormData();
formData.append('prompt', 'Combine these images with vibrant colors');
formData.append('image0', firstImageFile);
formData.append('image1', secondImageFile);
formData.append('settings', JSON.stringify({
  aspect_ratio: '16:9',
  enable_safety_checker: true
}));

const response = await fetch('/api/external/seedream-ark-combine', {
  method: 'POST',
  body: formData
});

const result = await response.json();`
    },
    notes: [
      "Requires exactly 2 images for the enhanced pipeline",
      "Step 1: Second image is processed with configured style prompt",
      "Step 2: First image is combined with processed second image using your prompt",
      "Processing time: 30-60 seconds depending on image complexity",
      "Maximum file size: 10MB per image",
      "Supported formats: PNG, JPG, JPEG, WEBP",
      "Built-in content moderation for safe results",
      "Optional canonical prompt for advanced composition control"
    ]
  })
}
