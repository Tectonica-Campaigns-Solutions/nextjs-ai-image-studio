/**
 * Test Script for Advanced RAG System
 * 
 * Run this script to test the advanced RAG functionality
 * Usage: npm run test-advanced-rag
 */

import { testAdvancedRAG, analyzeTaxonomyCoverage, enhancePromptWithAdvancedRAG } from './lib/advanced-rag'

async function runTests() {
  console.log('🚀 Starting Advanced RAG System Tests...\n')

  // Test 1: Analyze taxonomy coverage
  console.log('📊 STEP 1: Analyzing taxonomy coverage...')
  analyzeTaxonomyCoverage()

  // Test 2: Test with various prompts
  console.log('🧪 STEP 2: Testing prompt enhancement...')
  await testAdvancedRAG([
    'professional portrait of a climate activist',
    'group of diverse people in a community garden',
    'sustainable lifestyle photography with natural lighting',
    'environmental demonstration with hopeful mood',
    'corporate meeting about renewable energy',
    'lifestyle shot of young people discussing green politics',
    'documentary style photo of renewable energy project',
    'welcoming community gathering in urban green space'
  ])

  // Test 3: Test specific concept detection
  console.log('🔍 STEP 3: Testing concept detection...')
  
  const conceptTests = [
    'lifestyle photography with authentic expressions',
    'documentary style with natural lighting and hopeful mood',
    'professional corporate portrait with EGP green background',
    'environmental landscape with sustainable elements',
    'diverse group portrait with welcoming atmosphere'
  ]

  for (const prompt of conceptTests) {
    console.log(`\n🎯 Analyzing: "${prompt}"`)
    
    const result = await enhancePromptWithAdvancedRAG(prompt)
    
    console.log(`Detected concepts:`)
    result.applied_concepts.forEach((concept: any) => {
      console.log(`  - ${concept.type}: ${concept.name} (confidence: ${(concept.confidence * 100).toFixed(1)}%)`)
      console.log(`    Original text: "${concept.original_text}"`)
      console.log(`    Context words: [${concept.context_words.join(', ')}]`)
    })
  }

  console.log('\n✅ All tests completed!')
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error)
}

export { runTests }
