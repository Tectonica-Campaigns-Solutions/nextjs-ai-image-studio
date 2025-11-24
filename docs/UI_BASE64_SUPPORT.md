# Base64 Image Support in Combine Images UI

## 📋 Overview

Se ha agregado soporte completo para imágenes Base64 en la interfaz de "Combine Images". Los usuarios ahora pueden pegar imágenes codificadas en Base64 directamente en la UI, además de cargar archivos o proporcionar URLs.

## ✨ Características

### Frontend (UI)
- **Campo de entrada Base64**: Textarea dedicado para pegar strings Base64
- **Validación en tiempo real**: Verifica formato antes de agregar
- **Preview de imágenes**: Muestra thumbnails de las imágenes Base64 agregadas
- **Gestión de imágenes**: Botón para eliminar imágenes Base64 individuales
- **Compatibilidad total**: Funciona junto con archivos cargados y URLs

### Backend (API)
- **Endpoint externo actualizado**: `/api/external/flux-pro-image-combine` ahora acepta Base64
- **Endpoint interno ya compatible**: `/api/flux-pro-image-combine` ya tenía soporte Base64
- **Validación robusta**: Verifica formato, tamaño (10MB max) y tipo MIME
- **Conversión automática**: Base64 → Buffer → Blob → File → fal.ai storage
- **Soporte para múltiples formatos**:
  - Data URLs: `data:image/jpeg;base64,/9j/4AAQ...`
  - Base64 puro: `/9j/4AAQ...`

## 🎨 Cómo Usar en la UI

### Paso 1: Abrir Combine Images Modal
1. En la aplicación, haz clic en una imagen
2. Selecciona "Combine Images" del menú

### Paso 2: Agregar Imágenes Base64
1. Copia tu imagen en Base64 (con o sin prefijo data URL)
2. Pega el string en el campo "Add Base64 Images"
3. Haz clic en el botón "Add"
4. La imagen aparecerá como thumbnail en la sección "Additional images (Base64)"

### Paso 3: Configurar y Generar
1. Escribe tu prompt describiendo cómo combinar las imágenes
2. Selecciona el aspect ratio deseado
3. Haz clic en el botón de enviar (Send)
4. Espera a que el pipeline procese las imágenes

### Ejemplo Visual

```
┌─────────────────────────────────────────┐
│ Combine Images                          │
├─────────────────────────────────────────┤
│                                         │
│ Prompt: [Combine these images...]       │
│                                         │
│ [Upload] [1:1 ▼] [Send]                │
│                                         │
│ Add Base64 Images (Optional):          │
│ ┌─────────────────────────────────┐   │
│ │ data:image/jpeg;base64,/9j/4... │   │
│ └─────────────────────────────────┘   │
│                       [Add]             │
│ 2 Base64 image(s) added                │
│                                         │
│ Additional images (Base64)              │
│ [img1] [img2]                          │
│   ×      ×                             │
│                                         │
│ Base image        Combined image        │
│ [preview]         [result]              │
└─────────────────────────────────────────┘
```

## 🔧 Cambios Técnicos

### 1. `components/ui/combine-modal.tsx`

**Nuevos estados:**
```typescript
const [base64Images, setBase64Images] = useState<string[]>([]);
const [base64Input, setBase64Input] = useState("");
```

**Nuevas funciones:**
```typescript
// Agregar imagen Base64 con validación
const handleAddBase64Image = () => {
  const trimmed = base64Input.trim();
  const isDataUrl = trimmed.startsWith('data:');
  const isBase64 = /^[A-Za-z0-9+/=]+$/.test(...);
  
  if (isDataUrl || isBase64) {
    setBase64Images((prev) => [...prev, trimmed]);
    setBase64Input("");
  }
}

// Eliminar imagen Base64
const handleRemoveBase64Image = (index: number) => {
  setBase64Images((prev) => prev.filter((_, i) => i !== index));
}
```

**Envío actualizado:**
```typescript
// Agregar campos Base64 al payload
if (base64Images.length > 0) {
  base64Images.forEach((base64, index) => {
    payload[`imageBase64${index}`] = base64;
  });
}
```

### 2. `app/api/external/flux-pro-image-combine/route.ts`

**Detección de Base64 en JSON:**
```typescript
// Extract Base64 images from JSON body
const base64Images: string[] = []
Object.keys(body).forEach((key) => {
  if (key.startsWith('imageBase64') && typeof body[key] === 'string') {
    base64Images.push(body[key].trim())
  }
})
```

**Procesamiento de Base64:**
```typescript
if (base64Images.length > 0) {
  for (let i = 0; i < base64Images.length; i++) {
    const base64Data = base64Images[i]
    
    // 1. Extraer MIME type del data URL
    let mimeType = 'image/jpeg'
    if (base64Data.startsWith('data:')) {
      const matches = base64Data.match(/^data:([^;]+);base64,(.+)$/)
      if (matches) {
        mimeType = matches[1]
        base64String = matches[2]
      }
    }
    
    // 2. Validar formato y tamaño
    // 3. Convertir a Buffer → Blob → File
    // 4. Subir a fal.ai storage
    const uploadedUrl = await fal.storage.upload(file)
    allImageUrls.push(uploadedUrl)
  }
}
```

**Validación actualizada:**
```typescript
const base64Images = body.base64Images || []
const totalImages = imageFiles.length + imageUrls.length + base64Images.length

if (totalImages !== 2) {
  return NextResponse.json({
    error: "Invalid number of images",
    details: `Found ${imageFiles.length} files, ${imageUrls.length} URLs, and ${base64Images.length} Base64 images`
  }, { status: 400 })
}
```

## 📝 Formatos Base64 Soportados

### 1. Data URL completo (Recomendado)
```
data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBD...
data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA...
data:image/webp;base64,UklGRh4AAABXRUJQVlA4TAYAAAAvAAAA...
```

### 2. Base64 puro (sin prefijo)
```
/9j/4AAQSkZJRgABAQAAAQABAAD/2wBD...
iVBORw0KGgoAAAANSUhEUgAAAAUA...
```

**Nota:** Si no se proporciona el prefijo data URL, se asume `image/jpeg` por defecto.

## 🧪 Testing

### Test Manual en UI
1. Inicia el servidor de desarrollo: `npm run dev`
2. Abre la aplicación en `http://localhost:3000`
3. Sigue los pasos en "Cómo Usar en la UI"

### Test Automatizado
```bash
# Ejecutar test de integración
node test-ui-base64-combine.js
```

Este test simula exactamente lo que la UI envía al API, incluyendo:
- Dos imágenes Base64 con data URL
- Mix de URL + Base64
- Base64 puro sin prefijo

### Test Unitario del Endpoint
```bash
# Test específico del endpoint interno
node test-flux-combine-base64.js
```

## 🔒 Validaciones y Límites

### Validaciones Frontend
- ✅ Verifica que el string sea Base64 válido o data URL
- ✅ Muestra alerta si el formato es inválido
- ✅ Preview automático de la imagen

### Validaciones Backend
- ✅ Formato Base64 válido: `[A-Za-z0-9+/=]+`
- ✅ Tamaño máximo: **10MB** por imagen
- ✅ Tipos MIME permitidos: `image/jpeg`, `image/jpg`, `image/png`, `image/webp`
- ✅ Total de imágenes: exactamente **2** (archivos + URLs + Base64)

### Mensajes de Error
```json
{
  "success": false,
  "error": "Invalid Base64 format",
  "details": "Base64 image 1 contains invalid characters"
}

{
  "success": false,
  "error": "Base64 image too large",
  "details": "Base64 image 1 is 12MB. Maximum allowed size is 10MB."
}

{
  "success": false,
  "error": "Unsupported Base64 image type",
  "details": "Image 1 has type image/gif. Allowed types: image/jpeg, image/jpg, image/png, image/webp"
}
```

## 📊 Ejemplo de Request desde UI

```javascript
// Lo que la UI envía al backend
const payload = {
  prompt: "Combine these two images artistically",
  imageBase640: "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  imageBase641: "data:image/png;base64,iVBORw0KGgo...",
  settings: {
    aspect_ratio: "1:1"
  }
};

fetch('/api/external/flux-pro-image-combine', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
});
```

## 🎯 Response Esperado

```json
{
  "success": true,
  "image": "https://fal.media/files/...",
  "width": 1024,
  "height": 1024,
  "content_type": "image/jpeg",
  "prompt": "Combine these two images artistically",
  "inputImages": 2,
  "uploadedFiles": 0,
  "directUrls": 0,
  "base64Images": 2,
  "enhancedPipeline": true,
  "pipelineSteps": [
    {
      "step": 1,
      "operation": "seedream-v4-edit",
      "inputImage": "https://fal.media/...",
      "outputImage": "https://fal.media/..."
    },
    {
      "step": 2,
      "operation": "flux-pro-image-combine",
      "inputImages": ["https://fal.media/...", "https://fal.media/..."],
      "outputImage": "https://fal.media/..."
    }
  ]
}
```

## 🚀 Casos de Uso

### 1. Usuario con Imágenes Locales
El usuario puede tener imágenes en su clipboard o generadas por otras herramientas que solo están disponibles como Base64, sin necesidad de guardarlas primero como archivos.

### 2. Integración con Otras Herramientas
Aplicaciones de terceros pueden enviar imágenes directamente como Base64 sin pasar por el sistema de archivos.

### 3. Screenshots y Capturas
Screenshots tomados con herramientas que exportan directamente a Base64 pueden ser pegados inmediatamente.

### 4. Testing y Debugging
Facilita el testing manual al poder pegar rápidamente imágenes de prueba sin necesidad de archivos físicos.

## 🔄 Compatibilidad

### ✅ Compatible con:
- Archivos cargados (File upload)
- URLs de imágenes externas
- Mezcla de cualquier combinación (2 imágenes total)

### ✅ Funciona en:
- Chrome/Edge (✓)
- Firefox (✓)
- Safari (✓)
- Opera (✓)

## 📚 Referencias

- **Documentación Base64**: `docs/BASE64_IMAGE_SUPPORT.md`
- **Resumen de Implementación**: `docs/BASE64_IMPLEMENTATION_SUMMARY.md`
- **Test Suite**: `test-flux-combine-base64.js`
- **Test UI Integration**: `test-ui-base64-combine.js`

## 🐛 Troubleshooting

### Problema: "Invalid Base64 format"
**Solución:** Asegúrate de que el string Base64 no tenga espacios, saltos de línea, o caracteres especiales. Solo debe contener `[A-Za-z0-9+/=]`.

### Problema: "Base64 image too large"
**Solución:** La imagen excede los 10MB. Comprime la imagen antes de convertirla a Base64, o usa formato JPEG con menor calidad.

### Problema: No se muestra el preview
**Solución:** Verifica que el Base64 string tenga el prefijo `data:image/...;base64,` para que el navegador pueda renderizarlo.

### Problema: "Invalid number of images"
**Solución:** El endpoint requiere exactamente 2 imágenes. Verifica que estés enviando 2 imágenes en total (combinación de archivos, URLs, y Base64).

## 📞 Soporte

Para problemas o preguntas, revisa:
1. Esta documentación
2. Los tests de ejemplo
3. Los logs del servidor durante el request

---

**Última actualización:** 4 de Noviembre, 2025  
**Versión:** 1.0.0
