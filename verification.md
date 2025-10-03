# UI Verification Checklist

## Generation Canonical UI Implementation Status

### ✅ Files Created/Updated:
1. `lib/canonical-prompt-generation.ts` - Core processor
2. `public/generation-canonical-config.json` - Configuration data  
3. `app/page.tsx` - UI implementation (lines 1696-2000+ with canonical controls)

### ✅ States Defined:
- `useGenerationCanonical` (boolean toggle)
- `generationCanonicalConfig` (configuration object)
- `generationCanonicalOptions` (loaded from config file)
- `generationCanonicalPreview` (generated preview)

### ✅ UI Components Expected in Generate Images Tab:
1. **Switch**: "Advanced Generation Options" with BETA badge
2. **Subject Section**: Radio buttons (Individual, Group, Crowd, Object)
3. **Appearance Section**: Brand color checkboxes + color intensity
4. **Style Section**: Style type selector
5. **Elements Section**: Landmark, city, others inputs
6. **Modifiers Section**: Positive/negative prompts
7. **Preview Section**: Real-time canonical prompt preview

### 🔍 Current Endpoint Used:
- **Generate Images Tab**: `/api/flux-pro-text-to-image` (NOT flux-ultra-finetuned)
- **Flux Ultra Tab**: `/api/flux-ultra-finetuned` (separate tab)

### 🎯 Location in UI:
- File: `app/page.tsx`
- Lines: ~1696-2000
- Position: Inside Generate Images tab, after prompt textarea
- Function: `handleFluxProSubmit` 

### 🔧 Possible Issues:
1. Browser cache - hard refresh needed
2. Build cache - restart dev server
3. JavaScript error blocking render - check console
4. Switch not toggled on - user needs to enable it

### 🚨 Action Required:
1. Hard refresh browser (Ctrl+F5)
2. Check browser console for errors
3. Toggle the "Advanced Generation Options" switch to ON
4. If still not visible, restart dev server
