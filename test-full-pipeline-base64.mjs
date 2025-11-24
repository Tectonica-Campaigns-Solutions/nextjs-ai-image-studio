/**
 * Test the complete 2-step pipeline with Base64 images
 * Simulates: Base64 → Upload → Seedream → Flux-Combine
 */

import dotenv from 'dotenv';
import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

dotenv.config({ path: '.env.local' });

async function testFullPipeline() {
  try {
    console.log('🧪 Testing complete pipeline with Base64 image...\n');

    // Read the problematic Base64
    const base64Data = fs.readFileSync('./test-problem.base64', 'utf-8').trim();
    console.log(`📊 Base64 size: ${base64Data.length} characters`);

    // Prepare form data (simulating frontend request)
    const formData = new FormData();
    
    // Add the Base64 image
    formData.append('imageBase640', base64Data);
    
    // Add a second dummy Base64 (same image)
    formData.append('imageBase641', base64Data);
    
    // Add prompt and settings
    formData.append('prompt', 'a beautiful landscape with mountains');
    formData.append('aspect_ratio', '16:9');
    formData.append('num_images', '1');
    formData.append('guidance_scale', '3.5');
    formData.append('output_format', 'jpeg');
    formData.append('safety_tolerance', '2');

    console.log('📤 Sending request to external API...\n');

    // Call the external endpoint
    const response = await fetch('http://localhost:3000/api/external/flux-pro-image-combine', {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });

    console.log(`📥 Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Request failed:');
      try {
        const errorJson = JSON.parse(errorText);
        console.error(JSON.stringify(errorJson, null, 2));
      } catch {
        console.error(errorText);
      }
      process.exit(1);
    }

    const result = await response.json();
    
    if (result.success) {
      console.log('\n✅ Pipeline completed successfully!');
      console.log('\n📊 Result:');
      console.log(`  - Image URL: ${result.image}`);
      console.log(`  - Dimensions: ${result.width} x ${result.height}`);
      console.log(`  - Content Type: ${result.content_type}`);
      console.log(`  - Input images: ${result.inputImages}`);
      console.log(`  - Uploaded files: ${result.uploadedFiles}`);
      
      if (result.enhancedPipeline) {
        console.log('\n🔄 Enhanced Pipeline Info:');
        console.log(`  - Step 1 (SeDream): ${result.enhancedPipeline.step1Complete ? '✅' : '❌'}`);
        console.log(`  - Step 2 (Flux-Combine): ${result.enhancedPipeline.step2Complete ? '✅' : '❌'}`);
        if (result.enhancedPipeline.processedImageUrl) {
          console.log(`  - Processed URL: ${result.enhancedPipeline.processedImageUrl}`);
        }
      }

      // Verify the final image is downloadable
      console.log('\n🔍 Verifying final image...');
      const imageResponse = await fetch(result.image);
      if (imageResponse.ok) {
        const imageSize = (await imageResponse.buffer()).length;
        console.log(`✅ Final image is downloadable: ${(imageSize / 1024 / 1024).toFixed(2)} MB`);
      } else {
        console.error(`❌ Cannot download final image: ${imageResponse.status}`);
      }
      
    } else {
      console.error('\n❌ Pipeline failed:');
      console.error(JSON.stringify(result, null, 2));
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch('http://localhost:3000', { method: 'HEAD' });
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const serverRunning = await checkServer();
  if (!serverRunning) {
    console.error('❌ Server is not running on http://localhost:3000');
    console.log('💡 Start the server with: npm run dev');
    process.exit(1);
  }

  await testFullPipeline();
}

main();
