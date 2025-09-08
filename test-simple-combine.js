/**
 * Simple test for External Flux Pro Image Combine API
 */

const API_BASE_URL = 'http://localhost:3000'

async function testImageCombine() {
  console.log('🧪 Testing External Flux Pro Image Combine API...\n')
  
  const testData = {
    prompt: "Combine these images into a beautiful artistic composition",
    imageUrls: [
      "https://picsum.photos/400/300?random=1",
      "https://picsum.photos/400/300?random=2"
    ],
    useRAG: true,
    settings: {
      aspect_ratio: "1:1",
      guidance_scale: 3.5,
      output_format: "jpeg"
    }
  }
  
  try {
    console.log('📤 Sending request...')
    console.log('Endpoint:', `${API_BASE_URL}/api/external/flux-pro-image-combine`)
    console.log('Payload:', JSON.stringify(testData, null, 2))
    
    const response = await fetch(`${API_BASE_URL}/api/external/flux-pro-image-combine`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    })
    
    console.log('\n📥 Response Status:', response.status)
    
    const result = await response.json()
    
    if (response.ok) {
      console.log('✅ SUCCESS!')
      console.log('Combined Image URL:', result.image)
      console.log('Model Used:', result.model)
      console.log('Input Images:', result.inputImages)
    } else {
      console.log('❌ ERROR!')
      console.log('Error:', result.error)
      console.log('Details:', result.details)
    }
    
  } catch (error) {
    console.error('💥 REQUEST FAILED!')
    console.error('Error:', error.message)
  }
}

async function testValidation() {
  console.log('\n🧪 Testing validation...')
  
  // Test missing prompt
  try {
    const response = await fetch(`${API_BASE_URL}/api/external/flux-pro-image-combine`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageUrls: ["https://picsum.photos/400/300?random=1", "https://picsum.photos/400/300?random=2"]
      })
    })
    
    const result = await response.json()
    console.log('Missing prompt test:', response.status === 400 ? '✅ Correctly rejected' : '❌ Should be rejected')
  } catch (error) {
    console.log('Missing prompt test: 💥 Error:', error.message)
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting tests...\n')
  await testValidation()
  await testImageCombine()
  console.log('\n🏁 Tests completed!')
}

runTests().catch(console.error)
