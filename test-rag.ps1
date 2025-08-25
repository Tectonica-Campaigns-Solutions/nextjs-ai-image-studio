$headers = @{ 'Content-Type' = 'application/json' }
$body = @{ 
    prompt = 'Create a professional portrait of an ACLU lawyer' 
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri 'http://localhost:3000/api/enhance-prompt' -Method POST -Headers $headers -Body $body
    Write-Output "Enhanced Prompt:"
    Write-Output $response.enhancedPrompt
    Write-Output ""
    Write-Output "Relevant Guidelines Found: $($response.relevantGuidelines.Count)"
    foreach ($guideline in $response.relevantGuidelines) {
        Write-Output "- $($guideline.category): $($guideline.text)"
    }
} catch {
    Write-Output "Error: $($_.Exception.Message)"
}
