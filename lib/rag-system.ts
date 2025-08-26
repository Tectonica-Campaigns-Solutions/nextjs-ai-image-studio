import { readFile } from 'fs/promises';
import { join } from 'path';

// Platform environment detection
function isVercelEnvironment() {
  return !!(process.env.VERCEL || process.env.VERCEL_ENV)
}

function isRailwayEnvironment() {
  return !!(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_ENVIRONMENT_NAME)
}

function shouldUseFullRAG() {
  // Use full RAG on Railway and local development, simple RAG only on Vercel
  return !isVercelEnvironment()
}

// Conditional import for transformers - only in non-Vercel environments
let pipeline: any = null;

// Initialize pipeline conditionally
async function initPipeline() {
  if (isVercelEnvironment()) {
    console.log('[RAG] Skipping transformers in Vercel environment');
    return null;
  }
  
  try {
    const transformers = await import('@xenova/transformers');
    pipeline = transformers.pipeline;
    console.log(`[RAG] Transformers loaded successfully in ${isRailwayEnvironment() ? 'Railway' : 'local'} environment`);
    return pipeline;
  } catch (error) {
    console.warn('[RAG] Failed to load transformers:', error);
    return null;
  }
}

// Cache for embeddings and pipeline
let embeddingPipeline: any = null;
let brandingEmbeddings: { text: string; embedding: number[]; category: string; data: any }[] = [];
let lastBrandingFileModified: string | null = null;

// Global variable for Vercel compatibility (same as in upload-branding route)
declare global {
  var brandingDataCache: any
}

// Get branding data (works in both local and Vercel environments)
async function getBrandingData() {
  try {
    if (process.env.VERCEL) {
      // In Vercel, try to get from global cache first
      if (global.brandingDataCache) {
        console.log('[RAG] Using cached branding data in Vercel');
        return global.brandingDataCache;
      }
      
      // If no cache, try to load from bundled file (if it exists)
      try {
        const brandingPath = join(process.cwd(), 'lib', 'aclu-branding.json');
        console.log('[RAG] Attempting to load branding file from:', brandingPath);
        const fileContent = await readFile(brandingPath, 'utf-8');
        const rawData = JSON.parse(fileContent);
        global.brandingDataCache = processRawBrandingData(rawData);
        console.log('[RAG] Successfully loaded and cached branding data');
        return global.brandingDataCache;
      } catch (error) {
        console.warn('[RAG] Failed to load branding file in Vercel:', error);
        
        // Try alternative path
        try {
          const altPath = join(process.cwd(), 'app', 'lib', 'aclu-branding.json');
          console.log('[RAG] Trying alternative path:', altPath);
          const fileContent = await readFile(altPath, 'utf-8');
          const rawData = JSON.parse(fileContent);
          global.brandingDataCache = processRawBrandingData(rawData);
          console.log('[RAG] Successfully loaded branding data from alternative path');
          return global.brandingDataCache;
        } catch (altError) {
          console.warn('[RAG] Alternative path also failed:', altError);
          
          // Use embedded fallback data with actual ACLU branding
          console.log('[RAG] Using embedded ACLU branding data');
          const embeddedData = getEmbeddedACLUBranding();
          global.brandingDataCache = embeddedData;
          return embeddedData;
        }
      }
    } else {
      // In local environment, read from file system
      const brandingPath = join(process.cwd(), 'lib', 'aclu-branding.json');
      const fileContent = await readFile(brandingPath, 'utf-8');
      const rawData = JSON.parse(fileContent);
      return processRawBrandingData(rawData);
    }
  } catch (error) {
    console.error('[RAG] Error reading branding file:', error);
    return getEmbeddedACLUBranding();
  }
}

function processRawBrandingData(rawData: any) {
  // Handle different JSON structures
  // Structure 1: color_palette at root level
  // Structure 2: color_palette inside brand_specifications
  let brandingData = rawData;
  
  if (rawData.brand_specifications) {
    // If brand_specifications exists, merge its contents to root level
    brandingData = {
      ...rawData,
      color_palette: rawData.brand_specifications.color_palette || rawData.color_palette,
      visual_style: rawData.brand_specifications.visual_style || rawData.visual_style,
      typography: rawData.brand_specifications.typography || rawData.typography,
      illustration: rawData.illustration || {
        photography_style: { 
          preferred: rawData.brand_specifications.visual_style?.characteristics || [],
          avoid: rawData.brand_specifications.visual_style?.avoid || []
        },
        layout_rules: {},
        format_rules: { supported_formats: {} },
        generation_constraints: { 
          negative_prompts: rawData.ai_generation_instructions?.negative_prompts || []
        }
      }
    };
  }
  
  return brandingData;
}

function getFallbackBrandingData() {
  // Fallback data when no branding file is available
  return {
    color_palette: {
      principal_colors: {},
      light_colors: {},
      dark_colors: {}
    },
    illustration: {
      photography_style: { preferred: [], avoid: [] }
    },
    layout: {},
    format_specifications: {}
  };
}

function getEmbeddedACLUBranding() {
  // Embedded ACLU branding data for Vercel environment
  return {
    "project_name": "ACLU Branding Guidelines",
    "brand": "American Civil Liberties Union (ACLU)",
    "ai_generation_instructions": {
      "description": "Instructions optimized for AI comprehension based on training data",
      "base_prompt": "documentary photograph of diverse group of people marching together at a protest, professional photojournalism style, crowd of activists walking forward, determined expressions, outdoor daylight, wide shot showing many people, civil rights march atmosphere",
      "use_privileged_positions": [
        "people",
        "crowd",
        "outdoor", 
        "daylight",
        "documentary photography",
        "wide shot"
      ],
      "stylization_hints": {
        "treatment": "high contrast",
        "lighting": "natural daylight", 
        "mood": "determined and unified",
        "composition": "group moving forward together"
      },
      "negative_prompts": [
        "no text",
        "no words", 
        "no signs with text",
        "no letters",
        "no logos"
      ]
    },
    "color_palette": {
      "primary_colors": {
        "red": {
          "hex": "#ef404e",
          "rgb": [239, 64, 78],
          "ai_description": "ACLU signature red, bold and empowering"
        },
        "blue": {
          "hex": "#002f6c", 
          "rgb": [0, 47, 108],
          "ai_description": "deep patriotic blue, trustworthy and authoritative"
        }
      },
      "secondary_colors": {
        "white": {
          "hex": "#ffffff",
          "rgb": [255, 255, 255],
          "ai_description": "clean white for contrast and clarity"
        },
        "gray": {
          "hex": "#666666",
          "rgb": [102, 102, 102], 
          "ai_description": "neutral gray for supporting text"
        }
      }
    },
    "illustration": {
      "photography_style": {
        "preferred": [
          "documentary photography",
          "photojournalism style",
          "diverse people",
          "protest scenes",
          "civil rights imagery",
          "unity and solidarity",
          "outdoor daylight settings",
          "wide shots of crowds",
          "determined expressions",
          "forward movement"
        ],
        "avoid": [
          "staged photography",
          "studio lighting",
          "individual portraits",
          "commercial style",
          "overly stylized",
          "dark or moody lighting"
        ]
      },
      "generation_constraints": {
        "negative_prompts": [
          "no text",
          "no words",
          "no signs with text", 
          "no letters",
          "no logos",
          "no branded content"
        ]
      }
    },
    "visual_style": {
      "characteristics": [
        "high contrast",
        "bold and impactful",
        "authentic and real",
        "diverse representation",
        "movement and action",
        "patriotic but inclusive"
      ]
    }
  };
}

// Check if branding file has been updated
async function shouldReloadBranding(): Promise<boolean> {
  if (process.env.VERCEL) {
    // In Vercel, always reload if no embeddings exist
    return brandingEmbeddings.length === 0;
  }
  
  try {
    const brandingPath = join(process.cwd(), 'lib', 'aclu-branding.json');
    const stats = await import('fs').then(fs => fs.promises.stat(brandingPath));
    const currentModified = stats.mtime.toISOString();
    
    if (lastBrandingFileModified !== currentModified) {
      lastBrandingFileModified = currentModified;
      return true;
    }
    return false;
  } catch (error) {
    return true; // Reload on error to be safe
  }
}

// Initialize the embedding pipeline
async function initializeEmbeddings() {
  try {
    if (!embeddingPipeline) {
      console.log('[RAG] Initializing embedding pipeline...');
      
      if (process.env.VERCEL) {
        // In Vercel, immediately use fallback mode
        console.log('[RAG] Vercel environment detected, using fallback mode');
        embeddingPipeline = 'fallback';
      } else {
        // In local environment, try to load transformers
        try {
          const pipelineLoader = await initPipeline();
          if (pipelineLoader) {
            embeddingPipeline = await pipelineLoader('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
            console.log('[RAG] Embedding pipeline initialized successfully');
          } else {
            embeddingPipeline = 'fallback';
          }
        } catch (transformersError) {
          console.warn('[RAG] Transformers failed, using fallback mode:', transformersError);
          embeddingPipeline = 'fallback';
        }
      }
    }

    // Check if we need to reload branding data
    const shouldReload = await shouldReloadBranding();
    
    if (brandingEmbeddings.length === 0 || shouldReload) {
      console.log('[RAG] Generating embeddings for branding data...');
      const brandingData = await getBrandingData();
      console.log('[RAG] Branding data loaded:', brandingData ? 'success' : 'failed');
      
      if (brandingData) {
        if (embeddingPipeline === 'fallback') {
          // Use simplified keyword matching instead of embeddings
          brandingEmbeddings = await generateSimpleBrandingData(brandingData);
          console.log('[RAG] Using fallback branding data generation');
        } else {
          brandingEmbeddings = await generateBrandingEmbeddings(brandingData);
        }
        console.log('[RAG] Generated', brandingEmbeddings.length, 'branding embeddings');
      } else {
        console.warn('[RAG] No branding data available');
        brandingEmbeddings = [];
      }
    } else {
      console.log('[RAG] Using existing', brandingEmbeddings.length, 'branding embeddings');
    }
  } catch (error) {
    console.error('[RAG] Error in initializeEmbeddings:', error);
    // Force fallback mode on any error
    embeddingPipeline = 'fallback';
    const brandingData = await getBrandingData();
    brandingEmbeddings = await generateSimpleBrandingData(brandingData);
  }
}

// Simplified branding data generation for Vercel fallback
async function generateSimpleBrandingData(brandingData: any) {
  console.log('[RAG] Using simplified keyword-based branding data');
  
  const brandingElements = [];
  
  // Extract color information
  if (brandingData.color_palette) {
    const colors = brandingData.color_palette;
    if (colors.primary_colors) {
      for (const [colorName, colorData] of Object.entries(colors.primary_colors)) {
        brandingElements.push({
          text: `${colorName} color ${(colorData as any).ai_description || (colorData as any).hex}`,
          category: 'color',
          data: colorData,
          embedding: [], // No actual embedding in fallback mode
          similarity: 0
        });
      }
    }
    if (colors.secondary_colors) {
      for (const [colorName, colorData] of Object.entries(colors.secondary_colors)) {
        brandingElements.push({
          text: `${colorName} color ${(colorData as any).ai_description || (colorData as any).hex}`,
          category: 'color',
          data: colorData,
          embedding: [],
          similarity: 0
        });
      }
    }
  }
  
  // Extract photography style
  if (brandingData.illustration?.photography_style?.preferred) {
    brandingData.illustration.photography_style.preferred.forEach((style: string) => {
      brandingElements.push({
        text: style,
        category: 'photography_style',
        data: { style },
        embedding: [],
        similarity: 0
      });
    });
  }
  
  // Extract visual characteristics
  if (brandingData.visual_style?.characteristics) {
    brandingData.visual_style.characteristics.forEach((characteristic: string) => {
      brandingElements.push({
        text: characteristic,
        category: 'visual_style',
        data: { characteristic },
        embedding: [],
        similarity: 0
      });
    });
  }
  
  // Extract negative prompts
  if (brandingData.ai_generation_instructions?.negative_prompts) {
    brandingElements.push({
      text: brandingData.ai_generation_instructions.negative_prompts.join(', '),
      category: 'negative_prompts',
      data: { prompts: brandingData.ai_generation_instructions.negative_prompts },
      embedding: [],
      similarity: 0
    });
  }
  
  return brandingElements;
}

// Simplified enhancement for fallback mode
function enhancePromptSimple(userPrompt: string, brandingData: any) {
  console.log('[RAG] Using simplified prompt enhancement');
  
  let enhancedPrompt = userPrompt;
  const suggestedColors: string[] = [];
  const brandingElements: any[] = [];
  
  // Add ACLU style keywords
  const styleKeywords = [
    'documentary photography style',
    'photojournalism',
    'high contrast',
    'natural daylight',
    'authentic and real'
  ];
  
  // Check if user prompt could benefit from style enhancement
  const needsStyle = !styleKeywords.some(keyword => 
    userPrompt.toLowerCase().includes(keyword.toLowerCase())
  );
  
  if (needsStyle) {
    enhancedPrompt += ', documentary photography style, high contrast, natural daylight';
  }
  
  // Add color suggestions if color palette exists
  if (brandingData.color_palette?.primary_colors) {
    for (const [colorName, colorData] of Object.entries(brandingData.color_palette.primary_colors)) {
      suggestedColors.push(`${colorName}: ${(colorData as any).hex}`);
    }
  }
  
  // Extract negative prompts
  let negativePrompt = "no text, no words, no signs with text, no letters, no logos";
  if (brandingData.ai_generation_instructions?.negative_prompts) {
    negativePrompt = brandingData.ai_generation_instructions.negative_prompts.join(', ');
  }
  
  return {
    enhancedPrompt,
    brandingElements,
    suggestedColors,
    suggestedFormat: {},
    negativePrompt
  };
}

// Generate embeddings for all branding elements
async function generateBrandingEmbeddings(brandingData: any) {
  // If in fallback mode, use simple branding data instead
  if (embeddingPipeline === 'fallback') {
    return await generateSimpleBrandingData(brandingData);
  }
  
  const embeddings: { text: string; embedding: number[]; category: string; data: any }[] = [];

  // Process visual language (if it exists)
  const visualLanguage = brandingData.visual_language;
  if (visualLanguage?.core_concept && visualLanguage?.visual_expression) {
    embeddings.push({
      text: `${visualLanguage.core_concept} ${visualLanguage.visual_expression}`,
      embedding: await getEmbedding(`${visualLanguage.core_concept} ${visualLanguage.visual_expression}`),
      category: 'visual_concept',
      data: visualLanguage
    });

    // Process brand ideas (if they exist)
    if (visualLanguage.brand_ideas) {
      for (const [key, value] of Object.entries(visualLanguage.brand_ideas)) {
        embeddings.push({
          text: `${key}: ${value}`,
          embedding: await getEmbedding(`${key}: ${value}`),
          category: 'brand_idea',
          data: { key, value }
        });
      }
    }
  }

  // Process colors with descriptions
  const colors = brandingData.color_palette;
  
  // Principal colors
  if (colors?.principal_colors) {
    for (const [colorName, colorData] of Object.entries(colors.principal_colors)) {
      if (colorData && typeof colorData === 'object' && 'name' in colorData && 'description' in colorData && 'hex' in colorData) {
        const text = `${colorData.name} ${colorData.description} ${colorData.hex}`;
        embeddings.push({
          text,
          embedding: await getEmbedding(text),
          category: 'principal_color',
          data: { key: colorName, ...colorData }
        });
      }
    }
  }

  // Light colors
  if (colors?.light_colors) {
    for (const [colorName, colorData] of Object.entries(colors.light_colors)) {
      if (colorData && typeof colorData === 'object' && 'hex' in colorData) {
        const text = `light ${colorName} color ${colorData.hex}`;
        embeddings.push({
          text,
          embedding: await getEmbedding(text),
          category: 'light_color',
          data: { key: colorName, ...colorData }
        });
      }
    }
  }

  // Dark colors
  if (colors?.dark_colors) {
    for (const [colorName, colorData] of Object.entries(colors.dark_colors)) {
      if (colorData && typeof colorData === 'object' && 'hex' in colorData) {
        const text = `dark ${colorName} color ${colorData.hex}`;
        embeddings.push({
          text,
          embedding: await getEmbedding(text),
          category: 'dark_color',
          data: { key: colorName, ...colorData }
        });
      }
    }
  }

  // Photography style preferences
  const photoStyle = brandingData.illustration?.photography_style;
  if (photoStyle?.preferred && Array.isArray(photoStyle.preferred)) {
    for (const style of photoStyle.preferred) {
      embeddings.push({
        text: `photography style: ${style}`,
        embedding: await getEmbedding(`photography style: ${style}`),
        category: 'photography_style',
        data: { type: 'preferred', description: style }
      });
    }
  }

  // Extract information from ACLU-style structure
  if (brandingData.ai_generation_instructions) {
    const aiInstructions = brandingData.ai_generation_instructions;
    
    // Base prompt and style hints
    if (aiInstructions.base_prompt) {
      embeddings.push({
        text: aiInstructions.base_prompt,
        embedding: await getEmbedding(aiInstructions.base_prompt),
        category: 'base_prompt',
        data: { prompt: aiInstructions.base_prompt }
      });
    }

    // Stylization hints
    if (aiInstructions.stylization_hints) {
      const hints = aiInstructions.stylization_hints;
      const hintText = `${hints.treatment || ''} ${hints.lighting || ''} ${hints.mood || ''} ${hints.composition || ''}`.trim();
      if (hintText) {
        embeddings.push({
          text: `style: ${hintText}`,
          embedding: await getEmbedding(`style: ${hintText}`),
          category: 'style_hints',
          data: hints
        });
      }
    }

    // Use privileged positions as style keywords
    if (aiInstructions.use_privileged_positions && Array.isArray(aiInstructions.use_privileged_positions)) {
      for (const keyword of aiInstructions.use_privileged_positions) {
        embeddings.push({
          text: `key concept: ${keyword}`,
          embedding: await getEmbedding(`key concept: ${keyword}`),
          category: 'key_concept',
          data: { keyword }
        });
      }
    }
  }

  // Extract brand specifications information
  if (brandingData.brand_specifications) {
    const brandSpecs = brandingData.brand_specifications;
    
    // Tone of voice
    if (brandSpecs.tone_of_voice) {
      const tone = brandSpecs.tone_of_voice;
      
      if (tone.principles && Array.isArray(tone.principles)) {
        for (const principle of tone.principles) {
          embeddings.push({
            text: `brand principle: ${principle}`,
            embedding: await getEmbedding(`brand principle: ${principle}`),
            category: 'brand_principle',
            data: { principle }
          });
        }
      }

      if (tone.mood) {
        embeddings.push({
          text: `brand mood: ${tone.mood}`,
          embedding: await getEmbedding(`brand mood: ${tone.mood}`),
          category: 'brand_mood',
          data: { mood: tone.mood }
        });
      }
    }

    // Visual style information
    if (brandSpecs.visual_style) {
      const visualStyle = brandSpecs.visual_style;
      
      if (visualStyle.foundation) {
        embeddings.push({
          text: `visual foundation: ${visualStyle.foundation}`,
          embedding: await getEmbedding(`visual foundation: ${visualStyle.foundation}`),
          category: 'visual_foundation',
          data: { foundation: visualStyle.foundation }
        });
      }

      if (visualStyle.characteristics && Array.isArray(visualStyle.characteristics)) {
        for (const characteristic of visualStyle.characteristics) {
          embeddings.push({
            text: `visual characteristic: ${characteristic}`,
            embedding: await getEmbedding(`visual characteristic: ${characteristic}`),
            category: 'visual_characteristic',
            data: { characteristic }
          });
        }
      }
    }
  }

  // Layout and format rules
  const layoutRules = brandingData.illustration?.layout_rules;
  if (layoutRules) {
    const layoutText = typeof layoutRules === 'object' 
      ? `layout rules: ${layoutRules.placement || ''} ${layoutRules.position || ''} ${layoutRules.text_prohibition || ''}`
      : `layout rules: ${layoutRules}`;
    
    embeddings.push({
      text: layoutText,
      embedding: await getEmbedding(layoutText),
      category: 'layout_rules',
      data: layoutRules
    });
  }

  // Format rules
  if (brandingData.illustration?.format_rules?.supported_formats) {
    for (const [formatKey, formatData] of Object.entries(brandingData.illustration.format_rules.supported_formats)) {
      if (formatData && typeof formatData === 'object' && 'name' in formatData && 'dimensions' in formatData) {
        embeddings.push({
          text: `format ${formatData.name} ${formatData.dimensions}`,
          embedding: await getEmbedding(`format ${formatData.name} ${formatData.dimensions}`),
          category: 'format',
          data: { key: formatKey, ...formatData }
        });
      }
    }
  }

  // Negative prompts
  const negativePrompts = brandingData.illustration?.generation_constraints?.negative_prompts;
  embeddings.push({
    text: `negative prompts: ${negativePrompts.join(', ')}`,
    embedding: await getEmbedding(`avoid: ${negativePrompts.join(', ')}`),
    category: 'negative_prompts',
    data: negativePrompts
  });

  console.log(`[RAG] Generated ${embeddings.length} embeddings`);
  return embeddings;
}

// Get embedding for a single text
async function getEmbedding(text: string): Promise<number[]> {
  if (!embeddingPipeline) {
    await initializeEmbeddings();
  }
  
  // Return empty array in fallback mode
  if (embeddingPipeline === 'fallback') {
    return [];
  }
  
  const result = await embeddingPipeline(text, { pooling: 'mean', normalize: true });
  return Array.from(result.data);
}

// Calculate cosine similarity
function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

// Find relevant branding elements
export async function enhancePromptWithBranding(userPrompt: string, maxResults: number = 5): Promise<{
  enhancedPrompt: string;
  brandingElements: any[];
  suggestedColors: string[];
  suggestedFormat: any;
  negativePrompt: string;
}> {
  console.log('[RAG] Starting prompt enhancement for:', userPrompt);
  console.log('[RAG] Environment:', process.env.VERCEL ? 'Vercel' : 'Local');
  
  try {
    await initializeEmbeddings();
    console.log('[RAG] Embeddings initialized, count:', brandingEmbeddings.length);
  } catch (error) {
    console.error('[RAG] Failed to initialize embeddings:', error);
    // Return original prompt if RAG fails
    return {
      enhancedPrompt: userPrompt,
      brandingElements: [],
      suggestedColors: [],
      suggestedFormat: {},
      negativePrompt: "no text, no words, no signs with text, no letters, no logos"
    };
  }

  console.log('[RAG] Processing user prompt:', userPrompt);
  
  // Check if we're in fallback mode (no embeddings available)
  if (embeddingPipeline === 'fallback') {
    console.log('[RAG] Using fallback mode - simplified enhancement');
    const brandingData = await getBrandingData();
    return enhancePromptSimple(userPrompt, brandingData);
  }
  
  // Check if embeddings are available
  if (brandingEmbeddings.length === 0) {
    console.log('[RAG] No embeddings available, using fallback mode');
    const brandingData = await getBrandingData();
    return enhancePromptSimple(userPrompt, brandingData);
  }
  
  // Get embedding for user prompt
  const promptEmbedding = await getEmbedding(userPrompt);
  
  // If embedding failed, fall back to simple mode
  if (!promptEmbedding || promptEmbedding.length === 0) {
    console.log('[RAG] Embedding failed, using fallback mode');
    const brandingData = await getBrandingData();
    return enhancePromptSimple(userPrompt, brandingData);
  }

  // Calculate similarities and sort
  const similarities = brandingEmbeddings.map(item => ({
    ...item,
    similarity: cosineSimilarity(promptEmbedding, item.embedding)
  })).sort((a, b) => b.similarity - a.similarity);

  // Get top relevant elements
  const relevantElements = similarities.slice(0, maxResults);
  
  console.log('[RAG] Top relevant elements:', relevantElements.map(e => ({ 
    category: e.category, 
    similarity: e.similarity.toFixed(3),
    text: e.text.substring(0, 50) + '...' 
  })));

  // Extract colors
  const suggestedColors: string[] = [];
  const colorElements = relevantElements.filter(e => 
    e.category.includes('color') && e.similarity > 0.3
  );
  
  // Always include principal colors for ACLU branding
  suggestedColors.push('#ef404e', '#0055aa'); // ACLU Red and Blue
  
  for (const colorEl of colorElements.slice(0, 2)) {
    if (colorEl.data.hex && !suggestedColors.includes(colorEl.data.hex)) {
      suggestedColors.push(colorEl.data.hex);
    }
  }

  // Get format suggestion (default to square)
  const formatElements = relevantElements.filter(e => e.category === 'format');
  const suggestedFormat = formatElements.length > 0 ? 
    formatElements[0].data : 
    { name: 'Square', dimensions: '1:1', aspect_ratio: 1.0 };

  // Build enhanced prompt
  let enhancedPrompt = userPrompt;

  // Add visual style guidance
  const styleElements = relevantElements.filter(e => 
    e.category === 'brand_idea' || e.category === 'visual_concept'
  );
  
  if (styleElements.length > 0) {
    const styleTerms = styleElements.slice(0, 2).map(e => {
      if (e.category === 'brand_idea') {
        return e.data.key; // resolute, patriotic, historic, etc.
      }
      return 'bold and dynamic';
    });
    enhancedPrompt += `, ${styleTerms.join(', ')} style`;
  }

  // Add photography guidance if relevant
  const photoElements = relevantElements.filter(e => e.category === 'photography_style');
  if (photoElements.length > 0) {
    enhancedPrompt += `, ${photoElements[0].data.description}`;
  }

  // Add color guidance
  if (suggestedColors.length > 2) {
    const colorNames = suggestedColors.slice(0, 4).join(', ');
    enhancedPrompt += `, using colors: ${colorNames}`;
  } else {
    enhancedPrompt += `, using ACLU red (#ef404e) and ACLU blue (#0055aa) color scheme`;
  }

  // Add layout constraints
  enhancedPrompt += ', composition with central visual element in bottom three-quarters, top quarter empty for text overlay';
  enhancedPrompt += ', documentary photography style, natural lighting, unposed expressions';

  // Get negative prompts
  const negativeElements = relevantElements.filter(e => e.category === 'negative_prompts');
  const negativePrompt = negativeElements.length > 0 ? 
    negativeElements[0].data.join(', ') : 
    'no text, no lettering, no typography, no words, no writing, no signs, no captions';

  return {
    enhancedPrompt,
    brandingElements: relevantElements.map(e => ({
      category: e.category,
      similarity: e.similarity,
      data: e.data
    })),
    suggestedColors,
    suggestedFormat,
    negativePrompt
  };
}

// Initialize on import
initializeEmbeddings().catch(console.error);
