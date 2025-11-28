import sharp from 'sharp'

/**
 * Removes the disclaimer area from an image by cropping the bottom portion
 * 
 * @param imageBuffer - Buffer of the source image
 * @param cropHeight - Height to crop from bottom (default: 80px to remove 2-line disclaimer)
 * @returns Buffer of the cropped image
 */
export async function removeDisclaimerArea(
  imageBuffer: Buffer,
  cropHeight: number = 80
): Promise<Buffer> {
  try {
    console.log('[Disclaimer] Removing disclaimer area from image buffer')
    
    // Get image metadata
    const metadata = await sharp(imageBuffer).metadata()
    const imageWidth = metadata.width || 1024
    const imageHeight = metadata.height || 1024
    
    console.log('[Disclaimer] Original dimensions:', imageWidth, 'x', imageHeight)
    console.log('[Disclaimer] Cropping', cropHeight, 'px from bottom')
    
    // Calculate new height (remove bottom portion)
    const newHeight = imageHeight - cropHeight
    
    if (newHeight <= 0) {
      console.warn('[Disclaimer] Crop height too large, returning original image')
      return imageBuffer
    }
    
    // Crop the image from top-left, excluding bottom portion
    const croppedImage = await sharp(imageBuffer)
      .extract({
        left: 0,
        top: 0,
        width: imageWidth,
        height: newHeight
      })
      .toBuffer()
    
    console.log('[Disclaimer] Image cropped to:', imageWidth, 'x', newHeight)
    
    return croppedImage
    
  } catch (error) {
    console.error('[Disclaimer] Error removing disclaimer area:', error)
    throw new Error(`Failed to remove disclaimer area: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Adds a disclaimer text to the bottom-right corner of an image
 * 
 * @param imageUrl - URL of the source image
 * @param disclaimerText - Text to add (default: multi-line disclaimer)
 * @param options - Customization options
 * @returns Base64 encoded image with disclaimer
 */
export async function addDisclaimerToImage(
  imageUrl: string,
  disclaimerText?: string,
  options: {
    fontSize?: number
    padding?: number
    textColor?: string
    shadowColor?: string
    shadowBlur?: number
    removeExisting?: boolean  // New option to remove existing disclaimer
    cropHeight?: number       // Height to crop from bottom if removeExisting is true
  } = {}
): Promise<string> {
  try {
    const {
      fontSize = 30,
      padding = 15,
      textColor = '#FFFFFF',
      shadowColor = '#000000',
      shadowBlur = 2,
      removeExisting = false,
      cropHeight = 80
    } = options

    console.log('[Disclaimer] Downloading image from URL:', imageUrl)
    
    // Download the image
    const response = await fetch(imageUrl)
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`)
    }
    
    let imageBuffer = Buffer.from(await response.arrayBuffer())
    console.log('[Disclaimer] Image downloaded, size:', imageBuffer.length, 'bytes')
    
    // Remove existing disclaimer area if requested
    if (removeExisting) {
      console.log('[Disclaimer] removeExisting=true, cropping bottom area...')
      const croppedBuffer = await removeDisclaimerArea(imageBuffer, cropHeight)
      imageBuffer = Buffer.from(croppedBuffer)
    }
    
    // Get image metadata (after potential crop)
    const metadata = await sharp(imageBuffer).metadata()
    const imageWidth = metadata.width || 1024
    const imageHeight = metadata.height || 1024
    
    console.log('[Disclaimer] Image dimensions:', imageWidth, 'x', imageHeight)
    
    // Calculate text position (bottom-right with padding)
    // Using text-anchor="end" to align text to the right
    const textX = imageWidth - padding // Right edge minus padding
    const lineHeight = fontSize * 1.2 // Line spacing
    const textY1 = imageHeight - padding - lineHeight // First line
    const textY2 = imageHeight - padding // Second line
    
    // Default disclaimer text (2 lines)
    const line1 = "Created by supporters with ethical AI."
    const line2 = "More at: tectonica.ai"
    
    console.log('[Disclaimer] Text position (right-aligned):', { textX, textY1, textY2 })
    
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
          y="${textY1}"
          font-family="Arial, sans-serif"
          font-size="${fontSize}px"
          fill="${textColor}"
          text-anchor="end"
          filter="url(#textShadow)"
        >${line1}</text>
        <text
          x="${textX}"
          y="${textY2}"
          font-family="Arial, sans-serif"
          font-size="${fontSize}px"
          fill="${textColor}"
          text-anchor="end"
          filter="url(#textShadow)"
        >${line2}</text>
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
