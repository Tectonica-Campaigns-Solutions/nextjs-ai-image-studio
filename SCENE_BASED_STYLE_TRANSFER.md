# Scene-Based Style Transfer - Flux 2 Pro Edit Apply

## 📋 Resumen de Cambios

Se ha implementado un sistema de **scene-based style transfer** para el endpoint `/api/external/flux-2-pro-edit-apply`, permitiendo seleccionar diferentes tipos de escena con imágenes de referencia y prompts optimizados para cada caso.

---

## 🎯 Tipos de Escena (sceneType)

### 1. **People** (default)
- **Valor**: `"people"`
- **Imagen de referencia**: `TCT-AI-Individual-Hispanic-Female-Young.png`
- **Descripción**: Optimizado para retratos e imágenes con personas
- **Prompt base**: 
  ```
  Combine the subject or subjects from @image1 with the artistic style and atmosphere of @image2. 
  Do not modify the subjects pose and anatomical features. 
  Do not add subjects from @image2 to @image1.
  ```

### 2. **Landscape**
- **Valor**: `"landscape"`
- **Imagen de referencia**: `TCT-AI-Landmark-2.png`
- **Descripción**: Optimizado para paisajes naturales y escenas al aire libre
- **Prompt base**: 
  ```
  Combine the natural landscape scene from @image1 with the artistic style, color palette, 
  lighting mood, and surface textures of @image2. Preserve the exact composition, viewpoint, 
  horizon line, scale, and all geographical features from @image1. Do not add, remove, or 
  relocate any elements. Apply only stylistic rendering, atmosphere, and color grading.
  ```

### 3. **Urban**
- **Valor**: `"urban"`
- **Imagen de referencia**: `TCT-AI-Landmark-3.png`
- **Descripción**: Optimizado para paisajes urbanos y entornos citadinos
- **Prompt base**: 
  ```
  Combine the urban cityscape from @image1 with the artistic style and atmosphere of @image2. 
  Strictly preserve @image1's geometry, perspective lines, building silhouettes, and street layout. 
  Do not add or remove buildings, vehicles, people, street furniture, or text. Apply only 
  stylistic transformation: color palette, lighting mood, and material rendering.
  ```

### 4. **Monument**
- **Valor**: `"monument"`
- **Imagen de referencia**: `TCT-AI-Landmark.png`
- **Descripción**: Optimizado para monumentos, estatuas y arquitectura
- **Prompt base**: 
  ```
  Combine the monument and its surroundings from @image1 with the artistic style and atmosphere 
  of @image2. Preserve the monument's exact architecture and proportions. Do not add or remove 
  architectural elements, statues, people, flags, or decorative features. Apply only stylistic 
  rendering, lighting mood, and color palette.
  ```

---

## 📝 Uso del API

### Estructura del Request

```json
{
  "sceneType": "people",
  "prompt": "Add dramatic lighting",
  "base64Image": "data:image/jpeg;base64,...",
  "settings": {
    "image_size": "square_hd",
    "safety_tolerance": "2",
    "output_format": "jpeg"
  }
}
```

### Parámetros

| Parámetro | Tipo | Requerido | Default | Descripción |
|-----------|------|-----------|---------|-------------|
| `sceneType` | string | No | `"people"` | Tipo de escena: `"people"`, `"landscape"`, `"urban"`, `"monument"` |
| `prompt` | string | No | - | Prompt custom que se **añade al final** del prompt base obligatorio |
| `imageUrl` | string | Sí* | - | URL de la imagen del usuario |
| `base64Image` | string | Sí* | - | Imagen en Base64 del usuario |
| `settings` | object | No | - | Configuración de generación |

\* Se requiere `imageUrl` **O** `base64Image` (no ambos)

### Estructura de la Respuesta

```json
{
  "success": true,
  "sceneType": "people",
  "prompt": "[prompt completo: base + custom]",
  "basePrompt": "[prompt base específico de la escena]",
  "customPrompt": "[prompt custom del usuario o null]",
  "images": [
    {
      "url": "https://fal.ai/files/...",
      "width": 1024,
      "height": 1024
    }
  ],
  "referenceImage": "TCT-AI-Individual-Hispanic-Female-Young.png",
  "seed": 12345,
  "model": "fal-ai/flux-2-pro/edit",
  "provider": "fal.ai",
  "inputImages": 2,
  "userImages": 1,
  "timestamp": "2026-01-20T00:00:00.000Z"
}
```

---

## 🔧 Comportamiento del Prompt

### ✅ Correcto
El prompt funciona de la siguiente manera:

1. **Prompt base** (obligatorio): Se selecciona automáticamente según el `sceneType`
2. **Prompt custom** (opcional): Si se proporciona, se **añade al final** del prompt base

**Ejemplo:**
```json
{
  "sceneType": "landscape",
  "prompt": "Add vibrant sunset colors"
}
```

**Resultado:**
```
Prompt final = "[landscape base prompt] Add vibrant sunset colors"
```

### ❌ Incorrecto
- El prompt base **NO se puede omitir**
- El prompt base **NO se puede reemplazar** completamente
- El prompt custom tiene **menor preponderancia** que el base

---

## 🎨 Ejemplos de Uso

### 1. Estilo para Personas (default)
```bash
curl -X POST http://localhost:3000/api/external/flux-2-pro-edit-apply \
  -H "Content-Type: application/json" \
  -d '{
    "sceneType": "people",
    "imageUrl": "https://example.com/portrait.jpg"
  }'
```

### 2. Estilo para Paisaje con Prompt Custom
```bash
curl -X POST http://localhost:3000/api/external/flux-2-pro-edit-apply \
  -H "Content-Type: application/json" \
  -d '{
    "sceneType": "landscape",
    "prompt": "Add golden hour lighting",
    "imageUrl": "https://example.com/nature.jpg",
    "settings": {
      "image_size": "landscape_16_9"
    }
  }'
```

### 3. Estilo Urbano con Base64
```bash
curl -X POST http://localhost:3000/api/external/flux-2-pro-edit-apply \
  -H "Content-Type: application/json" \
  -d '{
    "sceneType": "urban",
    "base64Image": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
    "settings": {
      "image_size": "square_hd",
      "output_format": "jpeg"
    }
  }'
```

---

## 🧪 Testing

### Método 1: UI Integrada
1. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```
2. Abre http://localhost:3000
3. Navega a la pestaña **"Flux 2 Pro Apply"**
4. Selecciona el tipo de escena
5. Sube una imagen
6. (Opcional) Añade un prompt custom
7. Haz clic en "Generate"

### Método 2: HTML Test Page
1. Abre `test-scene-type.html` en el navegador:
   ```bash
   # Windows PowerShell
   Start-Process "http://localhost:3000/test-scene-type.html"
   ```
2. Interfaz standalone para probar todos los scene types

### Método 3: Node.js Script
```bash
node test-scene-type.mjs
```

Esto ejecutará tests para los 4 tipos de escena automáticamente.

---

## 📂 Archivos Modificados

### Backend
- `app/api/external/flux-2-pro-edit-apply/route.ts`
  - ✅ Agregado sistema de `SCENE_CONFIGS`
  - ✅ Lógica de selección de imagen de referencia según `sceneType`
  - ✅ Construcción de prompt con base obligatoria + custom opcional
  - ✅ Validaciones y documentación actualizada

### Frontend
- `app/page.tsx`
  - ✅ Agregado estado `flux2ProApplySceneType`
  - ✅ Selector de Scene Type con iconos y descripciones
  - ✅ Prompt ahora es opcional (custom)
  - ✅ Actualizado requestBody para incluir `sceneType`

### Testing
- `test-scene-type.mjs` - Script de prueba automatizado
- `test-scene-type.html` - Página de prueba standalone

---

## 🎯 Validaciones Implementadas

1. ✅ `sceneType` inválido → usa `"people"` como default
2. ✅ `sceneType` no proporcionado → usa `"people"` como default
3. ✅ `sceneType` en mayúsculas → normalizado a lowercase
4. ✅ Imagen de referencia existe → verificado en filesystem
5. ✅ Prompt custom opcional → se añade al final si existe
6. ✅ Solo 1 imagen de usuario permitida

---

## 🚀 Próximos Pasos (Opcional)

- [ ] Agregar más imágenes de referencia por scene type
- [ ] Permitir selección de múltiples referencias por escena
- [ ] Agregar preview de la imagen de referencia en la UI
- [ ] Implementar auto-detección de scene type con IA
- [ ] Métricas y analytics por scene type

---

## 📚 Documentación API

Para ver la documentación completa del API:
```bash
curl http://localhost:3000/api/external/flux-2-pro-edit-apply
```

O visita: http://localhost:3000/api/external/flux-2-pro-edit-apply en tu navegador.

---

**Versión**: 2.0.0  
**Fecha**: Enero 20, 2026  
**Autor**: TectonicaAI Team
