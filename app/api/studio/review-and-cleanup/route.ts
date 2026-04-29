import { NextRequest, NextResponse } from "next/server"
import { ContentModerationService } from "@/lib/content-moderation"
import { reviewImageWithOpenAI, type EditTool, type ReviewGoal } from "@/lib/image-reviewer"

export const runtime = "nodejs"
export const maxDuration = 300

function getInternalAuthHeader(): string | null {
  const key = process.env.EXTERNAL_API_KEY
  if (!key) return null
  return `Bearer ${key}`
}

function normalizeBaseUrl(input: string): string {
  return input.trim().replace(/\/$/, "")
}

function getInternalBaseUrl(request: NextRequest): string {
  const port = process.env.PORT ?? "3000"
  if (process.env.NODE_ENV === "production") {
    return `http://127.0.0.1:${port}`
  }

  const appUrl = process.env.RAILWAY_PUBLIC_DOMAIN
    ? normalizeBaseUrl(process.env.RAILWAY_PUBLIC_DOMAIN)
    : process.env.APP_URL
      ? normalizeBaseUrl(process.env.APP_URL)
      : ""

  return appUrl || request.nextUrl.origin
}

function toStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  const strings = value.filter((v) => typeof v === "string") as string[]
  return strings.length > 0 ? strings : undefined
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const {
    image_base64,
    goal,
    constraints,
    orgType,
    preferredTool,
    reviewModel,
  } = body as Record<string, unknown>

  if (!image_base64 || typeof image_base64 !== "string") {
    return NextResponse.json(
      { error: "image_base64 is required and must be a string" },
      { status: 400 },
    )
  }

  const resolvedOrgType =
    typeof orgType === "string" && orgType.trim() ? orgType.trim() : "general"

  // Phase 1: review → edit_plan
  let reviewResult: Awaited<ReturnType<typeof reviewImageWithOpenAI>>
  try {
    reviewResult = await reviewImageWithOpenAI({
      image_base64,
      goal: typeof goal === "string" ? (goal as ReviewGoal) : undefined,
      constraints: toStringArray(constraints),
      preferredTool:
        typeof preferredTool === "string"
          ? (preferredTool as EditTool)
          : undefined,
      model: typeof reviewModel === "string" ? reviewModel : undefined,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { error: "Review failed", details: message },
      { status: 500 },
    )
  }

  // Phase 1.5: moderate the planned prompt (best-effort; do not block if moderation fails)
  try {
    const moderation = new ContentModerationService(resolvedOrgType)
    const moderationResult = await moderation.moderateContent({
      prompt: reviewResult.edit_plan.prompt,
    })
    if (!moderationResult.safe) {
      return NextResponse.json(
        {
          error: moderationResult.reason || "Content blocked",
          category: moderationResult.category,
          blocked: true,
          feedback: reviewResult.feedback,
          issues: reviewResult.issues,
          edit_plan: reviewResult.edit_plan,
        },
        { status: 400 },
      )
    }
  } catch (err) {
    console.warn("[review-and-cleanup] moderation failed, proceeding:", err)
  }

  // Phase 2: apply edit plan via existing endpoints
  const baseUrl = getInternalBaseUrl(request)
  // Use BFL external endpoint for cleanup to avoid relying on browser-only cookies
  // required by internal endpoints.
  const appliedTool: EditTool = "flux-2-pro-edit"
  const appliedPlan = { ...reviewResult.edit_plan, tool: appliedTool }
  const authHeader = getInternalAuthHeader()

  try {
    const upstream = await fetch(
      new URL("/api/external/bfl/flux-2-pro-edit-edit", baseUrl),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authHeader ? { authorization: authHeader } : {}),
        },
        body: JSON.stringify({
          prompt: appliedPlan.prompt,
          base64Images: [image_base64],
          orgType: resolvedOrgType,
          settings: appliedPlan.settings ?? {},
          // Keep disclaimers on by default (BFL endpoint handles remove/restore/apply),
          // but allow the endpoint to decide per its defaults.
        }),
      },
    )

    const json = await upstream.json().catch(() => null)
    if (!upstream.ok) {
      return NextResponse.json(
        {
          error: "Cleanup failed",
          upstreamStatus: upstream.status,
          upstream: json,
          feedback: reviewResult.feedback,
          issues: reviewResult.issues,
          // Do not leak tool/model identifiers.
          edit_plan: {
            prompt: appliedPlan.prompt,
            settings: appliedPlan.settings,
            constraints: appliedPlan.constraints,
          },
        },
        { status: 502 },
      )
    }

    const improvedImage = json?.images?.[0]?.url ?? null

    return NextResponse.json({
      feedback: reviewResult.feedback,
      issues: reviewResult.issues,
      applied_plan: {
        prompt: appliedPlan.prompt,
        settings: appliedPlan.settings,
        constraints: appliedPlan.constraints,
      },
      image: improvedImage,
      raw: json,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      {
        error: "Cleanup orchestration failed",
        details: message,
        feedback: reviewResult.feedback,
        issues: reviewResult.issues,
        edit_plan: {
          prompt: appliedPlan.prompt,
          settings: appliedPlan.settings,
          constraints: appliedPlan.constraints,
        },
      },
      { status: 500 },
    )
  }
}

