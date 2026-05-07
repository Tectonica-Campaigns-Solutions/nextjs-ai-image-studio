import { NextRequest, NextResponse } from "next/server"
import { fal } from "@fal-ai/client"
import { ContentModerationService } from "@/lib/content-moderation"
import { getClientApiKey } from "@/lib/api-keys"
import { requireExternalAuth } from "@/lib/api-auth"
import { getClientQuotaStatusByCaUserId } from "@/lib/plans/quota"

const FAL_MODEL = "fal-ai/flux-2"

/**
 * POST /api/external/flux-2-dev
 *
 * External API endpoint for FLUX.2 [dev] text-to-image generation via fal.ai.
 * Lightweight open-source generation that maintains professional quality at high speed.
 *
 * Authentication:
 * - Authorization: Bearer <EXTERNAL_API_KEY>  (ChangeAgent / server-to-server)
 * - playground_token cookie                   (browser playground, same-origin)
 *
 * Body parameters (JSON):
 * - prompt (required): Text description for the generation
 * - orgType (optional): Organization identifier (default: "Tectonica")
 * - settings (optional): Object with generation settings
 *   - image_size: "square_hd" | "square" | "portrait_4_3" | "portrait_16_9" | "landscape_4_3" | "landscape_16_9" | {width, height}
 *                 Default: "landscape_4_3"
 *   - num_inference_steps: 1–50 (default: 28)
 *   - guidance_scale: 1.0–20.0 (default: 2.5)
 *   - num_images: 1–4 (default: 1)
 *   - output_format: "jpeg" | "png" | "webp" (default: "png")
 *   - seed: number (optional, random if not provided)
 *   - enable_safety_checker: boolean (default: true)
 *   - acceleration: "none" | "regular" | "high" (default: "regular")
 *   - enable_prompt_expansion: boolean (default: false)
 * - clientInfo (optional): { client_id, user_email, user_id }
 *
 * Response format:
 * {
 *   "success": true,
 *   "images": [{ "url": "https://...", "width": 1024, "height": 768, "content_type": "image/png" }],
 *   "prompt": "prompt used for generation",
 *   "originalPrompt": "user's original prompt",
 *   "seed": 12345,
 *   "model": "fal-ai/flux-2",
 *   "provider": "fal.ai"
 * }
 */
export async function POST(request: NextRequest) {
  const authError = await requireExternalAuth(request)
  if (authError) return authError

  try {
    console.log("[Flux 2 Dev] Request received")

    const body = await request.json()

    const {
      prompt,
      orgType: rawOrgType,
      settings = {},
      clientInfo = {},
    } = body

    // Normalize orgType
    let orgType = rawOrgType && rawOrgType.trim() ? rawOrgType : "Tectonica"
    if (orgType.toLowerCase() === "general") {
      orgType = "Tectonica"
    }

    // Get client-specific FAL API key
    let falApiKey: string
    try {
      falApiKey = getClientApiKey(orgType)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "API key not configured"
      console.error(`[Flux 2 Dev] ${errorMsg}`)
      return NextResponse.json(
        { error: "API key configuration error", details: errorMsg },
        { status: 500 }
      )
    }

    console.log(`[Flux 2 Dev] API key retrieved for organization: ${orgType}`)

    const client_id = clientInfo.client_id && clientInfo.client_id.trim() ? clientInfo.client_id : "Tectonica"
    const user_email = clientInfo.user_email || ""
    const user_id = clientInfo.user_id || ""

    console.log("[Flux 2 Dev] Client info:", { orgType, client_id, user_email, user_id })

    // ── Quota enforcement ─────────────────────────────────────────────────────
    const caUserId = client_id === "Tectonica" ? "" : client_id
    const quota = await getClientQuotaStatusByCaUserId(caUserId)
    if (quota && !quota.ok && quota.reason === "quota_exceeded") {
      return NextResponse.json(
        {
          success: false,
          error: "Quota exceeded",
          details: `Plan "${quota.planName}" allows ${quota.imagesLimit} images. Used: ${quota.imagesUsed}.`,
          code: "quota_exceeded",
        },
        { status: 402 }
      )
    }

    // ── Validate prompt ───────────────────────────────────────────────────────
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json(
        { error: "Prompt is required", details: "Please provide a text description for the generation" },
        { status: 400 }
      )
    }

    // ── Extract and validate settings ─────────────────────────────────────────
    const imageSize = settings.image_size || settings.imageSize || "landscape_4_3"
    const numInferenceSteps = settings.num_inference_steps ?? settings.numInferenceSteps ?? 28
    const guidanceScale = settings.guidance_scale ?? settings.guidanceScale ?? 2.5
    const numImages = settings.num_images ?? settings.numImages ?? 1
    const outputFormat = settings.output_format || settings.outputFormat || "png"
    const seed = settings.seed != null ? parseInt(settings.seed.toString()) : undefined
    const enableSafetyChecker = settings.enable_safety_checker !== false
    const acceleration = settings.acceleration || "regular"
    const enablePromptExpansion = settings.enable_prompt_expansion === true

    // Validate image_size
    const validImageSizes = [
      "square_hd",
      "square",
      "portrait_4_3",
      "portrait_16_9",
      "landscape_4_3",
      "landscape_16_9",
    ]

    if (typeof imageSize === "string" && !validImageSizes.includes(imageSize)) {
      return NextResponse.json(
        {
          error: "Invalid image_size",
          details: `image_size must be one of: ${validImageSizes.join(", ")}, or an object with width and height`,
        },
        { status: 400 }
      )
    }

    if (typeof imageSize === "object") {
      const { width, height } = imageSize
      if (!width || !height) {
        return NextResponse.json(
          { error: "Custom dimensions required", details: "When image_size is an object, both width and height are required" },
          { status: 400 }
        )
      }
      if (width < 512 || width > 2048 || height < 512 || height > 2048) {
        return NextResponse.json(
          { error: "Invalid custom dimensions", details: "Width and height must be between 512 and 2048 pixels" },
          { status: 400 }
        )
      }
    }

    // Validate num_inference_steps
    const stepsNum = parseInt(numInferenceSteps.toString())
    if (isNaN(stepsNum) || stepsNum < 1 || stepsNum > 50) {
      return NextResponse.json(
        { error: "Invalid num_inference_steps", details: "num_inference_steps must be between 1 and 50" },
        { status: 400 }
      )
    }

    // Validate guidance_scale
    const guidanceNum = parseFloat(guidanceScale.toString())
    if (isNaN(guidanceNum) || guidanceNum < 1 || guidanceNum > 20) {
      return NextResponse.json(
        { error: "Invalid guidance_scale", details: "guidance_scale must be between 1.0 and 20.0" },
        { status: 400 }
      )
    }

    // Validate num_images
    const numImagesNum = parseInt(numImages.toString())
    if (isNaN(numImagesNum) || numImagesNum < 1 || numImagesNum > 4) {
      return NextResponse.json(
        { error: "Invalid num_images", details: "num_images must be between 1 and 4" },
        { status: 400 }
      )
    }

    // Validate output_format
    if (!["jpeg", "png", "webp"].includes(outputFormat)) {
      return NextResponse.json(
        { error: "Invalid output_format", details: "output_format must be 'jpeg', 'png', or 'webp'" },
        { status: 400 }
      )
    }

    // Validate acceleration
    if (!["none", "regular", "high"].includes(acceleration)) {
      return NextResponse.json(
        { error: "Invalid acceleration", details: "acceleration must be 'none', 'regular', or 'high'" },
        { status: 400 }
      )
    }

    console.log("[Flux 2 Dev] Parameters:", {
      prompt: prompt.substring(0, 100) + (prompt.length > 100 ? "..." : ""),
      imageSize,
      numInferenceSteps: stepsNum,
      guidanceScale: guidanceNum,
      numImages: numImagesNum,
      outputFormat,
      seed,
      enableSafetyChecker,
      acceleration,
      enablePromptExpansion,
    })

    // ── Content moderation ────────────────────────────────────────────────────
    try {
      console.log(`[MODERATION] Checking content for Flux 2 Dev prompt: ${prompt.substring(0, 100)}...`)
      const moderationService = new ContentModerationService(orgType)
      const moderationResult = await moderationService.moderateContent({ prompt })

      if (!moderationResult.safe) {
        console.log(`[MODERATION] Content blocked: ${moderationResult.reason}`)
        return NextResponse.json(
          {
            error: moderationResult.reason,
            category: moderationResult.category,
            blocked: true,
            moderation: true,
          },
          { status: 400 }
        )
      }

      console.log("[MODERATION] Content approved")
    } catch (moderationError) {
      console.warn("[MODERATION] Moderation check failed, proceeding with generation:", moderationError)
    }

    // ── Configure FAL client and call model ───────────────────────────────────
    fal.config({ credentials: falApiKey })

    console.log(`[Flux 2 Dev] Submitting generation request to ${FAL_MODEL}...`)

    const falInput: Record<string, unknown> = {
      prompt: prompt.trim(),
      image_size: imageSize,
      num_inference_steps: stepsNum,
      guidance_scale: guidanceNum,
      num_images: numImagesNum,
      output_format: outputFormat,
      enable_safety_checker: enableSafetyChecker,
      acceleration,
      enable_prompt_expansion: enablePromptExpansion,
    }

    if (seed !== undefined && !isNaN(seed)) {
      falInput.seed = seed
    }

    const result = await fal.subscribe(FAL_MODEL, {
      input: falInput,
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          const logs = (update as { logs?: Array<{ message: string }> }).logs
          if (logs) {
            logs.map((log) => log.message).forEach((msg) => console.log(`[Flux 2 Dev] ${msg}`))
          }
        }
      },
    })

    console.log("[Flux 2 Dev] Generation completed")

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = result.data as any

    if (!data?.images || !Array.isArray(data.images) || data.images.length === 0) {
      console.error("[Flux 2 Dev] No images returned from FAL:", data)
      return NextResponse.json(
        { success: false, error: "No images generated", details: "FAL returned an empty response" },
        { status: 500 }
      )
    }

    const images = data.images.map((img: { url: string; width?: number; height?: number; content_type?: string }) => ({
      url: img.url,
      width: img.width,
      height: img.height,
      content_type: img.content_type,
    }))

    console.log(`[Flux 2 Dev] Returning ${images.length} image(s)`)

    return NextResponse.json({
      success: true,
      images,
      prompt: data.prompt || prompt.trim(),
      originalPrompt: prompt.trim(),
      seed: data.seed,
      model: FAL_MODEL,
      provider: "fal.ai",
    })
  } catch (error) {
    console.error("[Flux 2 Dev] Error:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Generation failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

/**
 * OPTIONS /api/external/flux-2-dev
 * CORS preflight support
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  })
}
