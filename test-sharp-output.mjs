/**
 * Test Sharp output to verify it creates valid JPEG files
 */

import fs from 'fs';

async function testSharpOutput() {
  try {
    console.log('🧪 Testing Sharp output quality...\n');

    // Read test Base64
    const base64Data = fs.readFileSync('./test-problem.base64', 'utf-8').trim();
    const matches = base64Data.match(/^data:([^;]+);base64,(.+)$/);
    
    if (!matches) {
      throw new Error('Invalid Base64 format');
    }

    const base64String = matches[2];
    const imageBuffer = Buffer.from(base64String, 'base64');
    
    console.log('Original buffer size:', imageBuffer.length, 'bytes');

    // Process with Sharp
    const sharp = (await import('sharp')).default;
    
    const normalizedBuffer = await sharp(imageBuffer)
      .resize(2048, 2048, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 90 })
      .toBuffer();
    
    console.log('Normalized buffer size:', normalizedBuffer.length, 'bytes');
    
    // Save to disk
    const outputPath = './test-sharp-output.jpg';
    fs.writeFileSync(outputPath, normalizedBuffer);
    console.log(`\n✅ Saved to: ${outputPath}`);
    
    // Verify it's readable
    const readBack = fs.readFileSync(outputPath);
    console.log('Read back size:', readBack.length, 'bytes');
    console.log('Buffers match:', normalizedBuffer.equals(readBack));
    
    // Try to process it again with Sharp to verify it's valid
    console.log('\n🔍 Verifying JPEG validity...');
    const metadata = await sharp(outputPath).metadata();
    console.log('Metadata:', metadata);
    console.log('\n✅ JPEG is valid!');
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

testSharpOutput();
