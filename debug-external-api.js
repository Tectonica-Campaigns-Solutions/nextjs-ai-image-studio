#!/usr/bin/env node

/**
 * Debug Script for External Edit-Image API
 * 
 * This script helps diagnose issues with the external API
 */

const fs = require('fs');
const https = require('https');
const FormData = require('form-data');

async function downloadTestImage() {
  console.log('📥 Downloading test image...');
  
  const imageUrl = 'https://v3.fal.media/files/monkey/WoIW5d8UpwWV-zXfyV42E.png';
  const filename = 'test-image.png';
  
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filename);
    https.get(imageUrl, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`✅ Image downloaded: ${filename}`);
        resolve(filename);
      });
    }).on('error', (err) => {
      fs.unlink(filename);
      reject(err);
    });
  });
}

async function testExternalAPI() {
  console.log('🧪 Testing External Edit-Image API...\n');
  
  try {
    // Download test image
    const imagePath = await downloadTestImage();
    
    // Check image details
    const stats = fs.statSync(imagePath);
    console.log('📊 Image details:');
    console.log(`  Size: ${(stats.size / 1024 / 1024).toFixed(2)}MB`);
    console.log(`  Path: ${imagePath}`);
    
    // Test different scenarios
    const testCases = [
      {
        name: "Simple prompt",
        prompt: "professional portrait"
      },
      {
        name: "Medium complexity",
        prompt: "professional environmental activist portrait"
      },
      {
        name: "Complex with RAG",
        prompt: "professional environmental activist portrait with sustainable background and welcoming atmosphere"
      }
    ];
    
    for (const testCase of testCases) {
      console.log(`\n🎯 Testing: ${testCase.name}`);
      console.log(`📝 Prompt: "${testCase.prompt}"`);
      
      // Prepare form data
      const form = new FormData();
      form.append('image', fs.createReadStream(imagePath));
      form.append('prompt', testCase.prompt);
      form.append('useRAG', 'true');
      
      console.log('📡 Making request to API...');
      
      try {
        const response = await fetch('http://localhost:3000/api/external/edit-image', {
          method: 'POST',
          body: form
        });
        
        const result = await response.json();
        
        if (result.success) {
          console.log('✅ Success!');
          console.log(`🖼️  Image URL: ${result.image}`);
          console.log(`🧠 RAG Method: ${result.prompt.ragMetadata?.ragMethod || 'none'}`);
          console.log(`📈 Enhancements: ${result.processing.enhancementsApplied}`);
        } else {
          console.log('❌ Failed!');
          console.log(`💥 Error: ${result.error}`);
          console.log(`📋 Details: ${result.details}`);
          if (result.debug) {
            console.log('🔍 Debug info:', result.debug);
          }
        }
      } catch (fetchError) {
        console.log('❌ Request failed:', fetchError.message);
      }
    }
    
    // Cleanup
    fs.unlinkSync(imagePath);
    console.log('\n🧹 Cleanup completed');
    
  } catch (error) {
    console.error('💥 Test failed:', error);
  }
}

console.log('🚀 External API Debug Tool');
console.log('========================\n');

console.log('📋 Prerequisites:');
console.log('1. Server running: npm run dev');
console.log('2. FAL_API_KEY configured in .env.local');
console.log('3. Internet connection for image download\n');

testExternalAPI().catch(console.error);
