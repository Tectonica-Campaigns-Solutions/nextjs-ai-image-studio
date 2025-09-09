# 🚀 Migración: Flux Pro Kontext Max → Flux LoRA

## 📋 Resumen Ejecutivo

**Objetivo**: Migrar todos los endpoints de `fal-ai/flux-pro/kontext/max/text-to-image` a `fal-ai/flux-lora` para obtener mejor soporte de LoRA, menor costo y arquitectura más moderna.

**Beneficios**:
- ✅ **36% Reducción de Costo**: $0.055 → $0.035 por megapixel
- ✅ **Mejor Soporte LoRA**: Arquitectura FLUX.1 [dev] optimizada para LoRAs
- ✅ **Compatibilidad Comercial**: Uso comercial permitido
- ✅ **API Simplificada**: Menos parámetros, más enfocada

## 🔄 Cambios de API

### Endpoint Migration
```diff
- fal.subscribe("fal-ai/flux-pro/kontext/max/text-to-image", {
+ fal.subscribe("fal-ai/flux-lora", {
```

### Parameter Changes
```diff
  const input = {
    prompt: finalPrompt,
    image_size: mergedSettings.image_size,
    num_inference_steps: mergedSettings.num_inference_steps,
    guidance_scale: mergedSettings.guidance_scale,
    num_images: mergedSettings.num_images,
-   safety_tolerance: mergedSettings.safety_tolerance,
+   enable_safety_checker: mergedSettings.enable_safety_checker,
    output_format: mergedSettings.output_format,
-   enhance_prompt: true,  // NO LONGER AVAILABLE
    loras: mergedSettings.loras || []
  }
```

## 📁 Archivos Afectados

### 1. API Endpoints
- `app/api/flux-pro-text-to-image/route.ts` - **Principal**
- `app/api/external/flux-pro-text-to-image/route.ts` - **Externo**
- `app/api/flux-pro-multi-text-to-image/route.ts` - **Multi-generación**

### 2. Documentación
- `EXTERNAL_API.md` - Documentación de API externa
- `HYBRID-IMPLEMENTATION.md` - Estrategia híbrida actualizada

### 3. Archivos de Prueba
- `test-flux-pro-lora.js` - Script de pruebas
- `hybrid-demo.js` - Demo de estrategia híbrida

## 🎯 Estrategia de Migración

### Fase 1: Actualización de Parámetros por Defecto
```typescript
// ANTES (Flux Pro Kontext Max)
const defaultSettings = {
  image_size: "landscape_4_3",
  num_inference_steps: 28,
  guidance_scale: 3.5,
  num_images: 1,
  enable_safety_checker: true,     // Era safety_tolerance
  output_format: "png",
  seed: undefined
}

// DESPUÉS (Flux LoRA)
const defaultSettings = {
  image_size: "landscape_4_3", 
  num_inference_steps: 28,
  guidance_scale: 3.5,
  num_images: 1,
  enable_safety_checker: true,    // Nuevo parámetro
  output_format: "png",
  seed: undefined
}
```

### Fase 2: Gestión del enhance_prompt
**PROBLEMA**: Flux LoRA no tiene `enhance_prompt` nativo

**SOLUCIÓN**: Mantener RAG como única fuente de enhancement
```typescript
// ESTRATEGIA ACTUALIZADA
console.log("Enhanced RAG Strategy:")
console.log("  1. RAG Enhancement:", useRag ? "✅ Applied" : "❌ Skipped")
console.log("  2. Flux LoRA Native: ✅ Optimized for LoRA integration")
console.log("  3. Original prompt:", prompt.substring(0, 100) + "...")
console.log("  4. RAG-enhanced prompt:", finalPrompt.substring(0, 100) + "...")
```

### Fase 3: Validación de Compatibilidad LoRA
```typescript
// Flux LoRA - Schema validado
if (mergedSettings.loras && Array.isArray(mergedSettings.loras) && mergedSettings.loras.length > 0) {
  input.loras = mergedSettings.loras.map((lora: any) => ({
    path: lora.path,          // URL to LoRA weights
    scale: parseFloat(lora.scale) || 1.0  // 0-4 range
  }))
}
```

## 🔍 Consideraciones Técnicas

### 1. Backward Compatibility
- ✅ Mantener misma API externa
- ✅ Conservar estructura de response
- ✅ Preservar funcionalidad LoRA

### 2. Logging y Monitoreo
```typescript
console.log("[FLUX-LORA] Final input object being sent to fal.ai:")
console.log("=====================================")
console.log("Model: fal-ai/flux-lora")
console.log("Enhanced RAG Strategy:")
console.log("  1. RAG Enhancement:", useRag ? "✅ Applied" : "❌ Skipped")
console.log("  2. Flux LoRA Native: ✅ Optimized for LoRA integration")
```

### 3. Error Handling
```typescript
} catch (falError) {
  console.error("[FLUX-LORA] Generation failed:", falError)
  return NextResponse.json({ 
    error: "Image generation failed",
    details: falError instanceof Error ? falError.message : "Unknown error",
    model: "flux-lora"  // Updated model name
  }, { status: 500 })
}
```

## 📊 Testing Strategy

### Pre-Migration Tests
1. ✅ Verificar API current funciona
2. ✅ Documentar parámetros actuales
3. ✅ Backup de configuración

### Post-Migration Tests  
1. 🔄 Test básico de generación
2. 🔄 Test con LoRA customizada
3. 🔄 Test multi-generación
4. 🔄 Test API externa
5. 🔄 Test integración RAG

## 🚦 Plan de Rollback

En caso de problemas:
1. Revertir cambios en endpoints
2. Restaurar parámetros originales  
3. Verificar funcionamiento
4. Comunicar status

## ⏱️ Timeline Estimado

- **Análisis y Preparación**: ✅ Completado
- **Migración de Código**: 30 minutos
- **Testing y Validación**: 15 minutos
- **Documentación**: 15 minutos
- **Total**: ~1 hora

## 📝 Checklist de Migración

### Código
- [ ] Actualizar endpoint interno principal
- [ ] Actualizar endpoint externo  
- [ ] Actualizar endpoint multi-generación
- [ ] Eliminar parámetros obsoletos
- [ ] Actualizar logs y mensajes

### Documentación
- [ ] Actualizar EXTERNAL_API.md
- [ ] Actualizar HYBRID-IMPLEMENTATION.md
- [ ] Crear migration notes

### Testing
- [ ] Test generación básica
- [ ] Test con LoRA
- [ ] Test API externa
- [ ] Test multi-generación
- [ ] Verificar RAG integration

### Finalización
- [ ] Commit cambios
- [ ] Actualizar README si necesario
- [ ] Notificar completación

---

**Preparado para iniciar migración** ✅
