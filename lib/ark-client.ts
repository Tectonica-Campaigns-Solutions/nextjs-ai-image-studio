/**
 * Ark API Client for Seedream model integration
 * 
 * This client provides a TypeScript interface for interacting with
 * the Ark (ark.cn-beijing.volces.com) API, specifically for the 
 * seedream-4-0-250828 model for image generation and combination.
 */

export interface ArkSeedreamInput {
  model: string
  prompt: string
  image?: string[]
  sequential_image_generation?: "auto" | "manual"
  sequential_image_generation_options?: {
    max_images: number
  }
  response_format?: "url" | "b64_json"
  size?: "1K" | "2K" | "4K"
  stream?: boolean
  watermark?: boolean
}

export interface ArkSeedreamResponse {
  data?: {
    images?: Array<{
      url: string
      width?: number
      height?: number
    }>
    url?: string
    width?: number
    height?: number
  } | Array<{
    url: string
    width?: number
    height?: number
  }>
  error?: {
    message: string
    code?: string
    type?: string
  }
  [key: string]: any
}

export interface ArkImageGenerationOptions {
  prompt: string
  imageUrls?: string[]
  maxImages?: number
  size?: "1K" | "2K" | "4K"
  sequentialGeneration?: "auto" | "manual"
  responseFormat?: "url" | "b64_json"
  stream?: boolean
  watermark?: boolean
}

export class ArkApiClient {
  private readonly apiKey: string
  private readonly baseUrl: string
  private readonly defaultModel: string

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.ARK_API_KEY || ""
    this.baseUrl = "https://ark.cn-beijing.volces.com/api/v3"
    this.defaultModel = "seedream-4-0-250828"

    if (!this.apiKey) {
      throw new Error("ARK_API_KEY is required but not provided")
    }
  }

  /**
   * Generate images using the Seedream model
   */
  async generateImages(options: ArkImageGenerationOptions): Promise<ArkSeedreamResponse> {
    const input: ArkSeedreamInput = {
      model: this.defaultModel,
      prompt: options.prompt,
      response_format: options.responseFormat || "url",
      size: options.size || "2K",
      stream: options.stream || false,
      watermark: options.watermark !== false // Default to true
    }

    // Add image URLs if provided (for image combination)
    if (options.imageUrls && options.imageUrls.length > 0) {
      input.image = options.imageUrls
    }

    // Add sequential generation options if specified
    if (options.maxImages && options.maxImages > 1) {
      input.sequential_image_generation = options.sequentialGeneration || "auto"
      input.sequential_image_generation_options = {
        max_images: Math.min(options.maxImages, 3) // Limit to 3 images max
      }
    }

    console.log("[ARK-CLIENT] Making API request to:", `${this.baseUrl}/images/generations`)
    console.log("[ARK-CLIENT] Input:", JSON.stringify(input, null, 2))

    try {
      const response = await fetch(`${this.baseUrl}/images/generations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(input),
      })

      const responseText = await response.text()
      console.log("[ARK-CLIENT] Response status:", response.status)
      console.log("[ARK-CLIENT] Response headers:", Object.fromEntries(response.headers.entries()))
      
      if (!response.ok) {
        console.error("[ARK-CLIENT] API error response:", responseText)
        
        let errorData: any = {}
        try {
          errorData = JSON.parse(responseText)
        } catch (parseError) {
          errorData = { message: responseText }
        }

        throw new Error(`Ark API error (${response.status}): ${errorData.error?.message || errorData.message || responseText}`)
      }

      let result: ArkSeedreamResponse
      try {
        result = JSON.parse(responseText)
      } catch (parseError) {
        throw new Error(`Failed to parse Ark API response: ${responseText}`)
      }

      console.log("[ARK-CLIENT] Successful response structure:", {
        hasData: !!result.data,
        dataType: typeof result.data,
        isArray: Array.isArray(result.data),
        keys: result.data ? Object.keys(result.data) : []
      })

      return result

    } catch (error) {
      console.error("[ARK-CLIENT] Request failed:", error)
      throw error
    }
  }

  /**
   * Combine two images using Seedream model
   */
  async combineImages(
    prompt: string, 
    imageUrl1: string, 
    imageUrl2: string, 
    options: Partial<ArkImageGenerationOptions> = {}
  ): Promise<ArkSeedreamResponse> {
    return this.generateImages({
      prompt,
      imageUrls: [imageUrl1, imageUrl2],
      ...options
    })
  }

  /**
   * Generate multiple sequential images
   */
  async generateSequentialImages(
    prompt: string,
    imageUrls: string[],
    maxImages: number = 3,
    options: Partial<ArkImageGenerationOptions> = {}
  ): Promise<ArkSeedreamResponse> {
    return this.generateImages({
      prompt,
      imageUrls,
      maxImages,
      sequentialGeneration: "auto",
      ...options
    })
  }

  /**
   * Validate that the API key is working
   */
  async validateApiKey(): Promise<boolean> {
    try {
      // Make a simple request to test the API key
      const response = await fetch(`${this.baseUrl}/images/generations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.defaultModel,
          prompt: "test",
          size: "1K"
        }),
      })
      
      // If we get 401, the API key is invalid
      // If we get other errors, the API key is probably valid but the request has issues
      return response.status !== 401
    } catch (error) {
      console.error("[ARK-CLIENT] API key validation failed:", error)
      return false
    }
  }

  /**
   * Extract images from API response in a consistent format
   */
  static extractImages(response: ArkSeedreamResponse): Array<{url: string, width: number, height: number}> {
    const images: Array<{url: string, width: number, height: number}> = []

    if (response.data) {
      if (Array.isArray(response.data)) {
        // Response.data is an array of images
        for (const item of response.data) {
          if (item.url) {
            images.push({
              url: item.url,
              width: item.width || 1024,
              height: item.height || 1024
            })
          }
        }
      } else if (response.data.images && Array.isArray(response.data.images)) {
        // Response.data.images is an array
        for (const item of response.data.images) {
          if (item.url) {
            images.push({
              url: item.url,
              width: item.width || 1024,
              height: item.height || 1024
            })
          }
        }
      } else if (response.data.url) {
        // Single image in response.data
        images.push({
          url: response.data.url,
          width: response.data.width || 1024,
          height: response.data.height || 1024
        })
      }
    }

    return images
  }
}

/**
 * Helper function to get a configured Ark API client instance
 */
export function createArkClient(apiKey?: string): ArkApiClient {
  return new ArkApiClient(apiKey)
}

/**
 * Environment configuration helper
 */
export function getArkApiKey(): string | null {
  return process.env.ARK_API_KEY || null
}

/**
 * Check if Ark API is available (API key is configured)
 */
export function isArkApiAvailable(): boolean {
  return !!getArkApiKey()
}