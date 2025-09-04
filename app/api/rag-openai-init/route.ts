import { NextRequest, NextResponse } from 'next/server';

// Dynamic import to avoid build-time issues
async function initializeEmbeddings() {
  try {
    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }

    const { generateEGPCategoryEmbeddings } = await import('@/lib/openai-embeddings');
    return await generateEGPCategoryEmbeddings();
  } catch (error) {
    console.error('[RAG Init] Error during dynamic import or initialization:', error);
    throw error;
  }
}

export async function GET() {
  try {
    console.log('[RAG Init] Starting OpenAI embeddings initialization...');
    
    // Generate embeddings for all EGP categories
    const categoryEmbeddings = await initializeEmbeddings();
    
    const categories = Object.keys(categoryEmbeddings);
    const totalDimensions = categories.length > 0 ? categoryEmbeddings[categories[0]]?.length || 0 : 0;
    
    return NextResponse.json({
      success: true,
      message: 'OpenAI embeddings initialized successfully',
      categories: categories,
      totalCategories: categories.length,
      embeddingDimensions: totalDimensions,
      model: 'text-embedding-3-small',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[RAG Init] Error initializing OpenAI embeddings:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to initialize OpenAI embeddings',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST() {
  // Same functionality as GET for flexibility
  return GET();
}
