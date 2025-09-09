// JSON-based prompt enhancement system
// Simplified version with single text field enhancement

interface JSONEnhancementConfig {
  version: string
  kit: string
  description: string
  enhancement_text: string
  defaults: {
    intensity: number
    join_string: string
    params: Record<string, any>
  }
  enforced_negatives: string[]
}

export interface JSONEnhancementOptions {
  useDefaults?: boolean
  customText?: string // Allow custom override of enhancement text
  intensity?: number // 0.0 to 1.0
}

export interface JSONEnhancementResult {
  enhancedPrompt: string
  originalPrompt: string
  appliedText: string
  negativePrompt: string
  suggestedParams: Record<string, any>
  metadata: {
    enhancementMethod: string
    kitUsed: string
    intensity: number
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
  options: JSONEnhancementOptions = {}
): Promise<JSONEnhancementResult> {
  const startTime = Date.now()
  
  try {
    const config = await loadEnhancementConfig()
    
    if (!config) {
      throw new Error('Enhancement configuration not available')
    }

    const {
      useDefaults = true,
      customText,
      intensity = 1.0
    } = options

    // Determine enhancement text to use
    const enhancementText = customText || config.enhancement_text
    
    // Apply intensity - if less than 1.0, truncate the enhancement text
    let appliedText = enhancementText
    if (intensity < 1.0 && intensity > 0) {
      const sentences = enhancementText.split('. ')
      const sentencesToUse = Math.max(1, Math.ceil(sentences.length * intensity))
      appliedText = sentences.slice(0, sentencesToUse).join('. ')
      if (sentencesToUse < sentences.length) {
        appliedText += '.'
      }
    } else if (intensity === 0) {
      appliedText = ''
    }

    console.log('[JSON Enhancement] Enhancement text length:', appliedText.length)
    console.log('[JSON Enhancement] Applied intensity:', intensity)

    // Build enhanced prompt
    const enhancedPrompt = appliedText 
      ? `${originalPrompt}${config.defaults.join_string}${appliedText}`
      : originalPrompt

    // Build negative prompt
    const negativePrompt = config.enforced_negatives.join(', ')

    // Extract suggested parameters
    const suggestedParams = { ...config.defaults.params }

    const result: JSONEnhancementResult = {
      enhancedPrompt,
      originalPrompt,
      appliedText,
      negativePrompt,
      suggestedParams,
      metadata: {
        enhancementMethod: 'simple-text',
        kitUsed: config.kit,
        intensity,
        processingTime: Date.now() - startTime
      }
    }

    console.log('[JSON Enhancement] Enhanced prompt generated:', enhancedPrompt.substring(0, 100) + '...')
    console.log('[JSON Enhancement] Applied text:', appliedText.substring(0, 100) + '...')
    
    return result

  } catch (error) {
    console.error('[JSON Enhancement] Error:', error)
    
    // Fallback enhancement
    const fallbackText = 'high quality, professional style'
    return {
      enhancedPrompt: `${originalPrompt}, ${fallbackText}`,
      originalPrompt,
      appliedText: fallbackText,
      negativePrompt: 'blurry, low quality, amateur',
      suggestedParams: {},
      metadata: {
        enhancementMethod: 'fallback',
        kitUsed: 'fallback',
        intensity: 1.0,
        processingTime: Date.now() - startTime
      }
    }
  }
}

// Function to get current enhancement text for editing
export async function getEnhancementText(): Promise<string | null> {
  try {
    const config = await loadEnhancementConfig()
    return config?.enhancement_text || null
  } catch (error) {
    console.error('[JSON Enhancement] Error getting enhancement text:', error)
    return null
  }
}

// Function to update enhancement text (this would need API support)
export async function updateEnhancementText(newText: string): Promise<boolean> {
  try {
    // For now, just update the cache
    if (enhancementConfigCache) {
      enhancementConfigCache.enhancement_text = newText
      console.log('[JSON Enhancement] Updated enhancement text in cache')
      return true
    }
    return false
  } catch (error) {
    console.error('[JSON Enhancement] Error updating enhancement text:', error)
    return false
  }
}

// Function to preview enhancement
export async function previewEnhancement(
  originalPrompt: string,
  customText?: string,
  intensity: number = 1.0
): Promise<{ preview: string; appliedText: string } | null> {
  try {
    const config = await loadEnhancementConfig()
    if (!config) return null

    const enhancementText = customText || config.enhancement_text
    
    // Apply intensity
    let appliedText = enhancementText
    if (intensity < 1.0 && intensity > 0) {
      const sentences = enhancementText.split('. ')
      const sentencesToUse = Math.max(1, Math.ceil(sentences.length * intensity))
      appliedText = sentences.slice(0, sentencesToUse).join('. ')
      if (sentencesToUse < sentences.length) {
        appliedText += '.'
      }
    } else if (intensity === 0) {
      appliedText = ''
    }

    const preview = appliedText 
      ? `${originalPrompt}${config.defaults.join_string}${appliedText}`
      : originalPrompt

    return { preview, appliedText }

  } catch (error) {
    console.error('[JSON Enhancement] Preview error:', error)
    return null
  }
}
