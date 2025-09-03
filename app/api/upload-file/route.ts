import { NextRequest, NextResponse } from "next/server"
import { fal } from "@fal-ai/client"

// Configure Fal client
fal.config({
  credentials: process.env.FAL_API_KEY!,
})

// Configure runtime and timeout for large file uploads
export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes for large file uploads

export async function POST(request: NextRequest) {
  try {
    console.log("[API] File upload request received")

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      )
    }

    // Check file size (limit to 100MB)
    const maxSize = 100 * 1024 * 1024 // 100MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${maxSize / (1024 * 1024)}MB` },
        { status: 413 }
      )
    }

    console.log("[API] Uploading file:", file.name, "Size:", file.size)

    // Upload file to Fal storage with timeout handling
    const uploadPromise = fal.storage.upload(file)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Upload timeout after 4 minutes')), 240000)
    })

    const url = await Promise.race([uploadPromise, timeoutPromise]) as string

    console.log("[API] File uploaded successfully to:", url)

    return NextResponse.json({
      success: true,
      url,
      filename: file.name,
      size: file.size
    })

  } catch (error) {
    console.error("[API] Error uploading file:", error)
    
    if (error instanceof Error) {
      // Handle specific timeout errors
      if (error.message.includes('timeout') || error.message.includes('408')) {
        return NextResponse.json(
          { 
            error: "Upload timeout - file too large or connection too slow",
            details: "Try with a smaller file or check your internet connection"
          },
          { status: 408 }
        )
      }

      return NextResponse.json(
        { 
          error: error.message,
          details: "Failed to upload file to Fal storage"
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: "Unknown error occurred during file upload" },
      { status: 500 }
    )
  }
}
