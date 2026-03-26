import { NextRequest, NextResponse } from "next/server"
import { ContentModerationService } from "@/lib/content-moderation"
import { addDisclaimerToBuffer, restoreDisclaimerZone } from "@/lib/image-disclaimer"
import {
  generateWithBfl,
  downloadBflImage,
  resizeImageForBfl,
  uploadImageToSupabase,
  prepareBase64ForBfl,
  deleteSupabaseImages,
  BFL_ENDPOINT_FLUX2_PRO,
  BflApiError,
  type BflInput,
} from "@/lib/bfl-client"
import { getBflApiKey } from "@/lib/api-keys"
import sharp from "sharp"
import fs from "fs/promises"
import path from "path"

const LOG_PREFIX = "[BFL Flux2Pro Edit Create]"
// ── TEMPORARY FLAG ────────────────────────────────────────────────────────────
// Set to true to disable reference image upload even when withBranding=true.
// Prompts remain unchanged; only the image upload is skipped.
const DISABLE_REFERENCE_IMAGES = true
// ────────────────────────────────────────────────────────────────────────────
// ─── Fallback reference images ────────────────────────────────────────────────

const FALLBACK_REFERENCE_IMAGES = [
  "TctAIGeneration01.jpg",
  "TctAIGeneration02.jpg",
  "TctAIGeneration03.jpg",
  "TctAIGeneration04.jpg",
  "TctAIGeneration05.jpg",
  "TctAIGeneration06.jpg",
  "TctAIGeneration07.jpg",
  "TctAIGeneration08.jpg",
]

// ─── Reference image config loader ───────────────────────────────────────────
// Identical logic to the original FAL endpoint.

interface RefImagesResult {
  filenames: string[]
  folderName: string
  userImagePrompt: string
  userImageWithBrandingPrompt: string
  styleReinforcement: string
  elementIsolation: string
}

const DEFAULT_USER_IMAGE_PROMPT =
  "IMPORTANT: @image1 contains the main subject that must be present and recognizable in the final result. Integrate this element with the reference styles without significantly altering it."

const DEFAULT_USER_IMAGE_WITH_BRANDING_PROMPT = DEFAULT_USER_IMAGE_PROMPT

const DEFAULT_STYLE_REINFORCEMENT =
  "STYLE REFERENCE DIRECTIVE: The reference images define the color palette, tonal values, lighting setup, and atmospheric mood that MUST be applied to the result. Honor the rendering style direction specified in the prompt (e.g., photorealistic, illustrative, painterly), but extract the color grading, tonal range, lighting character, and overall visual aesthetic exclusively from the reference images. Do not use a generic or default color treatment — the aesthetic must feel visually consistent with the reference images."

async function getClientReferenceImages(orgType: string): Promise<RefImagesResult> {
  const folderName = `${orgType.toLowerCase()}-reference-images`
  const folderPath = path.join(process.cwd(), "public", folderName)

  try {
    const configPath = path.join(folderPath, "config.json")
    const configContent = await fs.readFile(configPath, "utf-8")
    const config = JSON.parse(configContent)

    console.log(`${LOG_PREFIX} Config loaded for ${orgType}:`, JSON.stringify(config, null, 2))

    if (config.create && Array.isArray(config.create) && config.create.length > 0) {
      const userImagePrompt = config.prompts?.createWithUserImage || DEFAULT_USER_IMAGE_PROMPT
      const userImageWithBrandingPrompt: string =
        typeof config.prompts?.createWithUserImageAndBranding === "string"
          ? config.prompts.createWithUserImageAndBranding
          : userImagePrompt
      const styleReinforcement: string =
        typeof config.prompts?.createStyleReinforcement === "string"
          ? config.prompts.createStyleReinforcement
          : DEFAULT_STYLE_REINFORCEMENT
      const elementIsolation: string =
        typeof config.prompts?.createElementIsolation === "string"
          ? config.prompts.createElementIsolation
          : ""

      console.log(`${LOG_PREFIX} Using config.json: ${config.create.length} create images from ${folderName}`)
      return { filenames: config.create, folderName, userImagePrompt, userImageWithBrandingPrompt, styleReinforcement, elementIsolation }
    }
  } catch {
    console.log(`${LOG_PREFIX} No config.json or "create" array for ${orgType}, falling back to Tectonica`)
  }

  return {
    filenames: FALLBACK_REFERENCE_IMAGES,
    folderName: "tectonica-reference-images",
    userImagePrompt: DEFAULT_USER_IMAGE_PROMPT,
    userImageWithBrandingPrompt: DEFAULT_USER_IMAGE_WITH_BRANDING_PROMPT,
    styleReinforcement: DEFAULT_STYLE_REINFORCEMENT,
    elementIsolation: "",
  }
}

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

// ─── Reference image upload (resize → Supabase) ───────────────────────────────
// BFL accepts up to 8 reference images independently.
// We resize to 4MP / multiples-of-16 (BFL requirement) before upload.

async function uploadReferenceImage(
  filePath: string,
  orgType: string,
  index: number
): Promise<{ url: string; path: string }> {
  const rawBuffer = await fs.readFile(filePath)
  const resized = await resizeImageForBfl(rawBuffer)
  const fileName = `bfl-ref/${orgType.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2)}-ref${index + 1}.jpeg`
  const url = await uploadImageToSupabase(resized, fileName, "image/jpeg")
  return { url, path: fileName }
}

// ─── Route handler ────────────────────────────────────────────────────────────

/**
 * POST /api/external/bfl/flux-2-pro-edit-create
 *
 * BFL-native equivalent of /api/external/flux-2-pro-edit-create.
 * Identical request/response contract — only the underlying provider changes.
 *
 * Changes vs FAL version:
 * - Uses BFL API directly (no @fal-ai/client)
 * - Reference images uploaded to Supabase (not FAL storage)
 * - User images uploaded to Supabase (not FAL storage)
 * - BFL images are each independent params (input_image, input_image_2 … input_image_8)
 * - Result is downloaded server-side then re-uploaded to Supabase; client receives a public URL
 * - enable_safety_checker: false → overrides safety_tolerance to 5 (BFL’s maximum permissiveness)
 * - safety_tolerance: BFL accepts integer 0-5 (mapping is 1:1 with FAL string "1"-"5")
 *
 * Body parameters (JSON):
 * - prompt (required): Text description for the creation
 * - imageUrl (optional): Single image URL from user
 * - base64Image (optional): Single Base64 image from user (data URL or raw)
 * - orgType (optional): Organization identifier (default: "Tectonica")
 * - withBranding (optional): boolean (default: true) — load org reference images
 * - compositionRule (optional): key into config.prompts.compositionRules
 * - settings (optional):
 *   - image_size: "auto"|"square_hd"|"square"|"portrait_4_3"|"portrait_16_9"|"landscape_4_3"|"landscape_16_9"|{width,height}
 *   - safety_tolerance: 1-5 (default: 2)
 *   - output_format: "jpeg"|"png" (default: "jpeg")
 *   - seed: number (optional)
 * - clientInfo (optional): { client_id, user_email, user_id }
 *
 * Response:
 * {
 *   "success": true,
 *   "images": [{ "url": "data:image/jpeg;base64,...", "width": 1024, "height": 1024 }],
 *   "prompt": "final prompt",
 *   "originalPrompt": "user prompt",
 *   "seed": 12345,
 *   "model": "flux-2-pro",
 *   "provider": "bfl",
 *   "inputImages": 4,
 *   "referenceImages": 3,
 *   "userImages": 1,
 *   "withBranding": true,
 *   "settings": {...},
 *   "timestamp": "..."
 * }
 */
export async function POST(request: NextRequest) {
  try {
    console.log(`${LOG_PREFIX} Request received`)

    const body = await request.json()

    const {
      prompt,
      imageUrl = null,
      base64Image = null,
      settings = {},
      orgType: rawOrgType,
      clientInfo = {},
      compositionRule = null,
      withBranding = true,
      removeInputDisclaimer = false,
    } = body

    const useBranding = withBranding !== false

    // Normalise orgType
    let orgType = rawOrgType?.trim() || "Tectonica"
    if (orgType.toLowerCase() === "general") {
      orgType = "Tectonica"
    }

    // Resolve BFL API key for this org
    let bflApiKey: string
    try {
      bflApiKey = getBflApiKey(orgType)
    } catch (error) {
      const msg = error instanceof Error ? error.message : "BFL API key not configured"
      console.error(`${LOG_PREFIX} ${msg}`)
      return NextResponse.json({ error: "API key configuration error", details: msg }, { status: 500 })
    }

    const client_id = clientInfo.client_id?.trim() || "Tectonica"
    const user_email = clientInfo.user_email || ""
    const user_id = clientInfo.user_id || ""
    console.log(`${LOG_PREFIX} Client info:`, { orgType, client_id, user_email, user_id })

    // Extract settings
    const imageSize = settings.image_size || settings.imageSize || "auto"
    const safetyTolerance = settings.safety_tolerance || settings.safetyTolerance || "2"
    const outputFormat: "jpeg" | "png" = settings.output_format || settings.outputFormat || "jpeg"
    const seed: number | undefined = settings.seed ? parseInt(settings.seed.toString()) : undefined
    // enable_safety_checker defaults to true; when false, mapFalToBflParams overrides safety_tolerance to 5
    const enableSafetyChecker = settings.enable_safety_checker !== false

    // ── Validation ────────────────────────────────────────────────────────────

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
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

    const safetyToleranceNum = parseInt(String(safetyTolerance), 10)
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

    // ── Resolve reference images ───────────────────────────────────────────────

    const hasUserImage = !!(imageUrl || base64Image)

    let referenceImageFilenames: string[] = []
    let folderName = ""
    let userImagePrompt = ""
    let userImageWithBrandingPrompt = ""
    let styleReinforcement = ""
    let elementIsolation = ""

    if (useBranding) {
      const refResult = await getClientReferenceImages(orgType)
      folderName = refResult.folderName
      userImagePrompt = refResult.userImagePrompt
      userImageWithBrandingPrompt = refResult.userImageWithBrandingPrompt
      styleReinforcement = refResult.styleReinforcement
      elementIsolation = refResult.elementIsolation

      if (hasUserImage) {
        // User image present → 3 random reference images (user image will be @image1)
        const shuffled = [...refResult.filenames].sort(() => Math.random() - 0.5)
        referenceImageFilenames = shuffled.slice(0, 3)
        console.log(`${LOG_PREFIX} User image detected — selected 3 random references:`, referenceImageFilenames)
      } else {
        // No user image → all reference images
        referenceImageFilenames = refResult.filenames
        console.log(`${LOG_PREFIX} No user image — using all ${referenceImageFilenames.length} references`)
      }
    } else {
      console.log(`${LOG_PREFIX} withBranding=false — skipping reference images`)
    }

    // ── Upload reference images to Supabase ───────────────────────────────────

    const allImageUrls: string[] = []
    const tempPaths: string[] = []

    if (useBranding && DISABLE_REFERENCE_IMAGES) {
      console.log(`${LOG_PREFIX} ⚠️  Reference images DISABLED — skipping style reference upload`)
    } else if (useBranding && referenceImageFilenames.length > 0) {
      console.log(`${LOG_PREFIX} Uploading ${referenceImageFilenames.length} reference images to Supabase...`)

      for (let i = 0; i < referenceImageFilenames.length; i++) {
        const filename = referenceImageFilenames[i]
        const fullPath = path.join(process.cwd(), "public", folderName, filename)

        try {
          const { url: refUrl, path: refPath } = await uploadReferenceImage(fullPath, orgType, i)
          allImageUrls.push(refUrl)
          tempPaths.push(refPath)
          console.log(`${LOG_PREFIX} ✅ Reference ${i + 1}/${referenceImageFilenames.length} uploaded: ${refUrl}`)
        } catch (uploadError) {
          console.error(`${LOG_PREFIX} Failed to upload reference image ${i + 1}:`, uploadError)
          return NextResponse.json({
            error: "Failed to upload reference image",
            details: `Reference image ${i + 1} (${filename}): ${uploadError instanceof Error ? uploadError.message : "Unknown error"}`,
          }, { status: 500 })
        }
      }

      console.log(`${LOG_PREFIX} ✅ All ${allImageUrls.length} reference images uploaded`)
    }

    // ── Process user image ────────────────────────────────────────────────────
    // User image is inserted FIRST → becomes input_image / @image1 in the prompt.

    let userImageCount = 0

    if (base64Image) {
      console.log(`${LOG_PREFIX} Uploading user Base64 image to Supabase...`)
      try {
        // Restore disclaimer zone if input image was previously branded
        let processedBase64 = base64Image
        if (removeInputDisclaimer) {
          try {
            let b64Buf: Buffer
            if (base64Image.startsWith('data:')) {
              const m = base64Image.match(/^data:[^;]+;base64,(.+)$/)
              b64Buf = Buffer.from(m ? m[1] : base64Image, 'base64')
            } else {
              b64Buf = Buffer.from(base64Image, 'base64')
            }
            const restored = await restoreDisclaimerZone(b64Buf)
            processedBase64 = `data:image/jpeg;base64,${Buffer.from(restored).toString('base64')}`
            console.log(`${LOG_PREFIX} ✅ Disclaimer zone restored from Base64 image`)
          } catch (restoreError) {
            console.warn(`${LOG_PREFIX} ⚠️  restoreDisclaimerZone failed, using original:`, restoreError)
          }
        }
        // Index 0 so the filename reflects "user image 1"
        const { url: imgUrl, path: imgPath } = await prepareBase64ForBfl(processedBase64, 0)
        allImageUrls.unshift(imgUrl) // User image FIRST → @image1
        tempPaths.push(imgPath)
        userImageCount = 1
        console.log(`${LOG_PREFIX} ✅ User Base64 image uploaded → @image1: ${imgUrl}`)
      } catch (b64Error) {
        console.error(`${LOG_PREFIX} Base64 upload failed:`, b64Error)
        return NextResponse.json({
          error: "Base64 image processing failed",
          details: b64Error instanceof Error ? b64Error.message : "Unknown error",
        }, { status: 400 })
      }
    } else if (imageUrl) {
      try {
        new URL(imageUrl)
      } catch {
        return NextResponse.json({ error: "Invalid image URL format", details: imageUrl }, { status: 400 })
      }

      if (removeInputDisclaimer) {
        try {
          const dlRes = await fetch(imageUrl)
          if (!dlRes.ok) throw new Error(`HTTP ${dlRes.status}`)
          const dlBuffer = Buffer.from(await dlRes.arrayBuffer())
          const restoredBuffer = Buffer.from(await restoreDisclaimerZone(dlBuffer))
          const restoredFileName = `bfl-input/${Date.now()}-${Math.random().toString(36).slice(2)}-user-restored.jpeg`
          const restoredUrl = await uploadImageToSupabase(restoredBuffer, restoredFileName, 'image/jpeg')
          tempPaths.push(restoredFileName)
          allImageUrls.unshift(restoredUrl) // User image FIRST → @image1
          userImageCount = 1
          console.log(`${LOG_PREFIX} ✅ Restored disclaimer zone and re-uploaded URL image → @image1: ${restoredUrl}`)
        } catch (restoreError) {
          console.warn(`${LOG_PREFIX} ⚠️  URL restore failed, using original URL:`, restoreError)
          allImageUrls.unshift(imageUrl)
          userImageCount = 1
        }
      } else {
        allImageUrls.unshift(imageUrl) // User image FIRST → @image1
        userImageCount = 1
        console.log(`${LOG_PREFIX} ✅ User image URL added → @image1`)
      }
    }

    console.log(`${LOG_PREFIX} Total images: ${allImageUrls.length} (${referenceImageFilenames.length} refs + ${userImageCount} user)`)

    // ── Build final prompt ────────────────────────────────────────────────────
    // Rules:
    //   withBranding + hasUserImage  → createWithUserImageAndBranding + user prompt
    //   !withBranding + hasUserImage → createWithUserImage + user prompt
    //   !withBranding + !hasUserImage → only user prompt
    //   withBranding + !hasUserImage  → user prompt + createStyleReinforcement

    let finalPrompt = prompt

    if (useBranding && hasUserImage) {
      finalPrompt = `${userImageWithBrandingPrompt} ${finalPrompt}`
      console.log(`${LOG_PREFIX} withBranding + userImage: using createWithUserImageAndBranding prompt`)
    } else if (!useBranding && hasUserImage) {
      finalPrompt = `${userImagePrompt} ${finalPrompt}`
      console.log(`${LOG_PREFIX} noBranding + userImage: using createWithUserImage prompt`)
    } else if (!useBranding && !hasUserImage) {
      finalPrompt = prompt
      console.log(`${LOG_PREFIX} noBranding + noUserImage: using only user prompt`)
    } else {
      // withBranding + !hasUserImage → user prompt + styleReinforcement
      finalPrompt = styleReinforcement
        ? `${prompt}\n${styleReinforcement}`
        : prompt
      console.log(`${LOG_PREFIX} withBranding + noUserImage: user prompt + createStyleReinforcement`)
    }

    const compositionRuleText = compositionRule
      ? await getCompositionRuleText(orgType, compositionRule)
      : null
    if (compositionRuleText) {
      finalPrompt = `${finalPrompt}\n${compositionRuleText}`
      console.log(`${LOG_PREFIX} Applied composition rule '${compositionRule}'`)
    }

    // Apply element isolation only when reference images are active
    if (useBranding && !DISABLE_REFERENCE_IMAGES && elementIsolation && !hasUserImage) {
      finalPrompt = `${finalPrompt}\n${elementIsolation}`
      console.log(`${LOG_PREFIX} Element isolation appended`)
    } else if (DISABLE_REFERENCE_IMAGES) {
      console.log(`${LOG_PREFIX} Element isolation skipped (DISABLE_REFERENCE_IMAGES=true)`)
    }

    // ── BFL input ─────────────────────────────────────────────────────────────
    // When allImageUrls is empty: BFL performs text-to-image (no input_image sent).
    // When images are present: BFL performs multi-reference editing.

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
    // We download the buffer server-side, then re-upload to Supabase so the
    // client receives a stable, permanent public URL — identical to how FAL
    // returns its CDN URLs.

    let resultUrl: string
    let resultWidth = bflResult.width ?? 1024
    let resultHeight = bflResult.height ?? 1024

    try {
      const resultBuffer = await downloadBflImage(bflResult.imageUrl)
      const metadata = await sharp(resultBuffer).metadata()
      resultWidth = metadata.width ?? resultWidth
      resultHeight = metadata.height ?? resultHeight

      // Apply disclaimer overlay directly to the buffer before uploading to Supabase
      let finalBuffer = resultBuffer
      try {
        finalBuffer = await addDisclaimerToBuffer(resultBuffer)
        console.log(`${LOG_PREFIX} ✅ Disclaimer overlay applied`)
      } catch (disclaimerError) {
        console.warn(`${LOG_PREFIX} ⚠️  Disclaimer failed, uploading original:`, disclaimerError)
      }

      const outputFileName = `bfl-output/${Date.now()}-${Math.random().toString(36).slice(2)}.jpeg`
      resultUrl = await uploadImageToSupabase(finalBuffer, outputFileName, 'image/jpeg')
      console.log(`${LOG_PREFIX} ✅ Result uploaded to Supabase: ${resultWidth}x${resultHeight} → ${resultUrl}`)
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
      referenceImages: referenceImageFilenames.length,
      userImages: userImageCount,
      withBranding: useBranding,
      cost: bflResult.cost,
      settings: {
        image_size: imageSize,
        safety_tolerance: safetyToleranceStr,
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
    name: "BFL FLUX.2 [pro] Edit Create API",
    description: "Create images using FLUX.2 [pro] via Black Forest Labs direct API with org-specific reference images",
    version: "1.0.0",
    endpoint: "/api/external/bfl/flux-2-pro-edit-create",
    method: "POST",
    provider: "Black Forest Labs (bfl)",
    model: BFL_ENDPOINT_FLUX2_PRO,
    notes: [
      "enable_safety_checker: false overrides safety_tolerance to 5 (BFL maximum permissiveness)",
      "enable_safety_checker: true (default) uses the safety_tolerance value as-is",
      "safety_tolerance maps directly (1-5 → 0-5 BFL range, same integer)",
      "Result is returned as a public Supabase URL (stable, no expiry) — same pattern as FAL CDN URLs",
      "Reference images are uploaded to Supabase 'User images' bucket",
      "cost field reflects BFL credits charged per request",
    ],
    parameters: {
      prompt: { type: "string", required: true },
      imageUrl: { type: "string", required: false, description: "User image URL (max 1)" },
      base64Image: { type: "string", required: false, description: "User image as base64 data URL or raw base64 (max 1)" },
      orgType: { type: "string", default: "Tectonica" },
      withBranding: { type: "boolean", default: true },
      compositionRule: { type: "string", required: false },
      settings: {
        image_size: { type: "string|object", options: ["auto", "square_hd", "square", "portrait_4_3", "portrait_16_9", "landscape_4_3", "landscape_16_9", "{width,height}"], default: "auto" },
        safety_tolerance: { type: "number", range: "1-5", default: 2 },
        output_format: { type: "string", options: ["jpeg", "png"], default: "jpeg" },
        seed: { type: "number", required: false },
      },
    },
  })
}
