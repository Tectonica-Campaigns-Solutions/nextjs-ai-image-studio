import { NextRequest, NextResponse } from "next/server"
import { fal } from "@fal-ai/client"
import { getClientApiKey } from '@/lib/api-keys'

// Configure Fal client
fal.config({
  credentials: process.env.FAL_API_KEY!,
})

// Configure runtime and timeout
export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes for large file uploads

export async function POST(request: NextRequest) {
  try {
    console.log("[EXTERNAL-UPLOAD-IMAGE] Upload request received")

    const body = await request.json()
    const { image, orgType: rawOrgType } = body

    // Determine organization type (default to "general")
    const orgType = rawOrgType && typeof rawOrgType === 'string' && rawOrgType.trim() 
      ? rawOrgType.trim() 
      : "general"

    console.log(`[EXTERNAL-UPLOAD-IMAGE] Request from organization: ${orgType}`)

    // Get the appropriate FAL API key for this organization
    const falApiKey = getClientApiKey(orgType)
    
    // Configure fal client with organization-specific key
    fal.config({
      credentials: falApiKey,
    })

    if (!image) {
      return NextResponse.json(
        { error: "No image provided in request body" },
        { status: 400 }
      )
    }

    // Parse base64 image (handle both with and without data URI prefix)
    let base64Data: string
    let mimeType = 'image/png' // default
    
    if (image.startsWith('data:')) {
      // Extract mime type and base64 data from data URI
      const matches = image.match(/^data:([^;]+);base64,(.+)$/)
      if (!matches) {
        return NextResponse.json(
          { error: "Invalid base64 image format. Expected 'data:image/...;base64,...' or raw base64 string" },
          { status: 400 }
        )
      }
      mimeType = matches[1]
      base64Data = matches[2]
    } else {
      // Raw base64 string
      base64Data = image
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, 'base64')

    // Check file size (limit to 10MB for base64 uploads)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (buffer.length > maxSize) {
      return NextResponse.json(
        { error: `Image too large. Maximum size is ${maxSize / (1024 * 1024)}MB` },
        { status: 413 }
      )
    }

    console.log(`[EXTERNAL-UPLOAD-IMAGE] Image size: ${(buffer.length / 1024).toFixed(2)}KB, MIME type: ${mimeType}`)

    // Determine file extension from MIME type
    const extension = mimeType.split('/')[1] || 'png'
    const filename = `upload-${Date.now()}.${extension}`

    // Create a File object from buffer
    const file = new File([buffer], filename, { type: mimeType })

    console.log(`[EXTERNAL-UPLOAD-IMAGE] Uploading to FAL storage: ${filename}`)

    // Upload file to Fal storage with timeout handling
    const uploadPromise = fal.storage.upload(file)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Upload timeout after 4 minutes')), 240000)
    })

    const url = await Promise.race([uploadPromise, timeoutPromise]) as string

    console.log(`[EXTERNAL-UPLOAD-IMAGE] Upload successful: ${url}`)

    return NextResponse.json({
      success: true,
      url,
      filename,
      size: buffer.length
    })

  } catch (error) {
    console.error("[EXTERNAL-UPLOAD-IMAGE] Error:", error)
    
    if (error instanceof Error) {
      // Handle specific timeout errors
      if (error.message.includes('timeout') || error.message.includes('408')) {
        return NextResponse.json(
          { 
            error: "Upload timeout - image too large or connection too slow",
            details: "Try with a smaller image or check your connection"
          },
          { status: 408 }
        )
      }

      return NextResponse.json(
        { 
          error: error.message,
          details: "Failed to upload image to FAL storage"
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: "Unknown error occurred during image upload" },
      { status: 500 }
    )
  }
}
