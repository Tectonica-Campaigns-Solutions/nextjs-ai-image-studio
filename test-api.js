// Test script to check JSON enhancement API
async function testEnhancementAPI() {
  try {
    console.log('Testing enhancement config API...')
    const response = await fetch('http://localhost:3000/api/enhancement-config')
    const data = await response.json()
    
    console.log('API Response:', JSON.stringify(data, null, 2))
    
    if (data.success && data.config) {
      console.log('Enhancement text length:', data.config.enhancement_text.length)
      console.log('Enhancement text preview:', data.config.enhancement_text.substring(0, 200) + '...')
    }
  } catch (error) {
    console.error('Error testing API:', error)
  }
}

testEnhancementAPI()
