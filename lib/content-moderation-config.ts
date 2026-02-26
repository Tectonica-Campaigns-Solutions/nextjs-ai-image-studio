// Content moderation configuration
export interface ContentModerationConfig {
  enabled: boolean;
  strictnessLevel: 'low' | 'medium' | 'high';
  
  // Blocked terms (configurable)
  blockedTerms: {
    explicitContent: string[];
    publicFigures: string[];
    inappropriateLanguage: string[];
    sensitiveTopics: string[];
    violentContent: string[];
    misinformation: string[];
  };
  
  // Custom organization rules
  organizationRules: {
    allowPoliticalContent: boolean;
    allowCelebrities: boolean;
    customBlockedTerms: string[];
  };
  
  // Messages (configurable)
  messages: {
    explicitContent: string;
    publicFigure: string;
    inappropriateLanguage: string;
    sensitiveTopics: string;
    violentContent: string;
    misinformation: string;
    general: string;
  };
  
  // OpenAI moderation settings
  openaiModeration: {
    enabled: boolean;
    blockOnFlag: boolean;
    categories: {
      hate: boolean;
      harassment: boolean;
      selfHarm: boolean;
      sexual: boolean;
      violence: boolean;
    };
  };
}

// Default configuration
export const defaultModerationConfig: ContentModerationConfig = {
  enabled: false,
  strictnessLevel: 'medium',
  
  blockedTerms: {
    explicitContent: [
      // Basic NSFW terms
      'nude', 'naked', 'porn', 'pornographic', 'sexual', 'erotic', 'nsfw',
      
      // Body parts and exposure
      'breast', 'breasts', 'nipple', 'nipples', 'cleavage', 'topless', 'bare chest',
      'underwear', 'lingerie', 'bikini', 'undressed', 'exposed', 'revealing',
      'bare', 'skin exposed', 'without clothes', 'remove clothes', 'strip',
      
      // Sexual actions and poses
      'seductive', 'sensual', 'provocative', 'suggestive', 'intimate',
      'sexual pose', 'erotic pose', 'adult content', 'mature content',
      
      // Spanish terms
      'desnudo', 'desnuda', 'pornografía', 'erótico', 'sexual', 'pechos', 'senos',
      'ropa interior', 'sin ropa', 'desnudez', 'íntimo', 'sugerente',
      
      // French terms
      'nu', 'érotique', 'pornographique', 'sexuel', 'seins', 'poitrine',
      'sous-vêtements', 'sans vêtements', 'nudité', 'intime', 'suggestif'
    ],
    
    publicFigures: [
      // World leaders
      'trump', 'biden', 'putin', 'xi jinping', 'macron', 'merkel', 'johnson',
      'modi', 'bolsonaro', 'erdogan', 'netanyahu', 'zelensky',
      
      // Tech leaders
      'musk', 'bezos', 'gates', 'zuckerberg', 'cook', 'pichai',
      
      // Historical controversial figures
      'hitler', 'stalin', 'mao', 'mussolini', 'franco', 'pinochet',
      
      // Celebrities (configurable based on use case)
      'kardashian', 'swift', 'bieber', 'gaga', 'beyonce'
    ],
    
    inappropriateLanguage: [
      'hate', 'terrorism', 'terrorist', 'violence', 'kill', 'murder',
      'odio', 'terrorismo', 'violencia', 'matar', 'asesinar',
      'haine', 'terrorisme', 'violence', 'tuer', 'assassiner'
    ],
    
    sensitiveTopics: [
      'election fraud', 'voting manipulation', 'stolen election',
      'fraude electoral', 'manipulación electoral', 'elección robada',
      'fraude électoral', 'manipulation électorale'
    ],
    
    violentContent: [
      'weapon', 'gun', 'bomb', 'explosive', 'attack', 'assault',
      'arma', 'pistola', 'bomba', 'explosivo', 'ataque', 'asalto',
      'arme', 'pistolet', 'bombe', 'explosif', 'attaque', 'agression'
    ],
    
    misinformation: [
      'fake news', 'conspiracy', 'hoax', 'propaganda', 'misinformation',
      'noticias falsas', 'conspiración', 'engaño', 'propaganda', 'desinformación',
      'fausses nouvelles', 'conspiration', 'canular', 'propagande', 'désinformation'
    ]
  },
  
  organizationRules: {
    allowPoliticalContent: true, // Can be overridden per organization
    allowCelebrities: false,
    customBlockedTerms: []
  },
  
  messages: {
    explicitContent: "This content contains explicit material that is not appropriate for organizational use.",
    publicFigure: "We cannot generate images of public figures due to our usage policies.",
    inappropriateLanguage: "This prompt contains inappropriate language that could be problematic.",
    sensitiveTopics: "This content relates to sensitive topics that require careful handling.",
    violentContent: "Content depicting violence is not permitted on this platform.",
    misinformation: "Content that could spread misinformation is not allowed.",
    general: "Your request does not comply with our content guidelines."
  },
  
  openaiModeration: {
    enabled: true,
    blockOnFlag: true,
    categories: {
      hate: true,
      harassment: true,
      selfHarm: true,
      sexual: true,
      violence: true
    }
  }
};

// Organization-specific configurations
export const organizationConfigs: Record<string, Partial<ContentModerationConfig>> = {
  ngo: {
    strictnessLevel: 'high',
    organizationRules: {
      allowPoliticalContent: false,
      allowCelebrities: false,
      customBlockedTerms: ['discrimination', 'prejudice']
    }
  },
  
  politicalParty: {
    strictnessLevel: 'medium',
    organizationRules: {
      allowPoliticalContent: true,
      allowCelebrities: false,
      customBlockedTerms: ['fake news', 'voter fraud']
    }
  },
  
  advocacy: {
    strictnessLevel: 'medium',
    organizationRules: {
      allowPoliticalContent: true,
      allowCelebrities: true,
      customBlockedTerms: []
    }
  }
};

// Helper function to get configuration for an organization
export function getModerationConfig(orgType?: string): ContentModerationConfig {
  const baseConfig = { ...defaultModerationConfig };
  
  if (orgType && organizationConfigs[orgType]) {
    const orgConfig = organizationConfigs[orgType];
    
    // Deep merge configurations
    return {
      ...baseConfig,
      ...orgConfig,
      blockedTerms: {
        ...baseConfig.blockedTerms,
        ...orgConfig.blockedTerms
      },
      organizationRules: {
        ...baseConfig.organizationRules,
        ...orgConfig.organizationRules
      },
      messages: {
        ...baseConfig.messages,
        ...orgConfig.messages
      },
      openaiModeration: {
        ...baseConfig.openaiModeration,
        ...orgConfig.openaiModeration
      }
    };
  }
  
  return baseConfig;
}
