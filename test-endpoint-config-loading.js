/**
 * Test to verify exactly what the external edit-image endpoint is loading
 */

async function testExternalEndpointConfig() {
    console.log("🔍 Testing What External Edit-Image Endpoint Actually Loads")
    console.log("=" * 60)
    
    const testPrompt = "make the person with a fist up"
    const testUrl = 'http://localhost:3000/api/external/edit-image'
    
    // Create a simple test image (1x1 PNG)
    const testImageBuffer = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 dimensions
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 
        0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, // IDAT
        0x54, 0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, 
        0x00, 0x00, 0x37, 0x6E, 0xF9, 0x24, 0x00, 0x00, 
        0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, // IEND
        0x60, 0x82
    ])
    
    console.log(`Original prompt: "${testPrompt}"`)
    
    // Test 1: With JSON Enhancement enabled
    console.log("\n📝 Test 1: WITH JSON Enhancement (should load edit_enhancement_text)")
    try {
        const formData1 = new FormData()
        const blob1 = new Blob([testImageBuffer], { type: 'image/png' })
        formData1.append('image', blob1, 'test.png')
        formData1.append('prompt', testPrompt)
        formData1.append('useJSONEnhancement', 'true')  // ENABLED
        
        const response1 = await fetch(testUrl, {
            method: 'POST',
            body: formData1
        })
        
        const result1 = await response1.json()
        
        console.log(`   Status: ${response1.status}`)
        
        if (result1.prompt) {
            console.log(`   Original prompt: "${result1.prompt.original}"`)
            console.log(`   Final prompt: "${result1.prompt.final}"`)
            console.log(`   Enhanced: ${result1.prompt.enhanced}`)
            
            if (result1.prompt.jsonMetadata) {
                console.log(`   Applied text: "${result1.prompt.jsonMetadata.appliedText}"`)
                
                // Check if it's using the correct edit_enhancement_text
                if (result1.prompt.jsonMetadata.appliedText && 
                    result1.prompt.jsonMetadata.appliedText.includes("Make only the minimal requested change")) {
                    console.log(`   ✅ CORRECT: Using edit_enhancement_text`)
                } else if (result1.prompt.jsonMetadata.appliedText &&
                          result1.prompt.jsonMetadata.appliedText.includes("Make the second image have the style")) {
                    console.log(`   ❌ WRONG: Using enhancement_text instead of edit_enhancement_text`)
                } else {
                    console.log(`   ⚠️  UNKNOWN: Applied text doesn't match expected patterns`)
                }
            }
        } else {
            console.log(`   Response: ${JSON.stringify(result1, null, 2)}`)
        }
        
    } catch (error) {
        console.log(`   ❌ ERROR: ${error.message}`)
    }
    
    // Test 2: Without JSON Enhancement
    console.log("\n📝 Test 2: WITHOUT JSON Enhancement (should be clean)")
    try {
        const formData2 = new FormData()
        const blob2 = new Blob([testImageBuffer], { type: 'image/png' })
        formData2.append('image', blob2, 'test.png')
        formData2.append('prompt', testPrompt)
        formData2.append('useJSONEnhancement', 'false')  // DISABLED
        
        const response2 = await fetch(testUrl, {
            method: 'POST',
            body: formData2
        })
        
        const result2 = await response2.json()
        
        console.log(`   Status: ${response2.status}`)
        
        if (result2.prompt) {
            console.log(`   Original prompt: "${result2.prompt.original}"`)
            console.log(`   Final prompt: "${result2.prompt.final}"`)
            console.log(`   Enhanced: ${result2.prompt.enhanced}`)
            
            if (result2.prompt.original === result2.prompt.final) {
                console.log(`   ✅ CORRECT: No enhancement applied, prompt unchanged`)
            } else {
                console.log(`   ⚠️  WARNING: Prompt was modified even with enhancement disabled`)
            }
        }
        
    } catch (error) {
        console.log(`   ❌ ERROR: ${error.message}`)
    }
    
    console.log("\n" + "=" * 60)
    console.log("🎯 ANALYSIS:")
    console.log("If Test 1 shows 'WRONG: Using enhancement_text', then we need to:")
    console.log("   1. Check if there's another place loading the wrong field")
    console.log("   2. Verify the endpoint is calling /api/enhancement-config correctly")
    console.log("   3. Make sure it's accessing config.edit_enhancement_text not config.enhancement_text")
}

if (require.main === module) {
    testExternalEndpointConfig().catch(console.error)
}

module.exports = { testExternalEndpointConfig }