import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

interface JSONEnhancementConfig {
  version: string
  kit: string
  description: string
  enums: Record<string, string[]>
  rules: Record<string, Record<string, string[]>>
  defaults: {
    selection: Record<string, string>
    weights: Record<string, number>
    params: Record<string, any>
    loras: any[]
  }
  enforced_negatives: string[]
  assembly: {
    order: string[]
    join: string
  }
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
      version: "1.0",
      kit: "fallback_enhancer",
      description: "Basic enhancement when config file is not available",
      enums: {
        quality: ["high quality", "professional", "detailed"],
        style: ["artistic", "creative", "polished"]
      },
      rules: {
        quality: {
          "high quality": ["sharp", "crisp", "clear"],
          "professional": ["studio lighting", "commercial grade"],
          "detailed": ["intricate details", "fine textures"]
        },
        style: {
          "artistic": ["creative composition", "visual appeal"],
          "creative": ["unique perspective", "innovative design"],
          "polished": ["refined", "elegant finish"]
        }
      },
      defaults: {
        selection: {
          quality: "high quality",
          style: "artistic"
        },
        weights: {
          quality: 0.8,
          style: 0.6
        },
        params: {},
        loras: []
      },
      enforced_negatives: ["blurry", "low quality", "distorted", "amateur"],
      assembly: {
        order: ["quality", "style"],
        join: ", "
      }
    }
    
    return NextResponse.json({
      success: false,
      config: fallbackConfig,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
