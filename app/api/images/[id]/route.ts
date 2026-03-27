import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"

const SUPABASE_OUTPUT_BUCKET = "User images"
/** Signed URL lifespan in seconds (15 minutes). */
const SIGNED_URL_TTL_SECONDS = 900

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
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid image ID" }, { status: 400 })
  }

  const supabase = createAdminClient()

  // 1. Look up the record
  const { data: record, error: dbError } = await supabase
    .from("generated_images")
    .select("supabase_path")
    .eq("id", id)
    .single()

  if (dbError || !record) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 })
  }

  // 2. Generate a short-lived signed URL
  const { data: signed, error: signError } = await supabase.storage
    .from(SUPABASE_OUTPUT_BUCKET)
    .createSignedUrl(record.supabase_path, SIGNED_URL_TTL_SECONDS)

  if (signError || !signed) {
    console.error(`[Image Proxy] Failed to create signed URL for "${record.supabase_path}":`, signError?.message)
    return NextResponse.json({ error: "Failed to generate image URL" }, { status: 500 })
  }

  // 3. Redirect to the signed URL
  return NextResponse.redirect(signed.signedUrl, {
    status: 302,
    headers: {
      // Prevent caching of the redirect itself — each visit should generate a fresh signed URL
      "Cache-Control": "no-store",
    },
  })
}
