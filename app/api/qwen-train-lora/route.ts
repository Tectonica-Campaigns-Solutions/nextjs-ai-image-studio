import { NextRequest, NextResponse } from "next/server"
import { fal } from "@fal-ai/client"

// Configure Fal client
fal.config({
  credentials: process.env.FAL_API_KEY!,
})

interface TrainingRequest {
  image_data_url: string
  steps?: number
  learning_rate?: number
  trigger_phrase?: string
}

interface TrainingResponse {
  request_id: string
  status?: string
  message?: string
}

interface TrainingResult {
  lora_file: {
    url: string
    content_type: string
    file_name: string
    file_size: number
  }
  config_file: {
    url: string
    content_type: string
    file_name: string
    file_size: number
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("[API] Starting Qwen LoRA training request")

    const formData = await request.formData()
    const imageDataUrl = formData.get("image_data_url") as string
    const steps = formData.get("steps") ? parseInt(formData.get("steps") as string) : 1000
    const learningRate = formData.get("learning_rate") ? parseFloat(formData.get("learning_rate") as string) : 0.0005
    const triggerPhrase = formData.get("trigger_phrase") as string || ""

    // Validate required fields
    if (!imageDataUrl) {
      return NextResponse.json(
        { error: "Missing required field: image_data_url" },
        { status: 400 }
      )
    }

    // Validate steps range
    if (steps < 100 || steps > 10000) {
      return NextResponse.json(
        { error: "Steps must be between 100 and 10000" },
        { status: 400 }
      )
    }

    // Validate learning rate range
    if (learningRate < 0.00001 || learningRate > 0.01) {
      return NextResponse.json(
        { error: "Learning rate must be between 0.00001 and 0.01" },
        { status: 400 }
      )
    }

    console.log("[API] Training parameters:", {
      imageDataUrl: imageDataUrl.substring(0, 50) + "...",
      steps,
      learningRate,
      triggerPhrase
    })

    // Prepare training input
    const trainingInput: TrainingRequest = {
      image_data_url: imageDataUrl,
      steps,
      learning_rate: learningRate
    }

    // Add trigger phrase if provided
    if (triggerPhrase.trim()) {
      trainingInput.trigger_phrase = triggerPhrase.trim()
    }

    // Submit training job to queue (CRITICAL: Use queue for Vercel)
    const { request_id } = await fal.queue.submit("fal-ai/qwen-image-trainer", {
      input: trainingInput,
      // Add webhook URL for Vercel compatibility
      webhookUrl: process.env.VERCEL_URL ? 
        `https://${process.env.VERCEL_URL}/api/webhooks/training-complete` : 
        undefined
    })

    console.log("[API] Training job submitted with ID:", request_id)

    return NextResponse.json({
      success: true,
      request_id,
      status: "submitted",
      message: "Training job submitted successfully. Use the request_id to check status.",
      warning: "Training may take 30-60 minutes. Check status periodically.",
      trainingParams: {
        steps,
        learning_rate: learningRate,
        trigger_phrase: triggerPhrase || "No trigger phrase provided"
      }
    })

  } catch (error) {
    console.error("[API] Error submitting training job:", error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { 
          error: error.message,
          details: "Failed to submit LoRA training job"
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: "Unknown error occurred during training submission" },
      { status: 500 }
    )
  }
}

// GET endpoint to check training status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const requestId = searchParams.get("request_id")

    if (!requestId) {
      return NextResponse.json(
        { error: "Missing request_id parameter" },
        { status: 400 }
      )
    }

    console.log("[API] Checking training status for:", requestId)

    // Check training status
    const status = await fal.queue.status("fal-ai/qwen-image-trainer", {
      requestId,
      logs: true,
    })

    console.log("[API] Training status:", status.status)

    // If completed, get the result
    if (status.status === "COMPLETED") {
      try {
        const result = await fal.queue.result("fal-ai/qwen-image-trainer", {
          requestId,
        })

        const trainingResult = result.data as TrainingResult

        return NextResponse.json({
          success: true,
          status: "completed",
          request_id: requestId,
          result: {
            lora_file: trainingResult.lora_file,
            config_file: trainingResult.config_file
          },
          logs: (status as any).logs || []
        })
      } catch (resultError) {
        console.error("[API] Error fetching training result:", resultError)
        return NextResponse.json({
          success: false,
          status: "completed_with_error",
          request_id: requestId,
          error: "Failed to fetch training result",
          logs: (status as any).logs || []
        })
      }
    }

    // Return current status
    return NextResponse.json({
      success: true,
      status: status.status.toLowerCase(),
      request_id: requestId,
      position_in_queue: (status as any).queue_position || 0,
      logs: (status as any).logs || [],
      estimated_time: (status as any).response_time || null
    })

  } catch (error) {
    console.error("[API] Error checking training status:", error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { 
          error: error.message,
          details: "Failed to check training status"
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: "Unknown error occurred while checking status" },
      { status: 500 }
    )
  }
}
