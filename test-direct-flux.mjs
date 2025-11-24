import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import fs from 'fs/promises'
import FormData from 'form-data'

const base64Data = await fs.readFile('test-problem.base64', 'utf-8')

console.log('🧪 Testing Flux-Combine directly with Base64 images (NO SeDream)...\n')
console.log(`📊 Base64 size: ${base64Data.length} characters`)

const formData = new FormData()
formData.append('model', 'fal-ai/flux-pro/kontext/max/multi')
formData.append('prompt', 'professional composite image')
formData.append('combineMethod', 'separate') // No usar SeDream
formData.append('imageBase640', base64Data.trim())
formData.append('imageBase641', base64Data.trim())

console.log('📤 Sending request to external API (direct Flux-Combine)...\n')

// Note: form-data package needs headers in fetch
const response = await fetch('http://localhost:3000/api/external/flux-pro-image-combine', {
  method: 'POST',
  body: formData,
  headers: formData.getHeaders()
})

console.log(`📥 Response status: ${response.status} ${response.statusText}`)

const data = await response.json()

if (response.ok) {
  console.log('\n✅ SUCCESS!')
  console.log('Combined image URL:', data.combinedImageUrl)
} else {
  console.log('\n❌ Request failed:')
  console.log(JSON.stringify(data, null, 2))
}
