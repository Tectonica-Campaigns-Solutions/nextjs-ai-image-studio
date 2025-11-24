/**
 * Test with a smaller Base64 image to rule out size issues
 */

import dotenv from 'dotenv';
import FormData from 'form-data';
import fetch from 'node-fetch';

dotenv.config({ path: '.env.local' });

// Small test image - 100x100 red square JPEG (about 1KB)
const smallBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAAAAAAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCABkAGQDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlbaWmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD1+iiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigD//2Q==';

async function testSmallPipeline() {
  try {
    console.log('🧪 Testing with small image...\n');

    const formData = new FormData();
    formData.append('imageBase640', smallBase64);
    formData.append('imageBase641', smallBase64);
    formData.append('prompt', 'a beautiful landscape');
    formData.append('aspect_ratio', '1:1');
    formData.append('num_images', '1');

    console.log('📤 Sending request...\n');

    const response = await fetch('http://localhost:3000/api/external/flux-pro-image-combine', {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });

    console.log(`📥 Response: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed:');
      try {
        console.error(JSON.stringify(JSON.parse(errorText), null, 2));
      } catch {
        console.error(errorText);
      }
      process.exit(1);
    }

    const result = await response.json();
    console.log('\n✅ Success!');
    console.log(JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

testSmallPipeline();
