$headers = @{ 'Content-Type' = 'application/json' }
$body = @{ 
    prompt = 'Create a professional portrait of an ACLU lawyer in their office with civil rights books in the background' 
} | ConvertTo-Json

Write-Output "Testing RAG System Enhancement..."
Write-Output "Original prompt: Create a professional portrait of an ACLU lawyer in their office with civil rights books in the background"
Write-Output ""

try {
    $response = Invoke-RestMethod -Uri 'http://localhost:3001/api/enhance-prompt' -Method POST -Headers $headers -Body $body
    Write-Output "✅ RAG Enhancement successful!"
    Write-Output ""
    Write-Output "Enhanced Prompt:"
    Write-Output $response.enhanced_prompt
    Write-Output ""
    Write-Output "Suggested Colors: $($response.suggested_colors -join ', ')"
    Write-Output "Suggested Format: $($response.suggested_format)"
    Write-Output ""
    Write-Output "Branding Elements Found: $($response.branding_elements.Count)"
    if ($response.branding_elements) {
        foreach ($element in $response.branding_elements) {
            Write-Output "- $($element.category): $($element.text)"
        }
    }
} catch {
    Write-Output "❌ Error: $($_.Exception.Message)"
    Write-Output "Details: $($_.Exception.Response.StatusDescription)"
}
