# 🔍 DEBUG: Canonical Prompt Generation

## **Instrucciones para Debug**

### **1. 📝 Verificar en Consola del Navegador**

Abre el tab **Generate Images** y activa **Advanced Generation Options**, luego:

1. **F12** → **Console**
2. Escribe un prompt base
3. Activa el switch **Advanced Generation Options** 
4. Configura algunas opciones (ej: Subject = Individual, Color = violet)
5. **Genera una imagen** y revisa los logs:

### **Expected Logs:**
```
[FRONTEND] Original prompt: [tu prompt]
[FRONTEND] useGenerationCanonical: true
[FRONTEND] generationCanonicalConfig: {...}
[Generation Canonical] Starting generation with config: {...}
[Generation Canonical] Base prompt: [tu prompt]
[Generation Canonical] Options loaded: {...}
[Generation Canonical] Added TASK section: TASK: Generate a photorealistic...
[Generation Canonical] Generated prompt: [prompt canonical completo]
[FRONTEND] Generated canonical prompt: [prompt canonical]
[FRONTEND] Final prompt being sent to API: [prompt canonical]
```

### **2. 🚨 Posibles Problemas**

#### **Problema A: Switch no activado**
- Log: `[FRONTEND] useGenerationCanonical: false`
- **Solución**: Activar el switch "Advanced Generation Options"

#### **Problema B: Config no cargado**
- Log: `[Generation Canonical] Options not loaded`
- **Solución**: Verificar que `/public/generation-canonical-config.json` sea accesible

#### **Problema C: Error en processor**
- Log: `[Generation Canonical] Error generating prompt`
- **Solución**: Verificar la estructura del config y los datos

#### **Problema D: API ignora canonical**
- Log muestra canonical generado pero API recibe prompt original
- **Solución**: Verificar integración en `/api/flux-ultra-finetuned`

### **3. 🧪 Test Manual Rápido**

Prueba este caso específico:

1. **Prompt Base**: "a person walking in the park"
2. **Advanced Options ON**
3. **Subject**: Individual
4. **Color**: Deep violet
5. **Style**: Realistic
6. **City**: New York

**Expected Result**:
```
TASK: Generate a photorealistic, high detail, professional photography image.

SUBJECT: one person.

APPEARANCE: featuring deep violet color theme with balanced color presence.

STYLE: photorealistic, high detail, professional photography style.

ELEMENTS: located in New York.

CONTENT: a person walking in the park.

QUALITY: high resolution, professional quality, sharp focus, proper lighting.
```

### **4. 🔧 Si Sigue Fallando**

Si los logs muestran que se genera el canonical pero la API recibe el prompt original, entonces el problema puede estar en:

1. **FormData**: Verificar que `finalPrompt` se envía correctamente
2. **API Route**: El endpoint `/api/flux-ultra-finetuned` puede estar ignorando el prompt canonical
3. **Timing**: Async/await puede no estar funcionando correctamente

**Reporte los logs que ves en consola para diagnosticar el problema específico.**