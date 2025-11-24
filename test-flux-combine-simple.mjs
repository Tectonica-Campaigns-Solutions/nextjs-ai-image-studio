/**
 * Test Flux-Combine with known good images from fal.ai
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testFluxCombine() {
  try {
    console.log('🧪 Testing Flux-Combine with known good images...\n');

    const { fal } = await import('@fal-ai/client');

    // Use the reference image from SeDream (we know this works)
    const testUrls = [
      'https://v3.fal.media/files/monkey/huuJHd0OJn7pBsJc37rh5_Reference.jpg',
      'https://v3.fal.media/files/monkey/huuJHd0OJn7pBsJc37rh5_Reference.jpg' // Same image twice
    ];

    console.log('Testing with URLs:');
    testUrls.forEach((url, i) => console.log(`  ${i + 1}. ${url}`));
    console.log();

    const input = {
      prompt: 'combine these images',
      image_urls: testUrls,
      aspect_ratio: '1:1',
      guidance_scale: 3.5,
      num_images: 1,
      safety_tolerance: 2,
      output_format: 'jpeg'
    };

    console.log('📤 Calling Flux Pro Kontext Max Multi...\n');

    const result = await fal.subscribe("fal-ai/flux-pro/kontext/max/multi", {
      input,
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          console.log('⏳', update.logs?.map(log => log.message).join(', ') || 'Processing...');
        }
      }
    });

    if (result.data && result.data.images && result.data.images.length > 0) {
      console.log('\n✅ Flux-Combine works!');
      console.log('Result:', result.data.images[0].url);
    } else {
      console.error('\n❌ Unexpected response:', result);
    }

  } catch (error) {
    console.error('\n❌ Flux-Combine failed:', error.message);
    if (error.body) {
      console.error('Error body:', JSON.stringify(error.body, null, 2));
    }
    if (error.status) {
      console.error('Status:', error.status);
    }
    process.exit(1);
  }
}

testFluxCombine();
