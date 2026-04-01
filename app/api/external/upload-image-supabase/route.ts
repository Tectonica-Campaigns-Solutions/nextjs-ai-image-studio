import { NextRequest, NextResponse } from "next/server"
import { uploadImageToSupabase } from "@/lib/bfl-client"
import { requireBearerToken } from '@/lib/api-auth'

export const runtime = "nodejs"
export const maxDuration = 300

const LOG_PREFIX = "[EXTERNAL-UPLOAD-IMAGE-SUPABASE]"
const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

/**
 * POST /api/external/upload-image-supabase
 *
 * Uploads a base64-encoded image to the Supabase staging bucket (bfl-staging, public).
 * Equivalent to /api/external/upload-image but uses Supabase instead of FAL storage.
 *
 * Use this endpoint when the image will be consumed by BFL endpoints — the returned
 * Supabase URL can be passed directly as `imageUrl` to any BFL route.
 *
 * Request body (JSON):
 *   image   — Base64 string (raw or data URI: "data:image/...;base64,...")
 *   orgType — Organization identifier (optional, used for logging only)
 *
 * Response:
 *   { success: true, url: string, filename: string, size: number }
 */
export async function POST(request: NextRequest) {
  const authError = requireBearerToken(request)
  if (authError) return authError

  try {
    console.log(`${LOG_PREFIX} Upload request received`)

    const body = await request.json()
    const { image, orgType: rawOrgType } = body

    const orgType =
      rawOrgType && typeof rawOrgType === "string" && rawOrgType.trim()
        ? rawOrgType.trim()
        : "general"

    console.log(`${LOG_PREFIX} Request from organization: ${orgType}`)

    if (!image) {
      return NextResponse.json({ error: "No image provided in request body" }, { status: 400 })
    }

    // Parse base64 (data URI or raw)
    let base64Data: string
    let mimeType = "image/png"

    if (image.startsWith("data:")) {
      const matches = image.match(/^data:([^;]+);base64,(.+)$/)
      if (!matches) {
        return NextResponse.json(
          { error: "Invalid base64 format. Expected 'data:image/...;base64,...' or raw base64 string" },
          { status: 400 }
        )
      }
      mimeType = matches[1] === "image/jpg" ? "image/jpeg" : matches[1]
      base64Data = matches[2]
    } else {
      base64Data = image
    }

    const buffer = Buffer.from(base64Data, "base64")

    if (buffer.length > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: `Image too large. Maximum size is ${MAX_SIZE_BYTES / (1024 * 1024)}MB` },
        { status: 413 }
      )
    }

    console.log(
      `${LOG_PREFIX} Image size: ${(buffer.length / 1024).toFixed(2)}KB, MIME type: ${mimeType}`
    )

    const ext = mimeType.split("/")[1]?.replace("jpeg", "jpg") || "png"
    const filename = `bfl-input/${Date.now()}-${Math.random().toString(36).slice(2)}-upload.${ext}`

    console.log(`${LOG_PREFIX} Uploading to Supabase staging: ${filename}`)

    const url = await uploadImageToSupabase(buffer, filename, mimeType)

    console.log(`${LOG_PREFIX} Upload successful: ${url}`)

    return NextResponse.json({
      success: true,
      url,
      filename,
      size: buffer.length,
    })
  } catch (error) {
    console.error(`${LOG_PREFIX} Error:`, error)

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
