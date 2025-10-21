/**
 * Simple test script to verify ARK API key and endpoint
 */

async function testArkApiKey() {
    console.log("🔑 Testing ARK API Key Configuration")
    console.log("=====================================")
    
    // Test different API endpoints and configurations
    const testConfigs = [
        {
            name: "Current Config",
            url: "https://ark.cn-beijing.volces.com/api/v3/images/generations",
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.ARK_API_KEY || 'a1052aca-82bd-47f4-b3fe-0bb78791aa65'}`
            }
        },
        {
            name: "Alternative Auth Format",
            url: "https://ark.cn-beijing.volces.com/api/v3/images/generations",
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': process.env.ARK_API_KEY || 'a1052aca-82bd-47f4-b3fe-0bb78791aa65'
            }
        }
    ]
    
    for (const config of testConfigs) {
        console.log(`\n🧪 Testing: ${config.name}`)
        console.log(`URL: ${config.url}`)
        console.log(`Headers:`, Object.keys(config.headers))
        
        try {
            const response = await fetch(config.url, {
                method: 'POST',
                headers: config.headers,
                body: JSON.stringify({
                    model: "seedream-4-0-250828",
                    prompt: "test",
                    size: "1K"
                })
            })
            
            console.log(`Status: ${response.status}`)
            console.log(`Status Text: ${response.statusText}`)
            
            const responseHeaders = {}
            response.headers.forEach((value, key) => {
                responseHeaders[key] = value
            })
            console.log(`Response Headers:`, responseHeaders)
            
            const responseText = await response.text()
            console.log(`Response Body:`, responseText.substring(0, 500))
            
            if (response.status === 401) {
                console.log("❌ Authentication failed - Invalid API key")
            } else if (response.status === 200) {
                console.log("✅ API key is valid!")
                break
            } else {
                console.log(`⚠️ Unexpected status: ${response.status}`)
            }
            
        } catch (error) {
            console.log(`❌ Request failed:`, error.message)
        }
    }
    
    console.log("\n📋 API Key Information:")
    console.log(`From .env.local: ${process.env.ARK_API_KEY ? 'SET' : 'NOT SET'}`)
    console.log(`Length: ${(process.env.ARK_API_KEY || 'a1052aca-82bd-47f4-b3fe-0bb78791aa65').length} characters`)
    console.log(`Format: ${(process.env.ARK_API_KEY || 'a1052aca-82bd-47f4-b3fe-0bb78791aa65').includes('-') ? 'UUID-like' : 'Other'}`)
}

// Also test with minimal payload
async function testMinimalRequest() {
    console.log("\n🔬 Testing Minimal Request")
    console.log("==========================")
    
    try {
        const response = await fetch("https://ark.cn-beijing.volces.com/api/v3/images/generations", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.ARK_API_KEY || 'a1052aca-82bd-47f4-b3fe-0bb78791aa65'}`
            },
            body: JSON.stringify({
                model: "seedream-4-0-250828",
                prompt: "a simple test image"
            })
        })
        
        console.log(`Minimal request status: ${response.status}`)
        const result = await response.text()
        console.log(`Minimal request response:`, result.substring(0, 200))
        
    } catch (error) {
        console.log("Minimal request failed:", error.message)
    }
}

if (require.main === module) {
    // Load environment variables manually since we're not in Next.js context
    require('dotenv').config({ path: '.env.local' })
    
    testArkApiKey()
        .then(() => testMinimalRequest())
        .catch(console.error)
}

module.exports = { testArkApiKey, testMinimalRequest }