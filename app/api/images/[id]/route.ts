import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"

const SUPABASE_OUTPUT_BUCKET = "User images"
/** Signed URL lifespan in seconds (15 minutes). */
const SIGNED_URL_TTL_SECONDS = 900

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
}
/**
 * GET /api/images/[id]
 *
 * Proxy endpoint for generated images stored in the private "User images" bucket.
 *
 * Flow:
 *   1. Look up `generated_images` table by UUID → get supabase_path
 *   2. Generate a 15-minute signed URL for the private bucket object
 *   3. Redirect (302) the client to the signed URL
 *
 * The signed URL is short-lived but sufficient for display in the browser.
 * Each new request to this proxy generates a fresh signed URL, so the image
 * remains accessible indefinitely as long as the DB record exists.
 *
 * Security:
 *  - No authentication is required here (opaque UUID acts as capability token).
 *  - The UUID is unguessable (gen_random_uuid). Only callers who received
 *    the proxy URL from the API response can access it.
 *  - The underlying Supabase signed URL is never returned to the client
 *    in a form that could be cached long-term (no Cache-Control: max-age).
 */

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid image ID" }, { status: 400, headers: CORS_HEADERS })
  }

  const supabase = createAdminClient()

  const { data: record, error: dbError } = await supabase
    .from("generated_images")
    .select("supabase_path")
    .eq("id", id)
    .single()

  if (dbError) {
    console.error(`[Image Proxy] DB error for id="${id}":`, dbError.message, dbError.code)
    return NextResponse.json({ error: "Image not found", detail: dbError.message }, { status: 404, headers: CORS_HEADERS })
  }
  if (!record) {
    console.error(`[Image Proxy] No record found for id="${id}"`)
    return NextResponse.json({ error: "Image not found" }, { status: 404, headers: CORS_HEADERS })
  }

  const { data: signed, error: signError } = await supabase.storage
    .from(SUPABASE_OUTPUT_BUCKET)
    .createSignedUrl(record.supabase_path, SIGNED_URL_TTL_SECONDS)

  if (signError || !signed) {
    console.error(`[Image Proxy] Failed to create signed URL for "${record.supabase_path}":`, signError?.message)
    return NextResponse.json({ error: "Failed to generate image URL" }, { status: 500, headers: CORS_HEADERS })
  }

  // Stream bytes server-side — avoids CORS issues caused by cross-origin 302 redirects
  const imageRes = await fetch(signed.signedUrl)
  if (!imageRes.ok) {
    console.error(`[Image Proxy] Failed to fetch image from Supabase: ${imageRes.status}`)
    return NextResponse.json({ error: "Failed to retrieve image" }, { status: 502, headers: CORS_HEADERS })
  }

  const contentType = imageRes.headers.get("content-type") ?? "image/jpeg"

  return new Response(imageRes.body, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=300",
    },
  })
}
