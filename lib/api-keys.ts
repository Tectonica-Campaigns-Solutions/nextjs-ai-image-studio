/**
 * API Key Management for Client-Specific FAL.AI Keys
 * 
 * This module provides centralized API key retrieval based on organization type.
 * Each organization can have its own FAL_API_KEY_{ORGTYPE} environment variable.
 * 
 * @module lib/api-keys
 */

/**
 * Retrieves the FAL.AI API key for a specific organization
 * 
 * Lookup order:
 * 1. FAL_API_KEY_{ORGTYPE} - Organization-specific key
 * 2. FAL_API_KEY - Default/fallback key
 * 
 * @param orgType - Organization type (e.g., "Tectonica", "CommunityChange", "ACLU")
 * @returns FAL.AI API key
 * @throws Error if no API key is configured
 * 
 * @example
 * ```typescript
 * // With FAL_API_KEY_TECTONICA set
 * const key = getClientApiKey("Tectonica")
 * // Returns value from FAL_API_KEY_TECTONICA
 * 
 * // Without specific key
 * const key = getClientApiKey("NewOrg")
 * // Returns value from FAL_API_KEY (fallback)
 * ```
 */
export function getClientApiKey(orgType: string): string {
  // Normalize orgType to UPPERCASE and replace non-alphanumeric chars with underscore
  // Examples:
  //   "Tectonica" -> "TECTONICA"
  //   "CommunityChange" -> "COMMUNITYCHANGE"
  //   "my-org" -> "MY_ORG"
  //   "test.org" -> "TEST_ORG"
  const normalized = orgType
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '_')
  
  // Try organization-specific key first
  const envVarName = `FAL_API_KEY_${normalized}`
  const clientKey = process.env[envVarName]
  
  if (clientKey && clientKey.trim()) {
    console.log(`[API Keys] Using organization-specific key: ${envVarName}`)
    return clientKey.trim()
  }
  
  // Fallback to default FAL_API_KEY
  const defaultKey = process.env.FAL_API_KEY
  
  if (defaultKey && defaultKey.trim()) {
    console.log(`[API Keys] No specific key for ${orgType}, using default FAL_API_KEY`)
    return defaultKey.trim()
  }
  
  // No key available
  throw new Error(
    `No FAL.AI API key configured for organization: ${orgType}. ` +
    `Please set ${envVarName} or FAL_API_KEY in environment variables.`
  )
}

/**
 * Validates if an API key is configured for an organization
 * 
 * @param orgType - Organization type
 * @returns true if a key is available (specific or default)
 */
export function hasClientApiKey(orgType: string): boolean {
  try {
    getClientApiKey(orgType)
    return true
  } catch {
    return false
  }
}

/**
 * Gets the environment variable name for an organization's API key
 * 
 * @param orgType - Organization type
 * @returns Environment variable name (e.g., "FAL_API_KEY_TECTONICA")
 */
export function getApiKeyEnvVarName(orgType: string): string {
  const normalized = orgType
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '_')
  
  return `FAL_API_KEY_${normalized}`
}
