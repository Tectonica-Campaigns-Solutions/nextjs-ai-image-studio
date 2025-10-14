/**
 * Specific test to debug prompt length discrepancy
 */

async function debugPromptLength() {
    console.log("🔍 Debugging Prompt Length Discrepancy")
    console.log("=" * 50)
    
    const originalPrompt = "make the person with a fist up"
    console.log(`Original prompt: "${originalPrompt}"`)
    console.log(`Original length: ${originalPrompt.length} characters`)
    
    // Check what happens when we add our enhancement text
    const enhancementText = "Make only the minimal requested change. Do not alter background, lighting, colors, textures, or any other elements"
    const combinedPrompt = `${originalPrompt}, ${enhancementText}`
    
    console.log(`\nEnhancement text: "${enhancementText}"`)
    console.log(`Enhancement length: ${enhancementText.length} characters`)
    console.log(`Combined prompt: "${combinedPrompt}"`)
    console.log(`Combined length: ${combinedPrompt.length} characters`)
    
    // Check if 146 matches any of these
    if (combinedPrompt.length === 146) {
        console.log("✅ FOUND: 146 characters matches combined prompt")
        console.log("❌ PROBLEM: Enhancement is being applied even when disabled")
    } else {
        console.log(`⚠️  146 characters doesn't match combined (${combinedPrompt.length})`)
    }
    
    // Check old enhancement text
    const oldEnhancementText = "Keep style of the image. Same color palette and same background."
    const oldCombinedPrompt = `${originalPrompt}, ${oldEnhancementText}`
    console.log(`\nOld enhancement text: "${oldEnhancementText}"`)
    console.log(`Old combined length: ${oldCombinedPrompt.length} characters`)
    
    if (oldCombinedPrompt.length === 146) {
        console.log("✅ FOUND: 146 characters matches OLD enhancement text")
        console.log("❌ PROBLEM: Using old hardcoded value instead of config")
    }
    
    // Check the "wrong" enhancement_text from config
    const wrongEnhancementText = "Make the second image have the style of the other image. Same color palette and same background. People must be kept realistic but rendered in purple and white, with diagonal or curved line textures giving a screen-printed, retro feel."
    const wrongCombinedPrompt = `${originalPrompt}, ${wrongEnhancementText}`
    console.log(`\nWrong enhancement text: "${wrongEnhancementText.substring(0, 60)}..."`)
    console.log(`Wrong combined length: ${wrongCombinedPrompt.length} characters`)
    
    if (wrongCombinedPrompt.length === 146) {
        console.log("✅ FOUND: 146 characters matches WRONG enhancement_text")
        console.log("❌ PROBLEM: Loading enhancement_text instead of edit_enhancement_text")
    }
    
    console.log("\n" + "=" * 50)
    console.log("CONCLUSION:")
    console.log("The 146-character prompt suggests enhancement IS being applied.")
    console.log("We need to find where this is happening and fix it.")
}

if (require.main === module) {
    debugPromptLength().catch(console.error)
}

module.exports = { debugPromptLength }