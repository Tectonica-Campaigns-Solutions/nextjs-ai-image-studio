import dotenv from 'dotenv';
import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

dotenv.config({ path: '.env.local' });

async function testOptimize() {
  try {
    console.log('🧪 Testing optimization endpoint...\n');

    const base64Data = fs.readFileSync('./test-problem.base64', 'utf-8').trim();
    console.log('📊 Base64 size:', base64Data.length, 'characters\n');

    const formData = new FormData();
    formData.append('base64', base64Data);

    console.log('📤 Sending to test endpoint...\n');

    const response = await fetch('http://localhost:3000/api/test-optimize', {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Success!');
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.error('❌ Failed:', result);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testOptimize();
