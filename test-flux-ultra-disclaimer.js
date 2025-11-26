/**
 * Test script for Flux Ultra Finetuned with Disclaimer
 * 
 * This script tests the /api/flux-ultra-finetuned endpoint to verify
 * that the disclaimer is properly added to generated images.
 * 
 * Usage:
 *   node test-flux-ultra-disclaimer.js
 */

const fs = require('fs').promises

async function testFluxUltraWithDisclaimer() {
  console.log('========================================')
  console.log('Testing Flux Ultra Finetuned + Disclaimer')
  console.log('========================================\n')

  const testUrl = 'http://localhost:3000/api/flux-ultra-finetuned'
  
  // Test configuration
  const testPrompt = 'A person holding a protest sign with raised fist'
  const finetuneId = process.env.FINETUNE_ID || 'your-finetune-id-here'
  const triggerPhrase = process.env.TRIGGER_PHRASE || 'ACLU_POSTER'
  
  console.log('Test Configuration:')
  console.log('- Endpoint:', testUrl)
  console.log('- Prompt:', testPrompt)
  console.log('- Fine-tune ID:', finetuneId)
  console.log('- Trigger Phrase:', triggerPhrase)
  console.log()

  try {
    // Prepare FormData
    const formData = new FormData()
    formData.append('prompt', testPrompt)
    formData.append('finetuneId', finetuneId)
    formData.append('finetuneStrength', '1.3')
    formData.append('triggerPhrase', triggerPhrase)
    formData.append('settings', JSON.stringify({
      aspect_ratio: '1:1',
      num_images: 1,
      safety_tolerance: 1,
      output_format: 'jpeg',
      enable_safety_checker: true,
      seed: Math.floor(Math.random() * 10000)
    }))

    console.log('Sending request to Flux Ultra Finetuned endpoint...')
    const startTime = Date.now()
    
    const response = await fetch(testUrl, {
      method: 'POST',
      body: formData
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
    console.log('- Image Dimensions:', `${result.width}x${result.height}`)
    console.log('- Final Prompt:', result.finalPrompt)
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
        const outputPath = `./output-with-disclaimer-${Date.now()}.jpg`
        
        await fs.writeFile(outputPath, imageBuffer)
        console.log()
        console.log('📁 Image saved to:', outputPath)
        console.log('   You can open this file to verify the disclaimer was added correctly.')
      } else {
        console.log('Image URL:', result.image)
      }
      
      if (result.originalImageUrl) {
        console.log()
        console.log('Original Image URL (without disclaimer):', result.originalImageUrl)
      }
    }
    
    console.log()
    console.log('Expected Disclaimer:')
    console.log('  "Created by supporters with ethical AI. // More at: tectonica.ai"')
    console.log('  Position: Bottom-right corner')
    console.log('  Style: White text with black shadow, 20px Arial, 15px padding')
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

// Run the test
testFluxUltraWithDisclaimer()
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
