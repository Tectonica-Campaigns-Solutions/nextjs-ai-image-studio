import OpenAI from 'openai';
import { ContentModerationConfig, getModerationConfig } from './content-moderation-config';

export interface ModerationResult {
  safe: boolean;
  flagged: boolean;
  reason?: string;
  category?: string;
  confidence?: number;
  blockedTerms?: string[];
}

export class ContentModerationService {
  private openai: OpenAI | null = null;
  private config: ContentModerationConfig;

  constructor(orgType?: string) {
    this.config = getModerationConfig(orgType);
    
    // Initialize OpenAI if API key is available and moderation is enabled
    if (process.env.OPENAI_API_KEY && this.config.openaiModeration.enabled) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
  }

  /**
   * Main moderation function - checks both text and images
   */
  async moderateContent(content: {
    prompt?: string;
    imageUrl?: string;
  }): Promise<ModerationResult> {
    
    if (!this.config.enabled) {
      return { safe: true, flagged: false };
    }

    // 1. Check prompt if provided
    if (content.prompt) {
      const promptResult = await this.moderatePrompt(content.prompt);
      if (!promptResult.safe) {
        return promptResult;
      }
    }

    // 2. Check image if provided (using GPT-4 Vision)
    if (content.imageUrl && this.openai) {
      const imageResult = await this.moderateImage(content.imageUrl);
      if (!imageResult.safe) {
        return imageResult;
      }
    }

    return { safe: true, flagged: false };
  }

  /**
   * Moderate text prompts using multiple strategies
   */
  async moderatePrompt(prompt: string): Promise<ModerationResult> {
    const normalizedPrompt = prompt.toLowerCase().trim();

    // 1. OpenAI Moderation API (primary)
    if (this.openai && this.config.openaiModeration.enabled) {
      try {
        const moderationResult = await this.openai.moderations.create({
          input: prompt,
        });

        const result = moderationResult.results[0];
        
        if (result.flagged && this.config.openaiModeration.blockOnFlag) {
          const flaggedCategories = Object.entries(result.categories)
            .filter(([_, flagged]) => flagged)
            .map(([category]) => category);

          // Check if flagged category is enabled in config
          const shouldBlock = flaggedCategories.some(category => {
            switch (category) {
              case 'hate': return this.config.openaiModeration.categories.hate;
              case 'harassment': return this.config.openaiModeration.categories.harassment;
              case 'self-harm': return this.config.openaiModeration.categories.selfHarm;
              case 'sexual': return this.config.openaiModeration.categories.sexual;
              case 'violence': return this.config.openaiModeration.categories.violence;
              default: return true;
            }
          });

          if (shouldBlock) {
            return {
              safe: false,
              flagged: true,
              reason: this.config.messages.general,
              category: flaggedCategories[0],
              confidence: Math.max(...Object.values(result.category_scores))
            };
          }
        }
      } catch (error) {
        console.warn('OpenAI moderation failed, continuing with local checks:', error);
      }
    }

    // 2. Local keyword filtering (multi-language)
    const localCheck = this.checkLocalTerms(normalizedPrompt);
    if (!localCheck.safe) {
      return localCheck;
    }

    // 3. Context-aware checks
    const contextCheck = this.checkContext(normalizedPrompt);
    if (!contextCheck.safe) {
      return contextCheck;
    }

    return { safe: true, flagged: false };
  }

  /**
   * Moderate images using GPT-4 Vision
   */
  async moderateImage(imageUrl: string): Promise<ModerationResult> {
    if (!this.openai) {
      return { safe: true, flagged: false };
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this image for inappropriate content. Check for:
                1. Explicit or sexual content
                2. Violence or disturbing imagery
                3. Public figures or celebrities
                4. Hate symbols or inappropriate text
                5. Content that could be used for misinformation

                Respond with JSON: {"safe": boolean, "reason": string, "confidence": number}`
              },
              {
                type: "image_url",
                image_url: { url: imageUrl }
              }
            ]
          }
        ],
        max_tokens: 200
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        try {
          const analysis = JSON.parse(content);
          if (!analysis.safe) {
            return {
              safe: false,
              flagged: true,
              reason: analysis.reason || this.config.messages.general,
              confidence: analysis.confidence || 0.8
            };
          }
        } catch (parseError) {
          console.warn('Failed to parse image moderation response:', parseError);
        }
      }
    } catch (error) {
      console.warn('Image moderation failed:', error);
    }

    return { safe: true, flagged: false };
  }

  /**
   * Check against local blocked terms (multi-language)
   */
  private checkLocalTerms(prompt: string): ModerationResult {
    const allBlockedTerms = [
      ...this.config.blockedTerms.explicitContent,
      ...this.config.blockedTerms.inappropriateLanguage,
      ...this.config.blockedTerms.violentContent,
      ...this.config.blockedTerms.misinformation,
      ...this.config.organizationRules.customBlockedTerms
    ];

    // Add conditional terms based on organization rules
    if (!this.config.organizationRules.allowCelebrities) {
      allBlockedTerms.push(...this.config.blockedTerms.publicFigures);
    }

    if (!this.config.organizationRules.allowPoliticalContent) {
      allBlockedTerms.push(...this.config.blockedTerms.sensitiveTopics);
    }

    const foundTerms = allBlockedTerms.filter(term => 
      prompt.includes(term.toLowerCase())
    );

    if (foundTerms.length > 0) {
      // Determine category and message
      let category = 'general';
      let message = this.config.messages.general;

      if (foundTerms.some(term => this.config.blockedTerms.explicitContent.includes(term))) {
        category = 'explicit';
        message = this.config.messages.explicitContent;
      } else if (foundTerms.some(term => this.config.blockedTerms.publicFigures.includes(term))) {
        category = 'publicFigure';
        message = this.config.messages.publicFigure;
      } else if (foundTerms.some(term => this.config.blockedTerms.violentContent.includes(term))) {
        category = 'violence';
        message = this.config.messages.violentContent;
      } else if (foundTerms.some(term => this.config.blockedTerms.misinformation.includes(term))) {
        category = 'misinformation';
        message = this.config.messages.misinformation;
      }

      return {
        safe: false,
        flagged: true,
        reason: message,
        category,
        blockedTerms: foundTerms
      };
    }

    return { safe: true, flagged: false };
  }

  /**
   * Context-aware content analysis
   */
  private checkContext(prompt: string): ModerationResult {
    // Check for combinations that might be problematic
    const sensitiveContexts = [
      // Political manipulation
      { terms: ['election', 'voting', 'fraud'], category: 'misinformation' },
      { terms: ['fake', 'news', 'media'], category: 'misinformation' },
      
      // Violence + specific targets
      { terms: ['violence', 'attack', 'politician'], category: 'violence' },
      { terms: ['weapon', 'protest', 'crowd'], category: 'violence' },
      
      // Deepfake/manipulation concerns
      { terms: ['deepfake', 'manipulated', 'fake'], category: 'misinformation' },
    ];

    for (const context of sensitiveContexts) {
      const matchCount = context.terms.filter(term => prompt.includes(term)).length;
      
      if (matchCount >= 2) { // At least 2 terms from context
        return {
          safe: false,
          flagged: true,
          reason: this.getMessageForCategory(context.category),
          category: context.category
        };
      }
    }

    return { safe: true, flagged: false };
  }

  private getMessageForCategory(category: string): string {
    switch (category) {
      case 'misinformation': return this.config.messages.misinformation;
      case 'violence': return this.config.messages.violentContent;
      case 'explicit': return this.config.messages.explicitContent;
      case 'publicFigure': return this.config.messages.publicFigure;
      default: return this.config.messages.general;
    }
  }

  /**
   * Update configuration dynamically
   */
  updateConfig(newConfig: Partial<ContentModerationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): ContentModerationConfig {
    return { ...this.config };
  }
}
