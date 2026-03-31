import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "playground_token";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 días

async function computeHmac(secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode("playground-access"));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Comparación timing-safe de dos strings */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function POST(request: NextRequest) {
  const passphrase = process.env.PLAYGROUND_PASSPHRASE;
  const hmacSecret = process.env.PLAYGROUND_HMAC_SECRET;

  if (!passphrase || !hmacSecret) {
    console.error("Playground auth: env vars PLAYGROUND_PASSPHRASE y PLAYGROUND_HMAC_SECRET no configuradas");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  let body: { passphrase?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const submitted = body.passphrase ?? "";

  if (!timingSafeEqual(submitted, passphrase)) {
    return NextResponse.json({ error: "Passphrase incorrecta" }, { status: 401 });
  }

  const token = await computeHmac(hmacSecret);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });

  return response;
}
