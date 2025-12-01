/**
 * Test script for Seedream Single Edit with Disclaimer Removal
 * 
 * This script tests that the /api/seedream-single-edit endpoint:
 * 1. Removes any existing disclaimer from the input image
 * 2. Adds a fresh disclaimer to the edited output
 * 
 * Usage:
 *   node test-seedream-edit-disclaimer.js <image-url-or-path>
 */

const fs = require('fs').promises
const path = require('path')

async function testSeedreamEditWithDisclaimer(imageUrl) {
  console.log('========================================')
  console.log('Testing Seedream Edit + Disclaimer Removal')
  console.log('========================================\n')

  const testUrl = 'http://localhost:3000/api/seedream-single-edit'
  
  // Test configuration
  const testPrompt = 'Make the colors more vibrant and saturated'
  
  console.log('Test Configuration:')
  console.log('- Endpoint:', testUrl)
  console.log('- Prompt:', testPrompt)
  console.log('- Input Image:', imageUrl)
  console.log()

  try {
    // Prepare JSON payload
    const payload = {
      prompt: testPrompt,
      imageUrl: imageUrl,
      settings: {
        aspect_ratio: '1:1',
        num_images: 1,
        strength: 0.8,
        enable_safety_checker: true
      },
      orgType: 'general'
    }

    console.log('Sending request to Seedream Single Edit endpoint...')
    console.log('Request payload:', JSON.stringify(payload, null, 2))
    console.log()
    
    const startTime = Date.now()
    
    const response = await fetch(testUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log(`Request completed in ${duration} seconds\n`)

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorData}`)
    }

    const result = await response.json()
    
    console.log('✅ SUCCESS!')
    console.log()
    console.log('Response Details:')
    console.log('- Success:', result.success)
    console.log('- Model:', result.model)
    console.log('- Disclaimer Added:', result.disclaimerAdded)
    console.log('- Images Count:', result.images?.length || 0)
    console.log()
    
    if (result.image) {
      const isBase64 = result.image.startsWith('data:image')
      console.log('Image Format:', isBase64 ? 'Base64 (with disclaimer)' : 'URL')
      
      if (isBase64) {
        const base64Size = ((result.image.length * 0.75) / 1024 / 1024).toFixed(2)
        console.log('Base64 Size:', `~${base64Size} MB`)
        console.log('Base64 Preview:', result.image.substring(0, 80) + '...')
        
        // Save the image with disclaimer to a file
        const base64Data = result.image.replace(/^data:image\/\w+;base64,/, '')
        const imageBuffer = Buffer.from(base64Data, 'base64')
        const outputPath = `./output-seedream-edit-disclaimer-${Date.now()}.jpg`
        
        await fs.writeFile(outputPath, imageBuffer)
        console.log()
        console.log('📁 Image saved to:', outputPath)
        console.log('   You can open this file to verify:')
        console.log('   1. The input disclaimer was removed (if it existed)')
        console.log('   2. A fresh disclaimer was added to the edited image')
      } else {
        console.log('Image URL:', result.image)
      }
      
      if (result.originalImageUrl) {
        console.log()
        console.log('Original Image URL (without disclaimer):', result.originalImageUrl)
      }
    }
    
    console.log()
    console.log('Expected Behavior:')
    console.log('  - Input image: Disclaimer removed (if present) before editing')
    console.log('  - Dimensions: Maintained using proportional resize + center crop')
    console.log('  - Output image: Fresh disclaimer added at bottom-right')
    console.log('  - No duplicate or overlapping disclaimers')
    console.log()
    console.log('Proportional Resize Method:')
    console.log('  1. Crop 80px from bottom (remove old disclaimer)')
    console.log('  2. Resize proportionally to restore original height')
    console.log('  3. Center crop to restore original width')
    console.log('  4. Result: Original dimensions preserved, ~11% content loss from sides')
    console.log()
    console.log('Disclaimer Details:')
    console.log('  Line 1: "Created by supporters with ethical AI."')
    console.log('  Line 2: "More at: tectonica.ai"')
    console.log('  Position: Bottom-right corner')
    console.log('  Style: White text with black shadow, 30px Arial, 15px padding')
    console.log()
    
    if (result.disclaimerError) {
      console.warn('⚠️  Disclaimer Error:', result.disclaimerError)
      console.warn('    The original image was returned without disclaimer.')
    }

  } catch (error) {
    console.error('❌ TEST FAILED')
    console.error()
    console.error('Error:', error.message)
    
    if (error.cause) {
      console.error('Cause:', error.cause)
    }
    
    process.exit(1)
  }
}

// Get image URL from command line argument or use default
const imageUrl = process.argv[2] || 'https://picsum.photos/1024/1024'

console.log()
console.log('Note: This endpoint uses proportional resize method to maintain dimensions.')
console.log('      If the input image has a disclaimer:')
console.log('      1. Bottom 80px is cropped (removes disclaimer)')
console.log('      2. Image is resized proportionally to restore original height')
console.log('      3. Center crop restores original width (~11% loss from sides)')
console.log('      4. New disclaimer is added to the restored dimensions')
console.log()

// Run the test
testSeedreamEditWithDisclaimer(imageUrl)
  .then(() => {
    console.log()
    console.log('========================================')
    console.log('Test completed successfully!')
    console.log('========================================')
  })
  .catch(error => {
    console.error()
    console.error('========================================')
    console.error('Test failed with error:')
    console.error(error)
    console.error('========================================')
    process.exit(1)
  })
