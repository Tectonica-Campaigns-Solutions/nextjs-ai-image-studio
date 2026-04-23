import { NextRequest, NextResponse } from "next/server";
import { uploadConversationImageToStorage } from "../canvas-sessions/_lib/canvas-session-service";

export const runtime = "nodejs";

function withCors(response: NextResponse) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization",
  );
  return response;
}

async function sendImageToChangeAgentChat(params: {
  chatId: string;
  imageData: string;
  prompt: string;
  model?: string;
}): Promise<{ ok: true } | { ok: false; error: string; status?: number }> {
  const baseUrl =
    process.env.CHANGE_AGENT_BASE_URL ?? "https://tectonica.thechange.ai";

  const token = process.env.CHANGE_AGENT_JWT_TOKEN;

  if (!token) {
    return {
      ok: false,
      error: "Missing ChangeAgent API token. Set CHANGE_AGENT_JWT_TOKEN.",
    };
  }

  const url = new URL("/api/v1/image-studio/send-image", baseUrl);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: params.chatId,
        image_data: params.imageData,
        prompt: params.prompt,
        ...(params.model ? { model: params.model } : {}),
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      // For non-2xx responses this is typically a small JSON/text payload, not an infinite stream.
      const text = await res.text().catch(() => "");
      return {
        ok: false,
        status: res.status,
        error:
          text || `ChangeAgent send-image failed with status ${res.status}`,
      };
    }

    // The endpoint returns a streaming completion; we just need to trigger it.
    res.body?.cancel().catch(() => {});
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;

  try {
    body = await request.json();
  } catch {
    return withCors(
      NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }),
    );
  }

  const { image_base64, ca_user_id, chat_id, prompt, model } = body as Record<
    string,
    unknown
  >;

  if (!image_base64 || typeof image_base64 !== "string") {
    return withCors(
      NextResponse.json({ error: "image_base64 is required" }, { status: 400 }),
    );
  }

  if (!ca_user_id || typeof ca_user_id !== "string" || !ca_user_id.trim()) {
    return withCors(
      NextResponse.json({ error: "ca_user_id is required" }, { status: 400 }),
    );
  }

  if (!chat_id || typeof chat_id !== "string" || !chat_id.trim()) {
    return withCors(
      NextResponse.json({ error: "chat_id is required" }, { status: 400 }),
    );
  }

  const imageUrl = await uploadConversationImageToStorage(
    image_base64,
    ca_user_id.trim(),
  );

  if (!imageUrl) {
    return withCors(
      NextResponse.json(
        { error: "Failed to upload image to storage" },
        { status: 500 },
      ),
    );
  }

  const sendResult = await sendImageToChangeAgentChat({
    chatId: chat_id.trim(),
    imageData: imageUrl,
    prompt:
      typeof prompt === "string" && prompt.trim()
        ? prompt.trim()
        : "Here is the edited image from the Studio",
    model: typeof model === "string" && model.trim() ? model.trim() : undefined,
  });

  if (!sendResult.ok) {
    return withCors(
      NextResponse.json(
        {
          image_url: imageUrl,
          change_agent: sendResult,
        },
        { status: 502 },
      ),
    );
  }

  return withCors(
    NextResponse.json({
      image_url: imageUrl,
      change_agent: { ok: true },
    }),
  );
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 200 }));
}
