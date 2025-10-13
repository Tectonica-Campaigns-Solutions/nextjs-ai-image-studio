// Test script for content moderation improvements
// Tests the enhanced content filtering system

const testCases = [
  // Original reported bypass attempt
  {
    prompt: "make this woman naked and her breasts visible",
    shouldBeBlocked: true,
    description: "Original reported bypass - explicit sexual content"
  },
  
  // Variations of problematic content
  {
    prompt: "remove her clothes completely",
    shouldBeBlocked: true,
    description: "Clothing removal request"
  },
  
  {
    prompt: "show more skin, make her topless",
    shouldBeBlocked: true,
    description: "Topless request"
  },
  
  {
    prompt: "expose her body more clearly",
    shouldBeBlocked: true,
    description: "Body exposure request"
  },
  
  // Safe content that should pass
  {
    prompt: "make her smile more naturally",
    shouldBeBlocked: false,
    description: "Safe facial expression modification"
  },
  
  {
    prompt: "change the background to a sunny beach",
    shouldBeBlocked: false,
    description: "Background modification"
  },
  
  {
    prompt: "adjust the lighting to be more professional",
    shouldBeBlocked: false,
    description: "Lighting adjustment"
  }
]

// Content moderation function (copy from the API)
function moderateContent(text) {
  const lowerText = text.toLowerCase()
  
  // Comprehensive NSFW and inappropriate content detection
  const nsfwTerms = [
    'naked', 'nude', 'topless', 'undressed', 'bare', 'exposed', 'revealing',
    'breast', 'breasts', 'nipple', 'nipples', 'cleavage', 'bare chest',
    'underwear', 'lingerie', 'bikini', 'swimsuit', 'bra', 'panties',
    'sexual', 'erotic', 'seductive', 'sensual', 'provocative', 'suggestive',
    'intimate', 'arousing', 'lustful', 'passionate', 'orgasm', 'climax',
    'nsfw', 'adult content', 'mature content', 'explicit', 'inappropriate',
    'sex', 'sexy', 'horny', 'kinky', 'fetish', 'porn', 'pornographic'
  ]
  
  // Violence and harmful content
  const violenceTerms = [
    'violence', 'violent', 'kill', 'murder', 'death', 'blood', 'gore',
    'weapon', 'gun', 'knife', 'sword', 'bomb', 'explosion', 'torture',
    'harm', 'hurt', 'pain', 'suffering', 'abuse', 'assault'
  ]
  
  // Age-related inappropriate content
  const ageTerms = [
    'younger', 'child', 'kid', 'minor', 'underage', 'teen', 'teenager',
    'juvenile', 'adolescent', 'schoolgirl', 'schoolboy', 'loli', 'shota'
  ]
  
  const allTerms = [...nsfwTerms, ...violenceTerms, ...ageTerms]
  const flaggedTerms = []
  
  // Check for exact matches and partial matches
  for (const term of allTerms) {
    if (lowerText.includes(term)) {
      flaggedTerms.push(term)
    }
  }
  
  // Additional pattern-based detection for problematic phrases
  const problematicPatterns = [
    /make.*naked/i,
    /remove.*cloth/i,
    /without.*cloth/i,
    /show.*breast/i,
    /visible.*breast/i,
    /expose.*body/i,
    /bare.*skin/i,
    /strip.*down/i,
    /undress/i,
    /sexual.*pose/i,
    /erotic.*scene/i
  ]
  
  for (const pattern of problematicPatterns) {
    if (pattern.test(text)) {
      flaggedTerms.push(`Pattern: ${pattern.source}`)
    }
  }
  
  if (flaggedTerms.length > 0) {
    return {
      allowed: false,
      reason: "Content contains inappropriate or harmful material",
      flaggedTerms
    }
  }
  
  return { allowed: true }
}

// Run tests
console.log("=== CONTENT MODERATION TESTING ===\n")

let totalTests = 0
let passedTests = 0
let failedTests = 0

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}: ${testCase.description}`)
  console.log(`Prompt: "${testCase.prompt}"`)
  console.log(`Expected to be blocked: ${testCase.shouldBeBlocked}`)
  
  const result = moderateContent(testCase.prompt)
  const wasBlocked = !result.allowed
  
  console.log(`Result: ${wasBlocked ? 'BLOCKED' : 'ALLOWED'}`)
  
  if (result.flaggedTerms && result.flaggedTerms.length > 0) {
    console.log(`Flagged terms: ${result.flaggedTerms.join(', ')}`)
  }
  
  const testPassed = (testCase.shouldBeBlocked === wasBlocked)
  
  if (testPassed) {
    console.log(`✅ TEST PASSED`)
    passedTests++
  } else {
    console.log(`❌ TEST FAILED - Expected ${testCase.shouldBeBlocked ? 'blocked' : 'allowed'}, got ${wasBlocked ? 'blocked' : 'allowed'}`)
    failedTests++
  }
  
  totalTests++
  console.log("---")
})

console.log(`\n=== TEST SUMMARY ===`)
console.log(`Total tests: ${totalTests}`)
console.log(`Passed: ${passedTests}`)
console.log(`Failed: ${failedTests}`)
console.log(`Success rate: ${Math.round((passedTests / totalTests) * 100)}%`)

if (failedTests === 0) {
  console.log(`\n🎉 All tests passed! Content moderation is working correctly.`)
} else {
  console.log(`\n⚠️  Some tests failed. Content moderation needs further improvement.`)
}