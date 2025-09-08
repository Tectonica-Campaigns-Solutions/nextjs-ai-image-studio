/**
 * Test script for External Flux Pro Image Combine API
 * 
 * This script tests the external API endpoint for combining multiple images
 * using the Flux Pro Multi model.
 */

// Import fetch dynamically for Node.js compatibility
let fetch;

async function initFetch() {
  if (typeof window === 'undefined') {
    try {
      const { default: nodeFetch } = await import('node-fetch');
      fetch = nodeFetch;
    } catch (error) {
      console.error('Failed to import node-fetch. Please install it with: npm install node-fetch');
      console.error('Or use a Node.js version that includes fetch (18+)');
      process.exit(1);
    }
  } else {
    fetch = window.fetch;
  }
}

const API_BASE_URL = 'http://localhost:3000'

async function testImageCombineAPI() {
  console.log('🧪 Testing External Flux Pro Image Combine API...\n')
  
  // Test data
  const testData = {
    prompt: "Combine these images into a beautiful artistic composition with dramatic lighting",
    imageUrls: [
      "https://picsum.photos/800/600?random=1",
      "https://picsum.photos/800/600?random=2"
    ],
    useRAG: true,
    settings: {
      aspect_ratio: "16:9",
      guidance_scale: 4.0,
      output_format: "jpeg",
      enhance_prompt: true,
      seed: 12345
    }
  }
  
  try {
    console.log('📤 Sending request...')
    console.log('Endpoint:', `${API_BASE_URL}/api/external/flux-pro-image-combine`)
    console.log('Payload:', JSON.stringify(testData, null, 2))
    
    const startTime = Date.now()
    
    const response = await fetch(`${API_BASE_URL}/api/external/flux-pro-image-combine`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    })
    
    const duration = Date.now() - startTime
    
    console.log(`\n📥 Response received (${duration}ms)`)
    console.log('Status:', response.status)
    console.log('Status Text:', response.statusText)
    
    const result = await response.json()
    
    if (response.ok) {
      console.log('\n✅ SUCCESS!')
      console.log('Combined Image URL:', result.image)
      console.log('Dimensions:', `${result.width}x${result.height}`)
      console.log('Content Type:', result.content_type)
      console.log('Model Used:', result.model)
      console.log('Input Images:', result.inputImages)
      console.log('RAG Enhanced:', result.ragEnhanced)
      console.log('Settings Used:', JSON.stringify(result.settings, null, 2))
      
      if (result.prompt !== testData.prompt) {
        console.log('\n📝 Prompt Enhancement:')
        console.log('Original:', testData.prompt)
        console.log('Enhanced:', result.prompt.substring(0, 200) + '...')
      }
      
    } else {
      console.log('\n❌ ERROR!')
      console.log('Error:', result.error)
      console.log('Details:', result.details)
      if (result.category) {
        console.log('Category:', result.category)
      }
    }
    
  } catch (error) {
    console.error('\n💥 REQUEST FAILED!')
    console.error('Error:', error.message)
  }
}

async function testInvalidRequests() {
  console.log('\n🧪 Testing Invalid Requests...\n')
  
  const tests = [
    {
      name: 'Missing prompt',
      data: {
        imageUrls: ["https://picsum.photos/800/600?random=1", "https://picsum.photos/800/600?random=2"]
      }
    },
    {
      name: 'Missing imageUrls',
      data: {
        prompt: "Test prompt"
      }
    },
    {
      name: 'Not enough images',
      data: {
        prompt: "Test prompt",
        imageUrls: ["https://picsum.photos/800/600?random=1"]
      }
    },
    {
      name: 'Invalid imageUrls type',
      data: {
        prompt: "Test prompt",
        imageUrls: "not an array"
      }
    }
  ]
  
  for (const test of tests) {
    try {
      console.log(`📤 Testing: ${test.name}`)
      
      const response = await fetch(`${API_BASE_URL}/api/external/flux-pro-image-combine`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(test.data)
      })
      
      const result = await response.json()
      
      if (response.status === 400) {
        console.log(`✅ Correctly rejected: ${result.error}`)
      } else {
        console.log(`❌ Should have been rejected but got: ${response.status}`)
      }
    } catch (error) {
      console.error(`💥 Unexpected error: ${error.message}`)
    }
    console.log('')
  }
}

async function testConfiguration() {
  console.log('🧪 Testing Configuration Endpoint...\n')
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/external/config`)
    const result = await response.json()
    
    if (response.ok && result.success) {
      console.log('✅ Configuration retrieved successfully')
      
      if (result.config.imageCombine) {
        console.log('\n📋 Image Combine Configuration:')
        console.log('Endpoint:', result.config.imageCombine.endpoint)
        console.log('Model:', result.config.imageCombine.model)
        console.log('Min Images:', result.config.imageCombine.minImages)
        console.log('Max Images:', result.config.imageCombine.maxImages)
        console.log('Supported Formats:', result.config.imageCombine.supportedOutputFormats.join(', '))
        console.log('Available Settings:', Object.keys(result.config.imageCombine.additionalSettings).join(', '))
      } else {
        console.log('❌ Image Combine configuration not found')
      }
    } else {
      console.log('❌ Failed to retrieve configuration')
    }
  } catch (error) {
    console.error('💥 Configuration test failed:', error.message)
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting External Flux Pro Image Combine API Tests\n')
  console.log('=' * 60)
  
  // Initialize fetch
  await initFetch()
  
  await testConfiguration()
  console.log('\n' + '=' * 60)
  
  await testInvalidRequests()
  console.log('=' * 60)
  
  await testImageCombineAPI()
  
  console.log('\n🏁 All tests completed!')
}

// Execute tests
runAllTests().catch(console.error)
