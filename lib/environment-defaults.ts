/**
 * Environment Configuration for Image Generation Defaults
 * 
 * This module provides centralized configuration for all image generation endpoints
 * using environment variables with sensible fallback defaults.
 */

export interface FluxUltraDefaults {
  finetuneId: string
  triggerPhrase: string
  finetuneStrength: number
  aspectRatio: string
  numImages: number
  safetyTolerance: number
  outputFormat: string
  enableSafetyChecker: boolean
}

export interface FluxProDefaults {
  loraUrl: string
  triggerPhrase: string
  loraScale: number
  aspectRatio: string
  numInferenceSteps: number
  guidanceScale: number
  numImages: number
  outputFormat: string
  enableSafetyChecker: boolean
  safetyTolerance: number
}

export interface QwenDefaults {
  loraUrl: string
  triggerPhrase: string
  loraScale: number
  imageSize: string
  numInferenceSteps: number
  guidanceScale: number
  numImages: number
  outputFormat: string
  enableSafetyChecker: boolean
  syncMode: boolean
  acceleration: string
}

/**
 * Get Flux Ultra Finetuned default values from environment variables
 */
export function getFluxUltraDefaults(): FluxUltraDefaults {
  return {
    finetuneId: process.env.FLUX_ULTRA_DEFAULT_FINETUNE_ID || "a4bd761c-0f90-41cc-be78-c7b6cf22285a",
    triggerPhrase: process.env.FLUX_ULTRA_DEFAULT_TRIGGER_PHRASE || "TCT-AI-8",
    finetuneStrength: parseFloat(process.env.FLUX_ULTRA_DEFAULT_FINETUNE_STRENGTH || "1.0"),
    aspectRatio: process.env.FLUX_ULTRA_DEFAULT_ASPECT_RATIO || "1:1",
    numImages: parseInt(process.env.FLUX_ULTRA_DEFAULT_NUM_IMAGES || "1"),
    safetyTolerance: parseInt(process.env.FLUX_ULTRA_DEFAULT_SAFETY_TOLERANCE || "1"),
    outputFormat: process.env.FLUX_ULTRA_DEFAULT_OUTPUT_FORMAT || "jpeg",
    enableSafetyChecker: process.env.FLUX_ULTRA_DEFAULT_ENABLE_SAFETY_CHECKER !== "false" // Default true
  }
}

/**
 * Get Flux Pro LoRA default values from environment variables
 */
export function getFluxProDefaults(): FluxProDefaults {
  return {
    loraUrl: process.env.FLUX_PRO_DEFAULT_LORA_URL || "https://v3.fal.media/files/elephant/YOSyiUVvNDHBF-V3pLTM1_pytorch_lora_weights.safetensors",
    triggerPhrase: process.env.FLUX_PRO_DEFAULT_TRIGGER_PHRASE || "MDF-9-9-2025B",
    loraScale: parseFloat(process.env.FLUX_PRO_DEFAULT_LORA_SCALE || "1.3"),
    aspectRatio: process.env.FLUX_PRO_DEFAULT_ASPECT_RATIO || "landscape_4_3",
    numInferenceSteps: parseInt(process.env.FLUX_PRO_DEFAULT_NUM_INFERENCE_STEPS || "30"),
    guidanceScale: parseFloat(process.env.FLUX_PRO_DEFAULT_GUIDANCE_SCALE || "3.5"),
    numImages: parseInt(process.env.FLUX_PRO_DEFAULT_NUM_IMAGES || "1"),
    outputFormat: process.env.FLUX_PRO_DEFAULT_OUTPUT_FORMAT || "png",
    enableSafetyChecker: process.env.FLUX_PRO_DEFAULT_ENABLE_SAFETY_CHECKER !== "false", // Default true
    safetyTolerance: parseInt(process.env.FLUX_PRO_DEFAULT_SAFETY_TOLERANCE || "2")
  }
}

/**
 * Get Qwen Text-to-Image default values from environment variables
 */
export function getQwenDefaults(): QwenDefaults {
  return {
    loraUrl: process.env.QWEN_DEFAULT_LORA_URL || "https://v3.fal.media/files/elephant/YOSyiUVvNDHBF-V3pLTM1_pytorch_lora_weights.safetensors",
    triggerPhrase: process.env.QWEN_DEFAULT_TRIGGER_PHRASE || "MDF-9-9-2025B",
    loraScale: parseFloat(process.env.QWEN_DEFAULT_LORA_SCALE || "1.3"),
    imageSize: process.env.QWEN_DEFAULT_IMAGE_SIZE || "landscape_4_3",
    numInferenceSteps: parseInt(process.env.QWEN_DEFAULT_NUM_INFERENCE_STEPS || "30"),
    guidanceScale: parseFloat(process.env.QWEN_DEFAULT_GUIDANCE_SCALE || "2.5"),
    numImages: parseInt(process.env.QWEN_DEFAULT_NUM_IMAGES || "1"),
    outputFormat: process.env.QWEN_DEFAULT_OUTPUT_FORMAT || "png",
    enableSafetyChecker: process.env.QWEN_DEFAULT_ENABLE_SAFETY_CHECKER !== "false", // Default true
    syncMode: process.env.QWEN_DEFAULT_SYNC_MODE === "true", // Default false
    acceleration: process.env.QWEN_DEFAULT_ACCELERATION || "none"
  }
}

/**
 * Validate and clamp values to acceptable ranges
 */
export function clampFluxUltraValues(defaults: FluxUltraDefaults): FluxUltraDefaults {
  return {
    ...defaults,
    finetuneStrength: Math.max(0.1, Math.min(2.0, defaults.finetuneStrength)),
    numImages: Math.max(1, Math.min(4, defaults.numImages)),
    safetyTolerance: Math.max(1, Math.min(3, defaults.safetyTolerance))
  }
}

export function clampFluxProValues(defaults: FluxProDefaults): FluxProDefaults {
  return {
    ...defaults,
    loraScale: Math.max(0.1, Math.min(2.0, defaults.loraScale)),
    numInferenceSteps: Math.max(1, Math.min(50, defaults.numInferenceSteps)),
    guidanceScale: Math.max(1.0, Math.min(20.0, defaults.guidanceScale)),
    numImages: Math.max(1, Math.min(4, defaults.numImages)),
    safetyTolerance: Math.max(1, Math.min(6, defaults.safetyTolerance))
  }
}

export function clampQwenValues(defaults: QwenDefaults): QwenDefaults {
  return {
    ...defaults,
    loraScale: Math.max(0.1, Math.min(2.0, defaults.loraScale)),
    numInferenceSteps: Math.max(1, Math.min(50, defaults.numInferenceSteps)),
    guidanceScale: Math.max(1.0, Math.min(20.0, defaults.guidanceScale)),
    numImages: Math.max(1, Math.min(4, defaults.numImages))
  }
}

/**
 * Get all defaults with clamping applied
 */
export function getAllDefaults() {
  return {
    fluxUltra: clampFluxUltraValues(getFluxUltraDefaults()),
    fluxPro: clampFluxProValues(getFluxProDefaults()),
    qwen: clampQwenValues(getQwenDefaults())
  }
}
