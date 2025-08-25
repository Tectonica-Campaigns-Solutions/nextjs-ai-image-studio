import { type NextRequest, NextResponse } from "next/server"
import { fal } from "@fal-ai/client"

// Dynamic import for platform compatibility
async function getRAGSystem() {
  // Check if we should use full RAG (Render, local) or simple RAG (Vercel)
  const useFullRAG = !process.env.VERCEL
  
  if (useFullRAG) {
    // In Render/local environment, use full RAG system
    try {
      const { enhancePromptWithBranding } = await import("@/lib/rag-system")
      console.log('[RAG] Using full RAG system')
      return enhancePromptWithBranding
    } catch (error) {
      console.warn("Full RAG not available, falling back to simple RAG:", error)
      const { enhanceWithACLUBranding } = await import("../simple-rag/route")
      return enhanceWithACLUBranding
    }
  } else {
    // In Vercel environment, use simple hardcoded RAG
    try {
      const { enhanceWithACLUBranding } = await import("../simple-rag/route")
      console.log('[RAG] Using simple RAG system (Vercel)')
      return enhanceWithACLUBranding
    } catch (error) {
      console.warn("Simple RAG not available:", error)
      return null
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const prompt = formData.get("prompt") as string
    const settingsJson = formData.get("settings") as string
    const useRag = formData.get("useRag") === "true"

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    // Check if Fal.ai API key is available
    const falApiKey = process.env.FAL_API_KEY
    
    if (!falApiKey) {
      return NextResponse.json({ error: "FAL_API_KEY not configured" }, { status: 500 })
    }

    console.log("[v0] Fal API Key exists:", !!falApiKey)
    console.log("[v0] Original prompt:", prompt)
    console.log("[v0] Use RAG:", useRag)
    console.log("[v0] Settings JSON:", settingsJson)

    // Enhance prompt with RAG if enabled
    let finalPrompt = prompt
    let ragNegativePrompt = ""
    let ragSuggestedFormat = null
    
    if (useRag) {
      try {
        console.log("[v0] Enhancing prompt with RAG...")
        console.log("[v0] Environment check:", process.env.VERCEL ? 'Vercel' : 'Local');
        const enhancePromptWithBranding = await getRAGSystem()
        if (enhancePromptWithBranding) {
          console.log("[v0] RAG system loaded, processing prompt:", prompt);
          const enhancement = await enhancePromptWithBranding(prompt)
          finalPrompt = enhancement.enhancedPrompt
          ragNegativePrompt = enhancement.negativePrompt
          ragSuggestedFormat = enhancement.suggestedFormat
          
          console.log("[v0] Enhanced prompt:", finalPrompt)
          console.log("[v0] RAG negative prompt:", ragNegativePrompt)
        } else {
          console.warn("[v0] RAG system not available")
        }
      } catch (ragError) {
        console.warn("[v0] RAG enhancement failed, using original prompt:", ragError)
        console.warn("[v0] RAG error details:", ragError.message || ragError)
      }
    }

    // Use Fal.ai for image generation with Qwen-Image
    console.log("[v0] Using Qwen-Image for text-to-image generation...");
    
    try {
      // Configure Fal.ai client
      fal.config({
        credentials: falApiKey,
      });

      // Parse settings if provided, with defaults
      let settings: any = {};
      if (settingsJson) {
        try {
          settings = JSON.parse(settingsJson);
        } catch (error) {
          console.warn("[v0] Invalid settings JSON, using defaults:", error);
        }
      }

      // Apply RAG format suggestion if available and no custom format specified
      if (ragSuggestedFormat && !settings.image_size && !settings.width && !settings.height) {
        if (ragSuggestedFormat.dimensions) {
          const [width, height] = ragSuggestedFormat.dimensions.split('x').map((s: string) => parseInt(s.replace('px', '')));
          settings.width = width;
          settings.height = height;
        }
      }

      // Prepare input with all possible parameters
      const input: any = {
        prompt: finalPrompt, // Use RAG-enhanced prompt
        image_size: settings.image_size || "landscape_4_3",
        num_inference_steps: settings.num_inference_steps || 30,
        seed: settings.seed || undefined,
        guidance_scale: settings.guidance_scale || 2.5,
        sync_mode: settings.sync_mode || false,
        num_images: settings.num_images || 1,
        enable_safety_checker: settings.enable_safety_checker !== false, // default true
        output_format: settings.output_format || "png",
        negative_prompt: ragNegativePrompt || settings.negative_prompt || "",
        acceleration: settings.acceleration || "none",
        loras: settings.loras || []
      };

      // Handle custom image size
      if (settings.width && settings.height) {
        input.image_size = {
          width: settings.width,
          height: settings.height
        };
      }

      console.log("[v0] Final input parameters:", {
        prompt: input.prompt,
        image_size: input.image_size,
        num_inference_steps: input.num_inference_steps,
        guidance_scale: input.guidance_scale,
        num_images: input.num_images,
        acceleration: input.acceleration,
        hasCustomSize: typeof input.image_size === 'object',
        lorasCount: input.loras.length
      });

      const result = await fal.subscribe("fal-ai/qwen-image", {
        input,
        logs: true,
        onQueueUpdate: (update) => {
          if (update.status === "IN_PROGRESS") {
            update.logs.map((log) => log.message).forEach(console.log);
          }
        },
      });

      console.log("[v0] Qwen-Image output:", result);
      
      if (result.data && result.data.images && result.data.images.length > 0) {
        const images = result.data.images.map((img: any) => {
          return {
            url: img.url,
            width: img.width,
            height: img.height,
            content_type: img.content_type
          };
        });

        console.log("[v0] Successfully generated images with Qwen-Image:", images.length);
        
        // For UI compatibility, return the first image as base64 if single image
        if (images.length === 1) {
          try {
            const imageResponse = await fetch(images[0].url);
            const imageBlob = await imageResponse.blob();
            const arrayBuffer = await imageBlob.arrayBuffer();
            const base64Result = Buffer.from(arrayBuffer).toString('base64');

            return NextResponse.json({ 
              image: `data:image/jpeg;base64,${base64Result}`,
              images: images,
              finalPrompt: finalPrompt, // Include the final prompt used
              metadata: {
                seed: result.data.seed,
                prompt: result.data.prompt,
                has_nsfw_concepts: result.data.has_nsfw_concepts
              }
            });
          } catch (fetchError) {
            console.warn("[v0] Failed to fetch image for base64 conversion:", fetchError);
            return NextResponse.json({ 
              images: images,
              finalPrompt: finalPrompt, // Include the final prompt used
              metadata: {
                seed: result.data.seed,
                prompt: result.data.prompt,
                has_nsfw_concepts: result.data.has_nsfw_concepts
              }
            });
          }
        } else {
          // Multiple images - return array
          return NextResponse.json({ 
            images: images,
            finalPrompt: finalPrompt, // Include the final prompt used
            metadata: {
              seed: result.data.seed,
              prompt: result.data.prompt,
              has_nsfw_concepts: result.data.has_nsfw_concepts
            }
          });
        }
      } else {
        console.log("[v0] Unexpected Qwen-Image output format:", result);
        return NextResponse.json({ error: "Unexpected output format from Qwen-Image" }, { status: 500 });
      }
    } catch (error) {
      console.error("[v0] Qwen-Image failed:", error);
      
      // Log more details about the error
      if (error && typeof error === 'object' && 'body' in error) {
        console.error("[v0] Error body:", JSON.stringify(error.body, null, 2));
      }
      
      return NextResponse.json({ error: `Qwen-Image processing failed: ${error}` }, { status: 500 });
    }
  } catch (error) {
    console.error("[v0] Error processing Qwen-Image generation:", error)
    console.error("[v0] Error stack:", error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
