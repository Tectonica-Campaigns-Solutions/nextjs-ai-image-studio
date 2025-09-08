# External API Documentation

This document describes the external API endpoints that allow external applications to interact with the AI Image Studio without authentication.

## Base URL

```
https://your-domain.com/api/external
```

## Endpoints

### 1. Configuration Endpoint

**GET /api/external/config**

Returns the current application configuration including available models, settings, and capabilities.

#### Response
```json
{
  "success": true,
  "config": {
    "rag": {
      "available": true,
      "activeRAG": null,
      "description": "RAG enhances prompts with organizational branding guidelines"
    },
    "lora": {
      "available": true,
      "defaultUrl": "https://v3.fal.media/files/...",
      "defaultScale": 1.0,
      "description": "LoRA models allow custom style training and application"
    },
    "textToImage": {
      "endpoint": "/api/external/text-to-image",
      "model": "qwen",
      "supportedFormats": ["png", "jpg", "webp"],
      "maxImages": 4,
      "imageSizes": ["square_hd", "square", "portrait_4_3", "portrait_16_9", "landscape_4_3", "landscape_16_9"],
      "accelerationModes": ["none", "regular", "high"],
      "settings": {
        "num_inference_steps": { "min": 1, "max": 100, "default": 30 },
        "guidance_scale": { "min": 1, "max": 20, "default": 2.5, "step": 0.1 },
        "num_images": { "min": 1, "max": 4, "default": 1 },
        "seed": { "type": "number", "optional": true, "description": "Random if not provided" }
      }
    },
    "editImage": {
      "endpoint": "/api/external/edit-image",
      "model": "qwen-image-edit",
      "supportedInputFormats": ["png", "jpg", "jpeg", "webp"],
      "supportedOutputFormats": ["png", "jpg", "webp"],
      "maxFileSize": "10MB",
      "additionalSettings": {
        "image_size": {
          "options": ["square_hd", "square", "portrait_4_3", "portrait_16_9", "landscape_4_3", "landscape_16_9", "custom"],
          "default": "square_hd",
          "description": "Output image size/aspect ratio",
          "customFields": {
            "width": { "type": "number", "min": 256, "max": 2048, "step": 64, "description": "Custom width in pixels (required when image_size is 'custom')" },
            "height": { "type": "number", "min": 256, "max": 2048, "step": 64, "description": "Custom height in pixels (required when image_size is 'custom')" }
          }
        }
      }
    },
    "guardrails": {
      "enabled": true,
      "contentModeration": true,
      "description": "All requests are automatically screened for appropriate content"
    },
    "version": "1.0.0",
    "timestamp": "2025-09-03T10:30:00.000Z"
  }
}
```

### 2. Text-to-Image Generation

**POST /api/external/text-to-image**

Generate images from text descriptions using the Qwen model.

#### Request Body (JSON)
```json
{
  "prompt": "A peaceful landscape with mountains and a lake",
  "useRAG": true,
  "useLoRA": false,
  "settings": {
    "image_size": "landscape_4_3",
    "num_inference_steps": 30,
    "guidance_scale": 2.5,
    "num_images": 1,
    "output_format": "png",
    "negative_prompt": "",
    "acceleration": "none",
    "seed": 12345
  }
}
```

#### Parameters
- **prompt** (required): Text description for image generation
- **useRAG** (optional, default: true): Whether to enhance prompt with branding guidelines
- **useLoRA** (optional, default: false): Whether to apply custom LoRA styling
- **settings** (optional): Advanced generation settings

#### Response
```json
{
  "success": true,
  "image": "https://v3.fal.media/files/rabbit/...",
  "images": [
    {
      "url": "https://v3.fal.media/files/rabbit/...",
      "width": 1024,
      "height": 768,
      "content_type": "image/png"
    }
  ],
  "prompt": {
    "original": "A peaceful landscape with mountains and a lake",
    "final": "A peaceful landscape with mountains and a lake, following EGP brand guidelines...",
    "enhanced": true,
    "lora_applied": false
  },
  "settings": {
    "image_size": "landscape_4_3",
    "num_inference_steps": 30,
    "guidance_scale": 2.5,
    "num_images": 1,
    "output_format": "png"
  },
  "timestamp": "2025-09-03T10:30:00.000Z"
}
```

### 3. Flux Pro Text-to-Image Generation

**POST /api/external/flux-pro-text-to-image**

Generate high-quality images from text descriptions using the professional Flux Pro model. This endpoint provides superior image quality and supports advanced LoRA customization.

#### Request Body (JSON)
```json
{
  "prompt": "A professional corporate headshot of a diverse team leader",
  "useRAG": true,
  "useLoRA": true,
  "loraUrl": "https://v3.fal.media/files/your-custom-lora.safetensors",
  "loraTriggerPhrase": "corporate style",
  "loraScale": 1.2,
  "settings": {
    "image_size": "landscape_4_3",
    "num_inference_steps": 30,
    "guidance_scale": 3.5,
    "num_images": 1,
    "safety_tolerance": 2,
    "output_format": "jpg",
    "seed": 12345
  }
}
```

#### Parameters
- **prompt** (required): Text description for image generation
- **useRAG** (optional, default: true): Whether to enhance prompt with branding guidelines
- **useLoRA** (optional, default: false): Whether to apply custom LoRA styling
- **loraUrl** (optional): Custom LoRA model URL (uses default if not provided)
- **loraTriggerPhrase** (optional): Specific phrase to activate LoRA styling
- **loraScale** (optional, default: 1.0): LoRA influence strength (0.1-2.0)
- **settings** (optional): Advanced generation settings

#### Flux Pro Specific Settings
- **image_size**: Image dimensions (landscape_4_3, square_hd, portrait_4_3, etc.)
- **num_inference_steps**: Generation quality steps (1-50, default: 30)
- **guidance_scale**: Prompt adherence strength (1-20, default: 3.5)
- **num_images**: Number of images to generate (1-4, default: 1)
- **safety_tolerance**: Content safety level (1-6, default: 2)
- **output_format**: Image format (webp, jpg, png, default: jpg)
- **seed**: Random seed for reproducible results

#### Response
```json
{
  "success": true,
  "image": "https://v3.fal.media/files/rabbit/...",
  "images": [
    {
      "url": "https://v3.fal.media/files/rabbit/...",
      "width": 1024,
      "height": 768,
      "content_type": "image/jpg"
    }
  ],
  "prompt": {
    "original": "A professional corporate headshot",
    "final": "A professional corporate headshot, corporate style",
    "enhanced": true,
    "lora_applied": true,
    "lora_config": {
      "url": "https://v3.fal.media/files/your-custom-lora.safetensors",
      "trigger_phrase": "corporate style",
      "scale": 1.2
    }
  },
  "settings": {
    "image_size": "landscape_4_3",
    "num_inference_steps": 30,
    "guidance_scale": 3.5,
    "loras": [
      {
        "path": "https://v3.fal.media/files/your-custom-lora.safetensors",
        "scale": 1.2
      }
    ]
  },
  "model": "flux-pro/kontext/max",
  "timestamp": "2025-09-03T10:30:00.000Z"
}
```

### 4. Image-to-Image Transformation

**POST /api/external/image-to-image**

Transform existing images using AI-powered image-to-image generation with the Qwen model.

#### Request Body (multipart/form-data)
- **image** (required): Source image file to transform (PNG, JPG, JPEG, WEBP, max 10MB)
- **prompt** (required): Description of the desired transformation
- **useRAG** (optional, default: true): Whether to enhance prompt with branding guidelines
- **useLoRA** (optional, default: false): Whether to apply custom LoRA styling
- **settings** (optional): JSON string with advanced settings

#### Advanced Settings (JSON object)
```json
{
  "image_size": "landscape_4_3",
  "strength": 0.8,
  "guidance_scale": 2.5,
  "num_inference_steps": 30,
  "num_images": 1,
  "output_format": "png",
  "negative_prompt": "",
  "acceleration": "none",
  "seed": 12345
}
```

#### Example using curl:
```bash
curl -X POST "https://your-domain.com/api/external/image-to-image" \
  -F "image=@path/to/your/image.jpg" \
  -F "prompt=transform into oil painting style" \
  -F "useRAG=true" \
  -F "useLoRA=true" \
  -F 'settings={"strength": 0.8, "num_images": 2}'
```

#### Response
```json
{
  "success": true,
  "images": [
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
  ],
  "originalImage": {
    "name": "image.jpg",
    "size": 1024768,
    "type": "image/jpeg"
  },
  "prompt": {
    "original": "transform into oil painting style",
    "final": "transform into oil painting style, following EGP brand guidelines...",
    "enhanced": true,
    "lora_applied": true
  },
  "settings": {
    "image_size": "landscape_4_3",
    "strength": 0.8,
    "guidance_scale": 2.5,
    "num_inference_steps": 30,
    "num_images": 2,
    "output_format": "png"
  },
  "processing": {
    "model": "qwen-image",
    "type": "image-to-image",
    "timestamp": "2025-09-03T10:30:00.000Z"
  }
}
```

### 5. Image Editing

**POST /api/external/edit-image**

Edit existing images with AI-powered modifications using the qwen-image-edit model.

#### Request Body (multipart/form-data)
- **image** (required): Image file to edit (PNG, JPG, JPEG, WEBP, max 10MB)
- **prompt** (required): Description of desired edits
- **useRAG** (optional, default: true): Whether to enhance prompt with branding guidelines
- **image_size** (optional, default: "square_hd"): Output image size/aspect ratio
  - Options: "square_hd", "square", "portrait_4_3", "portrait_16_9", "landscape_4_3", "landscape_16_9", "custom"
- **width** (required when image_size="custom"): Custom width in pixels (256-2048, multiple of 64)
- **height** (required when image_size="custom"): Custom height in pixels (256-2048, multiple of 64)

#### Example using curl:
```bash
curl -X POST "https://your-domain.com/api/external/edit-image" \
  -F "image=@path/to/your/image.jpg" \
  -F "prompt=change the sky to sunset colors" \
  -F "useRAG=true" \
  -F "image_size=landscape_16_9"
```

#### Example with custom dimensions:
```bash
curl -X POST "https://your-domain.com/api/external/edit-image" \
  -F "image=@path/to/your/image.jpg" \
  -F "prompt=make the background more professional" \
  -F "useRAG=true" \
  -F "image_size=custom" \
  -F "width=1280" \
  -F "height=720"
```

#### Response
```json
{
  "success": true,
  "image": "https://v3.fal.media/files/rabbit/...",
  "originalImage": {
    "name": "image.jpg",
    "size": 1024768,
    "type": "image/jpeg"
  },
  "prompt": {
    "original": "change the sky to sunset colors",
    "final": "change the sky to sunset colors, following EGP brand guidelines...",
    "enhanced": true
  },
  "settings": {
    "image_size": "landscape_16_9",
    "width": 1920,
    "height": 1080
  },
  "processing": {
    "model": "qwen-image-edit",
    "timestamp": "2025-09-03T10:30:00.000Z"
  }
}
```

## Error Responses

All endpoints return structured error responses:

```json
{
  "success": false,
  "error": "User-friendly error message",
  "details": "Technical error details",
  "moderation": true
}
```

### Common Error Codes
- **400**: Bad Request (missing parameters, invalid content, invalid image_size)
- **413**: File too large
- **415**: Unsupported media type
- **422**: Unprocessable Entity (invalid custom dimensions or model constraints)
- **500**: Internal server error

### Image Size Options

The `image_size` parameter for the edit-image endpoint supports the following options:

#### Preset Sizes
- **square_hd**: High-definition square format
- **square**: Standard square format  
- **portrait_4_3**: Portrait aspect ratio (4:3)
- **portrait_16_9**: Portrait aspect ratio (16:9)
- **landscape_4_3**: Landscape aspect ratio (4:3)
- **landscape_16_9**: Landscape aspect ratio (16:9)

#### Custom Dimensions
- **custom**: Allows specifying custom width and height
  - Requires both `width` and `height` parameters
  - Valid range: 256-2048 pixels
  - Recommended: Use multiples of 64 for better compatibility
  - Note: Final output dimensions may vary slightly due to model constraints

### Content Moderation

All requests are automatically screened for appropriate content. If content violates policies, you'll receive a detailed error message with suggestions for appropriate alternatives.

## Rate Limiting

Currently, no rate limiting is implemented. Monitor your usage to avoid overloading the service.

## CORS Support

All endpoints include CORS headers to allow cross-origin requests from web applications.

## Examples

### JavaScript/Fetch Example (Text-to-Image)
```javascript
const response = await fetch('https://your-domain.com/api/external/text-to-image', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    prompt: 'A professional team meeting in a modern office',
    useRAG: true,
    settings: {
      image_size: 'landscape_16_9',
      num_images: 1
    }
  })
});

const result = await response.json();
if (result.success) {
  console.log('Generated image:', result.image);
} else {
  console.error('Error:', result.error);
}
```

### JavaScript/Fetch Example (Image-to-Image)
```javascript
// Example with basic transformation
const formData = new FormData();
formData.append('image', fileInput.files[0]);
formData.append('prompt', 'transform into watercolor painting style');
formData.append('useRAG', 'true');
formData.append('useLoRA', 'true');

const response = await fetch('https://your-domain.com/api/external/image-to-image', {
  method: 'POST',
  body: formData
});

const result = await response.json();
if (result.success) {
  console.log('Transformed images:', result.images);
  console.log('Number of results:', result.images.length);
} else {
  console.error('Error:', result.error);
}

// Example with advanced settings
const advancedFormData = new FormData();
advancedFormData.append('image', fileInput.files[0]);
advancedFormData.append('prompt', 'convert to cyberpunk aesthetic');
advancedFormData.append('useRAG', 'true');
advancedFormData.append('useLoRA', 'false');
advancedFormData.append('settings', JSON.stringify({
  strength: 0.6,
  guidance_scale: 7.5,
  num_inference_steps: 50,
  num_images: 3,
  image_size: "square_hd"
}));

const advancedResponse = await fetch('https://your-domain.com/api/external/image-to-image', {
  method: 'POST',
  body: advancedFormData
});

const advancedResult = await advancedResponse.json();
if (advancedResult.success) {
  console.log('Advanced transformed images:', advancedResult.images);
} else {
  console.error('Error:', advancedResult.error);
}
```

### JavaScript/Fetch Example (Image Editing)
```javascript
// Example with preset image size
const formData = new FormData();
formData.append('image', fileInput.files[0]);
formData.append('prompt', 'make the background more professional');
formData.append('useRAG', 'true');
formData.append('image_size', 'landscape_16_9');

const response = await fetch('https://your-domain.com/api/external/edit-image', {
  method: 'POST',
  body: formData
});

const result = await response.json();
if (result.success) {
  console.log('Edited image:', result.image);
} else {
  console.error('Error:', result.error);
}

// Example with custom dimensions
const customFormData = new FormData();
customFormData.append('image', fileInput.files[0]);
customFormData.append('prompt', 'enhance the lighting and colors');
customFormData.append('useRAG', 'true');
customFormData.append('image_size', 'custom');
customFormData.append('width', '1280');
customFormData.append('height', '720');

const customResponse = await fetch('https://your-domain.com/api/external/edit-image', {
  method: 'POST',
  body: customFormData
});

const customResult = await customResponse.json();
if (customResult.success) {
  console.log('Custom edited image:', customResult.image);
} else {
  console.error('Error:', customResult.error);
}
```

## Support

For technical support or questions about the API, please refer to the main application documentation or contact the development team.
