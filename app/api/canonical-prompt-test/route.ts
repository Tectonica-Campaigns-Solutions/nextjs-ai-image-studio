import { NextRequest, NextResponse } from "next/server"
import { canonicalPromptProcessor, type CanonicalPromptConfig } from "@/lib/canonical-prompt"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const config: CanonicalPromptConfig = body.config || {}

    console.log("[CANONICAL-TEST] Testing canonical prompt with config:", config)

    // Generate the canonical prompt
    const result = canonicalPromptProcessor.generateCanonicalPrompt(config)

    console.log("[CANONICAL-TEST] Generated prompt:", result.canonicalPrompt)
    console.log("[CANONICAL-TEST] Processed user input:", result.processedUserInput)

    return NextResponse.json({
      success: true,
      data: {
        canonicalPrompt: result.canonicalPrompt,
        processedUserInput: result.processedUserInput,
        inputConfig: config
      }
    })
  } catch (error) {
    console.error("[CANONICAL-TEST] Error testing canonical prompt:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to test canonical prompt",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    // Return example configurations for testing
    const exampleConfigs = [
      {
        name: "Basic Example",
        config: {
          userInput: "Create a promotional poster with two people",
          keepOptions: {
            identity: true,
            pose: true,
            layout: true,
            text: false
          }
        }
      },
      {
        name: "Advanced Example",
        config: {
          userInput: "Transform this photo into artistic style",
          keepOptions: {
            identity: true,
            pose: false,
            layout: false,
            text: true
          },
          applyStyle: {
            materials: "halftone illustration",
            lighting: "dramatic shadows",
            texture: "curved line textures",
            contrast: "high contrast"
          },
          styleBackground: "monochrome line-art rendering, simplified detail, no halftone on background",
          subjectFraming: "close-up",
          subjectComposition: "rule of thirds"
        }
      },
      {
        name: "Synonym Processing Example",
        config: {
          userInput: "Make this photo of people more artistic",
          keepOptions: {
            identity: true,
            pose: true,
            layout: true,
            text: false
          }
        }
      }
    ]

    return NextResponse.json({
      success: true,
      data: {
        examples: exampleConfigs,
        defaults: canonicalPromptProcessor.getDefaults(),
        availableOptions: canonicalPromptProcessor.getAvailableOptions()
      }
    })
  } catch (error) {
    console.error("[CANONICAL-TEST] Error fetching test data:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to fetch test data" 
      },
      { status: 500 }
    )
  }
}