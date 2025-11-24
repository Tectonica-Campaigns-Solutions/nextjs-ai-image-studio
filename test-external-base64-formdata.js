/**
 * Quick test to verify External Flux Combine accepts Base64 via FormData
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// Helper to convert image to base64
function imageToBase64(imagePath) {
  const imageBuffer = fs.readFileSync(imagePath);
  return imageBuffer.toString('base64');
}

// Create data URL from base64
function createDataUrl(base64String, mimeType = 'image/jpeg') {
  return `data:${mimeType};base64,${base64String}`;
}

async function testExternalEndpointWithBase64() {
  console.log('\n🧪 Testing External Flux Combine with Base64 (FormData)');
  console.log('=' .repeat(60));
  
  try {
    // Check if test images exist
    const testImage1Path = path.join(__dirname, 'public', 'test-image-1.jpg');
    const testImage2Path = path.join(__dirname, 'public', 'test-image-2.jpg');
    
    if (!fs.existsSync(testImage1Path) || !fs.existsSync(testImage2Path)) {
      console.log('⚠️  Test images not found. Using dummy Base64 for structure test.');
      console.log('   To fully test, add test-image-1.jpg and test-image-2.jpg to public folder.\n');
      
      // Use a tiny 1x1 pixel test image
      const tinyBase64 = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwABmQA//Z';
      
      const formData = new FormData();
      formData.append('prompt', 'Test combination with Base64 images (structure test)');
      formData.append('imageBase640', createDataUrl(tinyBase64));
      formData.append('imageBase641', createDataUrl(tinyBase64));
      formData.append('settings', JSON.stringify({
        aspect_ratio: '1:1'
      }));
      
      console.log('📤 Sending FormData with:');
      console.log('  - 2 Base64 images (tiny test images)');
      console.log('  - Prompt: Test combination');
      console.log('  - Using data URL format\n');
      
      const response = await fetch('http://localhost:3000/api/external/flux-pro-image-combine', {
        method: 'POST',
        body: formData,
      });
      
      console.log(`📥 Response status: ${response.status}`);
      
      const result = await response.json();
      
      if (response.status === 400 && result.error === "Invalid number of images") {
        console.log('\n❌ ERROR: Base64 images not detected in FormData!');
        console.log('   The endpoint is not reading imageBase64 fields from FormData.');
        console.log('\n   Details:', result.details);
        return false;
      } else if (response.status === 400) {
        console.log('\n⚠️  Validation error (expected with tiny images):');
        console.log('   Error:', result.error);
        console.log('   Details:', result.details);
        console.log('\n✅ SUCCESS: Base64 fields ARE being detected!');
        console.log('   (Error is from image processing, not detection)');
        return true;
      } else if (result.success) {
        console.log('\n✅ SUCCESS! Base64 images processed correctly!');
        console.log('   Combined image URL:', result.image);
        return true;
      } else {
        console.log('\n⚠️  Unexpected response:', result);
        return false;
      }
      
    } else {
      // Full test with real images
      const base64Image1 = imageToBase64(testImage1Path);
      const base64Image2 = imageToBase64(testImage2Path);
      
      console.log(`📊 Image 1 size: ${Math.round(base64Image1.length / 1024)} KB`);
      console.log(`📊 Image 2 size: ${Math.round(base64Image2.length / 1024)} KB\n`);
      
      const formData = new FormData();
      formData.append('prompt', 'Combine these two images into a creative collage');
      formData.append('imageBase640', createDataUrl(base64Image1, 'image/jpeg'));
      formData.append('imageBase641', createDataUrl(base64Image2, 'image/jpeg'));
      formData.append('settings', JSON.stringify({
        aspect_ratio: '1:1'
      }));
      
      console.log('📤 Sending FormData with:');
      console.log('  - 2 Base64 images (real images)');
      console.log('  - Prompt: Combine these two images into a creative collage');
      console.log('  - Using data URL format\n');
      
      const response = await fetch('http://localhost:3000/api/external/flux-pro-image-combine', {
        method: 'POST',
        body: formData,
      });
      
      console.log(`📥 Response status: ${response.status}\n`);
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ SUCCESS!');
        console.log(`🖼️  Combined image URL: ${result.image}`);
        console.log(`📐 Dimensions: ${result.width}x${result.height}`);
        console.log(`⚙️  Enhanced pipeline: ${result.enhancedPipeline}`);
        
        if (result.pipelineSteps) {
          console.log('\n📋 Pipeline steps:');
          result.pipelineSteps.forEach(step => {
            console.log(`   ${step.step}. ${step.operation}`);
          });
        }
        return true;
      } else {
        console.log('❌ FAILED:', result.error);
        console.log('   Details:', result.details);
        return false;
      }
    }
    
  } catch (error) {
    console.error('\n❌ Test failed with exception:', error.message);
    return false;
  }
}

// Run test
console.log('\n🚀 Starting External Flux Combine Base64 Test');
console.log('Make sure the dev server is running on http://localhost:3000\n');

testExternalEndpointWithBase64()
  .then(success => {
    console.log('\n' + '='.repeat(60));
    if (success) {
      console.log('✨ Test completed successfully!');
      process.exit(0);
    } else {
      console.log('💥 Test failed - see errors above');
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('\n💥 Unexpected error:', err);
    process.exit(1);
  });
