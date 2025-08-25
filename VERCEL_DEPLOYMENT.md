# 🚀 Vercel Deployment Guide

## ✅ Funcionalidades Compatibles con Vercel

### Totalmente Funcionales
- ✅ **Qwen Text-to-Image**: 5-15 segundos
- ✅ **Qwen Image-to-Image**: 10-20 segundos  
- ✅ **Edit Image**: 8-15 segundos
- ✅ **Style Transfer**: 10-25 segundos
- ✅ **RAG System**: Funciona con archivos <4MB
- ✅ **Branding Upload**: Archivos JSON <4MB

### Limitaciones
- ⚠️ **Train LoRA**: Funciona pero requiere polling manual
- ⚠️ **Archivos ZIP grandes**: Máximo 4.5MB
- ⚠️ **RAG con archivos muy grandes**: Puede ser lento

## 🔧 Pasos de Deployment

### 1. Preparar el Repositorio
```bash
# Asegúrate de que todos los archivos están commiteados
git add .
git commit -m "Ready for Vercel deployment"
git push origin main
```

### 2. Configurar Variables de Entorno en Vercel
Ve a tu dashboard de Vercel > Settings > Environment Variables:

```
FAL_API_KEY=your_fal_api_key_here
```

### 3. Deploy desde GitHub
1. Conecta tu repositorio en vercel.com
2. El deployment se hará automáticamente
3. Vercel detectará Next.js y usará la configuración correcta

### 4. Configuración Automática
- ✅ `vercel.json` configurado para timeouts
- ✅ Variables de entorno preparadas
- ✅ Webhooks configurados para entrenamiento

## ⚡ Optimizaciones Aplicadas

### Timeouts Extendidos
```json
{
  "functions": {
    "app/api/*/route.js": { "maxDuration": 60 }
  }
}
```

### Queue-Based Training
- Entrenamiento LoRA usa queue system
- No bloquea serverless functions
- Webhook notifications para completión

### RAG Optimizations
- Embeddings se procesan de forma asíncrona
- Cache de resultados cuando es posible
- Manejo eficiente de memoria

## 🚨 Limitaciones de Vercel vs Soluciones

### Problema: Timeout en Entrenamiento LoRA
**Limitación**: Entrenamientos largos (30-60 min) vs timeout (60s)
**Solución**: 
- ✅ Usar queue system (implementado)
- ✅ Polling para check status
- ✅ Webhooks para notificaciones

### Problema: Archivos ZIP Grandes  
**Limitación**: Máximo 4.5MB payload
**Soluciones**:
1. **Comprimir imágenes** antes de ZIP
2. **Usar menos imágenes** (10-20 en vez de 100+)
3. **Resolución optimizada** (1024x1024 max)

### Problema: RAG con Archivos Grandes
**Limitación**: Memoria limitada para embeddings
**Soluciones**:
1. **Chunking**: Dividir archivos grandes
2. **Lazy loading**: Procesar bajo demanda
3. **Cache**: Reutilizar embeddings

## 📊 Planes de Vercel Recomendados

### Hobby (Gratis)
- ✅ Todas las funciones básicas
- ⚠️ 10s timeout (limitado para algunas funciones)
- ⚠️ 100GB bandwidth/mes

### Pro ($20/mes)
- ✅ **Recomendado para producción**
- ✅ 60s timeout (suficiente para todo)
- ✅ 1TB bandwidth/mes
- ✅ Custom domains
- ✅ Analytics

### Enterprise ($400+/mes)
- ✅ 900s timeout (ideal para casos extremos)
- ✅ Unlimited bandwidth
- ✅ Support prioritario

## 🔍 Monitoring y Debugging

### Logs en Vercel
```bash
# Ver logs en tiempo real
vercel logs --follow

# Ver logs de función específica
vercel logs --filter="api/qwen-train-lora"
```

### Health Checks
- `/api/webhooks/training-complete` (GET) - Status del webhook
- Console logs en todas las funciones
- Error handling robusto

## 🚀 Comandos de Deployment

### Deploy Manual
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Deploy a producción
vercel --prod
```

### Deploy Automático
- Push a `main` branch = deploy automático
- Pull requests = preview deployments
- Rollback con un click en dashboard

## 🎯 Optimizaciones Post-Deployment

### 1. CDN y Caching
```javascript
// En tu next.config.js
const nextConfig = {
  images: {
    domains: ['fal.media', 'storage.googleapis.com'],
  },
  experimental: {
    serverComponentsExternalPackages: ['@xenova/transformers']
  }
}
```

### 2. Edge Functions (Futuro)
Para mejor performance, considera migrar algunas funciones a Edge Runtime:
```javascript
export const runtime = 'edge' // Para funciones simples
```

### 3. Monitoring
- Usa Vercel Analytics
- Monitor Function Duration
- Track Error Rates

## 🔧 Troubleshooting

### Error: Function Timeout
**Causa**: Función toma >60s
**Solución**: Verificar `vercel.json` maxDuration

### Error: Payload Too Large  
**Causa**: Archivo >4.5MB
**Solución**: Comprimir o dividir archivo

### Error: Memory Limit
**Causa**: RAG con archivos muy grandes  
**Solución**: Procesar en chunks más pequeños

### Training No Completa
**Causa**: Queue system normal
**Solución**: Usar polling o esperar webhook

## ✅ Resultado Final

Después del deployment tendrás:
- 🌐 **URL pública** para tu app
- ⚡ **Performance optimizada** para Vercel
- 🔄 **Auto-scaling** basado en demanda  
- 📊 **Analytics** y monitoring incluidos
- 🔒 **HTTPS** automático
- 🌍 **CDN global** para assets

**Funcionalidad**: ~95% compatible con desarrollo local
**Performance**: Excelente para generación de imágenes
**Limitaciones**: Solo en entrenamiento LoRA (manejo vía queue)
