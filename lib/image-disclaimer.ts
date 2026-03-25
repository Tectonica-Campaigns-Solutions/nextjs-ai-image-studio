import sharp from 'sharp'

// Disclaimer rect geometry — must stay in sync with addDisclaimerToImage's SVG
const DISCLAIMER_RECT = {
  offsetFromRight: 4,   // px gap between rect right edge and image right edge
  width: 216,
  height: 32,
  offsetFromBottom: 4,  // px gap between rect bottom edge and image bottom edge
  alpha: 0.55,          // rgba(0,0,0,0.55) overlay alpha
} as const

/**
 * Restores the pixels underneath the disclaimer overlay by inverting the
 * alpha-composite operation. Because the overlay is a solid black rect with
 * alpha=0.55, the original pixel value can be recovered as:
 *
 *   C_original = C_out / (1 - alpha)
 *
 * Only call this when you know the input image already has the disclaimer
 * applied (e.g. the caller passes removeInputDisclaimer=true explicitly).
 * Applying it to a clean image will produce an over-brightened rectangle.
 */
export async function restoreDisclaimerZone(imageBuffer: Buffer): Promise<Buffer> {
  const { offsetFromRight, width, height, offsetFromBottom, alpha } = DISCLAIMER_RECT
  const factor = 1 / (1 - alpha) // ≈ 2.222

  const { data, info } = await sharp(imageBuffer)
    .raw()
    .toBuffer({ resolveWithObject: true })

  const imgW = info.width
  const imgH = info.height
  const ch = info.channels

  const x = imgW - offsetFromRight - width
  const y = imgH - offsetFromBottom - height

  // Clamp rect to actual image bounds
  const x0 = Math.max(0, x)
  const y0 = Math.max(0, y)
  const x1 = Math.min(imgW, x + width)
  const y1 = Math.min(imgH, y + height)

  console.log(`[Disclaimer] restoreDisclaimerZone: rect (${x0},${y0})→(${x1},${y1}), factor=${factor.toFixed(4)}`)

  for (let row = y0; row < y1; row++) {
    for (let col = x0; col < x1; col++) {
      const idx = (row * imgW + col) * ch
      // Restore R, G, B — leave alpha channel (idx+3) untouched if present
      for (let c = 0; c < Math.min(3, ch); c++) {
        data[idx + c] = Math.min(255, Math.round(data[idx + c] * factor))
      }
    }
  }

  const restored = await sharp(Buffer.from(data), {
    raw: { width: imgW, height: imgH, channels: ch }
  }).jpeg({ quality: 95 }).toBuffer()

  console.log(`[Disclaimer] restoreDisclaimerZone: done, ${(restored.length / 1024).toFixed(1)} KB`)
  return restored
}

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
 * Removes disclaimer and restores original dimensions using proportional resize
 * This method crops the disclaimer, resizes proportionally, then crops to original dimensions
 * 
 * @param imageBuffer - Buffer of the source image
 * @param cropHeight - Height to crop from bottom (default: 80px)
 * @returns Buffer of the processed image with original dimensions
 */
export async function removeDisclaimerWithResize(
  imageBuffer: Buffer,
  cropHeight: number = 80
): Promise<Buffer> {
  try {
    console.log('[Disclaimer] Removing disclaimer with proportional resize')
    
    // Get original metadata
    const metadata = await sharp(imageBuffer).metadata()
    const originalWidth = metadata.width || 1024
    const originalHeight = metadata.height || 1024
    
    console.log('[Disclaimer] Original dimensions:', originalWidth, 'x', originalHeight)
    console.log('[Disclaimer] Cropping', cropHeight, 'px from bottom')
    
    // Step 1: Crop bottom (remove disclaimer)
    const croppedHeight = originalHeight - cropHeight
    
    if (croppedHeight <= 0) {
      console.warn('[Disclaimer] Crop height too large, returning original image')
      return imageBuffer
    }
    
    const cropped = await sharp(imageBuffer)
      .extract({
        left: 0,
        top: 0,
        width: originalWidth,
        height: croppedHeight
      })
      .toBuffer()
    
    console.log('[Disclaimer] After crop:', originalWidth, 'x', croppedHeight)
    
    // Step 2: Calculate new width for proportional resize back to original height
    const resizeRatio = originalHeight / croppedHeight
    const newWidth = Math.round(originalWidth * resizeRatio)
    
    console.log('[Disclaimer] Resize ratio:', resizeRatio.toFixed(4))
    console.log('[Disclaimer] New width after proportional resize:', newWidth)
    
    // Step 3: Resize proportionally to original height
    const resized = await sharp(cropped)
      .resize({
        width: newWidth,
        height: originalHeight,
        fit: 'fill'
      })
      .toBuffer()
    
    console.log('[Disclaimer] After resize:', newWidth, 'x', originalHeight)
    
    // Step 4: Crop center to get back to original dimensions
    const widthDiff = newWidth - originalWidth
    const cropLeft = Math.floor(widthDiff / 2)
    
    console.log('[Disclaimer] Width difference:', widthDiff, 'px')
    console.log('[Disclaimer] Cropping', cropLeft, 'px from left,', (widthDiff - cropLeft), 'px from right')
    
    const final = await sharp(resized)
      .extract({
        left: cropLeft,
        top: 0,
        width: originalWidth,
        height: originalHeight
      })
      .toBuffer()
    
    console.log('[Disclaimer] Final dimensions:', originalWidth, 'x', originalHeight, '✓')
    console.log('[Disclaimer] Content loss: ~', ((widthDiff / originalWidth) * 100).toFixed(1), '% from sides')
    
    return final
    
  } catch (error) {
    console.error('[Disclaimer] Error in removeDisclaimerWithResize:', error)
    throw new Error(`Failed to remove disclaimer with resize: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
    removeExisting?: boolean  // Remove existing disclaimer before adding new one
    cropHeight?: number       // Height to crop from bottom if removeExisting is true
    preserveMethod?: 'resize' | 'crop' // Method to preserve/restore dimensions (default: 'resize')
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
      cropHeight = 80,
      preserveMethod = 'resize' // Default to proportional resize method
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
      console.log('[Disclaimer] removeExisting=true, using preserve method:', preserveMethod)
      
      if (preserveMethod === 'resize') {
        // Use proportional resize method to maintain original dimensions
        const processedBuffer = await removeDisclaimerWithResize(imageBuffer, cropHeight)
        imageBuffer = Buffer.from(processedBuffer)
      } else {
        // Use simple crop (dimensions will change)
        const croppedBuffer = await removeDisclaimerArea(imageBuffer, cropHeight)
        imageBuffer = Buffer.from(croppedBuffer)
      }
    }
    
    // Get image metadata (after potential crop)
    const metadata = await sharp(imageBuffer).metadata()
    const imageWidth = metadata.width || 1024
    const imageHeight = metadata.height || 1024
    
    console.log('[Disclaimer] Image dimensions:', imageWidth, 'x', imageHeight)

    // Fit the longest line within the rect (216px wide, 4px padding each side = 208px usable).
    // Arial bold uppercase character width ≈ fontSize × 0.62.
    const rectAvailableWidth = 208
    const longestLine = 'CREATED BY SUPPORTERS WITH ETHICAL AI'
    const charWidthRatio = 0.62
    const disclaimerFontSize = Math.floor(rectAvailableWidth / (longestLine.length * charWidthRatio))

    const svg = `
    <svg width="${imageWidth}" height="${imageHeight}">
      <rect 
        x="${imageWidth - 220}" 
        y="${imageHeight - 36}" 
        width="216" height="32" 
        fill="rgba(0,0,0,0.55)" 
        rx="2"
      />
      <text 
        x="${imageWidth - 216}" y="${imageHeight - 24}" 
        font-family="Arial, sans-serif" font-size="${disclaimerFontSize}" 
        fill="white" text-anchor="start" font-weight="bold"
      >CREATED BY SUPPORTERS WITH ETHICAL AI</text>
      <text 
        x="${imageWidth - 216}" y="${imageHeight - 12}" 
        font-family="Arial, sans-serif" font-size="${disclaimerFontSize}" 
        fill="white" text-anchor="start"
      >MORE AT: TECTONICA.AI</text>
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

/**
 * Pre-process an image for combining by removing any existing disclaimer
 * Returns base64 data URL with cleaned image
 * 
 * @param imageUrl - URL of the image to pre-process
 * @returns Base64 data URL of the cleaned image
 */
export async function preprocessImageForCombine(
  imageUrl: string
): Promise<string> {
  try {
    console.log('[Disclaimer] Pre-processing image for combine:', imageUrl)
    
    // Download the image
    const response = await fetch(imageUrl)
    if (!response.ok) {
      console.error(`[Disclaimer] Failed to download image: ${response.statusText}`)
      return imageUrl // Return original on error
    }

    const imageBuffer = Buffer.from(await response.arrayBuffer())
    const metadata = await sharp(imageBuffer).metadata()

    if (!metadata.width || !metadata.height) {
      console.error('[Disclaimer] Could not get image dimensions')
      return imageUrl
    }

    console.log('[Disclaimer] Image dimensions:', metadata.width, 'x', metadata.height)

    // Remove disclaimer using proportional resize method
    const cleanedBuffer = await removeDisclaimerWithResize(imageBuffer, 80)

    // Convert to base64
    const base64Image = cleanedBuffer.toString('base64')
    const dataUrl = `data:image/png;base64,${base64Image}`
    
    console.log('[Disclaimer] Pre-processing complete, base64 length:', dataUrl.length, 'chars')
    
    return dataUrl
    
  } catch (error) {
    console.error('[Disclaimer] Error preprocessing image:', error)
    return imageUrl // Return original on error
  }
}
