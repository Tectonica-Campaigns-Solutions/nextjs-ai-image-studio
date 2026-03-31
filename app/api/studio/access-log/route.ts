import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isDashboardFeatureEnabled } from "@/app/(studio)/dashboard/config/feature-flags";

function detectBrowserFromUserAgent(userAgent: string | null): string | null {
  if (!userAgent) return null;
  const ua = userAgent.toLowerCase();

  if (ua.includes("edg/")) return "Edge";
  if (ua.includes("firefox")) return "Firefox";
  if (ua.includes("chrome") && !ua.includes("edge") && !ua.includes("brave")) {
    return "Chrome";
  }
  if (ua.includes("safari") && !ua.includes("chrome")) return "Safari";

  return "Other";
}

export async function POST(request: NextRequest) {
  // Feature flag: si está apagado, no registramos nada.
  if (!isDashboardFeatureEnabled("visualStudioAccessLogs")) {
    return new NextResponse(null, { status: 204 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { caUserId, sessionId, path } = (body ?? {}) as {
    caUserId?: string | null;
    sessionId?: string | null;
    path?: string | null;
  };

  if (!caUserId || typeof caUserId !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid caUserId" },
      { status: 400 },
    );
  }

  const userAgent = request.headers.get("user-agent");
  const browser = detectBrowserFromUserAgent(userAgent);

  const ipHeader =
    request.headers.get("x-forwarded-for") ??
    request.headers.get("x-real-ip") ??
    null;
  const ipAddress = ipHeader ? ipHeader.split(",")[0]?.trim() ?? null : null;

  const supabase = await createClient();

  const { error } = await supabase.from("client_visual_studio_access_logs").insert({
    ca_user_id: caUserId,
    session_id: sessionId ?? null,
    path: path ?? null,
    user_agent: userAgent ?? null,
    browser,
    ip_address: ipAddress,
  });

  if (error) {
    // No romper el flujo del editor si fallan los logs
    console.error("[POST /api/studio/access-log] insert error", error);
    return new NextResponse(null, { status: 204 });
  }

  return new NextResponse(null, { status: 201 });
}

