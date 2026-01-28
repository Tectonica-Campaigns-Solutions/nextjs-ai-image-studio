# Sistema de Imágenes de Referencia por Organización - flux-2-pro-edit-create

## Resumen

Se ha implementado un sistema similar al de `flux-2-pro-edit-apply` para que el endpoint `flux-2-pro-edit-create` pueda tomar las imágenes de referencia a partir del archivo `config.json` desde la carpeta correspondiente a cada organización.

## Cambios Implementados

### 1. Actualización de config.json

Se agregó una nueva clave `"create"` a los archivos de configuración de las organizaciones:

**public/tectonica-reference-images/config.json**
```json
{
  "people": "TCT-AI-Individual-Hispanic-Female-Young.png",
  "landscape": "TCT-AI-Landmark-2.png",
  "urban": "TCT-AI-Landmark-3.png",
  "monument": "TCT-AI-Landmark.png",
  "create": [
    "TCTAIFront01.png",
    "TCTAIFront02.png",
    "TCTAIFront03.png",
    "TCTAIFront06.png",
    "TCTAIFront09.png",
    "TCTAIFront11.png",
    "TCTAIFront15.png",
    "TCTAIFront18.png"
  ]
}
```

**public/communitychange-reference-images/config.json**
```json
{
  "people": "web-assets-11.png",
  "landscape": "TCT-AI-Landmark-2.png",
  "urban": "TCT-AI-Landmark-3.png",
  "monument": "TCT-AI-Landmark.png",
  "create": [
    "TCTAIFront01.png",
    "TCTAIFront02.png",
    "TCTAIFront03.png",
    "TCTAIFront06.png",
    "TCTAIFront09.png",
    "TCTAIFront11.png",
    "TCTAIFront15.png",
    "TCTAIFront18.png"
  ]
}
```

### 2. Nuevo código en route.ts

#### Función `getClientReferenceImages()`

Se creó una nueva función que implementa la búsqueda de imágenes con fallback:

```typescript
async function getClientReferenceImages(orgType: string): Promise<{ filenames: string[]; folderName: string }> {
  const folderName = `${orgType.toLowerCase()}-reference-images`
  const folderPath = path.join(process.cwd(), 'public', folderName)
  
  // Step 1: Try to load config.json
  try {
    const configPath = path.join(folderPath, 'config.json')
    const configContent = await fs.readFile(configPath, 'utf-8')
    const config = JSON.parse(configContent)
    
    if (config.create && Array.isArray(config.create) && config.create.length > 0) {
      console.log(`[Flux 2 Pro Edit Create] Using config.json: ${config.create.length} images from ${folderName}`)
      return { filenames: config.create, folderName }
    }
  } catch (error) {
    console.log(`[Flux 2 Pro Edit Create] No config.json or "create" array found for ${orgType}, falling back...`)
  }
  
  // Step 2: Fallback to Tectonica
  console.log(`[Flux 2 Pro Edit Create] Using fallback Tectonica reference images`)
  return { 
    filenames: FALLBACK_REFERENCE_IMAGES, 
    folderName: 'tectonica-reference-images' 
  }
}
```

#### Actualización del flujo de carga de imágenes

Se modificó el código para usar la función `getClientReferenceImages()`:

```typescript
// Get reference images for this organization
const { filenames: referenceImageFilenames, folderName } = await getClientReferenceImages(orgType)

// Upload reference images to fal.ai storage
console.log(`[Flux 2 Pro Edit Create] Uploading ${referenceImageFilenames.length} reference images from ${folderName}...`)

// Read and upload each reference image
for (let i = 0; i < referenceImageFilenames.length; i++) {
  const filename = referenceImageFilenames[i]
  const fullPath = path.join(process.cwd(), 'public', folderName, filename)
  // ... resto del código
}
```

### 3. Actualización de documentación JSDoc

Se actualizó la documentación del endpoint para reflejar los cambios:

```typescript
/**
 * POST /api/external/flux-2-pro-edit-create
 * 
 * External API endpoint for FLUX.2 [pro] image creation with organization-specific reference images.
 * This endpoint automatically loads reference images based on the organization's config.json.
 * 
 * Features:
 * - Organization-specific references: Loads images from {orgType}-reference-images/config.json
 * - Fallback support: Uses Tectonica images if organization config not found
 * - Optional user image: Add 0-1 additional image from user
 * ...
 */
```

## Estrategia de Fallback

El sistema implementa una estrategia de fallback de 2 niveles:

1. **Primer nivel**: Intenta cargar el `config.json` de la organización especificada en `orgType` y busca el array `"create"`
2. **Segundo nivel**: Si no encuentra el config o el array, usa las imágenes hardcodeadas de Tectonica (`FALLBACK_REFERENCE_IMAGES`)

## Uso

### Request

```json
{
  "prompt": "Create an artistic portrait with vibrant colors",
  "orgType": "Tectonica",
  "settings": {
    "image_size": "square_hd",
    "safety_tolerance": 2
  }
}
```

### Response

```json
{
  "success": true,
  "images": [...],
  "prompt": "Create an artistic portrait with vibrant colors",
  "referenceImages": 8,
  "userImages": 0,
  "inputImages": 8,
  "model": "fal-ai/flux-2-pro/edit",
  "provider": "fal.ai"
}
```

## Beneficios

1. ✅ **Flexibilidad por organización**: Cada organización puede tener su propio conjunto de imágenes de referencia
2. ✅ **Fallback automático**: Si una organización no tiene configuración, usa las imágenes de Tectonica
3. ✅ **Consistencia**: Mismo patrón que `flux-2-pro-edit-apply`
4. ✅ **Mantenibilidad**: Configuración centralizada en archivos JSON
5. ✅ **Escalabilidad**: Fácil agregar nuevas organizaciones sin modificar código

## Agregar una nueva organización

Para agregar una nueva organización:

1. Crear carpeta: `public/{orgname}-reference-images/`
2. Agregar las imágenes de referencia en la carpeta
3. Crear `config.json` con el siguiente formato:

```json
{
  "people": "imagen-para-personas.png",
  "landscape": "imagen-para-paisajes.png",
  "urban": "imagen-para-urbano.png",
  "monument": "imagen-para-monumentos.png",
  "create": [
    "imagen1.png",
    "imagen2.png",
    "imagen3.png",
    "imagen4.png",
    "imagen5.png",
    "imagen6.png",
    "imagen7.png",
    "imagen8.png"
  ]
}
```

4. Usar `orgType: "orgname"` en las peticiones al API
