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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { BrandingUploader } from "@/components/branding-uploader"

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
  
  // LoRA States for Qwen Text-to-Image
  const [useCustomLoRA, setUseCustomLoRA] = useState(false)
  const [loraUrl, setLoraUrl] = useState("https://v3.fal.media/files/tiger/sbpnvWxI8gDpTBP0mkFtx_adapter.safetensors")
  const [triggerPhrase, setTriggerPhrase] = useState("your trained style")
  const [loraScale, setLoraScale] = useState(1.0)
  const [qwenGeneratedPrompt, setQwenGeneratedPrompt] = useState<string>("") // Store generated prompt

  // Edit Image States
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>("")
  const [prompt, setPrompt] = useState("")
  const [editedImageUrl, setEditedImageUrl] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>("")
  const [useRagEdit, setUseRagEdit] = useState(true) // RAG for edit image
  const [editGeneratedPrompt, setEditGeneratedPrompt] = useState<string>("") // Store generated prompt

  // Generate Image States
  const [generatePrompt, setGeneratePrompt] = useState("")
  const [referenceImage, setReferenceImage] = useState<File | null>(null)
  const [referencePreviewUrl, setReferencePreviewUrl] = useState<string>("")
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string>("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string>("")
  const [useRagGenerate, setUseRagGenerate] = useState(true) // RAG for style transfer
  const [generateGeneratedPrompt, setGenerateGeneratedPrompt] = useState<string>("") // Store generated prompt

  // Qwen Image-to-Image States
  const [qwenImageToImageImage, setQwenImageToImageImage] = useState<File | null>(null)
  const [qwenImageToImagePreview, setQwenImageToImagePreview] = useState<string>("")
  const [qwenImageToImagePrompt, setQwenImageToImagePrompt] = useState("")
  const [qwenImageToImageSettings, setQwenImageToImageSettings] = useState({
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
  const [qwenImageToImageUrl, setQwenImageToImageUrl] = useState<string[]>([])
  const [isQwenImageToImageGenerating, setIsQwenImageToImageGenerating] = useState(false)
  const [qwenImageToImageError, setQwenImageToImageError] = useState<string>("")
  const [showQwenImageToImageAdvanced, setShowQwenImageToImageAdvanced] = useState(false)
  const [useRagImageToImage, setUseRagImageToImage] = useState(true) // RAG for image-to-image
  const [qwenImageToImageGeneratedPrompt, setQwenImageToImageGeneratedPrompt] = useState<string>("") // Store generated prompt

  // LoRA States for Qwen Image-to-Image
  const [useCustomLoRAImageToImage, setUseCustomLoRAImageToImage] = useState(false)

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

  const handleReferenceImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setReferenceImage(file)
      const url = URL.createObjectURL(file)
      setReferencePreviewUrl(url)
      setGeneratedImageUrl("") // Clear previous result
      setGenerateError("")
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

  const handleGenerateSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!generatePrompt.trim()) {
      setGenerateError("Please enter a prompt")
      return
    }

    setIsGenerating(true)
    setGenerateError("")

    try {
      const formData = new FormData()
      formData.append("prompt", generatePrompt)
      formData.append("useRAG", useRagGenerate.toString())
      if (referenceImage) {
        formData.append("referenceImage", referenceImage)
      }

      const response = await fetch("/api/generate-image", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      // Capture generated prompt if available
      if (result.finalPrompt) {
        setGenerateGeneratedPrompt(result.finalPrompt)
      } else if (result.prompt) {
        setGenerateGeneratedPrompt(result.prompt)
      } else {
        setGenerateGeneratedPrompt(generatePrompt) // Fallback to original prompt
      }
      
      if (result.image) {
        setGeneratedImageUrl(result.image)
      } else {
        throw new Error("No image received from server")
      }
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Failed to generate image")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleQwenImageToImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setQwenImageToImageImage(file)
      const url = URL.createObjectURL(file)
      setQwenImageToImagePreview(url)
    }
  }

  const handleQwenImageToImageSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!qwenImageToImageImage || !qwenImageToImagePrompt.trim()) {
      setQwenImageToImageError("Please select an image and enter a prompt")
      return
    }

    setIsQwenImageToImageGenerating(true)
    setQwenImageToImageError("")

    try {
      const formData = new FormData()
      formData.append("image", qwenImageToImageImage)
      
      // Enhance prompt with trigger phrase if using custom LoRA
      let finalPrompt = qwenImageToImagePrompt
      if (useCustomLoRAImageToImage && triggerPhrase.trim()) {
        finalPrompt = `${qwenImageToImagePrompt}, ${triggerPhrase}`
      }
      
      formData.append("prompt", finalPrompt)
      formData.append("useRAG", useRagImageToImage.toString())

      // Create a clean settings object with proper types
      const cleanSettings: any = {}
      
      // Add LoRA configuration if enabled
      if (useCustomLoRAImageToImage && loraUrl.trim()) {
        cleanSettings.loras = [{
          path: loraUrl.trim(),
          scale: loraScale
        }]
      }
      
      if (qwenImageToImageSettings.image_size && qwenImageToImageSettings.image_size !== "") {
        cleanSettings.image_size = qwenImageToImageSettings.image_size
      }
      if (qwenImageToImageSettings.num_inference_steps) {
        cleanSettings.num_inference_steps = qwenImageToImageSettings.num_inference_steps
      }
      if (qwenImageToImageSettings.guidance_scale) {
        cleanSettings.guidance_scale = qwenImageToImageSettings.guidance_scale
      }
      if (qwenImageToImageSettings.strength) {
        cleanSettings.strength = qwenImageToImageSettings.strength
      }
      if (qwenImageToImageSettings.num_images) {
        cleanSettings.num_images = qwenImageToImageSettings.num_images
      }
      if (qwenImageToImageSettings.output_format && qwenImageToImageSettings.output_format !== "") {
        cleanSettings.output_format = qwenImageToImageSettings.output_format
      }
      if (qwenImageToImageSettings.negative_prompt && qwenImageToImageSettings.negative_prompt !== "") {
        cleanSettings.negative_prompt = qwenImageToImageSettings.negative_prompt
      }
      if (qwenImageToImageSettings.acceleration && qwenImageToImageSettings.acceleration !== "") {
        cleanSettings.acceleration = qwenImageToImageSettings.acceleration
      }
      if (qwenImageToImageSettings.enable_safety_checker !== undefined) {
        cleanSettings.enable_safety_checker = qwenImageToImageSettings.enable_safety_checker
      }
      if (qwenImageToImageSettings.sync_mode !== undefined) {
        cleanSettings.sync_mode = qwenImageToImageSettings.sync_mode
      }
      if (qwenImageToImageSettings.seed && qwenImageToImageSettings.seed !== "") {
        cleanSettings.seed = parseInt(qwenImageToImageSettings.seed)
      }
      if (qwenImageToImageSettings.width && qwenImageToImageSettings.width !== "") {
        cleanSettings.width = parseInt(qwenImageToImageSettings.width)
      }
      if (qwenImageToImageSettings.height && qwenImageToImageSettings.height !== "") {
        cleanSettings.height = parseInt(qwenImageToImageSettings.height)
      }
      
      formData.append("settings", JSON.stringify(cleanSettings))
      formData.append("orgType", "general") // TODO: Make this configurable per organization

      const response = await fetch("/api/qwen-image-to-image", {
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
        setQwenImageToImageGeneratedPrompt(result.finalPrompt)
      } else if (result.prompt) {
        setQwenImageToImageGeneratedPrompt(result.prompt)
      } else {
        setQwenImageToImageGeneratedPrompt(qwenImageToImagePrompt) // Fallback to original prompt
      }
      
      if (result.success && result.images && result.images.length > 0) {
        setQwenImageToImageUrl(result.images)
        console.log("[v0] Generated", result.images.length, "images")
        if (result.ragMetadata) {
          console.log("[v0] RAG metadata:", result.ragMetadata)
        }
      } else {
        throw new Error("No images received from server")
      }
    } catch (err) {
      setQwenImageToImageError(err instanceof Error ? err.message : "Failed to generate image")
    } finally {
      setIsQwenImageToImageGenerating(false)
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

    try {
      // Upload file to Fal storage via our proxy endpoint
      console.log("[Training] Uploading file:", trainingFile.name)
      
      const uploadFormData = new FormData()
      uploadFormData.append("file", trainingFile)

      const uploadResponse = await fetch("/api/upload-file", {
        method: "POST",
        body: uploadFormData,
      })

      if (!uploadResponse.ok) {
        const uploadError = await uploadResponse.json()
        throw new Error(uploadError.error || "Failed to upload training file")
      }

      const uploadResult = await uploadResponse.json()
      console.log("[Training] File uploaded to:", uploadResult.url)

      // Submit training job
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
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">AI Image Studio</h1>
          <p className="text-muted-foreground">
            Generate, edit, and transform images using advanced Qwen and FLUX AI models
          </p>
        </div>

              <Tabs defaultValue="qwen-text-to-image" className="w-full max-w-6xl mx-auto">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="qwen-text-to-image">Qwen Text-to-Image</TabsTrigger>
          <TabsTrigger value="qwen-image-to-image">Qwen Image-to-Image</TabsTrigger>
          <TabsTrigger value="qwen-train-lora">Train LoRA</TabsTrigger>
          <TabsTrigger value="edit-image">Edit Image</TabsTrigger>
          <TabsTrigger value="style-transfer">Style Transfer</TabsTrigger>
          <TabsTrigger value="upload-branding">Upload Branding</TabsTrigger>
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

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="useRag"
                        checked={useRag}
                        onCheckedChange={(checked) => setUseRag(checked as boolean)}
                      />
                      <Label htmlFor="useRag" className="text-sm font-medium">
                        Use ACLU Branding Guidelines (RAG)
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      When enabled, your prompt will be automatically enhanced with ACLU brand colors, styles, and layout guidelines.
                    </p>

                    <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="useCustomLoRA"
                          checked={useCustomLoRA}
                          onCheckedChange={(checked) => setUseCustomLoRA(checked as boolean)}
                        />
                        <Label htmlFor="useCustomLoRA" className="text-sm font-medium">
                          Use Custom LoRA Style
                        </Label>
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

          {/* Qwen Image-to-Image Tab */}
          <TabsContent value="qwen-image-to-image" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Qwen Image-to-Image
                </CardTitle>
                <CardDescription>
                  Transform an existing image using AI. Upload an image and describe the changes you want to make.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleQwenImageToImageSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      {/* RAG Toggle */}
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="rag-image-to-image"
                          checked={useRagImageToImage}
                          onCheckedChange={setUseRagImageToImage}
                        />
                        <Label htmlFor="rag-image-to-image">
                          Use RAG Enhancement
                        </Label>
                      </div>

                      {/* Image Upload */}
                      <div className="space-y-2">
                        <Label htmlFor="qwen-image-upload">Upload Image</Label>
                        <Input
                          id="qwen-image-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleQwenImageToImageUpload}
                          required
                        />
                        {qwenImageToImagePreview && (
                          <div className="mt-2">
                            <img
                              src={qwenImageToImagePreview}
                              alt="Preview"
                              className="max-w-full h-48 object-contain rounded-lg border"
                            />
                          </div>
                        )}
                      </div>

                      {/* Prompt */}
                      <div className="space-y-2">
                        <Label htmlFor="qwen-image-to-image-prompt">Transformation Prompt</Label>
                        <Textarea
                          id="qwen-image-to-image-prompt"
                          placeholder="Describe how you want to transform the image..."
                          value={qwenImageToImagePrompt}
                          onChange={(e) => setQwenImageToImagePrompt(e.target.value)}
                          required
                          rows={3}
                        />
                      </div>

                      {/* Advanced Settings */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Advanced Settings</h3>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="qwen-i2i-image-size">Image Size</Label>
                            <Select
                              value={qwenImageToImageSettings.image_size}
                              onValueChange={(value) => setQwenImageToImageSettings(prev => ({ ...prev, image_size: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select size" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="square_hd">Square HD (1024×1024)</SelectItem>
                                <SelectItem value="square">Square (512×512)</SelectItem>
                                <SelectItem value="portrait_4_3">Portrait 4:3</SelectItem>
                                <SelectItem value="portrait_16_9">Portrait 16:9</SelectItem>
                                <SelectItem value="landscape_4_3">Landscape 4:3</SelectItem>
                                <SelectItem value="landscape_16_9">Landscape 16:9</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="qwen-i2i-steps">Inference Steps</Label>
                            <Input
                              id="qwen-i2i-steps"
                              type="number"
                              min="1"
                              max="50"
                              value={qwenImageToImageSettings.num_inference_steps}
                              onChange={(e) => setQwenImageToImageSettings(prev => ({ 
                                ...prev, 
                                num_inference_steps: parseInt(e.target.value) || 20 
                              }))}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="qwen-i2i-guidance">Guidance Scale</Label>
                            <Input
                              id="qwen-i2i-guidance"
                              type="number"
                              step="0.1"
                              min="1"
                              max="20"
                              value={qwenImageToImageSettings.guidance_scale}
                              onChange={(e) => setQwenImageToImageSettings(prev => ({ 
                                ...prev, 
                                guidance_scale: parseFloat(e.target.value) || 7.5 
                              }))}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="qwen-i2i-strength">Transformation Strength</Label>
                            <Input
                              id="qwen-i2i-strength"
                              type="number"
                              step="0.01"
                              min="0.1"
                              max="1"
                              value={qwenImageToImageSettings.strength}
                              onChange={(e) => setQwenImageToImageSettings(prev => ({ 
                                ...prev, 
                                strength: parseFloat(e.target.value) || 0.8 
                              }))}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="qwen-i2i-num-images">Number of Images</Label>
                            <Input
                              id="qwen-i2i-num-images"
                              type="number"
                              min="1"
                              max="4"
                              value={qwenImageToImageSettings.num_images}
                              onChange={(e) => setQwenImageToImageSettings(prev => ({ 
                                ...prev, 
                                num_images: parseInt(e.target.value) || 1 
                              }))}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="qwen-i2i-seed">Seed (optional)</Label>
                            <Input
                              id="qwen-i2i-seed"
                              type="text"
                              placeholder="Random if empty"
                              value={qwenImageToImageSettings.seed}
                              onChange={(e) => setQwenImageToImageSettings(prev => ({ 
                                ...prev, 
                                seed: e.target.value 
                              }))}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="qwen-i2i-negative">Negative Prompt (optional)</Label>
                          <Textarea
                            id="qwen-i2i-negative"
                            placeholder="Things to avoid in the image..."
                            value={qwenImageToImageSettings.negative_prompt}
                            onChange={(e) => setQwenImageToImageSettings(prev => ({ 
                              ...prev, 
                              negative_prompt: e.target.value 
                            }))}
                            rows={2}
                          />
                        </div>

                        <div className="flex items-center space-x-2">
                          <Switch
                            id="qwen-i2i-safety"
                            checked={qwenImageToImageSettings.enable_safety_checker}
                            onCheckedChange={(checked) => setQwenImageToImageSettings(prev => ({ 
                              ...prev, 
                              enable_safety_checker: checked 
                            }))}
                          />
                          <Label htmlFor="qwen-i2i-safety">Enable Safety Checker</Label>
                        </div>

                        {/* LoRA Configuration */}
                        <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="useCustomLoRAImageToImage"
                              checked={useCustomLoRA}
                              onCheckedChange={(checked) => setUseCustomLoRA(checked as boolean)}
                            />
                            <Label htmlFor="useCustomLoRAImageToImage" className="text-sm font-medium">
                              Use Custom LoRA Style
                            </Label>
                          </div>
                          
                          {useCustomLoRA && (
                            <div className="space-y-3 ml-6">
                              <div className="space-y-2">
                                <Label htmlFor="loraUrlImageToImage" className="text-sm">LoRA Model URL</Label>
                                <Input
                                  id="loraUrlImageToImage"
                                  value={loraUrl}
                                  onChange={(e) => setLoraUrl(e.target.value)}
                                  placeholder="https://v3.fal.media/files/..."
                                  className="text-sm"
                                />
                              </div>
                              
                              <div className="space-y-2">
                                <Label htmlFor="triggerPhraseImageToImage" className="text-sm">Trigger Phrase</Label>
                                <Input
                                  id="triggerPhraseImageToImage"
                                  value={triggerPhrase}
                                  onChange={(e) => setTriggerPhrase(e.target.value)}
                                  placeholder="your trained style"
                                  className="text-sm"
                                />
                              </div>
                              
                              <div className="space-y-2">
                                <Label htmlFor="loraScaleImageToImage" className="text-sm">LoRA Strength: {loraScale}</Label>
                                <input
                                  id="loraScaleImageToImage"
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
                      </div>

                      <Button type="submit" disabled={isQwenImageToImageGenerating} className="w-full">
                        {isQwenImageToImageGenerating ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Transforming Image...
                          </>
                        ) : (
                          "Transform Image"
                        )}
                      </Button>

                      {/* Display generated prompt */}
                      <GeneratedPromptDisplay 
                        prompt={qwenImageToImageGeneratedPrompt} 
                        title="Generated Prompt Used"
                      />

                      {qwenImageToImageError && (
                        <div className="p-4 border border-amber-200 bg-amber-50 text-amber-800 rounded-lg">
                          <div className="flex items-start space-x-3">
                            <div className="text-2xl">🚫</div>
                            <div className="flex-1">
                              <div className="font-medium mb-2">Content Not Allowed</div>
                              <div className="text-sm mb-3">{qwenImageToImageError}</div>
                              <div className="text-xs bg-amber-100 p-2 rounded border border-amber-200">
                                <div className="font-medium mb-1">💡 Examples of appropriate prompts:</div>
                                <ul className="list-disc list-inside space-y-1">
                                  <li>Transform to professional style</li>
                                  <li>Add educational elements</li>
                                  <li>Adapt for organizational use</li>
                                  <li>Enhance for informational campaign</li>
                                </ul>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Generated Results</h3>
                      {qwenImageToImageUrl && qwenImageToImageUrl.length > 0 ? (
                        <div className="grid gap-4">
                          {qwenImageToImageUrl.map((url, index) => (
                            <div key={index} className="space-y-2">
                              <img
                                src={url}
                                alt={`Generated image ${index + 1}`}
                                className="w-full rounded-lg border"
                              />
                              <Button
                                onClick={() => {
                                  const link = document.createElement('a')
                                  link.href = url
                                  link.download = `qwen-image-to-image-${index + 1}.png`
                                  link.click()
                                }}
                                variant="outline"
                                size="sm"
                                className="w-full"
                              >
                                Download Image {index + 1}
                              </Button>
                              <OpenInNewTabButton imageUrl={url} />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg">
                          Generated images will appear here
                        </div>
                      )}
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
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
                            placeholder="e.g., 'aclu style', 'my brand style'"
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

                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="use-rag-edit" 
                        checked={useRagEdit}
                        onCheckedChange={(checked) => setUseRagEdit(checked as boolean)}
                      />
                      <Label htmlFor="use-rag-edit" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Use brand guidelines (RAG)
                      </Label>
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

          {/* Generate Image Tab */}
          <TabsContent value="style-transfer" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Generate Form Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Generate Image
                  </CardTitle>
                  <CardDescription>Create images with style transfer using FLUX Kontext</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <form onSubmit={handleGenerateSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="generatePrompt">Image Prompt</Label>
                      <Textarea
                        id="generatePrompt"
                        placeholder="Describe the image you want to generate. You can use plain text or JSON format with detailed specifications."
                        value={generatePrompt}
                        onChange={(e) => setGeneratePrompt(e.target.value)}
                        rows={4}
                      />
                      <p className="text-xs text-muted-foreground">
                        Example: "A futuristic city at sunset with flying cars" or JSON with specific parameters
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="referenceImage">Reference Image (Optional)</Label>
                      <Input
                        id="referenceImage"
                        type="file"
                        accept="image/*"
                        onChange={handleReferenceImageUpload}
                        className="cursor-pointer"
                      />
                      <p className="text-xs text-muted-foreground">
                        Upload a reference image to guide the style and composition of the generated image
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="use-rag-generate" 
                        checked={useRagGenerate}
                        onCheckedChange={(checked) => setUseRagGenerate(checked as boolean)}
                      />
                      <Label htmlFor="use-rag-generate" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Use brand guidelines (RAG)
                      </Label>
                    </div>

                    <Button type="submit" className="w-full" disabled={!generatePrompt.trim() || isGenerating}>
                      {isGenerating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating Image...
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
                    prompt={generateGeneratedPrompt} 
                    title="Generated Prompt Used"
                  />

                  {generateError && <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">{generateError}</div>}
                </CardContent>
              </Card>

              {/* Reference Image Preview Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Reference Image</CardTitle>
                  <CardDescription>Optional reference for style guidance</CardDescription>
                </CardHeader>
                <CardContent>
                  {referencePreviewUrl ? (
                    <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                      <img
                        src={referencePreviewUrl || "/placeholder.svg"}
                        alt="Reference image preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                      <div className="text-center text-muted-foreground">
                        <ImageIcon className="h-12 w-12 mx-auto mb-2" />
                        <p>No reference image</p>
                        <p className="text-xs">Optional for style guidance</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Generated Result Section */}
            {(generatedImageUrl || isGenerating) && (
              <Card>
                <CardHeader>
                  <CardTitle>Generated Result</CardTitle>
                  <CardDescription>Your AI-generated image</CardDescription>
                </CardHeader>
                <CardContent>
                  {isGenerating ? (
                    <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <Loader2 className="h-12 w-12 mx-auto mb-2 animate-spin" />
                        <p className="text-muted-foreground">Generating your image...</p>
                      </div>
                    </div>
                  ) : generatedImageUrl ? (
                    <div className="space-y-3">
                      <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                        <img
                          src={generatedImageUrl || "/placeholder.svg"}
                          alt="Generated image result"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <OpenInNewTabButton imageUrl={generatedImageUrl} />
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
        </Tabs>
      </div>
    </div>
  )
}
