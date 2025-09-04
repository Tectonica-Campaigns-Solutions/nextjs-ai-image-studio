/**
 * Advanced RAG System - Type Definitions
 * 
 * This file contains all the TypeScript interfaces and types for the advanced RAG system
 */

// Base concept types
export type ConceptType = 'style' | 'mood' | 'composition' | 'color' | 'lighting' | 'subject'

// Photography styles with semantic understanding
export interface PhotographyStyle {
  synonyms: string[]
  visual_cues: string[]
  weights: {
    color: number
    composition: number
    mood: number
    lighting: number
  }
  brand_alignment: number // How well this style aligns with EGP brand (0-1)
}

// Mood concepts with visual associations
export interface MoodConcept {
  visual_cues: string[]
  color_associations: string[]
  composition_preferences: string[]
  intensity: number // 0-1, how strong this mood should be
}

// Composition rules and guidelines
export interface CompositionRule {
  rules: string[]
  optimal_ratios: string[]
  framing_preferences: string[]
  subject_positioning: string[]
}

// Color concept with semantic meaning
export interface ColorConcept {
  hex_values: string[]
  emotional_associations: string[]
  brand_relevance: number
  usage_context: string[]
}

// Lighting concept for technical enhancement
export interface LightingConcept {
  technical_terms: string[]
  mood_impact: string[]
  time_associations: string[]
  brand_fit: number
}

// Subject matter concepts
export interface SubjectConcept {
  categories: string[]
  demographic_considerations: string[]
  brand_representation: string[]
  composition_requirements: string[]
}

// Main taxonomy interface
export interface ConceptTaxonomy {
  photography_styles: Record<string, PhotographyStyle>
  moods: Record<string, MoodConcept>
  compositions: Record<string, CompositionRule>
  colors: Record<string, ColorConcept>
  lighting: Record<string, LightingConcept>
  subjects: Record<string, SubjectConcept>
}

// Semantic embedding with metadata
export interface SemanticEmbedding {
  vector: number[]
  metadata: {
    concept_type: ConceptType
    concept_name: string
    confidence: number
    context_relevance: number
    synonyms: string[]
    brand_alignment: number
  }
}

// Parsed concept from user prompt
export interface ParsedConcept {
  type: ConceptType
  name: string
  confidence: number
  original_text: string
  position_in_prompt: number
  context_words: string[]
}

// Brand context for enhancement
export interface BrandContext {
  brand_name: string
  primary_values: string[]
  visual_identity: {
    colors: string[]
    styles: string[]
    moods: string[]
  }
  target_audience: string[]
  content_guidelines: string[]
}

// Vector search result
export interface VectorSearchResult {
  concept: string
  concept_type: ConceptType
  similarity: number
  context_match: number
  brand_alignment: number
  enhancement_text: string
  weight: number
}

// Enhanced prompt result
export interface EnhancedPrompt {
  original_prompt: string
  enhanced_prompt: string
  applied_concepts: ParsedConcept[]
  enhancement_details: {
    category: string
    text: string
    weight: number
    reasoning: string
  }[]
  brand_alignment_score: number
  confidence_score: number
  suggested_negative_prompt: string
  metadata: {
    processing_time: number
    concepts_found: number
    enhancements_applied: number
    fallback_used: boolean
  }
}

// Configuration for the advanced RAG engine
export interface AdvancedRAGConfig {
  enable_semantic_parsing: boolean
  enable_vector_search: boolean
  enable_dynamic_weighting: boolean
  enable_conflict_resolution: boolean
  similarity_threshold: number
  max_enhancements: number
  brand_alignment_weight: number
  context_window_size: number
}
