/**
 * Test script for Seedream Combine endpoint using fal.ai
 * Tests the updated /api/seedream-ark-combine endpoint with fal.ai
 */

const FormData = require('form-data');
const fetch = require('node-fetch');

async function testSeedreamCombine() {
  try {
    console.log('🧪 Testing Seedream Combine endpoint with fal.ai...\n');

    const formData = new FormData();
    
    // Test prompt
    const prompt = "Combine these two images into a beautiful artistic fusion with vibrant colors and magical elements";
    formData.append('prompt', prompt);
    
    // Test with image URLs
    const imageUrl1 = "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80"; // Mountain landscape
    const imageUrl2 = "https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=800&q=80"; // Lake landscape
    
    formData.append('imageUrl0', imageUrl1);
    formData.append('imageUrl1', imageUrl2);
    
    // Test settings
    const settings = {
      size: "2K",
      maxImages: 1,
      watermark: false
    };
    formData.append('settings', JSON.stringify(settings));
    
    console.log('📤 Request details:');
    console.log('- Endpoint: /api/seedream-ark-combine');
    console.log('- Model: fal-ai/bytedance/seedream/v4/edit');
    console.log('- Prompt:', prompt);
    console.log('- Image URL 1:', imageUrl1);
    console.log('- Image URL 2:', imageUrl2);
    console.log('- Settings:', settings);
    console.log('');

    const response = await fetch('http://localhost:3000/api/seedream-ark-combine', {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });

    console.log('📥 Response status:', response.status);
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Success! Seedream Combine is working with fal.ai');
      console.log('- Generated images:', result.images?.length || 0);
      if (result.images && result.images.length > 0) {
        result.images.forEach((img, index) => {
          console.log(`  Image ${index + 1}: ${img.url}`);
          console.log(`  Size: ${img.width}x${img.height}`);
        });
      }
      console.log('- Model used:', result.model);
      console.log('- Provider:', result.provider);
      console.log('- Final prompt:', result.prompt);
      
    } else {
      console.log('❌ Error:');
      console.log('- Status:', response.status);
      console.log('- Error message:', result.error);
      console.log('- Details:', result.details);
      
      if (result.error?.includes('FAL_API_KEY')) {
        console.log('\n💡 Make sure FAL_API_KEY is configured in .env.local');
      }
      
      if (result.error?.includes('ARK')) {
        console.log('\n⚠️  WARNING: Still references ARK! Need to clean up code.');
      }
    }

  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

// Also test error conditions
async function testErrorConditions() {
  console.log('\n🧪 Testing error conditions...');
  
  // Test missing prompt
  try {
    const formData = new FormData();
    formData.append('imageUrl0', 'https://example.com/image1.jpg');
    formData.append('imageUrl1', 'https://example.com/image2.jpg');
    // No prompt
    
    const response = await fetch('http://localhost:3000/api/seedream-ark-combine', {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });
    
    const result = await response.json();
    console.log('Missing prompt test:', response.status === 400 ? '✅ Handled correctly' : '❌ Should return 400');
    
  } catch (error) {
    console.log('Missing prompt test failed:', error.message);
  }
  
  // Test missing images
  try {
    const formData = new FormData();
    formData.append('prompt', 'test prompt');
    // No images
    
    const response = await fetch('http://localhost:3000/api/seedream-ark-combine', {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });
    
    const result = await response.json();
    console.log('Missing images test:', response.status === 400 ? '✅ Handled correctly' : '❌ Should return 400');
    
  } catch (error) {
    console.log('Missing images test failed:', error.message);
  }
}

if (require.main === module) {
  console.log('🚀 Starting Seedream Combine Tests (fal.ai)\n');
  testSeedreamCombine()
    .then(() => testErrorConditions())
    .then(() => {
      console.log('\n✨ Test suite completed!');
      console.log('\n📋 Summary:');
      console.log('- Endpoint: /api/seedream-ark-combine');
      console.log('- Provider: fal.ai (NOT ARK)');
      console.log('- Model: fal-ai/bytedance/seedream/v4/edit');
      console.log('- Function: Combine 2 images using Seedream v4');
    })
    .catch(err => {
      console.error('\n💥 Test suite failed:', err);
    });
}

module.exports = { testSeedreamCombine, testErrorConditions };