/**
 * Test script for internal Flux 2 Pro Edit endpoint
 * Tests multi-reference image editing with up to 9 images
 * 
 * Usage: node test-flux-2-pro-edit.js
 */

const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:3000/api/flux-2-pro-edit';

// Test with multiple image URLs
async function testFlux2ProEdit() {
  console.log('🧪 Testing Flux 2 Pro Edit with multiple reference images...\n');

  // Example: Using 3 reference images
  const testData = {
    prompt: 'Transform all subjects to have a watercolor painting style with soft, flowing colors. Keep the composition and poses identical but apply artistic watercolor effect with visible brush strokes and color bleeding.',
    
    // Option 1: Use image URLs (can be external URLs)
    imageUrls: [
      'https://storage.googleapis.com/falserverless/example_inputs/flux2_pro_edit_input.png',
      'https://storage.googleapis.com/falserverless/example_inputs/flux2_pro_edit_input.png',
      'https://storage.googleapis.com/falserverless/example_inputs/flux2_pro_edit_input.png'
    ],
    
    settings: {
      image_size: 'auto', // or: 'square_hd', 'landscape_16_9', etc.
      safety_tolerance: '2',
      enable_safety_checker: true,
      output_format: 'jpeg', // or 'png'
      // seed: 12345 // optional, for reproducibility
    },
    
    orgType: 'general',
    useCanonicalPrompt: false
  };

  try {
    console.log('📤 Sending request to:', API_URL);
    console.log('📝 Prompt:', testData.prompt.substring(0, 100) + '...');
    console.log('🖼️  Images:', testData.imageUrls.length);
    console.log('⚙️  Settings:', JSON.stringify(testData.settings, null, 2));
    console.log('\n⏳ Generating... (this may take 20-30 seconds)\n');

    const startTime = Date.now();

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Request failed:', response.status);
      console.error('Error details:', JSON.stringify(errorData, null, 2));
      return;
    }

    const result = await response.json();

    console.log('✅ Success! Generation completed in', elapsed, 'seconds\n');
    console.log('📊 Result:');
    console.log('  - Model:', result.model);
    console.log('  - Provider:', result.provider);
    console.log('  - Input images:', result.inputImages);
    console.log('  - Generated images:', result.images?.length || 0);
    console.log('  - Seed:', result.seed);
    
    if (result.images && result.images.length > 0) {
      console.log('\n🖼️  Generated image:');
      console.log('  - URL:', result.images[0].url);
      console.log('  - Dimensions:', `${result.images[0].width}x${result.images[0].height}`);
      
      // Check if image is Base64 or URL
      if (result.images[0].url.startsWith('data:')) {
        const base64Length = result.images[0].url.length;
        const sizeInKB = (base64Length * 0.75 / 1024).toFixed(1);
        console.log('  - Format: Base64');
        console.log('  - Size: ~', sizeInKB, 'KB');
        
        // Optionally save to file
        const base64Data = result.images[0].url.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        const outputPath = path.join(__dirname, 'test-flux-2-pro-edit-output.jpg');
        fs.writeFileSync(outputPath, buffer);
        console.log('  - Saved to:', outputPath);
      } else {
        console.log('  - Format: URL (hosted on fal.ai)');
      }
    }
    
    if (result.prompt !== result.originalPrompt) {
      console.log('\n📝 Prompt enhancement:');
      console.log('  - Original:', result.originalPrompt.substring(0, 100) + '...');
      console.log('  - Enhanced:', result.prompt.substring(0, 100) + '...');
    }
    
    console.log('\n✅ Test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Test with canonical prompt
async function testWithCanonicalPrompt() {
  console.log('\n\n🧪 Testing Flux 2 Pro Edit with Canonical Prompt...\n');

  const testData = {
    prompt: 'elderly people having a conversation in a park',
    
    imageUrls: [
      'https://storage.googleapis.com/falserverless/example_inputs/flux2_pro_edit_input.png'
    ],
    
    settings: {
      image_size: 'landscape_16_9',
      safety_tolerance: '2',
      output_format: 'jpeg'
    },
    
    useCanonicalPrompt: true,
    canonicalConfig: {
      subject: {
        objectDescription: 'group of elderly people engaged in animated conversation'
      },
      elements: {
        landmark: '',
        city: '',
        others: 'park benches, trees in background'
      },
      modifiers: {
        positives: 'warm lighting, joyful atmosphere, natural interaction'
      }
    },
    
    orgType: 'general'
  };

  try {
    console.log('📤 Sending request with canonical prompt...');
    console.log('📝 Base prompt:', testData.prompt);
    console.log('⚙️  Canonical config:', JSON.stringify(testData.canonicalConfig, null, 2));
    console.log('\n⏳ Generating...\n');

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Request failed:', response.status);
      console.error('Error details:', JSON.stringify(errorData, null, 2));
      return;
    }

    const result = await response.json();

    console.log('✅ Success!\n');
    console.log('📝 Canonical prompt generated:');
    console.log(result.prompt);
    console.log('\n🖼️  Image URL:', result.images?.[0]?.url || 'N/A');
    console.log('\n✅ Canonical prompt test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Test with custom dimensions
async function testWithCustomSize() {
  console.log('\n\n🧪 Testing Flux 2 Pro Edit with custom dimensions...\n');

  const testData = {
    prompt: 'Make the scene look like a vintage 1970s photograph with faded colors and slight grain',
    
    imageUrls: [
      'https://storage.googleapis.com/falserverless/example_inputs/flux2_pro_edit_input.png',
      'https://storage.googleapis.com/falserverless/example_inputs/flux2_pro_edit_input.png'
    ],
    
    settings: {
      image_size: {
        width: 1280,
        height: 720
      },
      safety_tolerance: '3',
      output_format: 'png',
      seed: 42
    },
    
    orgType: 'general',
    useCanonicalPrompt: false
  };

  try {
    console.log('📤 Testing custom size: 1280x720');
    console.log('🌱 Using seed: 42 (for reproducibility)');
    console.log('\n⏳ Generating...\n');

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Request failed:', response.status);
      console.error('Error details:', JSON.stringify(errorData, null, 2));
      return;
    }

    const result = await response.json();

    console.log('✅ Success!\n');
    console.log('📐 Output dimensions:', `${result.images[0].width}x${result.images[0].height}`);
    console.log('🌱 Seed used:', result.seed);
    console.log('🖼️  Image URL:', result.images[0].url.substring(0, 100) + '...');
    console.log('\n✅ Custom size test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run all tests
async function runAllTests() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  FLUX 2 PRO EDIT - INTERNAL ENDPOINT TEST SUITE');
  console.log('═══════════════════════════════════════════════════════\n');

  await testFlux2ProEdit();
  await testWithCanonicalPrompt();
  await testWithCustomSize();

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  ALL TESTS COMPLETED');
  console.log('═══════════════════════════════════════════════════════\n');
}

// Execute tests
runAllTests().catch(console.error);
