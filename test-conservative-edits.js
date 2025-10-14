/**
 * Test script to verify conservative edit behavior
 * Tests the "make the person with a fist up" prompt with the new conservative parameters
 */

async function testConservativeEdits() {
    console.log("🧪 Testing Conservative Edit Parameters")
    console.log("=" * 60)
    
    const testPrompt = "make the person with a fist up"
    console.log(`Testing prompt: "${testPrompt}"`)
    
    // Test cases for both endpoints
    const endpoints = [
        {
            name: "External Edit-Image",
            url: 'http://localhost:3000/api/external/edit-image',
            method: 'formData'
        },
        // Note: Internal endpoint would need authentication setup
        // {
        //     name: "Internal Edit-Image", 
        //     url: 'http://localhost:3000/api/edit-image',
        //     method: 'formData'
        // }
    ]
    
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
    
    for (const endpoint of endpoints) {
        console.log(`\n🔍 Testing ${endpoint.name}`)
        console.log("-".repeat(40))
        
        try {
            const formData = new FormData()
            const blob = new Blob([testImageBuffer], { type: 'image/png' })
            formData.append('image', blob, 'test.png')
            formData.append('prompt', testPrompt)
            formData.append('useJSONEnhancement', 'false') // Explicitly disable for precise edits
            
            const startTime = Date.now()
            const response = await fetch(endpoint.url, {
                method: 'POST',
                body: formData
            })
            const endTime = Date.now()
            
            const result = await response.json()
            
            console.log(`   Status: ${response.status}`)
            console.log(`   Processing time: ${endTime - startTime}ms`)
            
            if (response.status === 200 && result.success) {
                console.log(`   ✅ SUCCESS: Edit completed`)
                console.log(`   Image URL: ${result.image?.substring(0, 50)}...`)
                
                // Check the processing metadata
                if (result.processing) {
                    console.log(`   Model: ${result.processing.model}`)
                    console.log(`   Enhancements applied: ${result.processing.enhancementsApplied || 0}`)
                }
                
                // Check if JSON enhancement was properly disabled
                if (result.prompt) {
                    console.log(`   Original prompt: ${result.prompt.original}`)
                    console.log(`   Final prompt: ${result.prompt.final}`)
                    console.log(`   Enhanced: ${result.prompt.enhanced}`)
                    
                    if (result.prompt.enhanced === false) {
                        console.log(`   ✅ JSON Enhancement properly disabled`)
                    } else {
                        console.log(`   ⚠️  JSON Enhancement was applied`)
                        if (result.prompt.jsonMetadata) {
                            console.log(`   Applied text: "${result.prompt.jsonMetadata.appliedText}"`)
                        }
                    }
                }
                
                // Check safety protections
                if (result.safetyProtections) {
                    console.log(`   Safety: ${result.safetyProtections.negativeTermsApplied} negative terms applied`)
                }
                
            } else if (response.status === 400 && result.moderation) {
                console.log(`   🛡️  Content moderation active (expected)`)
                console.log(`   Reason: ${result.details}`)
            } else if (response.status === 500) {
                console.log(`   ⚠️  Service error (possibly FAL_API_KEY not configured)`)
                console.log(`   Error: ${result.error}`)
                console.log(`   Details: ${result.details}`)
            } else {
                console.log(`   ❌ Unexpected response`)
                console.log(`   Response:`, JSON.stringify(result, null, 2))
            }
            
        } catch (error) {
            console.log(`   ❌ ERROR: ${error.message}`)
        }
    }
    
    console.log("\n" + "=" * 60)
    console.log("📊 CONSERVATIVE EDIT TEST SUMMARY:")
    console.log("Expected behavior with new parameters:")
    console.log("   • strength: 0.35 (more conservative changes)")
    console.log("   • num_inference_steps: 20 (faster, less aggressive processing)")
    console.log("   • JSON enhancement: disabled by default") 
    console.log("   • Enhancement text: 'Only make the requested change, preserve everything else exactly as it is'")
    console.log("\nResult: The image should now preserve original style, colors, and background")
    console.log("while only adding the requested fist gesture.")
}

// Run the test if this file is executed directly
if (require.main === module) {
    testConservativeEdits().catch(console.error)
}

module.exports = { testConservativeEdits }