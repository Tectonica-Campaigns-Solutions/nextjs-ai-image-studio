// Test script for Flux Pro endpoint with LoRA
// Run with: node test-flux-pro-lora.js

const FormData = require('form-data');
const fetch = require('node-fetch');

async function testFluxProLoRA() {
  const formData = new FormData();
  
  // Test prompt
  formData.append('prompt', 'A beautiful landscape with mountains');
  formData.append('useRag', 'false');
  
  // Test settings with LoRA
  const settings = {
    image_size: "landscape_4_3",
    num_inference_steps: 20,
    guidance_scale: 3.5,
    num_images: 1,
    safety_tolerance: 2,
    output_format: "jpg",
    loras: [{
      path: "https://v3.fal.media/files/kangaroo/bUQL-AZq6ctnB1gifw2ku_pytorch_lora_weights.safetensors",
      scale: 1.0
    }]
  };
  
  formData.append('settings', JSON.stringify(settings));
  formData.append('orgType', 'general');
  
  console.log('Testing Flux Pro endpoint with LoRA...');
  console.log('Settings being sent:', JSON.stringify(settings, null, 2));
  
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
    console.log('Success!');
    console.log('Result:', {
      success: result.success,
      imageUrl: result.image ? result.image.substring(0, 100) + '...' : 'No image',
      hasImages: !!result.images,
      imageCount: result.images?.length || 0
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testFluxProLoRA();
