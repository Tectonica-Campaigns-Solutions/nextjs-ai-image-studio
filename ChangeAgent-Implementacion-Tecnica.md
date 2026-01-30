# ChangeAgent - Tectonica.ai integration
## Integration Documentation

## 🏗️ System Architecture

### 1. Main Components

```
┌─────────────────────────────────────────────────────────────────┐
│                   CHANGEAGENT (Open WebUI)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐                ┌──────────────────┐      │
│  │  System Prompt   │◄──────────────►│  Unified Tools   │      │
│  │   (v5.14)        │  Coordinates   │     (v3.1.0)     │      │
│  │                  │  workflows     │                  │      │
│  └──────────────────┘                └──────────────────┘      │
│         │                                     │                 │
│         │ Instructions                        │ Executes        │
│         │ & Context                           │ operations      │
│         ▼                                     ▼                 │
│  ┌──────────────────────────────────────────────────┐          │
│  │           Open WebUI Platform                    │          │
│  │  - Conversational interface                      │          │
│  │  - Event Emitter (result streaming)              │          │
│  │  - User and session management                   │          │
│  │  - Local image cache                             │          │
│  │  - Tracking and statistics                       │          │
│  └──────────────────────────────────────────────────┘          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                           │
                           │ HTTP Request to external endpoints
                           │ - Prompt/Instructions
                           │ - Parameters (aspect_ratio, etc.)
                           │ - Client ID
                           │ - Image (Base64 or URL if applicable)
                           │
                           ▼
              ┌────────────────────────────────────┐
              │    IMAGE APP GENERATOR             │
              │    (Tectonica Proprietary App)     │
              │                                    │
              │  - Receives requests               │
              │  - Validates parameters            │
              │  - Manages models per client       │
              │  - Selects fine-tuned model        │
              └────────────────────────────────────┘
                           │
                           │ Consumes services:
                           │ - Sends processed request
                           │ - Specifies FLUX model
                           │
                           ▼
              ┌────────────────────────────────────┐
              │      FAL.AI Platform               │
              │  (External AI Infrastructure)      │
              │                                    │
              │  - Receives requests               │
              │  - Executes FLUX 2 Pro models      │
              │  - Processes images                │
              │  - Stores in CDN                   │
              └────────────────────────────────────┘
                           │
                           │ Executes:
                           ▼
              ┌────────────────────────────────────┐
              │    FLUX 2 Pro Models               │
              │                                    │
              │  - flux-2-pro-edit-create          │
              │  - flux-2-pro-edit-edit            │
              │  - flux-2-pro-edit-combine         │
              │  - flux-2-pro-edit-apply           │
              └────────────────────────────────────┘
                           │
                           │ Returns:
                           │ - Image URL (CDN)
                           │ - Metadata
                           │
                           ▼
              ┌────────────────────────────────────┐
              │    FAL.AI → Image App Generator    │
              │                                    │
              │  Response with generated image     │
              └────────────────────────────────────┘
                           │
                           │ HTTP Response:
                           │ - Image URL
                           │ - Dimensions
                           │ - Status/Metadata
                           │
                           ▼
              ┌────────────────────────────────────┐
              │  Image App Generator → ChangeAgent │
              │                                    │
              │  Returns processed result          │
              └────────────────────────────────────┘
                           │
                           │
                           ▼
              ┌────────────────────────────────────┐
              │    ChangeAgent Post-Processing     │
              │                                    │
              │  - Stores in local cache           │
              │  - Updates statistics              │
              │  - Event Emitter → User            │
              │  - Logs in Workflow History        │
              └────────────────────────────────────┘
```

**Information Flow:**

1. **User → System Prompt:** Request in natural language
2. **System Prompt:** Analyzes intent, determines workflow, extracts parameters
3. **System Prompt → Unified Tools:** Calls appropriate tool with parameters
4. **Unified Tools:** Applies validations, checks cache, builds request
5. **Unified Tools → Image App Generator:** Sends HTTP request to corresponding endpoint
6. **Image App Generator:** Validates, processes, selects model and calls FAL.AI
7. **Image App Generator → FAL.AI:** Consumes services with FLUX 2 Pro model
8. **FAL.AI:** Executes model, generates/edits image, stores in CDN
9. **FAL.AI → Image App Generator:** Returns image URL + metadata
10. **Image App Generator → Unified Tools:** Responds with processed result
11. **Unified Tools:** Stores in cache, updates statistics, emits event
12. **Open WebUI → User:** Displays image via Event Emitter

**⚠️ Important:** Open WebUI (ChangeAgent) **NEVER** interacts directly with FAL.AI. All communication with AI services is through **Image App Generator**.

### 2. Tools Layer

**File:** `unified-image-tools.py`  
**Purpose:** Unified suite of tools for image operations

#### Available Tools

##### 🎨 **generate_image**
Generates new images from text descriptions.

**Use cases:**
- Create original graphics for social media
- Generate illustrations for campaigns

**Parameters:**
- `prompt` (required): Detailed description of the image
- `aspect_ratio` (required): Output format (1:1, 16:9, 9:16, etc.)
- `custom_width/height` (optional): Custom dimensions

**Technology:** FLUX 2 Pro Edit Create (via Image App Generator → FAL.AI)

##### 🎯 **apply_branding**
Applies organizational brand style to existing images.

**Use cases:**
- Maintain visual coherence across materials
- Apply brand identity to photos
- Professionalize existing graphics

**Features:**
- ✅ **Automatically preserves original dimensions**
- Trained with the organization's visual style
- Does not require size specification

**Parameters:**
- `image` (required): URL or Base64 data of the image
- `branding_style` (optional): Description of the style to apply
- `aspect_ratio` (optional): Only if user requests size change

##### ✏️ **edit_image**
Modifies existing images with text instructions.

**Use cases:**
- Adjust specific elements (colors, lighting, objects)
- Iterate on generated images
- Refine compositions

**Features:**
- ✅ **Automatically preserves original dimensions**
- Precise editing through natural language
- Maintains coherence of the original image

**Parameters:**
- `image` (required): Image to edit
- `instructions` (required): Description of the changes
- `aspect_ratio` (optional): Only if resizing is requested

##### 🔀 **fusion_images**
Combines two images into a unified composition.

**Use cases:**
- Create visual narratives (before/after)
- Integrate elements from multiple sources
- Compose complex scenes

**Features:**
- ✅ **Preserves dimensions of the reference image (image1)**
- Smart fusion maintaining visual coherence
- Control over combination style

**Parameters:**
- `image1` (required): First image (reference)
- `image2` (required): Second image
- `instructions` (optional): How to combine them
- `use_style_reference` (optional): Apply artistic style

##### 🎬 **open_studio_v2**
Opens visual interface to add text, logos, and QR codes.

**Use cases:**
- Add headlines and messages
- Place institutional logos
- Insert QR codes for donations/registration

**Features:**
- WYSIWYG interface (what you see is what you get)
- Precise positioning control
- Use of institutional fonts

---

### 3. Shared State Management

The system maintains shared states to optimize performance and tracking:

#### **Image Cache**

Stores already generated images for reuse:

**Structure:**
- Image URL
- Base64 data
- Creation timestamp
- Source (operation that generated it)
- Access counter (hits)

**Benefits:**
- Avoids regenerating identical images
- Reduces latency in repeated operations
- Optimizes external API costs

#### **Workflow History**

Log of operations performed by each user (last 50).

**Benefits:**
- Allows "undo" operations
- Facilitates iteration over versions
- Usage auditing

#### **Rate Limiting Control**

Maintains temporary log of requests per user for limit enforcement.

**Benefits:**
- Prevents system abuse
- Distributes resources equitably
- Protects external APIs

#### **Usage Statistics**

Real-time counters:
- Total operations
- Breakdown by operation type
- Cache hits and misses
- Total errors

**Benefits:**
- Performance monitoring
- Usage pattern identification
- Foundation for optimizations

---

### 5. Intelligence Layer (System Prompt)

**File:** `visual-bot-system prompt v 5.12.md`  
**Purpose:** Defines the bot's behavior, personality, and decision logic

#### System Prompt Modules

##### **MODULE 0: IDENTITY & MISSION**

Defines the bot's identity and values:

- **Role:** "Visual Creation Bot" specialized for progressive organizations
- **Mission:** Democratize access to professional design capabilities
- **Core Values:**
  - Elevation over Automation (empower, not replace)
  - Consent and Respect (explicit consent)
  - Ethical AI Practices (transparency and accountability)
  - Movement Solidarity (understanding social justice context)
  - Representation and Inclusion (diversity in representations)

##### **MODULE 1: DISCOVERY PROCESS (4-STEP WORKFLOW)**

Structured system to guide conversations:

**STEP 1: Detect Workflow Type**
- Generate (create new image)
- Apply (apply branding)
- Edit (modify existing)
- Combine (merge two images)

**STEP 2: Asset Specifications**
Reference table with dimensions per platform:

| Platform | Asset Type | Dimensions | Aspect Ratio |
|------------|--------------|-------------|--------------|
| Instagram | Story | 1080x1920 | 9:16 |
| Instagram | Post (Square) | 1080x1080 | 1:1 |
| Facebook | Cover | 1640x924 | 16:9 |
| Twitter/X | Post | 1200x675 | 16:9 |
| LinkedIn | Post | 1200x627 | 1.91:1 ≈ 16:9 |

**STEP 3: Visual Concept & Description**
Questions to build effective prompts:
- "What is the main theme of the image?"
- "What emotion or feeling should it convey?"
- "Specific visual elements to include?"

**STEP 4: Immediate Execution**
Pre-execution checklist:
1. ✅ Correct dimensions according to reference table
2. ✅ Preserve original dimensions (edit/branding/combine)
3. ✅ Compliance with ethical guidelines
4. ✅ Confirmation of rights and consent
5. ✅ Prompt cleanup (no platform names)

##### **MODULE 2: AVAILABLE TOOLS**

Internal documentation for each tool with:
- When to use it
- Required/optional parameters
- Examples of correct calls
- Common errors to avoid

##### **MODULE 3: PROMPT ENHANCEMENT RULES**

Rules to improve user prompts:

1. **Diversity by default:** "diverse community members", "multiracial coalition"
2. **Movement language:** "grassroots organizing" vs "marketing campaign"
3. **Avoid stereotypes:** Don't assume gender, age, or specific ethnicities
4. **Authentic representation:** "Real people in authentic settings"
5. **Mandatory cleanup:** Remove platform names and formats from prompts

##### **MODULE 6: COMMUNICATION STANDARDS**

Defines communication tone and style:

**Personality:**
- Direct, expert, but accessible
- Conversational partner, not interrogator
- Warm but professional
- Aligned with social justice values

**Response length:**
- 1-3 sentences during discovery
- ONE question at a time
- Minimum 3-4 questions for complete information

**Language:**
✅ Do: "Facebook cover", "Instagram story", "put images together"  
❌ Avoid: "1920x1080px asset", "aspect ratio optimization", "latent diffusion parameters"

---

## � Workflows Detallados: Flujo de Información

Esta sección explica en profundidad cómo viaja la información en cada workflow, desde la solicitud del usuario hasta la entrega del resultado.

### Workflow A: GENERATE (Generar Nueva Imagen)

**Propósito:** Crear imagen original desde descripción de texto.

**Information Flow:**

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. USER INPUT                                                   │
│    Request in natural language                                  │
│    Ex: "I need image of community organizers"                   │
└─────────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. SYSTEM PROMPT - ANALYSIS                                     │
│                                                                 │
│    ▸ Detects workflow type: GENERATE                            │
│    ▸ Identifies mentioned platform/format                       │
│    ▸ Consults Asset Specifications Table                        │
│    ▸ Determines necessary dimensions                            │
│                                                                 │
│    Output: aspect_ratio = "9:16" (Instagram Story)              │
└─────────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. SYSTEM PROMPT - DISCOVERY                                    │
│                                                                 │
│    Series of conversational questions:                          │
│    ▸ "What specific activity?"                                  │
│    ▸ "What emotion should it convey?"                           │
│    ▸ "Important visual elements?"                               │
│                                                                 │
│    Builds context: {                                            │
│      activity: "planning meeting",                              │
│      emotion: "hope and solidarity",                            │
│      elements: "table, documents, diverse people"               │
│    }                                                            │
└─────────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. SYSTEM PROMPT - ENHANCEMENT                                  │
│                                                                 │
│    Applies enhancement rules:                                   │
│    ▸ Diversity: "diverse community members"                     │
│    ▸ Movement language: "grassroots organizing"                 │
│    ▸ Authenticity: "realistic, authentic setting"               │
│    ▸ Cleanup: Removes "Instagram Story" from prompt             │
│                                                                 │
│    Final enriched prompt →                                      │
└─────────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. UNIFIED TOOLS - VALIDATIONS                                  │
│                                                                 │
│    Guardrails:                                                  │
│    ▸ Contains blocked keywords? → NO ✓                          │
│                                                                 │
│    Rate Limiting:                                               │
│    ▸ User exceeds global limit? → NO ✓                          │
│    ▸ User exceeds generate limit? → NO ✓                        │
│                                                                 │
│    Client Mapping:                                              │
│    ▸ Email: user@tectonica.co                                   │
│    ▸ Domain: tectonica.co                                       │
│    ▸ Client ID: "Tectonica" ✓                                   │
└─────────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. UNIFIED TOOLS - CACHE CHECK                                  │
│                                                                 │
│    Generates cache_key:                                         │
│    MD5(operation="generate" + prompt + aspect_ratio)            │
│    → Key: "a3f5b2c..."                                          │
│                                                                 │
│    Searches in image_cache:                                     │
│    ▸ Key exists? → NO (cache miss)                              │
│    ▸ Proceeds to generate new image                             │
└─────────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. UNIFIED TOOLS → IMAGE APP GENERATOR                         │
│                                                                 │
│    Request HTTP POST:                                           │
│    {                                                            │
│      "prompt": "Diverse community members...",                  │
│      "aspect_ratio": "9:16",                                    │
│      "client_id": "Tectonica",                                  │
│      "model": "flux-2-pro-edit-create"                          │
│    }                                                            │
│                                                                 │
│    Endpoint: https://image-app.com/api/external/flux-2-pro-edit-create │
└─────────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 8. IMAGE APP GENERATOR - PROCESSING                             │
│                                                                 │
│    ▸ Receives request from ChangeAgent                          │
│    ▸ Validates parameters and client_id                         │
│    ▸ Selects appropriate model for client                       │
│    ▸ Builds request for FAL.AI                                  │
│    ▸ Calls FAL.AI with FLUX 2 Pro model                         │
└─────────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 9. FAL.AI - MODEL EXECUTION                                     │
│                                                                 │
│    ▸ Processes with FLUX 2 Pro Edit Create                      │
│    ▸ Generates image (15-30 seconds)                            │
│    ▸ Stores in CDN                                              │
│    ▸ Returns URL to Image App Generator                         │
└─────────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 10. IMAGE APP GENERATOR → UNIFIED TOOLS                        │
│                                                                 │
│    Response:                                                    │
│    {                                                            │
│      "success": true,                                           │
│      "image_url": "https://fal.ai/files/zebra/xyz123.png",     │
│      "width": 1080,                                             │
│      "height": 1920,                                            │
│      "processing_time_ms": 18500                                │
│    }                                                            │
└─────────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 11. UNIFIED TOOLS - POST-PROCESSING                             │
│                                                                 │
│     Cache Storage:                                              │
│     ▸ Stores in image_cache with key "a3f5b2c..."              │
│     ▸ TTL: 3600 seconds                                         │
│                                                                 │
│     Workflow History:                                           │
│     ▸ Records operation for user@tectonica.co                   │
│     ▸ Type: "generate", result URL, timestamp                   │
│                                                                 │
│     Statistics Update:                                          │
│     ▸ total_operations += 1                                     │
│     ▸ by_operation["generate"] += 1                             │
│     ▸ cache_misses += 1                                         │
└─────────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 12. EVENT EMITTER → INTERFACE                                   │
│                                                                 │
│     Event streaming:                                            │
│     {                                                           │
│       "type": "message",                                        │
│       "data": {                                                 │
│         "content": "![](https://fal.ai/files/zebra/xyz123.png)"│
│       }                                                         │
│     }                                                           │
│                                                                 │
│     ▸ Open WebUI renders image automatically                    │
└─────────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 13. SYSTEM PROMPT → USER                                        │
│                                                                 │
│     Confirmation message:                                       │
│     "Done! Here's your image for Instagram Story.              │
│      Need any adjustments?"                                     │
│                                                                 │
│     [Image displays in chat]                                    │
└─────────────────────────────────────────────────────────────────┘
```

**Data that travels:**
- **User → System Prompt:** Request in natural language
- **System Prompt → Tools:** Enriched prompt + aspect_ratio + parameters
- **Tools → Image App Generator:** JSON request with complete configuration
- **Image App Generator → FAL.AI:** Processed request for FLUX 2 Pro models
- **FAL.AI → Image App Generator:** Image URL from CDN + metadata
- **Image App Generator → Tools:** Image URL + dimensions + status
- **Tools → Event Emitter:** Markdown with image
- **System Prompt → User:** Confirmation + guidance

---

### Workflow B: APPLY BRANDING (Apply Brand)

**Purpose:** Apply organizational brand style to existing image.

**Information Flow:**

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. USER INPUT                                                   │
│    User uploads image + request                                 │
│    Ex: "Apply our branding to this photo"                       │
└─────────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. SYSTEM PROMPT - ETHICAL VALIDATION                           │
│                                                                 │
│    Verifies:                                                    │
│    ▸ User has rights to the image? → Asks                       │
│    ▸ Are there people in the image? → Verifies visually         │
│    ▸ If people: Has consent? → Asks                             │
│                                                                 │
│    Only proceeds if user confirms rights and consent            │
└─────────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. UNIFIED TOOLS - IMAGE EXTRACTION                             │
│                                                                 │
│    Searches for image in:                                       │
│    ▸ Direct parameter (if passed)                               │
│    ▸ Last uploaded image in conversation                        │
│    ▸ Messages history (previous images)                         │
│                                                                 │
│    Format detected: Base64 data URL                             │
│    ▸ data:image/png;base64,iVBORw0KGgo...                       │
│                                                                 │
│    Extracts original dimensions:                                │
│    ▸ Decodes Base64 → PIL Image                                 │
│    ▸ width: 2400px, height: 1600px                              │
└─────────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. UNIFIED TOOLS - CLIENT MAPPING                               │
│                                                                 │
│    Email: coordinator@communitychange.org                       │
│    Domain: communitychange.org                                  │
│                                                                 │
│    Queries client_mapping:                                      │
│    "communitychange.org:CommunityChange"                        │
│                                                                 │
│    Client ID: "CommunityChange" ✓                               │
│                                                                 │
│    This ID determines the branding model to apply               │
└─────────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. UNIFIED TOOLS → IMAGE APP GENERATOR                         │
│                                                                 │
│    Request:                                                     │
│    {                                                            │
│      "image": "data:image/png;base64,iVBORw0KGgo...",          │
│      "client_id": "CommunityChange",                            │
│      "preserve_dimensions": true,                               │
│      "branding_style": "Apply CommunityChange visual style"     │
│    }                                                            │
│                                                                 │
│    Endpoint: /api/external/flux-2-pro-edit-apply                │
│                                                                 │
│    NOTE: aspect_ratio NOT sent → preserves dimensions           │
└─────────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. IMAGE APP GENERATOR                                          │
│                                                                 │
│    ▸ Receives request with client_id "CommunityChange"          │
│    ▸ Selects corresponding fine-tuned model                     │
│    ▸ Sends to FAL.AI for processing                             │
└─────────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. FAL.AI - PROCESSING WITH SPECIFIC MODEL                      │
│                                                                 │
│    ▸ Executes fine-tuned model for "CommunityChange"            │
│    ▸ Analyzes original image                                    │
│    ▸ Applies style transformations:                             │
│      - Organizational color palette                             │
│      - Characteristic lighting treatment                        │
│      - Brand visual style                                       │
│    ▸ Generates image with SAME dimensions (2400x1600)           │
│    ▸ Returns to Image App Generator                             │
└─────────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 8. IMAGE APP GENERATOR → UNIFIED TOOLS → USER                   │
│                                                                 │
│    Image with applied branding                                  │
│    Preserved dimensions: 2400x1600                              │
│    Ready for direct use or next step (add text)                 │
└─────────────────────────────────────────────────────────────────┘
```

**Key advantage:** Automatic dimension preservation avoids distortion and facilitates multi-step workflows.

**Role of Image App Generator:** Manages client-specific fine-tuned models, allowing each organization to have its own branding style.

---

### Workflow C: EDIT (Edit Existing Image)

**Purpose:** Modify specific elements of existing image.

**Information Flow:**

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. CONTEXT                                                      │
│    User already has image (previously generated or uploaded)    │
│    Requests change: "Change the sky to sunset"                  │
└─────────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. UNIFIED TOOLS - IMAGE IDENTIFICATION                         │
│                                                                 │
│    Searches for target image in:                                │
│    ▸ User's workflow history (last generated/edited)            │
│    ▸ Messages history (most recent image)                       │
│    ▸ Specific URL if user mentions it                           │
│                                                                 │
│    Image found:                                                 │
│    ▸ URL: https://fal.ai/files/lion/abc789.png                  │
│    ▸ Parent operation: "generate" (came from generation)        │
│    ▸ Dimensions: 1920x1080 (16:9)                               │
└─────────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. SYSTEM PROMPT - INSTRUCTION BUILDING                         │
│                                                                 │
│    User input: "Change the sky to sunset"                       │
│                                                                 │
│    Instruction enhancement:                                     │
│    ▸ Specific: "Replace the sky with vibrant sunset"            │
│    ▸ Details: "warm orange and purple tones"                    │
│    ▸ Preservation: "maintain all other elements"                │
│                                                                 │
│    Does NOT include aspect_ratio → preserves 1920x1080          │
└─────────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. UNIFIED TOOLS → IMAGE APP GENERATOR                         │
│                                                                 │
│    Request:                                                     │
│    {                                                            │
│      "image": "https://fal.ai/files/lion/abc789.png",          │
│      "instructions": "Replace the sky with vibrant sunset...",  │
│      "preserve_dimensions": true                                │
│    }                                                            │
│                                                                 │
│    Endpoint: /api/external/flux-2-pro-edit-edit                 │
└─────────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. IMAGE APP GENERATOR → FAL.AI                                 │
│                                                                 │
│    ▸ Receives edit request                                      │
│    ▸ Processes instructions                                     │
│    ▸ Sends to FAL.AI with FLUX 2 Pro Edit model                 │
└─────────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. FAL.AI - DIRECTED EDITING                                    │
│                                                                 │
│    ▸ Loads original image                                       │
│    ▸ Identifies "sky" region through segmentation               │
│    ▸ Generates new sky with requested characteristics           │
│    ▸ Combines with preserved rest of image                      │
│    ▸ Output: Same dimensions 1920x1080                          │
│    ▸ Returns to Image App Generator                             │
└─────────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. IMAGE APP GENERATOR → UNIFIED TOOLS                          │
│                                                                 │
│    Response with edited image URL                               │
└─────────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 8. WORKFLOW HISTORY UPDATE                                      │
│                                                                 │
│    New entry:                                                   │
│    {                                                            │
│      "operation": "edit",                                       │
│      "result_url": "https://fal.ai/files/tiger/def456.png",    │
│      "parent": "https://fal.ai/files/lion/abc789.png",          │
│      "timestamp": 1706599234.5,                                 │
│      "instructions": "sunset sky"                               │
│    }                                                            │
│                                                                 │
│    Allows tracking transformation chain:                        │
│    generate → edit (sunset) → edit (add people) → branding      │
└─────────────────────────────────────────────────────────────────┘
```

**Common use case:** Quick iteration over base image until achieving desired result.

---

### Workflow D: FUSION (Combine Two Images)

**Purpose:** Merge elements from two images into unified composition.

**Information Flow:**

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. INPUT                                                        │
│    User uploads new image + has image in conversation           │
│    "Combine this person with the background we generated before"│
└─────────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. UNIFIED TOOLS - EXTRACTION OF 2 IMAGES                       │
│                                                                 │
│    Image 1 (reference - from conversation):                     │
│    ▸ URL: https://fal.ai/files/panda/bg001.png                  │
│    ▸ Dimensions: 1200x800                                       │
│    ▸ Role: Base image, determines final dimensions              │
│                                                                 │
│    Image 2 (new - just uploaded):                               │
│    ▸ Base64: data:image/jpeg;base64,/9j/4AAQ...                 │
│    ▸ Dimensions: 2000x3000                                      │
│    ▸ Role: Source of elements to merge                          │
└─────────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. SYSTEM PROMPT - FUSION STRATEGY                              │
│                                                                 │
│    Analyzes request: "combine this person with the background"  │
│                                                                 │
│    Determines fusion type:                                      │
│    ▸ Compositing: Extract subject from image2 → image1          │
│    ▸ Instructions: "Extract person from second image and        │
│                       place naturally in the background"        │
│                                                                 │
│    Dimension decision:                                          │
│    ▸ Preserves image1 (reference) dimensions: 1200x800          │
└─────────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. UNIFIED TOOLS → IMAGE APP GENERATOR                         │
│                                                                 │
│    Request:                                                     │
│    {                                                            │
│      "image1": "https://fal.ai/files/panda/bg001.png",         │
│      "image2": "data:image/jpeg;base64,/9j/4AAQ...",           │
│      "instructions": "Extract person from second image...",     │
│      "preserve_image1_dimensions": true                         │
│    }                                                            │
│                                                                 │
│    Endpoint: /api/external/flux-2-pro-edit-combine              │
└─────────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. IMAGE APP GENERATOR → FAL.AI                                 │
│                                                                 │
│    ▸ Processes fusion request                                   │
│    ▸ Sends both images and instructions to FAL.AI               │
└─────────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. FAL.AI - INTELLIGENT FUSION                                  │
│                                                                 │
│    Processing with FLUX 2 Pro Edit Combine:                     │
│    ▸ Segments person in image2                                  │
│    ▸ Adjusts scale for coherence with image1                    │
│    ▸ Integrates into image1 scene                               │
│    ▸ Adjusts lighting for matching                              │
│    ▸ Generates coherent shadows and reflections                 │
│                                                                 │
│    Output: Merged image in dimensions 1200x800                  │
│    Returns to Image App Generator                               │
└─────────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. IMAGE APP GENERATOR → UNIFIED TOOLS → USER                   │
│                                                                 │
│    Merged image ready for use                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Practical application:** Create complex compositions reusing visual elements from different sources.

---

### Workflow E: OPEN STUDIO (Visual Interface)

**Purpose:** Add text, logos, QR codes with precise control.

**Information Flow:**

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. PRE-REQUISITE                                                │
│    User has ready image (from any previous workflow)            │
│    Requests: "I want to add the campaign text"                  │
└─────────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. SYSTEM PROMPT - REDIRECTION                                  │
│                                                                 │
│    Message to user:                                             │
│    "To add text, logos or QR codes, I'll open the Visual        │
│     Studio where you can place them precisely using your        │
│     organization's fonts."                                      │
│                                                                 │
│    Calls: open_studio_v2(image="[url]")                         │
└─────────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. UNIFIED TOOLS - GENERATES IFRAME                             │
│                                                                 │
│    Builds Visual Studio URL:                                    │
│    https://studio.domain.com/editor?image=[encoded_url]         │
│                                                                 │
│    Event Emitter sends:                                         │
│    {                                                            │
│      "type": "iframe",                                          │
│      "data": {                                                  │
│        "url": "https://studio.domain.com/editor?...",           │
│        "height": "800px"                                        │
│      }                                                          │
│    }                                                            │
└─────────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. VISUAL STUDIO OPENS IN CHAT                                  │
│                                                                 │
│    User sees embedded WYSIWYG interface:                        │
│    ▸ Background image loaded                                    │
│    ▸ Text tools (organizational fonts)                          │
│    ▸ Logo library                                               │
│    ▸ QR code generator                                          │
│    ▸ Position, size, color controls                             │
│                                                                 │
│    User works directly in the editor                            │
└─────────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. USER COMPLETES AND DOWNLOADS                                 │
│                                                                 │
│    ▸ Click on "Done" or "Export"                                │
│    ▸ Visual Studio generates final image with overlays          │
│    ▸ Provides download URL                                      │
│    ▸ Optional: Returns to conversation with URL to              │
│                 continue workflow                               │
└─────────────────────────────────────────────────────────────────┘
```

**Separation of responsibilities:** ChangeAgent generates visuals, Visual Studio adds precise graphic elements.

---

**Document prepared by:** Tectonica Technical Team  
**Last update:** January 2026  
**Document version:** 1.0

---

## �🛡️ Características de Seguridad y Cumplimiento

### 1. Content Moderation (Guardrails)

**Sistema de dos capas:**

#### Capa 1: Validación Rápida (Keyword Blocking)

Revisa el prompt contra una lista de palabras bloqueadas:
- violence, gore, nsfw, nude, explicit, porn, sexual
- kill, death, blood, weapon

Si se detecta alguna keyword, la operación se bloquea inmediatamente.

#### Capa 2: Validación con LLM (Opcional)

Desactivada por defecto para evitar latencia. Cuando está habilitada:
- Envía el prompt a modelo LLM (llama3.2)
- Análisis semántico avanzado de contenido potencialmente dañino
- Mayor precisión pero añade 2-3 segundos de latencia

### 2. Access Control

**Allowed Users:**

Configurable list of allowed emails (empty field = all allowed).

**Format:** `user1@org.com,user2@org.com`

**Benefits:**
- Controlled pilot implementation
- Restriction to specific groups
- Prevention of unauthorized access

### 3. Multi-level Rate Limiting

**Level 1: Global**
Total limit of operations per user per hour (example: 100)

**Level 2: Per Operation**
- generate: 20 per hour
- edit: 30 per hour
- fusion: 15 per hour
- branding: 25 per hour

**How it works:**
The system maintains timestamps of each operation and validates against limits before executing.

### 4. Consent and Rights

**System Prompt Rules:**
```markdown
CRITICAL: Visual Studio for Text, Logos, and QR Codes
You NEVER generate images with text, logos, or written content baked into them.

Workflow B/C/D (with uploaded images):
If upload: Confirm (a) they have rights to use the image and 
           (b) if it depicts a person, they have consent
```

**Required validations:**
1. Confirm usage rights for uploaded images
2. Confirm consent from people in images
3. Don't modify images without explicit permission

### 5. Privacy and Data

**User information management:**

The system only extracts:
- User email (for client mapping and rate limiting)
- Email domain (for organization identification)

No additional personal information is stored.

**Debug Mode (Development only):**
There's a debug option that shows full user information, **must be disabled in production**.

---

## 📊 Monitoring and Analysis

### 1. Real-time Statistics

The system maintains automatic counters:
- Total operations
- Breakdown by type (generate, edit, fusion, branding)
- Cache hits and misses
- Total errors

**Calculated metrics:**
- **Cache Hit Rate:** Percentage of operations served from cache
- **Error Rate:** Percentage of failed operations
- **Distribution by type:** Which operations are most used

### 2. Logging and Debug

**Debug Mode:** Configuration that when activated records:
- Parameters of each tool call
- Cache events (hits, misses, evictions)
- Workflow tracking per user
- Updated statistics after each operation

**Log example:**
```
[UNIFIED TOOLS - GENERATE] Called with:
- Prompt: diverse community members organizing...
- Aspect Ratio: 9:16
- User: user@tectonica.co

[CLIENT MAPPING] User user@tectonica.co → Tectonica (domain: tectonica.co)

[CACHE] Miss: abc123... (generating new)
[CACHE] Added: abc123... from generate (total: 23)

[WORKFLOW] Added generate for user@tectonica.co (total: 5)

[STATS] Total: 152, Cache Hit Rate: 67.3%, Errors: 3
```

### 3. Workflow History

Maintains history of the last 50 operations per user.

**Information stored per operation:**
- Operation type (generate, edit, fusion, branding)
- Result URL
- Timestamp
- Parent image URL (for editing operations)

**Utility:**
- Reconstruct editing chain
- Identify usage patterns
- Support for "undo" operations
- Activity auditing

---

## 🚀 Performance Optimizations

### 1. Intelligent Cache System

**Cache Key Generation:**
Each operation with its parameters generates a unique key (MD5 hash). If the same parameters are used again, the system returns the image from cache instead of regenerating it.

**Benefits:**
- Same parameters = same image (without regenerating)
- Time savings (external API latency eliminated)
- Cost savings (fewer calls to paid APIs)

**Automatic size management:**
When cache reaches its maximum limit, it automatically removes the least used or oldest images.

**LRU Strategy (Least Recently Used):**
- Each access updates the timestamp
- Eviction removes items with oldest timestamp
- Prioritizes frequently accessed content

### 2. Async/Await for Concurrency

All operations are asynchronous, which allows:

**Benefits:**
- Doesn't block while waiting for API response
- Multiple users can operate simultaneously
- Better server resource utilization
- Faster response under load

### 3. Thread-Safe Operations

Use of asynchronous locks to avoid concurrency issues:

**Independent locks for:**
- Cache operations
- Workflow history update
- Rate limit verification
- Statistics update

**Prevents:**
- Data corruption in concurrent access
- Counter inconsistencies
- Tracking operation loss

