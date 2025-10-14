import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

interface JSONEnhancementConfig {
  version: string
  kit: string
  description: string
  enhancement_text: string
  edit_enhancement_text: string  // Added for precise edits
  defaults: {
    intensity: number
    join_string: string
    params: Record<string, any>
  }
  enforced_negatives: string[]
}

export async function GET() {
  try {
    // Read the JSON enhancement configuration file
    const configPath = join(process.cwd(), 'data', 'rag', 'prompt-enhacement.json')
    const configContent = await readFile(configPath, 'utf-8')
    const config: JSONEnhancementConfig = JSON.parse(configContent)
    
    console.log('[API] JSON enhancement config loaded successfully')
    
    return NextResponse.json({
      success: true,
      config
    })
  } catch (error) {
    console.error('[API] Failed to load JSON enhancement config:', error)
    
    // Return a fallback configuration
    const fallbackConfig: JSONEnhancementConfig = {
      version: "2.0",
      kit: "fallback_enhancer",
      description: "Basic enhancement when config file is not available",
      enhancement_text: "high quality, professional style, detailed artwork",
      edit_enhancement_text: "Make only the minimal requested change. Do not alter background, lighting, colors, textures, or any other elements",  // Added fallback for edits
      defaults: {
        intensity: 1.0,
        join_string: ", ",
        params: {}
      },
      enforced_negatives: ["blurry", "low quality", "distorted", "amateur"]
    }
    
    return NextResponse.json({
      success: false,
      config: fallbackConfig,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
