// Test script for Flux LoRA endpoint with RAG integration
// Run with: node test-flux-pro-lora.js

const FormData = require('form-data');
const fetch = require('node-fetch');

async function testFluxLoRA() {
  console.log('🧪 Testing Flux LoRA with RAG Integration');
  console.log('==========================================');
  console.log('   • Model: fal-ai/flux-lora');
  console.log('   • Strategy: Hybrid (RAG + LoRA optimization)');
  console.log('   • Cost: $0.035 per megapixel');
  console.log('');
  
  const formData = new FormData();
  
  // Test prompt
  formData.append('prompt', 'A modern professional workspace with sustainable design elements');
  formData.append('useRag', 'true');
  formData.append('activeRAGId', 'egp-branding');
  formData.append('activeRAGName', 'EGP Branding Guidelines');
  
  // Test settings with LoRA and updated parameters
  const settings = {
    image_size: "landscape_4_3",
    num_inference_steps: 28,
    guidance_scale: 3.5,
    num_images: 1,
    enable_safety_checker: true,  // Updated parameter
    output_format: "png",
    loras: [{
      path: "https://v3.fal.media/files/kangaroo/bUQL-AZq6ctnB1gifw2ku_pytorch_lora_weights.safetensors",
      scale: 1.0
    }]
  };
  
  formData.append('settings', JSON.stringify(settings));
  formData.append('orgType', 'general');
  
  console.log('🚀 Sending request to Flux LoRA endpoint...');
  console.log('   Prompt: A modern professional workspace with sustainable design elements');
  console.log('   RAG: ✅ Enabled');
  console.log('   LoRA: ✅ Enabled');
  console.log('   Settings:', JSON.stringify(settings, null, 2));
  console.log('');
  
  try {
    const response = await fetch('http://localhost:3000/api/flux-pro-text-to-image', {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders(),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Request failed:', response.status, errorText);
      return;
    }
    
    const result = await response.json();
    console.log('✅ Success! Flux LoRA generation completed');
    console.log('📊 Result:', {
      success: result.success,
      imageUrl: result.image ? result.image.substring(0, 100) + '...' : 'No image',
      hasImages: !!result.images,
      imageCount: result.images?.length || 0,
      model: result.model,
      finalPrompt: result.finalPrompt?.substring(0, 100) + '...' || 'No final prompt',
      ragApplied: !!result.ragMetadata
    });
    
    if (result.ragMetadata) {
      console.log('🎨 RAG Enhancement:', {
        originalPrompt: result.ragMetadata.originalPrompt?.substring(0, 50) + '...',
        enhancedPrompt: result.ragMetadata.enhancedPrompt?.substring(0, 50) + '...',
        brandingElements: result.ragMetadata.brandingElements || 0
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

console.log('🎯 Starting Flux LoRA test...');
testFluxLoRA().then(() => {
  console.log('\n🏁 Test completed!');
}).catch(console.error);
