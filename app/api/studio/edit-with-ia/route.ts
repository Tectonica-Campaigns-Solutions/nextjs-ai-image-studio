import { NextRequest, NextResponse } from "next/server";

const EXTERNAL_EDIT_ENDPOINT = "/api/external/bfl/flux-2-pro-edit-edit";

export async function POST(request: NextRequest) {
  const apiKey = process.env.EXTERNAL_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        error: "Server misconfiguration",
        details: "EXTERNAL_API_KEY is not set",
      },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid request body",
        details: "Expected JSON",
      },
      { status: 400 },
    );
  }

  const url = new URL(EXTERNAL_EDIT_ENDPOINT, request.nextUrl.origin);

  const upstreamRes = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const text = await upstreamRes.text();

  return new NextResponse(text, {
    status: upstreamRes.status,
    headers: {
      "Content-Type":
        upstreamRes.headers.get("content-type") ??
        "application/json; charset=utf-8",
    },
  });
}
