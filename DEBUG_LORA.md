# Guía de Debugging para LoRA en Flux Pro

## Cómo verificar que el LoRA esté funcionando correctamente

### 1. **Verificar en los Logs del Servidor**

Cuando hagas una request, deberías ver estos logs en la consola del servidor:

```bash
[FLUX-PRO] Text-to-Image endpoint called
[FLUX-PRO] Original prompt: tu prompt aquí
[FLUX-PRO] Use RAG: true/false
[FLUX-PRO] Settings JSON: {"loras":[{"path":"...","scale":1.0}],...}
[FLUX-PRO] All FormData entries:
  prompt: tu prompt aquí
  useRag: false
  settings: {"loras":[...],...}
  orgType: general

[FLUX-PRO] Parsed settings: {loras: [...], ...}
[FLUX-PRO] Checking LoRA configuration...
[FLUX-PRO] mergedSettings.loras: [{path: "...", scale: 1.0}]
[FLUX-PRO] Is array? true
[FLUX-PRO] Length: 1
[FLUX-PRO] Processing LoRAs...
[FLUX-PRO] LoRA 0: {path: "...", scale: 1.0, ...}
[FLUX-PRO] LoRAs configured for Flux Pro: [{path: "...", scale: 1.0}]

[FLUX-PRO] Final input object being sent to fal.ai:
=====================================
Model: fal-ai/flux-pro/kontext/max/text-to-image
Input: {
  "prompt": "...",
  "loras": [{"path": "...", "scale": 1.0}],
  ...
}
=====================================

[FLUX-PRO] Generation completed successfully!
[FLUX-PRO] ✅ LoRAs were sent to the model:
  LoRA 1: tu-url-lora.safetensors (scale: 1.0)
```

### 2. **Si NO ves LoRAs en los logs:**

#### Problema: LoRA no se está enviando desde el frontend
- Verifica que `useFluxProLoRA` esté en `true`
- Verifica que `fluxProLoraUrl` tenga una URL válida
- Busca logs: `[FRONTEND] Adding LoRA to settings`

#### Problema: LoRA no se está procesando en el backend
- Busca el log: `[FLUX-PRO] No LoRAs configured - will use base model`
- Verifica que el JSON de settings se esté parseando correctamente

### 3. **Verificar que el LoRA se aplique visualmente:**

1. **Usa un LoRA con estilo muy distintivo**
2. **Usa el trigger phrase correcto**
3. **Compara resultados:**
   - Sin LoRA: `useFluxProLoRA = false`
   - Con LoRA: `useFluxProLoRA = true`

### 4. **Script de Prueba Directo:**

```bash
# Instala dependencias si no las tienes:
npm install form-data node-fetch

# Ejecuta el test:
node test-flux-pro-lora.js
```

### 5. **URLs de LoRA para Pruebas:**

```javascript
// LoRA predeterminado en el código:
"https://v3.fal.media/files/kangaroo/bUQL-AZq6ctnB1gifw2ku_pytorch_lora_weights.safetensors"

// Tu LoRA personalizado:
"https://v3.fal.media/files/tu-archivo-lora.safetensors"
```

### 6. **Debugging en la UI:**

1. **Abrir DevTools** → Console
2. **Buscar logs que empiecen con `[FRONTEND]`**
3. **Verificar que se envíe:**
   ```javascript
   [FRONTEND] Adding LoRA to settings: [{path: "...", scale: 1.0}]
   [FRONTEND] Enhanced prompt with trigger phrase: "tu prompt, trigger phrase"
   [FRONTEND] Final settings being sent: {loras: [...], ...}
   ```

### 7. **Verificación de Red:**

1. **DevTools** → **Network**
2. **Buscar request a `/api/flux-pro-text-to-image`**
3. **Ver el FormData enviado**
4. **Verificar que contenga `settings` con `loras`**

### 8. **Troubleshooting Común:**

| Problema | Solución |
|----------|----------|
| No se ve LoRA en logs | Verificar que `useFluxProLoRA = true` y `fluxProLoraUrl` no esté vacío |
| Error de parsing JSON | Verificar que el objeto settings sea válido JSON |
| LoRA no tiene efecto visual | Usar trigger phrase correcto y scale adecuado (0.8-1.2) |
| URL inválida | Verificar que la URL sea accesible y termine en `.safetensors` |

### 9. **Comandos de Debug Rápido:**

```bash
# Ver logs del servidor en tiempo real:
npm run dev

# Test directo del endpoint:
node test-flux-pro-lora.js

# Verificar que el servidor esté corriendo:
curl http://localhost:3000/api/external/config
```
