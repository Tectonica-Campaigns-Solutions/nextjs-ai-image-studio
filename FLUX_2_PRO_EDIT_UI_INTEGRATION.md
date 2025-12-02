# Flux 2 Pro Edit - UI Integration Guide

Este documento contiene todos los componentes necesarios para agregar la sección de Flux 2 Pro Edit a la UI.

## 1. Estados a agregar (después de la línea 104 en page.tsx)

```typescript
// Flux 2 Pro Edit States (add after showFluxUltraAdvanced)
const [flux2ProPrompt, setFlux2ProPrompt] = useState("")
const [flux2ProImages, setFlux2ProImages] = useState<File[]>([])
const [flux2ProImageUrls, setFlux2ProImageUrls] = useState<string[]>(Array(9).fill(""))
const [flux2ProBase64Images, setFlux2ProBase64Images] = useState<string[]>(Array(9).fill(""))
const [flux2ProSettings, setFlux2ProSettings] = useState({
  image_size: "auto",
  safety_tolerance: "2",
  enable_safety_checker: true,
  output_format: "jpeg",
  seed: "",
  custom_width: 1024,
  custom_height: 1024
})
const [flux2ProImageUrl, setFlux2ProImageUrl] = useState<string>("")
const [isFlux2ProGenerating, setIsFlux2ProGenerating] = useState(false)
const [flux2ProError, setFlux2ProError] = useState<string>("")
const [flux2ProGeneratedPrompt, setFlux2ProGeneratedPrompt] = useState<string>("")
const [showFlux2ProAdvanced, setShowFlux2ProAdvanced] = useState(false)
const [flux2ProImagePreviews, setFlux2ProImagePreviews] = useState<string[]>(Array(9).fill(""))
```

## 2. Handler Functions a agregar (antes del return statement, alrededor de la línea 1200)

```typescript
// Flux 2 Pro Edit Handlers
const handleFlux2ProImageUpload = (event: React.ChangeEvent<HTMLInputElement>, index: number) => {
  const file = event.target.files?.[0]
  if (file) {
    const newImages = [...flux2ProImages]
    const newPreviews = [...flux2ProImagePreviews]
    
    // Remove any existing image at this index
    if (newImages[index]) {
      newImages.splice(index, 1, file)
    } else {
      newImages[index] = file
    }
    
    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      newPreviews[index] = reader.result as string
      setFlux2ProImagePreviews(newPreviews)
    }
    reader.readAsDataURL(file)
    
    setFlux2ProImages(newImages.filter(img => img !== undefined))
  }
}

const removeFlux2ProImage = (index: number) => {
  const newImages = [...flux2ProImages]
  const newPreviews = [...flux2ProImagePreviews]
  const newUrls = [...flux2ProImageUrls]
  const newBase64 = [...flux2ProBase64Images]
  
  newImages[index] = undefined as any
  newPreviews[index] = ""
  newUrls[index] = ""
  newBase64[index] = ""
  
  setFlux2ProImages(newImages.filter(img => img !== undefined))
  setFlux2ProImagePreviews(newPreviews)
  setFlux2ProImageUrls(newUrls)
  setFlux2ProBase64Images(newBase64)
}

const handleFlux2ProSubmit = async (event: React.FormEvent) => {
  event.preventDefault()

  if (!flux2ProPrompt.trim()) {
    setFlux2ProError("Please enter a prompt")
    return
  }

  // Count total images
  const validImages = flux2ProImages.filter(img => img !== undefined).length
  const validUrls = flux2ProImageUrls.filter(url => url.trim().length > 0).length
  const validBase64 = flux2ProBase64Images.filter(b64 => b64.trim().length > 0).length
  const totalImages = validImages + validUrls + validBase64

  if (totalImages === 0) {
    setFlux2ProError("Please upload at least 1 image (maximum 9)")
    return
  }

  if (totalImages > 9) {
    setFlux2ProError("Maximum 9 images allowed")
    return
  }

  setIsFlux2ProGenerating(true)
  setFlux2ProError("")

  try {
    const formData = new FormData()
    
    formData.append("prompt", flux2ProPrompt)
    
    // Add image files
    flux2ProImages.forEach((image, index) => {
      if (image) {
        formData.append(`image${index}`, image)
      }
    })
    
    // Add image URLs
    flux2ProImageUrls.forEach((url, index) => {
      if (url.trim()) {
        formData.append(`imageUrl${index}`, url)
      }
    })
    
    // Add Base64 images
    flux2ProBase64Images.forEach((b64, index) => {
      if (b64.trim()) {
        formData.append(`imageBase64${index}`, b64)
      }
    })
    
    // Prepare settings
    const settings: any = { ...flux2ProSettings }
    
    // Remove empty values
    Object.keys(settings).forEach(key => {
      if (settings[key] === "") {
        delete settings[key]
      }
    })
    
    // Convert seed to number if present
    if (settings.seed) {
      settings.seed = parseInt(settings.seed as string)
    }
    
    formData.append("settings", JSON.stringify(settings))
    formData.append("orgType", "general")
    formData.append("useCanonicalPrompt", "false")

    console.log("[FRONTEND] Flux 2 Pro Edit - Sending request with", totalImages, "images")

    const response = await fetch("/api/flux-2-pro-edit", {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      if (response.status === 400 && errorData?.error) {
        throw new Error(errorData.error + (errorData.details ? `: ${errorData.details}` : ''))
      }
      throw new Error(`Server error (${response.status}). Please try again.`)
    }

    const result = await response.json()
    
    if (result.prompt) {
      setFlux2ProGeneratedPrompt(result.prompt)
    }
    
    if (result.images && result.images[0]?.url) {
      setFlux2ProImageUrl(result.images[0].url)
    } else if (result.image) {
      setFlux2ProImageUrl(result.image)
    } else {
      throw new Error("No image received from server")
    }
  } catch (err) {
    setFlux2ProError(err instanceof Error ? err.message : "Failed to edit image")
  } finally {
    setIsFlux2ProGenerating(false)
  }
}
```

## 3. TabsTrigger a agregar (alrededor de la línea 2556, después de sedream-v4-edit)

```tsx
<TabsTrigger value="flux-2-pro-edit">Flux 2 Pro Edit</TabsTrigger>
```

## 4. TabsContent completo a agregar (después del TabsContent de sedream-v4-edit, alrededor de línea 3100)

```tsx
{/* Flux 2 Pro Edit Tab */}
<TabsContent value="flux-2-pro-edit" className="space-y-6">
  <div className="grid md:grid-cols-2 gap-6">
    {/* Upload and Form Section */}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Edit className="h-5 w-5" />
          Flux 2 Pro Multi-Reference Edit
        </CardTitle>
        <CardDescription>
          Production-grade image editing with up to 9 reference images
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleFlux2ProSubmit} className="space-y-4">
          {/* Prompt */}
          <div className="space-y-2">
            <Label htmlFor="flux2pro-prompt">
              Edit Description *
            </Label>
            <Textarea
              id="flux2pro-prompt"
              placeholder="Describe the edit (e.g., 'Change the jacket to red while keeping the original lighting' or 'Replace background with @image2')"
              value={flux2ProPrompt}
              onChange={(e) => setFlux2ProPrompt(e.target.value)}
              rows={3}
              className="text-sm"
              required
            />
            <p className="text-xs text-muted-foreground">
              Use @image1, @image2, etc. to reference specific images
            </p>
          </div>

          {/* Multi-Image Upload */}
          <div className="space-y-3">
            <Label>Reference Images (1-9) *</Label>
            
            {/* Image Upload Slots */}
            <div className="grid grid-cols-2 gap-3">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((index) => (
                <div key={index} className="space-y-2">
                  <Label htmlFor={`flux2pro-image-${index}`} className="text-xs">
                    Image {index + 1}
                  </Label>
                  
                  {flux2ProImagePreviews[index] ? (
                    <div className="relative border rounded-lg p-2 bg-muted/50">
                      <img
                        src={flux2ProImagePreviews[index]}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-24 object-cover rounded"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        className="absolute top-1 right-1 h-6 w-6 p-0"
                        onClick={() => removeFlux2ProImage(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <Input
                        id={`flux2pro-image-${index}`}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFlux2ProImageUpload(e, index)}
                        className="cursor-pointer text-xs"
                      />
                      <Input
                        placeholder="Or paste URL"
                        value={flux2ProImageUrls[index]}
                        onChange={(e) => {
                          const newUrls = [...flux2ProImageUrls]
                          newUrls[index] = e.target.value
                          setFlux2ProImageUrls(newUrls)
                        }}
                        className="mt-1 text-xs"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <p className="text-xs text-muted-foreground">
              Upload files, paste URLs, or use Base64. Maximum 9 images (9 MP total).
            </p>
          </div>

          {/* Image Size */}
          <div className="space-y-2">
            <Label htmlFor="flux2pro-image-size">Image Size</Label>
            <Select
              value={flux2ProSettings.image_size}
              onValueChange={(value) => setFlux2ProSettings({ ...flux2ProSettings, image_size: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto (Recommended)</SelectItem>
                <SelectItem value="square_hd">Square HD</SelectItem>
                <SelectItem value="square">Square</SelectItem>
                <SelectItem value="portrait_4_3">Portrait 4:3</SelectItem>
                <SelectItem value="portrait_16_9">Portrait 16:9</SelectItem>
                <SelectItem value="landscape_4_3">Landscape 4:3</SelectItem>
                <SelectItem value="landscape_16_9">Landscape 16:9</SelectItem>
                <SelectItem value="custom">Custom Size</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom Dimensions */}
          {flux2ProSettings.image_size === "custom" && (
            <div className="grid grid-cols-2 gap-4 p-3 border rounded-lg bg-muted/50">
              <div className="space-y-2">
                <Label htmlFor="flux2pro-width">Width (px)</Label>
                <Input
                  id="flux2pro-width"
                  type="number"
                  min={512}
                  max={2048}
                  value={flux2ProSettings.custom_width}
                  onChange={(e) => setFlux2ProSettings({
                    ...flux2ProSettings,
                    custom_width: parseInt(e.target.value) || 1024
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="flux2pro-height">Height (px)</Label>
                <Input
                  id="flux2pro-height"
                  type="number"
                  min={512}
                  max={2048}
                  value={flux2ProSettings.custom_height}
                  onChange={(e) => setFlux2ProSettings({
                    ...flux2ProSettings,
                    custom_height: parseInt(e.target.value) || 1024
                  })}
                />
              </div>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">
                  Range: 512-2048 pixels
                </p>
              </div>
            </div>
          )}

          {/* Advanced Settings Toggle */}
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Advanced Settings</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowFlux2ProAdvanced(!showFlux2ProAdvanced)}
            >
              {showFlux2ProAdvanced ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Hide
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Show
                </>
              )}
            </Button>
          </div>

          {/* Advanced Settings */}
          {showFlux2ProAdvanced && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              {/* Safety Tolerance */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="flux2pro-safety">Safety Tolerance</Label>
                  <span className="text-sm text-muted-foreground">
                    {flux2ProSettings.safety_tolerance}
                  </span>
                </div>
                <Slider
                  id="flux2pro-safety"
                  min={1}
                  max={5}
                  step={1}
                  value={[parseInt(flux2ProSettings.safety_tolerance)]}
                  onValueChange={(value) => setFlux2ProSettings({
                    ...flux2ProSettings,
                    safety_tolerance: value[0].toString()
                  })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Strict (1)</span>
                  <span>Balanced (2-3)</span>
                  <span>Permissive (5)</span>
                </div>
              </div>

              {/* Safety Checker */}
              <div className="flex items-center justify-between">
                <Label htmlFor="flux2pro-safety-checker">Enable Safety Checker</Label>
                <Switch
                  id="flux2pro-safety-checker"
                  checked={flux2ProSettings.enable_safety_checker}
                  onCheckedChange={(checked) => setFlux2ProSettings({
                    ...flux2ProSettings,
                    enable_safety_checker: checked
                  })}
                />
              </div>

              {/* Output Format */}
              <div className="space-y-2">
                <Label htmlFor="flux2pro-format">Output Format</Label>
                <Select
                  value={flux2ProSettings.output_format}
                  onValueChange={(value) => setFlux2ProSettings({
                    ...flux2ProSettings,
                    output_format: value
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="jpeg">JPEG (Smaller file)</SelectItem>
                    <SelectItem value="png">PNG (Higher quality)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Seed */}
              <div className="space-y-2">
                <Label htmlFor="flux2pro-seed">
                  Seed (Optional)
                </Label>
                <Input
                  id="flux2pro-seed"
                  type="number"
                  placeholder="Random"
                  value={flux2ProSettings.seed}
                  onChange={(e) => setFlux2ProSettings({
                    ...flux2ProSettings,
                    seed: e.target.value
                  })}
                />
                <p className="text-xs text-muted-foreground">
                  Use same seed for reproducible results
                </p>
              </div>
            </div>
          )}

          {/* Error Display */}
          {flux2ProError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{flux2ProError}</AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={isFlux2ProGenerating}
          >
            {isFlux2ProGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Editing Image...
              </>
            ) : (
              <>
                <Edit className="mr-2 h-4 w-4" />
                Edit Image
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>

    {/* Result Section */}
    <Card>
      <CardHeader>
        <CardTitle>Result</CardTitle>
        <CardDescription>Your edited image will appear here</CardDescription>
      </CardHeader>
      <CardContent>
        {flux2ProImageUrl ? (
          <div className="space-y-4">
            <div className="relative border rounded-lg overflow-hidden bg-muted/50">
              <img
                src={flux2ProImageUrl}
                alt="Edited result"
                className="w-full h-auto"
              />
            </div>
            
            {flux2ProGeneratedPrompt && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs font-medium mb-1">Prompt Used:</p>
                <p className="text-xs text-muted-foreground">
                  {flux2ProGeneratedPrompt}
                </p>
              </div>
            )}
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => handleImageDownload(flux2ProImageUrl, "flux-2-pro-edit")}
                className="flex-1"
              >
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setFlux2ProImageUrl("")
                  setFlux2ProGeneratedPrompt("")
                }}
                className="flex-1"
              >
                <X className="mr-2 h-4 w-4" />
                Clear
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <ImageIcon className="h-12 w-12 mb-2" />
            <p className="text-sm">No image edited yet</p>
            <p className="text-xs mt-1">Upload reference images and describe your edit</p>
          </div>
        )}
      </CardContent>
    </Card>
  </div>

  {/* Info Section */}
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Sparkles className="h-5 w-5" />
        Flux 2 Pro Features
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid md:grid-cols-2 gap-4 text-sm">
        <div className="space-y-2">
          <h4 className="font-medium">Multi-Reference Editing</h4>
          <ul className="space-y-1 text-muted-foreground text-xs">
            <li>• Up to 9 reference images (9 MP total)</li>
            <li>• Image referencing: @image1, @image2 in prompts</li>
            <li>• Natural language precision without masks</li>
            <li>• Sequential editing capability</li>
          </ul>
        </div>
        
        <div className="space-y-2">
          <h4 className="font-medium">Advanced Controls</h4>
          <ul className="space-y-1 text-muted-foreground text-xs">
            <li>• Safety tolerance: 1 (strict) to 5 (permissive)</li>
            <li>• Output format: JPEG or PNG</li>
            <li>• Seed support for reproducibility</li>
            <li>• Custom dimensions: 512-2048px</li>
          </ul>
        </div>
        
        <div className="space-y-2">
          <h4 className="font-medium">Production Ready</h4>
          <ul className="space-y-1 text-muted-foreground text-xs">
            <li>• Zero-configuration approach</li>
            <li>• Consistent quality without tuning</li>
            <li>• Optimized for speed and reliability</li>
            <li>• Built-in safety protections</li>
          </ul>
        </div>
        
        <div className="space-y-2">
          <h4 className="font-medium">Use Cases</h4>
          <ul className="space-y-1 text-muted-foreground text-xs">
            <li>• Product photography editing</li>
            <li>• Background replacement</li>
            <li>• Multi-style composition</li>
            <li>• Context-aware transformations</li>
          </ul>
        </div>
      </div>
    </CardContent>
  </Card>
</TabsContent>
```

## Notas de Integración

1. **Líneas aproximadas**: Los números de línea son aproximados y pueden variar según cambios recientes
2. **Orden de integración**:
   - Primero agregar los estados (sección 1)
   - Luego agregar los handlers (sección 2)
   - Después agregar el TabsTrigger (sección 3)
   - Finalmente agregar el TabsContent completo (sección 4)
3. **Dependencias**: Todos los componentes UI ya están importados (Button, Card, Input, etc.)
4. **Helper handleImageDownload**: Ya existe en la UI para manejar descargas de Base64

## Testing Checklist

Después de integrar, verificar:
- [ ] Se puede subir 1-9 imágenes
- [ ] Los previews se muestran correctamente
- [ ] Se puede remover imágenes individuales
- [ ] El selector de tamaños funciona (presets y custom)
- [ ] El slider de safety tolerance responde
- [ ] El switch de safety checker funciona
- [ ] La generación se inicia correctamente
- [ ] El resultado se muestra con disclaimer
- [ ] El botón de descarga funciona para Base64
- [ ] Los mensajes de error se muestran adecuadamente
