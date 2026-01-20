/**
 * Test script for scene-based Flux 2 Pro Edit Apply endpoint
 * Tests all 4 scene types: people, landscape, urban, monument
 */

import fs from 'fs'
import path from 'path'

const API_ENDPOINT = 'http://localhost:3000/api/external/flux-2-pro-edit-apply'

// Test configurations for each scene type
const TEST_CONFIGS = {
  people: {
    sceneType: 'people',
    prompt: 'Add dramatic lighting',
    description: 'People scene with custom prompt'
  },
  landscape: {
    sceneType: 'landscape',
    description: 'Landscape scene with default prompt'
  },
  urban: {
    sceneType: 'urban',
    prompt: 'Enhance the urban atmosphere',
    description: 'Urban scene with custom prompt'
  },
  monument: {
    sceneType: 'monument',
    description: 'Monument scene with default prompt'
  }
}

async function testSceneType(config) {
  console.log(`\n${'='.repeat(80)}`)
  console.log(`Testing: ${config.description}`)
  console.log(`Scene Type: ${config.sceneType}`)
  console.log(`Custom Prompt: ${config.prompt || '(none - using default)'}`)
  console.log('='.repeat(80))

  try {
    // Read a test image (you can replace this with any test image)
    const testImagePath = path.join(process.cwd(), 'public', 'tectonicaai-reference-images', 'TCTAIFront01.png')
    
    if (!fs.existsSync(testImagePath)) {
      console.error(`❌ Test image not found: ${testImagePath}`)
      return
    }

    const imageBuffer = fs.readFileSync(testImagePath)
    const base64Image = `data:image/png;base64,${imageBuffer.toString('base64')}`

    // Prepare request body
    const requestBody = {
      sceneType: config.sceneType,
      base64Image: base64Image,
      settings: {
        image_size: 'square',
        output_format: 'jpeg'
      }
    }

    // Add custom prompt if provided
    if (config.prompt) {
      requestBody.prompt = config.prompt
    }

    console.log('\n📤 Sending request...')
    console.log(`   Scene Type: ${requestBody.sceneType}`)
    console.log(`   Image Size: ${(base64Image.length / 1024).toFixed(2)} KB`)
    console.log(`   Custom Prompt: ${requestBody.prompt || '(using default)'}`)

    const startTime = Date.now()
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      console.error(`\n❌ Request failed (${response.status}):`)
      console.error(`   Error: ${errorData.error}`)
      console.error(`   Details: ${errorData.details}`)
      return
    }

    const result = await response.json()

    console.log(`\n✅ Success! (${elapsed}s)`)
    console.log('\n📊 Response:')
    console.log(`   Scene Type: ${result.sceneType}`)
    console.log(`   Reference Image: ${result.referenceImage}`)
    console.log(`   Base Prompt: ${result.basePrompt.substring(0, 80)}...`)
    console.log(`   Custom Prompt: ${result.customPrompt || '(none)'}`)
    console.log(`   Full Prompt Length: ${result.prompt.length} chars`)
    console.log(`   Generated Images: ${result.images?.length || 0}`)
    console.log(`   Seed: ${result.seed}`)
    
    if (result.images?.[0]) {
      console.log(`\n🖼️  Generated Image:`)
      console.log(`   URL: ${result.images[0].url}`)
      console.log(`   Dimensions: ${result.images[0].width}x${result.images[0].height}`)
    }

  } catch (error) {
    console.error(`\n❌ Error:`, error.message)
  }
}

async function runAllTests() {
  console.log('\n🚀 Testing Flux 2 Pro Edit Apply - Scene-Based Style Transfer')
  console.log(`📍 Endpoint: ${API_ENDPOINT}`)
  
  // Test each scene type
  for (const [key, config] of Object.entries(TEST_CONFIGS)) {
    await testSceneType(config)
    
    // Wait a bit between requests to avoid rate limiting
    if (key !== 'monument') {
      console.log('\n⏳ Waiting 2 seconds before next test...')
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }

  console.log('\n' + '='.repeat(80))
  console.log('✨ All tests completed!')
  console.log('='.repeat(80) + '\n')
}

// Run tests
runAllTests().catch(console.error)
