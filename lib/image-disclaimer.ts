import sharp from 'sharp'

/**
 * Adds a disclaimer text to the bottom-right corner of an image
 * 
 * @param imageUrl - URL of the source image
 * @param disclaimerText - Text to add (default: "Created by supporters with ethical AI. // More at: tectonica.ai")
 * @param options - Customization options
 * @returns Base64 encoded image with disclaimer
 */
export async function addDisclaimerToImage(
  imageUrl: string,
  disclaimerText: string = "Created by supporters with ethical AI. // More at: tectonica.ai",
  options: {
    fontSize?: number
    padding?: number
    textColor?: string
    shadowColor?: string
    shadowBlur?: number
  } = {}
): Promise<string> {
  try {
    const {
      fontSize = 20,
      padding = 15,
      textColor = '#FFFFFF',
      shadowColor = '#000000',
      shadowBlur = 2
    } = options

    console.log('[Disclaimer] Downloading image from URL:', imageUrl)
    
    // Download the image
    const response = await fetch(imageUrl)
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`)
    }
    
    const imageBuffer = Buffer.from(await response.arrayBuffer())
    console.log('[Disclaimer] Image downloaded, size:', imageBuffer.length, 'bytes')
    
    // Get image metadata
    const metadata = await sharp(imageBuffer).metadata()
    const imageWidth = metadata.width || 1024
    const imageHeight = metadata.height || 1024
    
    console.log('[Disclaimer] Image dimensions:', imageWidth, 'x', imageHeight)
    
    // Calculate text position (bottom-right with padding)
    // We'll estimate text width based on character count and font size
    const estimatedCharWidth = fontSize * 0.6
    const textWidth = disclaimerText.length * estimatedCharWidth
    const textX = imageWidth - textWidth - padding
    const textY = imageHeight - padding - fontSize
    
    console.log('[Disclaimer] Text position:', { textX, textY, textWidth })
    
    // Create SVG with text and shadow effect
    // Using filter for text shadow (better than multiple text elements)
    const svg = `
      <svg width="${imageWidth}" height="${imageHeight}">
        <defs>
          <filter id="textShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="${shadowBlur}"/>
            <feOffset dx="1" dy="1" result="offsetblur"/>
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.8"/>
            </feComponentTransfer>
            <feMerge>
              <feMergeNode/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <text
          x="${textX}"
          y="${textY}"
          font-family="Arial, sans-serif"
          font-size="${fontSize}px"
          fill="${textColor}"
          filter="url(#textShadow)"
        >${disclaimerText}</text>
      </svg>
    `
    
    console.log('[Disclaimer] SVG overlay created')
    
    // Composite the SVG over the image
    const imageWithDisclaimer = await sharp(imageBuffer)
      .composite([
        {
          input: Buffer.from(svg),
          top: 0,
          left: 0
        }
      ])
      .jpeg({ quality: 95 }) // High quality output
      .toBuffer()
    
    console.log('[Disclaimer] Disclaimer added successfully, output size:', imageWithDisclaimer.length, 'bytes')
    
    // Convert to base64 with data URI prefix
    const base64Image = `data:image/jpeg;base64,${imageWithDisclaimer.toString('base64')}`
    
    console.log('[Disclaimer] Converted to base64, total length:', base64Image.length, 'chars')
    
    return base64Image
    
  } catch (error) {
    console.error('[Disclaimer] Error adding disclaimer:', error)
    throw new Error(`Failed to add disclaimer: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Adds disclaimer to multiple images
 * 
 * @param imageUrls - Array of image URLs
 * @param disclaimerText - Text to add
 * @param options - Customization options
 * @returns Array of base64 encoded images with disclaimer
 */
export async function addDisclaimerToImages(
  imageUrls: string[],
  disclaimerText?: string,
  options?: Parameters<typeof addDisclaimerToImage>[2]
): Promise<string[]> {
  const results = await Promise.all(
    imageUrls.map(url => addDisclaimerToImage(url, disclaimerText, options))
  )
  return results
}
