/**
 * Simple test for Seedream Single Edit endpoint
 * Tests with minimal parameters to debug the 422 error
 */

const FormData = require('form-data');
const fetch = require('node-fetch');

async function testSeedreamSingleEditSimple() {
  try {
    console.log('🧪 Testing Seedream Single Edit (Simple)...\n');

    const formData = new FormData();
    
    // Minimal test data
    formData.append('prompt', 'make this image more colorful');
    formData.append('imageUrl', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80');
    
    // Minimal settings - only the basic ones
    formData.append('settings', JSON.stringify({
      aspect_ratio: "1:1",
      num_images: 1,
      enable_safety_checker: true
    }));
    
    console.log('📤 Making request with minimal parameters...');

    const response = await fetch('http://localhost:3000/api/seedream-single-edit', {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });

    console.log('📥 Response status:', response.status);
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Success!');
      console.log('- Generated images:', result.images?.length || 0);
      console.log('- Model:', result.model);
      console.log('- Settings used:', result.settings);
    } else {
      console.log('❌ Error:', result.error);
      console.log('- Details:', result.details);
      console.log('- Input used:', result.inputUsed);
    }

  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

if (require.main === module) {
  testSeedreamSingleEditSimple();
}

module.exports = { testSeedreamSingleEditSimple };