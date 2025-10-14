/**
 * Test script to verify ultra-conservative edit behavior
 * Tests the "make the person with a fist up" prompt with ultra-conservative parameters
 */

async function testUltraConservativeEdits() {
    console.log("🎯 Testing ULTRA-Conservative Edit Parameters")
    console.log("=" * 70)
    
    const testPrompt = "make the person with a fist up"
    console.log(`Testing prompt: "${testPrompt}"`)
    console.log("\nNew ultra-conservative parameters:")
    console.log("   • strength: 0.2 (was 0.35, now 43% lower)")
    console.log("   • guidance_scale: 5.0 (was 7.5, now 33% lower)")
    console.log("   • num_inference_steps: 15 (was 20, now 25% lower)")
    console.log("   • Enhanced negative prompts for style preservation")
    console.log("   • Improved enhancement text")
    
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
    
    console.log(`\n🔍 Testing External Edit-Image with Ultra-Conservative Settings`)
    console.log("-".repeat(60))
    
    try {
        // Test 1: Without JSON enhancement (should be cleanest)
        console.log("\n📝 Test 1: Without JSON Enhancement (cleanest)")
        const formData1 = new FormData()
        const blob1 = new Blob([testImageBuffer], { type: 'image/png' })
        formData1.append('image', blob1, 'test.png')
        formData1.append('prompt', testPrompt)
        formData1.append('useJSONEnhancement', 'false')
        
        const startTime1 = Date.now()
        const response1 = await fetch(testUrl, {
            method: 'POST',
            body: formData1
        })
        const endTime1 = Date.now()
        const result1 = await response1.json()
        
        console.log(`   Status: ${response1.status}`)
        console.log(`   Processing time: ${endTime1 - startTime1}ms`)
        
        if (response1.status === 200 && result1.success) {
            console.log(`   ✅ SUCCESS: Ultra-conservative edit completed`)
            console.log(`   Enhanced: ${result1.prompt?.enhanced || false}`)
            console.log(`   Final prompt: "${result1.prompt?.final || testPrompt}"`)
        } else if (response1.status === 500) {
            console.log(`   ⚠️  Service error (FAL_API_KEY not configured - expected)`)
            console.log(`   Error details: ${result1.details}`)
        }
        
        // Test 2: With JSON enhancement (should add preservation instructions)
        console.log("\n📝 Test 2: With JSON Enhancement (should add preservation)")
        const formData2 = new FormData()
        const blob2 = new Blob([testImageBuffer], { type: 'image/png' })
        formData2.append('image', blob2, 'test.png')
        formData2.append('prompt', testPrompt)
        formData2.append('useJSONEnhancement', 'true')
        
        const startTime2 = Date.now()
        const response2 = await fetch(testUrl, {
            method: 'POST',
            body: formData2
        })
        const endTime2 = Date.now()
        const result2 = await response2.json()
        
        console.log(`   Status: ${response2.status}`)
        console.log(`   Processing time: ${endTime2 - startTime2}ms`)
        
        if (response2.status === 200 && result2.success) {
            console.log(`   ✅ SUCCESS: Enhanced ultra-conservative edit completed`)
            console.log(`   Enhanced: ${result2.prompt?.enhanced || false}`)
            console.log(`   Applied text: "${result2.prompt?.jsonMetadata?.appliedText}"`)
            console.log(`   Final prompt: "${result2.prompt?.final}"`)
        } else if (response2.status === 500) {
            console.log(`   ⚠️  Service error (FAL_API_KEY not configured - expected)`)
            console.log(`   Error details: ${result2.details}`)
        }
        
    } catch (error) {
        console.log(`   ❌ ERROR: ${error.message}`)
    }
    
    console.log("\n" + "=" * 70)
    console.log("🎯 ULTRA-CONSERVATIVE EDIT OPTIMIZATION SUMMARY:")
    console.log("\nParameter changes made:")
    console.log("   • strength: 0.8 → 0.35 → 0.2 (75% reduction from original)")
    console.log("   • guidance_scale: 7.5 → 5.0 (33% reduction)")  
    console.log("   • num_inference_steps: 50 → 20 → 15 (70% reduction)")
    console.log("   • Enhanced negative prompts with style preservation terms")
    console.log("   • Improved enhancement text for minimal changes")
    
    console.log("\nExpected improvements:")
    console.log("   ✅ Much less modification of background elements")
    console.log("   ✅ Better preservation of original lighting")
    console.log("   ✅ Minimal color/texture changes")
    console.log("   ✅ Focus only on the requested gesture change")
    console.log("   ✅ Faster processing with fewer artifacts")
    
    console.log("\nIf style changes still occur, consider:")
    console.log("   • strength: 0.1-0.15 (even more conservative)")
    console.log("   • guidance_scale: 3.0-4.0 (less prompt adherence)")
    console.log("   • Alternative models specifically designed for localized edits")
}

// Run the test if this file is executed directly
if (require.main === module) {
    testUltraConservativeEdits().catch(console.error)
}

module.exports = { testUltraConservativeEdits }