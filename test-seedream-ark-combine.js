/**
 * Test script for Seedream Ark Combine endpoint
 * Tests the new /api/seedream-combine endpoint with sample image URLs
 */

async function testSeedreamArkCombine() {
    console.log("🧪 Testing Seedream Ark Combine Endpoint")
    console.log("=" * 60)
    
    const testUrl = 'http://localhost:3000/api/seedream-ark-combine'
    const testPrompt = "Generate 2 images of a girl and a cow plushie happily riding a roller coaster in an amusement park, depicting morning and noon"
    
    // Test image URLs (using sample images)
    const imageUrl1 = "https://ark-doc.tos-ap-southeast-1.bytepluses.com/doc_image/seedream4_imagesToimages_1.png"
    const imageUrl2 = "https://ark-doc.tos-ap-southeast-1.bytepluses.com/doc_image/seedream4_imagesToimages_2.png"
    
    console.log(`Testing prompt: "${testPrompt}"`)
    console.log(`Image 1: ${imageUrl1}`)
    console.log(`Image 2: ${imageUrl2}`)
    
    try {
        const formData = new FormData()
        formData.append('prompt', testPrompt)
        formData.append('imageUrl0', imageUrl1)
        formData.append('imageUrl1', imageUrl2)
        formData.append('useJSONEnhancement', 'false') // Test without enhancement first
        formData.append('settings', JSON.stringify({
            size: '2K',
            maxImages: 1,
            watermark: true
        }))
        
        console.log("\n🔄 Sending request to Seedream Ark Combine...")
        const startTime = Date.now()
        
        const response = await fetch(testUrl, {
            method: 'POST',
            body: formData
        })
        
        const endTime = Date.now()
        const result = await response.json()
        
        console.log(`\n📊 Response received in ${endTime - startTime}ms`)
        console.log(`Status: ${response.status}`)
        
        if (response.status === 200 && result.success) {
            console.log("✅ SUCCESS: Seedream Ark Combine completed!")
            console.log(`📸 Generated images: ${result.images?.length || 0}`)
            
            if (result.images && result.images.length > 0) {
                result.images.forEach((img, index) => {
                    console.log(`   Image ${index + 1}:`)
                    console.log(`     URL: ${img.url}`)
                    console.log(`     Size: ${img.width}x${img.height}`)
                })
            }
            
            console.log(`🎯 Model: ${result.model}`)
            console.log(`🔗 Provider: ${result.provider}`)
            console.log(`📝 Final prompt: "${result.prompt}"`)
            console.log(`⚙️  Settings:`, result.settings)
            
        } else if (response.status === 400 && result.error) {
            console.log("❌ CLIENT ERROR:", result.error)
            console.log("Details:", result.details)
            
        } else if (response.status === 500) {
            console.log("⚠️  SERVER ERROR:", result.error)
            console.log("Details:", result.details)
            
            if (result.details?.includes("ARK_API_KEY")) {
                console.log("\n💡 Make sure ARK_API_KEY is configured in .env.local")
            }
            
        } else {
            console.log("❓ UNEXPECTED RESPONSE:")
            console.log(JSON.stringify(result, null, 2))
        }
        
    } catch (error) {
        console.log("❌ REQUEST FAILED:", error.message)
    }
    
    console.log("\n" + "=" * 60)
    console.log("🎯 TEST SUMMARY:")
    console.log("This endpoint provides simplified image combination using Ark Seedream-4")
    console.log("- No preprocessing of images (unlike flux-pro-image-combine)")
    console.log("- Direct API call to ark.cn-beijing.volces.com")
    console.log("- Supports 2 image URLs for combination")
    console.log("- Uses seedream-4-0-250828 model")
}

async function testWithEnhancement() {
    console.log("\n🧪 Testing WITH JSON Enhancement")
    console.log("-" * 40)
    
    const testUrl = 'http://localhost:3000/api/seedream-ark-combine'
    const testPrompt = "Happy scene in amusement park"
    
    const imageUrl1 = "https://ark-doc.tos-ap-southeast-1.bytepluses.com/doc_image/seedream4_imagesToimages_1.png"
    const imageUrl2 = "https://ark-doc.tos-ap-southeast-1.bytepluses.com/doc_image/seedream4_imagesToimages_2.png"
    
    try {
        const formData = new FormData()
        formData.append('prompt', testPrompt)
        formData.append('imageUrl0', imageUrl1)
        formData.append('imageUrl1', imageUrl2)
        formData.append('useJSONEnhancement', 'true') // Enable enhancement
        formData.append('jsonOptions', JSON.stringify({
            intensity: 1.0,
            customText: 'vibrant colors, high quality artwork, detailed rendering'
        }))
        
        const response = await fetch(testUrl, {
            method: 'POST',
            body: formData
        })
        
        const result = await response.json()
        
        if (response.ok && result.success) {
            console.log("✅ Enhancement test passed")
            console.log(`📝 Enhanced prompt: "${result.prompt}"`)
            console.log(`🔧 JSON enhancement used: ${result.jsonEnhancementUsed}`)
        } else {
            console.log("❌ Enhancement test failed:", result.error)
        }
        
    } catch (error) {
        console.log("❌ Enhancement test error:", error.message)
    }
}

// Run tests
if (require.main === module) {
    testSeedreamArkCombine()
        .then(() => testWithEnhancement())
        .catch(console.error)
}

module.exports = { testSeedreamArkCombine, testWithEnhancement }