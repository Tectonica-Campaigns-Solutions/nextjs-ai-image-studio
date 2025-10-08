"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, Wand2, Loader2, Image as ImageIcon, Sparkles, Settings, Zap, FileText, ExternalLink, Eye, X, Plus, Download, AlertCircle } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { BrandingUploader } from "@/components/branding-uploader"
import RAGSelector from "@/components/rag-selector"
import { useRAGStore } from "@/lib/rag-store"
import { enhancePromptHybrid, validateHybridOptions, getStrategyDescription, type HybridEnhancementOptions } from "@/lib/hybrid-enhancement"
import { getEnhancementText, getEditEnhancementText, getSedreamEnhancementText } from "@/lib/json-enhancement"
import { EnhancementPreview } from "@/components/enhancement-preview"
import type { CanonicalPromptConfig } from "@/lib/canonical-prompt"
import { generationCanonicalPromptProcessor, type GenerationCanonicalConfig } from "@/lib/canonical-prompt-generation"

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
  const [useRagFluxPro, setUseRagFluxPro] = useState(true)
  const [fluxProGeneratedPrompt, setFluxProGeneratedPrompt] = useState<string>("")
  const [showFluxProAdvanced, setShowFluxProAdvanced] = useState(false)

  // Generation Canonical Prompt States
  const [useGenerationCanonical, setUseGenerationCanonical] = useState(false)
  const [generationCanonicalConfig, setGenerationCanonicalConfig] = useState<GenerationCanonicalConfig>({
    subject: {
      type: 'individual',
      groupSize: 3,
      objectDescription: ''
    },
    appearance: {
      colorRelevance: [],
      colorIntensity: 'moderate'
    },
    style: {
      type: 'realistic'
    },
    elements: {
      landmark: '',
      city: '',
      others: ''
    },
    modifiers: {
      positives: ''
    }
  })
  
  // Local states for text inputs to prevent lag
  const [localObjectDescription, setLocalObjectDescription] = useState('')
  const [localLandmark, setLocalLandmark] = useState('')
  const [localCity, setLocalCity] = useState('')
  const [localOthers, setLocalOthers] = useState('')
  const [localPositives, setLocalPositives] = useState('')
  const [localFluxUltraPrompt, setLocalFluxUltraPrompt] = useState('')
  
  const [generationCanonicalOptions, setGenerationCanonicalOptions] = useState<any>(null)
  const [generationCanonicalPreview, setGenerationCanonicalPreview] = useState<string>("")
  const [isGeneratingCanonicalPreview, setIsGeneratingCanonicalPreview] = useState(false)

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

  // Hybrid Enhancement States
  const [useJSONEnhancement, setUseJSONEnhancement] = useState(true)
  const [hybridStrategy, setHybridStrategy] = useState<'rag-only' | 'json-only' | 'hybrid' | 'none'>('json-only')
  const [jsonIntensity, setJsonIntensity] = useState(1.0)
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

  // Load canonical prompt options
  const loadCanonicalOptions = async () => {
    try {
      const response = await fetch('/api/canonical-prompt-options')
      const data = await response.json()
      if (data.success) {
        console.log('[UI-DEBUG] Loaded canonical options:', data.data)
        console.log('[UI-DEBUG] Available options:', data.data?.availableOptions)
        console.log('[UI-DEBUG] Texture options:', data.data?.availableOptions?.texture)
        console.log('[UI-DEBUG] Overlay options:', data.data?.availableOptions?.overlay)
        setCanonicalOptions(data.data)
        
        // Update canonical config with default values
        if (data.data?.defaults) {
          setCanonicalConfig(prev => ({
            ...prev,
            preserveOptions: {
              preserve_primary: data.data.defaults.preserveOptions?.preserve_primary || false
            },
            combineOptions: {
              force_integration: data.data.defaults.combineOptions?.force_integration || false
            }
          }))
        }
      } else {
        console.error('[UI-DEBUG] Failed to load canonical options - API returned error:', data)
      }
    } catch (error) {
      console.warn('[UI-DEBUG] Failed to load canonical options - Network error:', error)
    }
  }

  // Generate canonical prompt preview
  const generateCanonicalPreview = async () => {
    if (!useCanonicalPrompt) {
      setCanonicalPreview("")
      setIsGeneratingCombineCanonicalPreview(false)
      return
    }

    setIsGeneratingCombineCanonicalPreview(true)

    try {
      const response = await fetch('/api/canonical-prompt-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config: {
            ...canonicalConfig,
            userInput: localFluxCombinePrompt
          }
        })
      })
      
      const data = await response.json()
      if (data.success) {
        setCanonicalPreview(data.data.canonicalPrompt)
        console.log('Generated canonical preview:', data.data.canonicalPrompt)
      }
    } catch (error) {
      console.warn('Failed to generate canonical preview:', error)
      setCanonicalPreview("")
    } finally {
      setIsGeneratingCombineCanonicalPreview(false)
    }
  }

  // Load generation canonical prompt options
  const loadGenerationCanonicalOptions = async () => {
    try {
      const options = await generationCanonicalPromptProcessor.getAvailableOptions()
      setGenerationCanonicalOptions(options)
      console.log('Loaded generation canonical options:', options)
    } catch (error) {
      console.warn('Failed to load generation canonical options:', error)
    }
  }

  // Sync local text states with main config
  const syncLocalStatesWithConfig = () => {
    setFluxUltraPrompt(localFluxUltraPrompt)
    setGenerationCanonicalConfig(prev => ({
      ...prev,
      subject: {
        ...prev.subject,
        objectDescription: localObjectDescription
      },
      elements: {
        ...prev.elements,
        landmark: localLandmark,
        city: localCity,
        others: localOthers
      },
      modifiers: {
        ...prev.modifiers,
        positives: localPositives
      }
    }))
  }

  // Generate generation canonical prompt preview
  const generateGenerationCanonicalPreview = async () => {
    if (!useGenerationCanonical || !localFluxUltraPrompt.trim()) {
      setGenerationCanonicalPreview("")
      setIsGeneratingCanonicalPreview(false)
      return
    }

    // Sync local states before generating
    syncLocalStatesWithConfig()

    setIsGeneratingCanonicalPreview(true)
    try {
      // Create temporary config with current local values
      const configWithLocalValues = {
        ...generationCanonicalConfig,
        subject: {
          ...generationCanonicalConfig.subject,
          objectDescription: localObjectDescription
        },
        elements: {
          ...generationCanonicalConfig.elements,
          landmark: localLandmark,
          city: localCity,
          others: localOthers
        },
        modifiers: {
          ...generationCanonicalConfig.modifiers,
          positives: localPositives
        }
      }

      const canonicalPrompt = await generationCanonicalPromptProcessor.generateCanonicalPrompt(
        localFluxUltraPrompt,
        configWithLocalValues
      )
      setGenerationCanonicalPreview(canonicalPrompt)
      console.log('Generated generation canonical preview:', canonicalPrompt)
    } catch (error) {
      console.warn('Failed to generate generation canonical preview:', error)
      setGenerationCanonicalPreview("")
    } finally {
      setIsGeneratingCanonicalPreview(false)
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
        intensity: sedreamJsonIntensity,
        enhancementType: 'sedream'
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
    seed: "1234",
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
  const [localFluxCombinePrompt, setLocalFluxCombinePrompt] = useState("") // Local state for input performance
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
  const [canonicalOptions, setCanonicalOptions] = useState<any>(null)
  const [canonicalPreview, setCanonicalPreview] = useState<string>("")
  const [isGeneratingCombineCanonicalPreview, setIsGeneratingCombineCanonicalPreview] = useState(false)

  // Flux Combine JSON Enhancement States
  const [fluxCombineUseJSONEnhancement, setFluxCombineUseJSONEnhancement] = useState(false) // Disabled by default (Canonical Prompt is preferred)
  const [fluxCombineJsonIntensity, setFluxCombineJsonIntensity] = useState(1.0)
  const [fluxCombineEnhancementPreview, setFluxCombineEnhancementPreview] = useState<string>("")
  const [fluxCombineEnhancementMeta, setFluxCombineEnhancementMeta] = useState<any>(null)
  const [fluxCombineCustomEnhancementText, setFluxCombineCustomEnhancementText] = useState<string>("")
  const [fluxCombineDefaultEnhancementText, setFluxCombineDefaultEnhancementText] = useState<string>("")

  // External Flux Pro Image Combine States (for testing external endpoint)
  const [externalFluxCombinePrompt, setExternalFluxCombinePrompt] = useState("")
  const [externalFluxCombineImages, setExternalFluxCombineImages] = useState<File[]>([])
  const [externalFluxCombineImageUrls, setExternalFluxCombineImageUrls] = useState<string[]>([])
  const [externalFluxCombineSettings, setExternalFluxCombineSettings] = useState({
    aspect_ratio: "1:1",
    guidance_scale: 3.5,
    num_images: 1,
    output_format: "jpeg",
    safety_tolerance: 2,
    enable_safety_checker: true,
    seed: "",
    enhance_prompt: false
  })
  const [externalFluxCombineResult, setExternalFluxCombineResult] = useState<string>("")
  const [isExternalFluxCombineGenerating, setIsExternalFluxCombineGenerating] = useState(false)
  const [externalFluxCombineError, setExternalFluxCombineError] = useState<string>("")
  const [externalFluxCombineGeneratedPrompt, setExternalFluxCombineGeneratedPrompt] = useState<string>("")
  const [showExternalFluxCombineAdvanced, setShowExternalFluxCombineAdvanced] = useState(false)

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
  
  // External Flux Ultra Canonical States
  const [useExternalFluxUltraCanonical, setUseExternalFluxUltraCanonical] = useState(false)
  const [externalFluxUltraCanonicalConfig, setExternalFluxUltraCanonicalConfig] = useState<GenerationCanonicalConfig>({
    subject: {
      type: 'individual',
      groupSize: 3,
      objectDescription: ''
    },
    appearance: {
      colorRelevance: [],
      colorIntensity: 'moderate'
    },
    style: {
      type: 'realistic'
    },
    elements: {
      landmark: '',
      city: '',
      others: ''
    },
    modifiers: {
      positives: ''
    }
  })
  const [externalFluxUltraCanonicalPreview, setExternalFluxUltraCanonicalPreview] = useState<string>("")
  const [isExternalFluxUltraGeneratingCanonicalPreview, setIsExternalFluxUltraGeneratingCanonicalPreview] = useState(false)
  
  // Local states for External Flux Ultra text inputs to prevent lag
  const [externalLocalFluxUltraPrompt, setExternalLocalFluxUltraPrompt] = useState('')
  const [externalLocalObjectDescription, setExternalLocalObjectDescription] = useState('')
  const [externalLocalLandmark, setExternalLocalLandmark] = useState('')
  const [externalLocalCity, setExternalLocalCity] = useState('')
  const [externalLocalOthers, setExternalLocalOthers] = useState('')
  const [externalLocalPositives, setExternalLocalPositives] = useState('')
  
  // External Flux Combine uses same canonical prompt configuration as internal
  const [externalUseCanonicalPrompt, setExternalUseCanonicalPrompt] = useState(true) // Enabled by default for external
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
  const [useRagEdit, setUseRagEdit] = useState(false) // RAG for edit image - disabled by default
  const [editGeneratedPrompt, setEditGeneratedPrompt] = useState<string>("") // Store generated prompt
  const [editImageSize, setEditImageSize] = useState("square_hd") // Image size for edit
  const [customWidth, setCustomWidth] = useState("1024") // Custom width for edit
  const [customHeight, setCustomHeight] = useState("1024") // Custom height for edit

  // RAG Store
  const { getActiveRAG } = useRAGStore()

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
  const [sedreamAspectRatio, setSedreamAspectRatio] = useState<string>("1:1")
  const [sedreamDefaultEnhancementText, setSedreamDefaultEnhancementText] = useState<string>("")

  // Load canonical options on component mount
  useEffect(() => {
    loadCanonicalOptions()
    loadGenerationCanonicalOptions()
  }, [])

  // Update generation canonical preview when config or prompt changes (manual only)
  // Removed automatic useEffect to prevent typing lag - now uses manual Apply button
  
  // Clear preview when canonical is disabled
  useEffect(() => {
    if (!useGenerationCanonical) {
      setGenerationCanonicalPreview("")
      setIsGeneratingCanonicalPreview(false)
    }
  }, [useGenerationCanonical])

  // Clear combine preview when canonical is disabled
  useEffect(() => {
    if (!useCanonicalPrompt) {
      setCanonicalPreview("")
      setIsGeneratingCombineCanonicalPreview(false)
    }
  }, [useCanonicalPrompt])

  // Sync local states with config when config changes programmatically
  useEffect(() => {
    setLocalFluxUltraPrompt(fluxUltraPrompt)
    setLocalObjectDescription(generationCanonicalConfig.subject.objectDescription || '')
    setLocalLandmark(generationCanonicalConfig.elements.landmark || '')
    setLocalCity(generationCanonicalConfig.elements.city || '')
    setLocalOthers(generationCanonicalConfig.elements.others || '')
    setLocalPositives(generationCanonicalConfig.modifiers.positives || '')
  }, [
    fluxUltraPrompt,
    generationCanonicalConfig.subject.objectDescription,
    generationCanonicalConfig.elements.landmark,
    generationCanonicalConfig.elements.city,
    generationCanonicalConfig.elements.others,
    generationCanonicalConfig.modifiers.positives
  ])

  // Clear External Flux Ultra preview when canonical is disabled
  useEffect(() => {
    if (!useExternalFluxUltraCanonical) {
      setExternalFluxUltraCanonicalPreview("")
      setIsExternalFluxUltraGeneratingCanonicalPreview(false)
    }
  }, [useExternalFluxUltraCanonical])

  // Sync External Flux Ultra local states with config when config changes programmatically
  useEffect(() => {
    setExternalLocalFluxUltraPrompt(externalFluxUltraPrompt)
    setExternalLocalObjectDescription(externalFluxUltraCanonicalConfig.subject.objectDescription || '')
    setExternalLocalLandmark(externalFluxUltraCanonicalConfig.elements.landmark || '')
    setExternalLocalCity(externalFluxUltraCanonicalConfig.elements.city || '')
    setExternalLocalOthers(externalFluxUltraCanonicalConfig.elements.others || '')
    setExternalLocalPositives(externalFluxUltraCanonicalConfig.modifiers.positives || '')
  }, [
    externalFluxUltraPrompt,
    externalFluxUltraCanonicalConfig.subject.objectDescription,
    externalFluxUltraCanonicalConfig.elements.landmark,
    externalFluxUltraCanonicalConfig.elements.city,
    externalFluxUltraCanonicalConfig.elements.others,
    externalFluxUltraCanonicalConfig.modifiers.positives
  ])

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

  // Load default enhancement text on component mount
  useEffect(() => {
    const loadDefaultText = async () => {
      try {
        const text = await getEnhancementText()
        if (text) {
          setDefaultEnhancementText(text)
          setCustomEnhancementText(text) // Initialize with default
        }
        
        // Load specific text for Edit Image
        const editText = await getEditEnhancementText()
        if (editText) {
          setEditDefaultEnhancementText(editText)
          setEditCustomEnhancementText(editText)
        }

        // Use general enhancement text for Combine Images
        if (text) {
          setFluxCombineDefaultEnhancementText(text)
          setFluxCombineCustomEnhancementText(text)
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

    // Sync local states before processing
    syncLocalStatesWithConfig()

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

      // Apply canonical prompt processing if enabled
      if (useGenerationCanonical) {
        try {
          // Create temporary config with current local values
          const configWithLocalValues = {
            ...generationCanonicalConfig,
            subject: {
              ...generationCanonicalConfig.subject,
              objectDescription: localObjectDescription
            },
            elements: {
              ...generationCanonicalConfig.elements,
              landmark: localLandmark,
              city: localCity,
              others: localOthers
            },
            modifiers: {
              ...generationCanonicalConfig.modifiers,
              positives: localPositives
            }
          }

          finalPrompt = await generationCanonicalPromptProcessor.generateCanonicalPrompt(
            localFluxUltraPrompt,
            configWithLocalValues
          )
        } catch (canonicalError) {
          console.warn('Failed to generate canonical prompt, using original:', canonicalError)
          // Continue with original prompt if canonical fails
        }
      }

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

    if (fluxCombineImages.length + fluxCombineImageUrls.length < 2) {
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

  // Handle External Flux Combine Submit (calls external endpoint)
  const handleExternalFluxCombineSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!externalFluxCombinePrompt.trim()) {
      setExternalFluxCombineError("Please enter a prompt")
      return
    }

    if (externalFluxCombineImages.length + externalFluxCombineImageUrls.length < 2) {
      setExternalFluxCombineError("Please upload at least 2 images to combine")
      return
    }

    setIsExternalFluxCombineGenerating(true)
    setExternalFluxCombineError("")

    try {
      // Prepare form data for external endpoint
      const formData = new FormData()
      
      formData.append("prompt", externalFluxCombinePrompt)
      
      // Add canonical prompt configuration (enabled by default for external)
      formData.append("useCanonicalPrompt", externalUseCanonicalPrompt.toString())
      if (externalUseCanonicalPrompt) {
        formData.append("canonicalConfig", JSON.stringify(canonicalConfig))
      }
      
      // Add JSON enhancement configuration (disabled by default for external)
      formData.append("useJSONEnhancement", externalUseJSONEnhancement.toString())
      
      // Add uploaded image files
      externalFluxCombineImages.forEach((file, index) => {
        formData.append(`image${index}`, file)
      })
      
      // Add image URLs
      externalFluxCombineImageUrls.forEach((url, index) => {
        if (url.trim()) {
          formData.append(`imageUrl${index}`, url.trim())
        }
      })
      
      // Prepare settings object
      const settings: any = { ...externalFluxCombineSettings }
      
      // Remove empty string values
      Object.keys(settings).forEach(key => {
        if (settings[key] === "") {
          delete settings[key]
        }
      })
      
      // Convert string numbers to actual numbers
      if (settings.seed) settings.seed = parseInt(settings.seed as string)
      
      console.log("[FRONTEND] External combine settings being sent:", settings)
      
      formData.append("settings", JSON.stringify(settings))

      // Call external endpoint
      const response = await fetch("/api/external/flux-pro-image-combine", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.error || `External API error (${response.status}). Please try again.`)
      }

      const result = await response.json()
      
      console.log("[FRONTEND] External API result:", result)
      
      // Capture generated prompt from external endpoint
      if (result.prompt) {
        setExternalFluxCombineGeneratedPrompt(result.prompt)
      } else {
        setExternalFluxCombineGeneratedPrompt(externalFluxCombinePrompt)
      }
      
      if (result.success && result.image) {
        setExternalFluxCombineResult(result.image)
      } else {
        throw new Error("No combined image received from external API")
      }
    } catch (err) {
      setExternalFluxCombineError(err instanceof Error ? err.message : "Failed to combine images via external API")
    } finally {
      setIsExternalFluxCombineGenerating(false)
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

  // External Flux Combine image handling functions
  const handleExternalCombineImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length > 0) {
      setExternalFluxCombineImages(prev => [...prev, ...files])
    }
  }

  const removeExternalCombineImage = (index: number) => {
    setExternalFluxCombineImages(prev => prev.filter((_, i) => i !== index))
  }

  const addExternalCombineImageUrl = () => {
    setExternalFluxCombineImageUrls(prev => [...prev, ""])
  }

  const updateExternalCombineImageUrl = (index: number, url: string) => {
    setExternalFluxCombineImageUrls(prev => {
      const newUrls = [...prev]
      newUrls[index] = url
      return newUrls
    })
  }

  const removeExternalCombineImageUrl = (index: number) => {
    setExternalFluxCombineImageUrls(prev => prev.filter((_, i) => i !== index))
  }

  // External Flux Ultra helper functions
  const syncExternalLocalStatesWithConfig = () => {
    setExternalFluxUltraPrompt(externalLocalFluxUltraPrompt)
    setExternalFluxUltraCanonicalConfig(prev => ({
      ...prev,
      subject: {
        ...prev.subject,
        objectDescription: externalLocalObjectDescription
      },
      elements: {
        ...prev.elements,
        landmark: externalLocalLandmark,
        city: externalLocalCity,
        others: externalLocalOthers
      },
      modifiers: {
        ...prev.modifiers,
        positives: externalLocalPositives
      }
    }))
  }

  const generateExternalFluxUltraCanonicalPreview = async () => {
    if (!useExternalFluxUltraCanonical || !externalLocalFluxUltraPrompt.trim()) {
      setExternalFluxUltraCanonicalPreview("")
      setIsExternalFluxUltraGeneratingCanonicalPreview(false)
      return
    }

    setIsExternalFluxUltraGeneratingCanonicalPreview(true)
    try {
      // Create temporary config with current local values
      const configWithLocalValues = {
        ...externalFluxUltraCanonicalConfig,
        subject: {
          ...externalFluxUltraCanonicalConfig.subject,
          objectDescription: externalLocalObjectDescription
        },
        elements: {
          ...externalFluxUltraCanonicalConfig.elements,
          landmark: externalLocalLandmark,
          city: externalLocalCity,
          others: externalLocalOthers
        },
        modifiers: {
          ...externalFluxUltraCanonicalConfig.modifiers,
          positives: externalLocalPositives
        }
      }

      const canonicalPrompt = await generationCanonicalPromptProcessor.generateCanonicalPrompt(
        externalLocalFluxUltraPrompt,
        configWithLocalValues
      )
      setExternalFluxUltraCanonicalPreview(canonicalPrompt)
      console.log('Generated external flux ultra canonical preview:', canonicalPrompt)
    } catch (error) {
      console.warn('Failed to generate external flux ultra canonical preview:', error)
      setExternalFluxUltraCanonicalPreview("")
    } finally {
      setIsExternalFluxUltraGeneratingCanonicalPreview(false)
    }
  }

  const handleExternalFluxUltraSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    // Sync local states before processing
    syncExternalLocalStatesWithConfig()

    if (!externalLocalFluxUltraPrompt.trim()) {
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
        prompt: externalLocalFluxUltraPrompt,
        finetuneId: externalFluxUltraFinetuneId,
        triggerPhrase: externalFluxUltraTriggerPhrase,
        finetuneStrength: externalFluxUltraFinetuneStrength,
        settings: externalFluxUltraSettings,
        useGenerationCanonical: useExternalFluxUltraCanonical
      }

      // Add canonical config if enabled
      if (useExternalFluxUltraCanonical) {
        const configWithLocalValues = {
          ...externalFluxUltraCanonicalConfig,
          subject: {
            ...externalFluxUltraCanonicalConfig.subject,
            objectDescription: externalLocalObjectDescription
          },
          elements: {
            ...externalFluxUltraCanonicalConfig.elements,
            landmark: externalLocalLandmark,
            city: externalLocalCity,
            others: externalLocalOthers
          },
          modifiers: {
            ...externalFluxUltraCanonicalConfig.modifiers,
            positives: externalLocalPositives
          }
        }
        requestBody.canonicalConfig = configWithLocalValues
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
      // For SeDream v4, enhancement is handled by the backend
      // Send original prompt and JSON options to avoid double enhancement
      let finalPrompt = sedreamPrompt

      const formData = new FormData()
      formData.append("image", sedreamImage)
      if (finalPrompt.trim()) {
        formData.append("prompt", finalPrompt)
      }
      formData.append("useJSONEnhancement", useSedreamJSONEnhancement.toString())
      formData.append("jsonIntensity", sedreamJsonIntensity.toString())
      formData.append("customEnhancementText", sedreamCustomEnhancementText)
      formData.append("aspect_ratio", sedreamAspectRatio)
      
      // Debug logging
      console.log("[Frontend] SeDream submission - aspect_ratio:", sedreamAspectRatio)
      console.log("[Frontend] All FormData entries:")
      for (const [key, value] of formData.entries()) {
        if (key !== "image") {
          console.log(`  ${key}: "${value}"`)
        }
      }
      
      // Add JSON enhancement options for backend processing
      const jsonOptions = {
        customText: sedreamCustomEnhancementText !== sedreamDefaultEnhancementText ? sedreamCustomEnhancementText : '',
        intensity: sedreamJsonIntensity
      }
      formData.append("jsonOptions", JSON.stringify(jsonOptions))

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
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="flux-ultra-finetuned">Generate Images</TabsTrigger>
          <TabsTrigger value="external-flux-ultra">External Generate</TabsTrigger>
          <TabsTrigger value="flux-pro-image-combine">Combine Images</TabsTrigger>
          <TabsTrigger value="external-flux-combine">External Combine</TabsTrigger>
          <TabsTrigger value="edit-image">Edit Image</TabsTrigger>
          <TabsTrigger value="sedream-v4-edit">Apply style</TabsTrigger>
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
                      <Select value={sedreamAspectRatio} onValueChange={setSedreamAspectRatio}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1:1">Square (1:1)</SelectItem>
                          <SelectItem value="16:9">Landscape (16:9)</SelectItem>
                          <SelectItem value="9:16">Portrait (9:16)</SelectItem>
                          <SelectItem value="4:3">Landscape (4:3)</SelectItem>
                          <SelectItem value="3:4">Portrait (3:4)</SelectItem>
                        </SelectContent>
                      </Select>
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
                        placeholder="Describe the image you want to generate. You can start with 'Create a poster of...' for example."
º                        value={fluxProPrompt}
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
                            Use the options below to further adjust the results of image combination
                          </div>

                          {/* Keep Options */}
                          <div className="space-y-3">
                            <Label className="text-sm font-medium">Basic Preservation Options</Label>
                            <div className="grid grid-cols-2 gap-3">
                              {canonicalOptions?.availableOptions?.keepOptions && Object.entries(canonicalOptions.availableOptions.keepOptions).map(([key, option]: [string, any]) => (
                                <div key={key} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`keep-${key}`}
                                    checked={canonicalConfig.keepOptions?.[key as keyof typeof canonicalConfig.keepOptions] || false}
                                    onCheckedChange={(checked) => 
                                      setCanonicalConfig(prev => ({
                                        ...prev,
                                        keepOptions: {
                                          ...prev.keepOptions,
                                          [key]: checked
                                        }
                                      }))
                                    }
                                  />
                                  <Label htmlFor={`keep-${key}`} className="text-sm">{option.label}</Label>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Preserve Options */}
                          <div className="space-y-3">
                            <Label className="text-sm font-medium">Advanced Preservation</Label>
                            <div className="grid grid-cols-1 gap-3">
                              {canonicalOptions?.availableOptions?.preserveOptions && Object.entries(canonicalOptions.availableOptions.preserveOptions).map(([key, option]: [string, any]) => (
                                <div key={key} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`preserve-${key}`}
                                    checked={canonicalConfig.preserveOptions?.[key as keyof typeof canonicalConfig.preserveOptions] || false}
                                    onCheckedChange={(checked) => 
                                      setCanonicalConfig(prev => ({
                                        ...prev,
                                        preserveOptions: {
                                          ...prev.preserveOptions,
                                          [key]: checked
                                        }
                                      }))
                                    }
                                  />
                                  <Label htmlFor={`preserve-${key}`} className="text-sm">{option.label}</Label>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Combine Options */}
                          <div className="space-y-3">
                            <Label className="text-sm font-medium">Integration Control</Label>
                            <div className="grid grid-cols-1 gap-3">
                              {canonicalOptions?.availableOptions?.combineOptions && Object.entries(canonicalOptions.availableOptions.combineOptions).map(([key, option]: [string, any]) => (
                                <div key={key} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`combine-${key}`}
                                    checked={canonicalConfig.combineOptions?.[key as keyof typeof canonicalConfig.combineOptions] || false}
                                    onCheckedChange={(checked) => 
                                      setCanonicalConfig(prev => ({
                                        ...prev,
                                        combineOptions: {
                                          ...prev.combineOptions,
                                          [key]: checked
                                        }
                                      }))
                                    }
                                  />
                                  <Label htmlFor={`combine-${key}`} className="text-sm">{option.label}</Label>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Secondary Image Preservation */}
                          <div className="space-y-3">
                            <Label className="text-sm font-medium">Secondary Image Preservation</Label>
                            
                            {/* Fidelity Level */}
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground">Fidelity Level</Label>
                              <Select
                                value={canonicalConfig.secondaryFidelityLevel}
                                onValueChange={(value: 'strict' | 'moderate' | 'adaptive') => 
                                  setCanonicalConfig(prev => ({
                                    ...prev,
                                    secondaryFidelityLevel: value
                                  }))
                                }
                              >
                                <SelectTrigger className="text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {canonicalOptions?.availableOptions?.secondaryFidelityLevels && Object.entries(canonicalOptions.availableOptions.secondaryFidelityLevels).map(([key, level]: [string, any]) => (
                                    <SelectItem key={key} value={key} className="text-xs" title={level.description}>
                                      {level.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Preserve Secondary Elements */}
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground">Preserve Specific Elements</Label>
                              <div className="grid grid-cols-2 gap-2">
                                {canonicalOptions?.availableOptions?.preserveSecondaryOptions && Object.entries(canonicalOptions.availableOptions.preserveSecondaryOptions).map(([key, option]: [string, any]) => (
                                  <div key={key} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`preserve-secondary-${key}`}
                                      checked={canonicalConfig.preserveSecondaryOptions?.[key as keyof typeof canonicalConfig.preserveSecondaryOptions] || false}
                                      onCheckedChange={(checked) => 
                                        setCanonicalConfig(prev => ({
                                          ...prev,
                                          preserveSecondaryOptions: {
                                            ...prev.preserveSecondaryOptions,
                                            [key]: checked
                                          }
                                        }))
                                      }
                                    />
                                    <Label htmlFor={`preserve-secondary-${key}`} className="text-xs">{option.label}</Label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Apply Style Options - Simplified to Texture and Overlay */}
                          <div className="grid grid-cols-2 gap-4">
                            {/* Texture */}
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Texture</Label>
                              <Select
                                value={canonicalConfig.applyStyle?.texture}
                                onValueChange={(value) => 
                                  setCanonicalConfig(prev => ({
                                    ...prev,
                                    applyStyle: {
                                      ...prev.applyStyle,
                                      texture: value
                                    }
                                  }))
                                }
                              >
                                <SelectTrigger className="text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {(canonicalOptions?.availableOptions?.texture || [
                                    "none",
                                    "Halftone dots",
                                    "Halftone lines",
                                    "Crosshatching",
                                    "Stippled dots",
                                    "Lithographic grain",
                                    "Risograph-style overprint"
                                  ]).map((texture: string) => (
                                    <SelectItem key={texture} value={texture} className="text-xs">
                                      {texture}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Overlay */}
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Overlay</Label>
                              <Select
                                value={canonicalConfig.applyStyle?.overlay}
                                onValueChange={(value) => 
                                  setCanonicalConfig(prev => ({
                                    ...prev,
                                    applyStyle: {
                                      ...prev.applyStyle,
                                      overlay: value
                                    }
                                  }))
                                }
                              >
                                <SelectTrigger className="text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {(canonicalOptions?.availableOptions?.overlay || [
                                    "none",
                                    "Purple #6E3CCB to Orange #F79533 Gradient",
                                    "Purple #6E3CCB to Magenta / Pink Gradient",
                                    "Purple #6E3CCB Shades Monochrome gradient",
                                    "Orange #F79533 Shades Monochrome gradient",
                                    "Light Violet #D8C8F0 Shades Monochrome gradient",
                                    "Grayscale Monochrome gradient"
                                  ]).map((overlay: string) => (
                                    <SelectItem key={overlay} value={overlay} className="text-xs">
                                      {overlay}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* Subject Options */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Framing</Label>
                              <Select
                                value={canonicalConfig.subjectFraming}
                                onValueChange={(value) => 
                                  setCanonicalConfig(prev => ({
                                    ...prev,
                                    subjectFraming: value
                                  }))
                                }
                              >
                                <SelectTrigger className="text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {canonicalOptions?.availableOptions?.framing?.map((framing: string) => (
                                    <SelectItem key={framing} value={framing} className="text-xs">
                                      {framing}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Composition</Label>
                              <Select
                                value={canonicalConfig.subjectComposition}
                                onValueChange={(value) => 
                                  setCanonicalConfig(prev => ({
                                    ...prev,
                                    subjectComposition: value
                                  }))
                                }
                              >
                                <SelectTrigger className="text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {canonicalOptions?.availableOptions?.composition?.map((composition: string) => (
                                    <SelectItem key={composition} value={composition} className="text-xs">
                                      {composition}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* Apply Button */}
                          <div className="pt-4 border-t border-emerald-200 dark:border-emerald-800">
                            <Button
                              type="button"
                              onClick={generateCanonicalPreview}
                              disabled={isGeneratingCombineCanonicalPreview || !localFluxCombinePrompt.trim()}
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              {isGeneratingCombineCanonicalPreview ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border border-white border-t-transparent mr-2"></div>
                                  Generating...
                                </>
                              ) : (
                                <>
                                  <Sparkles className="h-4 w-4 mr-2" />
                                  Apply & Generate Preview
                                </>
                              )}
                            </Button>
                            <p className="text-xs text-muted-foreground text-center mt-2">
                              Apply your settings to generate canonical prompt preview
                            </p>
                          </div>

                          {/* Preview */}
                          {(canonicalPreview || isGeneratingCombineCanonicalPreview) && (
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Generated Prompt Preview</Label>
                              <div className="p-3 bg-muted rounded-md max-h-40 overflow-y-auto">
                                {isGeneratingCombineCanonicalPreview ? (
                                  <div className="flex items-center justify-center p-4">
                                    <div className="animate-spin rounded-full h-4 w-4 border border-muted-foreground border-t-transparent mr-2"></div>
                                    <span className="text-xs text-muted-foreground">Generating preview...</span>
                                  </div>
                                ) : (
                                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                                    {canonicalPreview}
                                  </pre>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
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
                          disabled={!localFluxCombinePrompt.trim() || !fluxCombineUseJSONEnhancement}
                          onClick={() => generateFluxCombineEnhancementPreview(localFluxCombinePrompt)}
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
                              1: Strictest • 2: Strict • 3: Balanced • 4: Permissive • 5: Most Permissive
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

          {/* External Flux Pro Image Combine Tab - For Testing External Endpoint */}
          <TabsContent value="external-flux-combine" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Form Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" />
                    External Combine Images (Test)
                  </CardTitle>
                  <CardDescription>
                    Test the external endpoint with canonical prompt structure (calls /api/external/flux-pro-image-combine)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <form onSubmit={handleExternalFluxCombineSubmit} className="space-y-4">
                    {/* Image Upload Section */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Upload Images (minimum 2)</Label>
                        <Input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleExternalCombineImageUpload}
                          className="cursor-pointer"
                        />
                        {externalFluxCombineImages.length > 0 && (
                          <div className="space-y-2">
                            <Label>Uploaded Files:</Label>
                            <div className="grid grid-cols-2 gap-2">
                              {externalFluxCombineImages.map((file, index) => (
                                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                  <span className="text-sm text-gray-600 truncate">{file.name}</span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeExternalCombineImage(index)}
                                    className="h-6 w-6 p-0"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Image URLs Section */}
                      <div className="space-y-2">
                        <Label>Or Add Image URLs</Label>
                        {externalFluxCombineImageUrls.map((url, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              value={url}
                              onChange={(e) => updateExternalCombineImageUrl(index, e.target.value)}
                              placeholder="https://example.com/image.jpg"
                              className="flex-1"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => removeExternalCombineImageUrl(index)}
                              className="px-3"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          onClick={addExternalCombineImageUrl}
                          className="w-full"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Image URL
                        </Button>
                      </div>
                    </div>

                    {/* Prompt Section */}
                    <div className="space-y-2">
                      <Label htmlFor="external-flux-combine-prompt">Combination Prompt</Label>
                      <Textarea
                        id="external-flux-combine-prompt"
                        value={externalFluxCombinePrompt}
                        onChange={(e) => setExternalFluxCombinePrompt(e.target.value)}
                        placeholder="Describe how you want to combine the images..."
                        className="min-h-[100px]"
                        required
                      />
                    </div>

                    {/* Canonical Prompt Toggle */}
                    <div className="space-y-4 p-4 border rounded-lg bg-blue-50">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="external-use-canonical"
                          checked={externalUseCanonicalPrompt}
                          onCheckedChange={(checked) => setExternalUseCanonicalPrompt(checked as boolean)}
                        />
                        <Label htmlFor="external-use-canonical" className="text-sm font-medium">
                          Use Canonical Prompt Structure (Default: ON)
                        </Label>
                      </div>
                      <p className="text-xs text-blue-600">
                        ✅ Canonical prompt is enabled by default for the external endpoint. This generates structured prompts with TASK, APPLY, STYLE, etc.
                      </p>
                    </div>

                    {/* JSON Enhancement Toggle */}
                    <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="external-use-json"
                          checked={externalUseJSONEnhancement}
                          onCheckedChange={(checked) => setExternalUseJSONEnhancement(checked as boolean)}
                        />
                        <Label htmlFor="external-use-json" className="text-sm font-medium">
                          Use JSON Enhancement (Default: OFF)
                        </Label>
                      </div>
                      <p className="text-xs text-gray-600">
                        JSON enhancement is disabled by default when canonical prompt is enabled.
                      </p>
                    </div>

                    {/* External Advanced Image Options - Canonical Prompt Configuration */}
                    {externalUseCanonicalPrompt && (
                      <div className="space-y-4 p-4 border rounded-lg bg-emerald-50 dark:bg-emerald-950/20">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-2">
                              <Switch
                                id="external-advanced-options"
                                checked={true}
                                disabled
                                className="data-[state=checked]:bg-emerald-500"
                              />
                              <Label htmlFor="external-advanced-options" className="font-medium">
                                Advanced Image Options
                              </Label>
                            </div>
                            <div className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-medium">
                              BETA
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-4 pt-2 border-t border-emerald-200 dark:border-emerald-800">
                          <div className="text-sm text-muted-foreground">
                            Use the options below to further adjust the results of image combination
                          </div>

                          {/* Keep Options */}
                          <div className="space-y-3">
                            <Label className="text-sm font-medium">Basic Preservation Options</Label>
                            <div className="grid grid-cols-2 gap-3">
                              {canonicalOptions?.availableOptions?.keepOptions && Object.entries(canonicalOptions.availableOptions.keepOptions).map(([key, option]: [string, any]) => (
                                <div key={key} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`external-keep-${key}`}
                                    checked={canonicalConfig.keepOptions?.[key as keyof typeof canonicalConfig.keepOptions] || false}
                                    onCheckedChange={(checked) => 
                                      setCanonicalConfig(prev => ({
                                        ...prev,
                                        keepOptions: {
                                          ...prev.keepOptions,
                                          [key]: checked
                                        }
                                      }))
                                    }
                                  />
                                  <Label htmlFor={`external-keep-${key}`} className="text-sm">{option.label}</Label>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Preserve Options */}
                          <div className="space-y-3">
                            <Label className="text-sm font-medium">Advanced Preservation</Label>
                            <div className="grid grid-cols-1 gap-3">
                              {canonicalOptions?.availableOptions?.preserveOptions && Object.entries(canonicalOptions.availableOptions.preserveOptions).map(([key, option]: [string, any]) => (
                                <div key={key} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`external-preserve-${key}`}
                                    checked={canonicalConfig.preserveOptions?.[key as keyof typeof canonicalConfig.preserveOptions] || false}
                                    onCheckedChange={(checked) => 
                                      setCanonicalConfig(prev => ({
                                        ...prev,
                                        preserveOptions: {
                                          ...prev.preserveOptions,
                                          [key]: checked
                                        }
                                      }))
                                    }
                                  />
                                  <Label htmlFor={`external-preserve-${key}`} className="text-sm">{option.label}</Label>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Combine Options */}
                          <div className="space-y-3">
                            <Label className="text-sm font-medium">Integration Control</Label>
                            <div className="grid grid-cols-1 gap-3">
                              {canonicalOptions?.availableOptions?.combineOptions && Object.entries(canonicalOptions.availableOptions.combineOptions).map(([key, option]: [string, any]) => (
                                <div key={key} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`external-combine-${key}`}
                                    checked={canonicalConfig.combineOptions?.[key as keyof typeof canonicalConfig.combineOptions] || false}
                                    onCheckedChange={(checked) => 
                                      setCanonicalConfig(prev => ({
                                        ...prev,
                                        combineOptions: {
                                          ...prev.combineOptions,
                                          [key]: checked
                                        }
                                      }))
                                    }
                                  />
                                  <Label htmlFor={`external-combine-${key}`} className="text-sm">{option.label}</Label>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Secondary Image Preservation */}
                          <div className="space-y-3">
                            <Label className="text-sm font-medium">Secondary Image Preservation</Label>
                            
                            {/* Fidelity Level */}
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground">Fidelity Level</Label>
                              <Select
                                value={canonicalConfig.secondaryFidelityLevel}
                                onValueChange={(value: 'strict' | 'moderate' | 'adaptive') => 
                                  setCanonicalConfig(prev => ({
                                    ...prev,
                                    secondaryFidelityLevel: value
                                  }))
                                }
                              >
                                <SelectTrigger className="text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {canonicalOptions?.availableOptions?.secondaryFidelityLevels && Object.entries(canonicalOptions.availableOptions.secondaryFidelityLevels).map(([key, level]: [string, any]) => (
                                    <SelectItem key={key} value={key} className="text-xs" title={level.description}>
                                      {level.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Preserve Secondary Elements */}
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground">Preserve Specific Elements</Label>
                              <div className="grid grid-cols-2 gap-2">
                                {canonicalOptions?.availableOptions?.preserveSecondaryOptions && Object.entries(canonicalOptions.availableOptions.preserveSecondaryOptions).map(([key, option]: [string, any]) => (
                                  <div key={key} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`external-preserve-secondary-${key}`}
                                      checked={canonicalConfig.preserveSecondaryOptions?.[key as keyof typeof canonicalConfig.preserveSecondaryOptions] || false}
                                      onCheckedChange={(checked) => 
                                        setCanonicalConfig(prev => ({
                                          ...prev,
                                          preserveSecondaryOptions: {
                                            ...prev.preserveSecondaryOptions,
                                            [key]: checked
                                          }
                                        }))
                                      }
                                    />
                                    <Label htmlFor={`external-preserve-secondary-${key}`} className="text-xs">{option.label}</Label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Apply Style Options - Simplified to Texture and Overlay */}
                          <div className="grid grid-cols-2 gap-4">
                            {/* Texture */}
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Texture</Label>
                              <Select
                                value={canonicalConfig.applyStyle?.texture}
                                onValueChange={(value) => 
                                  setCanonicalConfig(prev => ({
                                    ...prev,
                                    applyStyle: {
                                      ...prev.applyStyle,
                                      texture: value
                                    }
                                  }))
                                }
                              >
                                <SelectTrigger className="text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {(canonicalOptions?.availableOptions?.texture || [
                                    "none",
                                    "Halftone dots",
                                    "Halftone lines",
                                    "Crosshatching",
                                    "Stippled dots",
                                    "Lithographic grain",
                                    "Risograph-style overprint"
                                  ]).map((texture: string) => (
                                    <SelectItem key={texture} value={texture} className="text-xs">
                                      {texture}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Overlay */}
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Overlay</Label>
                              <Select
                                value={canonicalConfig.applyStyle?.overlay}
                                onValueChange={(value) => 
                                  setCanonicalConfig(prev => ({
                                    ...prev,
                                    applyStyle: {
                                      ...prev.applyStyle,
                                      overlay: value
                                    }
                                  }))
                                }
                              >
                                <SelectTrigger className="text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {(canonicalOptions?.availableOptions?.overlay || [
                                    "none",
                                    "Purple #6E3CCB to Orange #F79533 Gradient",
                                    "Purple #6E3CCB to Magenta / Pink Gradient",
                                    "Purple #6E3CCB Shades Monochrome gradient",
                                    "Orange #F79533 Shades Monochrome gradient",
                                    "Light Violet #D8C8F0 Shades Monochrome gradient",
                                    "Grayscale Monochrome gradient"
                                  ]).map((overlay: string) => (
                                    <SelectItem key={overlay} value={overlay} className="text-xs">
                                      {overlay}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* Subject Options */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Framing</Label>
                              <Select
                                value={canonicalConfig.subjectFraming}
                                onValueChange={(value) => 
                                  setCanonicalConfig(prev => ({
                                    ...prev,
                                    subjectFraming: value
                                  }))
                                }
                              >
                                <SelectTrigger className="text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {canonicalOptions?.availableOptions?.framing?.map((framing: string) => (
                                    <SelectItem key={framing} value={framing} className="text-xs">
                                      {framing}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Composition</Label>
                              <Select
                                value={canonicalConfig.subjectComposition}
                                onValueChange={(value) => 
                                  setCanonicalConfig(prev => ({
                                    ...prev,
                                    subjectComposition: value
                                  }))
                                }
                              >
                                <SelectTrigger className="text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {canonicalOptions?.availableOptions?.composition?.map((composition: string) => (
                                    <SelectItem key={composition} value={composition} className="text-xs">
                                      {composition}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* External Preview */}
                          {canonicalPreview && (
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Generated Prompt Preview</Label>
                              <div className="p-3 bg-muted rounded-md max-h-40 overflow-y-auto">
                                <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                                  {canonicalPreview}
                                </pre>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Canonical Preview */}
                    {externalUseCanonicalPrompt && canonicalPreview && (
                      <div className="space-y-2">
                        <Label>Canonical Prompt Preview</Label>
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                          <pre className="text-xs text-blue-800 whitespace-pre-wrap font-mono">
                            {canonicalPreview}
                          </pre>
                        </div>
                      </div>
                    )}

                    {/* Advanced Settings Toggle */}
                    <div className="flex items-center space-x-3 p-3 border rounded-lg bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-950/20 dark:to-slate-950/20">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="external-flux-combine-advanced"
                          checked={showExternalFluxCombineAdvanced}
                          onCheckedChange={setShowExternalFluxCombineAdvanced}
                          className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-300 dark:data-[state=unchecked]:bg-gray-600"
                        />
                        <Label htmlFor="external-flux-combine-advanced" className="cursor-pointer font-medium">
                          Advanced Image Options
                        </Label>
                      </div>
                      <div className={`w-2 h-2 rounded-full ${showExternalFluxCombineAdvanced ? 'bg-green-500' : 'bg-gray-400'} transition-colors`}></div>
                    </div>

                    {showExternalFluxCombineAdvanced && (
                      <div className="space-y-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800/50">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="external-flux-combine-aspect-ratio">Aspect Ratio</Label>
                            <Select
                              value={externalFluxCombineSettings.aspect_ratio}
                              onValueChange={(value) => setExternalFluxCombineSettings(prev => ({ ...prev, aspect_ratio: value }))}
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
                            <Label htmlFor="external-flux-combine-guidance">
                              Guidance Scale: {externalFluxCombineSettings.guidance_scale}
                            </Label>
                            <Slider
                              id="external-flux-combine-guidance"
                              min={1}
                              max={20}
                              step={0.1}
                              value={[externalFluxCombineSettings.guidance_scale]}
                              onValueChange={(value) => setExternalFluxCombineSettings(prev => ({ ...prev, guidance_scale: value[0] }))}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="external-flux-combine-safety">
                              Safety Tolerance: {externalFluxCombineSettings.safety_tolerance}
                            </Label>
                            <Slider
                              id="external-flux-combine-safety"
                              min={1}
                              max={5}
                              step={1}
                              value={[externalFluxCombineSettings.safety_tolerance]}
                              onValueChange={(value) => setExternalFluxCombineSettings(prev => ({ ...prev, safety_tolerance: value[0] }))}
                            />
                            <p className="text-xs text-muted-foreground">
                              1: Strictest • 2: Strict • 3: Balanced • 4: Permissive • 5: Most Permissive
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="external-flux-combine-output-format">Output Format</Label>
                            <Select
                              value={externalFluxCombineSettings.output_format}
                              onValueChange={(value) => setExternalFluxCombineSettings(prev => ({ ...prev, output_format: value }))}
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
                            <Label htmlFor="external-flux-combine-seed">Seed (optional)</Label>
                            <Input
                              id="external-flux-combine-seed"
                              type="number"
                              placeholder="Random if empty"
                              value={externalFluxCombineSettings.seed}
                              onChange={(e) => setExternalFluxCombineSettings(prev => ({ ...prev, seed: e.target.value }))}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="external-flux-combine-num-images">
                              Number of Images: {externalFluxCombineSettings.num_images}
                            </Label>
                            <Input
                              id="external-flux-combine-num-images"
                              type="number"
                              min="1"
                              max="4"
                              value={externalFluxCombineSettings.num_images}
                              onChange={(e) => setExternalFluxCombineSettings(prev => ({ ...prev, num_images: parseInt(e.target.value) || 1 }))}
                            />
                          </div>
                        </div>

                        {/* Additional Settings */}
                        <div className="space-y-3">
                          <div className="flex items-center space-x-3 p-3 border rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
                            <div className="flex items-center space-x-2">
                              <Switch
                                id="external-flux-combine-enhance-prompt"
                                checked={externalFluxCombineSettings.enhance_prompt}
                                onCheckedChange={(checked) => setExternalFluxCombineSettings(prev => ({ ...prev, enhance_prompt: checked }))}
                                className="data-[state=checked]:bg-purple-500 data-[state=unchecked]:bg-gray-300 dark:data-[state=unchecked]:bg-gray-600"
                              />
                              <Label htmlFor="external-flux-combine-enhance-prompt" className="cursor-pointer font-medium">
                                Enhance Prompt
                              </Label>
                            </div>
                            <div className={`w-2 h-2 rounded-full ${externalFluxCombineSettings.enhance_prompt ? 'bg-purple-500' : 'bg-gray-400'} transition-colors`}></div>
                          </div>

                          <div className="flex items-center space-x-3 p-3 border rounded-lg bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20">
                            <div className="flex items-center space-x-2">
                              <Switch
                                id="external-flux-combine-safety-checker"
                                checked={externalFluxCombineSettings.enable_safety_checker}
                                onCheckedChange={(checked) => setExternalFluxCombineSettings(prev => ({ ...prev, enable_safety_checker: checked }))}
                                className="data-[state=checked]:bg-blue-500 data-[state=unchecked]:bg-gray-300 dark:data-[state=unchecked]:bg-gray-600"
                              />
                              <Label htmlFor="external-flux-combine-safety-checker" className="cursor-pointer font-medium">
                                Enable Safety Checker
                              </Label>
                            </div>
                            <div className={`w-2 h-2 rounded-full ${externalFluxCombineSettings.enable_safety_checker ? 'bg-blue-500' : 'bg-gray-400'} transition-colors`}></div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      disabled={isExternalFluxCombineGenerating || externalFluxCombineImages.length + externalFluxCombineImageUrls.length < 2}
                      className="w-full"
                    >
                      {isExternalFluxCombineGenerating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Combining via External API...
                        </>
                      ) : (
                        "Combine Images (External API)"
                      )}
                    </Button>

                    {externalFluxCombineError && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{externalFluxCombineError}</AlertDescription>
                      </Alert>
                    )}
                  </form>
                </CardContent>
              </Card>

              {/* Result Section */}
              <Card>
                <CardHeader>
                  <CardTitle>External API Result</CardTitle>
                </CardHeader>
                <CardContent>
                  {externalFluxCombineResult ? (
                    <div className="space-y-4">
                      <div className="relative">
                        <img 
                          src={externalFluxCombineResult} 
                          alt="External combined result" 
                          className="w-full h-auto rounded-lg shadow-lg"
                        />
                        <Button
                          onClick={() => window.open(externalFluxCombineResult, '_blank')}
                          className="absolute top-2 right-2"
                          size="sm"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {externalFluxCombineGeneratedPrompt && (
                        <div className="space-y-2">
                          <Label>Generated Prompt (External API)</Label>
                          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                            <pre className="text-xs text-green-800 whitespace-pre-wrap font-mono">
                              {externalFluxCombineGeneratedPrompt}
                            </pre>
                          </div>
                        </div>
                      )}
                      
                      <div className="text-xs text-gray-500 space-y-1">
                        <p>✅ Generated via External API: /api/external/flux-pro-image-combine</p>
                        <p>🎯 Canonical Prompt: {externalUseCanonicalPrompt ? 'Enabled' : 'Disabled'}</p>
                        <p>🔧 JSON Enhancement: {externalUseJSONEnhancement ? 'Enabled' : 'Disabled'}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-96 border-2 border-dashed border-gray-300 rounded-lg">
                      <p className="text-gray-500">External combined image will appear here</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
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

                    {/* GENERATION CANONICAL PROMPT CONTROLS */}
                    <div className="space-y-4 p-4 border rounded-lg bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="use-generation-canonical"
                              checked={useGenerationCanonical}
                              onCheckedChange={setUseGenerationCanonical}
                              className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-gray-300 dark:data-[state=unchecked]:bg-gray-600"
                            />
                            <Label htmlFor="use-generation-canonical" className="font-medium">
                              Advanced Generation Options
                            </Label>
                          </div>
                          <div className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-medium">
                            BETA
                          </div>
                        </div>
                      </div>
                      
                      {/* Debug Status Indicator */}
                      <div className="text-xs space-y-1">
                        <div className={`flex items-center gap-2 ${useGenerationCanonical ? 'text-green-600' : 'text-gray-500'}`}>
                          <div className={`w-2 h-2 rounded-full ${useGenerationCanonical ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                          Status: {useGenerationCanonical ? 'Active' : 'Inactive'}
                        </div>
                        <div className={`flex items-center gap-2 ${generationCanonicalOptions ? 'text-green-600' : 'text-red-500'}`}>
                          <div className={`w-2 h-2 rounded-full ${generationCanonicalOptions ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          Config: {generationCanonicalOptions ? 'Loaded' : 'Not loaded'}
                        </div>
                        <div className={`flex items-center gap-2 ${generationCanonicalPreview ? 'text-green-600' : isGeneratingCanonicalPreview ? 'text-yellow-600' : 'text-gray-500'}`}>
                          <div className={`w-2 h-2 rounded-full ${generationCanonicalPreview ? 'bg-green-500' : isGeneratingCanonicalPreview ? 'bg-yellow-500 animate-pulse' : 'bg-gray-400'}`}></div>
                          Preview: {isGeneratingCanonicalPreview ? 'Generating...' : generationCanonicalPreview ? 'Ready' : 'Click Apply'}
                        </div>
                      </div>
                      
                      {useGenerationCanonical && (
                        <div className="space-y-4 pt-2 border-t border-emerald-200 dark:border-emerald-800">
                          <div className="text-sm text-muted-foreground">
                            Configure structured prompt generation for precise image creation
                          </div>

                          {/* Subject Configuration */}
                          <div className="space-y-3">
                            <Label className="text-sm font-medium">Subject</Label>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  id="subject-individual"
                                  name="subject-type"
                                  value="individual"
                                  checked={generationCanonicalConfig.subject.type === 'individual'}
                                  onChange={(e) => setGenerationCanonicalConfig(prev => ({
                                    ...prev,
                                    subject: { ...prev.subject, type: e.target.value as any }
                                  }))}
                                />
                                <Label htmlFor="subject-individual" className="text-sm">Individual</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  id="subject-group"
                                  name="subject-type"
                                  value="group"
                                  checked={generationCanonicalConfig.subject.type === 'group'}
                                  onChange={(e) => setGenerationCanonicalConfig(prev => ({
                                    ...prev,
                                    subject: { ...prev.subject, type: e.target.value as any }
                                  }))}
                                />
                                <Label htmlFor="subject-group" className="text-sm">Group</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  id="subject-crowd"
                                  name="subject-type"
                                  value="crowd"
                                  checked={generationCanonicalConfig.subject.type === 'crowd'}
                                  onChange={(e) => setGenerationCanonicalConfig(prev => ({
                                    ...prev,
                                    subject: { ...prev.subject, type: e.target.value as any }
                                  }))}
                                />
                                <Label htmlFor="subject-crowd" className="text-sm">Crowd (&gt;5)</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  id="subject-object"
                                  name="subject-type"
                                  value="object"
                                  checked={generationCanonicalConfig.subject.type === 'object'}
                                  onChange={(e) => setGenerationCanonicalConfig(prev => ({
                                    ...prev,
                                    subject: { ...prev.subject, type: e.target.value as any }
                                  }))}
                                />
                                <Label htmlFor="subject-object" className="text-sm">Object</Label>
                              </div>
                            </div>
                            
                            {/* Group Size Input */}
                            {generationCanonicalConfig.subject.type === 'group' && (
                              <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Group Size (2-5 people)</Label>
                                <Input
                                  type="number"
                                  min="2"
                                  max="5"
                                  value={generationCanonicalConfig.subject.groupSize || 3}
                                  onChange={(e) => setGenerationCanonicalConfig(prev => ({
                                    ...prev,
                                    subject: { ...prev.subject, groupSize: parseInt(e.target.value) || 3 }
                                  }))}
                                  className="w-24"
                                />
                              </div>
                            )}
                            
                            {/* Object Description Input */}
                            {generationCanonicalConfig.subject.type === 'object' && (
                              <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Object Description</Label>
                                <Input
                                  placeholder="landmark, animal, building, etc."
                                  value={localObjectDescription}
                                  onChange={(e) => setLocalObjectDescription(e.target.value)}
                                />
                              </div>
                            )}
                          </div>

                          {/* Appearance Configuration */}
                          <div className="space-y-3">
                            <Label className="text-sm font-medium">Appearance</Label>
                            
                            {/* Color Relevance */}
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground">Brand Colors</Label>
                              <div className="grid grid-cols-3 gap-2">
                                {generationCanonicalOptions?.brandColors?.map((color: string, index: number) => {
                                  const colorName = color.split(' ').slice(-2).join(' ')
                                  const isSelected = generationCanonicalConfig.appearance.colorRelevance.includes(color)
                                  return (
                                    <div key={index} className="flex items-center space-x-2">
                                      <Checkbox
                                        id={`color-${index}`}
                                        checked={isSelected}
                                        onCheckedChange={(checked) => {
                                          setGenerationCanonicalConfig(prev => ({
                                            ...prev,
                                            appearance: {
                                              ...prev.appearance,
                                              colorRelevance: checked 
                                                ? [...prev.appearance.colorRelevance, color]
                                                : prev.appearance.colorRelevance.filter(c => c !== color)
                                            }
                                          }))
                                        }}
                                      />
                                      <Label htmlFor={`color-${index}`} className="text-xs">{colorName}</Label>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                            
                            {/* Color Intensity */}
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground">Color Intensity</Label>
                              <div className="flex gap-4">
                                {['subtle', 'moderate', 'prominent'].map((intensity) => (
                                  <div key={intensity} className="flex items-center space-x-2">
                                    <input
                                      type="radio"
                                      id={`intensity-${intensity}`}
                                      name="color-intensity"
                                      value={intensity}
                                      checked={generationCanonicalConfig.appearance.colorIntensity === intensity}
                                      onChange={(e) => setGenerationCanonicalConfig(prev => ({
                                        ...prev,
                                        appearance: { ...prev.appearance, colorIntensity: e.target.value as any }
                                      }))}
                                    />
                                    <Label htmlFor={`intensity-${intensity}`} className="text-xs capitalize">{intensity}</Label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Style Configuration */}
                          <div className="space-y-3">
                            <Label className="text-sm font-medium">Style</Label>
                            <div className="flex gap-4">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  id="style-realistic"
                                  name="generation-style"
                                  value="realistic"
                                  checked={generationCanonicalConfig.style.type === 'realistic'}
                                  onChange={(e) => setGenerationCanonicalConfig(prev => ({
                                    ...prev,
                                    style: { ...prev.style, type: e.target.value as any }
                                  }))}
                                />
                                <Label htmlFor="style-realistic" className="text-sm">Realistic</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  id="style-illustrative"
                                  name="generation-style"
                                  value="illustrative"
                                  checked={generationCanonicalConfig.style.type === 'illustrative'}
                                  onChange={(e) => setGenerationCanonicalConfig(prev => ({
                                    ...prev,
                                    style: { ...prev.style, type: e.target.value as any }
                                  }))}
                                />
                                <Label htmlFor="style-illustrative" className="text-sm">Illustrative</Label>
                              </div>
                            </div>
                          </div>

                          {/* Elements Configuration */}
                          <div className="space-y-3">
                            <Label className="text-sm font-medium">Elements</Label>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Landmark</Label>
                                <Input
                                  placeholder="e.g., Eiffel Tower, Central Park"
                                  value={localLandmark}
                                  onChange={(e) => setLocalLandmark(e.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">City</Label>
                                <Input
                                  placeholder="e.g., New York, Paris, Tokyo"
                                  value={localCity}
                                  onChange={(e) => setLocalCity(e.target.value)}
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground">Other Elements</Label>
                              <Input
                                placeholder="Additional elements to include..."
                                value={localOthers}
                                onChange={(e) => setLocalOthers(e.target.value)}
                              />
                            </div>
                          </div>

                          {/* Modifiers Configuration */}
                          <div className="space-y-3">
                            <Label className="text-sm font-medium">Modifiers</Label>
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground">Positives (enhance)</Label>
                              <Textarea
                                placeholder="terms to emphasize..."
                                value={localPositives}
                                onChange={(e) => setLocalPositives(e.target.value)}
                                rows={2}
                              />
                              <p className="text-xs text-muted-foreground">
                                Negative terms are automatically applied from backend configuration
                              </p>
                            </div>
                          </div>

                          {/* Apply Button */}
                          <div className="pt-4 border-t border-emerald-200 dark:border-emerald-800">
                            <Button
                              type="button"
                              onClick={generateGenerationCanonicalPreview}
                              disabled={isGeneratingCanonicalPreview || !localFluxUltraPrompt.trim()}
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              {isGeneratingCanonicalPreview ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border border-white border-t-transparent mr-2"></div>
                                  Generating...
                                </>
                              ) : (
                                <>
                                  <Sparkles className="h-4 w-4 mr-2" />
                                  Apply & Generate Preview
                                </>
                              )}
                            </Button>
                            <p className="text-xs text-muted-foreground text-center mt-2">
                              Apply your settings to generate canonical prompt preview
                            </p>
                          </div>

                          {/* Generation Preview */}
                          {(generationCanonicalPreview || isGeneratingCanonicalPreview) && (
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Generated Prompt Preview</Label>
                              <div className="p-3 bg-muted rounded-md max-h-40 overflow-y-auto">
                                {isGeneratingCanonicalPreview ? (
                                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                                    <div className="animate-spin rounded-full h-3 w-3 border border-muted-foreground border-t-transparent"></div>
                                    <span>Generating preview...</span>
                                  </div>
                                ) : (
                                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                                    {generationCanonicalPreview}
                                  </pre>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
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

          {/* External Flux Ultra Finetuned Tab */}
          <TabsContent value="external-flux-ultra" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* External Flux Ultra Generation Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-500" />
                    External Generate Images (Test)
                  </CardTitle>
                  <CardDescription>
                    Test the external endpoint for image generation with canonical prompt structure (calls /api/external/flux-ultra-finetuned)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <form onSubmit={handleExternalFluxUltraSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="externalFluxUltraPrompt">Prompt</Label>
                      <Textarea
                        id="externalFluxUltraPrompt"
                        placeholder="Describe the image you want to generate. You can start with 'Create a poster of...' for example."
                        value={externalLocalFluxUltraPrompt}
                        onChange={(e) => setExternalLocalFluxUltraPrompt(e.target.value)}
                        rows={3}
                      />
                    </div>

                    {/* GENERATION CANONICAL PROMPT CONTROLS */}
                    <div className="space-y-4 p-4 border rounded-lg bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="use-external-generation-canonical"
                              checked={useExternalFluxUltraCanonical}
                              onCheckedChange={setUseExternalFluxUltraCanonical}
                              className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-gray-300 dark:data-[state=unchecked]:bg-gray-600"
                            />
                            <Label htmlFor="use-external-generation-canonical" className="font-medium">
                              Advanced Generation Options
                            </Label>
                          </div>
                          <div className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-medium">
                            BETA
                          </div>
                        </div>
                      </div>
                      
                      {/* Debug Status Indicator */}
                      <div className="text-xs space-y-1">
                        <div className={`flex items-center gap-2 ${useExternalFluxUltraCanonical ? 'text-green-600' : 'text-gray-500'}`}>
                          <div className={`w-2 h-2 rounded-full ${useExternalFluxUltraCanonical ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                          Status: {useExternalFluxUltraCanonical ? 'Active' : 'Inactive'}
                        </div>
                        <div className={`flex items-center gap-2 ${generationCanonicalOptions ? 'text-green-600' : 'text-red-500'}`}>
                          <div className={`w-2 h-2 rounded-full ${generationCanonicalOptions ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          Config: {generationCanonicalOptions ? 'Loaded' : 'Not loaded'}
                        </div>
                        <div className={`flex items-center gap-2 ${externalFluxUltraCanonicalPreview ? 'text-green-600' : isExternalFluxUltraGeneratingCanonicalPreview ? 'text-yellow-600' : 'text-gray-500'}`}>
                          <div className={`w-2 h-2 rounded-full ${externalFluxUltraCanonicalPreview ? 'bg-green-500' : isExternalFluxUltraGeneratingCanonicalPreview ? 'bg-yellow-500 animate-pulse' : 'bg-gray-400'}`}></div>
                          Preview: {isExternalFluxUltraGeneratingCanonicalPreview ? 'Generating...' : externalFluxUltraCanonicalPreview ? 'Ready' : 'Click Apply'}
                        </div>
                      </div>
                      
                      {useExternalFluxUltraCanonical && (
                        <div className="space-y-4 pt-2 border-t border-emerald-200 dark:border-emerald-800">
                          <div className="text-sm text-muted-foreground">
                            Configure structured prompt generation for precise image creation
                          </div>

                          {/* Subject Configuration */}
                          <div className="space-y-3">
                            <Label className="text-sm font-medium">Subject</Label>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  id="external-subject-individual"
                                  name="external-subject-type"
                                  value="individual"
                                  checked={externalFluxUltraCanonicalConfig.subject.type === 'individual'}
                                  onChange={(e) => setExternalFluxUltraCanonicalConfig(prev => ({
                                    ...prev,
                                    subject: { ...prev.subject, type: e.target.value as any }
                                  }))}
                                />
                                <Label htmlFor="external-subject-individual" className="text-sm">Individual</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  id="external-subject-group"
                                  name="external-subject-type"
                                  value="group"
                                  checked={externalFluxUltraCanonicalConfig.subject.type === 'group'}
                                  onChange={(e) => setExternalFluxUltraCanonicalConfig(prev => ({
                                    ...prev,
                                    subject: { ...prev.subject, type: e.target.value as any }
                                  }))}
                                />
                                <Label htmlFor="external-subject-group" className="text-sm">Group</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  id="external-subject-crowd"
                                  name="external-subject-type"
                                  value="crowd"
                                  checked={externalFluxUltraCanonicalConfig.subject.type === 'crowd'}
                                  onChange={(e) => setExternalFluxUltraCanonicalConfig(prev => ({
                                    ...prev,
                                    subject: { ...prev.subject, type: e.target.value as any }
                                  }))}
                                />
                                <Label htmlFor="external-subject-crowd" className="text-sm">Crowd (&gt;5)</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  id="external-subject-object"
                                  name="external-subject-type"
                                  value="object"
                                  checked={externalFluxUltraCanonicalConfig.subject.type === 'object'}
                                  onChange={(e) => setExternalFluxUltraCanonicalConfig(prev => ({
                                    ...prev,
                                    subject: { ...prev.subject, type: e.target.value as any }
                                  }))}
                                />
                                <Label htmlFor="external-subject-object" className="text-sm">Object</Label>
                              </div>
                            </div>
                            
                            {/* Group Size Input */}
                            {externalFluxUltraCanonicalConfig.subject.type === 'group' && (
                              <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Group Size (2-5 people)</Label>
                                <Input
                                  type="number"
                                  min="2"
                                  max="5"
                                  value={externalFluxUltraCanonicalConfig.subject.groupSize || 3}
                                  onChange={(e) => setExternalFluxUltraCanonicalConfig(prev => ({
                                    ...prev,
                                    subject: { ...prev.subject, groupSize: parseInt(e.target.value) || 3 }
                                  }))}
                                  className="w-24"
                                />
                              </div>
                            )}
                            
                            {/* Object Description Input */}
                            {externalFluxUltraCanonicalConfig.subject.type === 'object' && (
                              <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Object Description</Label>
                                <Input
                                  placeholder="landmark, animal, building, etc."
                                  value={externalLocalObjectDescription}
                                  onChange={(e) => setExternalLocalObjectDescription(e.target.value)}
                                />
                              </div>
                            )}
                          </div>

                          {/* Appearance Configuration */}
                          <div className="space-y-3">
                            <Label className="text-sm font-medium">Appearance</Label>
                            
                            {/* Color Relevance */}
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground">Brand Colors</Label>
                              <div className="grid grid-cols-3 gap-2">
                                {generationCanonicalOptions?.brandColors?.map((color: string, index: number) => {
                                  const colorName = color.split(' ').slice(-2).join(' ')
                                  const isSelected = externalFluxUltraCanonicalConfig.appearance.colorRelevance.includes(color)
                                  return (
                                    <div key={index} className="flex items-center space-x-2">
                                      <Checkbox
                                        id={`external-color-${index}`}
                                        checked={isSelected}
                                        onCheckedChange={(checked) => {
                                          setExternalFluxUltraCanonicalConfig(prev => ({
                                            ...prev,
                                            appearance: {
                                              ...prev.appearance,
                                              colorRelevance: checked 
                                                ? [...prev.appearance.colorRelevance, color]
                                                : prev.appearance.colorRelevance.filter(c => c !== color)
                                            }
                                          }))
                                        }}
                                      />
                                      <Label htmlFor={`external-color-${index}`} className="text-xs">{colorName}</Label>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                            
                            {/* Color Intensity */}
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground">Color Intensity</Label>
                              <div className="flex gap-4">
                                {['subtle', 'moderate', 'prominent'].map((intensity) => (
                                  <div key={intensity} className="flex items-center space-x-2">
                                    <input
                                      type="radio"
                                      id={`external-intensity-${intensity}`}
                                      name="external-color-intensity"
                                      value={intensity}
                                      checked={externalFluxUltraCanonicalConfig.appearance.colorIntensity === intensity}
                                      onChange={(e) => setExternalFluxUltraCanonicalConfig(prev => ({
                                        ...prev,
                                        appearance: { ...prev.appearance, colorIntensity: e.target.value as any }
                                      }))}
                                    />
                                    <Label htmlFor={`external-intensity-${intensity}`} className="text-xs capitalize">{intensity}</Label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Style Configuration */}
                          <div className="space-y-3">
                            <Label className="text-sm font-medium">Style</Label>
                            <div className="flex gap-4">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  id="external-style-realistic"
                                  name="external-generation-style"
                                  value="realistic"
                                  checked={externalFluxUltraCanonicalConfig.style.type === 'realistic'}
                                  onChange={(e) => setExternalFluxUltraCanonicalConfig(prev => ({
                                    ...prev,
                                    style: { ...prev.style, type: e.target.value as any }
                                  }))}
                                />
                                <Label htmlFor="external-style-realistic" className="text-sm">Realistic</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  id="external-style-illustrative"
                                  name="external-generation-style"
                                  value="illustrative"
                                  checked={externalFluxUltraCanonicalConfig.style.type === 'illustrative'}
                                  onChange={(e) => setExternalFluxUltraCanonicalConfig(prev => ({
                                    ...prev,
                                    style: { ...prev.style, type: e.target.value as any }
                                  }))}
                                />
                                <Label htmlFor="external-style-illustrative" className="text-sm">Illustrative</Label>
                              </div>
                            </div>
                          </div>

                          {/* Elements Configuration */}
                          <div className="space-y-3">
                            <Label className="text-sm font-medium">Elements</Label>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Landmark</Label>
                                <Input
                                  placeholder="e.g., Eiffel Tower, Central Park"
                                  value={externalLocalLandmark}
                                  onChange={(e) => setExternalLocalLandmark(e.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">City</Label>
                                <Input
                                  placeholder="e.g., New York, Paris, Tokyo"
                                  value={externalLocalCity}
                                  onChange={(e) => setExternalLocalCity(e.target.value)}
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground">Other Elements</Label>
                              <Input
                                placeholder="Additional elements to include..."
                                value={externalLocalOthers}
                                onChange={(e) => setExternalLocalOthers(e.target.value)}
                              />
                            </div>
                          </div>

                          {/* Modifiers Configuration */}
                          <div className="space-y-3">
                            <Label className="text-sm font-medium">Modifiers</Label>
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground">Positives (enhance)</Label>
                              <Textarea
                                placeholder="terms to emphasize..."
                                value={externalLocalPositives}
                                onChange={(e) => setExternalLocalPositives(e.target.value)}
                                rows={2}
                              />
                              <p className="text-xs text-muted-foreground">
                                Negative terms are automatically applied from backend configuration
                              </p>
                            </div>
                          </div>

                          {/* Apply Button */}
                          <div className="pt-4 border-t border-emerald-200 dark:border-emerald-800">
                            <Button
                              type="button"
                              onClick={generateExternalFluxUltraCanonicalPreview}
                              disabled={isExternalFluxUltraGeneratingCanonicalPreview || !externalLocalFluxUltraPrompt.trim()}
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              {isExternalFluxUltraGeneratingCanonicalPreview ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border border-white border-t-transparent mr-2"></div>
                                  Generating...
                                </>
                              ) : (
                                <>
                                  <Sparkles className="h-4 w-4 mr-2" />
                                  Apply & Generate Preview
                                </>
                              )}
                            </Button>
                            <p className="text-xs text-muted-foreground text-center mt-2">
                              Apply your settings to generate canonical prompt preview
                            </p>
                          </div>

                          {/* Generation Preview */}
                          {(externalFluxUltraCanonicalPreview || isExternalFluxUltraGeneratingCanonicalPreview) && (
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Generated Prompt Preview</Label>
                              <div className="p-3 bg-muted rounded-md max-h-40 overflow-y-auto">
                                {isExternalFluxUltraGeneratingCanonicalPreview ? (
                                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                                    <div className="animate-spin rounded-full h-3 w-3 border border-muted-foreground border-t-transparent"></div>
                                    <span>Generating preview...</span>
                                  </div>
                                ) : (
                                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                                    {externalFluxUltraCanonicalPreview}
                                  </pre>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="externalFluxUltraFinetuneId">Fine-tune ID</Label>
                        <Input
                          id="externalFluxUltraFinetuneId"
                          value={externalFluxUltraFinetuneId}
                          onChange={(e) => setExternalFluxUltraFinetuneId(e.target.value)}
                          placeholder="Fine-tune model ID"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="externalFluxUltraTriggerPhrase">Trigger Phrase</Label>
                        <Input
                          id="externalFluxUltraTriggerPhrase"
                          value={externalFluxUltraTriggerPhrase}
                          onChange={(e) => setExternalFluxUltraTriggerPhrase(e.target.value)}
                          placeholder="Model trigger phrase"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="externalFluxUltraFinetuneStrength">Fine-tune Strength: {externalFluxUltraFinetuneStrength}</Label>
                      <input
                        id="externalFluxUltraFinetuneStrength"
                        type="range"
                        min="0.1"
                        max="2.0"
                        step="0.1"
                        value={externalFluxUltraFinetuneStrength}
                        onChange={(e) => setExternalFluxUltraFinetuneStrength(parseFloat(e.target.value))}
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
                        onClick={() => setShowExternalFluxUltraAdvanced(!showExternalFluxUltraAdvanced)}
                        className="flex items-center gap-2"
                      >
                        <Settings className="h-4 w-4" />
                        {showExternalFluxUltraAdvanced ? "Hide" : "Show"} Advanced Settings
                      </Button>

                      {showExternalFluxUltraAdvanced && (
                        <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
                          <div className="space-y-2">
                            <Label htmlFor="externalFluxUltraAspectRatio">Aspect Ratio</Label>
                            <Select
                              value={externalFluxUltraSettings.aspect_ratio}
                              onValueChange={(value) => setExternalFluxUltraSettings(prev => ({ ...prev, aspect_ratio: value }))}
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
                            <Label htmlFor="externalFluxUltraSafetyTolerance">Safety Tolerance</Label>
                            <Select
                              value={externalFluxUltraSettings.safety_tolerance.toString()}
                              onValueChange={(value) => setExternalFluxUltraSettings(prev => ({ ...prev, safety_tolerance: parseInt(value) }))}
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
                                id="externalFluxUltraRaw"
                                checked={externalFluxUltraSettings.raw}
                                onCheckedChange={(checked) => setExternalFluxUltraSettings(prev => ({ ...prev, raw: !!checked }))}
                              />
                              <Label htmlFor="externalFluxUltraRaw">Raw Mode</Label>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Disable prompt enhancement and use raw input
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="externalFluxUltraSeed">Seed (optional)</Label>
                            <Input
                              id="externalFluxUltraSeed"
                              type="number"
                              placeholder="Random if empty"
                              value={externalFluxUltraSettings.seed}
                              onChange={(e) => setExternalFluxUltraSettings(prev => ({ ...prev, seed: e.target.value }))}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <Button type="submit" className="w-full" disabled={!externalLocalFluxUltraPrompt.trim() || isExternalFluxUltraGenerating}>
                      {isExternalFluxUltraGenerating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Generate Image (External API)
                        </>
                      )}
                    </Button>
                  </form>

                  {/* Display generated prompt */}
                  <GeneratedPromptDisplay 
                    prompt={externalFluxUltraGeneratedPrompt} 
                    title="Final Prompt (External API)"
                  />

                  {externalFluxUltraError && (
                    <div className="p-4 border border-amber-200 bg-amber-50 text-amber-800 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <div className="text-2xl">🚫</div>
                        <div className="flex-1">
                          <div className="font-medium mb-2">Content Not Allowed</div>
                          <div className="text-sm mb-3">{externalFluxUltraError}</div>
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

              {/* External Flux Ultra Result Preview */}
              <Card>
                <CardHeader>
                  <CardTitle>Generated Image (External API)</CardTitle>
                </CardHeader>
                <CardContent>
                  {isExternalFluxUltraGenerating ? (
                    <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <Loader2 className="h-12 w-12 mx-auto mb-2 animate-spin" />
                        <p className="text-muted-foreground">Generating image via external API...</p>
                      </div>
                    </div>
                  ) : externalFluxUltraResult ? (
                    <div className="space-y-3">
                      <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                        <img
                          src={externalFluxUltraResult || "/placeholder.svg"}
                          alt="External Flux Ultra generated image"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <OpenInNewTabButton imageUrl={externalFluxUltraResult} />
                      
                      <div className="text-xs text-gray-500 space-y-1">
                        <p>✅ Generated via External API: /api/external/flux-ultra-finetuned</p>
                        <p>🎯 Canonical Prompt: {useExternalFluxUltraCanonical ? 'Enabled' : 'Disabled'}</p>
                        <p>🔧 Fine-tune ID: {externalFluxUltraFinetuneId}</p>
                        <p>⚡ Trigger Phrase: {externalFluxUltraTriggerPhrase}</p>
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

        </Tabs>
      </div>
    </div>
  )
}
