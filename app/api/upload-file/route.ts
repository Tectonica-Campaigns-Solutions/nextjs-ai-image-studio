import { NextRequest, NextResponse } from "next/server"
import { fal } from "@fal-ai/client"

// Configure Fal client
fal.config({
  credentials: process.env.FAL_API_KEY!,
})

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

    console.log("[API] Uploading file:", file.name, "Size:", file.size)

    // Upload file to Fal storage
    const url = await fal.storage.upload(file)

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
