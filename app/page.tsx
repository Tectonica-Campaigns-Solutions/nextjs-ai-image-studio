"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, Wand2, Loader2, Image as ImageIcon, Sparkles, Settings, Zap, FileText, ExternalLink } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { BrandingUploader } from "@/components/branding-uploader"
import RAGSelector from "@/components/rag-selector"
import { useRAGStore } from "@/lib/rag-store"

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
  const [useCustomLoRA, setUseCustomLoRA] = useState(false)
  // const [loraUrl, setLoraUrl] = useState("https://v3.fal.media/files/lion/p9zfHVb60jBBiVEbb8ahw_adapter.safetensors")
  // const [loraUrl, setLoraUrl] = useState("https://storage.googleapis.com/isolate-dev-hot-rooster_toolkit_public_bucket/github_110602490/0f076a59f424409db92b2f0e4e16402a_pytorch_lora_weights.safetensors")
  
  const [loraUrl, setLoraUrl] = useState("https://v3.fal.media/files/kangaroo/bUQL-AZq6ctnB1gifw2ku_pytorch_lora_weights.safetensors")

  const [triggerPhrase, setTriggerPhrase] = useState("")
  const [loraScale, setLoraScale] = useState(1.0)
  const [qwenGeneratedPrompt, setQwenGeneratedPrompt] = useState<string>("") // Store generated prompt

  // Flux Pro Text-to-Image States
  const [fluxProPrompt, setFluxProPrompt] = useState("")
  const [fluxProSettings, setFluxProSettings] = useState({
    image_size: "landscape_4_3",
    num_inference_steps: 28,
    guidance_scale: 3.5,
    num_images: 1,
    output_format: "png",
    enable_safety_checker: true,
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

  // Flux Pro LoRA States
  const [useFluxProLoRA, setUseFluxProLoRA] = useState(false)
  const [fluxProLoraUrl, setFluxProLoraUrl] = useState("")
  const [fluxProTriggerPhrase, setFluxProTriggerPhrase] = useState("")
  const [fluxProLoraScale, setFluxProLoraScale] = useState(1.0)

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
  const [useFluxProMultiLoRA, setUseFluxProMultiLoRA] = useState(false)
  const [fluxProMultiLoraUrl, setFluxProMultiLoraUrl] = useState("")
  const [fluxProMultiTriggerPhrase, setFluxProMultiTriggerPhrase] = useState("")
  const [fluxProMultiLoraScale, setFluxProMultiLoraScale] = useState(1.0)

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
  const [useRagFluxCombine, setUseRagFluxCombine] = useState(true)
  const [fluxCombineGeneratedPrompt, setFluxCombineGeneratedPrompt] = useState<string>("")
  const [showFluxCombineAdvanced, setShowFluxCombineAdvanced] = useState(false)

  // Edit Image States
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>("")
  const [prompt, setPrompt] = useState("")
  const [editedImageUrl, setEditedImageUrl] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>("")
  const [useRagEdit, setUseRagEdit] = useState(true) // RAG for edit image
  const [editGeneratedPrompt, setEditGeneratedPrompt] = useState<string>("") // Store generated prompt
  const [editImageSize, setEditImageSize] = useState("square_hd") // Image size for edit
  const [customWidth, setCustomWidth] = useState("1024") // Custom width for edit
  const [customHeight, setCustomHeight] = useState("1024") // Custom height for edit

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
  const [useImg2imgLoRA, setUseImg2imgLoRA] = useState(false)
  const [img2imgLoraUrl, setImg2imgLoraUrl] = useState("https://v3.fal.media/files/lion/p9zfHVb60jBBiVEbb8ahw_adapter.safetensors")
  const [img2imgTriggerPhrase, setImg2imgTriggerPhrase] = useState("")
  const [img2imgLoraScale, setImg2imgLoraScale] = useState(1.0)

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
        finalPrompt = `${qwenPrompt}, ${triggerPhrase}`
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
      
      // Enhance prompt with LoRA trigger phrase if enabled
      let finalPrompt = fluxProPrompt
      if (useFluxProLoRA && fluxProTriggerPhrase.trim()) {
        finalPrompt = `${fluxProPrompt}, ${fluxProTriggerPhrase}`
        console.log("[FRONTEND] Enhanced prompt with trigger phrase:", finalPrompt)
      }
      
      formData.append("prompt", finalPrompt)
      formData.append("useRag", useRagFluxPro.toString())
      
      // Add active RAG information
      const activeRAG = getActiveRAG()
      if (useRagFluxPro && activeRAG) {
        formData.append("activeRAGId", activeRAG.id)
        formData.append("activeRAGName", activeRAG.name)
      }
      
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
        finalPrompt = `${fluxProMultiPrompt}, ${fluxProMultiTriggerPhrase}`
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
      const formData = new FormData()
      
      formData.append("prompt", fluxCombinePrompt)
      formData.append("useRag", useRagFluxCombine.toString())
      
      // Add active RAG information
      const activeRAG = getActiveRAG()
      if (useRagFluxCombine && activeRAG) {
        formData.append("activeRAGId", activeRAG.id)
        formData.append("activeRAGName", activeRAG.name)
      }
      
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
      const settings = { ...fluxCombineSettings }
      
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
      
      // Capture generated prompt if available
      if (result.finalPrompt) {
        setFluxCombineGeneratedPrompt(result.finalPrompt)
      } else {
        setFluxCombineGeneratedPrompt(fluxCombinePrompt) // Fallback to original prompt
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
        finalPrompt = `${img2imgPrompt}, ${img2imgTriggerPhrase}`
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
              Generate, edit, and transform images using advanced Qwen and FLUX AI models
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

              <Tabs defaultValue="qwen-text-to-image" className="w-full max-w-6xl mx-auto">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="qwen-text-to-image">Generate Image</TabsTrigger>
          <TabsTrigger value="flux-pro-text-to-image">Flux Pro</TabsTrigger>
          <TabsTrigger value="flux-pro-image-combine">Combine Images</TabsTrigger>
          <TabsTrigger value="qwen-image-to-image">Image to Image</TabsTrigger>
          <TabsTrigger value="edit-image">Edit Image</TabsTrigger>
          <TabsTrigger value="upload-branding">Upload Branding</TabsTrigger>
          <TabsTrigger value="qwen-train-lora">Train LoRA</TabsTrigger>
        </TabsList>

          {/* Qwen Text-to-Image Tab */}
          <TabsContent value="qwen-text-to-image" className="space-y-6">
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

          {/* Flux Pro Text-to-Image Tab */}
          <TabsContent value="flux-pro-text-to-image" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Flux Pro Generation Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Flux Pro Text-to-Image
                  </CardTitle>
                  <CardDescription>
                    Generate high-quality images using Flux Pro Kontext Max model
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

                    {/* RAG Toggle */}
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${useRagFluxPro ? 'bg-green-500' : 'bg-gray-400'} transition-colors`}></div>
                        <div>
                          <Label htmlFor="use-rag-flux-pro" className="text-sm font-medium cursor-pointer">
                            Enhance with Branding Guidelines (RAG)
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            {useRagFluxPro ? 'Active - Prompts will be enhanced with brand guidelines' : 'Inactive - Using original prompts only'}
                          </p>
                        </div>
                      </div>
                      <Switch
                        id="use-rag-flux-pro"
                        checked={useRagFluxPro}
                        onCheckedChange={setUseRagFluxPro}
                        disabled={isFluxProGenerating}
                      />
                    </div>

                    {/* RAG Selector */}
                    <RAGSelector />

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
                        onCheckedChange={setShowFluxProAdvanced}
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
                                🚀 Hybrid Enhancement Active
                              </Label>
                              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                Your prompts get double enhancement: Our RAG branding + Flux Pro's native optimization
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
                    Your Flux Pro generated image will appear here
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
                    Upload multiple images and combine them into a single new image using Flux Pro Multi
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

                    {/* RAG Toggle */}
                    <div className="flex items-center space-x-3 p-3 border rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="flux-combine-rag"
                          checked={useRagFluxCombine}
                          onCheckedChange={setUseRagFluxCombine}
                          className="data-[state=checked]:bg-blue-500 data-[state=unchecked]:bg-gray-300 dark:data-[state=unchecked]:bg-gray-600"
                        />
                        <Label htmlFor="flux-combine-rag" className="cursor-pointer font-medium">
                          Enhance with {getActiveRAG()?.name || 'RAG'} branding
                        </Label>
                      </div>
                      <div className={`w-2 h-2 rounded-full ${useRagFluxCombine ? 'bg-blue-500' : 'bg-gray-400'} transition-colors`}></div>
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

          {/* Image-to-Image Tab */}
          <TabsContent value="qwen-image-to-image" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Upload and Form Section */}
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
                <CardContent className="space-y-4">
                  {/* Image Upload */}
                  <div className="space-y-2">
                    <Label htmlFor="img2img-file">Source Image</Label>
                    <Input
                      id="img2img-file"
                      type="file"
                      accept="image/*"
                      onChange={handleImg2imgFileUpload}
                      className="cursor-pointer"
                    />
                    {img2imgFile && (
                      <p className="text-sm text-muted-foreground">
                        Selected: {img2imgFile.name} ({(img2imgFile.size / 1024 / 1024).toFixed(2)} MB)
                      </p>
                    )}
                  </div>

                  {/* Preview */}
                  {img2imgPreviewUrl && (
                    <div className="space-y-2">
                      <Label>Preview</Label>
                      <div className="border rounded-lg p-4 bg-muted/30">
                        <img 
                          src={img2imgPreviewUrl} 
                          alt="Preview" 
                          className="max-w-full h-auto max-h-48 mx-auto rounded"
                        />
                      </div>
                    </div>
                  )}

                  {/* Transformation Form */}
                  <form onSubmit={handleImg2imgSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="img2img-prompt">Transformation Prompt</Label>
                      <Textarea
                        id="img2img-prompt"
                        placeholder="Describe how you want to transform the image (e.g., 'change to oil painting style', 'make it look like a sunset scene')"
                        value={img2imgPrompt}
                        onChange={(e) => setImg2imgPrompt(e.target.value)}
                        rows={3}
                        required
                      />
                    </div>

                    {/* RAG Toggle */}
                    <div className="flex items-center justify-between p-3 border rounded-lg bg-gradient-to-r from-background to-muted/30">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${useRagImg2img ? 'bg-green-500' : 'bg-gray-400'} transition-colors`}></div>
                        <div>
                          <Label htmlFor="use-rag-img2img" className="font-medium cursor-pointer">
                            Enhance with Branding Guidelines (RAG)
                          </Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            {useRagImg2img ? 'Active - Prompts will be enhanced with brand guidelines' : 'Inactive - Using original prompts only'}
                          </p>
                        </div>
                      </div>
                      <Switch
                        id="use-rag-img2img"
                        checked={useRagImg2img}
                        onCheckedChange={setUseRagImg2img}
                        className="data-[state=checked]:bg-green-600"
                      />
                    </div>

                    {/* LoRA Settings */}
                    <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
                      <div className="flex items-center justify-between p-3 border rounded-lg bg-gradient-to-r from-background to-muted/30">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${useImg2imgLoRA ? 'bg-purple-500' : 'bg-gray-400'} transition-colors`}></div>
                          <div>
                            <Label htmlFor="use-img2img-lora" className="font-medium cursor-pointer">
                              Apply Custom LoRA Style
                            </Label>
                            <p className="text-xs text-muted-foreground mt-1">
                              {useImg2imgLoRA ? 'Active - Custom LoRA style will be applied' : 'Inactive - Using base model only'}
                            </p>
                          </div>
                        </div>
                        <Switch
                          id="use-img2img-lora"
                          checked={useImg2imgLoRA}
                          onCheckedChange={setUseImg2imgLoRA}
                          className="data-[state=checked]:bg-purple-600"
                        />
                      </div>
                      
                      {useImg2imgLoRA && (
                        <div className="space-y-3 pl-6 border-l-2 border-primary/20">
                          <div className="space-y-2">
                            <Label htmlFor="img2img-lora-url">LoRA Model URL</Label>
                            <Input
                              id="img2img-lora-url"
                              value={img2imgLoraUrl}
                              onChange={(e) => setImg2imgLoraUrl(e.target.value)}
                              placeholder="https://v3.fal.media/files/..."
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="img2img-trigger-phrase">Style Trigger Phrase</Label>
                            <Input
                              id="img2img-trigger-phrase"
                              value={img2imgTriggerPhrase}
                              onChange={(e) => setImg2imgTriggerPhrase(e.target.value)}
                              placeholder="Style keywords to enhance the transformation"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="img2img-lora-scale">Style Strength: {img2imgLoraScale}</Label>
                            <input
                              id="img2img-lora-scale"
                              type="range"
                              min="0.1"
                              max="2.0"
                              step="0.1"
                              value={img2imgLoraScale}
                              onChange={(e) => setImg2imgLoraScale(parseFloat(e.target.value))}
                              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Advanced Settings */}
                    <div className="space-y-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowImg2imgAdvanced(!showImg2imgAdvanced)}
                        className="w-full"
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        {showImg2imgAdvanced ? "Hide" : "Show"} Advanced Settings
                      </Button>

                      {showImg2imgAdvanced && (
                        <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/20">
                          <div className="space-y-2">
                            <Label htmlFor="img2img-image-size">Image Size</Label>
                            <Select
                              value={img2imgSettings.image_size}
                              onValueChange={(value) => setImg2imgSettings(prev => ({ ...prev, image_size: value }))}
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
                            <Label htmlFor="img2img-steps">Inference Steps: {img2imgSettings.num_inference_steps}</Label>
                            <input
                              id="img2img-steps"
                              type="range"
                              min="1"
                              max="100"
                              value={img2imgSettings.num_inference_steps}
                              onChange={(e) => setImg2imgSettings(prev => ({ ...prev, num_inference_steps: parseInt(e.target.value) }))}
                              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="img2img-guidance">Guidance Scale: {img2imgSettings.guidance_scale}</Label>
                            <input
                              id="img2img-guidance"
                              type="range"
                              min="1"
                              max="20"
                              step="0.1"
                              value={img2imgSettings.guidance_scale}
                              onChange={(e) => setImg2imgSettings(prev => ({ ...prev, guidance_scale: parseFloat(e.target.value) }))}
                              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="img2img-strength">Transformation Strength: {img2imgSettings.strength}</Label>
                            <input
                              id="img2img-strength"
                              type="range"
                              min="0.1"
                              max="1.0"
                              step="0.1"
                              value={img2imgSettings.strength}
                              onChange={(e) => setImg2imgSettings(prev => ({ ...prev, strength: parseFloat(e.target.value) }))}
                              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="img2img-num-images">Number of Images: {img2imgSettings.num_images}</Label>
                            <input
                              id="img2img-num-images"
                              type="range"
                              min="1"
                              max="4"
                              value={img2imgSettings.num_images}
                              onChange={(e) => setImg2imgSettings(prev => ({ ...prev, num_images: parseInt(e.target.value) }))}
                              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="img2img-negative-prompt">Negative Prompt</Label>
                            <Input
                              id="img2img-negative-prompt"
                              value={img2imgSettings.negative_prompt}
                              onChange={(e) => setImg2imgSettings(prev => ({ ...prev, negative_prompt: e.target.value }))}
                              placeholder="What to avoid in the image"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {img2imgError && (
                      <Alert className="border-red-200 bg-red-50">
                        <AlertDescription className="text-red-700">
                          {img2imgError}
                        </AlertDescription>
                      </Alert>
                    )}

                    <Button type="submit" disabled={isImg2imgGenerating || !img2imgFile || !img2imgPrompt.trim()} className="w-full">
                      {isImg2imgGenerating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Transforming Image...
                        </>
                      ) : (
                        <>
                          <Wand2 className="h-4 w-4 mr-2" />
                          Transform Image
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Results Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Transformed Images
                  </CardTitle>
                  <CardDescription>
                    AI-generated transformations of your image
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {img2imgResult.length > 0 ? (
                    <div className="space-y-4">
                      {img2imgResult.map((imageUrl, index) => (
                        <div key={index} className="space-y-2">
                          <img 
                            src={imageUrl} 
                            alt={`Transformed image ${index + 1}`} 
                            className="w-full h-auto rounded-lg border shadow-sm"
                          />
                          <OpenInNewTabButton 
                            imageUrl={imageUrl} 
                            buttonText={`Open Result ${index + 1} in New Tab`} 
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      <ImageIcon className="h-12 w-12 mx-auto mb-2" />
                      <p>Transform an image to see results</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Generated Prompt Display */}
            {img2imgGeneratedPrompt && (
              <GeneratedPromptDisplay 
                prompt={img2imgGeneratedPrompt} 
                title="Generated Transformation Prompt" 
              />
            )}
          </TabsContent>

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

                    {/* RAG Toggle */}
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
          <TabsContent value="upload-branding" className="space-y-6">
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
          <TabsContent value="qwen-train-lora" className="space-y-6">
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
        </Tabs>
      </div>
    </div>
  )
}
