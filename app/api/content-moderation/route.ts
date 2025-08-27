import { NextRequest, NextResponse } from 'next/server';
import { ContentModerationService } from '@/lib/content-moderation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, imageUrl, orgType = 'general' } = body;

    if (!prompt && !imageUrl) {
      return NextResponse.json(
        { error: 'Either prompt or imageUrl must be provided' },
        { status: 400 }
      );
    }

    // Initialize moderation service with organization type
    const moderationService = new ContentModerationService(orgType);

    // Perform content moderation
    const result = await moderationService.moderateContent({
      prompt,
      imageUrl
    });

    // Log moderation attempts for monitoring
    if (!result.safe) {
      console.log('[MODERATION] Content blocked:', {
        orgType,
        category: result.category,
        reason: result.reason,
        prompt: prompt?.substring(0, 100) + '...', // Log first 100 chars only
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json({
      success: true,
      moderation: result
    });

  } catch (error) {
    console.error('[MODERATION] Error:', error);
    
    // In case of error, default to allowing content but log the issue
    return NextResponse.json({
      success: true,
      moderation: {
        safe: true,
        flagged: false,
        reason: 'Moderation service temporarily unavailable'
      },
      error: 'Moderation service error'
    });
  }
}

// GET endpoint to retrieve current moderation configuration
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgType = searchParams.get('orgType') || 'general';

    const moderationService = new ContentModerationService(orgType);
    const config = moderationService.getConfig();

    // Remove sensitive information before sending to client
    const safeConfig = {
      enabled: config.enabled,
      strictnessLevel: config.strictnessLevel,
      organizationRules: config.organizationRules,
      messages: config.messages,
      openaiModeration: {
        enabled: config.openaiModeration.enabled,
        categories: config.openaiModeration.categories
      }
      // Don't expose the actual blocked terms list for security
    };

    return NextResponse.json({
      success: true,
      config: safeConfig
    });

  } catch (error) {
    console.error('[MODERATION CONFIG] Error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve moderation configuration' },
      { status: 500 }
    );
  }
}
