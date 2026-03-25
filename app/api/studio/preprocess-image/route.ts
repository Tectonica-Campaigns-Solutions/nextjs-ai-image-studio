import { NextRequest, NextResponse } from "next/server";
import { removeDisclaimerWithResize } from "@/lib/image-disclaimer";

export const runtime = "nodejs";

function isLikelyUnsafeUrl(input: string): boolean {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return true;
  }

  // Only allow absolute https URLs to reduce SSRF surface.
  if (url.protocol !== "https:") return true;

  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "0.0.0.0" ||
    host === "127.0.0.1" ||
    host === "::1"
  ) {
    return true;
  }

  // Block obvious private-network IPv4 ranges (best-effort; does not DNS-resolve).
  const isIPv4 = /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
  if (isIPv4) {
    const [a, b] = host.split(".").map((n) => Number(n));
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
  }

  return false;
}

export async function GET(request: NextRequest) {
  const imageUrl = request.nextUrl.searchParams.get("imageUrl")?.trim();
  const cropHeight = 80;

  if (!imageUrl) {
    return NextResponse.json(
      { error: "imageUrl is required" },
      { status: 400 },
    );
  }
  if (isLikelyUnsafeUrl(imageUrl)) {
    return NextResponse.json(
      { error: "imageUrl not allowed" },
      { status: 400 },
    );
  }

  let buf: Buffer;
  try {
    const resp = await fetch(imageUrl, { cache: "no-store" });
    if (!resp.ok) {
      return NextResponse.json(
        { error: `Failed to download image (${resp.status})` },
        { status: 400 },
      );
    }
    buf = Buffer.from(await resp.arrayBuffer());
  } catch (err) {
    console.error("preprocess-image: fetch failed", err);
    return NextResponse.json(
      { error: "Failed to download image" },
      { status: 400 },
    );
  }

  try {
    const processed = await removeDisclaimerWithResize(buf, cropHeight);
    const dataUrl = `data:image/jpeg;base64,${processed.toString("base64")}`;

    return NextResponse.json(
      {
        image_url: dataUrl,
        had_disclaimer: true,
        method: "removeDisclaimerWithResize" as const,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=86400, s-maxage=86400",
        },
      },
    );
  } catch (err) {
    console.error("preprocess-image: processing failed", err);
    return NextResponse.json(
      { error: "Failed to preprocess image" },
      { status: 500 },
    );
  }
}
