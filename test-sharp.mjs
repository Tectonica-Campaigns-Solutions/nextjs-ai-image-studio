/**
 * Test if Sharp is working in the runtime environment
 */

async function testSharp() {
  try {
    console.log('🧪 Testing Sharp availability...\n');

    // Try to import sharp
    console.log('1️⃣ Importing sharp...');
    const sharpModule = await import('sharp');
    const sharp = sharpModule.default;
    console.log('✅ Sharp imported successfully');
    console.log('   Type:', typeof sharp);
    console.log('   Constructor:', sharp.constructor.name);

    // Create a test buffer (1x1 red pixel PNG)
    const testBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
    const testBuffer = Buffer.from(testBase64, 'base64');
    console.log('\n2️⃣ Created test buffer:', testBuffer.length, 'bytes');

    // Try to process with sharp
    console.log('\n3️⃣ Processing with sharp...');
    const result = await sharp(testBuffer)
      .jpeg({ quality: 80 })
      .toBuffer();
    
    console.log('✅ Sharp processing successful!');
    console.log('   Input size:', testBuffer.length, 'bytes');
    console.log('   Output size:', result.length, 'bytes');
    console.log('   Output type:', result.constructor.name);

    // Try with the actual large image
    console.log('\n4️⃣ Testing with large image...');
    const fs = await import('fs');
    const largeBase64 = fs.readFileSync('./test-problem.base64', 'utf-8').trim();
    
    const matches = largeBase64.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) {
      throw new Error('Invalid Base64 format');
    }
    
    const largeBuffer = Buffer.from(matches[2], 'base64');
    console.log('   Large image size:', largeBuffer.length, 'bytes', `(${(largeBuffer.length / 1024 / 1024).toFixed(2)} MB)`);

    console.log('   Compressing...');
    const startTime = Date.now();
    const compressed = await sharp(largeBuffer)
      .resize(1920, 1920, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 75 })
      .toBuffer();
    
    const elapsed = Date.now() - startTime;
    console.log('✅ Compression successful!');
    console.log('   Original:', (largeBuffer.length / 1024 / 1024).toFixed(2), 'MB');
    console.log('   Compressed:', (compressed.length / 1024 / 1024).toFixed(2), 'MB');
    console.log('   Reduction:', ((1 - compressed.length / largeBuffer.length) * 100).toFixed(1), '%');
    console.log('   Time:', elapsed, 'ms');

    console.log('\n✨ Sharp is working correctly!');
    
  } catch (error) {
    console.error('\n❌ Sharp test failed:', error);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

testSharp();
