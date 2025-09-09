// Test script for External Flux Pro API with LoRA
// Run with: node test-external-flux-pro.js

import fetch from 'node-fetch';

async function testExternalFluxPro() {
  const payload = {
    prompt: "A beautiful landscape with mountains",
    useRAG: false,
    useLoRA: true,
    loraUrl: "https://v3.fal.media/files/tiger/yrGqT2PRYptZkykFqxQRL_pytorch_lora_weights.safetensors",
    loraTriggerPhrase: "TCT-AI-9-9-2025A",
    loraScale: 1.3,
    settings: {
      image_size: "landscape_4_3",
      num_inference_steps: 25,
      guidance_scale: 3.5,
      num_images: 1,
      safety_tolerance: 2,
      output_format: "jpg"
    }
  };
  
  console.log('Testing External Flux Pro API with LoRA...');
  console.log('Payload being sent:', JSON.stringify(payload, null, 2));
  
  try {
    const response = await fetch('http://localhost:3000/api/external/flux-pro-text-to-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Request failed:', errorText);
      return;
    }
    
    const result = await response.json();
    console.log('Success!');
    console.log('External API Result:', {
      success: result.success,
      model: result.model,
      imageUrl: result.image ? result.image.substring(0, 80) + '...' : 'No image',
      hasImages: !!result.images,
      imageCount: result.images?.length || 0,
      loraApplied: result.prompt?.lora_applied,
      loraConfig: result.prompt?.lora_config
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testExternalFluxPro();
