/**
 * Test script for Seedream Single Edit endpoint
 * Tests the new /api/seedream-single-edit endpoint with sample image URLs
 */

const FormData = require('form-data');
const fetch = require('node-fetch');

async function testSeedreamSingleEdit() {
  try {
    console.log('🧪 Testing Seedream Single Edit endpoint with fal.ai...\n');

    const formData = new FormData();
    
    // Test prompt
    const prompt = "Transform this image into a beautiful artistic painting with vibrant colors and impressionist style";
    formData.append('prompt', prompt);
    
    // Test with image URL
    const imageUrl = "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80"; // Mountain landscape
    formData.append('imageUrl', imageUrl);
    
    // Test settings
    const settings = {
      aspect_ratio: "1:1",
      num_images: 1,
      num_inference_steps: 20,
      guidance_scale: 7.5,
      strength: 0.8,
      enable_safety_checker: true,
      negative_prompt: "blurry, low quality, distorted",
      seed: "42"
    };
    formData.append('settings', JSON.stringify(settings));
    
    console.log('📤 Request details:');
    console.log('- Endpoint: /api/seedream-single-edit');
    console.log('- Model: fal-ai/bytedance/seedream/v4/edit');
    console.log('- Prompt:', prompt);
    console.log('- Image URL:', imageUrl);
    console.log('- Settings:', settings);
    console.log('');

    const response = await fetch('http://localhost:3000/api/seedream-single-edit', {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });

    console.log('📥 Response status:', response.status);
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Success! Seedream Single Edit is working with fal.ai');
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
      console.log('- Applied settings:', result.settings);
      
    } else {
      console.log('❌ Error:');
      console.log('- Status:', response.status);
      console.log('- Error message:', result.error);
      console.log('- Details:', result.details);
      
      if (result.error?.includes('FAL_API_KEY')) {
        console.log('\n💡 Make sure FAL_API_KEY is configured in .env.local');
      }
    }

  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

// Test different strength levels
async function testStrengthLevels() {
  console.log('\n🧪 Testing different strength levels...');
  
  const strengthLevels = [0.3, 0.5, 0.8];
  const imageUrl = "https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=800&q=80";
  const prompt = "Make this landscape look like a watercolor painting";
  
  for (const strength of strengthLevels) {
    try {
      console.log(`\n🎚️ Testing strength: ${strength}`);
      
      const formData = new FormData();
      formData.append('prompt', prompt);
      formData.append('imageUrl', imageUrl);
      formData.append('settings', JSON.stringify({
        aspect_ratio: "1:1",
        num_images: 1,
        strength: strength,
        num_inference_steps: 15,
        guidance_scale: 7.5
      }));
      
      const response = await fetch('http://localhost:3000/api/seedream-single-edit', {
        method: 'POST',
        body: formData,
        headers: formData.getHeaders()
      });
      
      const result = await response.json();
      
      if (response.ok) {
        console.log(`✅ Strength ${strength}: Success`);
        console.log(`   Generated: ${result.images?.length || 0} images`);
      } else {
        console.log(`❌ Strength ${strength}: Failed - ${result.error}`);
      }
      
    } catch (error) {
      console.log(`❌ Strength ${strength}: Error - ${error.message}`);
    }
  }
}

// Test error conditions
async function testErrorConditions() {
  console.log('\n🧪 Testing error conditions...');
  
  // Test missing prompt
  try {
    const formData = new FormData();
    formData.append('imageUrl', 'https://example.com/image.jpg');
    // No prompt
    
    const response = await fetch('http://localhost:3000/api/seedream-single-edit', {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });
    
    const result = await response.json();
    console.log('Missing prompt test:', response.status === 400 ? '✅ Handled correctly' : '❌ Should return 400');
    
  } catch (error) {
    console.log('Missing prompt test failed:', error.message);
  }
  
  // Test missing image
  try {
    const formData = new FormData();
    formData.append('prompt', 'test prompt');
    // No image
    
    const response = await fetch('http://localhost:3000/api/seedream-single-edit', {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });
    
    const result = await response.json();
    console.log('Missing image test:', response.status === 400 ? '✅ Handled correctly' : '❌ Should return 400');
    
  } catch (error) {
    console.log('Missing image test failed:', error.message);
  }
  
  // Test invalid aspect ratio
  try {
    const formData = new FormData();
    formData.append('prompt', 'test prompt');
    formData.append('imageUrl', 'https://example.com/image.jpg');
    formData.append('settings', JSON.stringify({
      aspect_ratio: "invalid_ratio"
    }));
    
    const response = await fetch('http://localhost:3000/api/seedream-single-edit', {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });
    
    const result = await response.json();
    console.log('Invalid aspect ratio test:', response.status === 400 ? '✅ Handled correctly' : '❌ Should return 400');
    
  } catch (error) {
    console.log('Invalid aspect ratio test failed:', error.message);
  }
}

// Test advanced settings
async function testAdvancedSettings() {
  console.log('\n🧪 Testing advanced settings...');
  
  try {
    const formData = new FormData();
    formData.append('prompt', 'Transform into cyberpunk style with neon lights');
    formData.append('imageUrl', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80');
    formData.append('settings', JSON.stringify({
      aspect_ratio: "16:9",
      num_images: 2,
      num_inference_steps: 30,
      guidance_scale: 12.0,
      strength: 0.7,
      enable_safety_checker: true,
      negative_prompt: "blurry, low quality, watermark, text",
      seed: "123456"
    }));
    
    const response = await fetch('http://localhost:3000/api/seedream-single-edit', {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Advanced settings test passed');
      console.log(`- Generated ${result.images?.length || 0} images`);
      console.log(`- Used settings: ${JSON.stringify(result.settings, null, 2)}`);
    } else {
      console.log('❌ Advanced settings test failed:', result.error);
    }
    
  } catch (error) {
    console.log('❌ Advanced settings test error:', error.message);
  }
}

if (require.main === module) {
  console.log('🚀 Starting Seedream Single Edit Tests (fal.ai)\n');
  testSeedreamSingleEdit()
    .then(() => testStrengthLevels())
    .then(() => testErrorConditions())
    .then(() => testAdvancedSettings())
    .then(() => {
      console.log('\n✨ Test suite completed!');
      console.log('\n📋 Summary:');
      console.log('- Endpoint: /api/seedream-single-edit');
      console.log('- Provider: fal.ai');
      console.log('- Model: fal-ai/bytedance/seedream/v4/edit');
      console.log('- Function: Edit single image using Seedream v4');
      console.log('- Features: Advanced settings, strength control, multiple aspect ratios');
    })
    .catch(err => {
      console.error('\n💥 Test suite failed:', err);
    });
}

module.exports = { testSeedreamSingleEdit, testStrengthLevels, testErrorConditions, testAdvancedSettings };