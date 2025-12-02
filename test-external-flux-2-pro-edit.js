/**
 * Test script for external Flux 2 Pro Edit endpoint
 * Tests JSON API for external integrations (returns Base64 with disclaimer)
 * 
 * Usage: node test-external-flux-2-pro-edit.js
 */

const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:3000/api/external-flux-2-pro-edit';

// Test with image URLs
async function testExternalFlux2ProEdit() {
  console.log('🧪 Testing External Flux 2 Pro Edit endpoint...\n');

  const testData = {
    prompt: 'Apply a dramatic cinematic look with high contrast, desaturated colors except for warm tones, and add subtle film grain. Make it look like a scene from a modern thriller movie.',
    
    imageUrls: [
      'https://storage.googleapis.com/falserverless/example_inputs/flux2_pro_edit_input.png',
      'https://storage.googleapis.com/falserverless/example_inputs/flux2_pro_edit_input.png'
    ],
    
    settings: {
      image_size: 'auto',
      safety_tolerance: '2',
      enable_safety_checker: true,
      output_format: 'jpeg'
    },
    
    orgType: 'general'
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
    console.log('  - Success:', result.success);
    console.log('  - Model:', result.model);
    console.log('  - Provider:', result.provider);
    console.log('  - Input images:', result.inputImages);
    console.log('  - Generated images:', result.images?.length || 0);
    console.log('  - Seed:', result.seed);
    console.log('  - Timestamp:', result.timestamp);
    
    if (result.images && result.images.length > 0) {
      console.log('\n🖼️  Generated image:');
      console.log('  - URL:', result.images[0].url.substring(0, 100) + '...');
      console.log('  - Original URL:', result.images[0].originalUrl);
      console.log('  - Dimensions:', `${result.images[0].width}x${result.images[0].height}`);
      
      // Check if image is Base64
      if (result.images[0].url.startsWith('data:')) {
        const base64Length = result.images[0].url.length;
        const sizeInKB = (base64Length * 0.75 / 1024).toFixed(1);
        console.log('  - Format: Base64 with disclaimer');
        console.log('  - Size: ~', sizeInKB, 'KB');
        
        // Save to file
        const base64Data = result.images[0].url.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        const outputPath = path.join(__dirname, 'test-external-flux-2-pro-edit-output.jpg');
        fs.writeFileSync(outputPath, buffer);
        console.log('  - Saved to:', outputPath);
      }
      console.log('\n📋 Original fal.ai URL:', result.images[0].originalUrl);
    }
    
    console.log('\n✅ Test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Test with Base64 images
async function testWithBase64Images() {
  console.log('\n\n🧪 Testing External Flux 2 Pro Edit with Base64 images...\n');

  // Create a simple test Base64 image (1x1 red pixel for demonstration)
  // In production, you'd use real Base64 image data
  const testBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';

  const testData = {
    prompt: 'Transform the image with a vintage sepia tone effect, as if it was taken in the 1920s',
    
    // Can mix Base64 and URLs
    base64Images: [
      `data:image/png;base64,${testBase64}`
    ],
    
    imageUrls: [
      'https://storage.googleapis.com/falserverless/example_inputs/flux2_pro_edit_input.png'
    ],
    
    settings: {
      image_size: 'square',
      safety_tolerance: '3',
      output_format: 'png'
    },
    
    orgType: 'general'
  };

  try {
    console.log('📤 Testing with Base64 + URL mix...');
    console.log('📝 Base64 images:', testData.base64Images.length);
    console.log('📝 URL images:', testData.imageUrls.length);
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
    console.log('📊 Result:', JSON.stringify(result, null, 2));
    console.log('\n✅ Base64 test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Test with 9 images (maximum)
async function testMaximumImages() {
  console.log('\n\n🧪 Testing External Flux 2 Pro Edit with 9 images (maximum)...\n');

  const testData = {
    prompt: 'Create a cohesive collage style where all reference images blend together with a unified color palette of blues and purples. Add subtle connecting elements between the images.',
    
    imageUrls: [
      'https://storage.googleapis.com/falserverless/example_inputs/flux2_pro_edit_input.png',
      'https://storage.googleapis.com/falserverless/example_inputs/flux2_pro_edit_input.png',
      'https://storage.googleapis.com/falserverless/example_inputs/flux2_pro_edit_input.png',
      'https://storage.googleapis.com/falserverless/example_inputs/flux2_pro_edit_input.png',
      'https://storage.googleapis.com/falserverless/example_inputs/flux2_pro_edit_input.png',
      'https://storage.googleapis.com/falserverless/example_inputs/flux2_pro_edit_input.png',
      'https://storage.googleapis.com/falserverless/example_inputs/flux2_pro_edit_input.png',
      'https://storage.googleapis.com/falserverless/example_inputs/flux2_pro_edit_input.png',
      'https://storage.googleapis.com/falserverless/example_inputs/flux2_pro_edit_input.png'
    ],
    
    settings: {
      image_size: 'landscape_16_9',
      safety_tolerance: '2',
      output_format: 'jpeg',
      seed: 999
    },
    
    orgType: 'general'
  };

  try {
    console.log('📤 Testing with 9 images (maximum allowed)...');
    console.log('📝 Images:', testData.imageUrls.length);
    console.log('🌱 Seed:', testData.settings.seed);
    console.log('\n⏳ Generating... (may take longer with 9 images)\n');

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

    console.log('✅ Success! Completed in', elapsed, 'seconds\n');
    console.log('📊 Processed', result.inputImages, 'input images');
    console.log('🖼️  Generated image URL:', result.images[0].url);
    console.log('\n✅ Maximum images test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Test error handling (too many images)
async function testErrorHandling() {
  console.log('\n\n🧪 Testing error handling (10 images - should fail)...\n');

  const testData = {
    prompt: 'This should fail because we have too many images',
    
    imageUrls: Array(10).fill('https://storage.googleapis.com/falserverless/example_inputs/flux2_pro_edit_input.png'),
    
    settings: {
      image_size: 'auto'
    }
  };

  try {
    console.log('📤 Sending request with 10 images (exceeds limit of 9)...\n');

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();

    if (!response.ok) {
      console.log('✅ Error handling works correctly!');
      console.log('❌ Expected error:', result.error);
      console.log('📝 Details:', result.details);
    } else {
      console.error('⚠️  Should have failed but succeeded');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Test with canonical prompt
async function testWithCanonicalPrompt() {
  console.log('\n\n🧪 Testing External Flux 2 Pro Edit with Canonical Prompt...\n');

  const testData = {
    prompt: 'diverse group of people celebrating',
    
    imageUrls: [
      'https://storage.googleapis.com/falserverless/example_inputs/flux2_pro_edit_input.png'
    ],
    
    settings: {
      image_size: 'auto',
      safety_tolerance: '2',
      output_format: 'jpeg'
    },
    
    useCanonicalPrompt: true,
    canonicalConfig: {
      subject: {
        objectDescription: 'multi-ethnic group of people joyfully celebrating together'
      },
      elements: {
        landmark: '',
        city: 'urban setting',
        others: 'colorful decorations, festive atmosphere'
      },
      modifiers: {
        positives: 'vibrant colors, energetic mood, inclusive representation'
      }
    },
    
    orgType: 'general'
  };

  try {
    console.log('📤 Sending request with canonical prompt...');
    console.log('📝 Base prompt:', testData.prompt);
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
    console.log('📝 Enhanced prompt:', result.prompt);
    console.log('🖼️  Image URL:', result.images[0].url);
    console.log('\n✅ Canonical prompt test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run all tests
async function runAllTests() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  FLUX 2 PRO EDIT - EXTERNAL ENDPOINT TEST SUITE');
  console.log('═══════════════════════════════════════════════════════\n');

  await testExternalFlux2ProEdit();
  await testWithBase64Images();
  await testMaximumImages();
  await testErrorHandling();
  await testWithCanonicalPrompt();

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  ALL TESTS COMPLETED');
  console.log('═══════════════════════════════════════════════════════\n');
  
  console.log('\n📋 Summary:');
  console.log('  - External endpoint returns Base64 images with disclaimer');
  console.log('  - Also includes originalUrl (fal.ai hosted URL)');
  console.log('  - JSON-only communication');
  console.log('  - Supports up to 9 images');
  console.log('  - Automatic image resizing (4MP first, 1MP others)');
  console.log('  - Ideal for external API integrations');
  console.log('  - Disclaimer automatically applied\n');
}

// Execute tests
runAllTests().catch(console.error);
