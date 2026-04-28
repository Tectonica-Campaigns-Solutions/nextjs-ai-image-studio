import OpenAI from "openai"

export type ReviewGoal = "improve_legibility" | "improve_composition" | "brand_polish"

export type EditTool = "seedream-single-edit" | "flux-2-pro-edit"

export type ReviewIssueSeverity = "low" | "medium" | "high"

export interface ReviewIssue {
  id: string
  title: string
  description: string
  severity: ReviewIssueSeverity
  suggestion: string
}

export interface EditPlan {
  tool: EditTool
  prompt: string
  settings?: Record<string, unknown>
  /**
   * Optional JSON-stringified settings suggested by the reviewer.
   * We keep this as a string in the OpenAI json_schema response because strict
   * schemas require nested objects to specify additionalProperties: false.
   */
  settings_json?: string
  constraints?: string[]
}

export interface ImageReviewResult {
  feedback: string
  issues: ReviewIssue[]
  edit_plan: EditPlan
}

function normalizeDataUrl(base64OrDataUrl: string): string {
  const trimmed = base64OrDataUrl.trim()
  if (trimmed.startsWith("data:image/")) return trimmed
  return `data:image/png;base64,${trimmed}`
}

function safeJsonParse<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

function buildReviewerSystemPrompt(): string {
  return [
    "You are a senior graphic design reviewer and art director.",
    "Your job: review the given image and propose a minimal, safe improvement pass (\"cleanup\") that preserves intent and layout.",
    "",
    "Rules:",
    "- Do NOT invent or change the text/copy. Do NOT add logos or new brand assets.",
    "- Preserve layout and composition; propose minimal changes that improve clarity and polish.",
    "- Focus on contrast, hierarchy, spacing, alignment, visual balance, and consistency.",
    "- If the image already looks good, propose extremely small adjustments.",
    "",
    "Return STRICT JSON only, matching the provided schema.",
  ].join("\n")
}

export async function reviewImageWithOpenAI(params: {
  image_base64: string
  goal?: ReviewGoal
  constraints?: string[]
  preferredTool?: EditTool
  model?: string
}): Promise<ImageReviewResult> {
  const requestId = `review-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const startedAt = Date.now()

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured")
  }

  const openai = new OpenAI({ apiKey })
  const model = params.model || process.env.OPENAI_REVIEW_MODEL || "gpt-4o-mini"

  const goal = params.goal ?? "brand_polish"
  const constraints = params.constraints ?? []
  const preferredTool = params.preferredTool ?? "seedream-single-edit"

  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      feedback: { type: "string" },
      issues: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            description: { type: "string" },
            severity: { type: "string", enum: ["low", "medium", "high"] },
            suggestion: { type: "string" },
          },
          required: ["id", "title", "description", "severity", "suggestion"],
        },
      },
      edit_plan: {
        type: "object",
        additionalProperties: false,
        properties: {
          tool: { type: "string", enum: ["seedream-single-edit", "flux-2-pro-edit"] },
          prompt: { type: "string" },
          // OpenAI strict json_schema requires required[] to include every key in properties,
          // so we model optional fields as empty strings.
          settings_json: { type: "string" },
          constraints: { type: "array", items: { type: "string" } },
        },
        required: ["tool", "prompt", "settings_json", "constraints"],
      },
    },
    required: ["feedback", "issues", "edit_plan"],
  } as const

  const dataUrl = normalizeDataUrl(params.image_base64)

  try {
    const res = await openai.chat.completions.create({
      model,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "ImageReviewResult",
          schema,
          strict: true,
        },
      },
      messages: [
        { role: "system", content: buildReviewerSystemPrompt() },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: [
                `Goal: ${goal}`,
                `Preferred tool: ${preferredTool}`,
                constraints.length > 0 ? `Constraints: ${constraints.join(" | ")}` : "Constraints: (none)",
                "",
                "Deliverables:",
                "- feedback: 1 short paragraph (max ~6 lines).",
                "- issues: 3–7 items, highest impact first.",
                "- edit_plan.prompt: a SINGLE prompt intended for an image editing model to apply the improvements with minimal drift.",
                "- edit_plan.tool: choose the best tool for this improvement pass.",
                "- edit_plan.settings_json: JSON string with model settings, or empty string if not needed.",
                "- edit_plan.constraints: array of strings (can be empty).",
              ].join("\n"),
            },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
      max_tokens: 800,
    })

    const content = res.choices[0]?.message?.content ?? ""
    const parsed = safeJsonParse<ImageReviewResult>(content)
    if (!parsed) {
      throw new Error("OpenAI reviewer returned non-JSON response")
    }

    // Parse optional settings_json into settings object.
    if (
      parsed.edit_plan?.settings_json &&
      parsed.edit_plan.settings_json.trim().length > 0 &&
      !parsed.edit_plan.settings
    ) {
      const maybe = safeJsonParse<Record<string, unknown>>(parsed.edit_plan.settings_json)
      if (maybe && typeof maybe === "object") {
        parsed.edit_plan.settings = maybe
      }
    }

    // Basic sanity defaults
    if (!parsed.edit_plan?.tool) parsed.edit_plan.tool = preferredTool
    if (!parsed.edit_plan?.constraints) parsed.edit_plan.constraints = constraints

    console.log(`[image-reviewer ${requestId}] success`, {
      ms: Date.now() - startedAt,
      issues: parsed.issues?.length ?? 0,
      promptChars: parsed.edit_plan?.prompt?.length ?? 0,
    })

    return parsed
  } catch (err) {
    const anyErr = err as any
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[image-reviewer ${requestId}] error`, {
      ms: Date.now() - startedAt,
      message,
      name: anyErr?.name,
      status: anyErr?.status ?? anyErr?.response?.status,
      code: anyErr?.code,
      type: anyErr?.type,
      error: anyErr?.error,
      body: anyErr?.body,
    })
    throw err
  }
}

