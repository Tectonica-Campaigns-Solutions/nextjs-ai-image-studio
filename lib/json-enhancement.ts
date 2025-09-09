// JSON-based prompt enhancement system
// Works independently or in combination with RAG

interface JSONEnhancementConfig {
  version: string
  kit: string
  description: string
  enums: Record<string, string[]>
  rules: Record<string, Record<string, string[]>>
  defaults: {
    selection: Record<string, string>
    weights: Record<string, number>
    params: Record<string, any>
    loras: any[]
  }
  enforced_negatives: string[]
  assembly: {
    order: string[]
    join: string
  }
}

export interface JSONEnhancementResult {
  enhancedPrompt: string
  originalPrompt: string
  appliedEnhancements: string[]
  negativePrompt: string
  technicalElements: Array<{
    category: string
    elements: string[]
    weight: number
  }>
  suggestedParams: Record<string, any>
  metadata: {
    enhancementMethod: string
    kitUsed: string
    totalEnhancements: number
    processingTime: number
  }
}

let enhancementConfigCache: JSONEnhancementConfig | null = null
let configLastLoaded = 0

// Load enhancement configuration from JSON file
async function loadEnhancementConfig(): Promise<JSONEnhancementConfig | null> {
  try {
    // Cache for 5 minutes
    if (enhancementConfigCache && (Date.now() - configLastLoaded) < 300000) {
      return enhancementConfigCache
    }

    console.log('[JSON Enhancement] Loading config from API...')
    const response = await fetch('/api/enhancement-config')
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`)
    }
    
    const { success, config, error } = await response.json()
    if (!success) {
      console.warn('[JSON Enhancement] API returned error:', error)
    }
    
    enhancementConfigCache = config
    configLastLoaded = Date.now()
    
    console.log(`[JSON Enhancement] Loaded config: ${config.kit || config.name}`)
    return enhancementConfigCache

  } catch (error) {
    console.error('[JSON Enhancement] Error loading config:', error)
    return null
  }
}

// Main function to enhance prompt with JSON rules
export async function enhancePromptWithJSON(
  originalPrompt: string,
  options: {
    useDefaults?: boolean
    customSelection?: Record<string, string>
    intensity?: number // 0.1 to 1.0
  } = {}
): Promise<JSONEnhancementResult> {
  const startTime = Date.now()
  
  try {
    const config = await loadEnhancementConfig()
    
    if (!config) {
      throw new Error('Enhancement configuration not available')
    }

    const {
      useDefaults = true,
      customSelection = {},
      intensity = 1.0
    } = options

    // Determine selection (defaults + custom overrides)
    const selection = useDefaults 
      ? { ...config.defaults.selection, ...customSelection }
      : customSelection

    console.log('[JSON Enhancement] Using selection:', selection)

    // Build enhancement elements based on selection
    const appliedEnhancements: string[] = []
    const technicalElements: Array<{ category: string; elements: string[]; weight: number }> = []

    for (const category of config.assembly.order) {
      const selectedValue = selection[category]
      if (!selectedValue || !config.rules[category]?.[selectedValue]) {
        continue
      }

      const elements = config.rules[category][selectedValue]
      const weight = config.defaults.weights[category] || 1.0
      const adjustedWeight = weight * intensity

      if (elements && elements.length > 0) {
        // Apply weight-based filtering
        const elementsToApply = adjustedWeight >= 0.7 
          ? elements 
          : elements.slice(0, Math.ceil(elements.length * adjustedWeight))

        appliedEnhancements.push(...elementsToApply)
        technicalElements.push({
          category,
          elements: elementsToApply,
          weight: adjustedWeight
        })
      }
    }

    // Build enhanced prompt
    const enhancedPrompt = appliedEnhancements.length > 0
      ? `${originalPrompt}${config.assembly.join}${appliedEnhancements.join(config.assembly.join)}`
      : originalPrompt

    // Build negative prompt
    const negativePrompt = config.enforced_negatives.join(', ')

    // Extract suggested parameters
    const suggestedParams = { ...config.defaults.params }

    const result: JSONEnhancementResult = {
      enhancedPrompt,
      originalPrompt,
      appliedEnhancements,
      negativePrompt,
      technicalElements,
      suggestedParams,
      metadata: {
        enhancementMethod: 'json-rules',
        kitUsed: config.kit,
        totalEnhancements: appliedEnhancements.length,
        processingTime: Date.now() - startTime
      }
    }

    console.log('[JSON Enhancement] Enhanced prompt generated:', enhancedPrompt.substring(0, 100) + '...')
    console.log('[JSON Enhancement] Applied', appliedEnhancements.length, 'enhancements')
    
    return result

  } catch (error) {
    console.error('[JSON Enhancement] Error:', error)
    
    // Fallback enhancement
    return {
      enhancedPrompt: `${originalPrompt}, high quality, professional style`,
      originalPrompt,
      appliedEnhancements: ['high quality', 'professional style'],
      negativePrompt: 'blurry, low quality, amateur',
      technicalElements: [{
        category: 'fallback',
        elements: ['high quality', 'professional style'],
        weight: 0.5
      }],
      suggestedParams: {},
      metadata: {
        enhancementMethod: 'fallback',
        kitUsed: 'fallback',
        totalEnhancements: 2,
        processingTime: Date.now() - startTime
      }
    }
  }
}

// Function to get available enhancement options
export async function getAvailableEnhancementOptions(): Promise<{
  categories: string[]
  options: Record<string, string[]>
  defaults: Record<string, string>
} | null> {
  try {
    const config = await loadEnhancementConfig()
    if (!config) return null

    return {
      categories: config.assembly.order,
      options: config.enums,
      defaults: config.defaults.selection
    }
  } catch (error) {
    console.error('[JSON Enhancement] Error getting options:', error)
    return null
  }
}

// Function to validate custom selection
export async function validateSelection(
  selection: Record<string, string>
): Promise<{ valid: boolean; errors: string[] }> {
  try {
    const config = await loadEnhancementConfig()
    if (!config) {
      return { valid: false, errors: ['Configuration not available'] }
    }

    const errors: string[] = []

    for (const [category, value] of Object.entries(selection)) {
      if (!config.enums[category]) {
        errors.push(`Unknown category: ${category}`)
        continue
      }

      if (!config.enums[category].includes(value)) {
        errors.push(`Invalid value "${value}" for category "${category}". Valid options: ${config.enums[category].join(', ')}`)
      }
    }

    return { valid: errors.length === 0, errors }

  } catch (error) {
    return { valid: false, errors: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`] }
  }
}

// Function to preview enhancement without applying
export async function previewEnhancement(
  selection: Record<string, string>
): Promise<{ preview: string[]; estimatedLength: number } | null> {
  try {
    const config = await loadEnhancementConfig()
    if (!config) return null

    const preview: string[] = []
    
    for (const category of config.assembly.order) {
      const selectedValue = selection[category]
      if (selectedValue && config.rules[category]?.[selectedValue]) {
        preview.push(...config.rules[category][selectedValue])
      }
    }

    return {
      preview,
      estimatedLength: preview.join(config.assembly.join).length
    }

  } catch (error) {
    console.error('[JSON Enhancement] Preview error:', error)
    return null
  }
}
