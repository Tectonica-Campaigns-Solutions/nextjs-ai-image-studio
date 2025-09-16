"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, Wand2, Loader2, Image as ImageIcon, Sparkles, Settings, Zap, FileText, ExternalLink, Eye } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { BrandingUploader } from "@/components/branding-uploader"
import RAGSelector from "@/components/rag-selector"
import { useRAGStore } from "@/lib/rag-store"
import { enhancePromptHybrid, validateHybridOptions, getStrategyDescription, type HybridEnhancementOptions } from "@/lib/hybrid-enhancement"
import { getEnhancementText, getEditEnhancementText, getSedreamEnhancementText } from "@/lib/json-enhancement"
import { EnhancementPreview } from "@/components/enhancement-preview"

export default function ImageEditor() {
  // Qwen Text-to-Image States
  const [qwenPrompt, setQwenPrompt] = useState("")
  const [qwenSettings, setQwenSettings] = useState({
    image_size: "landscape_4_3",
    num_inference_steps: 30,
    guidance_scale: 2.5,
    num_images: 1,
    output_format: "png",
    negative_prompt: "",
    acceleration: "none",
    enable_safety_checker: true,
    sync_mode: false,
    seed: "",
    width: "",
    height: ""
  })
  const [qwenImageUrl, setQwenImageUrl] = useState<string>("")
  const [isQwenGenerating, setIsQwenGenerating] = useState(false)
  const [qwenError, setQwenError] = useState<string>("")
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false)
  const [useRag, setUseRag] = useState(true) // RAG enabled by default
  
  // RAG Store
  const { getActiveRAG } = useRAGStore()
  
  // LoRA States for Qwen Text-to-Image
  const [useCustomLoRA, setUseCustomLoRA] = useState(true)
  // const [loraUrl, setLoraUrl] = useState("https://v3.fal.media/files/lion/p9zfHVb60jBBiVEbb8ahw_adapter.safetensors")
  // const [loraUrl, setLoraUrl] = useState("https://storage.googleapis.com/isolate-dev-hot-rooster_toolkit_public_bucket/github_110602490/0f076a59f424409db92b2f0e4e16402a_pytorch_lora_weights.safetensors")
  
  const [loraUrl, setLoraUrl] = useState("https://v3.fal.media/files/elephant/YOSyiUVvNDHBF-V3pLTM1_pytorch_lora_weights.safetensors")

  const [triggerPhrase, setTriggerPhrase] = useState("MDF-9-9-2025B")
  const [loraScale, setLoraScale] = useState(1.3)
  const [qwenGeneratedPrompt, setQwenGeneratedPrompt] = useState<string>("") // Store generated prompt

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
    seed: "",
    width: "",
    height: ""
  })
  const [fluxProImageUrl, setFluxProImageUrl] = useState<string>("")
  const [isFluxProGenerating, setIsFluxProGenerating] = useState(false)
  const [fluxProError, setFluxProError] = useState<string>("")
  const [useRagFluxPro, setUseRagFluxPro] = useState(true)
  const [fluxProGeneratedPrompt, setFluxProGeneratedPrompt] = useState<string>("")
  const [showFluxProAdvanced, setShowFluxProAdvanced] = useState(false)

  // Flux Ultra Finetuned States
  const [fluxUltraPrompt, setFluxUltraPrompt] = useState("")
  const [fluxUltraSettings, setFluxUltraSettings] = useState({
    aspect_ratio: "1:1",
    num_images: 1,
    safety_tolerance: 1,
    output_format: "jpeg",
    enable_safety_checker: true,
    raw: false, // Raw mode setting
    seed: ""
  })
  const [fluxUltraFinetuneId, setFluxUltraFinetuneId] = useState("a4bd761c-0f90-41cc-be78-c7b6cf22285a")
  const [fluxUltraFinetuneStrength, setFluxUltraFinetuneStrength] = useState(1.0)
  const [fluxUltraTriggerPhrase, setFluxUltraTriggerPhrase] = useState("TCT-AI-8")
  const [fluxUltraImageUrl, setFluxUltraImageUrl] = useState<string>("")
  const [isFluxUltraGenerating, setIsFluxUltraGenerating] = useState(false)
  const [fluxUltraError, setFluxUltraError] = useState<string>("")
  const [fluxUltraGeneratedPrompt, setFluxUltraGeneratedPrompt] = useState<string>("")
  const [showFluxUltraAdvanced, setShowFluxUltraAdvanced] = useState(false)

  // Hybrid Enhancement States
  const [useJSONEnhancement, setUseJSONEnhancement] = useState(true)
  const [hybridStrategy, setHybridStrategy] = useState<'rag-only' | 'json-only' | 'hybrid' | 'none'>('json-only')
  const [jsonIntensity, setJsonIntensity] = useState(0.8)
  const [enhancementPreview, setEnhancementPreview] = useState<string>("")
  const [enhancementMeta, setEnhancementMeta] = useState<any>(null)
  const [customEnhancementText, setCustomEnhancementText] = useState<string>("")
  const [defaultEnhancementText, setDefaultEnhancementText] = useState<string>("")
  
  // Function to generate enhancement preview
  const generateEnhancementPreview = async (prompt: string) => {
    if (!prompt.trim() || hybridStrategy === 'none') {
      setEnhancementPreview("")
      setEnhancementMeta(null)
      return
    }

    const useRAG = hybridStrategy === 'rag-only' || hybridStrategy === 'hybrid'
    const useJSON = hybridStrategy === 'json-only' || hybridStrategy === 'hybrid'
    
    const hybridOptions: HybridEnhancementOptions = {
      useRAG,
      useJSONEnhancement: useJSON,
      ragContext: useRAG ? {
        activeRAGId: getActiveRAG()?.id,
        activeRAGName: getActiveRAG()?.name
      } : undefined,
      jsonOptions: useJSON ? {
        useDefaults: !customEnhancementText || customEnhancementText === defaultEnhancementText,
        customText: customEnhancementText !== defaultEnhancementText ? customEnhancementText : undefined,
        intensity: jsonIntensity
      } : undefined
    }

    try {
      const result = await enhancePromptHybrid(prompt, hybridOptions)
      setEnhancementPreview(result.enhancedPrompt)
      setEnhancementMeta(result.metadata)
    } catch (error) {
      console.warn('Enhancement preview failed:', error)
      setEnhancementPreview(prompt)
      setEnhancementMeta(null)
    }
  }

  // Function to generate enhancement preview for Combine Images
  const generateFluxCombineEnhancementPreview = async (prompt: string) => {
    if (!prompt.trim() || !fluxCombineUseJSONEnhancement) {
      setFluxCombineEnhancementPreview("")
      setFluxCombineEnhancementMeta(null)
      return
    }

    const hybridOptions: HybridEnhancementOptions = {
      useRAG: false, // Only JSON for Combine Images
      useJSONEnhancement: true,
      jsonOptions: {
        useDefaults: !fluxCombineCustomEnhancementText || fluxCombineCustomEnhancementText === fluxCombineDefaultEnhancementText,
        customText: fluxCombineCustomEnhancementText !== fluxCombineDefaultEnhancementText ? fluxCombineCustomEnhancementText : undefined,
        intensity: fluxCombineJsonIntensity
      }
    }

    try {
      const result = await enhancePromptHybrid(prompt, hybridOptions)
      setFluxCombineEnhancementPreview(result.enhancedPrompt)
      setFluxCombineEnhancementMeta(result.metadata)
    } catch (error) {
      console.warn('Combine Images enhancement preview failed:', error)
      setFluxCombineEnhancementPreview(prompt)
      setFluxCombineEnhancementMeta(null)
    }
  }

  // Edit Image Enhancement Preview Function
  const generateEditEnhancementPreview = async (prompt: string) => {
    if (!prompt.trim() || !useEditJSONEnhancement) {
      setEditEnhancementPreview("")
      setEditEnhancementMeta(null)
      return
    }

    const hybridOptions: HybridEnhancementOptions = {
      useRAG: false, // Only JSON for Edit Image
      useJSONEnhancement: true,
      jsonOptions: {
        useDefaults: !editCustomEnhancementText || editCustomEnhancementText === editDefaultEnhancementText,
        customText: editCustomEnhancementText !== editDefaultEnhancementText ? editCustomEnhancementText : undefined,
        intensity: editJsonIntensity
      }
    }

    try {
      const result = await enhancePromptHybrid(prompt, hybridOptions)
      setEditEnhancementPreview(result.enhancedPrompt)
      setEditEnhancementMeta(result.metadata)
    } catch (error) {
      console.warn('Edit Image enhancement preview failed:', error)
      setEditEnhancementPreview(prompt)
      setEditEnhancementMeta(null)
    }
  }

  // SeDream v4 Enhancement Preview Function
  const generateSedreamEnhancementPreview = async (prompt: string) => {
    if (!prompt.trim() || !useSedreamJSONEnhancement) {
      setSedreamEnhancementPreview("")
      setSedreamEnhancementMeta(null)
      return
    }

    const hybridOptions: HybridEnhancementOptions = {
      useRAG: false, // Only JSON for SeDream
      useJSONEnhancement: true,
      jsonOptions: {
        useDefaults: !sedreamCustomEnhancementText || sedreamCustomEnhancementText === sedreamDefaultEnhancementText,
        customText: sedreamCustomEnhancementText !== sedreamDefaultEnhancementText ? sedreamCustomEnhancementText : undefined,
        intensity: sedreamJsonIntensity
      }
    }

    try {
      const result = await enhancePromptHybrid(prompt, hybridOptions)
      setSedreamEnhancementPreview(result.enhancedPrompt)
      setSedreamEnhancementMeta(result.metadata)
    } catch (error) {
      console.warn('SeDream v4 enhancement preview failed:', error)
      setSedreamEnhancementPreview(prompt)
      setSedreamEnhancementMeta(null)
    }
  }

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
    seed: "",
    width: "",
    height: ""
  })
  const [fluxProMultiResult, setFluxProMultiResult] = useState<any[]>([])
  const [isFluxProMultiGenerating, setIsFluxProMultiGenerating] = useState(false)
  const [fluxProMultiError, setFluxProMultiError] = useState<string>("")
  const [useRagFluxProMulti, setUseRagFluxProMulti] = useState(true)
  const [fluxProMultiGeneratedPrompt, setFluxProMultiGeneratedPrompt] = useState<string>("")
  const [showFluxProMultiAdvanced, setShowFluxProMultiAdvanced] = useState(false)

  // Flux Pro Multi LoRA States
  const [useFluxProMultiLoRA, setUseFluxProMultiLoRA] = useState(true)
  const [fluxProMultiLoraUrl, setFluxProMultiLoraUrl] = useState("https://v3.fal.media/files/elephant/YOSyiUVvNDHBF-V3pLTM1_pytorch_lora_weights.safetensors")
  const [fluxProMultiTriggerPhrase, setFluxProMultiTriggerPhrase] = useState("MDF-9-9-2025B")
  const [fluxProMultiLoraScale, setFluxProMultiLoraScale] = useState(1.3)

  // Flux Pro Image Combine States
  const [fluxCombinePrompt, setFluxCombinePrompt] = useState("")
  const [fluxCombineImages, setFluxCombineImages] = useState<File[]>([])
  const [fluxCombineImageUrls, setFluxCombineImageUrls] = useState<string[]>([])
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

  // Flux Combine JSON Enhancement States
  const [fluxCombineUseJSONEnhancement, setFluxCombineUseJSONEnhancement] = useState(false) // Disabled by default
  const [fluxCombineJsonIntensity, setFluxCombineJsonIntensity] = useState(0.8)
  const [fluxCombineEnhancementPreview, setFluxCombineEnhancementPreview] = useState<string>("")
  const [fluxCombineEnhancementMeta, setFluxCombineEnhancementMeta] = useState<any>(null)
  const [fluxCombineCustomEnhancementText, setFluxCombineCustomEnhancementText] = useState<string>("")
  const [fluxCombineDefaultEnhancementText, setFluxCombineDefaultEnhancementText] = useState<string>("")

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
  const [useRagEdit, setUseRagEdit] = useState(false) // RAG for edit image - disabled by default
  const [editGeneratedPrompt, setEditGeneratedPrompt] = useState<string>("") // Store generated prompt
  const [editImageSize, setEditImageSize] = useState("square_hd") // Image size for edit
  const [customWidth, setCustomWidth] = useState("1024") // Custom width for edit
  const [customHeight, setCustomHeight] = useState("1024") // Custom height for edit

  // SeDream v4 Edit States
  const [sedreamImage, setSedreamImage] = useState<File | null>(null)
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
  const [sedreamDefaultEnhancementText, setSedreamDefaultEnhancementText] = useState<string>("")

  // Qwen Image-to-Image States
  const [img2imgFile, setImg2imgFile] = useState<File | null>(null)
  const [img2imgPreviewUrl, setImg2imgPreviewUrl] = useState<string>("")
  const [img2imgPrompt, setImg2imgPrompt] = useState("")
  const [img2imgSettings, setImg2imgSettings] = useState<{
    image_size: string;
    num_inference_steps: number;
    guidance_scale: number;
    strength: number;
    num_images: number;
    output_format: string;
    negative_prompt: string;
    acceleration: string;
    enable_safety_checker: boolean;
    sync_mode: boolean;
    seed: string;
    width: string;
    height: string;
    loras?: Array<{ path: string; scale: number }>;
  }>({
    image_size: "landscape_4_3",
    num_inference_steps: 30,
    guidance_scale: 2.5,
    strength: 0.8,
    num_images: 1,
    output_format: "png",
    negative_prompt: "",
    acceleration: "none",
    enable_safety_checker: true,
    sync_mode: false,
    seed: "",
    width: "",
    height: ""
  })
  const [img2imgResult, setImg2imgResult] = useState<string[]>([])
  const [isImg2imgGenerating, setIsImg2imgGenerating] = useState(false)
  const [img2imgError, setImg2imgError] = useState<string>("")
  const [useRagImg2img, setUseRagImg2img] = useState(true)
  const [img2imgGeneratedPrompt, setImg2imgGeneratedPrompt] = useState<string>("")
  const [showImg2imgAdvanced, setShowImg2imgAdvanced] = useState(false)
  const [useImg2imgLoRA, setUseImg2imgLoRA] = useState(true)
  const [img2imgLoraUrl, setImg2imgLoraUrl] = useState("https://v3.fal.media/files/elephant/YOSyiUVvNDHBF-V3pLTM1_pytorch_lora_weights.safetensors")
  const [img2imgTriggerPhrase, setImg2imgTriggerPhrase] = useState("MDF-9-9-2025B")
  const [img2imgLoraScale, setImg2imgLoraScale] = useState(1.3)

  // Qwen LoRA Training States
  const [trainingFile, setTrainingFile] = useState<File | null>(null)
  const [trainingSettings, setTrainingSettings] = useState({
    steps: 1000,
    learning_rate: 0.0005,
    trigger_phrase: ""
  })
  const [trainingRequestId, setTrainingRequestId] = useState<string>("")
  const [trainingStatus, setTrainingStatus] = useState<string>("")
  const [trainingLogs, setTrainingLogs] = useState<string[]>([])
  const [trainingResult, setTrainingResult] = useState<any>(null)
  const [isTraining, setIsTraining] = useState(false)
  const [trainingError, setTrainingError] = useState<string>("")
  const [showTrainingAdvanced, setShowTrainingAdvanced] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string>("")

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

  // Load default enhancement text on component mount
  useEffect(() => {
    const loadDefaultText = async () => {
      try {
        const text = await getEnhancementText()
        if (text) {
          setDefaultEnhancementText(text)
          setCustomEnhancementText(text) // Initialize with default
          
          // Also initialize for Combine Images
          setFluxCombineDefaultEnhancementText(text)
          setFluxCombineCustomEnhancementText(text)
        }
        
        // Load specific text for Edit Image
        const editText = await getEditEnhancementText()
        if (editText) {
          setEditDefaultEnhancementText(editText)
          setEditCustomEnhancementText(editText)
        }

        // Load specific text for SeDream v4
        const sedreamText = await getSedreamEnhancementText()
        if (sedreamText) {
          setSedreamDefaultEnhancementText(sedreamText)
          setSedreamCustomEnhancementText(sedreamText)
        }
      } catch (error) {
        console.warn('Failed to load default enhancement text:', error)
      }
    }
    
    loadDefaultText()
  }, [])

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

  const handleQwenSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!qwenPrompt.trim()) {
      setQwenError("Please enter a prompt")
      return
    }

    setIsQwenGenerating(true)
    setQwenError("")

    try {
      const formData = new FormData()
      
      // Enhance prompt with trigger phrase if using custom LoRA
      let finalPrompt = qwenPrompt
      if (useCustomLoRA && triggerPhrase.trim()) {
        finalPrompt = `${triggerPhrase}, ${qwenPrompt}`
      }
      
      formData.append("prompt", finalPrompt)
      formData.append("useRag", useRag.toString())
      
      // Add active RAG information
      const activeRAG = getActiveRAG()
      if (useRag && activeRAG) {
        formData.append("activeRAGId", activeRAG.id)
        formData.append("activeRAGName", activeRAG.name)
      }
      
      // Prepare settings object, converting types as needed
      const settings: any = { ...qwenSettings }
      
      // Add LoRA configuration if enabled
      if (useCustomLoRA && loraUrl.trim()) {
        settings.loras = [{
          path: loraUrl.trim(),
          scale: loraScale
        }]
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
      
      formData.append("settings", JSON.stringify(settings))
      formData.append("orgType", "general") // TODO: Make this configurable per organization

      const response = await fetch("/api/qwen-text-to-image", {
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
        setQwenGeneratedPrompt(result.finalPrompt)
      } else if (result.prompt) {
        setQwenGeneratedPrompt(result.prompt)
      } else {
        setQwenGeneratedPrompt(qwenPrompt) // Fallback to original prompt
      }
      
      if (result.image) {
        setQwenImageUrl(result.image)
      } else if (result.images && result.images.length > 0) {
        // Handle multiple images - for now, show the first one
        setQwenImageUrl(result.images[0].url)
      } else {
        throw new Error("No image received from server")
      }
    } catch (err) {
      setQwenError(err instanceof Error ? err.message : "Failed to generate image")
    } finally {
      setIsQwenGenerating(false)
    }
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
      const useRAG = hybridStrategy === 'rag-only' || hybridStrategy === 'hybrid'
      const useJSON = hybridStrategy === 'json-only' || hybridStrategy === 'hybrid'
      
      let finalPrompt = fluxProPrompt
      let enhancementResult = null
      
      // Apply hybrid enhancement if any strategy is enabled
      if (hybridStrategy !== 'none') {
        console.log('[FRONTEND] Applying hybrid enhancement with strategy:', hybridStrategy)
        
        const hybridOptions: HybridEnhancementOptions = {
          useRAG,
          useJSONEnhancement: useJSON,
          ragContext: useRAG ? {
            activeRAGId: getActiveRAG()?.id,
            activeRAGName: getActiveRAG()?.name
          } : undefined,
          jsonOptions: useJSON ? {
            useDefaults: !customEnhancementText || customEnhancementText === defaultEnhancementText,
            customText: customEnhancementText !== defaultEnhancementText ? customEnhancementText : undefined,
            intensity: jsonIntensity
          } : undefined
        }
        
        // Validate options
        const validation = validateHybridOptions(hybridOptions)
        if (validation.warnings.length > 0) {
          console.warn('[FRONTEND] Enhancement warnings:', validation.warnings)
        }
        
        try {
          enhancementResult = await enhancePromptHybrid(fluxProPrompt, hybridOptions)
          finalPrompt = enhancementResult.enhancedPrompt
          
          console.log('[FRONTEND] Enhancement applied:', enhancementResult.metadata)
          console.log('[FRONTEND] Enhanced prompt length:', finalPrompt.length)
          
          // Store enhanced prompt for display
          setFluxProGeneratedPrompt(finalPrompt)
        } catch (enhanceError) {
          console.warn('[FRONTEND] Enhancement failed, using original prompt:', enhanceError)
          finalPrompt = fluxProPrompt
          setFluxProGeneratedPrompt(fluxProPrompt)
        }
      } else {
        console.log('[FRONTEND] No enhancement applied (strategy: none)')
        setFluxProGeneratedPrompt(fluxProPrompt)
      }
      
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
      
      // Add negative prompt from enhancement if available
      if (enhancementResult?.finalNegativePrompt) {
        // Combine with existing negative prompt if any
        const existingNegative = fluxProSettings.negative_prompt || ""
        const combinedNegative = [existingNegative, enhancementResult.finalNegativePrompt]
          .filter(Boolean)
          .join(", ")
        settings.negative_prompt = combinedNegative
        console.log("[FRONTEND] Combined negative prompt:", combinedNegative)
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
      formData.append("useRag", useRagFluxProMulti.toString())
      
      // Add active RAG information
      const activeRAG = getActiveRAG()
      if (useRagFluxProMulti && activeRAG) {
        formData.append("activeRAGId", activeRAG.id)
        formData.append("activeRAGName", activeRAG.name)
      }
      
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

    if (!fluxUltraPrompt.trim()) {
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
      const formData = new FormData()
      
      // The API will construct the final prompt with trigger phrase
      formData.append("prompt", fluxUltraPrompt)
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

    if (fluxCombineImages.length + fluxCombineImageUrls.length < 2) {
      setFluxCombineError("Please upload at least 2 images to combine")
      return
    }

    setIsFluxCombineGenerating(true)
    setFluxCombineError("")

    try {
      // Apply JSON enhancement if enabled
      let finalPrompt = fluxCombinePrompt
      if (fluxCombineUseJSONEnhancement) {
        try {
          const hybridOptions: HybridEnhancementOptions = {
            useRAG: false, // Only JSON for Combine Images
            useJSONEnhancement: true,
            jsonOptions: {
              useDefaults: !fluxCombineCustomEnhancementText || fluxCombineCustomEnhancementText === fluxCombineDefaultEnhancementText,
              customText: fluxCombineCustomEnhancementText !== fluxCombineDefaultEnhancementText ? fluxCombineCustomEnhancementText : undefined,
              intensity: fluxCombineJsonIntensity
            }
          }

          const enhancementResult = await enhancePromptHybrid(fluxCombinePrompt, hybridOptions)
          finalPrompt = enhancementResult.enhancedPrompt
          
          console.log("[COMBINE] Enhanced prompt:", finalPrompt)
        } catch (error) {
          console.warn("[COMBINE] Enhancement failed, using original prompt:", error)
          finalPrompt = fluxCombinePrompt
        }
      }

      const formData = new FormData()
      
      formData.append("prompt", finalPrompt)
      formData.append("useRag", "false")
      
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
      
      // Capture generated prompt (use the enhanced prompt we sent)
      setFluxCombineGeneratedPrompt(finalPrompt)
      
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
      // Apply JSON Enhancement if enabled
      let finalPrompt = prompt
      if (useEditJSONEnhancement) {
        const hybridOptions: HybridEnhancementOptions = {
          useRAG: false, // Only JSON for Edit Image
          useJSONEnhancement: true,
          jsonOptions: {
            useDefaults: !editCustomEnhancementText || editCustomEnhancementText === editDefaultEnhancementText,
            customText: editCustomEnhancementText !== editDefaultEnhancementText ? editCustomEnhancementText : undefined,
            intensity: editJsonIntensity
          }
        }
        
        try {
          const result = await enhancePromptHybrid(prompt, hybridOptions)
          finalPrompt = result.enhancedPrompt
        } catch (error) {
          console.warn('Edit Image JSON Enhancement failed, using original prompt:', error)
          // Continue with original prompt if enhancement fails
        }
      }

      const formData = new FormData()
      formData.append("image", selectedImage)
      formData.append("prompt", finalPrompt)
      formData.append("useRAG", useRagEdit.toString())
      formData.append("image_size", editImageSize)
      
      // Add custom dimensions if using custom image_size
      if (editImageSize === 'custom') {
        formData.append("width", customWidth)
        formData.append("height", customHeight)
      }
      
      // Add active RAG information for edit
      const activeRAG = getActiveRAG()
      if (useRagEdit && activeRAG) {
        formData.append("activeRAGId", activeRAG.id)
        formData.append("activeRAGName", activeRAG.name)
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

  const handleSedreamSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!sedreamImage) {
      setSedreamError("Please select an image")
      return
    }

    setIsSedreamLoading(true)
    setSedreamError("")

    try {
      // Apply JSON Enhancement if enabled and prompt provided
      let finalPrompt = sedreamPrompt
      if (useSedreamJSONEnhancement && sedreamPrompt.trim()) {
        const hybridOptions: HybridEnhancementOptions = {
          useRAG: false, // Only JSON for SeDream
          useJSONEnhancement: true,
          jsonOptions: {
            useDefaults: !sedreamCustomEnhancementText || sedreamCustomEnhancementText === sedreamDefaultEnhancementText,
            customText: sedreamCustomEnhancementText !== sedreamDefaultEnhancementText ? sedreamCustomEnhancementText : undefined,
            intensity: sedreamJsonIntensity
          }
        }
        
        try {
          const result = await enhancePromptHybrid(sedreamPrompt, hybridOptions)
          finalPrompt = result.enhancedPrompt
        } catch (error) {
          console.warn('SeDream JSON Enhancement failed, using original prompt:', error)
          // Continue with original prompt if enhancement fails
        }
      }

      const formData = new FormData()
      formData.append("image", sedreamImage)
      if (finalPrompt.trim()) {
        formData.append("prompt", finalPrompt)
      }
      formData.append("useJSONEnhancement", useSedreamJSONEnhancement.toString())
      formData.append("jsonIntensity", sedreamJsonIntensity.toString())
      formData.append("customEnhancementText", sedreamCustomEnhancementText)

      const response = await fetch("/api/seedream-v4-edit", {
        method: "POST",
        body: formData
      })

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

  // Image-to-Image handlers
  const handleImg2imgFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setImg2imgError("Please select a valid image file")
        return
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setImg2imgError("Image file must be smaller than 10MB")
        return
      }

      setImg2imgFile(file)
      setImg2imgError("")

      // Create preview URL
      const reader = new FileReader()
      reader.onload = (e) => {
        setImg2imgPreviewUrl(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleImg2imgSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!img2imgFile || !img2imgPrompt.trim()) {
      setImg2imgError("Please select an image and enter a prompt")
      return
    }

    setIsImg2imgGenerating(true)
    setImg2imgError("")

    try {
      const formData = new FormData()
      
      // Enhance prompt with trigger phrase if using custom LoRA
      let finalPrompt = img2imgPrompt
      if (useImg2imgLoRA && img2imgTriggerPhrase.trim()) {
        finalPrompt = `${img2imgTriggerPhrase}, ${img2imgPrompt}`
      }
      
      formData.append("image", img2imgFile)
      formData.append("prompt", finalPrompt)
      formData.append("useRAG", useRagImg2img.toString())
      
      // Add active RAG information
      const activeRAG = getActiveRAG()
      if (useRagImg2img && activeRAG) {
        formData.append("activeRAGId", activeRAG.id)
        formData.append("activeRAGName", activeRAG.name)
      }

      // Prepare settings object with LoRA if enabled
      const settingsWithLora = { ...img2imgSettings }
      if (useImg2imgLoRA && img2imgLoraUrl.trim()) {
        settingsWithLora.loras = [{
          path: img2imgLoraUrl,
          scale: img2imgLoraScale
        }]
      }

      formData.append("settings", JSON.stringify(settingsWithLora))

      const response = await fetch("/api/qwen-image-to-image", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        if (errorData.blocked) {
          throw new Error(handleModerationError(errorData))
        }
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      // Capture generated prompt if available
      if (result.finalPrompt) {
        setImg2imgGeneratedPrompt(result.finalPrompt)
      } else {
        setImg2imgGeneratedPrompt(finalPrompt)
      }
      
      if (result.success && result.images && result.images.length > 0) {
        setImg2imgResult(result.images)
      } else {
        throw new Error("No images received from server")
      }
    } catch (err) {
      setImg2imgError(err instanceof Error ? err.message : "Failed to generate image-to-image")
    } finally {
      setIsImg2imgGenerating(false)
    }
  }

  // Training handlers
  const handleTrainingFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (!file.name.endsWith('.zip')) {
        setTrainingError("Please select a ZIP file containing training images and captions")
        return
      }
      setTrainingFile(file)
      setTrainingError("")
    }
  }

  const handleTrainingSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!trainingFile) {
      setTrainingError("Please select a training ZIP file")
      return
    }

    setIsTraining(true)
    setTrainingError("")
    setTrainingLogs([])
    setUploadProgress("Preparing file upload...")

    try {
      // Upload file to Fal storage via our proxy endpoint
      console.log("[Training] Uploading file:", trainingFile.name)
      setUploadProgress(`Uploading ${trainingFile.name} (${(trainingFile.size / 1024 / 1024).toFixed(1)}MB)...`)
      
      const uploadFormData = new FormData()
      uploadFormData.append("file", trainingFile)

      // Create AbortController for timeout handling
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        controller.abort()
      }, 300000) // 5 minutes timeout

      let uploadResult: any

      try {
        const uploadResponse = await fetch("/api/upload-file", {
          method: "POST",
          body: uploadFormData,
          signal: controller.signal,
        })

        clearTimeout(timeoutId)
        setUploadProgress("Upload completed! Preparing training job...")

        if (!uploadResponse.ok) {
          const uploadError = await uploadResponse.json()
          throw new Error(uploadError.error || "Failed to upload training file")
        }

        uploadResult = await uploadResponse.json()
        console.log("[Training] File uploaded to:", uploadResult.url)

      } catch (uploadError) {
        clearTimeout(timeoutId)
        setUploadProgress("")
        if (uploadError instanceof Error && uploadError.name === 'AbortError') {
          throw new Error("Upload timeout - file too large or connection too slow. Try with a smaller file.")
        }
        throw uploadError
      }

      // Submit training job
      setUploadProgress("Submitting training job...")
      const formData = new FormData()
      formData.append("image_data_url", uploadResult.url)
      formData.append("steps", trainingSettings.steps.toString())
      formData.append("learning_rate", trainingSettings.learning_rate.toString())
      if (trainingSettings.trigger_phrase.trim()) {
        formData.append("trigger_phrase", trainingSettings.trigger_phrase.trim())
      }

      const response = await fetch("/api/qwen-train-lora", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      if (result.success && result.request_id) {
        setTrainingRequestId(result.request_id)
        setTrainingStatus("submitted")
        setUploadProgress("")
        console.log("[Training] Job submitted with ID:", result.request_id)
        
        // Start polling for status
        pollTrainingStatus(result.request_id)
      } else {
        throw new Error("No request ID received from server")
      }
    } catch (err) {
      console.error("[Training] Error:", err)
      setTrainingError(err instanceof Error ? err.message : "Failed to start training")
      setIsTraining(false)
      setUploadProgress("")
    }
  }

  const pollTrainingStatus = async (requestId: string) => {
    try {
      const response = await fetch(`/api/qwen-train-lora?request_id=${requestId}`)
      
      if (!response.ok) {
        throw new Error(`Failed to check status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success) {
        setTrainingStatus(data.status)
        
        if (data.logs && data.logs.length > 0) {
          setTrainingLogs(data.logs.map((log: any) => log.message || log))
        }

        if (data.status === "completed" && data.result) {
          setTrainingResult(data.result)
          setIsTraining(false)
          console.log("[Training] Training completed successfully!")
        } else if (data.status === "failed" || data.status === "completed_with_error") {
          setTrainingError("Training failed. Check logs for details.")
          setIsTraining(false)
        } else if (["submitted", "in_progress", "in_queue"].includes(data.status)) {
          // Continue polling
          setTimeout(() => pollTrainingStatus(requestId), 5000) // Poll every 5 seconds
        }
      } else {
        throw new Error(data.error || "Failed to get training status")
      }
    } catch (err) {
      console.error("[Training] Status check error:", err)
      setTrainingError(err instanceof Error ? err.message : "Failed to check training status")
      setIsTraining(false)
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
          
          {/* RAG Selector - aligned to the right */}
          <div className="flex-shrink-0">
            <RAGSelector 
              onUploadClick={() => {
                // Switch to Upload Branding tab when upload is clicked
                const tabsTrigger = document.querySelector('[value="upload-branding"]') as HTMLElement
                tabsTrigger?.click()
              }}
            />
          </div>
        </div>

        <Tabs defaultValue="flux-ultra-finetuned" className="w-full max-w-6xl mx-auto">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="qwen-text-to-image" style={{ display: 'none' }}>Generate Image</TabsTrigger>
          <TabsTrigger value="flux-ultra-finetuned">Generate Images</TabsTrigger>
          <TabsTrigger value="flux-pro-image-combine">Combine Images</TabsTrigger>
          {/* <TabsTrigger value="qwen-image-to-image">Image to Image</TabsTrigger> */}
          <TabsTrigger value="edit-image">Edit Image</TabsTrigger>
          <TabsTrigger value="sedream-v4-edit">Apply style</TabsTrigger>
          <TabsTrigger value="flux-pro-text-to-image" style={{ display: 'none' }}>Flux Lora</TabsTrigger>
          {/* <TabsTrigger value="upload-branding" style={{ display: 'none' }}>Upload Branding</TabsTrigger>
          <TabsTrigger value="qwen-train-lora" style={{ display: 'none' }}>Train LoRA</TabsTrigger> */}
        </TabsList>

          {/* Qwen Text-to-Image Tab */}
          <TabsContent value="qwen-text-to-image" className="space-y-6" style={{ display: 'none' }}>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Qwen Generation Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Qwen Text-to-Image
                  </CardTitle>
                  <CardDescription>Advanced text-to-image generation with Qwen model</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <form onSubmit={handleQwenSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="qwenPrompt">Prompt</Label>
                      <Textarea
                        id="qwenPrompt"
                        placeholder="Describe the image you want to generate. Supports both text and JSON format for advanced control."
                        value={qwenPrompt}
                        onChange={(e) => setQwenPrompt(e.target.value)}
                        rows={3}
                      />
                    </div>

                    {/* RAG Toggle */}
                    <div className="flex items-center justify-between p-3 border rounded-lg bg-gradient-to-r from-background to-muted/30">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${useRag ? 'bg-green-500' : 'bg-gray-400'} transition-colors`}></div>
                        <div className="flex-1">
                          <Label htmlFor="useRag" className="font-medium cursor-pointer">
                            Use Branding Guidelines (RAG)
                          </Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            {useRag ? 'Active - Prompts will be enhanced with EGP brand guidelines' : 'Inactive - Using original prompts only'}
                          </p>
                        </div>
                      </div>
                      <Checkbox
                        id="useRag"
                        checked={useRag}
                        onCheckedChange={(checked) => setUseRag(checked as boolean)}
                        className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                      />
                    </div>

                    <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
                      <div className="flex items-center justify-between p-3 border rounded-lg bg-gradient-to-r from-background to-muted/30">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${useCustomLoRA ? 'bg-purple-500' : 'bg-gray-400'} transition-colors`}></div>
                          <div>
                            <Label htmlFor="useCustomLoRA" className="font-medium cursor-pointer">
                              Use Custom LoRA Style
                            </Label>
                            <p className="text-xs text-muted-foreground mt-1">
                              {useCustomLoRA ? 'Active - Custom LoRA style will be applied' : 'Inactive - Using base model only'}
                            </p>
                          </div>
                        </div>
                        <Checkbox
                          id="useCustomLoRA"
                          checked={useCustomLoRA}
                          onCheckedChange={(checked) => setUseCustomLoRA(checked as boolean)}
                          className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                        />
                      </div>
                      
                      {useCustomLoRA && (
                        <div className="space-y-3 ml-6">
                          <div className="space-y-2">
                            <Label htmlFor="loraUrl" className="text-sm">LoRA Model URL</Label>
                            <Input
                              id="loraUrl"
                              value={loraUrl}
                              onChange={(e) => setLoraUrl(e.target.value)}
                              placeholder="https://v3.fal.media/files/..."
                              className="text-sm"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="triggerPhrase" className="text-sm">Trigger Phrase</Label>
                            <Input
                              id="triggerPhrase"
                              value={triggerPhrase}
                              onChange={(e) => setTriggerPhrase(e.target.value)}
                              placeholder="your trained style"
                              className="text-sm"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="loraScale" className="text-sm">LoRA Strength: {loraScale}</Label>
                            <input
                              id="loraScale"
                              type="range"
                              min="0.1"
                              max="2.0"
                              step="0.1"
                              value={loraScale}
                              onChange={(e) => setLoraScale(parseFloat(e.target.value))}
                              className="w-full"
                            />
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Subtle (0.1)</span>
                              <span>Strong (2.0)</span>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <p className="text-xs text-muted-foreground">
                        Custom LoRA allows you to use your trained style. The trigger phrase will be automatically added to your prompt.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                        className="flex items-center gap-2"
                      >
                        <Settings className="h-4 w-4" />
                        {showAdvancedSettings ? "Hide" : "Show"} Advanced Settings
                      </Button>

                      {showAdvancedSettings && (
                        <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
                          <div className="space-y-2">
                            <Label htmlFor="imageSize">Image Size</Label>
                            <Select
                              value={qwenSettings.image_size}
                              onValueChange={(value) => setQwenSettings(prev => ({ ...prev, image_size: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="square_hd">Square HD</SelectItem>
                                <SelectItem value="square">Square</SelectItem>
                                <SelectItem value="portrait_4_3">Portrait 4:3</SelectItem>
                                <SelectItem value="portrait_16_9">Portrait 16:9</SelectItem>
                                <SelectItem value="landscape_4_3">Landscape 4:3</SelectItem>
                                <SelectItem value="landscape_16_9">Landscape 16:9</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="acceleration">Acceleration</Label>
                            <Select
                              value={qwenSettings.acceleration}
                              onValueChange={(value) => setQwenSettings(prev => ({ ...prev, acceleration: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                <SelectItem value="regular">Regular</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="steps">Inference Steps</Label>
                            <Input
                              id="steps"
                              type="number"
                              min="1"
                              max="100"
                              value={qwenSettings.num_inference_steps}
                              onChange={(e) => setQwenSettings(prev => ({ ...prev, num_inference_steps: parseInt(e.target.value) || 30 }))}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="guidance">Guidance Scale</Label>
                            <Input
                              id="guidance"
                              type="number"
                              min="1"
                              max="20"
                              step="0.1"
                              value={qwenSettings.guidance_scale}
                              onChange={(e) => setQwenSettings(prev => ({ ...prev, guidance_scale: parseFloat(e.target.value) || 2.5 }))}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="numImages">Number of Images</Label>
                            <Input
                              id="numImages"
                              type="number"
                              min="1"
                              max="4"
                              value={qwenSettings.num_images}
                              onChange={(e) => setQwenSettings(prev => ({ ...prev, num_images: parseInt(e.target.value) || 1 }))}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="seed">Seed (optional)</Label>
                            <Input
                              id="seed"
                              type="number"
                              placeholder="Random if empty"
                              value={qwenSettings.seed}
                              onChange={(e) => setQwenSettings(prev => ({ ...prev, seed: e.target.value }))}
                            />
                          </div>

                          <div className="space-y-2 col-span-2">
                            <Label htmlFor="negativePrompt">Negative Prompt</Label>
                            <Input
                              id="negativePrompt"
                              placeholder="What to avoid in the image"
                              value={qwenSettings.negative_prompt}
                              onChange={(e) => setQwenSettings(prev => ({ ...prev, negative_prompt: e.target.value }))}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="customWidth">Custom Width</Label>
                            <Input
                              id="customWidth"
                              type="number"
                              placeholder="Leave empty for preset"
                              value={qwenSettings.width}
                              onChange={(e) => setQwenSettings(prev => ({ ...prev, width: e.target.value }))}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="customHeight">Custom Height</Label>
                            <Input
                              id="customHeight"
                              type="number"
                              placeholder="Leave empty for preset"
                              value={qwenSettings.height}
                              onChange={(e) => setQwenSettings(prev => ({ ...prev, height: e.target.value }))}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <Button type="submit" className="w-full" disabled={!qwenPrompt.trim() || isQwenGenerating}>
                      {isQwenGenerating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Zap className="mr-2 h-4 w-4" />
                          Generate Image
                        </>
                      )}
                    </Button>
                  </form>

                  {/* Display generated prompt */}
                  <GeneratedPromptDisplay 
                    prompt={qwenGeneratedPrompt} 
                    title="Generated Prompt Used"
                  />

                  {qwenError && (
                    <div className="p-4 border border-amber-200 bg-amber-50 text-amber-800 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <div className="text-2xl">🚫</div>
                        <div className="flex-1">
                          <div className="font-medium mb-2">Content Not Allowed</div>
                          <div className="text-sm mb-3">{qwenError}</div>
                          <div className="text-xs bg-amber-100 p-2 rounded border border-amber-200">
                            <div className="font-medium mb-1">💡 Examples of appropriate content:</div>
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

              {/* Qwen Result Preview */}
              <Card>
                <CardHeader>
                  <CardTitle>Generated Image</CardTitle>
                  <CardDescription>Your Qwen-generated image</CardDescription>
                </CardHeader>
                <CardContent>
                  {isQwenGenerating ? (
                    <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <Loader2 className="h-12 w-12 mx-auto mb-2 animate-spin" />
                        <p className="text-muted-foreground">Generating image...</p>
                      </div>
                    </div>
                  ) : qwenImageUrl ? (
                    <div className="space-y-3">
                      <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                        <img
                          src={qwenImageUrl || "/placeholder.svg"}
                          alt="Qwen generated image"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <OpenInNewTabButton imageUrl={qwenImageUrl} />
                    </div>
                  ) : (
                    <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                      <div className="text-center text-muted-foreground">
                        <Zap className="h-12 w-12 mx-auto mb-2" />
                        <p>No image generated yet</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

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

                    {/* JSON Enhancement Toggle */}
                    <div className="flex items-center justify-between p-3 border rounded-lg bg-gradient-to-r from-background to-purple-50/50 dark:to-purple-900/20">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${useSedreamJSONEnhancement ? 'bg-purple-500' : 'bg-gray-400'} transition-colors`}></div>
                        <div>
                          <Label htmlFor="use-sedream-json-enhancement" className="font-medium cursor-pointer">
                            JSON Enhancement
                          </Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            {useSedreamJSONEnhancement ? 'Active - Advanced prompt structuring enabled' : 'Inactive - Using original prompts only'}
                          </p>
                        </div>
                      </div>
                      <Switch 
                        id="use-sedream-json-enhancement" 
                        checked={useSedreamJSONEnhancement}
                        onCheckedChange={setUseSedreamJSONEnhancement}
                      />
                    </div>

                    {/* JSON Enhancement Controls */}
                    {useSedreamJSONEnhancement && (
                      <div className="space-y-4 p-4 bg-gradient-to-r from-purple-50/50 to-background dark:from-purple-900/20 dark:to-background rounded-lg border border-purple-200/50 dark:border-purple-700/50">
                        {/* Intensity Slider */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="sedream-json-intensity" className="text-sm font-medium">
                              Enhancement Intensity
                            </Label>
                            <span className="text-xs text-muted-foreground bg-purple-100 dark:bg-purple-900/50 px-2 py-1 rounded">
                              {sedreamJsonIntensity.toFixed(1)}
                            </span>
                          </div>
                          <Slider
                            id="sedream-json-intensity"
                            min={0.1}
                            max={1.0}
                            step={0.1}
                            value={[sedreamJsonIntensity]}
                            onValueChange={(value) => setSedreamJsonIntensity(value[0])}
                            className="w-full"
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Subtle</span>
                            <span>Moderate</span>
                            <span>Strong</span>
                          </div>
                        </div>



                        {/* Preview Button */}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full"
                          disabled={!sedreamCustomEnhancementText.trim() || !useSedreamJSONEnhancement}
                          onClick={() => generateSedreamEnhancementPreview(sedreamCustomEnhancementText)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Preview Enhancement
                        </Button>

                        {/* Enhancement Preview Display */}
                        {sedreamEnhancementPreview && sedreamEnhancementMeta && (
                          <EnhancementPreview
                            strategy="json-only"
                            ragApplied={sedreamEnhancementMeta.ragApplied}
                            jsonApplied={sedreamEnhancementMeta.jsonApplied}
                            totalEnhancements={sedreamEnhancementMeta.totalEnhancements}
                            processingTime={sedreamEnhancementMeta.processingTime}
                            enhancementSources={sedreamEnhancementMeta.enhancementSources}
                            previewText={sedreamEnhancementPreview}
                          />
                        )}
                      </div>
                    )}

                    <Button type="submit" className="w-full" disabled={!sedreamImage || !sedreamCustomEnhancementText.trim() || isSedreamLoading}>
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
                        placeholder="Describe the image you want to generate..."
                        value={fluxProPrompt}
                        onChange={(e) => setFluxProPrompt(e.target.value)}
                        required
                        rows={3}
                        disabled={isFluxProGenerating}
                      />
                    </div>

                    {/* HYBRID ENHANCEMENT CONTROLS */}
                    <div className="space-y-4 p-4 border rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm font-semibold">Enhancement Strategy</Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            {getStrategyDescription({
                              useRAG: hybridStrategy === 'rag-only' || hybridStrategy === 'hybrid',
                              useJSONEnhancement: hybridStrategy === 'json-only' || hybridStrategy === 'hybrid'
                            })}
                          </p>
                        </div>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                          hybridStrategy === 'hybrid' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                          hybridStrategy === 'rag-only' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                          hybridStrategy === 'json-only' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                        }`}>
                          {hybridStrategy === 'hybrid' ? 'HYBRID' :
                           hybridStrategy === 'rag-only' ? 'RAG ONLY' :
                           hybridStrategy === 'json-only' ? 'JSON ONLY' : 'NONE'}
                        </div>
                      </div>
                      
                      {/* Strategy Selector */}
                      <Select value={hybridStrategy} onValueChange={(value: any) => setHybridStrategy(value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select enhancement strategy" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                              <span>No Enhancement</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="rag-only">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                              <span>RAG Only (Brand Guidelines)</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="json-only">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-green-500"></div>
                              <span>JSON Only (Technical Style)</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="hybrid">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                              <span>Hybrid (RAG + JSON)</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      
                      {/* JSON Enhancement Intensity (only show if JSON is enabled) */}
                      {(hybridStrategy === 'json-only' || hybridStrategy === 'hybrid') && (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-sm">Enhancement Intensity</Label>
                              <span className="text-xs text-muted-foreground">{Math.round(jsonIntensity * 100)}%</span>
                            </div>
                            <Slider
                              value={[jsonIntensity]}
                              onValueChange={(value) => setJsonIntensity(value[0])}
                              min={0.1}
                              max={1.0}
                              step={0.1}
                              className="w-full"
                            />
                          </div>
                          
                          {/* Custom Enhancement Text */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-sm">Enhancement Style Text</Label>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setCustomEnhancementText(defaultEnhancementText)}
                                className="h-6 px-2 text-xs"
                                disabled={customEnhancementText === defaultEnhancementText}
                              >
                                Reset to Default
                              </Button>
                            </div>
                            <Textarea
                              placeholder="Enter custom enhancement text..."
                              value={customEnhancementText}
                              onChange={(e) => setCustomEnhancementText(e.target.value)}
                              className="min-h-[120px] text-sm"
                              disabled={isFluxProGenerating}
                            />
                            <p className="text-xs text-muted-foreground">
                              This text will be added to your prompt to define the artistic style. 
                              Intensity controls how much of this text is used (100% = full text, lower values = truncated).
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {/* Preview Enhancement Button */}
                      {hybridStrategy !== 'none' && fluxProPrompt.trim() && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => generateEnhancementPreview(fluxProPrompt)}
                          className="w-full"
                          disabled={isFluxProGenerating}
                        >
                          <Sparkles className="h-4 w-4 mr-2" />
                          Preview Enhancement
                        </Button>
                      )}
                    </div>

                    {/* Enhancement Preview Display */}
                    {enhancementPreview && enhancementMeta && (
                      <EnhancementPreview
                        strategy={hybridStrategy}
                        ragApplied={enhancementMeta.ragApplied}
                        jsonApplied={enhancementMeta.jsonApplied}
                        totalEnhancements={enhancementMeta.totalEnhancements}
                        processingTime={enhancementMeta.processingTime}
                        enhancementSources={enhancementMeta.enhancementSources}
                        previewText={enhancementPreview}
                      />
                    )}

                    {/* RAG Selector (only show if RAG is enabled) */}
                    {(hybridStrategy === 'rag-only' || hybridStrategy === 'hybrid') && (
                      <RAGSelector />
                    )}

                    {/* LoRA Toggle */}
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${useFluxProLoRA ? 'bg-orange-500' : 'bg-gray-400'} transition-colors`}></div>
                        <div>
                          <Label htmlFor="use-flux-pro-lora" className="text-sm font-medium cursor-pointer">
                            Apply Custom LoRA Style
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            {useFluxProLoRA ? 'Active - Custom style training applied' : 'Inactive - Using base model only'}
                          </p>
                        </div>
                      </div>
                      <Switch
                        id="use-flux-pro-lora"
                        checked={useFluxProLoRA}
                        onCheckedChange={setUseFluxProLoRA}
                        disabled={isFluxProGenerating}
                      />
                    </div>

                    {/* LoRA Configuration */}
                    {useFluxProLoRA && (
                      <Card className="p-4 space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="flux-pro-lora-url">LoRA Model URL</Label>
                          <Input
                            id="flux-pro-lora-url"
                            type="url"
                            placeholder="https://v3.fal.media/files/your-lora.safetensors"
                            value={fluxProLoraUrl}
                            onChange={(e) => setFluxProLoraUrl(e.target.value)}
                            disabled={isFluxProGenerating}
                          />
                          <p className="text-xs text-muted-foreground">
                            URL to your trained LoRA model (must be publicly accessible)
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="flux-pro-trigger-phrase">Trigger Phrase (Optional)</Label>
                          <Input
                            id="flux-pro-trigger-phrase"
                            type="text"
                            placeholder="e.g., in the style of xyz, mystyle, etc."
                            value={fluxProTriggerPhrase}
                            onChange={(e) => setFluxProTriggerPhrase(e.target.value)}
                            disabled={isFluxProGenerating}
                          />
                          <p className="text-xs text-muted-foreground">
                            Special words that activate your LoRA style (leave empty if not needed)
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="flux-pro-lora-scale">LoRA Scale: {fluxProLoraScale}</Label>
                          <Slider
                            id="flux-pro-lora-scale"
                            min={0.1}
                            max={2.0}
                            step={0.1}
                            value={[fluxProLoraScale]}
                            onValueChange={(value) => setFluxProLoraScale(value[0])}
                            disabled={isFluxProGenerating}
                            className="w-full"
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Subtle (0.1)</span>
                            <span>Balanced (1.0)</span>
                            <span>Strong (2.0)</span>
                          </div>
                        </div>
                      </Card>
                    )}

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
                                🚀 Enhanced RAG + LoRA Strategy
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
                          onClick={() => {
                            const link = document.createElement('a')
                            link.href = fluxProImageUrl
                            link.download = 'flux-pro-generated-image.png'
                            document.body.appendChild(link)
                            link.click()
                            document.body.removeChild(link)
                          }}
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
                                    ×
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
                              ×
                            </Button>
                          </div>
                        ))}
                      </div>

                      <div className="text-sm text-muted-foreground">
                        Total images: {fluxCombineImages.length + fluxCombineImageUrls.filter(url => url.trim()).length}
                      </div>
                    </div>

                    {/* Prompt Section */}
                    <div className="space-y-2">
                      <Label htmlFor="flux-combine-prompt">Prompt</Label>
                      <Textarea
                        id="flux-combine-prompt"
                        placeholder="Describe how you want to combine the images..."
                        value={fluxCombinePrompt}
                        onChange={(e) => setFluxCombinePrompt(e.target.value)}
                        className="min-h-[100px]"
                      />
                    </div>

                    {/* JSON Enhancement Section */}
                    <div className="space-y-4 p-4 border rounded-lg bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="flux-combine-json-enhancement"
                              checked={fluxCombineUseJSONEnhancement}
                              onCheckedChange={setFluxCombineUseJSONEnhancement}
                              className="data-[state=checked]:bg-purple-500 data-[state=unchecked]:bg-gray-300 dark:data-[state=unchecked]:bg-gray-600"
                            />
                            <Label htmlFor="flux-combine-json-enhancement" className="cursor-pointer font-medium">
                              JSON Enhancement
                            </Label>
                          </div>
                          <div className={`w-2 h-2 rounded-full ${fluxCombineUseJSONEnhancement ? 'bg-purple-500' : 'bg-gray-400'} transition-colors`}></div>
                        </div>
                        
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={!fluxCombinePrompt.trim() || !fluxCombineUseJSONEnhancement}
                          onClick={() => generateFluxCombineEnhancementPreview(fluxCombinePrompt)}
                          className="text-xs"
                        >
                          Preview Enhancement
                        </Button>
                      </div>

                      {fluxCombineUseJSONEnhancement && (
                        <div className="space-y-4">
                          {/* JSON Enhancement Intensity */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-sm">JSON Enhancement Intensity</Label>
                              <span className="text-xs text-muted-foreground">{(fluxCombineJsonIntensity * 100).toFixed(0)}%</span>
                            </div>
                            <Slider
                              value={[fluxCombineJsonIntensity]}
                              onValueChange={(value) => setFluxCombineJsonIntensity(value[0])}
                              max={1.0}
                              min={0.1}
                              step={0.1}
                              className="w-full"
                            />
                          </div>

                          {/* Custom Enhancement Text */}
                          <div className="space-y-2">
                            <Label className="text-sm">Enhancement Description</Label>
                            <Textarea
                              value={fluxCombineCustomEnhancementText}
                              onChange={(e) => setFluxCombineCustomEnhancementText(e.target.value)}
                              placeholder="Describe the visual enhancements you want to apply..."
                              className="min-h-[80px] text-sm"
                            />
                            <div className="text-xs text-muted-foreground">
                              Edit this description to customize how your prompts are enhanced. This affects image style, composition, and technical details.
                            </div>
                          </div>

                          {/* Enhancement Preview */}
                          {fluxCombineEnhancementPreview && (
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Enhanced Prompt Preview</Label>
                              <div className="p-3 bg-white dark:bg-gray-900 rounded-md border text-sm max-h-32 overflow-y-auto">
                                {fluxCombineEnhancementPreview}
                              </div>
                              {fluxCombineEnhancementMeta && (
                                <EnhancementPreview 
                                  strategy="json-only"
                                  ragApplied={false}
                                  jsonApplied={fluxCombineEnhancementMeta.jsonApplied}
                                  totalEnhancements={fluxCombineEnhancementMeta.totalEnhancements}
                                  processingTime={fluxCombineEnhancementMeta.processingTime}
                                />
                              )}
                            </div>
                          )}
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
                        onClick={() => window.open(fluxCombineResult, '_blank')}
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

          {/* Image-to-Image Tab - HIDDEN
          <TabsContent value="qwen-image-to-image" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              Upload and Form Section
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" />
                    Transform Image
                  </CardTitle>
                  <CardDescription>
                    Upload an image and transform it using AI with Qwen Image-to-Image
                  </CardDescription>
                </CardHeader>
                ... rest of content hidden ...
              </Card>
            </div>
            Generated Prompt Display hidden...
          </TabsContent>
          */}

          {/* Edit Image Tab */}
          <TabsContent value="edit-image" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Upload and Form Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Upload & Edit
                  </CardTitle>
                  <CardDescription>Select an image and describe your desired edits</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="image">Select Image</Label>
                      <Input
                        id="image"
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="cursor-pointer"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="prompt">Edit Prompt</Label>
                      <Textarea
                        id="prompt"
                        placeholder="Describe how you want to edit the image (e.g., 'change the sky to sunset', 'add a cat in the corner', 'make it black and white')"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-image-size">Output Image Size</Label>
                      <Select value={editImageSize} onValueChange={setEditImageSize}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select image size" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="square_hd">Square HD</SelectItem>
                          <SelectItem value="square">Square</SelectItem>
                          <SelectItem value="portrait_4_3">Portrait 4:3</SelectItem>
                          <SelectItem value="portrait_16_9">Portrait 16:9</SelectItem>
                          <SelectItem value="landscape_4_3">Landscape 4:3</SelectItem>
                          <SelectItem value="landscape_16_9">Landscape 16:9</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Custom dimensions fields when 'custom' is selected */}
                    {editImageSize === 'custom' && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="custom-width">Width (px)</Label>
                            <Input
                              id="custom-width"
                              type="number"
                              min="256"
                              max="2048"
                              step="64"
                              value={customWidth}
                              onChange={(e) => setCustomWidth(e.target.value)}
                              placeholder="1024"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="custom-height">Height (px)</Label>
                            <Input
                              id="custom-height"
                              type="number"
                              min="256"
                              max="2048"
                              step="64"
                              value={customHeight}
                              onChange={(e) => setCustomHeight(e.target.value)}
                              placeholder="1024"
                            />
                          </div>
                        </div>
                        <Alert>
                          <AlertDescription className="text-sm">
                            <strong>Note:</strong> The AI model may adjust dimensions to maintain image quality and aspect ratios. Final output may vary from exact specifications.
                          </AlertDescription>
                        </Alert>
                      </div>
                    )}

                    {/* RAG Toggle - Hidden (disabled by default) */}
                    {false && (
                      <div className="flex items-center justify-between p-3 border rounded-lg bg-gradient-to-r from-background to-muted/30">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${useRagEdit ? 'bg-green-500' : 'bg-gray-400'} transition-colors`}></div>
                          <div>
                            <Label htmlFor="use-rag-edit" className="font-medium cursor-pointer">
                              Use brand guidelines (RAG)
                            </Label>
                            <p className="text-xs text-muted-foreground mt-1">
                              {useRagEdit ? 'Active - Prompts will be enhanced with brand guidelines' : 'Inactive - Using original prompts only'}
                            </p>
                          </div>
                        </div>
                        <Checkbox 
                          id="use-rag-edit" 
                          checked={useRagEdit}
                          onCheckedChange={(checked) => setUseRagEdit(checked as boolean)}
                          className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                        />
                      </div>
                    )}

                    {/* JSON Enhancement Toggle */}
                    <div className="flex items-center justify-between p-3 border rounded-lg bg-gradient-to-r from-background to-purple-50/50 dark:to-purple-900/20">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${useEditJSONEnhancement ? 'bg-purple-500' : 'bg-gray-400'} transition-colors`}></div>
                        <div>
                          <Label htmlFor="use-edit-json-enhancement" className="font-medium cursor-pointer">
                            JSON Enhancement
                          </Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            {useEditJSONEnhancement ? 'Active - Advanced prompt structuring enabled' : 'Inactive - Using original prompts only'}
                          </p>
                        </div>
                      </div>
                      <Switch 
                        id="use-edit-json-enhancement" 
                        checked={useEditJSONEnhancement}
                        onCheckedChange={setUseEditJSONEnhancement}
                      />
                    </div>

                    {/* JSON Enhancement Controls */}
                    {useEditJSONEnhancement && (
                      <div className="space-y-4 p-4 bg-gradient-to-r from-purple-50/50 to-background dark:from-purple-900/20 dark:to-background rounded-lg border border-purple-200/50 dark:border-purple-700/50">
                        {/* Intensity Slider */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="edit-json-intensity" className="text-sm font-medium">
                              Enhancement Intensity
                            </Label>
                            <span className="text-xs text-muted-foreground bg-purple-100 dark:bg-purple-900/50 px-2 py-1 rounded">
                              {editJsonIntensity.toFixed(1)}
                            </span>
                          </div>
                          <Slider
                            id="edit-json-intensity"
                            min={0.1}
                            max={1.0}
                            step={0.1}
                            value={[editJsonIntensity]}
                            onValueChange={(value) => setEditJsonIntensity(value[0])}
                            className="w-full"
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Subtle</span>
                            <span>Moderate</span>
                            <span>Strong</span>
                          </div>
                        </div>

                        {/* Custom Enhancement Text */}
                        <div className="space-y-2">
                          <Label htmlFor="edit-custom-enhancement" className="text-sm font-medium">
                            Custom Enhancement Text (Optional)
                          </Label>
                          <Textarea
                            id="edit-custom-enhancement"
                            placeholder="Enter custom enhancement instructions..."
                            value={editCustomEnhancementText}
                            onChange={(e) => setEditCustomEnhancementText(e.target.value)}
                            rows={2}
                            className="text-sm"
                          />
                        </div>

                        {/* Preview Button */}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full"
                          disabled={!prompt.trim() || !useEditJSONEnhancement}
                          onClick={() => generateEditEnhancementPreview(prompt)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Preview Enhancement
                        </Button>

                        {/* Enhancement Preview Display */}
                        {editEnhancementPreview && editEnhancementMeta && (
                          <EnhancementPreview
                            strategy="json-only"
                            ragApplied={editEnhancementMeta.ragApplied}
                            jsonApplied={editEnhancementMeta.jsonApplied}
                            totalEnhancements={editEnhancementMeta.totalEnhancements}
                            processingTime={editEnhancementMeta.processingTime}
                            enhancementSources={editEnhancementMeta.enhancementSources}
                            previewText={editEnhancementPreview}
                          />
                        )}
                      </div>
                    )}

                    <Button type="submit" className="w-full" disabled={!selectedImage || !prompt.trim() || isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Editing Image...
                        </>
                      ) : (
                        <>
                          <Wand2 className="mr-2 h-4 w-4" />
                          Edit Image
                        </>
                      )}
                    </Button>
                  </form>

                  {/* Display generated prompt */}
                  <GeneratedPromptDisplay 
                    prompt={editGeneratedPrompt} 
                    title="Generated Prompt Used"
                  />

                  {error && <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">{error}</div>}
                </CardContent>
              </Card>

              {/* Preview Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Original Image</CardTitle>
                  <CardDescription>Preview of your uploaded image</CardDescription>
                </CardHeader>
                <CardContent>
                  {previewUrl ? (
                    <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                      <img
                        src={previewUrl || "/placeholder.svg"}
                        alt="Original image preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                      <div className="text-center text-muted-foreground">
                        <Upload className="h-12 w-12 mx-auto mb-2" />
                        <p>No image selected</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Result Section */}
            {(editedImageUrl || isLoading) && (
              <Card>
                <CardHeader>
                  <CardTitle>Edited Result</CardTitle>
                  <CardDescription>Your AI-edited image</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <Loader2 className="h-12 w-12 mx-auto mb-2 animate-spin" />
                        <p className="text-muted-foreground">Processing your image...</p>
                      </div>
                    </div>
                  ) : editedImageUrl ? (
                    <div className="space-y-3">
                      <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                        <img
                          src={editedImageUrl || "/placeholder.svg"}
                          alt="Edited image result"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <OpenInNewTabButton imageUrl={editedImageUrl} />
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Branding Configuration Tab */}
          <TabsContent value="upload-branding" className="space-y-6" style={{ display: 'none' }}>
            <div className="flex justify-center">
              <BrandingUploader 
                onUploadSuccess={() => {
                  // Optional: Add any refresh logic here
                  console.log('Branding file uploaded successfully!')
                }}
              />
            </div>
          </TabsContent>

          {/* Train LoRA Tab */}
          <TabsContent value="qwen-train-lora" className="space-y-6" style={{ display: 'none' }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Train Custom LoRA Model
                </CardTitle>
                <CardDescription>
                  Train a custom LoRA model using your own images and captions. Upload a ZIP file containing images and corresponding text files.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleTrainingSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      {/* Training File Upload */}
                      <div className="space-y-2">
                        <Label htmlFor="training-file-upload">Training Data (ZIP)</Label>
                        <Input
                          id="training-file-upload"
                          type="file"
                          accept=".zip"
                          onChange={handleTrainingFileUpload}
                          required
                        />
                        <p className="text-sm text-muted-foreground">
                          Upload a ZIP file containing images (PNG, JPG, JPEG, WEBP) and corresponding .txt files with captions.
                          Each image should have a matching text file (e.g., image1.jpg + image1.txt).
                          Use at least 10 images for best results.
                        </p>
                        {trainingFile && (
                          <div className="p-2 bg-muted rounded-lg">
                            <p className="text-sm font-medium">Selected: {trainingFile.name}</p>
                            <p className="text-sm text-muted-foreground">Size: {(trainingFile.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        )}
                      </div>

                      {/* Basic Settings */}
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="training-steps">Training Steps</Label>
                            <Input
                              id="training-steps"
                              type="number"
                              min="100"
                              max="10000"
                              value={trainingSettings.steps}
                              onChange={(e) => setTrainingSettings(prev => ({ 
                                ...prev, 
                                steps: parseInt(e.target.value) || 1000 
                              }))}
                            />
                            <p className="text-xs text-muted-foreground">More steps = better quality, longer training time</p>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="training-lr">Learning Rate</Label>
                            <Input
                              id="training-lr"
                              type="number"
                              step="0.00001"
                              min="0.00001"
                              max="0.01"
                              value={trainingSettings.learning_rate}
                              onChange={(e) => setTrainingSettings(prev => ({ 
                                ...prev, 
                                learning_rate: parseFloat(e.target.value) || 0.0005 
                              }))}
                            />
                            <p className="text-xs text-muted-foreground">Lower = more stable, higher = faster convergence</p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="trigger-phrase">Trigger Phrase (Optional)</Label>
                          <Input
                            id="trigger-phrase"
                            placeholder="e.g., 'egp style', 'my trained style'"
                            value={trainingSettings.trigger_phrase}
                            onChange={(e) => setTrainingSettings(prev => ({ 
                              ...prev, 
                              trigger_phrase: e.target.value 
                            }))}
                          />
                          <p className="text-xs text-muted-foreground">
                            Default caption for images without text files. Use this to create a unique trigger phrase for your style.
                          </p>
                        </div>
                      </div>

                      <Button type="submit" disabled={isTraining} className="w-full">
                        {isTraining ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Training in Progress...
                          </>
                        ) : (
                          "Start Training"
                        )}
                      </Button>

                      {uploadProgress && (
                        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          <span className="text-sm text-blue-800">{uploadProgress}</span>
                        </div>
                      )}

                      {trainingError && (
                        <Alert variant="destructive">
                          <AlertDescription>{trainingError}</AlertDescription>
                        </Alert>
                      )}
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Training Status & Results</h3>
                      
                      {trainingRequestId && (
                        <div className="space-y-4">
                          <div className="p-4 bg-muted rounded-lg">
                            <p className="text-sm font-medium">Training ID: {trainingRequestId}</p>
                            <p className="text-sm text-muted-foreground">Status: {trainingStatus}</p>
                          </div>

                          {trainingLogs.length > 0 && (
                            <div className="space-y-2">
                              <Label>Training Logs</Label>
                              <div className="bg-black text-green-400 p-4 rounded-lg max-h-64 overflow-y-auto font-mono text-xs">
                                {trainingLogs.map((log, index) => (
                                  <div key={index}>{log}</div>
                                ))}
                              </div>
                            </div>
                          )}

                          {trainingResult && (
                            <div className="space-y-4">
                              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                <h4 className="font-semibold text-green-800 mb-2">Training Completed Successfully!</h4>
                                
                                <div className="space-y-2">
                                  <div>
                                    <Label className="text-green-700">LoRA Model File:</Label>
                                    <div className="flex items-center gap-2 mt-1">
                                      <Input 
                                        value={trainingResult.lora_file.url} 
                                        readOnly 
                                        className="text-xs"
                                      />
                                      <Button
                                        onClick={() => window.open(trainingResult.lora_file.url, '_blank')}
                                        variant="outline"
                                        size="sm"
                                      >
                                        Download
                                      </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      Size: {(trainingResult.lora_file.file_size / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                  </div>

                                  <div>
                                    <Label className="text-green-700">Config File:</Label>
                                    <div className="flex items-center gap-2 mt-1">
                                      <Input 
                                        value={trainingResult.config_file.url} 
                                        readOnly 
                                        className="text-xs"
                                      />
                                      <Button
                                        onClick={() => window.open(trainingResult.config_file.url, '_blank')}
                                        variant="outline"
                                        size="sm"
                                      >
                                        Download
                                      </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      Size: {(trainingResult.config_file.file_size / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                  </div>
                                </div>

                                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                                  <p className="text-sm text-blue-800">
                                    <strong>Next Steps:</strong> You can now use this LoRA model in other Qwen endpoints by providing the LoRA file URL.
                                    Use your trigger phrase "{trainingSettings.trigger_phrase || 'your trained style'}" in prompts to activate the custom style.
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {!trainingRequestId && !isTraining && (
                        <div className="text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg">
                          <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>Training status and results will appear here</p>
                          <p className="text-sm mt-2">Upload a ZIP file and start training to begin</p>
                        </div>
                      )}
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
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
                        placeholder="Describe the image you want to generate"
                        value={fluxUltraPrompt}
                        onChange={(e) => setFluxUltraPrompt(e.target.value)}
                        rows={3}
                      />
                    </div>

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

                    <Button type="submit" className="w-full" disabled={!fluxUltraPrompt.trim() || isFluxUltraGenerating}>
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
                        <div className="text-2xl">🚫</div>
                        <div className="flex-1">
                          <div className="font-medium mb-2">Content Not Allowed</div>
                          <div className="text-sm mb-3">{fluxUltraError}</div>
                          <div className="text-xs bg-amber-100 p-2 rounded border border-amber-200">
                            <div className="font-medium mb-1">💡 Examples of appropriate content:</div>
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
