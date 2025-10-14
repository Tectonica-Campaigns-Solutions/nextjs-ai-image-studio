/**
 * Debug what parameters are actually being sent and received
 */

async function debugParameters() {
    console.log("🔍 Debug Parameters Sent vs Received")
    console.log("=" * 50)
    
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
    
    console.log(`Test prompt: "${testPrompt}" (${testPrompt.length} chars)`)
    
    // Test different ways of sending useJSONEnhancement
    const testCases = [
        { name: "Explicitly FALSE", value: "false" },
        { name: "Explicitly TRUE", value: "true" },
        { name: "Not provided", value: null },
        { name: "Empty string", value: "" },
        { name: "Number 0", value: "0" },
        { name: "Number 1", value: "1" }
    ]
    
    for (const testCase of testCases) {
        console.log(`\n📝 Test: ${testCase.name}`)
        console.log(`   Sending useJSONEnhancement: ${testCase.value}`)
        
        try {
            const formData = new FormData()
            const blob = new Blob([testImageBuffer], { type: 'image/png' })
            formData.append('image', blob, 'test.png')
            formData.append('prompt', testPrompt)
            
            if (testCase.value !== null) {
                formData.append('useJSONEnhancement', testCase.value)
            }
            // If null, don't append the parameter at all
            
            const response = await fetch(testUrl, {
                method: 'POST',
                body: formData
            })
            
            const result = await response.json()
            
            console.log(`   Status: ${response.status}`)
            
            // Check the debug info to see the prompt length
            if (result.debug && result.debug.promptLength) {
                console.log(`   Prompt length: ${result.debug.promptLength} chars`)
                
                if (result.debug.promptLength === 30) {
                    console.log(`   ✅ CORRECT: No enhancement applied (original length)`)
                } else if (result.debug.promptLength === 146) {
                    console.log(`   ❌ WRONG: Enhancement applied (146 chars = with enhancement)`)
                } else {
                    console.log(`   ⚠️  UNEXPECTED: ${result.debug.promptLength} chars`)
                }
            }
            
            // Check if we can see the actual prompt used
            if (result.prompt) {
                console.log(`   Final prompt: "${result.prompt.final?.substring(0, 50)}..."`)
                console.log(`   Enhanced: ${result.prompt.enhanced}`)
            }
            
        } catch (error) {
            console.log(`   ❌ ERROR: ${error.message}`)
        }
    }
    
    console.log("\n" + "=" * 50)
    console.log("🎯 EXPECTED BEHAVIOR:")
    console.log("   • 'false' or not provided should result in 30 characters")
    console.log("   • 'true' should result in 146 characters")
    console.log("   • If ALL cases show 146 chars, there's a bug forcing enhancement")
}

if (require.main === module) {
    debugParameters().catch(console.error)
}

module.exports = { debugParameters }