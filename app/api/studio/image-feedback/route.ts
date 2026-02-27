import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const FEEDBACK_PROMPT =
  "You are a professional graphic design expert. Analyze this image and provide concise, actionable suggestions to improve its visual design, composition, typography, color usage, and overall effectiveness. Focus on the most impactful improvements.";

const MOCK_FEEDBACK =
  "[HARDCODED] Consider increasing the contrast between text and background for better readability. The composition could benefit from applying the rule of thirds. Try using a more limited color palette (2–3 accent colors) to create visual harmony.";

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { image_base64 } = body as Record<string, unknown>;

  if (!image_base64 || typeof image_base64 !== "string") {
    return NextResponse.json(
      { error: "image_base64 is required and must be a string" },
      { status: 400 },
    );
  }

  try {
    // TODO: Replace with real AI vision service URL when available
    const response = await fetch("https://api.example.com/vision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: FEEDBACK_PROMPT,
        image: image_base64,
      }),
    });

    if (!response.ok) {
      throw new Error(`External service responded with ${response.status}`);
    }

    const data = await response.json();
    const feedback =
      data.feedback ?? data.text ?? data.content ?? MOCK_FEEDBACK;

    return NextResponse.json({ feedback });
  } catch {
    // External service is not yet available — return mock feedback
    return NextResponse.json({ feedback: MOCK_FEEDBACK });
  }
}
