// Configuration examples for different organization types
// This file shows how to customize content moderation rules for specific organizations

import { ContentModerationConfig } from '../lib/content-moderation-config'

// Example: Environmental NGO Configuration
export const environmentalNGOConfig: Partial<ContentModerationConfig> = {
  strictnessLevel: 'high',
  blockedTerms: {
    explicitContent: ['nude', 'naked', 'sex', 'porn', 'adult content'],
    publicFigures: ['celebrity', 'politician', 'famous person'],
    inappropriateLanguage: ['profanity', 'hate speech', 'offensive language'],
    sensitiveTopics: ['fake news', 'misinformation', 'conspiracy'],
    violentContent: ['violence', 'weapon', 'gun', 'bomb', 'terrorist'],
    misinformation: ['climate denial', 'false environmental claims']
  },
  organizationRules: {
    allowPoliticalContent: false,
    allowCelebrities: false,
    customBlockedTerms: ['anti-environment', 'pollution promotion', 'fossil fuel advocacy']
  },
  messages: {
    explicitContent: "This content contains explicit material that is not appropriate for environmental advocacy.",
    publicFigure: "We cannot generate images of public figures or celebrities.",
    inappropriateLanguage: "This language is not appropriate for our environmental mission.",
    sensitiveTopics: "This content may spread misinformation about environmental issues.",
    violentContent: "Violent content conflicts with our peaceful environmental advocacy.",
    misinformation: "We cannot generate content that may spread environmental misinformation.",
    general: "This content cannot be generated as it may not align with environmental advocacy guidelines."
  }
}

// Example: Political Party Configuration
export const politicalPartyConfig: Partial<ContentModerationConfig> = {
  strictnessLevel: 'high',
  blockedTerms: {
    explicitContent: ['nude', 'naked', 'sex', 'porn', 'adult content'],
    publicFigures: ['opponent candidate', 'rival party leader', 'specific competitor names'],
    inappropriateLanguage: ['hate speech', 'discrimination', 'offensive language'],
    sensitiveTopics: ['fake news', 'misinformation', 'election fraud claims'],
    violentContent: ['violence', 'weapon', 'terrorist', 'threat'],
    misinformation: ['false election claims', 'voting misinformation']
  },
  organizationRules: {
    allowPoliticalContent: true, // But with restrictions
    allowCelebrities: false,
    customBlockedTerms: ['vote manipulation', 'election interference', 'voter suppression']
  },
  messages: {
    explicitContent: "Explicit content violates political campaign guidelines.",
    publicFigure: "We cannot generate images of political opponents or unauthorized public figures.",
    inappropriateLanguage: "This language violates our campaign conduct standards.",
    sensitiveTopics: "This content may spread misinformation about elections or democratic processes.",
    violentContent: "Violent content is not appropriate for political campaigns.",
    misinformation: "We cannot generate content that may spread election misinformation.",
    general: "This content violates political campaign guidelines or contains inappropriate material."
  }
}

// Example: Human Rights NGO Configuration
export const humanRightsNGOConfig: Partial<ContentModerationConfig> = {
  strictnessLevel: 'high',
  blockedTerms: {
    explicitContent: ['nude', 'naked', 'sex', 'porn', 'graphic content'],
    publicFigures: ['unauthorized person', 'victim identification'],
    inappropriateLanguage: ['hate speech', 'discrimination', 'derogatory terms'],
    sensitiveTopics: ['fake news', 'human rights denial', 'historical revisionism'],
    violentContent: ['graphic violence', 'torture imagery', 'excessive brutality'],
    misinformation: ['human rights denial', 'false testimony']
  },
  organizationRules: {
    allowPoliticalContent: true, // Human rights often intersects with politics
    allowCelebrities: false,
    customBlockedTerms: ['victim blaming', 'rights denial', 'oppression advocacy']
  },
  messages: {
    explicitContent: "This content is not appropriate for human rights advocacy materials.",
    publicFigure: "We protect the privacy and dignity of individuals in our content.",
    inappropriateLanguage: "This language conflicts with our human rights principles.",
    sensitiveTopics: "This content may undermine human rights advocacy efforts.",
    violentContent: "While we address violence, graphic imagery is not appropriate for our materials.",
    misinformation: "We cannot generate content that may spread misinformation about human rights.",
    general: "This content conflicts with human rights advocacy principles."
  }
}

// Example: Youth Education NGO Configuration
export const youthEducationNGOConfig: Partial<ContentModerationConfig> = {
  strictnessLevel: 'high',
  blockedTerms: {
    explicitContent: ['nude', 'naked', 'sex', 'porn', 'adult content', 'suggestive'],
    publicFigures: ['celebrity', 'inappropriate role model'],
    inappropriateLanguage: ['profanity', 'bullying language', 'hate speech'],
    sensitiveTopics: ['adult topics', 'inappropriate themes', 'scary content'],
    violentContent: ['violence', 'weapon', 'fighting', 'aggressive behavior'],
    misinformation: ['false educational content', 'misleading information']
  },
  organizationRules: {
    allowPoliticalContent: false, // Keep politics out of youth education
    allowCelebrities: false,
    customBlockedTerms: ['drug', 'alcohol', 'gambling', 'adult themes', 'scary', 'nightmare']
  },
  messages: {
    explicitContent: "This content is not appropriate for educational materials targeting youth.",
    publicFigure: "We focus on educational content rather than celebrity imagery.",
    inappropriateLanguage: "This language is not suitable for young learners.",
    sensitiveTopics: "This topic may not be age-appropriate for our target audience.",
    violentContent: "Violent content is not appropriate for youth educational materials.",
    misinformation: "We ensure all educational content is accurate and appropriate.",
    general: "This content may not be appropriate for educational materials targeting youth."
  }
}

// How to add these configurations to your system:
// 1. Add the configuration to lib/content-moderation-config.ts organizationConfigs object:
//    export const organizationConfigs: Record<string, Partial<ContentModerationConfig>> = {
//      'environmental_ngo': environmentalNGOConfig,
//      'political_party': politicalPartyConfig,
//      'human_rights_ngo': humanRightsNGOConfig,
//      'youth_education_ngo': youthEducationNGOConfig,
//      // ... existing configs
//    }
//
// 2. Use in your frontend by setting the orgType:
//    formData.append("orgType", "environmental_ngo")
//
// 3. Customize the configurations above to match your specific organization's needs
