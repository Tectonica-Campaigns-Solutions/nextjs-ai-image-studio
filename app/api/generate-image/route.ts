import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";

// Dynamic import for Vercel compatibility
async function getRAGSystem() {
  if (process.env.VERCEL) {
    // In Vercel environment, use simple hardcoded RAG
    try {
      const { enhanceWithACLUBranding } = await import("../simple-rag/route");
      return enhanceWithACLUBranding;
    } catch (error) {
      console.warn("Simple RAG not available:", error);
      return null;
    }
  } else {
    // In local development, try to use the full RAG system
    try {
      const { enhancePromptWithBranding } = await import("@/lib/rag-system");
      return enhancePromptWithBranding;
    } catch (error) {
      console.warn(
        "Full RAG not available, falling back to simple RAG:",
        error
      );
      const { enhanceWithACLUBranding } = await import("../simple-rag/route");
      return enhanceWithACLUBranding;
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const prompt = formData.get("prompt") as string;
    const referenceImage = formData.get("referenceImage") as File | null;
    const useRAG = formData.get("useRAG") === "true";

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // Check if Fal.ai API key is available
    const falApiKey = process.env.FAL_API_KEY;

    if (!falApiKey) {
      return NextResponse.json(
        { error: "FAL_API_KEY not configured" },
        { status: 500 }
      );
    }

    console.log("[v0] Fal API Key exists:", !!falApiKey);
    console.log("[v0] Original prompt:", prompt);
    console.log("[v0] Reference image provided:", !!referenceImage);
    console.log("[v0] Use RAG:", useRAG);

    // Enhance prompt with RAG if requested
    let finalPrompt = prompt;
    let ragMetadata = null;

    if (useRAG) {
      try {
        console.log("[v0] Enhancing prompt with RAG...");
        const enhancePromptWithBranding = await getRAGSystem();
        if (enhancePromptWithBranding) {
          const enhancement = await enhancePromptWithBranding(prompt);
          finalPrompt = enhancement.enhancedPrompt;
          ragMetadata = {
            originalPrompt: prompt,
            enhancedPrompt: enhancement.enhancedPrompt,
            suggestedColors: enhancement.suggestedColors,
            brandingElements: enhancement.brandingElements.length,
          };
          console.log("[v0] RAG enhanced prompt:", finalPrompt);
        } else {
          console.warn("[v0] RAG system not available");
          ragMetadata = { error: "RAG system not available" };
        }
      } catch (error) {
        console.warn(
          "[v0] RAG enhancement failed, using original prompt:",
          error
        );
        ragMetadata = { error: "RAG enhancement failed" };
      }
    }

    // Use Fal.ai for image generation
    console.log("[v0] Using Fal.ai for image generation...");

    try {
      // Configure Fal.ai client
      fal.config({
        credentials: falApiKey,
      });

      // Prepare input object for FLUX Kontext
      const input: any = {
        prompt: finalPrompt,
      };

      // Add reference image if provided - FLUX Kontext uses 'image_url' for reference
      if (referenceImage) {
        console.log(
          "[v0] Processing reference image, name:",
          referenceImage.name,
          "size:",
          referenceImage.size
        );
        const imageBuffer = await referenceImage.arrayBuffer();
        const base64Image = Buffer.from(imageBuffer).toString("base64");
        input.image_url = `data:image/jpeg;base64,${base64Image}`;
        console.log("[v0] Reference image Base64 length:", base64Image.length);
      }

      console.log("[v0] Input parameters:", {
        prompt: input.prompt,
        hasImageUrl: !!input.image_url,
        imageUrlLength: input.image_url ? input.image_url.length : 0,
      });

      // Start with a simpler, more reliable model
      let modelEndpoint = "fal-ai/flux/dev";

      // Only use Kontext if we have a reference image
      if (referenceImage) {
        modelEndpoint = "fal-ai/flux/krea/image-to-image";
      }

      console.log("[v0] Using model:", modelEndpoint);

      const result = await fal.subscribe(modelEndpoint, {
        input,
        logs: true,
        onQueueUpdate: (update) => {
          if (update.status === "IN_PROGRESS") {
            update.logs.map((log) => log.message).forEach(console.log);
          }
        },
      });

      console.log("[v0] FLUX Kontext output:", result);

      if (result.data && result.data.images && result.data.images.length > 0) {
        const imageUrl = result.data.images[0].url;
        console.log("[v0] Got image URL from FLUX Kontext:", imageUrl);

        // Download the image and convert to base64
        const imageResponse = await fetch(imageUrl);
        const imageBlob = await imageResponse.blob();
        const arrayBuffer = await imageBlob.arrayBuffer();
        const base64Result = Buffer.from(arrayBuffer).toString("base64");

        console.log("[v0] Successfully generated image with FLUX Kontext");
        return NextResponse.json({
          image: `data:image/jpeg;base64,${base64Result}`,
          finalPrompt: finalPrompt, // Include the final prompt used
          ragMetadata: ragMetadata,
          imageUrl,
        });
      } else {
        console.log("[v0] Unexpected FLUX Kontext output format:", result);
        return NextResponse.json(
          { error: "Unexpected output format from FLUX Kontext" },
          { status: 500 }
        );
      }
    } catch (error) {
      console.error("[v0] FLUX Kontext failed:", error);

      // Log more details about the error
      if (error && typeof error === "object" && "body" in error) {
        console.error("[v0] Error body:", JSON.stringify(error.body, null, 2));
      }

      return NextResponse.json(
        { error: `FLUX Kontext processing failed: ${error}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[v0] Error processing image generation:", error);
    console.error(
      "[v0] Error stack:",
      error instanceof Error ? error.stack : "No stack trace"
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
