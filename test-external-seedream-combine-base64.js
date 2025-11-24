/**
 * Test script for external Seedream Combine endpoint with Base64 support
 * 
 * This demonstrates how to use the /api/external/seedream-ark-combine endpoint
 * with Base64 encoded images using JSON payload.
 * 
 * NOTE: JSON is now the RECOMMENDED method for all Base64/URL requests
 * (not just large images). FormData is only used for actual file uploads.
 * 
 * Usage:
 *   node test-external-seedream-combine-base64.js
 */

const fs = require('fs')
const path = require('path')

// Configuration
const API_URL = 'http://localhost:3000/api/external/seedream-ark-combine'

/**
 * Convert image file to Base64
 */
function imageToBase64(imagePath) {
  const imageBuffer = fs.readFileSync(imagePath)
  const base64 = imageBuffer.toString('base64')
  
  // Detect MIME type from extension
  const ext = path.extname(imagePath).toLowerCase()
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp'
  }
  const mimeType = mimeTypes[ext] || 'image/jpeg'
  
  // Return data URL format
  return `data:${mimeType};base64,${base64}`
}

/**
 * Test with Base64 images using JSON payload (RECOMMENDED)
 */
async function testWithBase64JSON() {
  console.log('\n=== Test: Base64 Images with JSON Payload (RECOMMENDED) ===\n')
  
  // Example: Read two images from disk
  // Replace these paths with your actual image files
  const image1Path = './test-image-1.jpg'
  const image2Path = './test-image-2.jpg'
  
  // Check if files exist
  if (!fs.existsSync(image1Path) || !fs.existsSync(image2Path)) {
    console.log('⚠️  Test images not found. Please provide:')
    console.log(`   - ${image1Path}`)
    console.log(`   - ${image2Path}`)
    console.log('\nSkipping test...')
    return
  }
  
  // Convert images to Base64
  console.log('Converting images to Base64...')
  const base64Image1 = imageToBase64(image1Path)
  const base64Image2 = imageToBase64(image2Path)
  
  console.log(`Image 1 Base64 size: ${(base64Image1.length / 1024 / 1024).toFixed(2)} MB`)
  console.log(`Image 2 Base64 size: ${(base64Image2.length / 1024 / 1024).toFixed(2)} MB`)
  
  // Prepare JSON payload
  const payload = {
    prompt: "Combine these images into a beautiful collage with vibrant colors",
    base64Images: [base64Image1, base64Image2],
    settings: {
      aspect_ratio: "1:1",
      enable_safety_checker: true
    },
    useCanonicalPrompt: false,
    orgType: "general"
  }
  
  console.log('\nSending request to API...')
  console.log(`Endpoint: ${API_URL}`)
  console.log(`Method: POST (JSON)`)
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    
    console.log(`\nResponse status: ${response.status}`)
    
    const result = await response.json()
    
    if (!response.ok) {
      console.error('\n❌ Request failed:')
      console.error(JSON.stringify(result, null, 2))
      return
    }
    
    console.log('\n✅ Success!')
    console.log('\nResult:')
    console.log(JSON.stringify(result, null, 2))
    
    if (result.images && result.images.length > 0) {
      console.log('\n📸 Generated image URL:')
      console.log(result.images[0].url)
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message)
  }
}

/**
 * Test with mixed URLs and Base64
 */
async function testWithMixedInputs() {
  console.log('\n=== Test: Mixed URL + Base64 (JSON) ===\n')
  
  const imagePath = './test-image-1.jpg'
  
  if (!fs.existsSync(imagePath)) {
    console.log('⚠️  Test image not found:', imagePath)
    console.log('Skipping test...')
    return
  }
  
  const base64Image = imageToBase64(imagePath)
  
  const payload = {
    prompt: "Artistic fusion of these two images",
    imageUrls: ["https://example.com/image1.jpg"], // First image from URL
    base64Images: [base64Image],                    // Second image from Base64
    settings: {
      aspect_ratio: "16:9"
    }
  }
  
  console.log('Sending mixed URL + Base64 request...')
  console.log(`Image URL: ${payload.imageUrls[0]}`)
  console.log(`Base64 size: ${(base64Image.length / 1024 / 1024).toFixed(2)} MB`)
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    
    const result = await response.json()
    
    if (!response.ok) {
      console.error('\n❌ Request failed:')
      console.error(JSON.stringify(result, null, 2))
      return
    }
    
    console.log('\n✅ Success!')
    console.log(JSON.stringify(result, null, 2))
    
  } catch (error) {
    console.error('\n❌ Error:', error.message)
  }
}

/**
 * Test with FormData (ONLY for file uploads)
 */
async function testWithFormDataBase64() {
  console.log('\n=== Test: FormData with Base64 (NOT RECOMMENDED) ===\n')
  console.log('⚠️  WARNING: FormData has 1MB limit in Next.js 15 for Base64 strings.')
  console.log('Use JSON payload instead (see testWithBase64JSON) for Base64/URLs.\n')
  console.log('FormData should ONLY be used for actual file uploads (File objects).\n')
  
  const imagePath = './test-image-small.jpg'
  
  if (!fs.existsSync(imagePath)) {
    console.log('⚠️  Small test image not found:', imagePath)
    console.log('Skipping test...')
    return
  }
  
  const base64Image = imageToBase64(imagePath)
  
  console.log('⚠️  This test is for demonstration only.')
  console.log('In production, always use JSON for Base64 images.\n')
  
  const formData = new FormData()
  formData.append('prompt', 'Beautiful combination of these images')
  formData.append('imageBase640', base64Image)
  formData.append('imageUrl1', 'https://example.com/image2.jpg')
  formData.append('settings', JSON.stringify({ aspect_ratio: '1:1' }))
  
  console.log(`Base64 size: ${(base64Image.length / 1024).toFixed(2)} KB`)
  
  if (base64Image.length > 1048576) {
    console.log(`❌ Image will be truncated! Size: ${(base64Image.length / 1024 / 1024).toFixed(2)} MB > 1MB limit`)
    console.log('Use JSON payload instead.')
    return
  }
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      body: formData
    })
    
    const result = await response.json()
    
    if (!response.ok) {
      console.error('\n❌ Request failed:')
      console.error(JSON.stringify(result, null, 2))
      return
    }
    
    console.log('\n✅ Success!')
    console.log(JSON.stringify(result, null, 2))
    
  } catch (error) {
    console.error('\n❌ Error:', error.message)
  }
}

// Run tests
async function runTests() {
  console.log('🧪 External Seedream Combine - Base64 Support Tests')
  console.log('===================================================')
  
  // Test 1: JSON with Base64 (recommended for large images)
  await testWithBase64JSON()
  
  // Test 2: Mixed inputs (URL + Base64)
  // await testWithMixedInputs()
  
  // Test 3: FormData with small Base64
  // await testWithFormDataBase64()
  
  console.log('\n✅ Tests completed!')
}

runTests().catch(console.error)
