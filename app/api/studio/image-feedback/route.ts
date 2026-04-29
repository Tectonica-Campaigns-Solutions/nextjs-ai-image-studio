import { NextRequest, NextResponse } from "next/server";
import { reviewImageWithOpenAI, type ReviewGoal } from "@/lib/image-reviewer";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const requestId = `imgfb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const startedAt = Date.now();

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { image_base64, goal, constraints } = body as Record<string, unknown>;

  if (!image_base64 || typeof image_base64 !== "string") {
    return NextResponse.json(
      { error: "image_base64 is required and must be a string" },
      { status: 400 },
    );
  }

  const imageLen = image_base64.length;
  console.log(`[image-feedback ${requestId}] start`, {
    hasOpenAIKey: !!process.env.OPENAI_API_KEY,
    hasChatbotKey: !!process.env.OPENAI_API_KEY_CHATBOT,
    goal: typeof goal === "string" ? goal : undefined,
    constraintsCount: Array.isArray(constraints) ? constraints.length : 0,
    imageChars: imageLen,
    imageIsDataUrl: image_base64.trim().startsWith("data:image/"),
  });

  try {
    const result = await reviewImageWithOpenAI({
      image_base64,
      goal: typeof goal === "string" ? (goal as ReviewGoal) : undefined,
      constraints: Array.isArray(constraints)
        ? (constraints.filter((c) => typeof c === "string") as string[])
        : undefined,
    });

    console.log(`[image-feedback ${requestId}] success`, {
      ms: Date.now() - startedAt,
      issues: Array.isArray((result as any)?.issues)
        ? (result as any).issues.length
        : undefined,
    });

    // Do not expose internal model/tool identifiers to clients.
    return NextResponse.json({
      feedback: result.feedback,
      issues: result.issues,
      edit_plan: {
        prompt: result.edit_plan.prompt,
        settings: result.edit_plan.settings,
        constraints: result.edit_plan.constraints,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    const anyErr = err as any;

    console.error(`[image-feedback ${requestId}] error`, {
      ms: Date.now() - startedAt,
      message,
      name: anyErr?.name,
      status: anyErr?.status ?? anyErr?.response?.status,
      code: anyErr?.code,
      type: anyErr?.type,
      // OpenAI SDK often includes `error` / `body` / `response` details
      error: anyErr?.error,
      body: anyErr?.body,
    });
    if (stack) console.error(`[image-feedback ${requestId}] stack\n${stack}`);

    return NextResponse.json(
      { error: "Image review failed", details: message },
      { status: 500 },
    );
  }
}
