import { NextRequest, NextResponse } from "next/server"
import { requireExternalAuth } from '@/lib/api-auth'
import {
  generateWithBfl,
  downloadBflImage,
  uploadImageToSupabase,
  prepareBase64ForBfl,
  deleteSupabaseImages,
  resizeImageForBfl,
  storeOutputImage,
  generateSignedUrlForBfl,
  BFL_ENDPOINT_FLUX2_PRO,
  BflApiError,
  type BflInput,
} from "@/lib/bfl-client"
import { getBflApiKey } from "@/lib/api-keys"
import { restoreDisclaimerZone, addDisclaimerToBuffer } from "@/lib/image-disclaimer"
import sharp from "sharp"
import fs from "fs/promises"
import path from "path"

const LOG_PREFIX = "[BFL Flux2Pro Edit Apply]"

// ─── Scene configurations (mirrors FAL version exactly) ───────────────────────

type SceneType = "people" | "landscape" | "urban" | "monument"

const SCENE_CONFIGS: Record<SceneType, { defaultPrompt: string }> = {
  people: {
    defaultPrompt:
      "@image1 is the PRIMARY subject. Apply the artistic style, color palette, lighting mood, and atmospheric treatment of @image2 to the subject(s) in @image1. @image2 is a STYLE REFERENCE ONLY — do not introduce any structures, elements, or visual content from @image2 into the output. Preserve the exact pose, facial expression, anatomy, clothing, and identity of all subjects in @image1. Respect @image2 color scale.",
  },
  landscape: {
    defaultPrompt:
      "Combine the natural landscape scene from @image1 with the artistic style, color palette, lighting mood, and surface textures of @image2. Preserve the exact composition, viewpoint, horizon line, scale, and all geographical features from @image1 (mountains, coastline, rivers, trees, clouds). Do not add, remove, or relocate any elements. Do not introduce animals, people, buildings, or objects from @image2. Keep all shapes and contours unchanged; apply only stylistic rendering (brushwork/material feel), atmosphere, and color grading. Respect @image2 color scale.",
  },
  urban: {
    defaultPrompt:
      "Combine the urban cityscape from @image1 with the artistic style and atmosphere of @image2. Strictly preserve @image1's geometry, perspective lines, building silhouettes, street layout, signage placement, windows/doors proportions, and all object positions. Do not add or remove buildings, vehicles, people, street furniture, or text. Do not import any recognizable objects, landmarks, or patterns from @image2. Apply only stylistic transformation: color palette, lighting mood, material/texture rendering, and overall artistic treatment while keeping the scene structure identical. Respect @image2 color scale.",
  },
  monument: {
    defaultPrompt:
      "Combine the monument and its surroundings from @image1 with the artistic style and atmosphere of @image2. Preserve the monument's exact architecture and proportions: silhouette, edges, carvings/reliefs placement, material boundaries, inscriptions, and all structural details. Keep the camera angle, framing, and perspective identical to @image1. Do not add or remove architectural elements, statues, people, flags, or decorative features. Do not bring any landmark features from @image2 into @image1. Apply only stylistic rendering (texture/brushwork), lighting mood, and color palette, without altering the monument's geometry. Respect @image2 color scale.",
  },
}

const TECTONICA_REFERENCE_IMAGES: Record<SceneType, string> = {
  people: "TCT-AI-Landmark.png",
  landscape: "TCT-AI-Landmark-2.png",
  urban: "TCT-AI-Landmark-3.png",
  monument: "TCT-AI-Landmark.png",
}

const DEFAULT_SCENE_TYPE: SceneType = "people"

// ── TEMPORARY FLAG ────────────────────────────────────────────────────────────
// Set to true to disable reference image upload (passes only the user image).
// Prompts remain unchanged; only the image upload is skipped.
const DISABLE_REFERENCE_IMAGES = true
// ─────────────────────────────────────────────────────────────────────────────

async function getClientSceneConfig(
  orgType: string,
  sceneType: SceneType
): Promise<{ filenames: string[]; folderName: string; prompt: string }> {
  const folderName = `${orgType.toLowerCase()}-reference-images`
  const folderPath = path.join(process.cwd(), "public", folderName)
  let customPrompt: string | null = null

  // Step 1: Try config.json
  try {
    const configContent = await fs.readFile(path.join(folderPath, "config.json"), "utf-8")
    const config = JSON.parse(configContent)

    if (config.prompts?.[sceneType]) {
      customPrompt = config.prompts[sceneType]
      console.log(`${LOG_PREFIX} Using custom prompt from config.json for ${sceneType}`)
    }

    if (config[sceneType]) {
      const raw = config[sceneType]
      const filenames: string[] = Array.isArray(raw)
        ? raw.filter((f: unknown) => typeof f === "string")
        : typeof raw === "string"
          ? [raw]
          : []
      if (filenames.length > 0) {
        return { filenames, folderName, prompt: customPrompt || SCENE_CONFIGS[sceneType].defaultPrompt }
      }
    }
  } catch {
    console.log(`${LOG_PREFIX} No config.json for ${orgType}, trying naming convention...`)
  }

  // Step 2: Naming convention {sceneType}.png/.jpg/.jpeg
  for (const ext of ["png", "jpg", "jpeg"]) {
    const filename = `${sceneType}.${ext}`
    try {
      await fs.access(path.join(folderPath, filename))
      console.log(`${LOG_PREFIX} Found by convention: ${filename}`)
      return { filenames: [filename], folderName, prompt: customPrompt || SCENE_CONFIGS[sceneType].defaultPrompt }
    } catch { /* continue */ }
  }

  // Step 3: Fallback to Tectonica
  console.log(`${LOG_PREFIX} Falling back to Tectonica reference images`)
  return {
    filenames: [TECTONICA_REFERENCE_IMAGES[sceneType]],
    folderName: "tectonicaai-reference-images",
    prompt: customPrompt || SCENE_CONFIGS[sceneType].defaultPrompt,
  }
}

async function getCompositionRuleText(orgType: string, compositionRule: string): Promise<string | null> {
  try {
    const configContent = await fs.readFile(
      path.join(process.cwd(), "public", `${orgType.toLowerCase()}-reference-images`, "config.json"),
      "utf-8"
    )
    const config = JSON.parse(configContent)
    if (typeof config.prompts?.compositionRules?.[compositionRule] === "string") {
      return config.prompts.compositionRules[compositionRule]
    }
  } catch { /* silently ignore */ }
  return null
}

async function getElementIsolationText(orgType: string): Promise<string | null> {
  try {
    const configContent = await fs.readFile(
      path.join(process.cwd(), "public", `${orgType.toLowerCase()}-reference-images`, "config.json"),
      "utf-8"
    )
    const config = JSON.parse(configContent)
    if (typeof config.prompts?.createElementIsolation === "string") {
      return config.prompts.createElementIsolation
    }
  } catch { /* silently ignore */ }
  return null
}

// ─── Route handler ────────────────────────────────────────────────────────────

/**
 * POST /api/external/bfl/flux-2-pro-edit-apply
 *
 * BFL-native equivalent of /api/external/flux-2-pro-edit-apply.
 * Applies scene-based TectonicaAI style to a user image.
 * User image → @image1. Style reference(s) → @image2, @image3, …
 *
 * Changes vs FAL version:
 * - Uses BFL API directly (no @fal-ai/client)
 * - User image (base64/URL) uploaded to Supabase; URL images passed directly
 * - Style reference images read from disk → resized → uploaded to Supabase
 * - Result downloaded server-side then re-uploaded to Supabase; client receives public URL
 * - enable_safety_checker: false → overrides safety_tolerance to 5 (BFL max permissiveness)
 *
 * Body parameters (JSON):
 * - sceneType (optional): "people" | "landscape" | "urban" | "monument" (default: "people")
 * - prompt (optional): Custom text APPENDED after the mandatory scene prompt
 * - imageUrl (optional): Single user image URL
 * - base64Image (optional): Single user image as base64 data URL or raw base64
 * - orgType (optional): Organization identifier (default: "Tectonica")
 * - compositionRule (optional): key into config.prompts.compositionRules
 * - settings (optional):
 *   - image_size: "auto"|"square_hd"|"square"|"portrait_4_3"|"portrait_16_9"|"landscape_4_3"|"landscape_16_9"|{width,height}
 *   - safety_tolerance: 1-5 (default: 2)
 *   - enable_safety_checker: boolean (default: true)
 *   - output_format: "jpeg"|"png" (default: "jpeg")
 *   - seed: number (optional)
 * - clientInfo (optional): { client_id, user_email, user_id }
 *
 * Response:
 * {
 *   "success": true,
 *   "images": [{ "url": "https://...supabase.co/...", "width": 1024, "height": 1024 }],
 *   "sceneType": "people",
 *   "prompt": "full prompt",
 *   "basePrompt": "scene prompt",
 *   "customPrompt": "user addition or null",
 *   "seed": 12345,
 *   "model": "flux-2-pro",
 *   "provider": "bfl",
 *   "inputImages": 2,
 *   "referenceImages": ["TCT-AI-Landmark.png"],
 *   "referenceImage": "TCT-AI-Landmark.png",
 *   "userImages": 1,
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

    // ── Parse JSON body ───────────────────────────────────────────────────────

    const body = await request.json()

    const {
      sceneType: rawSceneType,
      prompt: customPrompt,
      imageUrl = null,
      base64Image = null,
      settings = {},
      orgType: rawOrgType,
      clientInfo = {},
      compositionRule = null,
    } = body

    const removeInputDisclaimer = body.removeInputDisclaimer !== false

    let orgType = rawOrgType?.trim() || "Tectonica"
    if (orgType.toLowerCase() === "general") orgType = "Tectonica"

    console.log(`${LOG_PREFIX} Client info:`, {
      orgType,
      client_id: clientInfo.client_id || "Tectonica",
      user_email: clientInfo.user_email || "",
    })

    // Normalize sceneType
    const sceneType: SceneType =
      rawSceneType &&
      typeof rawSceneType === "string" &&
      ["people", "landscape", "urban", "monument"].includes(rawSceneType.toLowerCase())
        ? (rawSceneType.toLowerCase() as SceneType)
        : DEFAULT_SCENE_TYPE

    // ── Extract settings ──────────────────────────────────────────────────────

    const imageSize = (settings.image_size ?? settings.imageSize ?? "auto") as string | { width: number; height: number }
    const safetyTolerance = String(settings.safety_tolerance ?? settings.safetyTolerance ?? "2")
    const outputFormat: "jpeg" | "png" = (settings.output_format ?? settings.outputFormat ?? "jpeg") as "jpeg" | "png"
    const seed: number | undefined = settings.seed ? parseInt(String(settings.seed)) : undefined
    const enableSafetyChecker = settings.enable_safety_checker !== false

    // ── Validation ────────────────────────────────────────────────────────────

    if (!imageUrl && !base64Image) {
      return NextResponse.json({
        error: "User image is required",
        details: "Provide exactly 1 image via imageUrl or base64Image",
      }, { status: 400 })
    }
    if (imageUrl && base64Image) {
      return NextResponse.json({
        error: "Too many user images",
        details: "Provide either imageUrl OR base64Image, not both",
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

    // ── Resolve BFL API key ───────────────────────────────────────────────────

    let bflApiKey: string
    try {
      bflApiKey = getBflApiKey(orgType)
    } catch (error) {
      const msg = error instanceof Error ? error.message : "BFL API key not configured"
      console.error(`${LOG_PREFIX} ${msg}`)
      return NextResponse.json({ error: "API key configuration error", details: msg }, { status: 500 })
    }

    // ── Load scene config (reference image + prompt) ──────────────────────────

    const sceneConfig = await getClientSceneConfig(orgType, sceneType)
    const basePrompt = sceneConfig.prompt

    let finalPrompt =
      customPrompt && typeof customPrompt === "string" && customPrompt.trim()
        ? `${basePrompt} ${customPrompt.trim()}`
        : basePrompt

    const compositionRuleText = compositionRule ? await getCompositionRuleText(orgType, compositionRule) : null
    if (compositionRuleText) {
      finalPrompt = `${finalPrompt}\n${compositionRuleText}`
      console.log(`${LOG_PREFIX} Applied composition rule '${compositionRule}'`)
    }

    const elementIsolationText = DISABLE_REFERENCE_IMAGES ? null : await getElementIsolationText(orgType)
    if (elementIsolationText) {
      finalPrompt = `${finalPrompt}\n${elementIsolationText}`
      console.log(`${LOG_PREFIX} Applied createElementIsolation`)
    } else if (DISABLE_REFERENCE_IMAGES) {
      console.log(`${LOG_PREFIX} Element isolation skipped (DISABLE_REFERENCE_IMAGES=true)`)
    }

    // ── Upload images → Supabase ──────────────────────────────────────────────
    // Order: user image FIRST (@image1), then style reference(s) (@image2, @image3, …)

    const allImageUrls: string[] = []
    const tempPaths: string[] = []

    // User image (@image1)
    console.log(`${LOG_PREFIX} Processing user image (@image1)...`)
    if (base64Image) {
      try {
        let uploadBase64 = base64Image
        if (removeInputDisclaimer) {
          const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "")
          const rawBuffer = Buffer.from(base64Data, "base64")
          const restoredBuffer = await restoreDisclaimerZone(rawBuffer)
          uploadBase64 = `data:image/jpeg;base64,${restoredBuffer.toString("base64")}`
        }
        const { url: imgUrl, path: imgPath } = await prepareBase64ForBfl(uploadBase64, 0)
        allImageUrls.push(imgUrl)
        tempPaths.push(imgPath)
        console.log(`${LOG_PREFIX} ✅ User base64 image uploaded (@image1): ${imgUrl}`)
      } catch (b64Error) {
        console.error(`${LOG_PREFIX} Base64 upload failed:`, b64Error)
        return NextResponse.json({
          error: "Base64 image processing failed",
          details: b64Error instanceof Error ? b64Error.message : "Unknown error",
        }, { status: 400 })
      }
    } else {
      try { new URL(imageUrl) } catch {
        return NextResponse.json({ error: "Invalid image URL format", details: imageUrl }, { status: 400 })
      }
      if (removeInputDisclaimer) {
        try {
          const res = await fetch(imageUrl)
          const arrayBuffer = await res.arrayBuffer()
          const rawBuffer = Buffer.from(arrayBuffer)
          const restoredBuffer = await restoreDisclaimerZone(rawBuffer)
          const resizedBuffer = await resizeImageForBfl(restoredBuffer)
          const fileName = `bfl-input/${Date.now()}-${Math.random().toString(36).slice(2)}-img0-restored.jpeg`
          const uploadedUrl = await uploadImageToSupabase(resizedBuffer, fileName, "image/jpeg")
          allImageUrls.push(uploadedUrl)
          tempPaths.push(fileName)
          console.log(`${LOG_PREFIX} ✅ User image URL restored and uploaded (@image1): ${uploadedUrl}`)
        } catch (urlError) {
          console.error(`${LOG_PREFIX} URL image restore failed:`, urlError)
          return NextResponse.json({
            error: "URL image processing failed",
            details: urlError instanceof Error ? urlError.message : "Unknown error",
          }, { status: 400 })
        }
      } else {
        allImageUrls.push(await generateSignedUrlForBfl(imageUrl))
        console.log(`${LOG_PREFIX} ✅ User image URL added (@image1): ${imageUrl}`)
      }
    }

    // Style reference images (@image2, …)
    const { filenames: refFilenames, folderName: refFolderName } = sceneConfig

    if (DISABLE_REFERENCE_IMAGES) {
      console.log(`${LOG_PREFIX} ⚠️  Reference images DISABLED — skipping style reference upload`)
    } else {
    console.log(`${LOG_PREFIX} Uploading ${refFilenames.length} style reference(s) for scene '${sceneType}'...`)

    for (let i = 0; i < refFilenames.length; i++) {
      const label = `@image${i + 2}`
      const fullPath = path.join(process.cwd(), "public", refFolderName, refFilenames[i])
      try {
        const rawBuffer = await fs.readFile(fullPath)
        const resized = await resizeImageForBfl(rawBuffer)
        const fileName = `bfl-ref/${orgType.toLowerCase()}-apply-${sceneType}-ref${i + 1}-${Date.now()}-${Math.random().toString(36).slice(2)}.jpeg`
        const url = await uploadImageToSupabase(resized, fileName, "image/jpeg")
        allImageUrls.push(url)
        tempPaths.push(fileName)
        console.log(`${LOG_PREFIX} ✅ Style reference ${label} uploaded: ${url}`)
      } catch (refError) {
        console.error(`${LOG_PREFIX} Failed to upload style reference ${label}:`, refError)
        return NextResponse.json({
          error: "Failed to upload style reference image",
          details: `${label} (${refFilenames[i]}): ${refError instanceof Error ? refError.message : "Unknown error"}`,
        }, { status: 500 })
      }
    }
    } // end if (!DISABLE_REFERENCE_IMAGES)

    console.log(`${LOG_PREFIX} Total images: ${allImageUrls.length} (1 user + ${DISABLE_REFERENCE_IMAGES ? 0 : refFilenames.length} style ref(s))`)
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
      sceneType,
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
        error: "Failed to generate image",
        details: bflError instanceof Error ? bflError.message : "Unknown error",
        model: BFL_ENDPOINT_FLUX2_PRO,
        provider: "bfl",
      }, { status })
    }

    console.log(`${LOG_PREFIX} ✅ BFL generation complete. Seed: ${bflResult.seed}`)

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
      sceneType,
      prompt: finalPrompt,
      basePrompt,
      customPrompt: customPrompt || null,
      seed: bflResult.seed,
      model: BFL_ENDPOINT_FLUX2_PRO,
      provider: "bfl",
      inputImages: allImageUrls.length,
      referenceImages: refFilenames,
      referenceImage: refFilenames[0],
      userImages: 1,
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
    name: "BFL FLUX.2 [pro] Scene-Based Style Apply API",
    description: "Apply TectonicaAI style to user images with scene-specific reference images via Black Forest Labs direct API",
    version: "1.0.0",
    endpoint: "/api/external/bfl/flux-2-pro-edit-apply",
    method: "POST",
    provider: "Black Forest Labs (bfl)",
    model: BFL_ENDPOINT_FLUX2_PRO,
    notes: [
      "User image is always @image1; style reference(s) are @image2, @image3, …",
      "enable_safety_checker: false overrides safety_tolerance to 5 (BFL maximum permissiveness)",
      "enable_safety_checker: true (default) uses the safety_tolerance value as-is",
      "Result is returned as a public Supabase URL (stable, no expiry)",
      "Style reference images are uploaded to Supabase 'User images' bucket",
      "cost field reflects BFL credits charged per request",
    ],
    parameters: {
      sceneType: { type: "string", options: ["people", "landscape", "urban", "monument"], default: "people" },
      prompt: { type: "string", required: false, description: "Custom text appended after the mandatory scene prompt" },
      imageUrl: { type: "string", required: false, description: "User image URL" },
      base64Image: { type: "string", required: false, description: "User image as base64 data URL or raw base64" },
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
  })
}
