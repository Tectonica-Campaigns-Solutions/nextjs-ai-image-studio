# Render Deployment Guide

## 🚀 Deploy to Render

1. **Connect Repository**
   - Go to [Render Dashboard](https://dashboard.render.com/)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository

2. **Service Configuration**
   ```
   Name: qwen-image-editor
   Environment: Node
   Build Command: npm ci && npm run build
   Start Command: npm start
   ```

3. **Environment Variables**
   Add these in Render dashboard:
   ```
   NODE_ENV=production
   RENDER=true
   FAL_API_KEY=your_fal_api_key_here
   ```

4. **Advanced Settings**
   ```
   Plan: Free (or upgrade as needed)
   Health Check Path: /
   Auto-Deploy: Yes
   ```

## 🎯 Benefits on Render

✅ **Full RAG System**: Complete ML pipeline with @xenova/transformers
✅ **No Timeout Limits**: Long-running RAG processes supported  
✅ **Persistent Storage**: File system access for branding data
✅ **Better Performance**: More memory and CPU for embeddings
✅ **Auto-scaling**: Handles traffic spikes automatically

## 🔧 Platform Detection

The app automatically detects the platform:
- **Render**: Uses full RAG system with embeddings
- **Local**: Uses full RAG system with embeddings  
- **Vercel**: Falls back to simple keyword-based RAG

## 📊 Expected Performance

| Feature | Vercel | Render |
|---------|--------|--------|
| RAG Quality | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| Speed | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Memory | 1GB | 8GB+ |
| Timeout | 10s | None |
| ML Support | ❌ | ✅ |
