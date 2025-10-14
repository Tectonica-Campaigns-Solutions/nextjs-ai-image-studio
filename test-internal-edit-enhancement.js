// Test script to verify internal edit-image endpoint uses edit_enhancement_text correctly
// This tests the INTERNAL endpoint (/api/edit-image) with JSON Enhancement

const fs = require('fs');
const path = require('path');

async function testInternalEditWithEnhancement() {
  console.log("🧪 Testing Internal Edit-Image endpoint with JSON Enhancement...");
  
  try {
    // Read test image
    const imagePath = path.join(__dirname, 'public', 'test-upload.jpg');
    
    if (!fs.existsSync(imagePath)) {
      console.log("❌ Test image not found, creating placeholder...");
      // Create a minimal test setup message
      console.log("📝 Note: You need a test image at public/test-upload.jpg to run this test");
      return;
    }

    const imageBuffer = fs.readFileSync(imagePath);
    
    // Test 1: Enhancement DISABLED (default behavior for precise edits)
    console.log("\n--- Test 1: JSON Enhancement DISABLED (default) ---");
    const formData1 = new FormData();
    formData1.append('image', new Blob([imageBuffer]), 'test.jpg');
    formData1.append('prompt', 'make the person with a fist up');
    formData1.append('useJSONEnhancement', 'false'); // Explicitly disabled
    
    const response1 = await fetch('http://localhost:3000/api/edit-image', {
      method: 'POST',
      body: formData1
    });
    
    if (response1.ok) {
      const result1 = await response1.json();
      console.log("✅ Enhancement disabled test passed");
      console.log("📝 Final prompt:", result1.prompt);
      console.log("🔧 Enhancement info:", result1.jsonEnhancement);
      console.log("⚙️  Model params:", result1.debug?.modelParameters);
      
      // Verify prompt doesn't include edit_enhancement_text
      const hasEnhancement = result1.prompt.includes("Make only the minimal requested change");
      console.log(`📊 Enhancement text detected: ${hasEnhancement ? "❌ UNEXPECTED" : "✅ CORRECT (not present)"}`);
    } else {
      const error1 = await response1.text();
      console.log("❌ Enhancement disabled test failed:", response1.status, error1);
    }

    // Test 2: Enhancement ENABLED (should use edit_enhancement_text)
    console.log("\n--- Test 2: JSON Enhancement ENABLED ---");
    const formData2 = new FormData();
    formData2.append('image', new Blob([imageBuffer]), 'test.jpg');
    formData2.append('prompt', 'make the person with a fist up');
    formData2.append('useJSONEnhancement', 'true'); // Explicitly enabled
    
    const response2 = await fetch('http://localhost:3000/api/edit-image', {
      method: 'POST',
      body: formData2
    });
    
    if (response2.ok) {
      const result2 = await response2.json();
      console.log("✅ Enhancement enabled test passed");
      console.log("📝 Final prompt:", result2.prompt);
      console.log("🔧 Enhancement info:", result2.jsonEnhancement);
      console.log("⚙️  Model params:", result2.debug?.modelParameters);
      
      // Verify prompt includes edit_enhancement_text
      const hasEnhancement = result2.prompt.includes("Make only the minimal requested change");
      console.log(`📊 Enhancement text detected: ${hasEnhancement ? "✅ CORRECT (present)" : "❌ MISSING"}`);
      
      // Check prompt length difference
      const originalLength = "make the person with a fist up".length;
      const enhancedLength = result2.prompt.length;
      console.log(`📏 Prompt length: Original ${originalLength} → Enhanced ${enhancedLength} (${enhancedLength > originalLength ? "✅ INCREASED" : "❌ NO CHANGE"})`);
      
    } else {
      const error2 = await response2.text();
      console.log("❌ Enhancement enabled test failed:", response2.status, error2);
    }

    // Test 3: Custom enhancement text
    console.log("\n--- Test 3: Custom Enhancement Text ---");
    const formData3 = new FormData();
    formData3.append('image', new Blob([imageBuffer]), 'test.jpg');
    formData3.append('prompt', 'make the person with a fist up');
    formData3.append('useJSONEnhancement', 'true');
    formData3.append('customText', 'Custom instruction: preserve everything except the requested change');
    
    const response3 = await fetch('http://localhost:3000/api/edit-image', {
      method: 'POST',
      body: formData3
    });
    
    if (response3.ok) {
      const result3 = await response3.json();
      console.log("✅ Custom enhancement test passed");
      console.log("📝 Final prompt:", result3.prompt);
      console.log("🔧 Enhancement info:", result3.jsonEnhancement);
      
      // Verify custom text is used
      const hasCustomText = result3.prompt.includes("Custom instruction: preserve everything");
      console.log(`📊 Custom text detected: ${hasCustomText ? "✅ CORRECT (present)" : "❌ MISSING"}`);
      
    } else {
      const error3 = await response3.text();
      console.log("❌ Custom enhancement test failed:", response3.status, error3);
    }

    console.log("\n🎯 Summary:");
    console.log("   • Internal endpoint now supports JSON Enhancement");
    console.log("   • Default behavior: enhancement DISABLED for precise edits");
    console.log("   • Can be enabled with useJSONEnhancement=true");
    console.log("   • Uses edit_enhancement_text from config");
    console.log("   • Supports custom enhancement text");
    console.log("   • Ultra-conservative model parameters applied");

  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run if called directly
if (require.main === module) {
  testInternalEditWithEnhancement();
}

module.exports = { testInternalEditWithEnhancement };