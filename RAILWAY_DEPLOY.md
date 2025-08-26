# Railway Deployment Configuration

## 🚂 Railway Pro - AI Image Studio

This project is optimized for Railway deployment with full RAG capabilities.

### 🔧 Environment Variables

Set these in your Railway project dashboard:

```bash
# Required for image generation
FAL_API_KEY=your_fal_api_key_here

# Optional ML APIs
HUGGINGFACE_API_KEY=your_hf_key_here
REPLICATE_API_TOKEN=your_replicate_key_here

# Railway detection (auto-set)
RAILWAY_ENVIRONMENT=production
```

### 🎯 Railway Benefits

✅ **Full RAG System**: Complete ML pipeline with @xenova/transformers
✅ **No Memory Limits**: Up to 32GB for complex embeddings  
✅ **Persistent Storage**: File system access for branding data
✅ **No Timeout Limits**: Long-running RAG processes supported
✅ **Auto-scaling**: Built-in traffic management
✅ **Pro Features**: Priority build queue, better performance

### 🚀 Deployment Process

1. **Connect Repository**: https://github.com/Tectonica-Campaigns-Solutions/nextjs-ai-image-studio
2. **Auto-detection**: Railway automatically detects Next.js
3. **Build Command**: `npm run build` (auto-detected)
4. **Start Command**: `npm start` (auto-detected)
5. **Port**: 3000 (auto-detected)

### 📊 Expected Performance

| Feature | Vercel | Railway Pro |
|---------|--------|-------------|
| RAG Quality | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| Memory | 1GB | 32GB |
| Timeout | 10s | ∞ |
| Cold Start | ~1s | ~2s |
| ML Libraries | ❌ | ✅ |
| Build Speed | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

### 🔍 Platform Detection

The app automatically uses:
- **Railway/Local**: Full RAG with embeddings and transformers
- **Vercel**: Simple keyword-based RAG (fallback)

### 🛠️ Development

```bash
# Local development
npm run dev

# Production build (like Railway)
npm run build && npm start
```
