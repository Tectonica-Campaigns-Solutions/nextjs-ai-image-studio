// Test script for Hybrid Enhancement (RAG + Flux Pro enhance_prompt)
const FormData = require('form-data');

async function testHybridEnhancement() {
  console.log('🧪 Testing Hybrid Enhancement Strategy');
  console.log('=====================================');
  
  try {
    // Test Case 1: With RAG + enhance_prompt
    console.log('\n1️⃣ Testing WITH RAG Enhancement');
    console.log('Expected: RAG branding + Flux Pro optimization');
    
    const formData = new FormData();
    formData.append('prompt', 'A modern office building with sustainable features');
    formData.append('useRag', 'true');
    formData.append('activeRAGId', 'egp-branding');
    formData.append('activeRAGName', 'EGP Branding');
    formData.append('orgType', 'general');
    formData.append('settings', JSON.stringify({
      image_size: 'square_hd',
      num_inference_steps: 28,
      guidance_scale: 3.5,
      num_images: 1,
      output_format: 'png'
    }));

    const response1 = await fetch('http://localhost:3000/api/flux-pro-text-to-image', {
      method: 'POST',
      body: formData
    });

    if (response1.ok) {
      const result1 = await response1.json();
      console.log('✅ RAG + Flux Pro Enhancement SUCCESS');
      console.log('   Original prompt:', 'A modern office building with sustainable features');
      console.log('   Final prompt:', result1.finalPrompt?.substring(0, 150) + '...');
      console.log('   Image URL:', result1.image || 'No image URL');
      console.log('   RAG metadata:', result1.ragMetadata ? 'Present' : 'Missing');
    } else {
      const error1 = await response1.text();
      console.log('❌ RAG + Flux Pro Enhancement FAILED:', error1);
    }

    // Test Case 2: Without RAG but with enhance_prompt
    console.log('\n2️⃣ Testing WITHOUT RAG Enhancement');
    console.log('Expected: Original prompt + Flux Pro optimization only');
    
    const formData2 = new FormData();
    formData2.append('prompt', 'A futuristic city skyline at sunset');
    formData2.append('useRag', 'false');
    formData2.append('orgType', 'general');
    formData2.append('settings', JSON.stringify({
      image_size: 'landscape_4_3',
      num_inference_steps: 28,
      guidance_scale: 3.5,
      num_images: 1,
      output_format: 'png'
    }));

    const response2 = await fetch('http://localhost:3000/api/flux-pro-text-to-image', {
      method: 'POST',
      body: formData2
    });

    if (response2.ok) {
      const result2 = await response2.json();
      console.log('✅ Flux Pro Enhancement Only SUCCESS');
      console.log('   Original prompt:', 'A futuristic city skyline at sunset');
      console.log('   Final prompt:', result2.finalPrompt);
      console.log('   Image URL:', result2.image || 'No image URL');
      console.log('   RAG metadata:', result2.ragMetadata ? 'Present' : 'Missing');
    } else {
      const error2 = await response2.text();
      console.log('❌ Flux Pro Enhancement Only FAILED:', error2);
    }

    console.log('\n🎯 Hybrid Enhancement Strategy Summary:');
    console.log('   • RAG Enhancement: Applied when useRag=true');
    console.log('   • Flux Pro Enhancement: ALWAYS enabled (enhance_prompt: true)');
    console.log('   • Result: Best of both worlds - brand consistency + AI optimization');

  } catch (error) {
    console.error('🚫 Test failed:', error.message);
  }
}

// Run the test
testHybridEnhancement();
