// Test RAG system functionality
async function testRAG() {
  try {
    const response = await fetch('http://localhost:3000/api/enhance-prompt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: 'Create a professional portrait of an ACLU lawyer in their office'
      })
    });

    const result = await response.json();
    console.log('Enhanced prompt:', result.enhancedPrompt);
    console.log('Relevant guidelines found:', result.relevantGuidelines.length);
    console.log('Guidelines:', result.relevantGuidelines.map(g => `${g.category}: ${g.text}`));
  } catch (error) {
    console.error('Error testing RAG:', error);
  }
}

testRAG();
