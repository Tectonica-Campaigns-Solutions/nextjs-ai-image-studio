import { NextRequest, NextResponse } from "next/server";

// Only allow alphanumeric and hyphens to prevent path traversal
const SAFE_ID = /^[a-z0-9-]+$/i;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!SAFE_ID.test(id)) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new Response(null, {
    status: 301,
    headers: { Location: `/style-gallery/${id}.jpg` },
  });
}
