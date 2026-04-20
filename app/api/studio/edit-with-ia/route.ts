import { NextRequest, NextResponse } from "next/server";
import { getClientQuotaStatusByCaUserId } from "@/lib/plans/quota";

const EXTERNAL_EDIT_ENDPOINT = "/api/external/bfl/flux-2-pro-edit-edit";

function normalizeBaseUrl(input: string): string {
  return input.trim().replace(/\/$/, "");
}

function getInternalBaseUrl(request: NextRequest): string {
  // Prefer loopback HTTP in production to avoid TLS-to-self issues on platforms like Railway.
  const port = process.env.PORT ?? "3000";
  if (process.env.NODE_ENV === "production") {
    return `http://127.0.0.1:${port}`;
  }

  console.log(
    "process.env.RAILWAY_PUBLIC_DOMAIN",
    process.env.RAILWAY_PUBLIC_DOMAIN,
  );
  console.log("process.env.APP_URL", process.env.APP_URL);
  console.log("process.env.NODE_ENV", process.env.NODE_ENV);
  console.log("process.env.PORT", process.env.PORT);
  console.log("request.nextUrl.origin", request.nextUrl.origin);

  const appUrl = process.env.RAILWAY_PUBLIC_DOMAIN
    ? normalizeBaseUrl(process.env.RAILWAY_PUBLIC_DOMAIN)
    : process.env.APP_URL
      ? normalizeBaseUrl(process.env.APP_URL)
      : "";
  return appUrl || request.nextUrl.origin;
}

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

  const url = new URL(EXTERNAL_EDIT_ENDPOINT, getInternalBaseUrl(request));

  // ── Quota enforcement (lifetime) ───────────────────────────────────────────
  const caUserId =
    typeof (body as any)?.clientInfo?.user_id === "string"
      ? String((body as any).clientInfo.user_id)
      : "";
  const quota = await getClientQuotaStatusByCaUserId(caUserId);
  if (quota && !quota.ok && quota.reason === "quota_exceeded") {
    return NextResponse.json(
      {
        success: false,
        error: "Quota exceeded",
        details: `Plan "${quota.planName}" allows ${quota.imagesLimit} images. Used: ${quota.imagesUsed}.`,
        code: "quota_exceeded",
      },
      { status: 402 },
    );
  }

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
