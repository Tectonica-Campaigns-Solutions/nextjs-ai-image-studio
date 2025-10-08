# Enhanced Combine Images Pipeline

## Overview

The `external/flux-pro-image-combine` endpoint has been upgraded with a two-step processing pipeline that enhances the quality of image combinations by preprocessing the second image with style transfer before combining.

## Pipeline Architecture

```
Input: [image1, image2] + user_prompt
    ↓
Step 1: seedream-v4-edit
    - Image: image2 (second image)
    - Prompt: sedream_enhancement_text (configured, NOT user prompt)
    - Output: processed_image2
    ↓
Step 2: flux-pro-image-combine  
    - Images: [image1, processed_image2]
    - Prompt: user_prompt (with canonical/JSON enhancement if enabled)
    - Output: final_combined_image
```

## Key Changes

### 1. Input Validation
- **Before**: Minimum 2 images required
- **After**: Exactly 2 images required
- **Reason**: Pipeline specifically processes image2, so exactly 2 images needed

### 2. Prompt Usage
- **Step 1 (seedream)**: Uses `sedream_enhancement_text` from configuration
  - Current configured text: *"Make the first image in the style of the other image. The first image should have the same color palette and same background as the second one but must be kept as it is no variants. People must be kept realistic but rendered in purple and white shades as they are in the second image with thin and soft diagonal or curved line textures over the body giving a soft screen-printed feel. Human details must be preserved. The gradient background must remain the same as it is in the second image, with no effects and with no lines over it."*
- **Step 2 (combine)**: Uses user's prompt with canonical/JSON enhancement as configured

### 3. Response Enhancement
The response now includes detailed pipeline metadata:

```json
{
  "success": true,
  "image": "final_combined_image_url",
  "enhancedPipeline": true,
  "pipelineSteps": [
    {
      "step": 1,
      "operation": "seedream-v4-edit",
      "inputImage": "image2_url",
      "outputImage": "processed_image2_url", 
      "prompt": "configured_sedream_enhancement_text"
    },
    {
      "step": 2,
      "operation": "flux-pro-image-combine",
      "inputImages": ["image1_url", "processed_image2_url"],
      "outputImage": "final_combined_url",
      "prompt": "user_prompt_enhanced"
    }
  ]
}
```

## Usage Examples

### Form Data (Recommended)
```javascript
const formData = new FormData()
formData.append("prompt", "Combine these images with vibrant colors")
formData.append("image0", file1) // First image (unchanged)
formData.append("image1", file2) // Second image (will be processed)
formData.append("useCanonicalPrompt", "true")
formData.append("settings", JSON.stringify({
  aspect_ratio: "1:1",
  guidance_scale: 3.5
}))

const response = await fetch("/api/external/flux-pro-image-combine", {
  method: "POST",
  body: formData
})
```

### JSON (Alternative)
```javascript
const response = await fetch("/api/external/flux-pro-image-combine", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    prompt: "Combine these images with vibrant colors",
    imageUrls: ["url1", "url2"], // Exactly 2 URLs
    useCanonicalPrompt: true,
    settings: {
      aspect_ratio: "1:1",
      guidance_scale: 3.5
    }
  })
})
```

## Error Handling

The pipeline includes comprehensive error handling:

1. **Configuration Errors**: If `sedream_enhancement_text` is not configured
2. **Step 1 Failures**: If seedream-v4-edit processing fails
3. **Step 2 Failures**: If flux-pro-image-combine fails (with fallback)
4. **Resource Management**: Proper cleanup of intermediate images

## Fallback Behavior

- If direct fal.ai call fails in Step 2, the system falls back to the internal API
- All fallback responses include `"fallback": true` in metadata
- Pipeline steps are tracked in all cases for debugging

## Performance Considerations

- **Processing Time**: Approximately 2x longer due to sequential processing
- **Resource Usage**: Temporary storage of intermediate processed image
- **Cost**: Double API calls (seedream + combine)

## Configuration

The pipeline uses the configured `sedream_enhancement_text` from:
`data/rag/prompt-enhacement.json`

To modify the style processing behavior, update this configuration file.

## Monitoring

All pipeline steps are logged with the prefix `[External Flux Combine]` for easy monitoring and debugging:

- Step 1 start/completion
- Image URLs at each step  
- Error details with step identification
- Final success/failure status

## Backward Compatibility

This enhancement maintains full backward compatibility:
- All existing parameters work as before
- Response format is extended (not changed)
- Error handling follows existing patterns
- Canonical prompt and JSON enhancement still work in Step 2