import { NextRequest, NextResponse } from "next/server"

// Webhook endpoint for training completion notifications
export async function POST(request: NextRequest) {
  try {
    const webhookData = await request.json()
    
    console.log("[Webhook] Training completion notification:", {
      requestId: webhookData.request_id,
      status: webhookData.status
    })

    // Here you could:
    // 1. Store results in a database
    // 2. Send notifications to users
    // 3. Trigger other processes
    
    // For now, just log the completion
    if (webhookData.status === "COMPLETED") {
      console.log("[Webhook] Training completed successfully for:", webhookData.request_id)
    } else if (webhookData.status === "FAILED") {
      console.log("[Webhook] Training failed for:", webhookData.request_id)
    }

    return NextResponse.json({ received: true })
    
  } catch (error) {
    console.error("[Webhook] Error processing training completion:", error)
    return NextResponse.json({ error: "Failed to process webhook" }, { status: 500 })
  }
}

// Verify webhook authenticity (optional but recommended)
export async function GET() {
  return NextResponse.json({ 
    message: "Training webhook endpoint is active",
    timestamp: new Date().toISOString()
  })
}
