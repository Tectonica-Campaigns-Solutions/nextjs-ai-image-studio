import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const base64Data = (formData.get("base64") as string) || ""
    
    if (!base64Data) {
      return NextResponse.json({ error: "No base64 data provided" }, { status: 400 })
    }

    console.log("[Test Optimize] Received Base64, length:", base64Data.length)

    // Extract MIME type and base64 string
    let base64String = base64Data
    let mimeType = 'image/jpeg'
    
    if (base64Data.startsWith('data:')) {
      const matches = base64Data.match(/^data:([^;]+);base64,(.+)$/)
      if (matches) {
        mimeType = matches[1]
        base64String = matches[2]
      }
    }

    // Convert to Buffer
    const imageBuffer = Buffer.from(base64String, 'base64')
    console.log(`[Test Optimize] Buffer size: ${(imageBuffer.length / 1024 / 1024).toFixed(2)} MB`)

    const MAX_SIZE_BYTES = 1.5 * 1024 * 1024
    
    if (imageBuffer.length > MAX_SIZE_BYTES) {
      console.log(`[Test Optimize] Starting optimization...`)
      
      const sharpModule = await import('sharp')
      const sharp = sharpModule.default
      
      const compressedBuffer = await sharp(imageBuffer)
        .resize(1920, 1920, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 75 })
        .toBuffer()
      
      console.log(`[Test Optimize] Optimized: ${(imageBuffer.length / 1024 / 1024).toFixed(2)} MB → ${(compressedBuffer.length / 1024 / 1024).toFixed(2)} MB`)
      
      return NextResponse.json({
        success: true,
        originalSize: imageBuffer.length,
        optimizedSize: compressedBuffer.length,
        reduction: ((1 - compressedBuffer.length / imageBuffer.length) * 100).toFixed(1) + '%'
      })
    }

    return NextResponse.json({
      success: true,
      originalSize: imageBuffer.length,
      message: 'No optimization needed'
    })

  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error("[Test Optimize] Error:", errorMsg)
    return NextResponse.json({ error: errorMsg }, { status: 500 })
  }
}
