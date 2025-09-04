import { NextRequest, NextResponse } from "next/server"
import { writeFile, readFile, access } from "fs/promises"
import { join } from "path"

const BRANDING_FILE_PATH = join(process.cwd(), "lib", "egp-branding.json")
const BACKUP_FILE_PATH = join(process.cwd(), "lib", "egp-branding-backup.json")

// Global variable for Vercel compatibility (in-memory storage)
let brandingDataCache: any = null

// Declare global for consistency with rag-system
declare global {
  var brandingDataCache: any
}

// Function to get branding data (works in both local and Vercel environments)
async function getBrandingData() {
  if (process.env.VERCEL) {
    // In Vercel, use global cache
    return global.brandingDataCache || brandingDataCache
  } else {
    // In local environment, read from file system
    try {
      const content = await readFile(BRANDING_FILE_PATH, 'utf-8')
      return JSON.parse(content)
    } catch (error) {
      return null
    }
  }
}

// Function to save branding data (works in both local and Vercel environments)
async function saveBrandingData(data: any) {
  if (process.env.VERCEL) {
    // In Vercel, save to both local and global cache for consistency
    brandingDataCache = data
    global.brandingDataCache = data
    console.log("[BRANDING] Data saved to in-memory cache (Vercel environment)")
  } else {
    // In local environment, save to file system
    await writeFile(BRANDING_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8')
    console.log("[BRANDING] Data saved to file system (local environment)")
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("brandingFile") as File
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!file.name.endsWith('.json')) {
      return NextResponse.json({ error: "File must be a JSON file" }, { status: 400 })
    }

    // Read and validate JSON content
    const fileContent = await file.text()
    let brandingData
    
    try {
      brandingData = JSON.parse(fileContent)
    } catch (parseError) {
      return NextResponse.json({ 
        error: "Invalid JSON format",
        details: parseError instanceof Error ? parseError.message : "Unknown JSON error"
      }, { status: 400 })
    }

    // Validate required structure - be more flexible
    // Accept either color_palette at root or inside brand_specifications
    const hasRootColorPalette = brandingData.color_palette;
    const hasBrandSpecsColorPalette = brandingData.brand_specifications?.color_palette;
    
    if (!hasRootColorPalette && !hasBrandSpecsColorPalette) {
      return NextResponse.json({ 
        error: "Missing required color_palette",
        details: "The JSON must contain either 'color_palette' at root level or 'brand_specifications.color_palette'"
      }, { status: 400 })
    }

    // Normalize structure - if brand_specifications exists, extract color_palette to root level
    if (brandingData.brand_specifications && !brandingData.color_palette) {
      brandingData.color_palette = brandingData.brand_specifications.color_palette;
      
      // Also extract other useful fields from brand_specifications
      if (brandingData.brand_specifications.visual_style) {
        brandingData.visual_style = brandingData.brand_specifications.visual_style;
      }
      
      if (brandingData.brand_specifications.typography) {
        brandingData.typography = brandingData.brand_specifications.typography;
      }
    }

    // Validate color_palette structure
    if (brandingData.color_palette && typeof brandingData.color_palette !== 'object') {
      return NextResponse.json({ 
        error: "color_palette must be an object",
        details: "The color_palette field should contain color definitions"
      }, { status: 400 })
    }

    // Add default values for missing optional fields
    if (!brandingData.illustration) {
      brandingData.illustration = {
        photography_style: { preferred: [], avoid: [] },
        layout_rules: {},
        format_rules: { supported_formats: {} },
        generation_constraints: { negative_prompts: [] }
      }
    }
    
    if (!brandingData.layout) {
      brandingData.layout = {}
    }
    
    if (!brandingData.format_specifications) {
      brandingData.format_specifications = {}
    }

    // Create backup of current file if it exists (only in local environment)
    if (!process.env.VERCEL) {
      try {
        await access(BRANDING_FILE_PATH)
        const currentContent = await readFile(BRANDING_FILE_PATH, 'utf-8')
        await writeFile(BACKUP_FILE_PATH, currentContent, 'utf-8')
        console.log("[BRANDING] Backup created successfully")
      } catch (error) {
        console.log("[BRANDING] No existing file to backup or backup failed:", error)
      }
    }

    // Save new branding data
    await saveBrandingData(brandingData)
    
    console.log("[BRANDING] New branding file uploaded successfully")
    console.log("[BRANDING] File size:", fileContent.length, "characters")

    return NextResponse.json({
      success: true,
      message: "Branding file uploaded successfully",
      filename: file.name,
      fileSize: fileContent.length,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("[BRANDING] Error uploading branding file:", error)
    return NextResponse.json({
      error: "Failed to upload branding file",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    // Return current branding file info
    const brandingData = await getBrandingData()
    
    if (!brandingData) {
      return NextResponse.json({
        error: "No branding file found",
        details: "Please upload a branding file first"
      }, { status: 404 })
    }
    
    const brandingContent = JSON.stringify(brandingData)
    
    return NextResponse.json({
      success: true,
      currentFile: {
        size: brandingContent.length,
        hasColorPalette: !!brandingData.color_palette,
        hasIllustration: !!brandingData.illustration,
        hasLayout: !!brandingData.layout,
        hasFormatSpecs: !!brandingData.format_specifications,
        principalColors: Object.keys(brandingData.color_palette?.principal_colors || {}).length,
        lastModified: new Date().toISOString(),
        environment: process.env.VERCEL ? "Vercel (in-memory)" : "Local (file system)"
      }
    })
  } catch (error) {
    return NextResponse.json({
      error: "Could not read current branding file",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
