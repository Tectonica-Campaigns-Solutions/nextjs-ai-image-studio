/**
 * Test script to verify Base64 image support in the Combine Images UI
 * This simulates what the UI sends to the external API endpoint
 */

const fs = require('fs');
const path = require('path');

// Helper function to convert image to base64
function imageToBase64(imagePath) {
  const imageBuffer = fs.readFileSync(imagePath);
  return imageBuffer.toString('base64');
}

// Helper function to create data URL from base64
function createDataUrl(base64String, mimeType = 'image/jpeg') {
  return `data:${mimeType};base64,${base64String}`;
}

// Test 1: Simulate UI request with Base64 images
async function testUIBase64Request() {
  console.log('\n🧪 Test 1: UI Base64 Request Simulation');
  console.log('=' .repeat(50));
  
  try {
    // Load test images
    const testImage1Path = path.join(__dirname, 'public', 'test-image-1.jpg');
    const testImage2Path = path.join(__dirname, 'public', 'test-image-2.jpg');
    
    // Check if images exist
    if (!fs.existsSync(testImage1Path) || !fs.existsSync(testImage2Path)) {
      console.log('⚠️  Test images not found. Please add test-image-1.jpg and test-image-2.jpg to the public folder.');
      return;
    }
    
    // Convert images to base64
    const base64Image1 = imageToBase64(testImage1Path);
    const base64Image2 = imageToBase64(testImage2Path);
    
    // Create data URLs (simulating what the UI would send)
    const dataUrl1 = createDataUrl(base64Image1, 'image/jpeg');
    const dataUrl2 = createDataUrl(base64Image2, 'image/jpeg');
    
    console.log(`📊 Image 1 size: ${Math.round(base64Image1.length / 1024)} KB`);
    console.log(`📊 Image 2 size: ${Math.round(base64Image2.length / 1024)} KB`);
    
    // Prepare payload exactly as the UI would send it
    const payload = {
      prompt: "Combine these two images into a creative collage",
      imageBase640: dataUrl1,
      imageBase641: dataUrl2,
      settings: {
        aspect_ratio: "1:1"
      }
    };
    
    console.log('\n📤 Sending request to external API...');
    
    const response = await fetch('http://localhost:3000/api/external/flux-pro-image-combine', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    console.log(`📥 Response status: ${response.status}`);
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Success!');
      console.log(`🖼️  Combined image URL: ${result.image}`);
      console.log(`📐 Dimensions: ${result.width}x${result.height}`);
      console.log(`⚙️  Enhanced pipeline: ${result.enhancedPipeline}`);
      if (result.pipelineSteps) {
        console.log('\n📋 Pipeline steps:');
        result.pipelineSteps.forEach(step => {
          console.log(`   ${step.step}. ${step.operation}`);
        });
      }
    } else {
      console.log('❌ Failed:', result.error);
      console.log('   Details:', result.details);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Test 2: Mixed input - Base64 + URL
async function testMixedInput() {
  console.log('\n🧪 Test 2: Mixed Input (Base64 + URL)');
  console.log('=' .repeat(50));
  
  try {
    // Load one test image
    const testImagePath = path.join(__dirname, 'public', 'test-image-1.jpg');
    
    if (!fs.existsSync(testImagePath)) {
      console.log('⚠️  Test image not found.');
      return;
    }
    
    const base64Image = imageToBase64(testImagePath);
    const dataUrl = createDataUrl(base64Image, 'image/jpeg');
    
    // Use a public URL for the second image
    const publicImageUrl = 'https://picsum.photos/512/512';
    
    const payload = {
      prompt: "Artistic combination of these images",
      imageUrls: [publicImageUrl],
      imageBase640: dataUrl,
      settings: {
        aspect_ratio: "16:9"
      }
    };
    
    console.log('📤 Sending mixed input request...');
    console.log(`   - 1 URL: ${publicImageUrl}`);
    console.log(`   - 1 Base64 image (${Math.round(base64Image.length / 1024)} KB)`);
    
    const response = await fetch('http://localhost:3000/api/external/flux-pro-image-combine', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    console.log(`📥 Response status: ${response.status}`);
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Success!');
      console.log(`🖼️  Combined image URL: ${result.image}`);
    } else {
      console.log('❌ Failed:', result.error);
      console.log('   Details:', result.details);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Test 3: Raw Base64 without data URL prefix
async function testRawBase64() {
  console.log('\n🧪 Test 3: Raw Base64 (without data URL prefix)');
  console.log('=' .repeat(50));
  
  try {
    const testImage1Path = path.join(__dirname, 'public', 'test-image-1.jpg');
    const testImage2Path = path.join(__dirname, 'public', 'test-image-2.jpg');
    
    if (!fs.existsSync(testImage1Path) || !fs.existsSync(testImage2Path)) {
      console.log('⚠️  Test images not found.');
      return;
    }
    
    // Get raw base64 strings (no data URL prefix)
    const base64Image1 = imageToBase64(testImage1Path);
    const base64Image2 = imageToBase64(testImage2Path);
    
    const payload = {
      prompt: "Merge these images",
      imageBase640: base64Image1,  // Raw base64
      imageBase641: base64Image2,  // Raw base64
      settings: {
        aspect_ratio: "4:3"
      }
    };
    
    console.log('📤 Sending raw Base64 request...');
    console.log('   (Base64 strings without data URL prefix)');
    
    const response = await fetch('http://localhost:3000/api/external/flux-pro-image-combine', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    console.log(`📥 Response status: ${response.status}`);
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Success!');
      console.log(`🖼️  Combined image URL: ${result.image}`);
    } else {
      console.log('❌ Failed:', result.error);
      console.log('   Details:', result.details);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run all tests
async function runAllTests() {
  console.log('\n🚀 Starting UI Base64 Integration Tests');
  console.log('=' .repeat(50));
  console.log('These tests simulate what the Combine Images UI sends to the API');
  console.log('Make sure the development server is running on http://localhost:3000');
  console.log('');
  
  await testUIBase64Request();
  await testMixedInput();
  await testRawBase64();
  
  console.log('\n' + '=' .repeat(50));
  console.log('✨ All tests completed!');
}

// Run tests
runAllTests().catch(console.error);
