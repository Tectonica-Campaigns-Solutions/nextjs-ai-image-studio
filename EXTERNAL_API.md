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
      "model": "flux",
      "supportedInputFormats": ["png", "jpg", "jpeg", "webp"],
      "supportedOutputFormats": ["png", "jpg", "webp"],
      "maxFileSize": "10MB"
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
  "image": "https://v3.fal.media/files/...",
  "images": [
    {
      "url": "https://v3.fal.media/files/..."
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

### 3. Image Editing

**POST /api/external/edit-image**

Edit existing images with AI-powered modifications using the FLUX model.

#### Request Body (multipart/form-data)
- **image** (required): Image file to edit (PNG, JPG, JPEG, WEBP, max 10MB)
- **prompt** (required): Description of desired edits
- **useRAG** (optional, default: true): Whether to enhance prompt with branding guidelines

#### Example using curl:
```bash
curl -X POST "https://your-domain.com/api/external/edit-image" \
  -F "image=@path/to/your/image.jpg" \
  -F "prompt=change the sky to sunset colors" \
  -F "useRAG=true"
```

#### Response
```json
{
  "success": true,
  "image": "https://v3.fal.media/files/...",
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
  "processing": {
    "model": "flux",
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
- **400**: Bad Request (missing parameters, invalid content)
- **413**: File too large
- **415**: Unsupported media type
- **500**: Internal server error

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

### JavaScript/Fetch Example (Image Editing)
```javascript
const formData = new FormData();
formData.append('image', fileInput.files[0]);
formData.append('prompt', 'make the background more professional');
formData.append('useRAG', 'true');

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
```

### Python Example
```python
import requests
import json

# Text-to-Image
response = requests.post(
    'https://your-domain.com/api/external/text-to-image',
    json={
        'prompt': 'A peaceful demonstration with diverse participants',
        'useRAG': True,
        'settings': {
            'image_size': 'landscape_4_3',
            'num_images': 1
        }
    }
)

result = response.json()
if result['success']:
    print(f"Generated image: {result['image']}")
else:
    print(f"Error: {result['error']}")

# Image Editing
with open('image.jpg', 'rb') as f:
    files = {'image': f}
    data = {
        'prompt': 'add professional lighting',
        'useRAG': 'true'
    }
    
    response = requests.post(
        'https://your-domain.com/api/external/edit-image',
        files=files,
        data=data
    )

result = response.json()
if result['success']:
    print(f"Edited image: {result['image']}")
else:
    print(f"Error: {result['error']}")
```

## Support

For technical support or questions about the API, please refer to the main application documentation or contact the development team.
