/**
 * BFL (Black Forest Labs) API Client
 *
 * Direct integration with the BFL API for FLUX.2 Pro endpoints.
 * Runs alongside the existing FAL client — neither replaces the other.
 *
 * Key differences vs FAL:
 *  - Async pattern: submit task → poll polling_url → download signed result
 *  - Individual image params  : input_image, input_image_2 … input_image_8 (not an array)
 *  - Output dimensions        : explicit width/height integers (multiples of 16, not preset strings)
 *  - safety_tolerance         : integer 0–5 (FAL sends string "1"–"5")
 *  - enable_safety_checker    : not available in BFL — omitted
 *  - Result URL               : signed, expires 10 min, no CORS → must download server-side
 *
 * Required environment variables:
 *  - BFL_API_KEY                      — default / fallback key
 *  - BFL_API_KEY_{ORG}                — per-org key (e.g. BFL_API_KEY_TECTONICA)
 *  - SUPABASE_SERVICE_ROLE_KEY        — needed for Supabase admin uploads
 *  - NEXT_PUBLIC_SUPABASE_URL         — Supabase project URL
 *
 * Required Supabase setup:
 *  - "User images" bucket must exist and be publicly readable
 *    so that BFL can fetch the uploaded input image URLs.
 */

import { createAdminClient } from "@/lib/supabase/server"
import sharp from "sharp"

// ─── Constants ────────────────────────────────────────────────────────────────

export const BFL_API_BASE = "https://api.bfl.ai/v1"

/**
 * Pinned FLUX.2 [pro] endpoint — stable, reproducible across runs.
 * Use this for production workflows that need consistent outputs.
 */
export const BFL_ENDPOINT_FLUX2_PRO = "flux-2-pro"

/**
 * Preview FLUX.2 [pro] endpoint — latest model improvements.
 * Better quality but may change over time.
 */
export const BFL_ENDPOINT_FLUX2_PRO_PREVIEW = "flux-2-pro-preview"

/** Polling intervals */
const INITIAL_POLL_DELAY_MS = 1_000
const POLL_DELAY_INCREMENT_MS = 500
const MAX_POLL_DELAY_MS = 3_000

/**
 * Default generation timeout (ms).
 * 3 minutes — generous enough for BFL (typical: 15–40 s) while still
 * protecting against a permanently-stuck API task.
 * On Railway there is no serverless function time limit, so this can be high.
 * On Vercel the platform cap (60 s default, 300 s Pro) would override this anyway.
 */
const DEFAULT_TIMEOUT_MS = 300_000

/** Supabase bucket for temporary BFL input images (public — BFL must be able to fetch these) */
const SUPABASE_STAGING_BUCKET = "bfl-staging"

/** Supabase bucket for generated output images (private — accessed only via proxy) */
const SUPABASE_OUTPUT_BUCKET = "User images"

// ─── FAL → BFL Image Size Mapping ────────────────────────────────────────────
//
// FAL uses preset strings for image_size; BFL requires explicit width/height
// integers that must be multiples of 16.
//
// "auto" in FAL means "match source image" — achieved in BFL by omitting
// both width and height from the request body.
//
const IMAGE_SIZE_MAP: Record<string, { width: number; height: number } | null> = {
  auto: null, // omit width/height → BFL matches input image dimensions
  square_hd: { width: 1024, height: 1024 },
  square: { width: 512, height: 512 },
  portrait_4_3: { width: 768, height: 1024 },
  portrait_16_9: { width: 576, height: 1024 },
  landscape_4_3: { width: 1024, height: 768 },
  landscape_16_9: { width: 1024, height: 576 },
}

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * FAL-compatible input shape used by the BFL route handlers.
 * image_urls must already be resolved (Supabase public URLs or direct URLs).
 */
export interface BflInput {
  prompt: string
  /** Pre-resolved image URLs. Max 8 for flux-2-pro/flux-2-pro-preview. */
  image_urls: string[]
  /** FAL preset string ("square_hd" etc.), custom { width, height }, or "auto". */
  image_size?: string | { width: number; height: number }
  /** FAL sends string "1"–"5"; we convert to BFL integer 0–5. */
  safety_tolerance?: string | number
  output_format?: "jpeg" | "png"
  seed?: number
  /**
   * FAL safety-checker flag — has no direct BFL equivalent.
   * When false (checker disabled), safety_tolerance is overridden to 5 (BFL maximum permissiveness).
   * When true (default), the user-supplied safety_tolerance value is used as-is.
   */
  enable_safety_checker?: boolean
}

export interface BflResult {
  /** Signed delivery URL from BFL — valid 10 min, no CORS. Download server-side. */
  imageUrl: string
  seed?: number
  width?: number
  height?: number
  /** Credits charged for this request (from submit response). */
  cost?: number
}

// ─── Custom Error ─────────────────────────────────────────────────────────────

export class BflApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly rawResponse: string
  ) {
    super(message)
    this.name = "BflApiError"
  }
}

// ─── Parameter Mapping ────────────────────────────────────────────────────────

/**
 * Converts FAL-style input parameters to the BFL API request body.
 *
 * FAL              → BFL
 * image_urls[0]    → input_image
 * image_urls[1]    → input_image_2
 * image_urls[n]    → input_image_{n+1}   (max 8 total)
 * image_size str   → width + height (px, multiple of 16)
 * safety_tolerance → integer 0–5
 */
export function mapFalToBflParams(input: BflInput): Record<string, unknown> {
  const params: Record<string, unknown> = {
    prompt: input.prompt,
    output_format: input.output_format ?? "jpeg",
  }

  // Map image_urls array → individual input_image params
  if (input.image_urls?.length > 0) {
    params.input_image = input.image_urls[0]
    for (let i = 1; i < Math.min(input.image_urls.length, 8); i++) {
      // BFL naming: input_image_2, input_image_3, ..., input_image_8
      params[`input_image_${i + 1}`] = input.image_urls[i]
    }
  }

  // Map image_size → width / height
  if (input.image_size !== undefined) {
    if (typeof input.image_size === "object") {
      // Custom dimensions — round to multiples of 16 (BFL requirement)
      params.width = roundToMultiple16(input.image_size.width)
      params.height = roundToMultiple16(input.image_size.height)
    } else {
      const mapped = IMAGE_SIZE_MAP[input.image_size]
      if (mapped) {
        params.width = mapped.width
        params.height = mapped.height
      }
      // null (auto) → omit width/height — BFL will match input image dimensions
    }
  }

  // Map safety_tolerance: FAL string "1"–"5" → BFL integer 0–5
  if (input.safety_tolerance !== undefined) {
    const tolerance = parseInt(String(input.safety_tolerance), 10)
    if (!isNaN(tolerance)) {
      params.safety_tolerance = Math.max(0, Math.min(5, tolerance))
    }
  }

  if (input.seed !== undefined) {
    params.seed = input.seed
  }

  // When FAL's enable_safety_checker is explicitly disabled, override safety_tolerance
  // to BFL's maximum permissive value (5). This gives the toggle meaningful behavior.
  if (input.enable_safety_checker === false) {
    params.safety_tolerance = 5
  }

  return params
}

function roundToMultiple16(value: number): number {
  return Math.round(value / 16) * 16
}

// ─── API Communication ────────────────────────────────────────────────────────

/**
 * Submits a generation task to BFL API.
 * Returns immediately with task ID and a polling_url.
 *
 * IMPORTANT: Always use the polling_url from the response when using the global
 * endpoint (api.bfl.ai). Do not construct the polling URL manually.
 */
async function submitTask(
  endpoint: string,
  params: Record<string, unknown>,
  apiKey: string
): Promise<{ id: string; polling_url: string; cost?: number }> {
  const url = `${BFL_API_BASE}/${endpoint}`

  const response = await fetch(url, {
    method: "POST",
    headers: {
      accept: "application/json",
      "x-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    let detail = errorBody
    try {
      const parsed = JSON.parse(errorBody)
      detail = parsed.detail ?? parsed.message ?? errorBody
    } catch {
      // errorBody is plain text
    }
    throw new BflApiError(
      `BFL submit failed (${response.status}): ${detail}`,
      response.status,
      errorBody
    )
  }

  const data = await response.json()
  return { id: data.id, polling_url: data.polling_url, cost: data.cost }
}

/**
 * Polls the BFL polling_url until the task is Ready, Failed, or timed out.
 *
 * Backoff: starts at 1 s, increases 0.5 s per attempt, capped at 3 s.
 * Covers all documented BFL status values: Pending, Processing, Ready, Error,
 * Failed, Request Moderated.
 */
async function pollForResult(
  pollingUrl: string,
  apiKey: string,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<{ sample: string; seed?: number; width?: number; height?: number }> {
  const deadline = Date.now() + timeoutMs
  let attempt = 0

  while (Date.now() < deadline) {
    const delay = Math.min(
      INITIAL_POLL_DELAY_MS + attempt * POLL_DELAY_INCREMENT_MS,
      MAX_POLL_DELAY_MS
    )
    await sleep(delay)
    attempt++

    const response = await fetch(pollingUrl, {
      headers: {
        accept: "application/json",
        "x-key": apiKey,
      },
    })

    if (!response.ok) {
      const errorBody = await response.text()
      throw new BflApiError(
        `BFL poll failed (${response.status})`,
        response.status,
        errorBody
      )
    }

    const data = await response.json()
    const status: string = data.status

    if (status === "Ready") {
      return {
        sample: data.result.sample,
        seed: data.result?.seed,
        width: data.result?.width,
        height: data.result?.height,
      }
    }

    if (status === "Error" || status === "Failed") {
      const errorMsg =
        data.result?.error ?? data.result?.message ?? JSON.stringify(data.result)
      throw new BflApiError(
        `BFL generation ${status.toLowerCase()}: ${errorMsg}`,
        500,
        JSON.stringify(data)
      )
    }

    if (status === "Request Moderated") {
      throw new BflApiError(
        "BFL: Request blocked by content moderation",
        400,
        JSON.stringify(data)
      )
    }

    // Pending | Processing → continue polling
    console.log(`[BFL Client] Poll attempt ${attempt}: status=${status}`)
  }

  throw new BflApiError(
    `BFL generation timed out after ${timeoutMs}ms`,
    504,
    "timeout"
  )
}

// ─── Image Utilities ──────────────────────────────────────────────────────────

/**
 * Downloads a BFL result image from its signed delivery URL.
 *
 * Must be called server-side (BFL delivery endpoints have no CORS headers).
 * The signed URL is valid for 10 minutes — call this within the same request
 * that received the polling result.
 */
export async function downloadBflImage(signedUrl: string): Promise<Buffer> {
  const response = await fetch(signedUrl)
  if (!response.ok) {
    throw new BflApiError(
      `Failed to download BFL result image (${response.status})`,
      response.status,
      ""
    )
  }
  return Buffer.from(await response.arrayBuffer())
}

/**
 * Resizes an image buffer to meet BFL's constraints:
 *  - Recommended max: 4 MP for best results (BFL accepts up to 20 MP but auto-crops)
 *  - Dimensions must be multiples of 16
 *
 * Pre-resizing gives us control over quality and prevents BFL's auto-crop
 * from silently modifying images in unexpected ways.
 */
export async function resizeImageForBfl(
  buffer: Buffer,
  maxMegapixels = 4_000_000,
  maxDimension = 2048
): Promise<Buffer> {
  const metadata = await sharp(buffer).metadata()
  const w = metadata.width ?? 0
  const h = metadata.height ?? 0
  const currentPixels = w * h

  const withinPixelLimit = currentPixels <= maxMegapixels && w <= maxDimension && h <= maxDimension
  const alignedDimensions = w % 16 === 0 && h % 16 === 0

  if (withinPixelLimit && alignedDimensions) {
    return buffer
  }

  if (withinPixelLimit && !alignedDimensions) {
    // Only alignment fix needed — no quality loss from resize
    return sharp(buffer)
      .resize(roundToMultiple16(w), roundToMultiple16(h), {
        fit: "fill",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 92 })
      .toBuffer()
  }

  // Full downscale needed
  const aspectRatio = w / h
  let targetWidth: number
  let targetHeight: number

  if (aspectRatio >= 1) {
    targetWidth = Math.min(maxDimension, Math.floor(Math.sqrt(maxMegapixels * aspectRatio)))
    targetHeight = Math.floor(targetWidth / aspectRatio)
  } else {
    targetHeight = Math.min(maxDimension, Math.floor(Math.sqrt(maxMegapixels / aspectRatio)))
    targetWidth = Math.floor(targetHeight * aspectRatio)
  }

  targetWidth = roundToMultiple16(targetWidth)
  targetHeight = roundToMultiple16(targetHeight)

  console.log(`[BFL Client] Resizing: ${w}x${h} → ${targetWidth}x${targetHeight}`)

  return sharp(buffer)
    .resize(targetWidth, targetHeight, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 90 })
    .toBuffer()
}

// ─── Supabase Input Image Upload ──────────────────────────────────────────────
//
// BFL fetches input images via URL. We upload them to Supabase Storage so that
// BFL can access a stable, publicly-readable URL during inference.
//
// Prerequisites:
//   - SUPABASE_SERVICE_ROLE_KEY must be configured
//   - "User images" bucket must be publicly readable

/**
 * Uploads an image buffer to a Supabase bucket and returns the public URL.
 * Defaults to the staging bucket (public, used for BFL input images).
 * Do NOT use this for output images — use storeOutputImage() instead.
 */
export async function uploadImageToSupabase(
  buffer: Buffer,
  fileName: string,
  mimeType = "image/jpeg",
  bucket = SUPABASE_STAGING_BUCKET
): Promise<string> {
  const supabase = createAdminClient()

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, buffer, {
      contentType: mimeType,
      upsert: true,
    })

  if (error) {
    throw new Error(`Supabase upload failed for "${fileName}": ${error.message}`)
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(data.path)

  return publicUrl
}

/**
 * Prepares a File object for BFL:
 * File → validate → resize (4MP, multiples of 16) → upload to Supabase → public URL
 */
export async function prepareFileForBfl(file: File, index: number): Promise<{ url: string; path: string }> {
  if (!file.type.startsWith("image/")) {
    throw new Error(`File "${file.name}" is not an image`)
  }

  const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB limit before resize
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error(
      `File "${file.name}" exceeds 10MB (${Math.round(file.size / 1024 / 1024)}MB)`
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const resized = await resizeImageForBfl(buffer)
  const fileName = `bfl-input/${Date.now()}-${Math.random().toString(36).slice(2)}-img${index + 1}.jpeg`
  const url = await uploadImageToSupabase(resized, fileName, "image/jpeg")
  return { url, path: fileName }
}

/**
 * Prepares a Base64 string for BFL:
 * base64 (data URL or raw) → decode → validate → resize → upload to Supabase → public URL
 */
export async function prepareBase64ForBfl(
  base64Data: string,
  index: number
): Promise<{ url: string; path: string }> {
  let imageBuffer: Buffer
  let mimeType = "image/jpeg"

  if (base64Data.startsWith("data:")) {
    const matches = base64Data.match(/^data:([^;]+);base64,(.+)$/)
    if (!matches) {
      throw new Error(`Invalid Base64 data URL for image ${index + 1}`)
    }
    mimeType = matches[1] === "image/jpg" ? "image/jpeg" : matches[1]
    imageBuffer = Buffer.from(matches[2], "base64")
  } else {
    imageBuffer = Buffer.from(base64Data, "base64")
  }

  // Validate image integrity before upload
  await sharp(imageBuffer).metadata()

  const resized = await resizeImageForBfl(imageBuffer)
  const ext = mimeType === "image/png" ? "png" : "jpeg"
  const fileName = `bfl-input/${Date.now()}-${Math.random().toString(36).slice(2)}-img${index + 1}.${ext}`
  const uploadMime = ext === "png" ? "image/png" : "image/jpeg"
  const url = await uploadImageToSupabase(resized, fileName, uploadMime)
  return { url, path: fileName }
}

/**
 * Deletes temporary input/reference images from the staging Supabase bucket.
 * Best-effort — errors are logged but never re-thrown.
 * Call fire-and-forget (no await) to avoid delaying the API response.
 */
export async function deleteSupabaseImages(paths: string[]): Promise<void> {
  if (paths.length === 0) return
  const supabase = createAdminClient()
  const { error } = await supabase.storage.from(SUPABASE_STAGING_BUCKET).remove(paths)
  if (error) {
    console.warn(`[BFL Client] Cleanup: failed to delete ${paths.length} file(s): ${error.message}`)
  } else {
    console.log(`[BFL Client] Cleanup: ✅ deleted ${paths.length} temporary file(s)`)
  }
}

/**
 * Stores a generated output image in the private "User images" bucket and
 * records it in the generated_images table for multi-tenant access control.
 *
 * Returns a proxy URL of the form `${APP_URL}/api/images/{uuid}` that
 * the client uses to retrieve the image. The proxy generates a short-lived
 * signed URL on demand so the private bucket is never exposed directly.
 *
 * @param buffer  — image data (already processed, e.g. with disclaimer overlay)
 * @param orgType — organization identifier (maps to clients.ca_user_id)
 * @param format  — output format, defaults to "jpeg"
 * @param cost    — BFL credits consumed for this generation (optional)
 */
export async function storeOutputImage(
  buffer: Buffer,
  orgType: string,
  format: "jpeg" | "png" = "jpeg",
  cost?: number
): Promise<{ proxyUrl: string; path: string }> {
  const supabase = createAdminClient()
  const random = Math.random().toString(36).slice(2)
  const storagePath = `${orgType.toLowerCase()}/bfl-output/${Date.now()}-${random}.${format}`

  const { error: uploadError } = await supabase.storage
    .from(SUPABASE_OUTPUT_BUCKET)
    .upload(storagePath, buffer, {
      contentType: `image/${format}`,
      upsert: false,
    })

  if (uploadError) {
    throw new Error(`Output upload failed for "${storagePath}": ${uploadError.message}`)
  }

  const record_data: Record<string, unknown> = { client_id: orgType, supabase_path: storagePath }
  if (cost !== undefined) record_data.cost = cost

  const { data: record, error: dbError } = await supabase
    .from("generated_images")
    .insert(record_data)
    .select("id")
    .single()

  if (dbError || !record) {
    throw new Error(`DB insert failed for "${storagePath}": ${dbError?.message}`)
  }

  const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "")
  return { proxyUrl: `${appUrl}/api/images/${record.id}`, path: storagePath }
}

/**
 * Converts a URL that references our private "User images" bucket or a proxy
 * URL into a short-lived signed URL that BFL can fetch during inference.
 *
 * Handles:
 *  1. Old Supabase public-format URLs for the "User images" bucket
 *     (no longer accessible now that the bucket is private)
 *  2. Proxy URLs: `${APP_URL}/api/images/{uuid}` — looks up the DB record
 *     and generates a signed URL for the underlying Supabase path
 * Everything else is returned unchanged.
 */
export async function generateSignedUrlForBfl(url: string): Promise<string> {
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "")
  const appUrl = (process.env.APP_URL ?? "").replace(/\/$/, "")
  const SIGNED_URL_TTL_SECONDS = 900 // 15 minutes — covers BFL inference window

  // Case 1: Old Supabase public URL for the private output bucket
  const publicPrefix = `${supabaseUrl}/storage/v1/object/public/User%20images/`
  const publicPrefixDecoded = `${supabaseUrl}/storage/v1/object/public/User images/`
  if (url.startsWith(publicPrefix) || url.startsWith(publicPrefixDecoded)) {
    const storagePath = decodeURIComponent(
      url.startsWith(publicPrefix)
        ? url.slice(publicPrefix.length)
        : url.slice(publicPrefixDecoded.length)
    )
    const supabase = createAdminClient()
    const { data, error } = await supabase.storage
      .from(SUPABASE_OUTPUT_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS)
    if (error || !data) {
      console.warn(`[BFL Client] generateSignedUrlForBfl: signed URL failed for "${storagePath}": ${error?.message}`)
      return url // fall back to original (will likely 403 at BFL, but avoids throwing)
    }
    return data.signedUrl
  }

  // Case 2: Proxy URL — look up generated_images table
  if (appUrl && url.startsWith(`${appUrl}/api/images/`)) {
    const id = url.slice(`${appUrl}/api/images/`.length)
    const supabase = createAdminClient()
    const { data: record } = await supabase
      .from("generated_images")
      .select("supabase_path")
      .eq("id", id)
      .single()
    if (record?.supabase_path) {
      const { data, error } = await supabase.storage
        .from(SUPABASE_OUTPUT_BUCKET)
        .createSignedUrl(record.supabase_path, SIGNED_URL_TTL_SECONDS)
      if (!error && data) return data.signedUrl
    }
  }

  return url // external URL — pass through unchanged
}

// ─── Main Generation Flow ─────────────────────────────────────────────────────

/**
 * Full BFL generation cycle: map params → submit → poll → return.
 *
 * Returns a BflResult with imageUrl being a signed BFL delivery URL.
 * This URL:
 *   - Expires in 10 minutes
 *   - Has no CORS headers (server-side fetch only)
 *   - Must be downloaded before responding to the client
 *
 * Typical caller pattern:
 *   const bflResult = await generateWithBfl(endpoint, input, apiKey)
 *   const imageBuffer = await downloadBflImage(bflResult.imageUrl)
 *   const withDisclaimer = await addDisclaimerToImage(bflResult.imageUrl)  // downloads internally
 */
export async function generateWithBfl(
  endpoint: string,
  input: BflInput,
  apiKey: string,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<BflResult> {
  const params = mapFalToBflParams(input)

  console.log(`[BFL Client] Submitting to /${endpoint}`, {
    prompt: params.prompt?.toString().substring(0, 80) + "…",
    imageCount: input.image_urls?.length ?? 0,
    width: params.width ?? "auto",
    height: params.height ?? "auto",
    safety_tolerance: params.safety_tolerance,
    output_format: params.output_format,
    seed: params.seed ?? "random",
  })

  const { polling_url, cost } = await submitTask(endpoint, params, apiKey)
  console.log(`[BFL Client] Task submitted. Cost: ${cost} credits. Polling…`)

  const result = await pollForResult(polling_url, apiKey, timeoutMs)
  console.log(
    `[BFL Client] Done. Seed: ${result.seed}. URL: ${result.sample?.substring(0, 70)}…`
  )

  return {
    imageUrl: result.sample,
    seed: result.seed,
    width: result.width,
    height: result.height,
    cost,
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
