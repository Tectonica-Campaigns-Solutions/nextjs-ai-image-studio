import { NextRequest, NextResponse } from "next/server"

const PLAYGROUND_COOKIE = "playground_token"

// ── Shared helpers ────────────────────────────────────────────────────────────

async function computeHmac(secret: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode("playground-access"))
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

// ── Internal playground endpoints ─────────────────────────────────────────────
// Validates the HttpOnly cookie set by /api/playground-auth.
// Returns a 401 NextResponse if invalid, or null if valid.

export async function requirePlaygroundCookie(
  request: NextRequest
): Promise<NextResponse | null> {
  const hmacSecret = process.env.PLAYGROUND_HMAC_SECRET
  if (!hmacSecret) {
    console.error("[api-auth] PLAYGROUND_HMAC_SECRET env var not set")
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 })
  }

  const token = request.cookies.get(PLAYGROUND_COOKIE)?.value ?? ""
  const expected = await computeHmac(hmacSecret)

  if (!timingSafeEqual(token, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  return null
}

// ── External / ChangeAgent endpoints ─────────────────────────────────────────
// Accepts either:
//   - Authorization: Bearer <EXTERNAL_API_KEY>  (ChangeAgent / Open WebUI tools)
//   - playground_token cookie                   (browser playground, same-origin)
// Returns a 401 NextResponse if neither is valid, or null if valid.

export async function requireExternalAuth(
  request: NextRequest
): Promise<NextResponse | null> {
  // 1. Try Bearer token first (ChangeAgent / server-to-server)
  const apiKey = process.env.EXTERNAL_API_KEY
  if (apiKey) {
    const authHeader = request.headers.get("authorization") ?? ""
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : ""
    if (token && timingSafeEqual(token, apiKey)) {
      return null
    }
  }

  // 2. Fall back to playground cookie (browser, same-origin)
  const hmacSecret = process.env.PLAYGROUND_HMAC_SECRET
  if (hmacSecret) {
    const cookieToken = request.cookies.get(PLAYGROUND_COOKIE)?.value ?? ""
    const expected = await computeHmac(hmacSecret)
    if (cookieToken && timingSafeEqual(cookieToken, expected)) {
      return null
    }
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}
