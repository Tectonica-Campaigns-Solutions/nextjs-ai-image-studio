/**
 * Test script to verify Base64 image upload to fal.ai storage
 * Tests different upload methods to identify the corruption issue
 */

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const fs = require('fs');
const path = require('path');

// Test Base64 string (small PNG - red square 10x10)
const testBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC';

async function testUpload() {
  try {
    // Check for FAL_API_KEY
    const FAL_KEY = process.env.FAL_API_KEY || process.env.FAL_KEY;
    if (!FAL_KEY) {
      console.error('❌ FAL_API_KEY environment variable not set');
      console.log('💡 Make sure .env.local exists with FAL_API_KEY');
      process.exit(1);
    }

    // Set it for fal.ai client
    process.env.FAL_KEY = FAL_KEY;

    console.log('🧪 Testing Base64 image upload methods...\n');
    console.log('🔑 Using FAL_KEY:', FAL_KEY.substring(0, 15) + '...\n');

    // Import fal using named export
    const { fal } = await import('@fal-ai/client');

    // Extract data
    const matches = testBase64.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) {
      throw new Error('Invalid data URL');
    }
    const mimeType = matches[1];
    const base64String = matches[2];
    
    console.log(`📊 MIME type: ${mimeType}`);
    console.log(`📊 Base64 length: ${base64String.length}`);

    // ==========================================
    // Method 1: Buffer -> Blob -> File (current approach)
    // ==========================================
    console.log('\n1️⃣ Testing: Buffer -> Blob -> File');
    try {
      const buffer1 = Buffer.from(base64String, 'base64');
      console.log(`   Buffer size: ${buffer1.length} bytes`);
      
      const blob1 = new Blob([buffer1], { type: mimeType });
      console.log(`   Blob size: ${blob1.size} bytes`);
      
      const file1 = new File([blob1], 'test-method1.png', { 
        type: mimeType,
        lastModified: Date.now()
      });
      console.log(`   File size: ${file1.size} bytes, type: ${file1.type}`);
      
      const url1 = await fal.storage.upload(file1);
      console.log(`   ✅ Upload successful: ${url1}`);
      
      // Try to download to verify
      const response1 = await fetch(url1);
      if (response1.ok) {
        const downloadedBuffer = Buffer.from(await response1.arrayBuffer());
        console.log(`   ✅ Download successful: ${downloadedBuffer.length} bytes`);
        console.log(`   🔍 Match original: ${buffer1.equals(downloadedBuffer)}`);
      } else {
        console.log(`   ❌ Download failed: ${response1.status}`);
      }
    } catch (error) {
      console.error(`   ❌ Method 1 failed:`, error.message);
    }

    // ==========================================
    // Method 2: Direct Buffer with FormData
    // ==========================================
    console.log('\n2️⃣ Testing: Direct Buffer upload');
    try {
      const buffer2 = Buffer.from(base64String, 'base64');
      
      // Create a File-like object directly from buffer
      const file2 = {
        name: 'test-method2.png',
        type: mimeType,
        size: buffer2.length,
        arrayBuffer: async () => buffer2.buffer.slice(buffer2.byteOffset, buffer2.byteOffset + buffer2.byteLength),
        slice: (start, end, contentType) => new Blob([buffer2.slice(start, end)], { type: contentType }),
        stream: () => {
          const readable = new ReadableStream({
            start(controller) {
              controller.enqueue(buffer2);
              controller.close();
            }
          });
          return readable;
        },
        text: async () => buffer2.toString('utf-8')
      };
      
      const url2 = await fal.storage.upload(file2);
      console.log(`   ✅ Upload successful: ${url2}`);
      
      const response2 = await fetch(url2);
      if (response2.ok) {
        const downloadedBuffer = Buffer.from(await response2.arrayBuffer());
        console.log(`   ✅ Download successful: ${downloadedBuffer.length} bytes`);
        console.log(`   🔍 Match original: ${buffer2.equals(downloadedBuffer)}`);
      } else {
        console.log(`   ❌ Download failed: ${response2.status}`);
      }
    } catch (error) {
      console.error(`   ❌ Method 2 failed:`, error.message);
    }

    // ==========================================
    // Method 3: Using Uint8Array
    // ==========================================
    console.log('\n3️⃣ Testing: Uint8Array -> Blob -> File');
    try {
      const buffer3 = Buffer.from(base64String, 'base64');
      const uint8Array = new Uint8Array(buffer3);
      console.log(`   Uint8Array length: ${uint8Array.length}`);
      
      const blob3 = new Blob([uint8Array], { type: mimeType });
      console.log(`   Blob size: ${blob3.size} bytes`);
      
      const file3 = new File([blob3], 'test-method3.png', { 
        type: mimeType,
        lastModified: Date.now()
      });
      console.log(`   File size: ${file3.size} bytes, type: ${file3.type}`);
      
      const url3 = await fal.storage.upload(file3);
      console.log(`   ✅ Upload successful: ${url3}`);
      
      const response3 = await fetch(url3);
      if (response3.ok) {
        const downloadedBuffer = Buffer.from(await response3.arrayBuffer());
        console.log(`   ✅ Download successful: ${downloadedBuffer.length} bytes`);
        console.log(`   🔍 Match original: ${buffer3.equals(downloadedBuffer)}`);
      } else {
        console.log(`   ❌ Download failed: ${response3.status}`);
      }
    } catch (error) {
      console.error(`   ❌ Method 3 failed:`, error.message);
    }

    console.log('\n✨ Test completed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run test
testUpload();
