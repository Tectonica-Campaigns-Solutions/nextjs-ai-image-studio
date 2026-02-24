"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, Wand2, Loader2, Image as ImageIcon, Sparkles, Settings, Zap, FileText, ExternalLink, Eye, X, Plus, Download, AlertCircle, Shield, ChevronUp, ChevronDown, Edit } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type { CanonicalPromptConfig } from "@/lib/canonical-prompt"

const COMPOSITION_RULES: { value: string; label: string }[] = [
  { value: "ruleOfThirdsUpper",          label: "Rule of Thirds – Upper" },
  { value: "ruleOfThirdsVerticalUpper",   label: "Rule of Thirds – Vertical Upper" },
  { value: "diagonalSquareLowerRight",    label: "Diagonal – Square Lower Right" },
  { value: "ruleOfThirdsSquareBottom",    label: "Rule of Thirds – Square Bottom" },
  { value: "ruleOfThirdsWideRight",       label: "Rule of Thirds – Wide Right" },
  { value: "goldenSpiralWideTopleft",     label: "Golden Spiral – Wide Top Left" },
  { value: "ruleOfThirdsWideBottom",      label: "Rule of Thirds – Wide Bottom" },
  { value: "ruleOfThirdsWideRightColumn", label: "Rule of Thirds – Wide Right Column" },
  { value: "ruleOfThirdsPortraitBottom",  label: "Rule of Thirds – Portrait Bottom" },
  { value: "ruleOfThirdsPortraitUpper",   label: "Rule of Thirds – Portrait Upper" },
  { value: "ruleOfThirdsRallySignTop",    label: "Rule of Thirds – Rally Sign Top" },
]

export default function ImageEditor() {
  // Flux LoRA Text-to-Image States
  const [fluxProPrompt, setFluxProPrompt] = useState("")
  const [fluxProSettings, setFluxProSettings] = useState({
    image_size: "landscape_4_3",
    num_inference_steps: 28,
    guidance_scale: 3.5,
    num_images: 1,
    output_format: "png",
    enable_safety_checker: true,
    negative_prompt: "",
    seed: "1234",
    width: "",
    height: ""
  })
  const [fluxProImageUrl, setFluxProImageUrl] = useState<string>("")
  const [isFluxProGenerating, setIsFluxProGenerating] = useState(false)
  const [fluxProError, setFluxProError] = useState<string>("")
  const [fluxProGeneratedPrompt, setFluxProGeneratedPrompt] = useState<string>("")
  const [showFluxProAdvanced, setShowFluxProAdvanced] = useState(false)

  // Local state for Flux Ultra prompt to prevent lag
  const [localFluxUltraPrompt, setLocalFluxUltraPrompt] = useState('')

  // Flux Ultra Finetuned States
  const [fluxUltraPrompt, setFluxUltraPrompt] = useState("")
  const [fluxUltraSettings, setFluxUltraSettings] = useState({
    aspect_ratio: "1:1",
    num_images: 1,
    safety_tolerance: 1,
    output_format: "jpeg",
    enable_safety_checker: true,
    raw: false, // Raw mode setting
    seed: "1234"
  })
  const [fluxUltraFinetuneId, setFluxUltraFinetuneId] = useState("a4bd761c-0f90-41cc-be78-c7b6cf22285a")
  const [fluxUltraFinetuneStrength, setFluxUltraFinetuneStrength] = useState(1.0)
  const [fluxUltraTriggerPhrase, setFluxUltraTriggerPhrase] = useState("TCT-AI-8")
  const [fluxUltraImageUrl, setFluxUltraImageUrl] = useState<string>("")
  const [isFluxUltraGenerating, setIsFluxUltraGenerating] = useState(false)
  const [fluxUltraError, setFluxUltraError] = useState<string>("")
  const [fluxUltraGeneratedPrompt, setFluxUltraGeneratedPrompt] = useState<string>("")
  const [showFluxUltraAdvanced, setShowFluxUltraAdvanced] = useState(false)

  // Flux 2 Pro Edit States
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

  // Flux 2 Pro Edit Create States (with 8 pre-loaded reference images)
  const [flux2ProCreatePrompt, setFlux2ProCreatePrompt] = useState("")
  const [flux2ProCreateUserImage, setFlux2ProCreateUserImage] = useState<File | null>(null)
  const [flux2ProCreateImageUrl, setFlux2ProCreateImageUrl] = useState("")
  const [flux2ProCreateBase64Image, setFlux2ProCreateBase64Image] = useState("")
  const [flux2ProCreateSettings, setFlux2ProCreateSettings] = useState({
    image_size: "auto",
    safety_tolerance: "2",
    enable_safety_checker: true,
    output_format: "jpeg",
    seed: "",
    custom_width: 1024,
    custom_height: 1024
  })
  const [flux2ProCreateResultUrl, setFlux2ProCreateResultUrl] = useState<string>("")
  const [isFlux2ProCreateGenerating, setIsFlux2ProCreateGenerating] = useState(false)
  const [flux2ProCreateError, setFlux2ProCreateError] = useState<string>("")
  const [flux2ProCreateGeneratedPrompt, setFlux2ProCreateGeneratedPrompt] = useState<string>("")
  const [showFlux2ProCreateAdvanced, setShowFlux2ProCreateAdvanced] = useState(false)
  const [flux2ProCreateUserImagePreview, setFlux2ProCreateUserImagePreview] = useState<string>("")

  // Flux 2 Pro Edit Apply States (scene-based style transfer with sceneType)
  const [flux2ProApplySceneType, setFlux2ProApplySceneType] = useState<'people' | 'landscape' | 'urban' | 'monument'>('people')
  const [flux2ProApplyPrompt, setFlux2ProApplyPrompt] = useState("")
  const [flux2ProApplyUserImage, setFlux2ProApplyUserImage] = useState<File | null>(null)
  const [flux2ProApplyImageUrl, setFlux2ProApplyImageUrl] = useState("")
  const [flux2ProApplyBase64Image, setFlux2ProApplyBase64Image] = useState("")
  const [flux2ProApplySettings, setFlux2ProApplySettings] = useState({
    image_size: "auto",
    safety_tolerance: "2",
    enable_safety_checker: true,
    output_format: "jpeg",
    seed: "",
    custom_width: 1024,
    custom_height: 1024
  })
  const [flux2ProApplyResultUrl, setFlux2ProApplyResultUrl] = useState<string>("")
  const [isFlux2ProApplyGenerating, setIsFlux2ProApplyGenerating] = useState(false)
  const [flux2ProApplyError, setFlux2ProApplyError] = useState<string>("")
  const [showFlux2ProApplyAdvanced, setShowFlux2ProApplyAdvanced] = useState(false)
  const [flux2ProApplyUserImagePreview, setFlux2ProApplyUserImagePreview] = useState<string>("")

  // Composition Rule States (one per Flux 2 Pro tab)
  const [flux2ProEditCompositionRule, setFlux2ProEditCompositionRule] = useState("")
  const [flux2ProCreateCompositionRule, setFlux2ProCreateCompositionRule] = useState("")
  const [flux2ProApplyCompositionRule, setFlux2ProApplyCompositionRule] = useState("")
  const [flux2ProCombineCompositionRule, setFlux2ProCombineCompositionRule] = useState("")

  // Flux 2 Pro Combine States (2 images)
  const [flux2ProCombinePrompt, setFlux2ProCombinePrompt] = useState("")
  const [flux2ProCombineImages, setFlux2ProCombineImages] = useState<(File | null)[]>([null, null])
  const [flux2ProCombineImageUrls, setFlux2ProCombineImageUrls] = useState<string[]>(["", ""])
  const [flux2ProCombineBase64Images, setFlux2ProCombineBase64Images] = useState<string[]>(["", ""])
  const [flux2ProCombineSettings, setFlux2ProCombineSettings] = useState({
    image_size: "auto",
    safety_tolerance: "2",
    enable_safety_checker: true,
    output_format: "jpeg",
    seed: "",
    custom_width: 1024,
    custom_height: 1024
  })
  const [flux2ProCombineResultUrl, setFlux2ProCombineResultUrl] = useState<string>("")
  const [isFlux2ProCombineGenerating, setIsFlux2ProCombineGenerating] = useState(false)
  const [flux2ProCombineError, setFlux2ProCombineError] = useState<string>("")
  const [flux2ProCombineGeneratedPrompt, setFlux2ProCombineGeneratedPrompt] = useState<string>("")
  const [showFlux2ProCombineAdvanced, setShowFlux2ProCombineAdvanced] = useState(false)
  const [flux2ProCombineImagePreviews, setFlux2ProCombineImagePreviews] = useState<string[]>(["", ""])

  // JSON Enhancement States (RAG removed)
  const [useJSONEnhancement, setUseJSONEnhancement] = useState(true)
  const [jsonIntensity, setJsonIntensity] = useState(1.0)
  const [enhancementPreview, setEnhancementPreview] = useState<string>("")
  const [enhancementMeta, setEnhancementMeta] = useState<any>(null)
  const [customEnhancementText, setCustomEnhancementText] = useState<string>("")
  const [defaultEnhancementText, setDefaultEnhancementText] = useState<string>("")
  

  // Flux LoRA States
  const [useFluxProLoRA, setUseFluxProLoRA] = useState(true)
  const [fluxProLoraUrl, setFluxProLoraUrl] = useState("https://v3.fal.media/files/elephant/YOSyiUVvNDHBF-V3pLTM1_pytorch_lora_weights.safetensors")
  const [fluxProTriggerPhrase, setFluxProTriggerPhrase] = useState("MDF-9-9-2025B")
  const [fluxProLoraScale, setFluxProLoraScale] = useState(1.3)

  // Flux Pro Multi Text-to-Image States
  const [fluxProMultiPrompt, setFluxProMultiPrompt] = useState("")
  const [fluxProMultiSettings, setFluxProMultiSettings] = useState({
    image_size: "landscape_4_3",
    num_inference_steps: 28,
    guidance_scale: 3.5,
    num_images: 4, // Default for multi generation
    output_format: "jpg",
    safety_tolerance: 2,
    seed: "1234",
    width: "",
    height: ""
  })
  const [fluxProMultiResult, setFluxProMultiResult] = useState<any[]>([])
  const [isFluxProMultiGenerating, setIsFluxProMultiGenerating] = useState(false)
  const [fluxProMultiError, setFluxProMultiError] = useState<string>("")
  const [fluxProMultiGeneratedPrompt, setFluxProMultiGeneratedPrompt] = useState<string>("")
  const [showFluxProMultiAdvanced, setShowFluxProMultiAdvanced] = useState(false)

  // Flux Pro Multi LoRA States
  const [useFluxProMultiLoRA, setUseFluxProMultiLoRA] = useState(true)
  const [fluxProMultiLoraUrl, setFluxProMultiLoraUrl] = useState("https://v3.fal.media/files/elephant/YOSyiUVvNDHBF-V3pLTM1_pytorch_lora_weights.safetensors")
  const [fluxProMultiTriggerPhrase, setFluxProMultiTriggerPhrase] = useState("MDF-9-9-2025B")
  const [fluxProMultiLoraScale, setFluxProMultiLoraScale] = useState(1.3)

  // Flux Pro Image Combine States
  const [fluxCombinePrompt, setFluxCombinePrompt] = useState("")
  const [localFluxCombinePrompt, setLocalFluxCombinePrompt] = useState("") // Local state for input performance
  const [fluxCombineImages, setFluxCombineImages] = useState<File[]>([])
  const [fluxCombineImageUrls, setFluxCombineImageUrls] = useState<string[]>([])
  const [fluxCombineBase64Images, setFluxCombineBase64Images] = useState<string[]>([])
  const [fluxCombineBase64Input, setFluxCombineBase64Input] = useState("")
  const [fluxCombineSettings, setFluxCombineSettings] = useState({
    aspect_ratio: "1:1",
    guidance_scale: 3.5,
    num_images: 1,
    output_format: "jpeg",
    safety_tolerance: 2,
    seed: "",
    enhance_prompt: false
  })
  const [fluxCombineResult, setFluxCombineResult] = useState<string>("")
  const [isFluxCombineGenerating, setIsFluxCombineGenerating] = useState(false)
  const [fluxCombineError, setFluxCombineError] = useState<string>("")
  const [fluxCombineGeneratedPrompt, setFluxCombineGeneratedPrompt] = useState<string>("")
  const [showFluxCombineAdvanced, setShowFluxCombineAdvanced] = useState(false)

  // Canonical Prompt States
  const [useCanonicalPrompt, setUseCanonicalPrompt] = useState(true) // Enabled by default
  const [canonicalConfig, setCanonicalConfig] = useState<CanonicalPromptConfig>({
    userInput: "",
    keepOptions: {
      identity: true,
      pose: true,
      layout: true,
      text: false
    },
    preserveOptions: {
      preserve_primary: false
    },
    combineOptions: {
      force_integration: false
    },
    preserveSecondaryOptions: {
      architectural_elements: false,
      statues_sculptures: false,
      furniture_objects: false,
      decorative_items: false,
      structural_features: false,
      text_signs: false,
      natural_elements: false,
      vehicles_machinery: false
    },
    secondaryFidelityLevel: 'moderate' as const,
    applyStyle: {
      texture: "none",
      overlay: "none"
    },
    subjectFraming: "medium shot",
    subjectComposition: "centered"
  })
  const [canonicalPreview, setCanonicalPreview] = useState<string>("")

  // Flux Combine JSON Enhancement States
  const [fluxCombineUseJSONEnhancement, setFluxCombineUseJSONEnhancement] = useState(false) // Disabled by default (Canonical Prompt is preferred)
  const [fluxCombineJsonIntensity, setFluxCombineJsonIntensity] = useState(1.0)
  const [fluxCombineEnhancementPreview, setFluxCombineEnhancementPreview] = useState<string>("")
  const [fluxCombineEnhancementMeta, setFluxCombineEnhancementMeta] = useState<any>(null)
  const [fluxCombineCustomEnhancementText, setFluxCombineCustomEnhancementText] = useState<string>("")
  const [fluxCombineDefaultEnhancementText, setFluxCombineDefaultEnhancementText] = useState<string>("")

  // External Flux Ultra States
  const [externalFluxUltraPrompt, setExternalFluxUltraPrompt] = useState("")
  const [externalFluxUltraSettings, setExternalFluxUltraSettings] = useState({
    aspect_ratio: "1:1",
    num_images: 1,
    safety_tolerance: 1,
    output_format: "jpeg",
    enable_safety_checker: true,
    raw: false,
    seed: "1234"
  })
  const [externalFluxUltraFinetuneId, setExternalFluxUltraFinetuneId] = useState("a4bd761c-0f90-41cc-be78-c7b6cf22285a")
  const [externalFluxUltraFinetuneStrength, setExternalFluxUltraFinetuneStrength] = useState(1.0)
  const [externalFluxUltraTriggerPhrase, setExternalFluxUltraTriggerPhrase] = useState("TCT-AI-8")
  const [externalFluxUltraResult, setExternalFluxUltraResult] = useState<string>("")
  const [isExternalFluxUltraGenerating, setIsExternalFluxUltraGenerating] = useState(false)
  const [externalFluxUltraError, setExternalFluxUltraError] = useState<string>("")
  const [externalFluxUltraGeneratedPrompt, setExternalFluxUltraGeneratedPrompt] = useState<string>("")
  const [showExternalFluxUltraAdvanced, setShowExternalFluxUltraAdvanced] = useState(false)
  
  const [externalUseJSONEnhancement, setExternalUseJSONEnhancement] = useState(false) // Disabled by default for external

  // Edit Image States
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>("")
  const [prompt, setPrompt] = useState("")
  const [editedImageUrl, setEditedImageUrl] = useState<string>("")

  // Edit Image JSON Enhancement States
  const [useEditJSONEnhancement, setUseEditJSONEnhancement] = useState(true) // Enabled by default
  const [editJsonIntensity, setEditJsonIntensity] = useState(1.0)
  const [editEnhancementPreview, setEditEnhancementPreview] = useState<string>("")
  const [editEnhancementMeta, setEditEnhancementMeta] = useState<any>(null)
  const [editCustomEnhancementText, setEditCustomEnhancementText] = useState<string>("")
  const [editDefaultEnhancementText, setEditDefaultEnhancementText] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>("")
  const [editGeneratedPrompt, setEditGeneratedPrompt] = useState<string>("") // Store generated prompt
  const [editImageSize, setEditImageSize] = useState("square_hd") // Image size for edit
  const [customWidth, setCustomWidth] = useState("1024") // Custom width for edit
  const [customHeight, setCustomHeight] = useState("1024") // Custom height for edit
  const [editNegativePrompts, setEditNegativePrompts] = useState<string[]>([])
  const [showEditNegativePrompts, setShowEditNegativePrompts] = useState(false)

  // SeDream v4 Edit States
  const [sedreamImage, setSedreamImage] = useState<File | null>(null)
  const [sedreamImageUrl, setSedreamImageUrl] = useState<string>("")
  const [sedreamBase64Image, setSedreamBase64Image] = useState<string>("")
  const [sedreamBase64Preview, setSedreamBase64Preview] = useState<string>("")
  const [sedreamPreviewUrl, setSedreamPreviewUrl] = useState<string>("")
  const [sedreamPrompt, setSedreamPrompt] = useState("") // Optional prompt
  const [sedreamResult, setSedreamResult] = useState<string>("")
  const [isSedreamLoading, setIsSedreamLoading] = useState(false)
  const [sedreamError, setSedreamError] = useState<string>("")

  // SeDream v4 JSON Enhancement States
  const [useSedreamJSONEnhancement, setUseSedreamJSONEnhancement] = useState(true) // Enabled by default
  const [sedreamJsonIntensity, setSedreamJsonIntensity] = useState(1.0) // Max intensity
  const [sedreamEnhancementPreview, setSedreamEnhancementPreview] = useState<string>("")
  const [sedreamEnhancementMeta, setSedreamEnhancementMeta] = useState<any>(null)
  const [sedreamCustomEnhancementText, setSedreamCustomEnhancementText] = useState<string>("")
  const [sedreamAspectRatio, setSedreamAspectRatio] = useState<"original" | "1:1" | "16:9" | "9:16" | "4:3" | "3:4" | "custom">("original")
  const [sedreamCustomWidth, setSedreamCustomWidth] = useState(1024)
  const [sedreamCustomHeight, setSedreamCustomHeight] = useState(1024)
  const [sedreamDefaultEnhancementText, setSedreamDefaultEnhancementText] = useState<string>("")
  const [sedreamNegativePrompts, setSedreamNegativePrompts] = useState<string[]>([])
  const [showNegativePrompts, setShowNegativePrompts] = useState(false)

  // Helper function to handle image download/view
  const handleImageDownload = (imageUrl: string, filename: string = 'image.png') => {
    // Check if it's a base64 image
    if (imageUrl.startsWith('data:image')) {
      // For base64 images, open in new tab
      const win = window.open()
      if (win) {
        win.document.write(`<img src="${imageUrl}" style="max-width: 100%; height: auto;" />`)
        win.document.title = filename
      }
    } else {
      // For URL images, use download link
      const link = document.createElement('a')
      link.href = imageUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  // Helper component to display generated prompt
  const GeneratedPromptDisplay = ({ prompt, title }: { prompt: string; title: string }) => {
    if (!prompt) return null
    
    return (
      <Card className="mt-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-3 bg-muted rounded-md">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{prompt}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Helper component for open in new tab button
  const OpenInNewTabButton = ({ imageUrl, buttonText = "Open in New Tab" }: { imageUrl: string; buttonText?: string }) => {
    if (!imageUrl) return null

    const handleOpenInNewTab = () => {
      if (imageUrl.startsWith('data:')) {
        // Convert data URL to blob URL for opening in new tab
        fetch(imageUrl)
          .then(res => res.blob())
          .then(blob => {
            const blobUrl = URL.createObjectURL(blob)
            window.open(blobUrl, '_blank', 'noopener,noreferrer')
            // Clean up the blob URL after a delay to free memory
            setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
          })
          .catch(err => {
            console.error('Error opening image:', err)
            // Fallback: try to open the data URL directly
            window.open(imageUrl, '_blank', 'noopener,noreferrer')
          })
      } else {
        // Regular URL - open directly
        window.open(imageUrl, '_blank', 'noopener,noreferrer')
      }
    }

    return (
      <Button 
        type="button"
        variant="outline" 
        size="sm" 
        onClick={handleOpenInNewTab}
        className="mt-3 w-full"
      >
        <ExternalLink className="h-4 w-4 mr-2" />
        {buttonText}
      </Button>
    )
  }

  // Sync combine local states with config when config changes programmatically
  useEffect(() => {
    setLocalFluxCombinePrompt(fluxCombinePrompt)
  }, [fluxCombinePrompt])


  // Helper function to handle moderation errors with user-friendly messages
  const handleModerationError = (errorData: any): string => {
    if (!errorData?.error) return "Could not generate image. Please try with different content."
    
    const errorMessage = errorData.error.toLowerCase()
    
    // Check for specific moderation reasons
    if (errorMessage.includes('explicit') || errorMessage.includes('sexual') || errorMessage.includes('nude')) {
      return "This content contains explicit material that is not permitted. Try descriptions like 'professionals in meeting' or 'natural landscape'."
    }
    
    if (errorMessage.includes('violence') || errorMessage.includes('weapon') || errorMessage.includes('violent')) {
      return "This content includes violent elements that are not permitted. Try descriptions like 'peaceful demonstration' or 'community event'."
    }
    
    if (errorMessage.includes('public figure') || errorMessage.includes('celebrity') || errorMessage.includes('politician')) {
      return "We cannot generate images of public figures or celebrities. Describe generic people like 'community leader' or 'organizational spokesperson'."
    }
    
    if (errorMessage.includes('fake news') || errorMessage.includes('misinformation') || errorMessage.includes('false')) {
      return "This content could include misinformation. Make sure to describe accurate and truthful information for your organization."
    }
    
    if (errorMessage.includes('inappropriate language') || errorMessage.includes('offensive')) {
      return "The language used is not appropriate. Rephrase your description in a more professional and constructive manner."
    }
    
    if (errorMessage.includes('blocked by content moderation')) {
      return "This content does not comply with our usage policies. Try descriptions appropriate like 'educational campaign' or 'informational material'."
    }
    
    // Generic moderation message
    return "This content is not permitted according to our policies. Try descriptions appropriate for professional organizational use."
  }

  const handleFluxProSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!fluxProPrompt.trim()) {
      setFluxProError("Please enter a prompt")
      return
    }

    setIsFluxProGenerating(true)
    setFluxProError("")

    try {
      const formData = new FormData()
      
      // HYBRID ENHANCEMENT: Determine strategy based on UI state
      let finalPrompt = fluxProPrompt
      let enhancementResult = null
      
      
      // Enhance prompt with LoRA trigger phrase if enabled
      if (useFluxProLoRA && fluxProTriggerPhrase.trim()) {
        finalPrompt = `${fluxProTriggerPhrase}, ${finalPrompt}`
        console.log("[FRONTEND] Enhanced prompt with trigger phrase:", finalPrompt)
      }
      
      formData.append("prompt", finalPrompt)
      formData.append("useRag", "false") // RAG is now handled by hybrid system
      
      // Prepare settings object, converting types as needed
      const settings: any = { ...fluxProSettings }
      
      // Add LoRA configuration if enabled
      if (useFluxProLoRA && fluxProLoraUrl.trim()) {
        settings.loras = [{
          path: fluxProLoraUrl,
          scale: fluxProLoraScale
        }]
        console.log("[FRONTEND] Adding LoRA to settings:", settings.loras)
      }
           
      // Add LoRA configuration if enabled
      if (useFluxProLoRA && fluxProLoraUrl.trim()) {
        settings.loras = [{
          path: fluxProLoraUrl,
          scale: fluxProLoraScale
        }]
        console.log("[FRONTEND] Adding LoRA to settings:", settings.loras)
      }
      
      // Remove empty string values
      Object.keys(settings).forEach(key => {
        if (settings[key] === "") {
          delete settings[key]
        }
      })
      
      // Convert string numbers to actual numbers
      if (settings.width) settings.width = parseInt(settings.width as string)
      if (settings.height) settings.height = parseInt(settings.height as string)
      if (settings.seed) settings.seed = parseInt(settings.seed as string)
      
      console.log("[FRONTEND] Final settings being sent:", settings)
      
      formData.append("settings", JSON.stringify(settings))
      formData.append("orgType", "general")

      const response = await fetch("/api/flux-pro-text-to-image", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        if (response.status === 400 && errorData?.error) {
          // Use user-friendly error handling for moderation
          const friendlyMessage = handleModerationError(errorData)
          throw new Error(friendlyMessage)
        }
        throw new Error(`Server error (${response.status}). Please try again.`)
      }

      const result = await response.json()
      
      // Capture generated prompt if available
      if (result.finalPrompt) {
        setFluxProGeneratedPrompt(result.finalPrompt)
      } else if (result.prompt) {
        setFluxProGeneratedPrompt(result.prompt)
      } else {
        setFluxProGeneratedPrompt(fluxProPrompt) // Fallback to original prompt
      }
      
      if (result.image) {
        setFluxProImageUrl(result.image)
      } else if (result.images && result.images.length > 0) {
        // Handle multiple images - for now, show the first one
        setFluxProImageUrl(result.images[0].url)
      } else {
        throw new Error("No image received from server")
      }
    } catch (err) {
      setFluxProError(err instanceof Error ? err.message : "Failed to generate image")
    } finally {
      setIsFluxProGenerating(false)
    }
  }

  const handleFluxProMultiSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!fluxProMultiPrompt.trim()) {
      setFluxProMultiError("Please enter a prompt")
      return
    }

    setIsFluxProMultiGenerating(true)
    setFluxProMultiError("")

    try {
      const formData = new FormData()
      
      // Enhance prompt with LoRA trigger phrase if enabled
      let finalPrompt = fluxProMultiPrompt
      if (useFluxProMultiLoRA && fluxProMultiTriggerPhrase.trim()) {
        finalPrompt = `${fluxProMultiTriggerPhrase}, ${fluxProMultiPrompt}`
        console.log("[FRONTEND] Enhanced multi prompt with trigger phrase:", finalPrompt)
      }
      
      formData.append("prompt", finalPrompt)
      formData.append("useRag", "false")
      
      // Prepare settings object, converting types as needed
      const settings: any = { ...fluxProMultiSettings }
      
      // Add LoRA configuration if enabled
      if (useFluxProMultiLoRA && fluxProMultiLoraUrl.trim()) {
        settings.loras = [{
          path: fluxProMultiLoraUrl,
          scale: fluxProMultiLoraScale
        }]
        console.log("[FRONTEND] Adding LoRA to multi settings:", settings.loras)
      }
      
      // Remove empty string values
      Object.keys(settings).forEach(key => {
        if (settings[key] === "") {
          delete settings[key]
        }
      })
      
      // Convert string numbers to actual numbers
      if (settings.width) settings.width = parseInt(settings.width as string)
      if (settings.height) settings.height = parseInt(settings.height as string)
      if (settings.seed) settings.seed = parseInt(settings.seed as string)
      
      console.log("[FRONTEND] Final multi settings being sent:", settings)
      
      formData.append("settings", JSON.stringify(settings))
      formData.append("orgType", "general")

      const response = await fetch("/api/flux-pro-multi-text-to-image", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        if (errorData?.blocked) {
          throw new Error(handleModerationError(errorData))
        }
        throw new Error(errorData?.error || `Server error (${response.status}). Please try again.`)
      }

      const result = await response.json()
      
      // Capture generated prompt if available
      if (result.finalPrompt) {
        setFluxProMultiGeneratedPrompt(result.finalPrompt)
      } else if (result.prompt) {
        setFluxProMultiGeneratedPrompt(result.prompt)
      } else {
        setFluxProMultiGeneratedPrompt(fluxProMultiPrompt) // Fallback to original prompt
      }
      
      if (result.success && result.images && result.images.length > 0) {
        setFluxProMultiResult(result.images)
      } else {
        throw new Error("No images received from server")
      }
    } catch (err) {
      setFluxProMultiError(err instanceof Error ? err.message : "Failed to generate images")
    } finally {
      setIsFluxProMultiGenerating(false)
    }
  }

  const handleFluxUltraSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!localFluxUltraPrompt.trim()) {
      setFluxUltraError("Please enter a prompt")
      return
    }

    if (!fluxUltraFinetuneId.trim()) {
      setFluxUltraError("Please enter a fine-tune ID")
      return
    }

    if (!fluxUltraTriggerPhrase.trim()) {
      setFluxUltraError("Please enter a trigger phrase")
      return
    }

    setIsFluxUltraGenerating(true)
    setFluxUltraError("")

    try {
      let finalPrompt = localFluxUltraPrompt

      // Canonical prompt processing is deprecated
      // Original prompt will be used

      const formData = new FormData()
      
      // The API will construct the final prompt with trigger phrase
      formData.append("prompt", finalPrompt)
      formData.append("finetuneId", fluxUltraFinetuneId)
      formData.append("finetuneStrength", fluxUltraFinetuneStrength.toString())
      formData.append("triggerPhrase", fluxUltraTriggerPhrase)
      
      // Prepare settings object
      const settings: any = { ...fluxUltraSettings }
      
      // Remove empty string values
      Object.keys(settings).forEach(key => {
        if (settings[key] === "") {
          delete settings[key]
        }
      })
      
      // Convert string numbers to actual numbers
      if (settings.seed) settings.seed = parseInt(settings.seed as string)
      
      console.log("[FRONTEND] Flux Ultra settings being sent:", settings)
      
      formData.append("settings", JSON.stringify(settings))
      formData.append("orgType", "general")

      const response = await fetch("/api/flux-ultra-finetuned", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        if (response.status === 400 && errorData?.error) {
          // Use user-friendly error handling for moderation
          const friendlyMessage = handleModerationError(errorData)
          throw new Error(friendlyMessage)
        }
        throw new Error(`Server error (${response.status}). Please try again.`)
      }

      const result = await response.json()
      
      // Capture generated prompt if available (should include trigger phrase)
      if (result.finalPrompt) {
        setFluxUltraGeneratedPrompt(result.finalPrompt)
      } else {
        // Fallback: construct the expected final prompt
        setFluxUltraGeneratedPrompt(`${fluxUltraTriggerPhrase}, ${fluxUltraPrompt}`)
      }
      
      if (result.image) {
        setFluxUltraImageUrl(result.image)
      } else {
        throw new Error("No image received from server")
      }
    } catch (err) {
      setFluxUltraError(err instanceof Error ? err.message : "Failed to generate image")
    } finally {
      setIsFluxUltraGenerating(false)
    }
  }

  const handleFluxCombineSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!fluxCombinePrompt.trim()) {
      setFluxCombineError("Please enter a prompt")
      return
    }

    if (fluxCombineImages.length + fluxCombineImageUrls.length + fluxCombineBase64Images.length < 2) {
      setFluxCombineError("Please upload at least 2 images to combine")
      return
    }

    setIsFluxCombineGenerating(true)
    setFluxCombineError("")

    try {
      // For Combine Images, enhancement is handled by the backend
      // Send original prompt and JSON options to avoid double enhancement
      let finalPrompt = fluxCombinePrompt

      const formData = new FormData()
      
      formData.append("prompt", finalPrompt)
      formData.append("useRag", "false")
      
      // Add JSON enhancement options for backend processing
      const jsonOptions = {
        customText: fluxCombineCustomEnhancementText !== fluxCombineDefaultEnhancementText ? fluxCombineCustomEnhancementText : '',
        intensity: fluxCombineJsonIntensity
      }
      formData.append("jsonOptions", JSON.stringify(jsonOptions))
      
      // Add uploaded image files
      fluxCombineImages.forEach((file, index) => {
        formData.append(`image${index}`, file)
      })
      
      // Add image URLs
      fluxCombineImageUrls.forEach((url, index) => {
        if (url.trim()) {
          formData.append(`imageUrl${index}`, url.trim())
        }
      })

      // Add Base64 images
      fluxCombineBase64Images.forEach((base64, index) => {
        formData.append(`imageBase64${index}`, base64)
      })
      
      // Prepare settings object
      const settings: any = { ...fluxCombineSettings }
      
      // Remove empty string values
      Object.keys(settings).forEach(key => {
        if (settings[key] === "") {
          delete settings[key]
        }
      })
      
      // Convert string numbers to actual numbers
      if (settings.seed) settings.seed = parseInt(settings.seed as string)
      
      console.log("[FRONTEND] Final combine settings being sent:", settings)
      
      formData.append("settings", JSON.stringify(settings))
      formData.append("orgType", "general")

      // Add canonical prompt parameters
      formData.append("useCanonicalPrompt", useCanonicalPrompt.toString())
      if (useCanonicalPrompt) {
        formData.append("canonicalConfig", JSON.stringify(canonicalConfig))
      }

      const response = await fetch("/api/flux-pro-image-combine", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        if (errorData?.blocked) {
          throw new Error(handleModerationError(errorData))
        }
        throw new Error(errorData?.error || `Server error (${response.status}). Please try again.`)
      }

      const result = await response.json()
      
      // Capture generated prompt (use the enhanced prompt from backend)
      if (result.prompt) {
        setFluxCombineGeneratedPrompt(result.prompt)
      } else {
        setFluxCombineGeneratedPrompt(finalPrompt)
      }
      
      if (result.success && result.image) {
        setFluxCombineResult(result.image)
      } else {
        throw new Error("No combined image received from server")
      }
    } catch (err) {
      setFluxCombineError(err instanceof Error ? err.message : "Failed to combine images")
    } finally {
      setIsFluxCombineGenerating(false)
    }
  }


  const handleCombineImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length > 0) {
      setFluxCombineImages(prev => [...prev, ...files])
    }
  }

  const removeCombineImage = (index: number) => {
    setFluxCombineImages(prev => prev.filter((_, i) => i !== index))
  }

  const addCombineImageUrl = () => {
    setFluxCombineImageUrls(prev => [...prev, ""])
  }

  const updateCombineImageUrl = (index: number, url: string) => {
    setFluxCombineImageUrls(prev => {
      const newUrls = [...prev]
      newUrls[index] = url
      return newUrls
    })
  }

  const removeCombineImageUrl = (index: number) => {
    setFluxCombineImageUrls(prev => prev.filter((_, i) => i !== index))
  }

  const addCombineBase64Image = () => {
    const trimmed = fluxCombineBase64Input.trim()
    if (!trimmed) return

    // Validate base64 format
    const isDataUrl = trimmed.startsWith('data:')
    const base64Part = isDataUrl ? trimmed.split(',')[1] || '' : trimmed
    const isBase64 = /^[A-Za-z0-9+/=]+$/.test(base64Part)
    
    if (isDataUrl || isBase64) {
      setFluxCombineBase64Images(prev => [...prev, trimmed])
      setFluxCombineBase64Input("")
    } else {
      alert("Invalid Base64 format. Please paste a valid Base64 string or data URL.")
    }
  }

  const removeCombineBase64Image = (index: number) => {
    setFluxCombineBase64Images(prev => prev.filter((_, i) => i !== index))
  }

  const handleExternalFluxUltraSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!externalFluxUltraPrompt.trim()) {
      setExternalFluxUltraError("Please enter a prompt")
      return
    }

    if (!externalFluxUltraFinetuneId.trim()) {
      setExternalFluxUltraError("Please enter a fine-tune ID")
      return
    }

    if (!externalFluxUltraTriggerPhrase.trim()) {
      setExternalFluxUltraError("Please enter a trigger phrase")
      return
    }

    setIsExternalFluxUltraGenerating(true)
    setExternalFluxUltraError("")

    try {
      // Prepare request body for external endpoint
      const requestBody: any = {
        prompt: externalFluxUltraPrompt,
        finetuneId: externalFluxUltraFinetuneId,
        triggerPhrase: externalFluxUltraTriggerPhrase,
        finetuneStrength: externalFluxUltraFinetuneStrength,
        settings: externalFluxUltraSettings,
        useGenerationCanonical: false // Canonical prompts deprecated
      }

      console.log('[External Flux Ultra] Request body:', JSON.stringify(requestBody, null, 2))

      const response = await fetch('/api/external/flux-ultra-finetuned', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || `Server error: ${response.status}`)
      }

      if (result.success) {
        setExternalFluxUltraResult(result.image)
        setExternalFluxUltraGeneratedPrompt(result.finalPrompt || "")
        console.log('[External Flux Ultra] Generation successful:', result)
      } else {
        throw new Error(result.error || "Unknown error occurred")
      }

    } catch (err) {
      setExternalFluxUltraError(err instanceof Error ? err.message : "Failed to generate image via external API")
    } finally {
      setIsExternalFluxUltraGenerating(false)
    }
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedImage(file)
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      setEditedImageUrl("") // Clear previous result
      setError("")
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!selectedImage || !prompt.trim()) {
      setError("Please select an image and enter a prompt")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const formData = new FormData()
      formData.append("image", selectedImage)
      formData.append("prompt", prompt)
      formData.append("useRAG", "false")
      formData.append("image_size", editImageSize)
      
      // Add custom dimensions if using custom image_size
      if (editImageSize === 'custom') {
        formData.append("width", customWidth)
        formData.append("height", customHeight)
      }

      const response = await fetch("/api/edit-image", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      // Capture generated prompt if available
      if (result.finalPrompt) {
        setEditGeneratedPrompt(result.finalPrompt)
      } else if (result.prompt) {
        setEditGeneratedPrompt(result.prompt)
      } else {
        setEditGeneratedPrompt(prompt) // Fallback to original prompt
      }
      
      if (result.image) {
        setEditedImageUrl(result.image)
      } else {
        throw new Error("No image received from server")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to edit image")
    } finally {
      setIsLoading(false)
    }
  }

  // SeDream v4 Edit handlers
  const handleSedreamImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setSedreamError("Please select a valid image file")
        return
      }

      setSedreamImage(file)
      const url = URL.createObjectURL(file)
      setSedreamPreviewUrl(url)
      setSedreamResult("") // Clear previous result
      setSedreamError("")
    }
  }

  const handleSedreamBase64Process = () => {
    const trimmed = sedreamBase64Image.trim()
    if (!trimmed) {
      setSedreamError("Please paste Base64 data first")
      return
    }
    
    // Create preview
    const base64WithPrefix = trimmed.startsWith('data:') 
      ? trimmed 
      : `data:image/jpeg;base64,${trimmed}`
    
    setSedreamBase64Preview(base64WithPrefix)
    console.log('[FRONTEND] SeDream v4 Base64 processed, length:', trimmed.length)
  }

  const clearSedreamBase64 = () => {
    setSedreamBase64Image("")
    setSedreamBase64Preview("")
  }

  const handleSedreamSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!sedreamImage && !sedreamImageUrl.trim() && !sedreamBase64Image.trim()) {
      setSedreamError("Please upload an image, provide an image URL, or paste Base64 data")
      return
    }

    setIsSedreamLoading(true)
    setSedreamError("")

    try {
      // For SeDream v4, enhancement is handled by the backend
      // Send original prompt and JSON options to avoid double enhancement
      let finalPrompt = sedreamPrompt

      // Determine if we should use JSON (for Base64/URLs) or FormData (for File uploads)
      const hasBase64 = sedreamBase64Image.trim().length > 0
      const hasUrl = !sedreamImage && sedreamImageUrl.trim().length > 0
      const useJSON = hasBase64 || hasUrl
      
      console.log(`[FRONTEND] SeDream v4 Edit - Using ${useJSON ? 'JSON' : 'FormData'}`)
      console.log('[FRONTEND] Has Base64:', hasBase64, 'Has URL:', hasUrl, 'Has File:', !!sedreamImage)
      
      let response: Response
      
      if (useJSON) {
        // JSON method for Base64 or URL
        const jsonBody: any = {
          prompt: finalPrompt.trim() || '',
          useJSONEnhancement: useSedreamJSONEnhancement,
          jsonIntensity: sedreamJsonIntensity,
          customEnhancementText: sedreamCustomEnhancementText,
          aspect_ratio: sedreamAspectRatio,
          jsonOptions: {
            customText: sedreamCustomEnhancementText !== sedreamDefaultEnhancementText ? sedreamCustomEnhancementText : '',
            intensity: sedreamJsonIntensity
          }
        }
        
        // Add custom dimensions if aspect_ratio is custom
        if (sedreamAspectRatio === "custom") {
          jsonBody.custom_width = sedreamCustomWidth
          jsonBody.custom_height = sedreamCustomHeight
        }
        
        if (hasBase64) {
          jsonBody.base64Image = sedreamBase64Image.trim()
          console.log('[FRONTEND] ðŸ“¦ Using JSON with Base64, length:', sedreamBase64Image.length)
        } else if (hasUrl) {
          jsonBody.imageUrl = sedreamImageUrl.trim()
          console.log('[FRONTEND] ðŸ“¦ Using JSON with URL:', sedreamImageUrl.trim().substring(0, 50))
        }
        
        response = await fetch("/api/seedream-v4-edit", {
          method: "POST",
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(jsonBody)
        })
      } else {
        // FormData method for File uploads
        const formData = new FormData()
        
        if (sedreamImage) {
          formData.append("image", sedreamImage)
          console.log('[FRONTEND] ðŸ“Ž Using FormData with File:', sedreamImage.name)
        }
        
        if (finalPrompt.trim()) {
          formData.append("prompt", finalPrompt)
        }
        formData.append("useJSONEnhancement", useSedreamJSONEnhancement.toString())
        formData.append("jsonIntensity", sedreamJsonIntensity.toString())
        formData.append("customEnhancementText", sedreamCustomEnhancementText)
        formData.append("aspect_ratio", sedreamAspectRatio)
        
        // Add custom dimensions if aspect_ratio is custom
        if (sedreamAspectRatio === "custom") {
          formData.append("custom_width", sedreamCustomWidth.toString())
          formData.append("custom_height", sedreamCustomHeight.toString())
        }
        
        // Debug logging
        console.log("[Frontend] SeDream submission - aspect_ratio:", sedreamAspectRatio)
        
        // Add JSON enhancement options for backend processing
        const jsonOptions = {
          customText: sedreamCustomEnhancementText !== sedreamDefaultEnhancementText ? sedreamCustomEnhancementText : '',
          intensity: sedreamJsonIntensity
        }
        formData.append("jsonOptions", JSON.stringify(jsonOptions))

        response = await fetch("/api/seedream-v4-edit", {
          method: "POST",
          body: formData
        })
      }

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || `Server error: ${response.status}`)
      }
      
      if (result.images && result.images.length > 0) {
        setSedreamResult(result.images[0].url)
      } else {
        throw new Error("No images received from SeDream API")
      }
    } catch (err) {
      setSedreamError(err instanceof Error ? err.message : "Failed to process image with style transfer")
    } finally {
      setIsSedreamLoading(false)
    }
  }

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
      if (flux2ProEditCompositionRule) {
        formData.append("compositionRule", flux2ProEditCompositionRule)
      }

      console.log("[FRONTEND] Flux 2 Pro Edit - Sending request with", totalImages, "images")

      const response = await fetch("/api/external/flux-2-pro-edit-edit", {
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

  // Flux 2 Pro Edit Create Handlers
  const handleFlux2ProCreateUserImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setFlux2ProCreateUserImage(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setFlux2ProCreateUserImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
      
      // Clear URL and Base64 if file is uploaded
      setFlux2ProCreateImageUrl("")
      setFlux2ProCreateBase64Image("")
    }
  }

  const removeFlux2ProCreateUserImage = () => {
    setFlux2ProCreateUserImage(null)
    setFlux2ProCreateUserImagePreview("")
    setFlux2ProCreateImageUrl("")
    setFlux2ProCreateBase64Image("")
  }

  const handleFlux2ProCreateSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!flux2ProCreatePrompt.trim()) {
      setFlux2ProCreateError("Please enter a prompt")
      return
    }

    setIsFlux2ProCreateGenerating(true)
    setFlux2ProCreateError("")

    try {
      // Prepare JSON body (not FormData)
      const requestBody: any = {
        prompt: flux2ProCreatePrompt,
        orgType: "general",
        useCanonicalPrompt: false
      }
      
      // Add user image if provided (only one of these will be set)
      if (flux2ProCreateUserImage) {
        // Convert File to Base64
        const reader = new FileReader()
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(flux2ProCreateUserImage)
        })
        
        const base64 = await base64Promise
        requestBody.base64Image = base64
      } else if (flux2ProCreateImageUrl.trim()) {
        requestBody.imageUrl = flux2ProCreateImageUrl.trim()
      } else if (flux2ProCreateBase64Image.trim()) {
        requestBody.base64Image = flux2ProCreateBase64Image.trim()
      }
      
      // Prepare settings
      const settings: any = { ...flux2ProCreateSettings }
      
      // Handle custom dimensions
      if (settings.image_size === "custom") {
        settings.image_size = {
          width: settings.custom_width,
          height: settings.custom_height
        }
        delete settings.custom_width
        delete settings.custom_height
      } else {
        delete settings.custom_width
        delete settings.custom_height
      }
      
      // Remove empty values
      Object.keys(settings).forEach(key => {
        if (settings[key] === "") {
          delete settings[key]
        }
      })
      
      // Convert seed to number if present
      if (settings.seed) {
        settings.seed = parseInt(settings.seed as string)
        if (isNaN(settings.seed)) {
          delete settings.seed
        }
      }
      
      requestBody.settings = settings

      if (flux2ProCreateCompositionRule) {
        requestBody.compositionRule = flux2ProCreateCompositionRule
      }

      console.log("[FRONTEND] Flux 2 Pro Edit Create - Sending request")
      console.log("[FRONTEND] Has user image:", !!(flux2ProCreateUserImage || flux2ProCreateImageUrl || flux2ProCreateBase64Image))

      const response = await fetch("/api/external/flux-2-pro-edit-create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        if (response.status === 400 && errorData?.error) {
          throw new Error(errorData.error + (errorData.details ? `: ${errorData.details}` : ''))
        }
        throw new Error(`Server error (${response.status}). Please try again.`)
      }

      const result = await response.json()
      
      console.log("[FRONTEND] Flux 2 Pro Edit Create - Response:", {
        success: result.success,
        inputImages: result.inputImages,
        referenceImages: result.referenceImages,
        userImages: result.userImages
      })
      
      if (result.prompt) {
        setFlux2ProCreateGeneratedPrompt(result.prompt)
      }
      
      if (result.images && result.images[0]?.url) {
        setFlux2ProCreateResultUrl(result.images[0].url)
      } else if (result.image) {
        setFlux2ProCreateResultUrl(result.image)
      } else {
        throw new Error("No image received from server")
      }
    } catch (err) {
      setFlux2ProCreateError(err instanceof Error ? err.message : "Failed to create image")
    } finally {
      setIsFlux2ProCreateGenerating(false)
    }
  }

  // Flux 2 Pro Edit Apply Handlers
  const handleFlux2ProApplyUserImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setFlux2ProApplyUserImage(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setFlux2ProApplyUserImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
      
      // Clear URL and Base64 if file is uploaded
      setFlux2ProApplyImageUrl("")
      setFlux2ProApplyBase64Image("")
    }
  }

  const removeFlux2ProApplyUserImage = () => {
    setFlux2ProApplyUserImage(null)
    setFlux2ProApplyUserImagePreview("")
    setFlux2ProApplyImageUrl("")
    setFlux2ProApplyBase64Image("")
  }

  const handleFlux2ProApplySubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    // Validate user image is provided
    if (!flux2ProApplyUserImage && !flux2ProApplyImageUrl.trim() && !flux2ProApplyBase64Image.trim()) {
      setFlux2ProApplyError("Please provide an image to apply style to")
      return
    }

    setIsFlux2ProApplyGenerating(true)
    setFlux2ProApplyError("")

    try {
      // Prepare JSON body
      const requestBody: any = {
        sceneType: flux2ProApplySceneType
      }
      
      // Add custom prompt if provided (will be appended to scene-based prompt)
      if (flux2ProApplyPrompt.trim()) {
        requestBody.prompt = flux2ProApplyPrompt.trim()
      }
      
      // Add user image (required - only one of these will be set)
      if (flux2ProApplyUserImage) {
        // Convert File to Base64
        const reader = new FileReader()
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(flux2ProApplyUserImage)
        })
        
        const base64 = await base64Promise
        requestBody.base64Image = base64
      } else if (flux2ProApplyImageUrl.trim()) {
        requestBody.imageUrl = flux2ProApplyImageUrl.trim()
      } else if (flux2ProApplyBase64Image.trim()) {
        requestBody.base64Image = flux2ProApplyBase64Image.trim()
      }
      
      // Prepare settings
      const settings: any = { ...flux2ProApplySettings }
      
      // Handle custom dimensions
      if (settings.image_size === "custom") {
        settings.image_size = {
          width: settings.custom_width,
          height: settings.custom_height
        }
        delete settings.custom_width
        delete settings.custom_height
      } else {
        delete settings.custom_width
        delete settings.custom_height
      }
      
      // Remove empty values
      Object.keys(settings).forEach(key => {
        if (settings[key] === "") {
          delete settings[key]
        }
      })
      
      // Convert seed to number if present
      if (settings.seed) {
        settings.seed = parseInt(settings.seed as string)
        if (isNaN(settings.seed)) {
          delete settings.seed
        }
      }
      
      requestBody.settings = settings

      if (flux2ProApplyCompositionRule) {
        requestBody.compositionRule = flux2ProApplyCompositionRule
      }

      console.log("[FRONTEND] Flux 2 Pro Edit Apply - Sending request")

      const response = await fetch("/api/external/flux-2-pro-edit-apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        if (response.status === 400 && errorData?.error) {
          throw new Error(errorData.error + (errorData.details ? `: ${errorData.details}` : ''))
        }
        throw new Error(`Server error (${response.status}). Please try again.`)
      }

      const result = await response.json()
      
      console.log("[FRONTEND] Flux 2 Pro Edit Apply - Response:", {
        success: result.success,
        inputImages: result.inputImages,
        styleReferences: result.styleReferences,
        userImages: result.userImages
      })
      
      if (result.images && result.images[0]?.url) {
        setFlux2ProApplyResultUrl(result.images[0].url)
      } else if (result.image) {
        setFlux2ProApplyResultUrl(result.image)
      } else {
        throw new Error("No image received from server")
      }
    } catch (err) {
      setFlux2ProApplyError(err instanceof Error ? err.message : "Failed to apply style")
    } finally {
      setIsFlux2ProApplyGenerating(false)
    }
  }

  // Flux 2 Pro Combine Handlers
  const handleFlux2ProCombineImageUpload = (event: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = event.target.files?.[0]
    if (file) {
      const newImages = [...flux2ProCombineImages]
      newImages[index] = file
      setFlux2ProCombineImages(newImages)
      
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        const newPreviews = [...flux2ProCombineImagePreviews]
        newPreviews[index] = reader.result as string
        setFlux2ProCombineImagePreviews(newPreviews)
      }
      reader.readAsDataURL(file)
      
      // Clear URL and Base64 if file is uploaded
      const newUrls = [...flux2ProCombineImageUrls]
      newUrls[index] = ""
      setFlux2ProCombineImageUrls(newUrls)
      
      const newBase64 = [...flux2ProCombineBase64Images]
      newBase64[index] = ""
      setFlux2ProCombineBase64Images(newBase64)
    }
  }

  const removeFlux2ProCombineImage = (index: number) => {
    const newImages = [...flux2ProCombineImages]
    newImages[index] = null
    setFlux2ProCombineImages(newImages)
    
    const newPreviews = [...flux2ProCombineImagePreviews]
    newPreviews[index] = ""
    setFlux2ProCombineImagePreviews(newPreviews)
    
    const newUrls = [...flux2ProCombineImageUrls]
    newUrls[index] = ""
    setFlux2ProCombineImageUrls(newUrls)
    
    const newBase64 = [...flux2ProCombineBase64Images]
    newBase64[index] = ""
    setFlux2ProCombineBase64Images(newBase64)
  }

  const handleFlux2ProCombineSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    // Count total images provided
    let totalImages = 0
    flux2ProCombineImages.forEach(img => { if (img) totalImages++ })
    flux2ProCombineImageUrls.forEach(url => { if (url.trim()) totalImages++ })
    flux2ProCombineBase64Images.forEach(b64 => { if (b64.trim()) totalImages++ })

    if (totalImages !== 2) {
      setFlux2ProCombineError(`Please provide exactly 2 images (you have ${totalImages})`)
      return
    }

    if (!flux2ProCombinePrompt.trim()) {
      setFlux2ProCombineError("Please provide a prompt describing how to combine the images")
      return
    }

    setIsFlux2ProCombineGenerating(true)
    setFlux2ProCombineError("")

    try {
      const formData = new FormData()
      formData.append("prompt", flux2ProCombinePrompt)

      // Add image files
      flux2ProCombineImages.forEach((image, index) => {
        if (image) {
          formData.append(`image${index}`, image)
        }
      })
      
      // Add image URLs
      flux2ProCombineImageUrls.forEach((url, index) => {
        if (url.trim()) {
          formData.append(`imageUrl${index}`, url)
        }
      })
      
      // Add Base64 images
      flux2ProCombineBase64Images.forEach((b64, index) => {
        if (b64.trim()) {
          formData.append(`imageBase64${index}`, b64)
        }
      })
      
      // Prepare settings
      const settings: any = { ...flux2ProCombineSettings }
      
      // Handle custom dimensions
      if (settings.image_size === "custom") {
        settings.image_size = {
          width: settings.custom_width,
          height: settings.custom_height
        }
        delete settings.custom_width
        delete settings.custom_height
      } else {
        delete settings.custom_width
        delete settings.custom_height
      }
      
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
      if (flux2ProCombineCompositionRule) {
        formData.append("compositionRule", flux2ProCombineCompositionRule)
      }

      console.log("[FRONTEND] Flux 2 Pro Combine - Sending request with 2 images")

      const response = await fetch("/api/external/flux-2-pro-edit-combine", {
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
      
      console.log("[FRONTEND] Flux 2 Pro Combine - Response:", {
        success: result.success,
        inputImages: result.inputImages
      })
      
      if (result.images && result.images[0]?.url) {
        setFlux2ProCombineResultUrl(result.images[0].url)
        setFlux2ProCombineGeneratedPrompt(result.prompt)
      } else if (result.image) {
        setFlux2ProCombineResultUrl(result.image)
      } else {
        throw new Error("No image received from server")
      }
    } catch (err) {
      setFlux2ProCombineError(err instanceof Error ? err.message : "Failed to combine images")
    } finally {
      setIsFlux2ProCombineGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header with RAG Selector */}
        <div className="flex items-center justify-between">
          <div className="text-center space-y-2 flex-1">
            <h1 className="text-3xl font-bold">AI Image Studio</h1>
            <p className="text-muted-foreground">
              Generate, edit, and transform images
            </p>
          </div>
          
        </div>

        <Tabs defaultValue="flux-2-pro-edit-create" className="w-full max-w-6xl mx-auto">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="flux-ultra-finetuned" style={{ display: 'none' }}>Generate Images</TabsTrigger>
          <TabsTrigger value="flux-pro-image-combine" style={{ display: 'none' }}>Combine Images</TabsTrigger>
          {/* <TabsTrigger value="edit-image">Edit Image</TabsTrigger> */}
          <TabsTrigger value="sedream-v4-edit">Apply style</TabsTrigger>
          <TabsTrigger value="flux-2-pro-edit">Flux 2 Pro Edit</TabsTrigger>
          <TabsTrigger value="flux-2-pro-edit-create">Flux 2 Pro Create</TabsTrigger>
          <TabsTrigger value="flux-2-pro-edit-apply">Flux 2 Pro Apply</TabsTrigger>
          <TabsTrigger value="flux-2-pro-combine">Flux 2 Pro Combine</TabsTrigger>
          <TabsTrigger value="flux-pro-text-to-image" style={{ display: 'none' }}>Flux Lora</TabsTrigger>
        </TabsList>

          

          {/* SeDream v4 Edit Tab */}
          <TabsContent value="sedream-v4-edit" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Upload and Form Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Style Transfer
                  </CardTitle>
                  <CardDescription>Transform your image with AI-powered style transfer</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <form onSubmit={handleSedreamSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="sedream-image">Select Image</Label>
                      <Input
                        id="sedream-image"
                        type="file"
                        accept="image/*"
                        onChange={handleSedreamImageUpload}
                        className="cursor-pointer"
                      />
                    </div>

                    {/* Or use Image URL */}
                    <div className="space-y-2">
                      <Label htmlFor="sedream-image-url">Or use Image URL</Label>
                      <Input
                        id="sedream-image-url"
                        type="text"
                        placeholder="https://example.com/image.jpg"
                        value={sedreamImageUrl}
                        onChange={(e) => setSedreamImageUrl(e.target.value)}
                        disabled={!!sedreamImage || sedreamBase64Image.trim().length > 0}
                      />
                    </div>

                    {/* Or use Base64 Image */}
                    <div className="space-y-2">
                      <Label htmlFor="sedream-base64">Or use Base64 Image</Label>
                      <Textarea
                        id="sedream-base64"
                        placeholder="Paste Base64 encoded image data here (with or without data:image/jpeg;base64, prefix)"
                        value={sedreamBase64Image}
                        onChange={(e) => setSedreamBase64Image(e.target.value)}
                        rows={4}
                        className="font-mono text-xs"
                        disabled={!!sedreamImage || sedreamImageUrl.trim().length > 0}
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          onClick={handleSedreamBase64Process}
                          disabled={!sedreamBase64Image.trim() || !!sedreamImage || sedreamImageUrl.trim().length > 0}
                          size="sm"
                          variant="secondary"
                        >
                          Preview Base64
                        </Button>
                        {sedreamBase64Preview && (
                          <Button
                            type="button"
                            onClick={clearSedreamBase64}
                            size="sm"
                            variant="outline"
                          >
                            Clear
                          </Button>
                        )}
                        {sedreamBase64Image.trim() && (
                          <span className="text-xs text-muted-foreground">
                            Length: {sedreamBase64Image.trim().length.toLocaleString()} chars
                          </span>
                        )}
                      </div>
                      {sedreamBase64Preview && (
                        <div className="mt-2 border rounded p-2 bg-muted/50">
                          <img 
                            src={sedreamBase64Preview} 
                            alt="Base64 preview" 
                            className="max-w-full h-auto rounded"
                            style={{ maxHeight: '200px' }}
                          />
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="sedream-custom-enhancement" className="font-medium text-red-600">
                        Style Enhancement Description *
                      </Label>
                      <Textarea
                        id="sedream-custom-enhancement"
                        placeholder="Describe the style transformation you want (e.g., 'Transform into an oil painting with vibrant colors and impressionist brushstrokes')"
                        value={sedreamCustomEnhancementText}
                        onChange={(e) => setSedreamCustomEnhancementText(e.target.value)}
                        rows={3}
                        className="text-sm border-red-200 focus:border-red-400"
                        required
                      />
                      <p className="text-xs text-red-600">
                        * Required: This description defines how your image will be transformed.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="sedream-aspect-ratio" className="font-medium">
                        Aspect Ratio
                      </Label>
                      <Select value={sedreamAspectRatio} onValueChange={(value: "original" | "1:1" | "16:9" | "9:16" | "4:3" | "3:4" | "custom") => setSedreamAspectRatio(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="original">Original Size</SelectItem>
                          <SelectItem value="1:1">Square (1:1)</SelectItem>
                          <SelectItem value="16:9">Landscape (16:9)</SelectItem>
                          <SelectItem value="9:16">Portrait (9:16)</SelectItem>
                          <SelectItem value="4:3">Landscape (4:3)</SelectItem>
                          <SelectItem value="3:4">Portrait (3:4)</SelectItem>
                          <SelectItem value="custom">Custom Size</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {sedreamAspectRatio === "custom" && (
                      <div className="grid grid-cols-2 gap-4 p-3 border rounded-lg bg-muted/50">
                        <div className="space-y-2">
                          <Label htmlFor="sedream-width">Width (px)</Label>
                          <Input
                            id="sedream-width"
                            type="number"
                            min={512}
                            max={2048}
                            value={sedreamCustomWidth}
                            onChange={(e) => setSedreamCustomWidth(parseInt(e.target.value) || 1024)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="sedream-height">Height (px)</Label>
                          <Input
                            id="sedream-height"
                            type="number"
                            min={512}
                            max={2048}
                            value={sedreamCustomHeight}
                            onChange={(e) => setSedreamCustomHeight(parseInt(e.target.value) || 1024)}
                          />
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs text-muted-foreground">
                            Range: 512-2048 pixels. Minimum area: 921,600 pixels (e.g., 960x960).
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Safety Protections Display */}
                    <div className="space-y-3 p-4 border rounded-lg bg-gradient-to-r from-green-50/50 to-emerald-50/50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200/50 dark:border-green-700/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 rounded-full bg-green-500"></div>
                          <Label className="font-medium text-green-800 dark:text-green-200">
                            Safety Protections Active
                          </Label>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowNegativePrompts(!showNegativePrompts)}
                          className="text-green-700 hover:text-green-800 dark:text-green-300 dark:hover:text-green-200"
                        >
                          {showNegativePrompts ? (
                            <>
                              <ChevronUp className="h-4 w-4 mr-1" />
                              Hide Details
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4 mr-1" />
                              Show Details
                            </>
                          )}
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="flex items-center space-x-2">
                          <Shield className="h-4 w-4 text-red-600" />
                          <span className="text-green-700 dark:text-green-300">NSFW Protection</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Shield className="h-4 w-4 text-blue-600" />
                          <span className="text-green-700 dark:text-green-300">Age Bias Prevention</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Shield className="h-4 w-4 text-purple-600" />
                          <span className="text-green-700 dark:text-green-300">Human Integrity</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Shield className="h-4 w-4 text-orange-600" />
                          <span className="text-green-700 dark:text-green-300">Content Moderation</span>
                        </div>
                      </div>

                      <div className="text-xs text-green-600 dark:text-green-400 bg-green-100/50 dark:bg-green-900/30 p-2 rounded">
                        âœ… {sedreamNegativePrompts.length} negative terms automatically applied for safe generation
                      </div>

                      {/* Collapsible Negative Prompts List */}
                      {showNegativePrompts && (
                        <div className="mt-3 space-y-2">
                          <Label className="text-xs font-medium text-green-800 dark:text-green-200">
                            Active Negative Prompts ({sedreamNegativePrompts.length} terms):
                          </Label>
                          <div className="max-h-32 overflow-y-auto bg-white/50 dark:bg-gray-900/50 p-3 rounded border">
                            <div className="text-xs text-muted-foreground space-y-1">
                              {sedreamNegativePrompts.length > 0 ? (
                                <div className="grid grid-cols-2 gap-1">
                                  {sedreamNegativePrompts.map((term, index) => (
                                    <span key={index} className="inline-block bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-1 rounded text-xs">
                                      {term}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">Loading safety terms...</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <Button type="submit" className="w-full" disabled={(!sedreamImage && !sedreamImageUrl.trim() && !sedreamBase64Image.trim()) || !sedreamCustomEnhancementText.trim() || isSedreamLoading}>
                      {isSedreamLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing style transfer...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Transform Image
                        </>
                      )}
                    </Button>
                  </form>

                  {/* Display errors */}
                  {sedreamError && (
                    <Alert className="border-red-200 bg-red-50 text-red-800">
                      <AlertDescription>
                        {sedreamError}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Preview and Result Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Preview & Result</CardTitle>
                  <CardDescription>Original image and style transfer result</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Image Preview */}
                  {sedreamPreviewUrl && (
                    <div className="space-y-2">
                      <Label>Original Image</Label>
                      <div className="border rounded-lg p-4 bg-muted/50">
                        <img
                          src={sedreamPreviewUrl}
                          alt="Original image"
                          className="max-w-full h-auto rounded-lg shadow-sm"
                        />
                      </div>
                    </div>
                  )}

                  {/* Result Display */}
                  {sedreamResult && (
                    <div className="space-y-2">
                      <Label>Style Transfer Result</Label>
                      <div className="border rounded-lg p-4 bg-muted/50">
                        <img
                          src={sedreamResult}
                          alt="Style transfer result"
                          className="max-w-full h-auto rounded-lg shadow-sm"
                        />
                      </div>
                    </div>
                  )}

                  {/* Loading State */}
                  {isSedreamLoading && (
                    <div className="flex items-center justify-center p-8 border rounded-lg bg-muted/30">
                      <div className="text-center space-y-2">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Transforming your image with style transfer...
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Information */}
                  {!sedreamPreviewUrl && !isSedreamLoading && (
                    <div className="text-center p-8 border rounded-lg bg-muted/30">
                      <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">Style Transfer</h3>
                      <p className="text-sm text-muted-foreground">
                        Upload an image to transform it with AI-powered style transfer. 
                        A reference style will be applied automatically to create stunning visual transformations.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Flux 2 Pro Edit Tab */}
          <TabsContent value="flux-2-pro-edit" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Upload and Form Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Edit className="h-5 w-5" />
                    Flux 2 Pro Edit
                  </CardTitle>
                  <CardDescription>
                    Professional image editing with AI
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
                        placeholder="Describe the edit (e.g., 'Change the jacket to red while keeping the original lighting')"
                        value={flux2ProPrompt}
                        onChange={(e) => setFlux2ProPrompt(e.target.value)}
                        rows={3}
                        className="text-sm"
                        required
                      />
                    </div>

                    {/* Single Image Upload */}
                    <div className="space-y-3">
                      <Label>Image to Edit *</Label>
                      
                      {flux2ProImagePreviews[0] ? (
                        <div className="relative border rounded-lg p-2 bg-muted/50">
                          <img
                            src={flux2ProImagePreviews[0]}
                            alt="Preview"
                            className="w-full h-48 object-cover rounded"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            className="absolute top-3 right-3 h-8 w-8 p-0"
                            onClick={() => removeFlux2ProImage(0)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Input
                            id="flux2pro-image-0"
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFlux2ProImageUpload(e, 0)}
                            className="cursor-pointer"
                          />
                          <Input
                            placeholder="Or paste image URL"
                            value={flux2ProImageUrls[0]}
                            onChange={(e) => {
                              const newUrls = [...flux2ProImageUrls]
                              newUrls[0] = e.target.value
                              setFlux2ProImageUrls(newUrls)
                            }}
                          />
                        </div>
                      )}
                      
                      <p className="text-xs text-muted-foreground">
                        Upload a file or paste an image URL (max 4 MP)
                      </p>
                    </div>

                    {/* Composition Rule */}
                    <div className="space-y-2">
                      <Label htmlFor="flux2pro-edit-composition-rule">Composition Rule (Optional)</Label>
                      <Select
                        value={flux2ProEditCompositionRule || "none"}
                        onValueChange={(value) => setFlux2ProEditCompositionRule(value === "none" ? "" : value)}
                      >
                        <SelectTrigger id="flux2pro-edit-composition-rule">
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {COMPOSITION_RULES.map((rule) => (
                            <SelectItem key={rule.value} value={rule.value}>{rule.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">Adds a composition directive to the prompt</p>
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
                      <li>- Up to 9 reference images (9 MP total)</li>
                      <li>- Image referencing: @image1, @image2 in prompts</li>
                      <li>- Natural language precision without masks</li>
                      <li>- Sequential editing capability</li>
                    </ul>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Advanced Controls</h4>
                    <ul className="space-y-1 text-muted-foreground text-xs">
                      <li>- Safety tolerance: 1 (strict) to 5 (permissive)</li>
                      <li>- Output format: JPEG or PNG</li>
                      <li>- Seed support for reproducibility</li>
                      <li>- Custom dimensions: 512-2048px</li>
                    </ul>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Production Ready</h4>
                    <ul className="space-y-1 text-muted-foreground text-xs">
                      <li>- Zero-configuration approach</li>
                      <li>- Consistent quality without tuning</li>
                      <li>- Optimized for speed and reliability</li>
                      <li>- Built-in safety protections</li>
                    </ul>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Use Cases</h4>
                    <ul className="space-y-1 text-muted-foreground text-xs">
                      <li>- Product photography editing</li>
                      <li>- Background replacement</li>
                      <li>- Multi-style composition</li>
                      <li>- Context-aware transformations</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Flux 2 Pro Edit Create Tab */}
          <TabsContent value="flux-2-pro-edit-create" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Upload and Form Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Flux 2 Pro Create with TectonicaAI References
                  </CardTitle>
                  <CardDescription>
                    Generate images using 8 pre-loaded TectonicaAI reference images + optional user image
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <form onSubmit={handleFlux2ProCreateSubmit} className="space-y-4">
                    {/* Prompt */}
                    <div className="space-y-2">
                      <Label htmlFor="flux2pro-create-prompt">
                        Creation Description *
                      </Label>
                      <Textarea
                        id="flux2pro-create-prompt"
                        placeholder="Describe what you want to create (e.g., 'Create a modern tech hero using styles from @image1 and @image3' or 'Combine my logo with TectonicaAI references')"
                        value={flux2ProCreatePrompt}
                        onChange={(e) => setFlux2ProCreatePrompt(e.target.value)}
                        rows={3}
                        className="text-sm"
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        8 TectonicaAI references are auto-loaded. Use @image1-@image8 to reference them.
                      </p>
                    </div>

                    {/* Reference Images Info */}
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <div className="flex items-start gap-2">
                        <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-blue-900 dark:text-blue-100">
                            8 Pre-loaded Reference Images
                          </p>
                          <p className="text-xs text-blue-700 dark:text-blue-300">
                            TectonicaAI images (indices 0-7) are automatically included in every generation.
                            Reference them using @image1, @image2, etc. in your prompt.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Optional User Image Upload */}
                    <div className="space-y-3">
                      <Label>Your Image (Optional - will be index 8)</Label>
                      
                      {flux2ProCreateUserImagePreview ? (
                        <div className="relative border rounded-lg p-3 bg-muted/50">
                          <img
                            src={flux2ProCreateUserImagePreview}
                            alt="User image preview"
                            className="w-full h-40 object-cover rounded"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            className="absolute top-1 right-1"
                            onClick={removeFlux2ProCreateUserImage}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Remove
                          </Button>
                          <p className="text-xs text-muted-foreground mt-2">
                            This will be @image9 in your prompt (indices 0-7 are TectonicaAI references)
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={handleFlux2ProCreateUserImageUpload}
                            className="cursor-pointer text-sm"
                          />
                          <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                              <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                              <span className="bg-background px-2 text-muted-foreground">
                                Or
                              </span>
                            </div>
                          </div>
                          <Input
                            placeholder="Paste image URL"
                            value={flux2ProCreateImageUrl}
                            onChange={(e) => {
                              setFlux2ProCreateImageUrl(e.target.value)
                              setFlux2ProCreateUserImage(null)
                              setFlux2ProCreateBase64Image("")
                            }}
                            className="text-sm"
                          />
                          <p className="text-xs text-muted-foreground">
                            Optional: Add 1 more image (total 9). Leave empty to use only TectonicaAI references.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Composition Rule */}
                    <div className="space-y-2">
                      <Label htmlFor="flux2pro-create-composition-rule">Composition Rule (Optional)</Label>
                      <Select
                        value={flux2ProCreateCompositionRule || "none"}
                        onValueChange={(value) => setFlux2ProCreateCompositionRule(value === "none" ? "" : value)}
                      >
                        <SelectTrigger id="flux2pro-create-composition-rule">
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {COMPOSITION_RULES.map((rule) => (
                            <SelectItem key={rule.value} value={rule.value}>{rule.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">Adds a composition directive to the prompt</p>
                    </div>

                    {/* Image Size */}
                    <div className="space-y-2">
                      <Label htmlFor="flux2pro-create-image-size">Image Size</Label>
                      <Select
                        value={flux2ProCreateSettings.image_size}
                        onValueChange={(value) => setFlux2ProCreateSettings({ ...flux2ProCreateSettings, image_size: value })}
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
                    {flux2ProCreateSettings.image_size === "custom" && (
                      <div className="grid grid-cols-2 gap-4 p-3 border rounded-lg bg-muted/50">
                        <div className="space-y-2">
                          <Label htmlFor="flux2pro-create-width">Width (px)</Label>
                          <Input
                            id="flux2pro-create-width"
                            type="number"
                            min={512}
                            max={2048}
                            value={flux2ProCreateSettings.custom_width}
                            onChange={(e) => setFlux2ProCreateSettings({
                              ...flux2ProCreateSettings,
                              custom_width: parseInt(e.target.value) || 1024
                            })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="flux2pro-create-height">Height (px)</Label>
                          <Input
                            id="flux2pro-create-height"
                            type="number"
                            min={512}
                            max={2048}
                            value={flux2ProCreateSettings.custom_height}
                            onChange={(e) => setFlux2ProCreateSettings({
                              ...flux2ProCreateSettings,
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
                        onClick={() => setShowFlux2ProCreateAdvanced(!showFlux2ProCreateAdvanced)}
                      >
                        {showFlux2ProCreateAdvanced ? (
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
                    {showFlux2ProCreateAdvanced && (
                      <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                        {/* Safety Tolerance */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="flux2pro-create-safety">Safety Tolerance</Label>
                            <span className="text-sm text-muted-foreground">
                              {flux2ProCreateSettings.safety_tolerance}
                            </span>
                          </div>
                          <Slider
                            id="flux2pro-create-safety"
                            min={1}
                            max={5}
                            step={1}
                            value={[parseInt(flux2ProCreateSettings.safety_tolerance)]}
                            onValueChange={(value) => setFlux2ProCreateSettings({
                              ...flux2ProCreateSettings,
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
                          <Label htmlFor="flux2pro-create-safety-checker">Enable Safety Checker</Label>
                          <Switch
                            id="flux2pro-create-safety-checker"
                            checked={flux2ProCreateSettings.enable_safety_checker}
                            onCheckedChange={(checked) => setFlux2ProCreateSettings({
                              ...flux2ProCreateSettings,
                              enable_safety_checker: checked
                            })}
                          />
                        </div>

                        {/* Output Format */}
                        <div className="space-y-2">
                          <Label htmlFor="flux2pro-create-format">Output Format</Label>
                          <Select
                            value={flux2ProCreateSettings.output_format}
                            onValueChange={(value) => setFlux2ProCreateSettings({
                              ...flux2ProCreateSettings,
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
                          <Label htmlFor="flux2pro-create-seed">
                            Seed (Optional)
                          </Label>
                          <Input
                            id="flux2pro-create-seed"
                            type="number"
                            placeholder="Random"
                            value={flux2ProCreateSettings.seed}
                            onChange={(e) => setFlux2ProCreateSettings({
                              ...flux2ProCreateSettings,
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
                    {flux2ProCreateError && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{flux2ProCreateError}</AlertDescription>
                      </Alert>
                    )}

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isFlux2ProCreateGenerating}
                    >
                      {isFlux2ProCreateGenerating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating Image...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Create Image
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
                  <CardDescription>Your created image will appear here</CardDescription>
                </CardHeader>
                <CardContent>
                  {flux2ProCreateResultUrl ? (
                    <div className="space-y-4">
                      <div className="relative border rounded-lg overflow-hidden bg-muted/50">
                        <img
                          src={flux2ProCreateResultUrl}
                          alt="Created result"
                          className="w-full h-auto"
                        />
                      </div>
                      
                      {flux2ProCreateGeneratedPrompt && (
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <p className="text-xs font-medium mb-1">Prompt Used:</p>
                          <p className="text-xs text-muted-foreground">
                            {flux2ProCreateGeneratedPrompt}
                          </p>
                        </div>
                      )}
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            const link = document.createElement('a')
                            link.href = flux2ProCreateResultUrl
                            link.download = `flux-2-pro-create-${Date.now()}.jpg`
                            link.click()
                          }}
                          className="flex-1"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setFlux2ProCreateResultUrl("")
                            setFlux2ProCreateGeneratedPrompt("")
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
                      <p className="text-sm">No image created yet</p>
                      <p className="text-xs mt-1">8 TectonicaAI references + optional user image</p>
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
                  Flux 2 Pro Create Features
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <h4 className="font-medium">Pre-loaded References</h4>
                    <ul className="space-y-1 text-muted-foreground text-xs">
                      <li>- 8 TectonicaAI images automatically included</li>
                      <li>- Reference with @image1 through @image8</li>
                      <li>- Optional 9th image from user (@image9)</li>
                      <li>- Total: 8-9 reference images</li>
                    </ul>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Advanced Controls</h4>
                    <ul className="space-y-1 text-muted-foreground text-xs">
                      <li>- Safety tolerance: 1 (strict) to 5 (permissive)</li>
                      <li>- Output format: JPEG or PNG</li>
                      <li>- Seed support for reproducibility</li>
                      <li>- Custom dimensions: 512-2048px</li>
                    </ul>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Use Cases</h4>
                    <ul className="space-y-1 text-muted-foreground text-xs">
                      <li>- Brand-consistent image generation</li>
                      <li>- Style transfer from references</li>
                      <li>- Multi-reference composition</li>
                      <li>- Logo integration with brand styles</li>
                    </ul>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">TectonicaAI References</h4>
                    <ul className="space-y-1 text-muted-foreground text-xs">
                      <li>- 8 curated TectonicaAI design images</li>
                      <li>- Optimized for brand consistency</li>
                      <li>- Professional quality outputs</li>
                      <li>- Zero configuration required</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Flux 2 Pro Edit Apply Tab */}
          <TabsContent value="flux-2-pro-edit-apply" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Upload and Form Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Apply TectonicaAI Style
                  </CardTitle>
                  <CardDescription>Scene-based style transfer with optimized reference images (people, landscape, urban, monument)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <form onSubmit={handleFlux2ProApplySubmit} className="space-y-4">
                    {/* Scene Type Selector */}
                    <div className="space-y-2">
                      <Label htmlFor="flux-2-pro-apply-scene-type">Scene Type</Label>
                      <Select
                        value={flux2ProApplySceneType}
                        onValueChange={(value: 'people' | 'landscape' | 'urban' | 'monument') =>
                          setFlux2ProApplySceneType(value)
                        }
                        disabled={isFlux2ProApplyGenerating}
                      >
                        <SelectTrigger id="flux-2-pro-apply-scene-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="people">People (Portraits)</SelectItem>
                          <SelectItem value="landscape">Landscape (Nature)</SelectItem>
                          <SelectItem value="urban">Urban (Cityscape)</SelectItem>
                          <SelectItem value="monument">Monument (Architecture)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {flux2ProApplySceneType === 'people' && 'Optimized for portraits and images with people'}
                        {flux2ProApplySceneType === 'landscape' && 'Optimized for natural landscapes and outdoor scenes'}
                        {flux2ProApplySceneType === 'urban' && 'Optimized for cityscapes and urban environments'}
                        {flux2ProApplySceneType === 'monument' && 'Optimized for monuments, statues, and architectural landmarks'}
                      </p>
                    </div>

                    {/* User Image Upload (REQUIRED) */}
                    <div className="space-y-2">
                      <Label htmlFor="flux-2-pro-apply-user-image" className="flex items-center gap-2">
                        <Upload className="h-4 w-4" />
                        Your Image (Required)
                      </Label>
                      <Input
                        id="flux-2-pro-apply-user-image"
                        type="file"
                        accept="image/*"
                        onChange={handleFlux2ProApplyUserImageUpload}
                        className="cursor-pointer"
                        disabled={isFlux2ProApplyGenerating}
                      />
                      {flux2ProApplyUserImagePreview && (
                        <div className="relative mt-2">
                          <img
                            src={flux2ProApplyUserImagePreview}
                            alt="User image preview"
                            className="w-full h-32 object-cover rounded-lg border"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6"
                            onClick={removeFlux2ProApplyUserImage}
                            disabled={isFlux2ProApplyGenerating}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        This image will receive the TectonicaAI style (@image5)
                      </p>
                    </div>

                    {/* Custom Prompt (Optional) */}
                    <div className="space-y-2">
                      <Label htmlFor="flux-2-pro-apply-prompt" className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Custom Prompt (Optional)
                      </Label>
                      <Textarea
                        id="flux-2-pro-apply-prompt"
                        placeholder="Add custom instructions (will be appended to scene-based prompt)..."
                        value={flux2ProApplyPrompt}
                        onChange={(e) => setFlux2ProApplyPrompt(e.target.value)}
                        className="min-h-[80px]"
                        disabled={isFlux2ProApplyGenerating}
                      />
                      <p className="text-xs text-muted-foreground">
                        Scene-based prompt is mandatory. Your custom text will be added at the end.
                      </p>
                    </div>

                    {/* Composition Rule */}
                    <div className="space-y-2">
                      <Label htmlFor="flux-2-pro-apply-composition-rule">Composition Rule (Optional)</Label>
                      <Select
                        value={flux2ProApplyCompositionRule || "none"}
                        onValueChange={(value) => setFlux2ProApplyCompositionRule(value === "none" ? "" : value)}
                        disabled={isFlux2ProApplyGenerating}
                      >
                        <SelectTrigger id="flux-2-pro-apply-composition-rule">
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {COMPOSITION_RULES.map((rule) => (
                            <SelectItem key={rule.value} value={rule.value}>{rule.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">Adds a composition directive to the prompt</p>
                    </div>

                    {/* Image Size */}
                    <div className="space-y-2">
                      <Label htmlFor="flux-2-pro-apply-image-size">Image Size</Label>
                      <Select
                        value={flux2ProApplySettings.image_size}
                        onValueChange={(value) =>
                          setFlux2ProApplySettings({ ...flux2ProApplySettings, image_size: value })
                        }
                        disabled={isFlux2ProApplyGenerating}
                      >
                        <SelectTrigger id="flux-2-pro-apply-image-size">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">Auto</SelectItem>
                          <SelectItem value="square_hd">Square HD (1024Ã—1024)</SelectItem>
                          <SelectItem value="square">Square (512Ã—512)</SelectItem>
                          <SelectItem value="portrait_4_3">Portrait 4:3</SelectItem>
                          <SelectItem value="portrait_16_9">Portrait 16:9</SelectItem>
                          <SelectItem value="landscape_4_3">Landscape 4:3</SelectItem>
                          <SelectItem value="landscape_16_9">Landscape 16:9</SelectItem>
                          <SelectItem value="custom">Custom Dimensions</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Custom Dimensions */}
                    {flux2ProApplySettings.image_size === "custom" && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="flux-2-pro-apply-custom-width">Width (px)</Label>
                          <Input
                            id="flux-2-pro-apply-custom-width"
                            type="number"
                            min={512}
                            max={2048}
                            value={flux2ProApplySettings.custom_width}
                            onChange={(e) =>
                              setFlux2ProApplySettings({
                                ...flux2ProApplySettings,
                                custom_width: parseInt(e.target.value) || 1024
                              })
                            }
                            disabled={isFlux2ProApplyGenerating}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="flux-2-pro-apply-custom-height">Height (px)</Label>
                          <Input
                            id="flux-2-pro-apply-custom-height"
                            type="number"
                            min={512}
                            max={2048}
                            value={flux2ProApplySettings.custom_height}
                            onChange={(e) =>
                              setFlux2ProApplySettings({
                                ...flux2ProApplySettings,
                                custom_height: parseInt(e.target.value) || 1024
                              })
                            }
                            disabled={isFlux2ProApplyGenerating}
                          />
                        </div>
                      </div>
                    )}

                    {/* Advanced Settings Toggle */}
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => setShowFlux2ProApplyAdvanced(!showFlux2ProApplyAdvanced)}
                      disabled={isFlux2ProApplyGenerating}
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      {showFlux2ProApplyAdvanced ? "Hide" : "Show"} Advanced Settings
                      {showFlux2ProApplyAdvanced ? (
                        <ChevronUp className="ml-2 h-4 w-4" />
                      ) : (
                        <ChevronDown className="ml-2 h-4 w-4" />
                      )}
                    </Button>

                    {/* Advanced Settings */}
                    {showFlux2ProApplyAdvanced && (
                      <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                        <div className="space-y-2">
                          <Label htmlFor="flux-2-pro-apply-safety-tolerance">
                            Safety Tolerance: {flux2ProApplySettings.safety_tolerance}
                          </Label>
                          <Select
                            value={flux2ProApplySettings.safety_tolerance}
                            onValueChange={(value) =>
                              setFlux2ProApplySettings({ ...flux2ProApplySettings, safety_tolerance: value })
                            }
                            disabled={isFlux2ProApplyGenerating}
                          >
                            <SelectTrigger id="flux-2-pro-apply-safety-tolerance">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">1 - Strict</SelectItem>
                              <SelectItem value="2">2 - Default</SelectItem>
                              <SelectItem value="3">3 - Moderate</SelectItem>
                              <SelectItem value="4">4 - Relaxed</SelectItem>
                              <SelectItem value="5">5 - Permissive</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="flux-2-pro-apply-output-format">Output Format</Label>
                          <Select
                            value={flux2ProApplySettings.output_format}
                            onValueChange={(value: "jpeg" | "png") =>
                              setFlux2ProApplySettings({ ...flux2ProApplySettings, output_format: value })
                            }
                            disabled={isFlux2ProApplyGenerating}
                          >
                            <SelectTrigger id="flux-2-pro-apply-output-format">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="jpeg">JPEG</SelectItem>
                              <SelectItem value="png">PNG</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor="flux-2-pro-apply-safety-checker">Enable Safety Checker</Label>
                          <Switch
                            id="flux-2-pro-apply-safety-checker"
                            checked={flux2ProApplySettings.enable_safety_checker}
                            onCheckedChange={(checked) =>
                              setFlux2ProApplySettings({ ...flux2ProApplySettings, enable_safety_checker: checked })
                            }
                            disabled={isFlux2ProApplyGenerating}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="flux-2-pro-apply-seed">Seed (optional)</Label>
                          <Input
                            id="flux-2-pro-apply-seed"
                            type="number"
                            placeholder="Leave empty for random"
                            value={flux2ProApplySettings.seed}
                            onChange={(e) =>
                              setFlux2ProApplySettings({ ...flux2ProApplySettings, seed: e.target.value })
                            }
                            disabled={isFlux2ProApplyGenerating}
                          />
                        </div>
                      </div>
                    )}

                    {/* Error Display */}
                    {flux2ProApplyError && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{flux2ProApplyError}</AlertDescription>
                      </Alert>
                    )}

                    {/* Submit Button */}
                    <Button type="submit" className="w-full" disabled={isFlux2ProApplyGenerating}>
                      {isFlux2ProApplyGenerating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Applying Style...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Apply TectonicaAI Style
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
                  <CardDescription>Your styled image will appear here</CardDescription>
                </CardHeader>
                <CardContent>
                  {flux2ProApplyResultUrl ? (
                    <div className="space-y-4">
                      <div className="relative border rounded-lg overflow-hidden bg-muted/50">
                        <img
                          src={flux2ProApplyResultUrl}
                          alt="Styled result"
                          className="w-full h-auto"
                        />
                      </div>
                      
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs font-medium mb-1">Prompt Used:</p>
                        <p className="text-xs text-muted-foreground">
                          {flux2ProApplyPrompt}
                        </p>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            const link = document.createElement('a')
                            link.href = flux2ProApplyResultUrl
                            link.download = `flux-2-pro-apply-${Date.now()}.jpg`
                            link.click()
                          }}
                          className="flex-1"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setFlux2ProApplyResultUrl("")
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
                      <p className="text-sm">No image styled yet</p>
                      <p className="text-xs mt-1">4 style references + your image</p>
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
                  Flux 2 Pro Apply Features
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <h4 className="font-medium">Editable Style Transfer</h4>
                    <ul className="space-y-1 text-muted-foreground text-xs">
                      <li>- 4 TectonicaAI style references pre-loaded</li>
                      <li>- Automatic style application to your image</li>
                      <li>- Default prompt with full customization</li>
                      <li>- Use @image1-@image5 in your prompts</li>
                    </ul>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Simple Workflow</h4>
                    <ul className="space-y-1 text-muted-foreground text-xs">
                      <li>- Upload your image</li>
                      <li>- Customize prompt (or use default)</li>
                      <li>- Choose output size</li>
                      <li>- Download styled result</li>
                    </ul>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Reference Images</h4>
                    <ul className="space-y-1 text-muted-foreground text-xs">
                      <li>- @image1: </li>
                      <li>- @image2: Your uploaded image</li>
                    </ul>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Output Controls</h4>
                    <ul className="space-y-1 text-muted-foreground text-xs">
                      <li>- Safety tolerance: 1-5</li>
                      <li>- Format: JPEG or PNG</li>
                      <li>- Custom or preset dimensions</li>
                      <li>- Reproducible with seed</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Flux 2 Pro Combine Tab */}
          <TabsContent value="flux-2-pro-combine" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Upload and Form Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Edit className="h-5 w-5" />
                    Flux 2 Pro Combine
                  </CardTitle>
                  <CardDescription>
                    Combine 2 images with AI
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <form onSubmit={handleFlux2ProCombineSubmit} className="space-y-4">
                    {/* Prompt */}
                    <div className="space-y-2">
                      <Label htmlFor="flux2pro-combine-prompt">
                        Combination Description *
                      </Label>
                      <Textarea
                        id="flux2pro-combine-prompt"
                        placeholder="Describe how to combine the images (e.g., 'Merge @image1 and @image2 into a single cohesive scene')"
                        value={flux2ProCombinePrompt}
                        onChange={(e) => setFlux2ProCombinePrompt(e.target.value)}
                        rows={3}
                        className="text-sm"
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Use @image1 and @image2 to reference the images
                      </p>
                    </div>

                    {/* Two Image Upload Fields */}
                    <div className="space-y-3">
                      <Label>Images to Combine (2 required) *</Label>
                      
                      {[0, 1].map((index) => (
                        <div key={index} className="space-y-2 p-3 border rounded-lg">
                          <Label className="text-sm font-medium">Image {index + 1}</Label>
                          
                          {flux2ProCombineImagePreviews[index] ? (
                            <div className="relative border rounded-lg p-2 bg-muted/50">
                              <img
                                src={flux2ProCombineImagePreviews[index]}
                                alt={`Preview ${index + 1}`}
                                className="w-full h-32 object-cover rounded"
                              />
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                className="absolute top-3 right-3 h-8 w-8 p-0"
                                onClick={() => removeFlux2ProCombineImage(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <Input
                                id={`flux2pro-combine-image-${index}`}
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleFlux2ProCombineImageUpload(e, index)}
                                className="cursor-pointer text-xs"
                              />
                              <Input
                                placeholder="Or paste image URL"
                                value={flux2ProCombineImageUrls[index]}
                                onChange={(e) => {
                                  const newUrls = [...flux2ProCombineImageUrls]
                                  newUrls[index] = e.target.value
                                  setFlux2ProCombineImageUrls(newUrls)
                                }}
                                className="text-xs"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                      
                      <p className="text-xs text-muted-foreground">
                        First image: max 4 MP, Second image: max 1 MP
                      </p>
                    </div>

                    {/* Composition Rule */}
                    <div className="space-y-2">
                      <Label htmlFor="flux2pro-combine-composition-rule">Composition Rule (Optional)</Label>
                      <Select
                        value={flux2ProCombineCompositionRule || "none"}
                        onValueChange={(value) => setFlux2ProCombineCompositionRule(value === "none" ? "" : value)}
                      >
                        <SelectTrigger id="flux2pro-combine-composition-rule">
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {COMPOSITION_RULES.map((rule) => (
                            <SelectItem key={rule.value} value={rule.value}>{rule.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">Adds a composition directive to the prompt</p>
                    </div>

                    {/* Image Size */}
                    <div className="space-y-2">
                      <Label htmlFor="flux2pro-combine-image-size">Image Size</Label>
                      <Select
                        value={flux2ProCombineSettings.image_size}
                        onValueChange={(value) => setFlux2ProCombineSettings({ ...flux2ProCombineSettings, image_size: value })}
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
                    {flux2ProCombineSettings.image_size === "custom" && (
                      <div className="grid grid-cols-2 gap-4 p-3 border rounded-lg bg-muted/50">
                        <div className="space-y-2">
                          <Label htmlFor="flux2pro-combine-width">Width (px)</Label>
                          <Input
                            id="flux2pro-combine-width"
                            type="number"
                            min={512}
                            max={2048}
                            value={flux2ProCombineSettings.custom_width}
                            onChange={(e) => setFlux2ProCombineSettings({
                              ...flux2ProCombineSettings,
                              custom_width: parseInt(e.target.value) || 1024
                            })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="flux2pro-combine-height">Height (px)</Label>
                          <Input
                            id="flux2pro-combine-height"
                            type="number"
                            min={512}
                            max={2048}
                            value={flux2ProCombineSettings.custom_height}
                            onChange={(e) => setFlux2ProCombineSettings({
                              ...flux2ProCombineSettings,
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
                        onClick={() => setShowFlux2ProCombineAdvanced(!showFlux2ProCombineAdvanced)}
                      >
                        {showFlux2ProCombineAdvanced ? (
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
                    {showFlux2ProCombineAdvanced && (
                      <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                        {/* Safety Tolerance */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="flux2pro-combine-safety">Safety Tolerance</Label>
                            <span className="text-sm text-muted-foreground">
                              {flux2ProCombineSettings.safety_tolerance}
                            </span>
                          </div>
                          <Slider
                            id="flux2pro-combine-safety"
                            min={1}
                            max={5}
                            step={1}
                            value={[parseInt(flux2ProCombineSettings.safety_tolerance)]}
                            onValueChange={(value) => setFlux2ProCombineSettings({
                              ...flux2ProCombineSettings,
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
                          <Label htmlFor="flux2pro-combine-safety-checker">Enable Safety Checker</Label>
                          <Switch
                            id="flux2pro-combine-safety-checker"
                            checked={flux2ProCombineSettings.enable_safety_checker}
                            onCheckedChange={(checked) => setFlux2ProCombineSettings({
                              ...flux2ProCombineSettings,
                              enable_safety_checker: checked
                            })}
                          />
                        </div>

                        {/* Output Format */}
                        <div className="space-y-2">
                          <Label htmlFor="flux2pro-combine-format">Output Format</Label>
                          <Select
                            value={flux2ProCombineSettings.output_format}
                            onValueChange={(value) => setFlux2ProCombineSettings({
                              ...flux2ProCombineSettings,
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
                          <Label htmlFor="flux2pro-combine-seed">
                            Seed (Optional)
                          </Label>
                          <Input
                            id="flux2pro-combine-seed"
                            type="number"
                            placeholder="Random"
                            value={flux2ProCombineSettings.seed}
                            onChange={(e) => setFlux2ProCombineSettings({
                              ...flux2ProCombineSettings,
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
                    {flux2ProCombineError && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{flux2ProCombineError}</AlertDescription>
                      </Alert>
                    )}

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isFlux2ProCombineGenerating}
                    >
                      {isFlux2ProCombineGenerating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Combining Images...
                        </>
                      ) : (
                        <>
                          <Edit className="mr-2 h-4 w-4" />
                          Combine Images
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
                  <CardDescription>Your combined image will appear here</CardDescription>
                </CardHeader>
                <CardContent>
                  {flux2ProCombineResultUrl ? (
                    <div className="space-y-4">
                      <div className="relative border rounded-lg overflow-hidden bg-muted/50">
                        <img
                          src={flux2ProCombineResultUrl}
                          alt="Combined result"
                          className="w-full h-auto"
                        />
                      </div>
                      
                      {flux2ProCombineGeneratedPrompt && (
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <p className="text-xs font-medium mb-1">Prompt Used:</p>
                          <p className="text-xs text-muted-foreground">
                            {flux2ProCombineGeneratedPrompt}
                          </p>
                        </div>
                      )}
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            const link = document.createElement('a')
                            link.href = flux2ProCombineResultUrl
                            link.download = `flux-2-pro-combine-${Date.now()}.jpg`
                            link.click()
                          }}
                          className="flex-1"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setFlux2ProCombineResultUrl("")
                            setFlux2ProCombineGeneratedPrompt("")
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
                      <p className="text-sm">No combined image yet</p>
                      <p className="text-xs mt-1">Upload 2 images to combine</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Info Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Edit className="h-5 w-5" />
                  Flux 2 Pro Combine Features
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <h4 className="font-medium">Dual Image Combining</h4>
                    <ul className="space-y-1 text-muted-foreground text-xs">
                      <li>- Exactly 2 images required</li>
                      <li>- First image: max 4 MP (2048x2048)</li>
                      <li>- Second image: max 1 MP (1024x1024)</li>
                      <li>- Use @image1 and @image2 in prompts</li>
                    </ul>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Input Options</h4>
                    <ul className="space-y-1 text-muted-foreground text-xs">
                      <li>- Upload local files</li>
                      <li>- Paste image URLs</li>
                      <li>- Multiple format support</li>
                      <li>- Automatic resizing</li>
                    </ul>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Size Presets</h4>
                    <ul className="space-y-1 text-muted-foreground text-xs">
                      <li>- Auto (recommended)</li>
                      <li>- Square HD, Square</li>
                      <li>- Portrait 4:3, 16:9</li>
                      <li>- Landscape 4:3, 16:9</li>
                      <li>- Custom dimensions (512-2048px)</li>
                    </ul>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Advanced Controls</h4>
                    <ul className="space-y-1 text-muted-foreground text-xs">
                      <li>- Safety tolerance: 1-5</li>
                      <li>- Format: JPEG or PNG</li>
                      <li>- Safety checker toggle</li>
                      <li>- Reproducible with seed</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Flux Pro Text-to-Image Tab */}
          <TabsContent value="flux-pro-text-to-image" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Flux LoRA Generation Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Text-to-Image
                  </CardTitle>
                  <CardDescription>
                    Generate high-quality images based a LoRA training
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <form onSubmit={handleFluxProSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="flux-pro-prompt">Image Description</Label>
                      <Textarea
                        id="flux-pro-prompt"
                        placeholder="Describe the image you want to generate. You can start with 'Create a poster of...' for example."
                        value={fluxProPrompt}
                        onChange={(e) => setFluxProPrompt(e.target.value)}
                        required
                        rows={3}
                        disabled={isFluxProGenerating}
                      />
                    </div>

                    
                    {/* Advanced Settings Toggle */}
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="show-flux-pro-advanced"
                        checked={showFluxProAdvanced}
                        onCheckedChange={(checked) => setShowFluxProAdvanced(checked === true)}
                      />
                      <Label htmlFor="show-flux-pro-advanced" className="text-sm">Show Advanced Settings</Label>
                    </div>

                    {showFluxProAdvanced && (
                      <Card className="p-4 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="flux-pro-image-size">Image Size</Label>
                            <Select
                              value={fluxProSettings.image_size}
                              onValueChange={(value) => setFluxProSettings(prev => ({ ...prev, image_size: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="square_hd">Square HD (1024x1024)</SelectItem>
                                <SelectItem value="square">Square (512x512)</SelectItem>
                                <SelectItem value="portrait_4_3">Portrait 4:3 (768x1024)</SelectItem>
                                <SelectItem value="portrait_16_9">Portrait 16:9 (576x1024)</SelectItem>
                                <SelectItem value="landscape_4_3">Landscape 4:3 (1024x768)</SelectItem>
                                <SelectItem value="landscape_16_9">Landscape 16:9 (1024x576)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="flux-pro-inference-steps">Inference Steps</Label>
                            <Input
                              id="flux-pro-inference-steps"
                              type="number"
                              min="1"
                              max="50"
                              value={fluxProSettings.num_inference_steps}
                              onChange={(e) => setFluxProSettings(prev => ({ ...prev, num_inference_steps: parseInt(e.target.value) || 28 }))}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="flux-pro-guidance-scale">Guidance Scale</Label>
                            <Input
                              id="flux-pro-guidance-scale"
                              type="number"
                              min="1"
                              max="20"
                              step="0.1"
                              value={fluxProSettings.guidance_scale}
                              onChange={(e) => setFluxProSettings(prev => ({ ...prev, guidance_scale: parseFloat(e.target.value) || 3.5 }))}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="flux-pro-seed">Seed (Optional)</Label>
                            <Input
                              id="flux-pro-seed"
                              type="number"
                              placeholder="Random seed"
                              value={fluxProSettings.seed}
                              onChange={(e) => setFluxProSettings(prev => ({ ...prev, seed: e.target.value }))}
                            />
                          </div>
                        </div>

                        {/* Prompt Enhancement Info */}
                        <div className="p-4 border rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
                          <div className="flex items-center space-x-3">
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            <div className="flex-1">
                              <Label className="font-medium text-green-700 dark:text-green-300">
                                ðŸš€ Enhanced RAG + LoRA Strategy
                              </Label>
                              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                Your prompts get enhanced with brand guidelines + Flux LoRA optimization (36% cost reduction)
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Custom Size */}
                        {fluxProSettings.image_size === "custom" && (
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="flux-pro-width">Width</Label>
                              <Input
                                id="flux-pro-width"
                                type="number"
                                min="256"
                                max="2048"
                                value={fluxProSettings.width}
                                onChange={(e) => setFluxProSettings(prev => ({ ...prev, width: e.target.value }))}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="flux-pro-height">Height</Label>
                              <Input
                                id="flux-pro-height"
                                type="number"
                                min="256"
                                max="2048"
                                value={fluxProSettings.height}
                                onChange={(e) => setFluxProSettings(prev => ({ ...prev, height: e.target.value }))}
                              />
                            </div>
                          </div>
                        )}
                      </Card>
                    )}

                    <Button type="submit" className="w-full" disabled={isFluxProGenerating}>
                      {isFluxProGenerating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Generate with Flux Pro
                        </>
                      )}
                    </Button>
                  </form>

                  {fluxProError && (
                    <Alert className="mt-4">
                      <AlertDescription className="text-red-600">
                        {fluxProError}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Generated Prompt Display */}
                  <GeneratedPromptDisplay prompt={fluxProGeneratedPrompt} title="Generated Prompt (Flux Pro)" />
                </CardContent>
              </Card>

              {/* Flux Pro Result Display */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" />
                    Generated Image
                  </CardTitle>
                  <CardDescription>
                    Your generated image will appear here
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {fluxProImageUrl ? (
                    <div className="space-y-4">
                      <div className="aspect-square overflow-hidden rounded-lg border">
                        <img
                          src={fluxProImageUrl}
                          alt="Flux Pro Generated"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleImageDownload(fluxProImageUrl, 'flux-pro-generated-image.png')}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                      <div className="text-center text-muted-foreground">
                        <Sparkles className="h-12 w-12 mx-auto mb-2" />
                        <p>No image generated yet</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Flux Pro Image Combine Tab */}
          <TabsContent value="flux-pro-image-combine" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Form Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" />
                    Combine Images
                  </CardTitle>
                  <CardDescription>
                    Upload multiple images and combine them into a single new image
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <form onSubmit={handleFluxCombineSubmit} className="space-y-4">
                    {/* Image Upload Section */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Upload Images (minimum 2)</Label>
                        <Input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleCombineImageUpload}
                          className="cursor-pointer"
                        />
                        {fluxCombineImages.length > 0 && (
                          <div className="space-y-2">
                            <Label>Uploaded Files:</Label>
                            <div className="grid grid-cols-2 gap-2">
                              {fluxCombineImages.map((file, index) => (
                                <div key={index} className="flex items-center justify-between p-2 border rounded">
                                  <span className="text-sm truncate">{file.name}</span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeCombineImage(index)}
                                    className="text-red-500 hover:text-red-700"
                                  >
                                    Ã—
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Image URLs Section */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Or Add Image URLs</Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addCombineImageUrl}
                          >
                            Add URL
                          </Button>
                        </div>
                        {fluxCombineImageUrls.map((url, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              placeholder="https://example.com/image.jpg"
                              value={url}
                              onChange={(e) => updateCombineImageUrl(index, e.target.value)}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeCombineImageUrl(index)}
                              className="text-red-500 hover:text-red-700"
                            >
                              Ã—
                            </Button>
                          </div>
                        ))}
                      </div>

                      <div className="text-sm text-muted-foreground">
                        Total images: {fluxCombineImages.length + fluxCombineImageUrls.filter(url => url.trim()).length + fluxCombineBase64Images.length}
                      </div>

                      {/* Base64 Images Section */}
                      <div className="space-y-2">
                        <Label>Or Add Base64 Images</Label>
                        <div className="flex gap-2">
                          <Textarea
                            placeholder="Paste Base64 string or data URL (e.g., data:image/jpeg;base64,/9j/4AAQ...)"
                            value={fluxCombineBase64Input}
                            onChange={(e) => setFluxCombineBase64Input(e.target.value)}
                            className="min-h-[80px] font-mono text-xs"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={addCombineBase64Image}
                            disabled={!fluxCombineBase64Input.trim()}
                            className="self-start"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add
                          </Button>
                        </div>
                        {fluxCombineBase64Images.length > 0 && (
                          <div className="space-y-2">
                            <div className="text-sm text-muted-foreground">
                              {fluxCombineBase64Images.length} Base64 image(s) added
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {fluxCombineBase64Images.map((base64, index) => {
                                // Convert base64 to displayable format if needed
                                const displaySrc = base64.startsWith('data:') 
                                  ? base64 
                                  : `data:image/jpeg;base64,${base64}`
                                
                                return (
                                  <div key={index} className="relative group">
                                    <div className="aspect-square overflow-hidden rounded border">
                                      <img
                                        src={displaySrc}
                                        alt={`Base64 ${index + 1}`}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                    <Button
                                      type="button"
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => removeCombineBase64Image(index)}
                                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Prompt Section */}
                    <div className="space-y-2">
                      <Label htmlFor="flux-combine-prompt">Prompt</Label>
                      <Textarea
                        id="flux-combine-prompt"
                        placeholder="Describe how you want to combine the images..."
                        value={localFluxCombinePrompt}
                        onChange={(e) => {
                          setLocalFluxCombinePrompt(e.target.value)
                          setFluxCombinePrompt(e.target.value)
                        }}
                        className="min-h-[100px]"
                      />
                    </div>

                    {/* Canonical Prompt Section */}
                    <div className="space-y-4 p-4 border rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="use-canonical-prompt"
                              checked={useCanonicalPrompt}
                              onCheckedChange={setUseCanonicalPrompt}
                              className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-gray-300 dark:data-[state=unchecked]:bg-gray-600"
                            />
                            <Label htmlFor="use-canonical-prompt" className="font-medium">
                              Advanced Image Options
                            </Label>
                          </div>
                          <div className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-medium">
                            BETA
                          </div>
                        </div>
                      </div>
                      
                      {useCanonicalPrompt && (
                        <div className="space-y-4 pt-2 border-t border-emerald-200 dark:border-emerald-800">
                          <div className="text-sm text-muted-foreground">
                            Advanced image combination options are enabled. Configure your settings below.
                          </div>
                          {/* Simplified configuration note */}
                          <div className="p-3 bg-muted rounded-md text-xs text-muted-foreground">
                            This feature uses advanced image combination algorithms. The canonical prompt processor will be applied during generation.
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Advanced Settings Toggle */}
                    <div className="flex items-center space-x-3 p-3 border rounded-lg bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-950/20 dark:to-slate-950/20">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="flux-combine-advanced"
                          checked={showFluxCombineAdvanced}
                          onCheckedChange={setShowFluxCombineAdvanced}
                          className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-300 dark:data-[state=unchecked]:bg-gray-600"
                        />
                        <Label htmlFor="flux-combine-advanced" className="cursor-pointer font-medium">
                          Advanced Settings
                        </Label>
                      </div>
                      <div className={`w-2 h-2 rounded-full ${showFluxCombineAdvanced ? 'bg-green-500' : 'bg-gray-400'} transition-colors`}></div>
                    </div>

                    {showFluxCombineAdvanced && (
                      <div className="space-y-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800/50">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="flux-combine-aspect-ratio">Aspect Ratio</Label>
                            <Select
                              value={fluxCombineSettings.aspect_ratio}
                              onValueChange={(value) => setFluxCombineSettings(prev => ({ ...prev, aspect_ratio: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1:1">Square (1:1)</SelectItem>
                                <SelectItem value="4:3">Landscape (4:3)</SelectItem>
                                <SelectItem value="3:4">Portrait (3:4)</SelectItem>
                                <SelectItem value="16:9">Widescreen (16:9)</SelectItem>
                                <SelectItem value="9:16">Portrait (9:16)</SelectItem>
                                <SelectItem value="21:9">Ultra-wide (21:9)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="flux-combine-guidance">
                              Guidance Scale: {fluxCombineSettings.guidance_scale}
                            </Label>
                            <Slider
                              id="flux-combine-guidance"
                              min={1}
                              max={20}
                              step={0.1}
                              value={[fluxCombineSettings.guidance_scale]}
                              onValueChange={(value) => setFluxCombineSettings(prev => ({ ...prev, guidance_scale: value[0] }))}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="flux-combine-safety">
                              Safety Tolerance: {fluxCombineSettings.safety_tolerance}
                            </Label>
                            <Slider
                              id="flux-combine-safety"
                              min={1}
                              max={5}
                              step={1}
                              value={[fluxCombineSettings.safety_tolerance]}
                              onValueChange={(value) => setFluxCombineSettings(prev => ({ ...prev, safety_tolerance: value[0] }))}
                            />
                            <p className="text-xs text-muted-foreground">
                              1: Strictest - 2: Strict - 3: Balanced - 4: Permissive - 5: Most Permissive
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="flux-combine-output-format">Output Format</Label>
                            <Select
                              value={fluxCombineSettings.output_format}
                              onValueChange={(value) => setFluxCombineSettings(prev => ({ ...prev, output_format: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="jpeg">JPEG</SelectItem>
                                <SelectItem value="png">PNG</SelectItem>
                                <SelectItem value="webp">WebP</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="flux-combine-seed">Seed (optional)</Label>
                            <Input
                              id="flux-combine-seed"
                              type="number"
                              placeholder="Random if empty"
                              value={fluxCombineSettings.seed}
                              onChange={(e) => setFluxCombineSettings(prev => ({ ...prev, seed: e.target.value }))}
                            />
                          </div>
                        </div>

                        <div className="flex items-center space-x-3 p-3 border rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="flux-combine-enhance-prompt"
                              checked={fluxCombineSettings.enhance_prompt}
                              onCheckedChange={(checked) => setFluxCombineSettings(prev => ({ ...prev, enhance_prompt: checked }))}
                              className="data-[state=checked]:bg-purple-500 data-[state=unchecked]:bg-gray-300 dark:data-[state=unchecked]:bg-gray-600"
                            />
                            <Label htmlFor="flux-combine-enhance-prompt" className="cursor-pointer font-medium">
                              Enhance Prompt
                            </Label>
                          </div>
                          <div className={`w-2 h-2 rounded-full ${fluxCombineSettings.enhance_prompt ? 'bg-purple-500' : 'bg-gray-400'} transition-colors`}></div>
                        </div>
                      </div>
                    )}

                    <Button type="submit" disabled={isFluxCombineGenerating} className="w-full">
                      {isFluxCombineGenerating ? "Combining Images..." : "Combine Images"}
                    </Button>

                    {fluxCombineError && (
                      <Alert variant="destructive">
                        <AlertDescription>{fluxCombineError}</AlertDescription>
                      </Alert>
                    )}
                  </form>
                </CardContent>
              </Card>

              {/* Results Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Combined Image</CardTitle>
                  {fluxCombineGeneratedPrompt && (
                    <p className="text-sm text-muted-foreground">
                      <strong>Used prompt:</strong> {fluxCombineGeneratedPrompt}
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  {isFluxCombineGenerating ? (
                    <div className="flex items-center justify-center h-96 border-2 border-dashed border-gray-300 rounded-lg">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
                        <p className="text-gray-500">Combining images...</p>
                      </div>
                    </div>
                  ) : fluxCombineResult ? (
                    <div className="space-y-4">
                      <img
                        src={fluxCombineResult}
                        alt="Combined image"
                        className="w-full h-auto rounded-lg shadow-md"
                      />
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => handleImageDownload(fluxCombineResult, 'flux-combine-result.png')}
                      >
                        Open Full Size
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-96 border-2 border-dashed border-gray-300 rounded-lg">
                      <p className="text-gray-500">Combined image will appear here</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>        

          {/* Flux Ultra Finetuned Tab */}
          <TabsContent value="flux-ultra-finetuned" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Flux Ultra Generation Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-500" />
                    Generate high-quality images
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <form onSubmit={handleFluxUltraSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="fluxUltraPrompt">Prompt</Label>
                      <Textarea
                        id="fluxUltraPrompt"
                        placeholder="Describe the image you want to generate. You can start with 'Create a poster of...' for example."
                        value={localFluxUltraPrompt}
                        onChange={(e) => setLocalFluxUltraPrompt(e.target.value)}
                        rows={3}
                      />
                    </div>

                    {/* GENERATION CANONICAL PROMPT CONTROLS - DEPRECATED */}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="fluxUltraFinetuneId">Fine-tune ID</Label>
                        <Input
                          id="fluxUltraFinetuneId"
                          value={fluxUltraFinetuneId}
                          onChange={(e) => setFluxUltraFinetuneId(e.target.value)}
                          placeholder="Fine-tune model ID"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="fluxUltraTriggerPhrase">Trigger Phrase</Label>
                        <Input
                          id="fluxUltraTriggerPhrase"
                          value={fluxUltraTriggerPhrase}
                          onChange={(e) => setFluxUltraTriggerPhrase(e.target.value)}
                          placeholder="Model trigger phrase"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fluxUltraFinetuneStrength">Fine-tune Strength: {fluxUltraFinetuneStrength}</Label>
                      <input
                        id="fluxUltraFinetuneStrength"
                        type="range"
                        min="0.1"
                        max="2.0"
                        step="0.1"
                        value={fluxUltraFinetuneStrength}
                        onChange={(e) => setFluxUltraFinetuneStrength(parseFloat(e.target.value))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Subtle (0.1)</span>
                        <span>Strong (2.0)</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowFluxUltraAdvanced(!showFluxUltraAdvanced)}
                        className="flex items-center gap-2"
                      >
                        <Settings className="h-4 w-4" />
                        {showFluxUltraAdvanced ? "Hide" : "Show"} Advanced Settings
                      </Button>

                      {showFluxUltraAdvanced && (
                        <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
                          <div className="space-y-2">
                            <Label htmlFor="fluxUltraAspectRatio">Aspect Ratio</Label>
                            <Select
                              value={fluxUltraSettings.aspect_ratio}
                              onValueChange={(value) => setFluxUltraSettings(prev => ({ ...prev, aspect_ratio: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1:1">Square (1:1)</SelectItem>
                                <SelectItem value="4:3">Landscape (4:3)</SelectItem>
                                <SelectItem value="3:4">Portrait (3:4)</SelectItem>
                                <SelectItem value="16:9">Widescreen (16:9)</SelectItem>
                                <SelectItem value="9:16">Vertical (9:16)</SelectItem>
                                <SelectItem value="21:9">Ultra-wide (21:9)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="fluxUltraSafetyTolerance">Safety Tolerance</Label>
                            <Select
                              value={fluxUltraSettings.safety_tolerance.toString()}
                              onValueChange={(value) => setFluxUltraSettings(prev => ({ ...prev, safety_tolerance: parseInt(value) }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select safety tolerance" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">Level 1 - Most Strict (Default)</SelectItem>
                                <SelectItem value="2">Level 2 - Moderate</SelectItem>
                                <SelectItem value="3">Level 3 - Least Strict</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="fluxUltraRaw"
                                checked={fluxUltraSettings.raw}
                                onCheckedChange={(checked) => setFluxUltraSettings(prev => ({ ...prev, raw: !!checked }))}
                              />
                              <Label htmlFor="fluxUltraRaw">Raw Mode</Label>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Disable prompt enhancement and use raw input
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="fluxUltraSeed">Seed (optional)</Label>
                            <Input
                              id="fluxUltraSeed"
                              type="number"
                              placeholder="Random if empty"
                              value={fluxUltraSettings.seed}
                              onChange={(e) => setFluxUltraSettings(prev => ({ ...prev, seed: e.target.value }))}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <Button type="submit" className="w-full" disabled={!localFluxUltraPrompt.trim() || isFluxUltraGenerating}>
                      {isFluxUltraGenerating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Generate Image
                        </>
                      )}
                    </Button>
                  </form>

                  {/* Display generated prompt */}
                  <GeneratedPromptDisplay 
                    prompt={fluxUltraGeneratedPrompt} 
                    title="Final Prompt (with Trigger Phrase)"
                  />

                  {fluxUltraError && (
                    <div className="p-4 border border-amber-200 bg-amber-50 text-amber-800 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <div className="text-2xl">ðŸš«</div>
                        <div className="flex-1">
                          <div className="font-medium mb-2">Content Not Allowed</div>
                          <div className="text-sm mb-3">{fluxUltraError}</div>
                          <div className="text-xs bg-amber-100 p-2 rounded border border-amber-200">
                            <div className="font-medium mb-1">ðŸ’¡ Examples of appropriate content:</div>
                            <ul className="list-disc list-inside space-y-1">
                              <li>Peaceful environmental demonstration</li>
                              <li>People working as a team</li>
                              <li>Educational informational material</li>
                              <li>Community events</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Flux Ultra Result Preview */}
              <Card>
                <CardHeader>
                  <CardTitle>Generated Image</CardTitle>
                </CardHeader>
                <CardContent>
                  {isFluxUltraGenerating ? (
                    <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <Loader2 className="h-12 w-12 mx-auto mb-2 animate-spin" />
                        <p className="text-muted-foreground">Generating image...</p>
                      </div>
                    </div>
                  ) : fluxUltraImageUrl ? (
                    <div className="space-y-3">
                      <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                        <img
                          src={fluxUltraImageUrl || "/placeholder.svg"}
                          alt="Flux Ultra generated image"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <OpenInNewTabButton imageUrl={fluxUltraImageUrl} />
                    </div>
                  ) : (
                    <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                      <div className="text-center text-muted-foreground">
                        <Sparkles className="h-12 w-12 mx-auto mb-2" />
                        <p>No image generated yet</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

        </Tabs>
      </div>
    </div>
  )
}
