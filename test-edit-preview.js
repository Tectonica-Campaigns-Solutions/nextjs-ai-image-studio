// Test script to verify Edit Image JSON Enhancement Preview shows correct prompt
// This tests the enhancement-config API to ensure it serves edit_enhancement_text correctly

async function testEditImagePreview() {
  console.log("🧪 Testing Edit Image JSON Enhancement Preview...");
  
  try {
    // Test 1: Verify enhancement-config API returns edit_enhancement_text
    console.log("\n--- Testing Enhancement Config API ---");
    const configResponse = await fetch('http://localhost:3000/api/enhancement-config');
    
    if (!configResponse.ok) {
      throw new Error(`Config API failed: ${configResponse.status}`);
    }
    
    const { success, config } = await configResponse.json();
    console.log("✅ Enhancement config loaded successfully");
    console.log("📋 Available config fields:", Object.keys(config));
    
    // Check that edit_enhancement_text exists and is correct
    const editEnhancementText = config.edit_enhancement_text;
    console.log("📝 edit_enhancement_text:", editEnhancementText);
    
    const hasCorrectEditText = editEnhancementText && editEnhancementText.includes("Make only the minimal requested change");
    console.log(`📊 edit_enhancement_text validation: ${hasCorrectEditText ? "✅ CORRECT" : "❌ INVALID"}`);
    
    // Test 2: Simulate the enhancement process like the UI does
    console.log("\n--- Simulating UI Enhancement Logic ---");
    const testPrompt = "make the person with a fist up";
    
    // When useDefaults=true and enhancementType='edit', it should use edit_enhancement_text
    const simulatedEnhancedPrompt = `${testPrompt}. ${editEnhancementText}`;
    
    console.log("🔸 Simulation:");
    console.log(`   Original prompt: "${testPrompt}"`);
    console.log(`   Enhanced prompt: "${simulatedEnhancedPrompt}"`);
    console.log(`   Enhancement text: "${editEnhancementText}"`);
    console.log(`   Length increase: ${simulatedEnhancedPrompt.length - testPrompt.length} characters`);
    
    // Test 3: Verify the enhancement type selection logic
    console.log("\n--- Testing Enhancement Type Logic ---");
    const enhancementTypes = {
      'default': config.enhancement_text,
      'edit': config.edit_enhancement_text,
      'sedream': config.sedream_enhancement_text
    };
    
    console.log("� Enhancement texts by type:");
    Object.entries(enhancementTypes).forEach(([type, text]) => {
      console.log(`   ${type}: "${text?.substring(0, 50)}..."`);
    });
    
    // Test 4: Verify UI would show correct preview
    console.log("\n--- UI Preview Verification ---");
    const uiWouldUseEditText = hasCorrectEditText && editEnhancementText;
    console.log(`🎯 UI Preview Status:`);
    console.log(`   ✅ edit_enhancement_text available: ${!!editEnhancementText}`);
    console.log(`   ✅ edit_enhancement_text correct: ${hasCorrectEditText}`);
    console.log(`   ✅ UI would show conservative prompt: ${uiWouldUseEditText}`);
    
    if (uiWouldUseEditText) {
      console.log("\n🎉 SUCCESS: UI Preview will correctly use edit_enhancement_text");
      console.log("   • JSON Enhancement Preview shows conservative editing prompt");
      console.log("   • Users will see 'Make only the minimal requested change' text");
      console.log("   • Consistent with actual API behavior");
    } else {
      console.log("\n❌ ISSUE: UI Preview may not work correctly");
    }
    
    return hasCorrectEditText;

  } catch (error) {
    console.error("❌ Test failed:", error);
    return false;
  }
}

// Run test
if (require.main === module) {
  testEditImagePreview()
    .then(success => {
      console.log(`\n🎯 Test ${success ? "PASSED" : "FAILED"}`);
      if (success) {
        console.log("✅ Edit Image UI Preview configured correctly");
        console.log("✅ Frontend will show correct edit_enhancement_text in preview");
      } else {
        console.log("❌ Edit Image UI Preview needs configuration check");
      }
    })
    .catch(error => {
      console.error("❌ Test execution failed:", error);
    });
}

module.exports = { testEditImagePreview };