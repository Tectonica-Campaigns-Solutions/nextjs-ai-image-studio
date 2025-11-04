# Base64 Image Support - Flux Pro Image Combine

## 📋 Overview

El endpoint `/api/flux-pro-image-combine` ahora soporta imágenes en formato **Base64**, además de los formatos existentes (archivos subidos y URLs).

## ✨ Features

- ✅ Soporte completo para imágenes en Base64
- ✅ Compatible con data URLs (`data:image/jpeg;base64,...`)
- ✅ Compatible con strings Base64 raw (sin prefijo)
- ✅ Detección automática de MIME type
- ✅ Validación de formato y tamaño
- ✅ Integración transparente con el pipeline existente
- ✅ Límite de 10MB por imagen

## 🎯 Use Cases

1. **APIs que devuelven Base64**: Integración directa con servicios que retornan imágenes en Base64
2. **Testing**: Facilita pruebas con imágenes generadas programáticamente
3. **No requiere almacenamiento temporal**: Las imágenes se procesan directamente
4. **Integraciones**: Útil para microservicios que trabajan con Base64

## 📝 API Documentation

### Request Parameters

El endpoint ahora acepta **3 tipos de entrada** para imágenes:

#### 1. Archivos (existente)
```javascript
formData.append('image0', fileObject)
formData.append('image1', fileObject)
```

#### 2. URLs (existente)
```javascript
formData.append('imageUrl0', 'https://example.com/image1.jpg')
formData.append('imageUrl1', 'https://example.com/image2.jpg')
```

#### 3. Base64 (NUEVO) ⭐
```javascript
// Con data URL prefix (recomendado)
formData.append('imageBase640', 'data:image/jpeg;base64,/9j/4AAQSkZJRg...')
formData.append('imageBase641', 'data:image/png;base64,iVBORw0KGgo...')

// Sin prefix (raw base64)
formData.append('imageBase640', '/9j/4AAQSkZJRg...')
formData.append('imageBase641', 'iVBORw0KGgo...')
```

### Request Format

```http
POST /api/flux-pro-image-combine
Content-Type: multipart/form-data

prompt: "Combine these images into an artistic composition"
imageBase640: data:image/jpeg;base64,<base64-string>
imageBase641: data:image/png;base64,<base64-string>
settings: {"aspect_ratio": "16:9", "num_images": 1}
```

### Supported Formats

- **JPEG/JPG**: `data:image/jpeg;base64,...` o `data:image/jpg;base64,...`
- **PNG**: `data:image/png;base64,...`
- **WebP**: `data:image/webp;base64,...`
- **Raw Base64**: Sin prefijo (se asume JPEG por defecto)

### Size Limits

- **Máximo por imagen**: 10MB
- **Total de imágenes requeridas**: Exactamente 2
- **Nota**: Base64 aumenta el tamaño ~33% vs imagen original

## 🚀 Usage Examples

### Example 1: JavaScript/Node.js

```javascript
const FormData = require('form-data');
const fetch = require('node-fetch');
const fs = require('fs');

// Convertir imagen a base64
function imageToBase64(imagePath) {
  const imageBuffer = fs.readFileSync(imagePath);
  const base64 = imageBuffer.toString('base64');
  return `data:image/jpeg;base64,${base64}`;
}

async function combineImages() {
  const formData = new FormData();
  
  // Opción 1: Desde archivos
  const image1Base64 = imageToBase64('./image1.jpg');
  const image2Base64 = imageToBase64('./image2.jpg');
  
  formData.append('prompt', 'Create a beautiful blend of these images');
  formData.append('imageBase640', image1Base64);
  formData.append('imageBase641', image2Base64);
  formData.append('settings', JSON.stringify({
    aspect_ratio: '16:9',
    num_images: 1,
    guidance_scale: 3.5
  }));
  
  const response = await fetch('http://localhost:3000/api/flux-pro-image-combine', {
    method: 'POST',
    body: formData,
    headers: formData.getHeaders()
  });
  
  const result = await response.json();
  
  if (result.success) {
    console.log('Combined image URL:', result.image);
  }
}
```

### Example 2: cURL

```bash
# Con data URL prefix
curl -X POST http://localhost:3000/api/flux-pro-image-combine \
  -F "prompt=Combine these artistic images" \
  -F "imageBase640=data:image/jpeg;base64,/9j/4AAQSkZJRg..." \
  -F "imageBase641=data:image/png;base64,iVBORw0KGgo..." \
  -F 'settings={"aspect_ratio":"1:1","num_images":1}'
```

### Example 3: Python

```python
import requests
import base64

def combine_base64_images(image1_path, image2_path):
    # Leer y convertir imágenes a base64
    with open(image1_path, 'rb') as f:
        image1_b64 = base64.b64encode(f.read()).decode('utf-8')
        image1_data = f'data:image/jpeg;base64,{image1_b64}'
    
    with open(image2_path, 'rb') as f:
        image2_b64 = base64.b64encode(f.read()).decode('utf-8')
        image2_data = f'data:image/jpeg;base64,{image2_b64}'
    
    # Preparar request
    data = {
        'prompt': 'Combine these images beautifully',
        'imageBase640': image1_data,
        'imageBase641': image2_data,
        'settings': '{"aspect_ratio":"16:9"}'
    }
    
    response = requests.post(
        'http://localhost:3000/api/flux-pro-image-combine',
        data=data
    )
    
    result = response.json()
    
    if result.get('success'):
        print(f"Combined image: {result['image']}")
    else:
        print(f"Error: {result.get('error')}")

# Uso
combine_base64_images('photo1.jpg', 'photo2.jpg')
```

### Example 4: Mixed Inputs

```javascript
// Mezclar diferentes tipos de entrada
const formData = new FormData();

formData.append('prompt', 'Artistic composition');
formData.append('imageBase640', 'data:image/jpeg;base64,...'); // Base64
formData.append('imageUrl1', 'https://example.com/image.jpg'); // URL

// También se puede mezclar con files:
// formData.append('image0', fileObject); // File
// formData.append('imageBase641', base64String); // Base64
```

## ⚙️ Technical Details

### Processing Flow

1. **Detección**: El endpoint detecta parámetros `imageBase64[0-9]+`
2. **Validación**: 
   - Verifica formato base64 válido
   - Extrae MIME type del data URL (si existe)
   - Valida tamaño (max 10MB)
3. **Conversión**: Base64 → Buffer → Blob → File
4. **Upload**: El File se sube a fal.ai storage
5. **Pipeline**: Se usa el pipeline normal de 2 pasos (seedream → flux-combine)

### Validation Rules

```typescript
// Formato base64 válido
/^[A-Za-z0-9+/=]+$/

// MIME types soportados
['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

// Límite de tamaño
maxSize = 10 * 1024 * 1024 // 10MB
```

### Error Handling

El endpoint retorna errores específicos para:

- ❌ Base64 inválido: `"Invalid base64 format"`
- ❌ Imagen muy grande: `"Base64 image is too large: XMB (max: 10MB)"`
- ❌ Buffer vacío: `"Empty image buffer"`
- ❌ Número incorrecto: `"Enhanced pipeline requires exactly 2 images"`

## 🧪 Testing

Ejecuta el test suite completo:

```bash
node test-flux-combine-base64.js
```

El test incluye:
- ✅ Test 1: Dos imágenes base64 completas
- ✅ Test 2: Base64 + URL (inputs mixtos)
- ✅ Test 3: Base64 sin prefijo data URL
- ✅ Test 4: Casos de error (validación)
- ✅ Test 5: Imágenes grandes realistas

## 📊 Response Format

La respuesta es idéntica al formato existente:

```json
{
  "success": true,
  "image": "https://fal.media/files/...",
  "width": 1280,
  "height": 720,
  "prompt": "Final processed prompt",
  "originalPrompt": "User's original prompt",
  "inputImages": 2,
  "enhancedPipeline": true,
  "pipelineSteps": [
    {
      "step": 1,
      "operation": "seedream-v4-edit",
      "inputImage": "https://...",
      "outputImage": "https://...",
      "prompt": "Style transfer prompt"
    },
    {
      "step": 2,
      "operation": "flux-pro-image-combine",
      "inputImages": ["https://...", "https://..."],
      "outputImage": "https://...",
      "prompt": "User's final prompt"
    }
  ],
  "model": "flux-pro/kontext/max/multi",
  "timestamp": "2025-11-04T..."
}
```

## 🎨 Best Practices

1. **Usa data URL prefix**: Incluye `data:image/jpeg;base64,` para mejor detección
2. **Optimiza tamaño**: Comprime imágenes antes de convertir a base64
3. **MIME type correcto**: Usa el MIME type apropiado (jpeg, png, webp)
4. **Validación client-side**: Valida tamaño antes de enviar al servidor
5. **Manejo de errores**: Implementa retry logic para errores de red

## 📈 Performance Considerations

- **Tamaño de payload**: Base64 aumenta ~33% el tamaño
- **Tiempo de procesamiento**: Similar a Files/URLs (el upload es el paso extra)
- **Límite de request**: Considera límites de body size del servidor
- **Memory usage**: Base64 → Buffer conversion usa memoria

## 🔒 Security

- ✅ Validación de formato base64
- ✅ Límite de tamaño (10MB)
- ✅ Content type validation
- ✅ Buffer size validation
- ✅ Same security as file uploads

## 🆕 Migration Guide

### Antes (solo Files y URLs)
```javascript
formData.append('image0', fileObject)
formData.append('imageUrl1', 'https://...')
```

### Ahora (+ Base64)
```javascript
// Opción A: File (sin cambios)
formData.append('image0', fileObject)

// Opción B: URL (sin cambios)
formData.append('imageUrl0', 'https://...')

// Opción C: Base64 (NUEVO)
formData.append('imageBase640', 'data:image/jpeg;base64,...')
```

**No hay breaking changes** - Los métodos existentes siguen funcionando igual.

## 🐛 Troubleshooting

### Error: "Invalid base64 format"
- **Causa**: String no es base64 válido
- **Solución**: Verifica que solo contenga caracteres `[A-Za-z0-9+/=]`

### Error: "Empty image buffer"
- **Causa**: Decoding base64 resultó en buffer vacío
- **Solución**: Verifica que el base64 esté completo y correcto

### Error: "Base64 image is too large"
- **Causa**: Imagen > 10MB
- **Solución**: Comprime la imagen antes de convertir a base64

### Error: "Enhanced pipeline requires exactly 2 images"
- **Causa**: No se enviaron exactamente 2 imágenes
- **Solución**: Envía 2 imágenes (cualquier combinación de file/url/base64)

## 📚 References

- [fal.ai Documentation](https://fal.ai/docs)
- [Base64 Encoding](https://developer.mozilla.org/en-US/docs/Glossary/Base64)
- [Data URLs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URLs)
- [FormData API](https://developer.mozilla.org/en-US/docs/Web/API/FormData)

## 🎉 Summary

El soporte de Base64 en `/api/flux-pro-image-combine` proporciona:

- ✨ **Flexibilidad**: 3 formas de proporcionar imágenes (file, url, base64)
- 🔄 **Compatibilidad**: Funciona con servicios que usan base64
- 🚀 **Simplicidad**: No requiere almacenamiento temporal
- 🔒 **Seguridad**: Mismas validaciones que files/urls
- 📦 **Transparencia**: Se integra con el pipeline existente

---

**Version**: 1.0.0  
**Date**: November 4, 2025  
**Endpoint**: `/api/flux-pro-image-combine`
