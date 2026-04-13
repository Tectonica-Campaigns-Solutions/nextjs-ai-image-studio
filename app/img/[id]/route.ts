import { NextRequest, NextResponse } from "next/server";

const IMAGES: Record<string, string> = {
  s1: "abstract.jpg",
  s2: "cartoon.jpg",
  s3: "collage-mixed.jpg",
  s4: "flat-illus.jpg",
  s5: "hand-illus.jpg",
  s6: "mini.jpg",
  s7: "mural.jpg",
  s8: "photo.jpg",
  s9: "political.jpg",
  s10: "retro.jpg",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const filename = IMAGES[id];

  if (!filename) {
    return new NextResponse("Not found", { status: 404 });
  }

  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    request.nextUrl.host;
  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0] ?? request.nextUrl.protocol.replace(":", "");
  return NextResponse.redirect(`${proto}://${host}/style-gallery/${filename}`, 301);
}
