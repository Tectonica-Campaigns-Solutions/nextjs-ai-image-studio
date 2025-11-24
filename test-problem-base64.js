/**
 * Test script to verify the problematic Base64 image upload
 */

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const fs = require('fs');

async function testProblematicBase64() {
  try {
    // Check for FAL_API_KEY
    const FAL_KEY = process.env.FAL_API_KEY || process.env.FAL_KEY;
    if (!FAL_KEY) {
      console.error('❌ FAL_API_KEY environment variable not set');
      process.exit(1);
    }

    process.env.FAL_KEY = FAL_KEY;
    console.log('🧪 Testing problematic Base64 image upload...\n');

    // Import fal using named export
    const { fal } = await import('@fal-ai/client');

    // Read the problematic Base64 file
    const base64Data = fs.readFileSync('./test-problem.base64', 'utf-8').trim();
    
    console.log(`📊 Total size: ${base64Data.length} characters`);
    console.log(`📊 Format: ${base64Data.substring(0, 50)}...`);

    // Extract MIME type and Base64 string
    let base64String = base64Data;
    let mimeType = 'image/jpeg';
    
    if (base64Data.startsWith('data:')) {
      const matches = base64Data.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        mimeType = matches[1];
        base64String = matches[2];
        console.log(`📊 MIME type extracted: ${mimeType}`);
        console.log(`📊 Base64 string length: ${base64String.length}`);
      }
    }

    // Convert to Buffer
    console.log('\n🔄 Converting to Buffer...');
    const imageBuffer = Buffer.from(base64String, 'base64');
    console.log(`✅ Buffer created: ${imageBuffer.length} bytes (${(imageBuffer.length / 1024 / 1024).toFixed(2)} MB)`);

    // Validate it's a valid image by checking magic bytes
    const magicBytes = imageBuffer.slice(0, 4).toString('hex');
    console.log(`🔍 Magic bytes: ${magicBytes}`);
    
    const imageTypes = {
      'ffd8ffe0': 'JPEG (JFIF)',
      'ffd8ffe1': 'JPEG (EXIF)',
      'ffd8ffe2': 'JPEG (Canon)',
      'ffd8ffe8': 'JPEG (SPIFF)',
      '89504e47': 'PNG',
      '47494638': 'GIF',
      '52494646': 'WebP'
    };
    
    const detectedType = imageTypes[magicBytes] || 'Unknown';
    console.log(`🔍 Detected format: ${detectedType}`);

    // Create File object (Method 1 from our test)
    console.log('\n🔄 Creating File object...');
    const fileExtension = mimeType.split('/')[1] || 'jpg';
    const fileName = `test-problem-image.${fileExtension}`;
    
    const blob = new Blob([imageBuffer], { type: mimeType });
    console.log(`✅ Blob created: ${blob.size} bytes, type: ${blob.type}`);
    
    const file = new File([blob], fileName, { 
      type: mimeType,
      lastModified: Date.now()
    });
    console.log(`✅ File created: ${file.name}, ${file.size} bytes, type: ${file.type}`);

    // Upload to fal.ai
    console.log('\n☁️  Uploading to fal.ai storage...');
    const uploadedUrl = await fal.storage.upload(file);
    console.log(`✅ Upload successful: ${uploadedUrl}`);

    // Verify by downloading
    console.log('\n🔍 Verifying upload...');
    const verifyResponse = await fetch(uploadedUrl);
    
    if (!verifyResponse.ok) {
      console.error(`❌ Download failed: ${verifyResponse.status} ${verifyResponse.statusText}`);
      process.exit(1);
    }

    const downloadedBuffer = Buffer.from(await verifyResponse.arrayBuffer());
    console.log(`✅ Download successful: ${downloadedBuffer.length} bytes`);
    
    // Compare buffers
    const buffersMatch = imageBuffer.equals(downloadedBuffer);
    console.log(`🔍 Buffers match: ${buffersMatch}`);
    
    if (!buffersMatch) {
      console.log(`⚠️  Size difference: ${imageBuffer.length} -> ${downloadedBuffer.length} (${downloadedBuffer.length - imageBuffer.length} bytes)`);
      
      // Compare magic bytes
      const downloadedMagic = downloadedBuffer.slice(0, 4).toString('hex');
      console.log(`🔍 Original magic bytes: ${magicBytes}`);
      console.log(`🔍 Downloaded magic bytes: ${downloadedMagic}`);
    }

    // Try to use it in a fal.ai model (simulate what flux-combine does)
    console.log('\n🎨 Testing image with fal.ai model...');
    try {
      // Just check if fal.ai can load the image (using a lightweight model)
      const testResult = await fal.subscribe("fal-ai/flux/dev", {
        input: {
          prompt: "test",
          image_url: uploadedUrl,
          num_inference_steps: 1, // Minimal processing
        },
        logs: true,
        onQueueUpdate: (update) => {
          if (update.status === "IN_PROGRESS") {
            console.log(`⏳ Processing: ${update.logs?.map(l => l.message).join(', ')}`);
          }
        },
      });
      
      console.log('✅ Image is loadable by fal.ai models');
    } catch (error) {
      if (error.message?.includes('image')) {
        console.error(`❌ Image load error: ${error.message}`);
      } else {
        console.log(`ℹ️  Model error (not image-related): ${error.message}`);
      }
    }

    console.log('\n✨ Test completed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    if (error.body) {
      console.error('Error details:', error.body);
    }
    process.exit(1);
  }
}

// Run test
testProblematicBase64();
