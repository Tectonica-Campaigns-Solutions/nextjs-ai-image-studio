import { NextRequest, NextResponse } from "next/server"
import { requireExternalAuth } from '@/lib/api-auth'
import {
  generateWithBfl,
  downloadBflImage,
  uploadImageToSupabase,
  prepareBase64ForBfl,
  prepareFileForBfl,
  deleteSupabaseImages,
  resizeImageForBfl,
  storeOutputImage,
  generateSignedUrlForBfl,
  BFL_ENDPOINT_FLUX2_PRO,
  BflApiError,
  type BflInput,
} from "@/lib/bfl-client"
import { getBflApiKey } from "@/lib/api-keys"
import { ContentModerationService } from "@/lib/content-moderation"
import { restoreDisclaimerZone, addDisclaimerToBuffer } from "@/lib/image-disclaimer"
import sharp from "sharp"
import fs from "fs/promises"
import path from "path"

const LOG_PREFIX = "[BFL Flux2Pro Edit Combine]"

// ─── Config helpers ───────────────────────────────────────────────────────────

/**
 * Returns the combineWithBranding prompt suffix from the org's config.json,
 * or null if not configured.  Mirrors the same helper in the FAL version.
 */
async function getCombineWithBrandingSuffix(orgType: string): Promise<string | null> {
  try {
    const folderName = `${orgType.toLowerCase()}-reference-images`
    const configPath = path.join(process.cwd(), "public", folderName, "config.json")
    const configContent = await fs.readFile(configPath, "utf-8")
    const config = JSON.parse(configContent)

    if (typeof config.prompts?.combineWithBranding === "string") {
      console.log(`${LOG_PREFIX} Using combineWithBranding from config.json`)
      return config.prompts.combineWithBranding
    }
  } catch {
    console.log(`${LOG_PREFIX} No combineWithBranding found for ${orgType}`)
  }
  return null
}

async function getCompositionRuleText(orgType: string, compositionRule: string): Promise<string | null> {
  try {
    const configPath = path.join(
      process.cwd(),
      "public",
      `${orgType.toLowerCase()}-reference-images`,
      "config.json"
    )
    const config = JSON.parse(await fs.readFile(configPath, "utf-8"))
    if (typeof config.prompts?.compositionRules?.[compositionRule] === "string") {
      return config.prompts.compositionRules[compositionRule]
    }
  } catch { /* silently ignore */ }
  return null
}

// ─── Route handler ────────────────────────────────────────────────────────────

/**
 * POST /api/external/bfl/flux-2-pro-edit-combine
 *
 * BFL-native equivalent of /api/external/flux-2-pro-edit-combine.
 * Combines exactly 2 user images using Black Forest Labs FLUX.2 [pro] direct API.
 *
 * Changes vs FAL version:
 * - Uses BFL API directly (no @fal-ai/client)
 * - File and Base64 images uploaded to Supabase; URL images passed directly
 * - Result downloaded server-side then re-uploaded to Supabase; client receives public URL
 * - enable_safety_checker: false → overrides safety_tolerance to 5 (BFL max permissiveness)
 * - cost field returned in response
 * - No sharp-based fal.ai upload — uses bfl-client helpers instead
 *
 * Body parameters (JSON):
 * - prompt (required): Text description for combining the images
 * - imageUrls (optional): Array of exactly 2 image URLs
 * - base64Images (optional): Array of exactly 2 base64 images (data URL or raw)
 * - orgType (optional): Organization identifier (default: "Tectonica")
 * - compositionRule (optional): Key into config.prompts.compositionRules
 * - settings (optional):
 *   - image_size: "auto"|"square_hd"|"square"|"portrait_4_3"|"portrait_16_9"|"landscape_4_3"|"landscape_16_9"|{width,height}
 *   - safety_tolerance: 1-5 (default: 2)
 *   - enable_safety_checker: boolean (default: true)
 *   - output_format: "jpeg"|"png" (default: "jpeg")
 *   - seed: number (optional)
 * - clientInfo (optional): { client_id, user_email, user_id }
 *
 * Body parameters (FormData):
 * - prompt, orgType, compositionRule, settings (JSON string), clientInfo (JSON string)
 * - image0, image1: File uploads
 * - imageUrl0, imageUrl1: Image URL strings
 * - imageBase640, imageBase641: Base64 image strings
 *
 * Response:
 * {
 *   "success": true,
 *   "images": [{ "url": "https://...supabase.co/...", "width": 1024, "height": 1024 }],
 *   "prompt": "full prompt used",
 *   "originalPrompt": "user's original prompt",
 *   "seed": 12345,
 *   "model": "flux-2-pro",
 *   "provider": "bfl",
 *   "inputImages": 2,
 *   "userImages": 2,
 *   "cost": 0.05,
 *   "settings": {...},
 *   "timestamp": "..."
 * }
 */
export async function POST(request: NextRequest) {
  const authError = await requireExternalAuth(request)
  if (authError) return authError

  try {
    console.log(`${LOG_PREFIX} Request received`)

    const contentType = request.headers.get("content-type") || ""
    const isJSON = contentType.includes("application/json")

    console.log(`${LOG_PREFIX} Content-Type: ${contentType}, isJSON: ${isJSON}`)

    // ── Variable declarations ──────────────────────────────────────────────────

    let prompt: string
    let orgType: string
    let settings: Record<string, unknown> = {}
    let imageFiles: File[] = []
    let imageUrls: string[] = []
    let base64Images: string[] = []
    let compositionRule: string | null = null
    let hasUrlImages = false // track if any images came as URLs
    let removeInputDisclaimer = true

    // ── Parse request ─────────────────────────────────────────────────────────

    if (isJSON) {
      console.log(`${LOG_PREFIX} Processing JSON payload`)

      const jsonBody = await request.json()

      prompt = jsonBody.prompt
      compositionRule = jsonBody.compositionRule || null

      const rawOrgType = jsonBody.orgType
      orgType = rawOrgType?.trim() ? rawOrgType.trim() : "Tectonica"
      if (orgType.toLowerCase() === "general") orgType = "Tectonica"

      settings = jsonBody.settings || {}
      if (jsonBody.removeInputDisclaimer === false) removeInputDisclaimer = false

      if (Array.isArray(jsonBody.imageUrls)) {
        imageUrls = jsonBody.imageUrls.filter((u: string) => u && u.trim())
        if (imageUrls.length > 0) hasUrlImages = true
        console.log(`${LOG_PREFIX} Found ${imageUrls.length} image URLs in JSON`)
      }

      if (Array.isArray(jsonBody.base64Images)) {
        base64Images = jsonBody.base64Images.filter((b: string) => b && b.trim())
        console.log(`${LOG_PREFIX} Found ${base64Images.length} Base64 images in JSON`)
      }

    } else {
      console.log(`${LOG_PREFIX} Processing FormData payload`)

      try {
        const formData = await request.formData()

        prompt = formData.get("prompt") as string
        compositionRule = (formData.get("compositionRule") as string) || null

        const rawOrgType = formData.get("orgType") as string
        orgType = rawOrgType?.trim() ? rawOrgType.trim() : "Tectonica"
        if (orgType.toLowerCase() === "general") orgType = "Tectonica"

        const clientInfoStr = formData.get("clientInfo") as string
        if (clientInfoStr) {
          try { JSON.parse(clientInfoStr) } catch { /* ignore */ }
        }

        const settingsStr = formData.get("settings") as string
        if (settingsStr) {
          try { settings = JSON.parse(settingsStr) } catch {
            console.warn(`${LOG_PREFIX} Failed to parse settings JSON`)
          }
        }
        if (formData.get("removeInputDisclaimer") === "false") removeInputDisclaimer = false

        // Collect 2 images (slot 0 and slot 1)
        for (let i = 0; i < 2; i++) {
          const file = formData.get(`image${i}`) as File | null
          if (file && file.size > 0) {
            imageFiles.push(file)
            console.log(`${LOG_PREFIX} Found file: image${i}, size: ${file.size}`)
          }

          const url = (formData.get(`imageUrl${i}`) as string | null)?.trim()
          if (url) {
            imageUrls.push(url)
            hasUrlImages = true
            console.log(`${LOG_PREFIX} Found URL: imageUrl${i}`)
          }

          const b64 = (formData.get(`imageBase64${i}`) as string | null)?.trim()
          if (b64) {
            base64Images.push(b64)
            console.log(`${LOG_PREFIX} Found Base64: imageBase64${i}, len: ${b64.length}`)
          }
        }

      } catch (formErr) {
        console.error(`${LOG_PREFIX} FormData parse error:`, formErr)
        throw formErr
      }
    }

    // ── Validation ────────────────────────────────────────────────────────────

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    const totalImages = imageFiles.length + imageUrls.length + base64Images.length

    if (totalImages < 2) {
      return NextResponse.json({
        error: "Not enough images",
        details: `This endpoint requires exactly 2 images. You provided ${totalImages}.`,
      }, { status: 400 })
    }

    if (totalImages > 2) {
      return NextResponse.json({
        error: "Too many images",
        details: `This endpoint accepts exactly 2 images. You provided ${totalImages}.`,
      }, { status: 400 })
    }

    // ── Extract settings ──────────────────────────────────────────────────────

    const imageSize = (settings.image_size ?? settings.imageSize ?? "auto") as string | { width: number; height: number }
    const safetyTolerance = String(settings.safety_tolerance ?? settings.safetyTolerance ?? "2")
    const outputFormat: "jpeg" | "png" = (settings.output_format ?? settings.outputFormat ?? "jpeg") as "jpeg" | "png"
    const seed: number | undefined = settings.seed ? parseInt(String(settings.seed)) : undefined
    const enableSafetyChecker = (settings as any).enable_safety_checker !== false

    const validImageSizes = ["auto", "square_hd", "square", "portrait_4_3", "portrait_16_9", "landscape_4_3", "landscape_16_9"]
    if (typeof imageSize === "string" && !validImageSizes.includes(imageSize)) {
      return NextResponse.json({
        error: "Invalid image_size",
        details: `Must be one of: ${validImageSizes.join(", ")}, or { width, height }`,
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
      console.log(`${LOG_PREFIX} Moderating prompt: ${prompt.substring(0, 100)}…`)
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
      console.warn(`${LOG_PREFIX} Moderation check failed, continuing:`, moderationError)
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

    // ── Prepare images → Supabase URLs ───────────────────────────────────────

    const allImageUrls: string[] = []
    const tempPaths: string[] = []
    let imageIndex = 0 // global index across all image sources

    // Files from FormData
    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i]
      const label = `@image${allImageUrls.length + 1}`
      console.log(`${LOG_PREFIX} Uploading file ${label} (${file.name}, ${file.size}B)…`)
      try {
        let fileUrl: string
        let filePath: string
        if (removeInputDisclaimer) {
          const arrayBuffer = await file.arrayBuffer()
          const rawBuffer = Buffer.from(arrayBuffer)
          const restoredBuffer = await restoreDisclaimerZone(rawBuffer)
          const resizedBuffer = await resizeImageForBfl(restoredBuffer)
          filePath = `bfl-input/${Date.now()}-${Math.random().toString(36).slice(2)}-img${imageIndex}.jpeg`
          fileUrl = await uploadImageToSupabase(resizedBuffer, filePath, "image/jpeg")
        } else {
          const result = await prepareFileForBfl(file, imageIndex)
          fileUrl = result.url
          filePath = result.path
        }
        allImageUrls.push(fileUrl)
        tempPaths.push(filePath)
        imageIndex++
        console.log(`${LOG_PREFIX} ✅ File ${label} → ${fileUrl}`)
      } catch (fileError) {
        console.error(`${LOG_PREFIX} File upload failed for ${label}:`, fileError)
        return NextResponse.json({
          error: "File image processing failed",
          details: `Image ${i + 1}: ${fileError instanceof Error ? fileError.message : "Unknown error"}`,
        }, { status: 400 })
      }
    }

    // Base64 images
    for (let i = 0; i < base64Images.length; i++) {
      const label = `@image${allImageUrls.length + 1}`
      console.log(`${LOG_PREFIX} Uploading Base64 ${label} (len: ${base64Images[i].length})…`)
      try {
        let uploadBase64 = base64Images[i]
        if (removeInputDisclaimer) {
          const base64Data = base64Images[i].replace(/^data:image\/\w+;base64,/, "")
          const rawBuffer = Buffer.from(base64Data, "base64")
          const restoredBuffer = await restoreDisclaimerZone(rawBuffer)
          uploadBase64 = `data:image/jpeg;base64,${restoredBuffer.toString("base64")}`
        }
        const { url: b64Url, path: b64Path } = await prepareBase64ForBfl(uploadBase64, imageIndex)
        allImageUrls.push(b64Url)
        tempPaths.push(b64Path)
        imageIndex++
        console.log(`${LOG_PREFIX} ✅ Base64 ${label} → ${b64Url}`)
      } catch (b64Error) {
        console.error(`${LOG_PREFIX} Base64 upload failed for ${label}:`, b64Error)
        return NextResponse.json({
          error: "Base64 image processing failed",
          details: `Image ${i + 1}: ${b64Error instanceof Error ? b64Error.message : "Unknown error"}`,
        }, { status: 400 })
      }
    }

    // Direct URL images
    for (const url of imageUrls) {
      const label = `@image${allImageUrls.length + 1}`
      try {
        new URL(url) // validate format
      } catch {
        return NextResponse.json({ error: "Invalid image URL format", details: url }, { status: 400 })
      }
      if (removeInputDisclaimer) {
        try {
          const res = await fetch(url)
          const arrayBuffer = await res.arrayBuffer()
          const rawBuffer = Buffer.from(arrayBuffer)
          const restoredBuffer = await restoreDisclaimerZone(rawBuffer)
          const resizedBuffer = await resizeImageForBfl(restoredBuffer)
          const fileName = `bfl-input/${Date.now()}-${Math.random().toString(36).slice(2)}-img${imageIndex}-restored.jpeg`
          const uploadedUrl = await uploadImageToSupabase(resizedBuffer, fileName, "image/jpeg")
          allImageUrls.push(uploadedUrl)
          tempPaths.push(fileName)
          imageIndex++
          console.log(`${LOG_PREFIX} ✅ URL ${label} restored and uploaded: ${uploadedUrl}`)
        } catch (urlError) {
          console.error(`${LOG_PREFIX} URL image restore failed for ${label}:`, urlError)
          return NextResponse.json({
            error: "URL image processing failed",
            details: urlError instanceof Error ? urlError.message : "Unknown error",
          }, { status: 400 })
        }
      } else {
        allImageUrls.push(await generateSignedUrlForBfl(url))
        imageIndex++
        console.log(`${LOG_PREFIX} ✅ URL ${label} added directly: ${url}`)
      }
    }

    console.log(`${LOG_PREFIX} Total images ready: ${allImageUrls.length}`)

    // ── Build prompt ──────────────────────────────────────────────────────────

    let finalPrompt = prompt.trim()

    // Apply combineWithBranding suffix when URL images were part of the request
    // (mirrors FAL version logic)
    if (hasUrlImages) {
      const brandingSuffix = await getCombineWithBrandingSuffix(orgType)
      if (brandingSuffix) {
        finalPrompt = `${finalPrompt} ${brandingSuffix}`
        console.log(`${LOG_PREFIX} Applied combineWithBranding suffix`)
      }
    }

    // Apply composition rule
    if (compositionRule) {
      const compositionRuleText = await getCompositionRuleText(orgType, compositionRule)
      if (compositionRuleText) {
        finalPrompt = `${finalPrompt}\n${compositionRuleText}`
        console.log(`${LOG_PREFIX} Applied composition rule '${compositionRule}'`)
      }
    }

    console.log(`${LOG_PREFIX} Final prompt: ${finalPrompt.substring(0, 120)}…`)

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

    console.log(`${LOG_PREFIX} Submitting to BFL (${BFL_ENDPOINT_FLUX2_PRO})…`, {
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
        return NextResponse.json({ error: "Content blocked by BFL safety system", blocked: true, moderation: true }, { status: 400 })
      }
      const status = bflError instanceof BflApiError ? bflError.status : 500
      return NextResponse.json({
        error: "Failed to combine images",
        details: bflError instanceof Error ? bflError.message : "Unknown error",
        model: BFL_ENDPOINT_FLUX2_PRO,
        provider: "bfl",
      }, { status })
    }

    console.log(`${LOG_PREFIX} ✅ BFL generation complete. Seed: ${bflResult.seed}, cost: ${bflResult.cost}`)

    // ── Download result & upload to Supabase ──────────────────────────────────

    let resultUrl: string
    let resultWidth = bflResult.width ?? 1024
    let resultHeight = bflResult.height ?? 1024

    try {
      const resultBuffer = await downloadBflImage(bflResult.imageUrl)
      const finalBuffer = await addDisclaimerToBuffer(resultBuffer)
      const metadata = await sharp(finalBuffer).metadata()
      resultWidth = metadata.width ?? resultWidth
      resultHeight = metadata.height ?? resultHeight
      resultUrl = (await storeOutputImage(finalBuffer, orgType, "jpeg", bflResult.cost)).proxyUrl
      console.log(`${LOG_PREFIX} ✅ Result stored privately: ${resultWidth}x${resultHeight} → ${resultUrl}`)
    } catch (downloadError) {
      console.error(`${LOG_PREFIX} Failed to process BFL result:`, downloadError)
      return NextResponse.json({
        error: "Failed to download generated image",
        details: downloadError instanceof Error ? downloadError.message : "Unknown error",
      }, { status: 500 })
    }

    // ── Response ──────────────────────────────────────────────────────────────

    deleteSupabaseImages(tempPaths).catch(err =>
      console.warn(`${LOG_PREFIX} Cleanup error (non-fatal):`, err)
    )

    return NextResponse.json({
      success: true,
      images: [{ url: resultUrl, width: resultWidth, height: resultHeight }],
      prompt: finalPrompt,
      originalPrompt: prompt,
      seed: bflResult.seed,
      model: BFL_ENDPOINT_FLUX2_PRO,
      provider: "bfl",
      inputImages: allImageUrls.length,
      userImages: 2,
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
      ...(process.env.NODE_ENV === "development" && error instanceof Error ? { stack: error.stack } : {}),
    }, { status: 500 })
  }
}

// ─── GET — API documentation ──────────────────────────────────────────────────

export async function GET() {
  return NextResponse.json({
    name: "BFL FLUX.2 [pro] Image Combine API",
    description: "Combines exactly 2 user images using Black Forest Labs FLUX.2 [pro] direct API",
    version: "1.0.0",
    endpoint: "/api/external/bfl/flux-2-pro-edit-combine",
    method: "POST",
    provider: "Black Forest Labs (bfl)",
    model: BFL_ENDPOINT_FLUX2_PRO,
    notes: [
      "Accepts exactly 2 images as Files (FormData), URLs, or Base64 strings",
      "User image 1 → @image1, user image 2 → @image2 in BFL request",
      "enable_safety_checker: false overrides safety_tolerance to 5 (BFL maximum permissiveness)",
      "enable_safety_checker: true (default) uses the safety_tolerance value as-is",
      "Result is returned as a public Supabase URL (stable, no expiry)",
      "cost field reflects BFL credits charged per request",
      "combineWithBranding suffix is applied from org config.json when URL images are provided",
    ],
    parameters: {
      prompt: { type: "string", required: true },
      imageUrls: { type: "string[]", required: false, description: "Array of 2 image URLs (JSON mode)" },
      base64Images: { type: "string[]", required: false, description: "Array of 2 base64 images (JSON mode)" },
      orgType: { type: "string", default: "Tectonica" },
      compositionRule: { type: "string", required: false },
      settings: {
        image_size: { type: "string|object", options: ["auto", "square_hd", "square", "portrait_4_3", "portrait_16_9", "landscape_4_3", "landscape_16_9", "{width,height}"], default: "auto" },
        safety_tolerance: { type: "number", range: "1-5", default: 2 },
        enable_safety_checker: { type: "boolean", default: true },
        output_format: { type: "string", options: ["jpeg", "png"], default: "jpeg" },
        seed: { type: "number", required: false },
      },
      formDataFields: {
        image0: "File (FormData)",
        image1: "File (FormData)",
        imageUrl0: "URL string (FormData)",
        imageUrl1: "URL string (FormData)",
        imageBase640: "Base64 string (FormData)",
        imageBase641: "Base64 string (FormData)",
      },
    },
  })
}
