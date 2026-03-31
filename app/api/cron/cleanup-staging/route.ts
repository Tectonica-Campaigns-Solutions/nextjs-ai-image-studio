import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const maxDuration = 300

const LOG_PREFIX = "[CRON cleanup-staging]"
const STAGING_BUCKET = "bfl-staging"
const STAGING_PREFIX = "bfl-input"
const MAX_AGE_HOURS = 6
const LIST_PAGE_SIZE = 100

/**
 * GET /api/cron/cleanup-staging
 *
 * Deletes files in bfl-staging/bfl-input/ older than MAX_AGE_HOURS.
 * Intended to be called by a Railway Cron Job every 6 hours.
 *
 * Authentication: Authorization: Bearer <CRON_SECRET>
 *
 * Railway Cron Job settings:
 *   Schedule : 0 *\/6 * * *
 *   URL      : https://<your-railway-url>/api/cron/cleanup-staging
 *   Headers  : Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error(`${LOG_PREFIX} CRON_SECRET env var is not set`)
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 })
  }

  const authHeader = request.headers.get("authorization") ?? ""
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : ""

  if (token !== cronSecret) {
    console.warn(`${LOG_PREFIX} Unauthorized request`)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // ── List & delete ────────────────────────────────────────────────────────────
  const supabase = createAdminClient()
  const cutoff = new Date(Date.now() - MAX_AGE_HOURS * 60 * 60 * 1000)

  console.log(`${LOG_PREFIX} Starting cleanup. Cutoff: ${cutoff.toISOString()}`)

  const toDelete: string[] = []
  let offset = 0

  // Paginate through all files in bfl-input/
  while (true) {
    const { data, error } = await supabase.storage
      .from(STAGING_BUCKET)
      .list(STAGING_PREFIX, { limit: LIST_PAGE_SIZE, offset })

    if (error) {
      console.error(`${LOG_PREFIX} List error at offset ${offset}:`, error.message)
      return NextResponse.json({ error: `Storage list failed: ${error.message}` }, { status: 500 })
    }

    if (!data || data.length === 0) break

    for (const file of data) {
      const createdAt = file.created_at ? new Date(file.created_at) : null
      if (createdAt && createdAt < cutoff) {
        toDelete.push(`${STAGING_PREFIX}/${file.name}`)
      }
    }

    if (data.length < LIST_PAGE_SIZE) break // last page
    offset += LIST_PAGE_SIZE
  }

  console.log(`${LOG_PREFIX} Found ${toDelete.length} file(s) to delete`)

  if (toDelete.length === 0) {
    return NextResponse.json({ success: true, deleted: 0, message: "Nothing to delete" })
  }

  // Delete in batches of 100 (Supabase limit per remove() call)
  const BATCH_SIZE = 100
  let totalDeleted = 0
  const errors: string[] = []

  for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
    const batch = toDelete.slice(i, i + BATCH_SIZE)
    const { error } = await supabase.storage.from(STAGING_BUCKET).remove(batch)
    if (error) {
      console.error(`${LOG_PREFIX} Delete batch error:`, error.message)
      errors.push(error.message)
    } else {
      totalDeleted += batch.length
    }
  }

  console.log(`${LOG_PREFIX} ✅ Deleted ${totalDeleted} file(s). Errors: ${errors.length}`)

  return NextResponse.json({
    success: errors.length === 0,
    deleted: totalDeleted,
    errors: errors.length > 0 ? errors : undefined,
    cutoff: cutoff.toISOString(),
  })
}
