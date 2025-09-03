#!/usr/bin/env node

/**
 * External API Test Script
 * 
 * This script demonstrates how to use the external API endpoints.
 * Run with: node test-external-api.js
 */

const BASE_URL = 'http://localhost:3000/api/external';

async function testConfigEndpoint() {
  console.log('🔧 Testing Config Endpoint...');
  
  try {
    const response = await fetch(`${BASE_URL}/config`);
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Config endpoint working!');
      console.log('Available features:');
      console.log(`- Text-to-Image: ${data.config.textToImage.endpoint}`);
      console.log(`- Edit Image: ${data.config.editImage.endpoint}`);
      console.log(`- RAG Available: ${data.config.rag.available}`);
      console.log(`- LoRA Available: ${data.config.lora.available}`);
      console.log(`- Guardrails: ${data.config.guardrails.enabled}`);
    } else {
      console.log('❌ Config endpoint failed:', data.error);
    }
  } catch (error) {
    console.log('❌ Config endpoint error:', error.message);
  }
  
  console.log('');
}

async function testTextToImageEndpoint() {
  console.log('🖼️  Testing Text-to-Image Endpoint...');
  
  try {
    const requestBody = {
      prompt: "A peaceful landscape with mountains and a lake, professional photography style",
      useRAG: true,
      useLoRA: false,
      settings: {
        image_size: "landscape_4_3",
        num_inference_steps: 20, // Reduced for faster testing
        guidance_scale: 2.5,
        num_images: 1
      }
    };
    
    console.log('📤 Sending request with prompt:', requestBody.prompt);
    
    const response = await fetch(`${BASE_URL}/text-to-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Text-to-Image generation successful!');
      console.log('🖼️  Generated image URL:', data.image);
      console.log('📝 Final prompt used:', data.prompt.final);
      console.log('🎨 RAG enhanced:', data.prompt.enhanced);
    } else {
      console.log('❌ Text-to-Image failed:', data.error);
      if (data.moderation) {
        console.log('🚫 Content moderation triggered');
      }
    }
  } catch (error) {
    console.log('❌ Text-to-Image error:', error.message);
  }
  
  console.log('');
}

async function testEditImageEndpoint() {
  console.log('✏️  Testing Edit Image Endpoint...');
  
  try {
    // Note: This test will fail without an actual image file
    // In a real test, you would use FormData with an actual image file
    
    console.log('📝 This test requires an actual image file to work properly.');
    console.log('📖 Example usage:');
    console.log(`
const formData = new FormData();
formData.append('image', imageFile); // Your image file
formData.append('prompt', 'change the sky to sunset colors');
formData.append('useRAG', 'true');

const response = await fetch('${BASE_URL}/edit-image', {
  method: 'POST',
  body: formData
});
    `);
    
    // Test with invalid data to see error handling
    const response = await fetch(`${BASE_URL}/edit-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: "test prompt"
      })
    });
    
    const data = await response.json();
    console.log('❌ Expected error (no image file):', data.error);
    
  } catch (error) {
    console.log('❌ Edit Image error:', error.message);
  }
  
  console.log('');
}

async function testContentModeration() {
  console.log('🚫 Testing Content Moderation...');
  
  try {
    const badPrompt = "Generate explicit violent content with weapons";
    
    const response = await fetch(`${BASE_URL}/text-to-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: badPrompt,
        useRAG: false
      })
    });
    
    const data = await response.json();
    
    if (!data.success && data.moderation) {
      console.log('✅ Content moderation working correctly!');
      console.log('🚫 Blocked prompt:', badPrompt);
      console.log('💬 Friendly message:', data.error);
    } else {
      console.log('⚠️  Content moderation may not be working as expected');
    }
  } catch (error) {
    console.log('❌ Content moderation test error:', error.message);
  }
  
  console.log('');
}

async function runAllTests() {
  console.log('🧪 External API Test Suite');
  console.log('==========================');
  console.log('');
  
  await testConfigEndpoint();
  await testTextToImageEndpoint();
  await testEditImageEndpoint();
  await testContentModeration();
  
  console.log('🏁 Test suite completed!');
  console.log('');
  console.log('📚 For full documentation, see EXTERNAL_API.md');
}

// Check if we're running this script directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
}

export { testConfigEndpoint, testTextToImageEndpoint, testEditImageEndpoint, testContentModeration };
