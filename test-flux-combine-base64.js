/**
 * Test script for Flux Pro Image Combine with Base64 support
 * Tests the base64 image input functionality
 */

const FormData = require('form-data');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

/**
 * Helper function to convert image file to base64
 */
function imageToBase64(imagePath) {
  try {
    const imageBuffer = fs.readFileSync(imagePath);
    const base64 = imageBuffer.toString('base64');
    const ext = path.extname(imagePath).toLowerCase();
    
    let mimeType = 'image/jpeg';
    if (ext === '.png') mimeType = 'image/png';
    else if (ext === '.webp') mimeType = 'image/webp';
    
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error('Error converting image to base64:', error);
    return null;
  }
}

/**
 * Test 1: Base64 images (both images as base64)
 */
async function testBase64Images() {
  console.log('\n🧪 Test 1: Two base64 images\n');
  
  try {
    // Create simple test images in base64 (1x1 pixel PNG)
    const redPixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
    const bluePixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    
    const formData = new FormData();
    formData.append('prompt', 'Combine these two images into an artistic composition');
    formData.append('imageBase640', redPixel);
    formData.append('imageBase641', bluePixel);
    formData.append('settings', JSON.stringify({
      aspect_ratio: '1:1',
      num_images: 1
    }));
    
    console.log('📤 Sending request with 2 base64 images...');
    
    const response = await fetch('http://localhost:3000/api/flux-pro-image-combine', {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Success!');
      console.log('- Image URL:', result.image);
      console.log('- Pipeline steps:', result.pipelineSteps?.length || 0);
      console.log('- Enhanced pipeline:', result.enhancedPipeline);
    } else {
      console.log('❌ Error:', result.error);
      console.log('- Details:', result.details);
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

/**
 * Test 2: Mixed input (1 base64 + 1 URL)
 */
async function testMixedInputs() {
  console.log('\n🧪 Test 2: One base64 + one URL\n');
  
  try {
    const testPixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
    const testUrl = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80';
    
    const formData = new FormData();
    formData.append('prompt', 'Create a beautiful landscape composition');
    formData.append('imageBase640', testPixel);
    formData.append('imageUrl1', testUrl);
    formData.append('settings', JSON.stringify({
      aspect_ratio: '16:9',
      num_images: 1
    }));
    
    console.log('📤 Sending request with mixed inputs...');
    
    const response = await fetch('http://localhost:3000/api/flux-pro-image-combine', {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Success!');
      console.log('- Image URL:', result.image);
      console.log('- Original prompt:', result.originalPrompt);
      console.log('- Final prompt:', result.prompt);
    } else {
      console.log('❌ Error:', result.error);
      console.log('- Details:', result.details);
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

/**
 * Test 3: Base64 without data URL prefix
 */
async function testBase64WithoutPrefix() {
  console.log('\n🧪 Test 3: Base64 without data URL prefix\n');
  
  try {
    // Base64 without "data:image/png;base64," prefix
    const rawBase64_1 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
    const rawBase64_2 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    
    const formData = new FormData();
    formData.append('prompt', 'Combine these colorful images');
    formData.append('imageBase640', rawBase64_1);
    formData.append('imageBase641', rawBase64_2);
    formData.append('settings', JSON.stringify({
      aspect_ratio: '1:1'
    }));
    
    console.log('📤 Sending request with raw base64...');
    
    const response = await fetch('http://localhost:3000/api/flux-pro-image-combine', {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Success!');
      console.log('- Combined image generated');
    } else {
      console.log('❌ Error:', result.error);
      console.log('- Details:', result.details);
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

/**
 * Test 4: Error cases
 */
async function testErrorCases() {
  console.log('\n🧪 Test 4: Error cases\n');
  
  // Test invalid base64
  try {
    console.log('Testing invalid base64...');
    const formData = new FormData();
    formData.append('prompt', 'Test prompt');
    formData.append('imageBase640', 'not-valid-base64!!!');
    formData.append('imageBase641', 'also-invalid###');
    
    const response = await fetch('http://localhost:3000/api/flux-pro-image-combine', {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });
    
    const result = await response.json();
    console.log(response.status === 400 ? '✅ Correctly rejected invalid base64' : '❌ Should reject invalid base64');
    if (!response.ok) {
      console.log('  Error:', result.error);
    }
  } catch (error) {
    console.error('Test error:', error.message);
  }
  
  // Test too large base64
  try {
    console.log('\nTesting oversized base64...');
    // Create a very large base64 string (>10MB)
    const largeBase64 = 'data:image/png;base64,' + 'A'.repeat(15 * 1024 * 1024); // ~15MB
    
    const formData = new FormData();
    formData.append('prompt', 'Test prompt');
    formData.append('imageBase640', largeBase64);
    formData.append('imageBase641', 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
    
    const response = await fetch('http://localhost:3000/api/flux-pro-image-combine', {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });
    
    const result = await response.json();
    console.log(response.status === 400 ? '✅ Correctly rejected oversized image' : '❌ Should reject oversized image');
    if (!response.ok) {
      console.log('  Error:', result.error);
    }
  } catch (error) {
    console.error('Test error:', error.message);
  }
  
  // Test wrong number of images
  try {
    console.log('\nTesting wrong number of images (only 1)...');
    const formData = new FormData();
    formData.append('prompt', 'Test prompt');
    formData.append('imageBase640', 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==');
    
    const response = await fetch('http://localhost:3000/api/flux-pro-image-combine', {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });
    
    const result = await response.json();
    console.log(response.status === 400 ? '✅ Correctly rejected single image' : '❌ Should require 2 images');
    if (!response.ok) {
      console.log('  Error:', result.error);
    }
  } catch (error) {
    console.error('Test error:', error.message);
  }
}

/**
 * Test 5: Large realistic base64 images
 */
async function testLargeBase64() {
  console.log('\n🧪 Test 5: Large realistic base64 images\n');
  
  try {
    // These are small test images but in realistic format
    const redSquare = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC';
    const blueSquare = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNkYPhfz0AEYBxVSF+FAP5FDvcKfGLTAAAAAElFTkSuQmCC';
    
    const formData = new FormData();
    formData.append('prompt', 'Create an artistic blend of these colorful squares');
    formData.append('imageBase640', redSquare);
    formData.append('imageBase641', blueSquare);
    formData.append('useJSONEnhancement', 'true');
    formData.append('settings', JSON.stringify({
      aspect_ratio: '1:1',
      guidance_scale: 3.5,
      num_images: 1
    }));
    
    console.log('📤 Sending request with realistic base64 images...');
    
    const response = await fetch('http://localhost:3000/api/flux-pro-image-combine', {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Success!');
      console.log('- Combined image URL:', result.image);
      console.log('- Enhanced pipeline used:', result.enhancedPipeline);
      console.log('- Pipeline steps:');
      result.pipelineSteps?.forEach((step, idx) => {
        console.log(`  Step ${step.step}: ${step.operation}`);
      });
    } else {
      console.log('❌ Error:', result.error);
      console.log('- Details:', result.details);
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

// Run all tests
if (require.main === module) {
  console.log('🚀 Starting Flux Pro Image Combine Base64 Tests\n');
  console.log('=' .repeat(60));
  
  testBase64Images()
    .then(() => testMixedInputs())
    .then(() => testBase64WithoutPrefix())
    .then(() => testErrorCases())
    .then(() => testLargeBase64())
    .then(() => {
      console.log('\n' + '='.repeat(60));
      console.log('✨ Test suite completed!\n');
      console.log('📋 Summary:');
      console.log('- Endpoint: /api/flux-pro-image-combine');
      console.log('- New feature: Base64 image support');
      console.log('- Supported formats:');
      console.log('  • data:image/jpeg;base64,<base64>');
      console.log('  • data:image/png;base64,<base64>');
      console.log('  • <raw-base64-string>');
      console.log('- Size limit: 10MB per image');
      console.log('- Compatible with: URLs, Files, and Base64');
    })
    .catch(err => {
      console.error('\n💥 Test suite failed:', err);
    });
}

module.exports = { 
  testBase64Images, 
  testMixedInputs, 
  testBase64WithoutPrefix,
  testErrorCases,
  testLargeBase64,
  imageToBase64
};
