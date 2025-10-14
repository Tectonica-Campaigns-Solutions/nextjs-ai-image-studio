/**
 * Test to verify the enhancement-config API is returning the correct field
 */

async function testEnhancementConfig() {
    console.log("🔍 Testing Enhancement Config API")
    console.log("=" * 50)
    
    const configUrl = 'http://localhost:3000/api/enhancement-config'
    
    try {
        console.log("📡 Calling /api/enhancement-config...")
        const response = await fetch(configUrl)
        const result = await response.json()
        
        console.log(`Status: ${response.status}`)
        console.log(`Success: ${result.success}`)
        
        if (result.config) {
            console.log("\n📋 Configuration fields found:")
            console.log(`   version: ${result.config.version}`)
            console.log(`   kit: ${result.config.kit}`)
            console.log(`   description: ${result.config.description}`)
            
            console.log("\n🎯 Enhancement text fields:")
            if (result.config.enhancement_text) {
                console.log(`   ✅ enhancement_text: "${result.config.enhancement_text.substring(0, 60)}..."`)
            } else {
                console.log(`   ❌ enhancement_text: NOT FOUND`)
            }
            
            if (result.config.edit_enhancement_text) {
                console.log(`   ✅ edit_enhancement_text: "${result.config.edit_enhancement_text.substring(0, 60)}..."`)
            } else {
                console.log(`   ❌ edit_enhancement_text: NOT FOUND`)
            }
            
            console.log("\n📊 Other fields:")
            console.log(`   defaults: ${result.config.defaults ? 'Present' : 'Missing'}`)
            console.log(`   enforced_negatives: ${result.config.enforced_negatives ? result.config.enforced_negatives.length + ' terms' : 'Missing'}`)
            
        } else {
            console.log("❌ No config object found in response")
        }
        
    } catch (error) {
        console.log(`❌ ERROR: ${error.message}`)
    }
    
    console.log("\n" + "=" * 50)
    console.log("Expected behavior:")
    console.log("   • edit_enhancement_text should contain: 'Make only the minimal requested change...'")
    console.log("   • This field should be used for precise edits in edit-image endpoints")
    console.log("   • enhancement_text is for style transfer operations")
}

// Test the direct file content too
async function testConfigFile() {
    console.log("\n🔍 Testing Direct Config File Content")
    console.log("=" * 50)
    
    try {
        const fs = require('fs').promises
        const path = require('path')
        const configPath = path.join(process.cwd(), 'data', 'rag', 'prompt-enhacement.json')
        
        console.log(`Reading file: ${configPath}`)
        const configContent = await fs.readFile(configPath, 'utf-8')
        const config = JSON.parse(configContent)
        
        console.log("\n📋 Direct file content:")
        console.log(`   enhancement_text: "${config.enhancement_text?.substring(0, 60)}..."`)
        console.log(`   edit_enhancement_text: "${config.edit_enhancement_text?.substring(0, 60)}..."`)
        
        if (config.edit_enhancement_text === "Make only the minimal requested change. Do not alter background, lighting, colors, textures, or any other elements") {
            console.log("   ✅ edit_enhancement_text has the correct ultra-conservative value")
        } else {
            console.log("   ⚠️  edit_enhancement_text might not have the expected value")
        }
        
    } catch (error) {
        console.log(`❌ ERROR reading config file: ${error.message}`)
    }
}

// Run both tests
async function runAllTests() {
    await testEnhancementConfig()
    await testConfigFile()
}

if (require.main === module) {
    runAllTests().catch(console.error)
}

module.exports = { testEnhancementConfig, testConfigFile }