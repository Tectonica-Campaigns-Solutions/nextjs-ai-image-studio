import { NextRequest, NextResponse } from "next/server"
import { ContentModerationService } from "@/lib/content-moderation"
import {
  generateWithBfl,
  downloadBflImage,
  uploadImageToSupabase,
  prepareBase64ForBfl,
  prepareFileForBfl,
  BFL_ENDPOINT_FLUX2_PRO,
  BflApiError,
  type BflInput,
} from "@/lib/bfl-client"
import { getBflApiKey } from "@/lib/api-keys"
import sharp from "sharp"
import fs from "fs/promises"
import path from "path"

const LOG_PREFIX = "[BFL Flux2Pro Edit Edit]"

// ─── Composition rule helper (mirrors FAL version) ─────────────────────────

async function getCompositionRuleText(orgType: string, compositionRule: string): Promise<string | null> {
  try {
    const folderPath = path.join(process.cwd(), "public", `${orgType.toLowerCase()}-reference-images`)
    const configContent = await fs.readFile(path.join(folderPath, "config.json"), "utf-8")
    const config = JSON.parse(configContent)
    if (typeof config.prompts?.compositionRules?.[compositionRule] === "string") {
      return config.prompts.compositionRules[compositionRule]
    }
  } catch {
    // Config not found — silently ignore
  }
  return null
}

// ─── Route handler ────────────────────────────────────────────────────────────

/**
 * POST /api/external/bfl/flux-2-pro-edit-edit
 *
 * BFL-native equivalent of /api/external/flux-2-pro-edit-edit.
 * Accepts exactly 1 input image (File, Base64, or URL) and a prompt.
 * No branding / reference images — pure single-image edit.
 *
 * Accepts both JSON and multipart/form-data, mirroring the FAL endpoint.
 *
 * Changes vs FAL version:
 * - Uses BFL API directly (no @fal-ai/client)
 * - File and Base64 images uploaded to Supabase (not FAL storage)
 * - URL images passed directly (BFL fetches them from source)
 * - Result downloaded server-side then re-uploaded to Supabase; client receives public URL
 * - enable_safety_checker: false → overrides safety_tolerance to 5 (BFL max permissiveness)
 *
 * Body parameters (JSON or FormData):
 * JSON:
 *   - prompt (required)
 *   - imageUrls: string[]   (1 element)
 *   - base64Images: string[] (1 element)
 *   - orgType, clientInfo, compositionRule, settings
 * FormData:
 *   - prompt (required)
 *   - image0: File
 *   - imageUrl0: string
 *   - imageBase640: string
 *   - orgType, clientInfo (JSON string), compositionRule, settings (JSON string)
 *
 * Response:
 * {
 *   "success": true,
 *   "images": [{ "url": "https://...supabase.co/...", "width": 1024, "height": 1024 }],
 *   "prompt": "final prompt",
 *   "originalPrompt": "user prompt",
 *   "seed": 12345,
 *   "model": "flux-2-pro",
 *   "provider": "bfl",
 *   "inputImages": 1,
 *   "cost": 0.05,
 *   "settings": {...},
 *   "timestamp": "..."
 * }
 */
export async function POST(request: NextRequest) {
  try {
    console.log(`${LOG_PREFIX} Request received`)

    // ── Parse body (JSON or FormData) ─────────────────────────────────────────

    const contentType = request.headers.get("content-type") || ""
    const isJSON = contentType.includes("application/json")

    let prompt: string
    let orgType: string
    let settings: Record<string, unknown> = {}
    let imageFiles: File[] = []
    let imageUrls: string[] = []
    let base64Images: string[] = []
    let compositionRule: string | null = null

    if (isJSON) {
      console.log(`${LOG_PREFIX} Processing JSON payload`)
      const body = await request.json()

      prompt = body.prompt
      compositionRule = body.compositionRule || null

      const rawOrgType = body.orgType
      orgType = rawOrgType?.trim() || "Tectonica"
      if (orgType.toLowerCase() === "general") orgType = "Tectonica"

      const clientInfo = body.clientInfo || {}
      console.log(`${LOG_PREFIX} Client info:`, {
        orgType,
        client_id: clientInfo.client_id || "Tectonica",
        user_email: clientInfo.user_email || "",
      })

      settings = body.settings || {}

      if (Array.isArray(body.imageUrls)) {
        imageUrls = body.imageUrls.filter((u: string) => u?.trim())
      }
      if (Array.isArray(body.base64Images)) {
        base64Images = body.base64Images.filter((b: string) => b?.trim())
      }

    } else {
      console.log(`${LOG_PREFIX} Processing FormData payload`)
      try {
        const formData = await request.formData()

        prompt = formData.get("prompt") as string
        compositionRule = (formData.get("compositionRule") as string) || null

        const rawOrgType = formData.get("orgType") as string
        orgType = rawOrgType?.trim() || "Tectonica"
        if (orgType.toLowerCase() === "general") orgType = "Tectonica"

        const clientInfoStr = formData.get("clientInfo") as string | null
        if (clientInfoStr) {
          try {
            const clientInfo = JSON.parse(clientInfoStr)
            console.log(`${LOG_PREFIX} Client info:`, {
              orgType,
              client_id: clientInfo.client_id || "Tectonica",
              user_email: clientInfo.user_email || "",
            })
          } catch {
            console.warn(`${LOG_PREFIX} Failed to parse clientInfo JSON`)
          }
        }

        const settingsStr = formData.get("settings") as string | null
        if (settingsStr) {
          try {
            settings = JSON.parse(settingsStr)
          } catch {
            console.warn(`${LOG_PREFIX} Failed to parse settings JSON`)
          }
        }

        // Single image: image0, imageUrl0, or imageBase640
        const file = formData.get("image0") as File | null
        if (file && file.size > 0) imageFiles.push(file)

        const url = formData.get("imageUrl0") as string | null
        if (url?.trim()) imageUrls.push(url.trim())

        const b64 = formData.get("imageBase640") as string | null
        if (b64?.trim()) base64Images.push(b64.trim())

      } catch (formDataError) {
        console.error(`${LOG_PREFIX} Error processing FormData:`, formDataError)
        throw formDataError
      }
    }

    // ── Extract settings ──────────────────────────────────────────────────────

    const imageSize = (settings.image_size ?? settings.imageSize ?? "auto") as string | { width: number; height: number }
    const safetyTolerance = String(settings.safety_tolerance ?? settings.safetyTolerance ?? "2")
    const outputFormat: "jpeg" | "png" = (settings.output_format ?? settings.outputFormat ?? "jpeg") as "jpeg" | "png"
    const seed: number | undefined = settings.seed ? parseInt(String(settings.seed)) : undefined
    const enableSafetyChecker = settings.enable_safety_checker !== false

    // ── Validation ────────────────────────────────────────────────────────────

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    const totalImageSources = imageFiles.length + imageUrls.length + base64Images.length
    if (totalImageSources === 0) {
      return NextResponse.json({
        error: "No image provided",
        details: "Provide exactly 1 image via image0 (file), imageUrl0 (URL), or imageBase640 (base64)",
      }, { status: 400 })
    }
    if (totalImageSources > 1) {
      return NextResponse.json({
        error: "Too many images",
        details: `This endpoint accepts exactly 1 image. ${totalImageSources} were provided.`,
      }, { status: 400 })
    }

    const validImageSizes = ["auto", "square_hd", "square", "portrait_4_3", "portrait_16_9", "landscape_4_3", "landscape_16_9"]
    if (typeof imageSize === "string" && !validImageSizes.includes(imageSize)) {
      return NextResponse.json({
        error: "Invalid image_size",
        details: `Must be one of: ${validImageSizes.join(", ")}, or an object with width and height`,
      }, { status: 400 })
    }
    if (typeof imageSize === "object") {
      const { width, height } = imageSize
      if (!width || !height || width < 512 || width > 2048 || height < 512 || height > 2048) {
        return NextResponse.json({
          error: "Invalid custom dimensions",
          details: "width and height must be between 512 and 2048",
        }, { status: 400 })
      }
    }

    const safetyToleranceNum = parseInt(safetyTolerance, 10)
    if (isNaN(safetyToleranceNum) || safetyToleranceNum < 1 || safetyToleranceNum > 5) {
      return NextResponse.json({ error: "Invalid safety_tolerance", details: "Must be 1–5" }, { status: 400 })
    }
    const safetyToleranceStr = safetyToleranceNum.toString()

    if (!["jpeg", "png"].includes(outputFormat)) {
      return NextResponse.json({ error: "Invalid output_format", details: "Must be 'jpeg' or 'png'" }, { status: 400 })
    }

    // ── Content moderation ────────────────────────────────────────────────────

    try {
      const moderationService = new ContentModerationService(orgType)
      const moderationResult = await moderationService.moderateContent({ prompt })
      if (!moderationResult.safe) {
        console.log(`${LOG_PREFIX} Content blocked: ${moderationResult.reason}`)
        return NextResponse.json({
          error: moderationResult.reason,
          category: moderationResult.category,
          blocked: true,
          moderation: true,
        }, { status: 400 })
      }
      console.log(`${LOG_PREFIX} Content approved`)
    } catch (moderationError) {
      console.warn(`${LOG_PREFIX} Moderation failed, proceeding:`, moderationError)
    }

    // ── Resolve BFL API key ───────────────────────────────────────────────────

    let bflApiKey: string
    try {
      bflApiKey = getBflApiKey(orgType)
    } catch (error) {
      const msg = error instanceof Error ? error.message : "BFL API key not configured"
      console.error(`${LOG_PREFIX} ${msg}`)
      return NextResponse.json({ error: "API key configuration error", details: msg }, { status: 500 })
    }

    // ── Upload input image to Supabase ────────────────────────────────────────
    // BFL requires a publicly reachable URL for all input images.
    // Files and Base64 are uploaded to Supabase; plain URLs are passed directly.

    const allImageUrls: string[] = []

    if (imageFiles.length > 0) {
      console.log(`${LOG_PREFIX} Uploading File image to Supabase...`)
      try {
        const url = await prepareFileForBfl(imageFiles[0], 0)
        allImageUrls.push(url)
        console.log(`${LOG_PREFIX} ✅ File image uploaded: ${url}`)
      } catch (fileError) {
        console.error(`${LOG_PREFIX} File upload failed:`, fileError)
        return NextResponse.json({
          error: "File image processing failed",
          details: fileError instanceof Error ? fileError.message : "Unknown error",
        }, { status: 400 })
      }
    } else if (base64Images.length > 0) {
      console.log(`${LOG_PREFIX} Uploading Base64 image to Supabase...`)
      try {
        const url = await prepareBase64ForBfl(base64Images[0], 0)
        allImageUrls.push(url)
        console.log(`${LOG_PREFIX} ✅ Base64 image uploaded: ${url}`)
      } catch (b64Error) {
        console.error(`${LOG_PREFIX} Base64 upload failed:`, b64Error)
        return NextResponse.json({
          error: "Base64 image processing failed",
          details: b64Error instanceof Error ? b64Error.message : "Unknown error",
        }, { status: 400 })
      }
    } else if (imageUrls.length > 0) {
      try {
        new URL(imageUrls[0])
      } catch {
        return NextResponse.json({ error: "Invalid image URL format", details: imageUrls[0] }, { status: 400 })
      }
      allImageUrls.push(imageUrls[0])
      console.log(`${LOG_PREFIX} ✅ Using provided image URL: ${imageUrls[0]}`)
    }

    // ── Build final prompt ────────────────────────────────────────────────────

    let finalPrompt = prompt

    const compositionRuleText = compositionRule
      ? await getCompositionRuleText(orgType, compositionRule)
      : null
    if (compositionRuleText) {
      finalPrompt = `${finalPrompt}\n${compositionRuleText}`
      console.log(`${LOG_PREFIX} Applied composition rule '${compositionRule}'`)
    }

    // ── BFL input ─────────────────────────────────────────────────────────────

    const bflInput: BflInput = {
      prompt: finalPrompt,
      image_urls: allImageUrls,
      image_size: imageSize,
      safety_tolerance: safetyToleranceStr,
      output_format: outputFormat,
      enable_safety_checker: enableSafetyChecker,
      ...(seed !== undefined && { seed }),
    }

    console.log(`${LOG_PREFIX} Submitting to BFL (${BFL_ENDPOINT_FLUX2_PRO})...`, {
      prompt: finalPrompt.substring(0, 120) + "…",
      images: allImageUrls.length,
      image_size: imageSize,
      safety_tolerance: safetyToleranceNum,
      enable_safety_checker: enableSafetyChecker,
      output_format: outputFormat,
      seed: seed ?? "random",
    })

    // ── Generate ──────────────────────────────────────────────────────────────

    let bflResult
    try {
      bflResult = await generateWithBfl(BFL_ENDPOINT_FLUX2_PRO, bflInput, bflApiKey)
    } catch (bflError) {
      console.error(`${LOG_PREFIX} BFL API error:`, bflError)

      const isModerated = bflError instanceof BflApiError && bflError.message.includes("Moderated")
      if (isModerated) {
        return NextResponse.json({
          error: "Content blocked by BFL safety system",
          blocked: true,
          moderation: true,
        }, { status: 400 })
      }

      const status = bflError instanceof BflApiError ? bflError.status : 500
      return NextResponse.json({
        error: "Failed to generate image",
        details: bflError instanceof Error ? bflError.message : "Unknown error",
        model: BFL_ENDPOINT_FLUX2_PRO,
        provider: "bfl",
      }, { status })
    }

    console.log(`${LOG_PREFIX} ✅ BFL generation complete. Seed: ${bflResult.seed}`)

    // ── Download result & upload to Supabase ──────────────────────────────────
    // BFL signed URLs expire in 10 min and have no CORS headers.
    // We download server-side then re-upload to Supabase for a stable public URL.

    let resultUrl: string
    let resultWidth = bflResult.width ?? 1024
    let resultHeight = bflResult.height ?? 1024

    try {
      const resultBuffer = await downloadBflImage(bflResult.imageUrl)
      const metadata = await sharp(resultBuffer).metadata()
      resultWidth = metadata.width ?? resultWidth
      resultHeight = metadata.height ?? resultHeight
      const outputFileName = `bfl-output/${Date.now()}-${Math.random().toString(36).slice(2)}.${outputFormat}`
      resultUrl = await uploadImageToSupabase(resultBuffer, outputFileName, `image/${outputFormat}`)
      console.log(`${LOG_PREFIX} ✅ Result uploaded to Supabase: ${resultWidth}x${resultHeight} → ${resultUrl}`)
    } catch (downloadError) {
      console.error(`${LOG_PREFIX} Failed to process BFL result:`, downloadError)
      return NextResponse.json({
        error: "Failed to download generated image",
        details: downloadError instanceof Error ? downloadError.message : "Unknown error",
      }, { status: 500 })
    }

    // ── Response ──────────────────────────────────────────────────────────────

    return NextResponse.json({
      success: true,
      images: [{ url: resultUrl, width: resultWidth, height: resultHeight }],
      prompt: finalPrompt,
      originalPrompt: prompt,
      seed: bflResult.seed,
      model: BFL_ENDPOINT_FLUX2_PRO,
      provider: "bfl",
      inputImages: allImageUrls.length,
      cost: bflResult.cost,
      settings: {
        image_size: imageSize,
        safety_tolerance: safetyToleranceStr,
        enable_safety_checker: enableSafetyChecker,
        output_format: outputFormat,
        ...(seed !== undefined && { seed }),
      },
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    console.error(`${LOG_PREFIX} Unexpected error:`, error)
    return NextResponse.json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
      ...(process.env.NODE_ENV === "development" && error instanceof Error
        ? { stack: error.stack }
        : {}),
    }, { status: 500 })
  }
}

// ─── GET — API documentation ──────────────────────────────────────────────────

export async function GET() {
  return NextResponse.json({
    name: "BFL FLUX.2 [pro] Edit Edit API",
    description: "Edit a single image using FLUX.2 [pro] via Black Forest Labs direct API",
    version: "1.0.0",
    endpoint: "/api/external/bfl/flux-2-pro-edit-edit",
    method: "POST",
    provider: "Black Forest Labs (bfl)",
    model: BFL_ENDPOINT_FLUX2_PRO,
    notes: [
      "Accepts exactly 1 input image (File, Base64, or URL)",
      "No branding or reference images — pure single-image edit",
      "Accepts both application/json and multipart/form-data",
      "enable_safety_checker: false overrides safety_tolerance to 5 (BFL maximum permissiveness)",
      "enable_safety_checker: true (default) uses the safety_tolerance value as-is",
      "Result is returned as a public Supabase URL (stable, no expiry)",
      "cost field reflects BFL credits charged per request",
    ],
    parameters: {
      json: {
        prompt: { type: "string", required: true },
        imageUrls: { type: "string[]", description: "1-element array with an image URL" },
        base64Images: { type: "string[]", description: "1-element array with base64 data URL or raw base64" },
        orgType: { type: "string", default: "Tectonica" },
        compositionRule: { type: "string", required: false },
        settings: {
          image_size: { type: "string|object", options: ["auto", "square_hd", "square", "portrait_4_3", "portrait_16_9", "landscape_4_3", "landscape_16_9", "{width,height}"], default: "auto" },
          safety_tolerance: { type: "number", range: "1-5", default: 2 },
          enable_safety_checker: { type: "boolean", default: true },
          output_format: { type: "string", options: ["jpeg", "png"], default: "jpeg" },
          seed: { type: "number", required: false },
        },
      },
      formData: {
        prompt: { type: "string", required: true },
        image0: { type: "File" },
        imageUrl0: { type: "string" },
        imageBase640: { type: "string" },
        orgType: { type: "string" },
        compositionRule: { type: "string" },
        settings: { type: "string (JSON)" },
        clientInfo: { type: "string (JSON)" },
      },
    },
  })
}
