/**
 * EGP (European Greens Party) Concept Taxonomy
 * 
 * This file contains the complete visual concept taxonomy specifically designed
 * for EGP branding and messaging guidelines.
 */

import { ConceptTaxonomy } from './types'

export const EGP_CONCEPT_TAXONOMY: ConceptTaxonomy = {
  photography_styles: {
    lifestyle: {
      synonyms: [
        "casual", "natural", "everyday", "relaxed", "authentic", "candid",
        "spontaneous", "real-life", "organic", "unposed", "genuine"
      ],
      visual_cues: [
        "soft natural lighting", "warm color tones", "comfortable poses",
        "environmental context", "genuine expressions", "sustainable materials",
        "eco-friendly settings", "community interaction", "collaborative scenes"
      ],
      weights: {
        color: 0.8,      // High importance for warm, natural colors
        composition: 0.6, // Moderate focus on composition rules
        mood: 0.9,       // Very high importance for positive mood
        lighting: 0.7    // Important for natural, soft lighting
      },
      brand_alignment: 0.95 // Perfect alignment with EGP values
    },
    
    documentary: {
      synonyms: [
        "photojournalistic", "reportage", "authentic", "real", "unfiltered",
        "honest", "objective", "truthful", "raw", "candid"
      ],
      visual_cues: [
        "natural lighting", "unposed subjects", "environmental context",
        "storytelling composition", "authentic moments", "social context",
        "community focus", "real emotions", "diverse representation"
      ],
      weights: {
        color: 0.4,      // Less emphasis on color enhancement
        composition: 0.8, // Strong composition for storytelling
        mood: 0.7,       // Important but not overpowering
        lighting: 0.6    // Natural lighting preference
      },
      brand_alignment: 0.85 // Good alignment with transparency values
    },

    corporate: {
      synonyms: [
        "professional", "business", "polished", "formal", "institutional",
        "official", "structured", "organized", "clean", "minimal"
      ],
      visual_cues: [
        "clean backgrounds", "formal attire", "confident poses",
        "structured lighting", "minimal distractions", "professional settings",
        "clear composition", "authoritative presence"
      ],
      weights: {
        color: 0.6,      // Moderate color enhancement
        composition: 0.9, // Very important for professional look
        mood: 0.5,       // Less emphasis on emotional mood
        lighting: 0.8    // Important for professional appearance
      },
      brand_alignment: 0.6 // Lower alignment - use sparingly
    },

    environmental: {
      synonyms: [
        "nature", "outdoor", "landscape", "ecological", "green", "sustainable",
        "conservation", "wilderness", "eco-friendly", "climate", "biodiversity"
      ],
      visual_cues: [
        "natural settings", "green spaces", "outdoor lighting", "environmental context",
        "sustainable elements", "renewable energy", "conservation themes",
        "climate action", "biodiversity representation", "natural textures"
      ],
      weights: {
        color: 0.9,      // Very high - green colors are crucial
        composition: 0.7, // Important for showing environment
        mood: 0.8,       // Positive environmental message
        lighting: 0.6    // Natural outdoor lighting
      },
      brand_alignment: 1.0 // Perfect alignment with environmental focus
    }
  },

  moods: {
    empowering: {
      visual_cues: [
        "strong confident poses", "direct eye contact", "upward angles",
        "dynamic composition", "bold gestures", "leadership stance",
        "determined expressions", "collective action", "unity symbols"
      ],
      color_associations: [
        "bold greens", "vibrant yellows", "strong contrasts", "energetic tones",
        "confident colors", "leadership palette", "action-oriented hues"
      ],
      composition_preferences: [
        "low angle shots", "central positioning", "strong leading lines",
        "dynamic diagonals", "powerful framing", "assertive spacing"
      ],
      intensity: 0.8
    },

    welcoming: {
      visual_cues: [
        "open gestures", "warm expressions", "inclusive groupings",
        "collaborative poses", "friendly eye contact", "community gathering",
        "diverse representation", "accessible environments", "invitation gestures"
      ],
      color_associations: [
        "warm greens", "soft yellows", "gentle pinks", "earth tones",
        "inclusive palette", "community colors", "approachable hues"
      ],
      composition_preferences: [
        "eye level perspective", "inclusive framing", "circular compositions",
        "balanced spacing", "community-centered", "accessible viewpoints"
      ],
      intensity: 0.7
    },

    hopeful: {
      visual_cues: [
        "upward gazes", "bright expressions", "forward movement",
        "sunrise lighting", "growth symbols", "positive gestures",
        "future-focused poses", "optimistic body language", "progress indicators"
      ],
      color_associations: [
        "bright greens", "golden yellows", "sunrise tones", "fresh colors",
        "growth palette", "optimistic hues", "future-oriented colors"
      ],
      composition_preferences: [
        "upward compositions", "forward movement", "growth patterns",
        "ascending lines", "expansive framing", "horizon-focused"
      ],
      intensity: 0.9
    },

    collaborative: {
      visual_cues: [
        "group interactions", "shared activities", "working together",
        "collective problem-solving", "diverse teams", "partnership gestures",
        "community building", "cooperative poses", "shared focus"
      ],
      color_associations: [
        "harmonious greens", "balanced yellows", "unity colors",
        "collaborative palette", "team-oriented hues", "partnership tones"
      ],
      composition_preferences: [
        "group compositions", "balanced framing", "equal representation",
        "circular arrangements", "connected positioning", "shared space"
      ],
      intensity: 0.8
    }
  },

  compositions: {
    portrait: {
      rules: [
        "focus on subject", "shallow depth of field", "eye-level perspective",
        "authentic expressions", "environmental context when relevant",
        "diverse representation", "accessible framing", "personal connection"
      ],
      optimal_ratios: ["4:3", "3:2", "square", "5:4"],
      framing_preferences: [
        "medium close-up", "environmental portrait", "lifestyle framing",
        "natural crop points", "contextual backgrounds", "authentic settings"
      ],
      subject_positioning: [
        "rule of thirds", "central when impactful", "environmental integration",
        "natural pose flow", "authentic interaction", "accessible positioning"
      ]
    },

    group: {
      rules: [
        "equal representation", "inclusive positioning", "diverse composition",
        "collaborative arrangement", "accessible viewpoints", "community focus",
        "democratic framing", "balanced presence", "collective emphasis"
      ],
      optimal_ratios: ["16:9", "4:3", "21:9", "panoramic"],
      framing_preferences: [
        "wide group shots", "environmental context", "activity-based framing",
        "natural groupings", "collaborative spaces", "inclusive arrangements"
      ],
      subject_positioning: [
        "democratic spacing", "equal prominence", "natural interactions",
        "circular arrangements", "collaborative positioning", "inclusive layout"
      ]
    },

    environmental: {
      rules: [
        "context is key", "wider shots", "environmental storytelling",
        "sustainability focus", "natural integration", "conservation themes",
        "climate awareness", "biodiversity representation", "ecosystem perspective"
      ],
      optimal_ratios: ["16:9", "21:9", "panoramic", "ultra-wide"],
      framing_preferences: [
        "landscape orientation", "environmental context", "conservation focus",
        "natural settings", "sustainable elements", "ecological perspective"
      ],
      subject_positioning: [
        "environmental integration", "conservation context", "natural placement",
        "ecosystem awareness", "sustainability focus", "climate consideration"
      ]
    },

    action: {
      rules: [
        "dynamic movement", "progress indication", "forward momentum",
        "positive action", "community engagement", "collective effort",
        "change representation", "active participation", "democratic process"
      ],
      optimal_ratios: ["16:9", "2:1", "cinematic"],
      framing_preferences: [
        "dynamic angles", "movement capture", "action-oriented framing",
        "progress visualization", "engagement focus", "participatory scenes"
      ],
      subject_positioning: [
        "leading lines", "directional flow", "movement indication",
        "action focus", "engagement center", "participation emphasis"
      ]
    }
  },

  colors: {
    egp_green: {
      hex_values: ["#57B45F", "#4A9D52", "#6BC46E", "#3E8A46"],
      emotional_associations: [
        "sustainability", "growth", "nature", "hope", "renewal", "life",
        "environmental protection", "ecological balance", "green politics"
      ],
      brand_relevance: 1.0,
      usage_context: [
        "primary brand color", "environmental themes", "sustainability focus",
        "party identity", "ecological messaging", "green politics"
      ]
    },

    egp_yellow: {
      hex_values: ["#FFDC2E", "#F2D024", "#FFF176", "#FFE066"],
      emotional_associations: [
        "optimism", "energy", "warmth", "positivity", "enlightenment",
        "creativity", "innovation", "democratic participation", "transparency"
      ],
      brand_relevance: 0.9,
      usage_context: [
        "secondary brand color", "highlighting", "positivity emphasis",
        "democratic themes", "transparency messaging", "innovation focus"
      ]
    },

    egp_pink: {
      hex_values: ["#FF70BD", "#E91E63", "#F48FB1", "#AD1457"],
      emotional_associations: [
        "diversity", "inclusion", "creativity", "progressive values",
        "social justice", "equality", "human rights", "gender equality"
      ],
      brand_relevance: 0.8,
      usage_context: [
        "accent color", "diversity themes", "social justice", "inclusion messaging",
        "creative expression", "progressive values", "human rights focus"
      ]
    },

    natural_earth: {
      hex_values: ["#8D6E63", "#A1887F", "#795548", "#6D4C41"],
      emotional_associations: [
        "grounding", "stability", "natural connection", "authenticity",
        "environmental harmony", "sustainable living", "earth connection"
      ],
      brand_relevance: 0.7,
      usage_context: [
        "neutral backgrounds", "environmental contexts", "natural settings",
        "sustainable themes", "authentic representation", "earth connection"
      ]
    }
  },

  lighting: {
    natural_soft: {
      technical_terms: [
        "soft natural light", "diffused daylight", "window light",
        "overcast lighting", "golden hour", "ambient light", "gentle illumination"
      ],
      mood_impact: [
        "welcoming", "authentic", "comfortable", "genuine", "approachable",
        "sustainable", "eco-friendly", "natural", "organic"
      ],
      time_associations: [
        "daytime", "outdoor activities", "natural environment",
        "sustainable living", "eco-friendly practices", "community gatherings"
      ],
      brand_fit: 0.95
    },

    warm_golden: {
      technical_terms: [
        "golden hour", "warm sunlight", "sunset glow", "sunrise light",
        "warm color temperature", "honey-toned lighting", "optimistic illumination"
      ],
      mood_impact: [
        "hopeful", "optimistic", "energizing", "positive", "inspiring",
        "democratic", "progressive", "forward-looking", "transformative"
      ],
      time_associations: [
        "sunrise", "sunset", "golden hour", "new beginnings",
        "positive change", "transformation", "hope for future"
      ],
      brand_fit: 0.9
    },

    bright_clear: {
      technical_terms: [
        "bright daylight", "clear illumination", "high key lighting",
        "clean light", "transparent lighting", "open illumination"
      ],
      mood_impact: [
        "transparent", "honest", "clear", "democratic", "open",
        "accountable", "truthful", "accessible", "inclusive"
      ],
      time_associations: [
        "mid-day", "clear weather", "transparent processes",
        "democratic participation", "open governance", "public engagement"
      ],
      brand_fit: 0.85
    }
  },

  subjects: {
    people_diverse: {
      categories: [
        "diverse demographics", "inclusive representation", "all ages",
        "various ethnicities", "different abilities", "economic diversity",
        "gender diversity", "cultural variety", "social inclusion"
      ],
      demographic_considerations: [
        "age inclusivity", "ethnic representation", "gender balance",
        "ability diversity", "economic inclusion", "cultural sensitivity",
        "geographical representation", "social diversity", "accessibility"
      ],
      brand_representation: [
        "democratic values", "inclusive politics", "social justice",
        "equal representation", "human rights", "community diversity",
        "progressive values", "accessible democracy", "participatory governance"
      ],
      composition_requirements: [
        "equal prominence", "balanced representation", "inclusive framing",
        "accessible positioning", "democratic spacing", "respectful portrayal"
      ]
    },

    environment_nature: {
      categories: [
        "natural landscapes", "urban green spaces", "renewable energy",
        "sustainable agriculture", "biodiversity", "climate solutions",
        "conservation efforts", "ecological restoration", "green infrastructure"
      ],
      demographic_considerations: [
        "environmental justice", "community access to nature", "sustainable development",
        "climate equity", "green space accessibility", "environmental health"
      ],
      brand_representation: [
        "environmental protection", "climate action", "sustainability leadership",
        "green politics", "ecological responsibility", "future generations",
        "renewable energy transition", "biodiversity conservation", "climate justice"
      ],
      composition_requirements: [
        "environmental context", "sustainability focus", "conservation emphasis",
        "renewable energy integration", "biodiversity representation", "climate awareness"
      ]
    },

    community_action: {
      categories: [
        "community gatherings", "democratic participation", "civic engagement",
        "collective action", "public meetings", "grassroots organizing",
        "volunteer activities", "social movements", "policy advocacy"
      ],
      demographic_considerations: [
        "inclusive participation", "accessible venues", "diverse engagement",
        "community representation", "democratic access", "participatory inclusion"
      ],
      brand_representation: [
        "participatory democracy", "community empowerment", "collective action",
        "civic engagement", "grassroots politics", "democratic participation",
        "social movement", "progressive organizing", "community leadership"
      ],
      composition_requirements: [
        "collective emphasis", "participatory framing", "democratic positioning",
        "community focus", "inclusive arrangement", "collaborative composition"
      ]
    }
  }
}
