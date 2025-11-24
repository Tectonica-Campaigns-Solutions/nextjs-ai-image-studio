import fs from 'fs/promises'
import sharp from 'sharp'

const url = 'https://storage.googleapis.com/isolate-dev-hot-rooster_toolkit_public_bucket/github_x5ib0wj3ssi5g5u5lqrbqfse/d95d3a1bd0ce433badf9ed1dcfe8eb98_base64-image-2.jpeg'

console.log('🔍 Downloading uploaded image to verify...')
console.log('URL:', url)

const response = await fetch(url)
if (!response.ok) {
  console.error('❌ Failed to download:', response.status, response.statusText)
  process.exit(1)
}

const arrayBuffer = await response.arrayBuffer()
const buffer = Buffer.from(arrayBuffer)

console.log('\n📊 Downloaded file info:')
console.log(`   Size: ${buffer.length} bytes (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`)

// Save to disk
await fs.writeFile('test-downloaded.jpg', buffer)
console.log('   Saved as: test-downloaded.jpg')

// Analyze with Sharp
try {
  const metadata = await sharp(buffer).metadata()
  console.log('\n✅ Image is valid!')
  console.log('   Format:', metadata.format)
  console.log('   Dimensions:', `${metadata.width}x${metadata.height}`)
  console.log('   Channels:', metadata.channels)
  console.log('   Space:', metadata.space)
} catch (err) {
  console.error('\n❌ Image is CORRUPTED:', err.message)
}
