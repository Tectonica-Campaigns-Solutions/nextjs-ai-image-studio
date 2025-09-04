import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/external/edit-image
 * 
 * External API endpoint for image editing using FLUX model.
 * This endpoint replicates the functionality of the main app's edit-image
 * feature but without requiring authentication.
 * 
 * Body parameters (multipart/form-data):
 * - image (required): Image file to edit (PNG, JPG, JPEG, WEBP)
 * - prompt (required): Description of desired edits
 * - useRAG (optional): Whether to enhance prompt with branding guidelines (default: true)
 * 
 * The endpoint automatically reads RAG configuration from the main app state.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    
    // Extract and validate required parameters
    const image = formData.get('image') as File
    const prompt = formData.get('prompt') as string
    const useRAG = formData.get('useRAG') === 'true' || formData.get('useRAG') === undefined // default true
    
    // Validate image file
    if (!image || !(image instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing or invalid 'image' file",
          details: "Please provide a valid image file (PNG, JPG, JPEG, WEBP)"
        },
        { status: 400 }
      )
    }
    
    // Validate prompt
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing or invalid 'prompt' parameter",
          details: "Prompt must be a non-empty string describing the desired edits"
        },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpg', 'image/jpeg', 'image/webp']
    if (!allowedTypes.includes(image.type)) {
      return NextResponse.json(
        {
          success: false,
          error: "Unsupported image format",
          details: `Supported formats: PNG, JPG, JPEG, WEBP. Received: ${image.type}`
        },
        { status: 400 }
      )
    }

    // Validate file size (10MB limit)
    const maxSizeBytes = 10 * 1024 * 1024 // 10MB
    if (image.size > maxSizeBytes) {
      return NextResponse.json(
        {
          success: false,
          error: "File too large",
          details: `Maximum file size is 10MB. Received: ${(image.size / 1024 / 1024).toFixed(2)}MB`
        },
        { status: 400 }
      )
    }

    // Apply content moderation to prompt
    const moderationResult = await moderateContent(prompt)
    if (!moderationResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: handleModerationError({ error: moderationResult.reason }),
          moderation: true
        },
        { status: 400 }
      )
    }

    // Prepare form data for internal API call
    const internalFormData = new FormData()
    internalFormData.append("image", image)
    internalFormData.append("prompt", prompt.trim())
    internalFormData.append("useRAG", useRAG.toString())
    
    // Add RAG information (will be dynamic when app state is accessible)
    if (useRAG) {
      // TODO: Read from actual app state
      // const activeRAG = getActiveRAG()
      // if (activeRAG) {
      //   internalFormData.append("activeRAGId", activeRAG.id)
      //   internalFormData.append("activeRAGName", activeRAG.name)
      // }
    }

    // Make internal API call
    const response = await fetch(`${getBaseUrl()}/api/edit-image`, {
      method: "POST",
      body: internalFormData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      
      if (response.status === 400 && errorData?.error) {
        // Use the same moderation error handling as the main app
        const friendlyMessage = handleModerationError(errorData)
        return NextResponse.json(
          {
            success: false,
            error: friendlyMessage,
            moderation: true
          },
          { status: 400 }
        )
      }
      
      return NextResponse.json(
        {
          success: false,
          error: `Edit failed (${response.status})`,
          details: errorData?.error || "Server error"
        },
        { status: response.status }
      )
    }

    const result = await response.json()
    
    // Format response for external API
    const externalResponse = {
      success: true,
      image: result.image,
      originalImage: {
        name: image.name,
        size: image.size,
        type: image.type
      },
      prompt: {
        original: prompt,
        final: result.finalPrompt || result.prompt || prompt,
        enhanced: useRAG
      },
      processing: {
        model: "flux",
        timestamp: new Date().toISOString()
      }
    }

    return NextResponse.json(externalResponse)

  } catch (error) {
    console.error('[External Edit-Image API] Error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}

/**
 * OPTIONS /api/external/edit-image
 * 
 * CORS preflight support
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

// Helper functions

function getBaseUrl(): string {
  // Get the base URL for internal API calls
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}

async function moderateContent(text: string): Promise<{ allowed: boolean; reason?: string }> {
  // Basic content moderation - can be enhanced with external services
  const text_lower = text.toLowerCase()
  
  // Check for explicit content
  const explicitTerms = ['explicit', 'sexual', 'nude', 'naked']
  if (explicitTerms.some(term => text_lower.includes(term))) {
    return { allowed: false, reason: 'explicit content detected' }
  }
  
  // Check for violence
  const violentTerms = ['violence', 'violent', 'weapon', 'kill', 'murder']
  if (violentTerms.some(term => text_lower.includes(term))) {
    return { allowed: false, reason: 'violent content detected' }
  }
  
  // Allow by default
  return { allowed: true }
}

function handleModerationError(errorData: any): string {
  if (!errorData?.error) return "Could not edit image. Please try with different content."
  
  const errorMessage = errorData.error.toLowerCase()
  
  // Check for specific moderation reasons
  if (errorMessage.includes('explicit') || errorMessage.includes('sexual') || errorMessage.includes('nude')) {
    return "This content contains explicit material that is not permitted. Try descriptions like 'professionals in meeting' or 'natural landscape'."
  }
  
  if (errorMessage.includes('violence') || errorMessage.includes('weapon') || errorMessage.includes('violent')) {
    return "This content includes violent elements that are not permitted. Try descriptions like 'peaceful demonstration' or 'community event'."
  }
  
  if (errorMessage.includes('public figure') || errorMessage.includes('celebrity') || errorMessage.includes('politician')) {
    return "We cannot generate images of public figures or celebrities. Describe generic people like 'community leader' or 'organizational spokesperson'."
  }
  
  if (errorMessage.includes('fake news') || errorMessage.includes('misinformation') || errorMessage.includes('false')) {
    return "This content could include misinformation. Make sure to describe accurate and truthful information for your organization."
  }
  
  if (errorMessage.includes('inappropriate language') || errorMessage.includes('offensive')) {
    return "The language used is not appropriate. Rephrase your description in a more professional and constructive manner."
  }
  
  if (errorMessage.includes('blocked by content moderation')) {
    return "This content does not comply with our usage policies. Try descriptions appropriate like 'educational campaign' or 'informational material'."
  }
  
  // Generic moderation message
  return "This content is not permitted according to our policies. Try descriptions appropriate for professional organizational use."
}
