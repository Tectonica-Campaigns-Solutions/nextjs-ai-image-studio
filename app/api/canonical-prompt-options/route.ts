import { NextResponse } from "next/server"
import { canonicalPromptProcessor } from "@/lib/canonical-prompt"

export async function GET() {
  try {
    const availableOptions = canonicalPromptProcessor.getAvailableOptions()
    const defaults = canonicalPromptProcessor.getDefaults()

    return NextResponse.json({
      success: true,
      data: {
        availableOptions,
        defaults
      }
    })
  } catch (error) {
    console.error("[CANONICAL-OPTIONS] Error fetching canonical prompt options:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to fetch canonical prompt options" 
      },
      { status: 500 }
    )
  }
}