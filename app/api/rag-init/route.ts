import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("[RAG Init] Initializing optimized RAG system...")

    // Dynamic import to avoid issues in Vercel
    const { initializeRAGSystem } = await import("@/lib/rag-system-optimized")
    
    // Initialize the RAG system
    await initializeRAGSystem()

    return NextResponse.json({
      success: true,
      message: "RAG system initialized successfully",
      timestamp: new Date().toISOString(),
      environment: process.env.VERCEL ? "vercel" : process.env.RAILWAY_ENVIRONMENT ? "railway" : "local"
    })

  } catch (error) {
    console.error("[RAG Init] Error initializing RAG system:", error)
    return NextResponse.json({ 
      success: false,
      error: "Failed to initialize RAG system",
      details: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { loadRAGData } = await import("@/lib/rag-system-optimized")
    
    // Load current RAG data status
    const ragData = await loadRAGData()
    
    return NextResponse.json({
      success: true,
      hasData: !!ragData,
      embeddings: ragData ? Object.keys(ragData.embeddings.embeddings).length : 0,
      lastUpdated: ragData?.embeddings?.created_at || null,
      version: ragData?.embeddings?.version || null,
      environment: process.env.VERCEL ? "vercel" : process.env.RAILWAY_ENVIRONMENT ? "railway" : "local"
    })

  } catch (error) {
    console.error("[RAG Status] Error checking RAG status:", error)
    return NextResponse.json({ 
      success: false,
      error: "Failed to check RAG status",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
