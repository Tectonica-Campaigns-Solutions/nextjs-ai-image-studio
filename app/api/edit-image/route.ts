import { NextRequest, NextResponse } from "next/server"
import { fal } from "@fal-ai/client"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const image = formData.get("image") as File
    const prompt = formData.get("prompt") as string
    const useRAG = formData.get("useRAG") === "true"
    const activeRAGId = formData.get("activeRAGId") as string
    const activeRAGName = formData.get("activeRAGName") as string
    const imageSize = formData.get("image_size") as string || "square_hd" // default to square_hd
    const customWidth = formData.get("width") as string
    const customHeight = formData.get("height") as string
    
    // Validate image_size parameter
    const validImageSizes = ['square_hd', 'square', 'portrait_4_3', 'portrait_16_9', 'landscape_4_3', 'landscape_16_9', 'custom']
    if (imageSize && !validImageSizes.includes(imageSize)) {
      return NextResponse.json({ 
        error: "Invalid image_size parameter",
        details: `image_size must be one of: ${validImageSizes.join(', ')}. Received: ${imageSize}`
      }, { status: 400 })
    }
    
    // Validate custom dimensions if using custom image_size
    if (imageSize === 'custom') {
      if (!customWidth || !customHeight) {
        return NextResponse.json({ 
          error: "Missing custom dimensions",
          details: "When using image_size 'custom', both 'width' and 'height' parameters are required"
        }, { status: 400 })
      }
      
      let width = parseInt(customWidth)
      let height = parseInt(customHeight)
      
      if (isNaN(width) || isNaN(height) || width < 256 || width > 2048 || height < 256 || height > 2048) {
        return NextResponse.json({ 
          error: "Invalid custom dimensions",
          details: "Width and height must be numbers between 256 and 2048 pixels"
        }, { status: 400 })
      }
      
      // Ensure dimensions are multiples of 64 for better compatibility
      width = Math.round(width / 64) * 64
      height = Math.round(height / 64) * 64
      
      console.log("[v0] Adjusted custom dimensions to multiples of 64:", { 
        original: { width: parseInt(customWidth), height: parseInt(customHeight) },
        adjusted: { width, height }
      })
    }

    if (!image || !prompt) {
      return NextResponse.json({ error: "Image and prompt are required" }, { status: 400 })
    }

    // Enhanced content moderation - critical security check
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
        console.warn(`[Edit-Image] Content moderation blocked request. Flagged terms:`, flaggedTerms)
        return {
          allowed: false,
          reason: "Content contains inappropriate or harmful material",
          flaggedTerms
        }
      }
      
      return { allowed: true }
    }

    // Apply content moderation to the prompt
    const moderationResult = moderateContent(prompt)
    if (!moderationResult.allowed) {
      console.warn("[Edit-Image] Request blocked by content moderation:", {
        prompt: prompt.substring(0, 100),
        reason: moderationResult.reason,
        flaggedTerms: moderationResult.flaggedTerms
      })
      
      return NextResponse.json({ 
        error: "Content policy violation",
        details: moderationResult.reason,
        flaggedContent: moderationResult.flaggedTerms
      }, { status: 400 })
    }

    // Check if Fal.ai API key is available
    const falApiKey = process.env.FAL_API_KEY
    
    if (!falApiKey) {
      return NextResponse.json({ error: "FAL_API_KEY not configured" }, { status: 500 })
    }

    console.log("[v0] Fal API Key exists:", !!falApiKey)
    console.log("[v0] Processing image, name:", image.name, "size:", image.size)
    console.log("[v0] Original prompt:", prompt)
    console.log("[v0] Use RAG:", useRAG)
    console.log("[v0] Active RAG ID:", activeRAGId)
    console.log("[v0] Active RAG Name:", activeRAGName)
    console.log("[v0] Image size:", imageSize)

    // Enhance prompt with RAG if requested
    let finalPrompt = prompt
    let ragMetadata = null

    if (useRAG) {
      try {
        console.log("[v0] Enhancing prompt with RAG...")
        console.log("[v0] Using RAG:", activeRAGName || "Default RAG")
        
        // Load specific RAG content based on activeRAGId
        let ragContent = null
        if (activeRAGId && activeRAGName) {
          // For now, we'll use a simple mapping. In production, this would load from a database
          console.log(`[v0] Loading specific RAG: ${activeRAGName} (ID: ${activeRAGId})`)
          
          // Try to load the specific RAG file or use default mapping
          try {
            const fs = await import("fs/promises")
            const path = await import("path")
            
            // Try common RAG file locations
            const possiblePaths = [
              path.join(process.cwd(), "lib", `${activeRAGName.toLowerCase().replace(/\s+/g, "-")}.json`),
              path.join(process.cwd(), "lib", "egp-branding.json"), // fallback
              path.join(process.cwd(), "data", "rag", `${activeRAGId}.json`)
            ]
            
            for (const ragPath of possiblePaths) {
              try {
                const content = await fs.readFile(ragPath, "utf-8")
                ragContent = JSON.parse(content)
                console.log(`[v0] Loaded RAG from: ${ragPath}`)
                break
              } catch (err) {
                // Try next path
              }
            }
          } catch (error) {
            console.warn("[v0] Could not load specific RAG file:", error)
          }
        }
        
        // Dynamic import for platform compatibility
        let enhanceFunction = null
        if (process.env.VERCEL) {
          // In Vercel environment, use simple hardcoded RAG
          try {
            const { enhanceWithEGPBranding } = await import("../simple-rag/route")
            enhanceFunction = enhanceWithEGPBranding
          } catch (error) {
            console.warn("Simple RAG not available:", error)
          }
        } else {
          // In Railway/local development, use full RAG system
          try {
            const { enhancePromptWithBranding } = await import("@/lib/rag-system")
            enhanceFunction = enhancePromptWithBranding
          } catch (error) {
            console.warn("Full RAG not available, falling back to simple RAG:", error)
            try {
              const { enhanceWithEGPBranding } = await import("../simple-rag/route")
              enhanceFunction = enhanceWithEGPBranding
            } catch (fallbackError) {
              console.warn("Simple RAG fallback failed:", fallbackError)
            }
          }
        }

        if (enhanceFunction) {
          // Pass RAG content and metadata to enhancement function
          const enhancementContext = {
            ragContent,
            activeRAGId,
            activeRAGName
          }
          
          const enhancement = await enhanceFunction(prompt, enhancementContext)
          finalPrompt = (enhancement as any).enhancedPrompt || (typeof enhancement === 'string' ? enhancement : prompt)
          ragMetadata = {
            originalPrompt: prompt,
            enhancedPrompt: finalPrompt,
            activeRAGId,
            activeRAGName,
            suggestedColors: (enhancement as any).suggestedColors || [],
            brandingElements: (enhancement as any).brandingElements?.length || 0
          }
          console.log("[v0] RAG enhanced prompt:", finalPrompt)
          console.log("[v0] Used RAG:", activeRAGName)
        } else {
          console.warn("[v0] No RAG enhancement function available")
          ragMetadata = { 
            error: "No RAG enhancement function available",
            activeRAGId,
            activeRAGName
          }
        }
      } catch (error) {
        console.warn("[v0] RAG enhancement failed, using original prompt:", error)
        ragMetadata = { 
          error: "RAG enhancement failed",
          activeRAGId,
          activeRAGName 
        }
      }
    }

    const imageBuffer = await image.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString("base64");
    console.log("[v0] Base64 image length:", base64Image.length)

    // Load negative prompts from configuration for safety
    let negativePrompts: string[] = []
    try {
      const fs = await import('fs').then(m => m.promises)
      const path = await import('path')
      const configPath = path.join(process.cwd(), 'data', 'rag', 'prompt-enhacement.json')
      const configData = await fs.readFile(configPath, 'utf-8')
      const config = JSON.parse(configData)
      
      // Combine all negative prompt categories for maximum protection
      const allNegatives = [
        ...(config.enforced_negatives || []),
        ...(config.enforced_negatives_nsfw || []),
        ...(config.enforced_negatives_age || []),
        ...(config.enforced_negatives_human_integrity || [])
      ]
      
      negativePrompts = allNegatives
      console.log("[v0] Loaded negative prompts:", negativePrompts.length, "terms")
      console.log("[v0] NSFW protection terms:", config.enforced_negatives_nsfw?.length || 0)
      console.log("[v0] Age bias protection terms:", config.enforced_negatives_age?.length || 0)
      console.log("[v0] Human integrity protection terms:", config.enforced_negatives_human_integrity?.length || 0)
      
    } catch (error) {
      console.warn("[v0] Could not load negative prompts from config:", error)
      // Fallback to comprehensive safety terms if config fails
      negativePrompts = [
        // NSFW and sexual content
        "naked", "nude", "sexual", "revealing", "inappropriate", "nsfw", "explicit",
        "topless", "undressed", "underwear", "lingerie", "bikini", "exposed",
        "breast", "breasts", "nipple", "nipples", "cleavage", "bare chest",
        "seductive", "sensual", "erotic", "provocative", "suggestive",
        "adult content", "mature content", "intimate", "sexual pose",
        "remove clothes", "without clothes", "undressing", "stripping",
        
        // Age-related protections
        "younger", "child-like", "age regression", "juvenile appearance",
        "baby face", "childish", "infantile", "minor", "underage",
        
        // Anatomical integrity
        "unrealistic proportions", "sexualized", "distorted anatomy",
        "exaggerated features", "artificial enhancement", "body modification",
        
        // General inappropriate
        "violence", "weapon", "harmful", "offensive", "disturbing"
      ]
      console.log("[v0] Using comprehensive fallback negative prompts:", negativePrompts.length, "terms")
    }

    // Use Fal.ai for image editing
    console.log("[v0] Using Fal.ai for image editing...");
    
    try {
      // Configure Fal.ai client
      fal.config({
        credentials: falApiKey,
      });

      // Prepare input for Fal.ai call
      const negativePromptString = negativePrompts.join(", ")
      const falInput: any = {
        prompt: finalPrompt,
        negative_prompt: negativePromptString,
        image_url: `data:image/jpeg;base64,${base64Image}`
      }
      
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
        
        console.log("[v0] Using custom dimensions:", { 
          originalWidth: parseInt(customWidth),
          originalHeight: parseInt(customHeight),
          adjustedWidth: falInput.width, 
          adjustedHeight: falInput.height,
          aspectRatio: aspectRatio.toFixed(2),
          aspectRatioHint: falInput.aspect_ratio || "none"
        })
      } else {
        falInput.image_size = imageSize
        console.log("[v0] Using preset image_size:", imageSize)
      }
      
      console.log("[v0] Fal.ai input parameters:", {
        prompt: finalPrompt.substring(0, 100) + "...",
        negative_prompt: `${negativePromptString.substring(0, 100)}...`,
        negative_prompt_terms: negativePrompts.length,
        image_size: falInput.image_size || "custom (using width/height)",
        width: falInput.width || "not set",
        height: falInput.height || "not set",
        image_url_length: falInput.image_url.length
      })

      const result = await fal.subscribe("fal-ai/qwen-image-edit", {
        input: falInput,
        logs: true,
        onQueueUpdate: (update) => {
          if (update.status === "IN_PROGRESS") {
            update.logs.map((log) => log.message).forEach(console.log);
          }
        },
      });

      console.log("[v0] Fal.ai output:", result);
      
      if (result.data && result.data.images && result.data.images.length > 0) {
        const imageUrl = result.data.images[0].url;
        console.log("[v0] Got image URL from Fal.ai:", imageUrl);
        
        // Download the image and convert to base64
        const imageResponse = await fetch(imageUrl);
        const imageBlob = await imageResponse.blob();
        const arrayBuffer = await imageBlob.arrayBuffer();
        
        // For now, we'll note that custom sizes are "best effort" 
        // The qwen-image-edit model may preserve aspect ratios
        if (imageSize === 'custom') {
          console.log("[v0] Custom size requested - note that qwen-image-edit may preserve original aspect ratio:", {
            requestedWidth: falInput.width,
            requestedHeight: falInput.height,
            note: "Model output may vary from exact dimensions"
          })
        }
        
        const base64Result = Buffer.from(arrayBuffer).toString('base64');

        console.log("[v0] Result image info:", {
          expectedWidth: falInput.width || "preset size",
          expectedHeight: falInput.height || "preset size", 
          imageSize: arrayBuffer.byteLength,
          imageUrl: imageUrl
        });

        console.log("[v0] Successfully got edited image from Fal.ai");
        return NextResponse.json({ 
          image: `data:image/jpeg;base64,${base64Result}`,
          prompt: finalPrompt,
          negativePrompt: negativePromptString,
          safetyProtections: {
            negativeTermsApplied: negativePrompts.length,
            nsfwProtection: true,
            ageBiasProtection: true,
            humanIntegrityProtection: true,
            contentModerationEnabled: true
          },
          ragMetadata: ragMetadata,
          debug: {
            requestedSize: imageSize,
            requestedWidth: falInput.width,
            requestedHeight: falInput.height,
            actualImageSize: arrayBuffer.byteLength
          }
        });
      } else {
        console.log("[v0] Unexpected Fal.ai output format:", result);
        return NextResponse.json({ error: "Unexpected output format from Fal.ai" }, { status: 500 });
      }
    } catch (error: any) {
      console.error("[v0] Fal.ai failed:", error);
      
      // Log more detailed error information
      if (error.status === 422) {
        console.error("[v0] Fal.ai validation error details:", {
          status: error.status,
          body: error.body,
          message: error.message
        });
        
        // Try to extract more specific error details
        if (error.body) {
          console.error("[v0] Fal.ai error body:", JSON.stringify(error.body, null, 2));
        }
      }
      
      return NextResponse.json({ 
        error: `Fal.ai processing failed: ${error.message || error}`,
        details: error.status === 422 ? "Input validation failed - check image size parameters" : undefined,
        debug: {
          status: error.status,
          imageSize: imageSize,
          customWidth: imageSize === 'custom' ? customWidth : undefined,
          customHeight: imageSize === 'custom' ? customHeight : undefined
        }
      }, { status: 500 });
    }

    /* 
    // Commented out fallback models - focus on Fal.ai only
    
    // Fallback to HF models if Fal.ai fails or isn't available
    // Try image-to-image models that are actually available on HF
    if (hfApiKey) {
      const img2imgModels = [
        "runwayml/stable-diffusion-v1-5",
        "stabilityai/stable-diffusion-2-1",
        "CompVis/stable-diffusion-v1-4"
      ];

      for (const model of img2imgModels) {
        console.log(`[v0] Trying img2img with model: ${model}`);
        
        try {
          // Use the img2img pipeline format that HF API supports
          const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${hfApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              inputs: prompt,
              parameters: {
                init_image: `data:image/jpeg;base64,${base64Image}`,
                strength: 0.6,
                guidance_scale: 7.5,
                num_inference_steps: 25,
                width: 512,
                height: 512,
              }
            }),
          });

          console.log(`[v0] ${model} response:`, response.status);
          
          if (response.ok) {
            const contentType = response.headers.get("content-type");
            
            if (contentType?.includes("image")) {
              const imageBlob = await response.blob();
              const arrayBuffer = await imageBlob.arrayBuffer();
              const base64Result = Buffer.from(arrayBuffer).toString('base64');
              
              console.log(`[v0] Got img2img result from ${model}`);
              return NextResponse.json({ 
                image: `data:image/jpeg;base64,${base64Result}`,
                finalPrompt: finalPrompt // Include the final prompt used
              });
            } else {
              // Try to parse as JSON in case it returns different format
              const textResult = await response.text();
              console.log(`[v0] ${model} returned:`, textResult.substring(0, 200));
            }
          } else {
            const errorText = await response.text();
            console.log(`[v0] ${model} error:`, errorText);
            
            // If the API doesn't support img2img parameters, try basic approach
            if (errorText.includes("unexpected") || errorText.includes("parameter")) {
              console.log(`[v0] Trying ${model} with basic text-to-image approach...`);
              
              const basicResponse = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${hfApiKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  inputs: `${prompt}, photorealistic, high quality`,
                  parameters: {
                    guidance_scale: 7.5,
                    num_inference_steps: 20,
                  }
                }),
              });
              
              if (basicResponse.ok) {
                const imageBlob = await basicResponse.blob();
                const arrayBuffer = await imageBlob.arrayBuffer();
                const base64Result = Buffer.from(arrayBuffer).toString('base64');
                
                console.log(`[v0] Got basic result from ${model} (note: not true img2img)`);
                return NextResponse.json({ 
                  image: `data:image/jpeg;base64,${base64Result}`,
                  finalPrompt: finalPrompt // Include the final prompt used
                });
              }
            }
          }
        } catch (error) {
          console.log(`[v0] ${model} failed:`, error);
        }
      }
    }

    // If no HF models worked, return error
    return NextResponse.json({ error: "No suitable image editing model available" }, { status: 500 });
    */
  } catch (error) {
    console.error("[v0] Error processing image edit:", error)
    console.error("[v0] Error stack:", error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
