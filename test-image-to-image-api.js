// Test script for the new image-to-image functionality
const BASE_URL = 'http://localhost:3000/api/external'

async function testImageToImageConfig() {
  console.log('🔧 Testing Image-to-Image Configuration...')
  
  try {
    const response = await fetch(`${BASE_URL}/config`)
    const data = await response.json()
    
    if (data.success) {
      console.log('✅ Configuration retrieved successfully')
      
      // Check if image-to-image is available
      if (data.config.imageToImage) {
        console.log('✅ Image-to-Image endpoint available:', data.config.imageToImage.endpoint)
        console.log('📋 Model:', data.config.imageToImage.model)
        console.log('📋 Supported formats:', data.config.imageToImage.supportedInputFormats)
        console.log('📋 Settings available:', Object.keys(data.config.imageToImage.additionalSettings))
        
        // Log strength setting details
        const strengthSetting = data.config.imageToImage.additionalSettings.strength
        if (strengthSetting) {
          console.log('⚙️  Strength setting:', {
            range: `${strengthSetting.min} - ${strengthSetting.max}`,
            default: strengthSetting.default,
            description: strengthSetting.description
          })
        }
      } else {
        console.log('❌ Image-to-Image endpoint not found in configuration')
      }
    } else {
      console.log('❌ Configuration failed:', data.error)
    }
  } catch (error) {
    console.log('❌ Configuration error:', error.message)
  }
  
  console.log('')
}

async function testImageToImageEndpoint() {
  console.log('🎨 Testing Image-to-Image Endpoint...')
  
  try {
    // Note: This test will fail without an actual image file
    // In a real test, you would use FormData with an actual image file
    
    console.log('📝 This test requires an actual image file to work properly.')
    console.log('📖 Example usage:')
    console.log(`
const formData = new FormData();
formData.append('image', imageFile); // Your image file
formData.append('prompt', 'transform into watercolor painting style');
formData.append('useRAG', 'true');
formData.append('useLoRA', 'true');
formData.append('settings', JSON.stringify({
  strength: 0.8,
  num_images: 2,
  image_size: "landscape_4_3"
}));

const response = await fetch('${BASE_URL}/image-to-image', {
  method: 'POST',
  body: formData
});
    `)
    
    // Test with invalid data to see error handling
    const response = await fetch(`${BASE_URL}/image-to-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: "test prompt"
      })
    })
    
    const data = await response.json()
    console.log('📋 Expected error response:', {
      success: data.success,
      error: data.error,
      status: response.status
    })
    
  } catch (error) {
    console.log('❌ Image-to-Image error:', error.message)
  }
  
  console.log('')
}

// Run tests
async function runTests() {
  console.log('🚀 Starting Image-to-Image API Tests...')
  console.log('=' .repeat(50))
  
  await testImageToImageConfig()
  await testImageToImageEndpoint()
  
  console.log('✅ Image-to-Image API tests completed!')
  console.log('')
  console.log('💡 To test with real images:')
  console.log('1. Open the web application at http://localhost:3000')
  console.log('2. Go to the "Image to Image" tab')
  console.log('3. Upload an image and enter a transformation prompt')
  console.log('4. Enable RAG and/or LoRA options as needed')
  console.log('5. Click "Transform Image" to see the results')
}

runTests().catch(console.error)
