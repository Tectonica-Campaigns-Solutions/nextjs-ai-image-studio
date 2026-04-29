## Tectonica.ai Studio – Developer Guide

This document explains how the **Studio** area of the app works, focusing on:

- The **Studio namespace** under `app/(studio)`
- The **admin dashboard** (`/dashboard/...`)
- The **standalone Studio image editor** (`/standalone/studio`)

It is written for new developers so you can quickly understand the architecture and safely extend it.

---

## 1. High‑Level Overview

The Studio namespace serves two main use cases:

- **Admin dashboard** – internal UI where admins manage clients, assets, fonts, and canvas sessions.
- **Standalone Studio editor** – a Fabric.js‑based image editor that allows users to:
  - Upload or load an image (background)
  - Add text, shapes, frames, logos and QR codes as overlays
  - Edit the background with AI
  - Save and restore **canvas sessions**
  - Export the final image with a Tectonica disclaimer
  - Optionally embed the editor in another product via an `<iframe>`

The namespace lives under:

- `app/(studio)/layout.tsx` – shared layout and fonts for the Studio segment
- `app/(studio)/dashboard/*` – admin dashboard routes
- `app/(studio)/standalone/studio/*` – standalone editor routes and implementation

The rest of this README walks through the structure, routing, editor architecture, persistence, and extensibility patterns.

---

## 2. Directory Structure (Studio Namespace)

At a high level:

- `app/(studio)/layout.tsx`
  - Segment layout and font setup for all Studio routes.
- `app/(studio)/dashboard/`
  - `layout.tsx` – wraps all dashboard pages in `AdminShell`.
  - `page.tsx` – top‑level dashboard route that redirects to `/dashboard/clients`.
  - `actions/` – server actions for admins (e.g. deleting canvas sessions).
  - `components/` – dashboard‑specific UI components (lists, forms, galleries).
  - `data/` – data helpers for dashboard pages (admins, clients, etc.).
  - `schemas/` – Zod schemas / helpers for dashboard params and entities.
  - `utils/` – utilities such as `requireAdmin` and font helpers.
  - `admins/`, `clients/`, `login/`, `accept-invitation/`, etc. – individual dashboard routes.
- `app/(studio)/standalone/studio/`
  - `page.tsx` – entry point for the standalone Studio route.
  - `studio-editor-loader.tsx` – loads the editor with the correct props and data.
  - `image-editor-standalone.tsx` – **core image editor implementation** (client component).
  - `components/` – React components for the editor UI (panels, toolbar, overlays).
  - `hooks/` – custom hooks: canvas, history, selection, and tool‑specific logic.
  - `constants/editor-constants.ts` – central configuration and feature flags.
  - `lib/` – helper libraries (e.g. AI edit service, Fabric control icons).
  - `utils/` – image editor utilities and type guards.
  - `types/` – TypeScript types for the editor.

---

## 3. Routing and Layout

### 3.1 Studio Segment Layout

File: [`app/(studio)/layout.tsx`](app/(studio)/layout.tsx)

Key points:

- Exposes `metadata` for the Studio segment.
- Loads shared fonts via `next/font` (e.g. `Manrope`, `IBM Plex Sans`, Geist).
- Wraps all Studio children with a `div` that wires up CSS variables for fonts:

```tsx
export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`font-sans ${GeistSans.variable} ${GeistMono.variable} ${manrope.variable} ${ibmPlexSans.variable}`}>
      {children}
    </div>
  );
}
```

All Studio routes inherit this layout and font configuration.

### 3.2 Admin Dashboard Routing

Core files:

- [`app/(studio)/dashboard/layout.tsx`](app/(studio)/dashboard/layout.tsx)
- [`app/(studio)/dashboard/page.tsx`](app/(studio)/dashboard/page.tsx)

`dashboard/layout.tsx`:

- Wraps the dashboard in an `AdminShell` component, which handles admin UI chrome (navigation, sidebar, etc.).

`dashboard/page.tsx`:

- Immediately redirects to `/dashboard/clients`:

```tsx
export default function AdminPage() {
  redirect("/dashboard/clients");
}
```

Other notable routes under `dashboard/`:

- `clients/` – client list, client details (`[id]/page.tsx`), and related galleries.
- `admins/` – admin list and details.
- `login/` and `auth/callback/` – admin authentication.
- `accept-invitation/` – flows for accepting admin invitations.
- `error.tsx` and `loading.tsx` – error/loading boundaries for dashboard.

### 3.3 Standalone Studio Editor Routing

Core files:

- [`app/(studio)/standalone/studio/page.tsx`](app/(studio)/standalone/studio/page.tsx)
- `app/(studio)/standalone/studio/studio-editor-loader.tsx`

`page.tsx`:

- Wraps the editor loader in a `Suspense` boundary and passes `searchParams`:

```tsx
type StudioPageProps = {
  searchParams: Promise<{
    imageUrl?: string;
    user_id?: string;
    session_id?: string;
    /**
     * Optional initial text to auto-insert as editable text blocks.
     * Multiple blocks can be separated with `||` (or via `text_delim`).
     */
    text?: string;
    /** Optional delimiter for splitting `text` (default: `||`). */
    text_delim?: string;
  }>;
};

export default function StudioPage({ searchParams }: StudioPageProps) {
  return (
    <Suspense fallback={<StudioLoading />}>
      <StudioEditorLoader searchParams={searchParams} />
    </Suspense>
  );
}
```

`StudioEditorLoader`:

- Resolves `searchParams` and prepares the props for `ImageEditorStandalone`.
- Handles loading:
  - Initial background image (`imageUrl` query param).
  - User identity (e.g. `user_id`, `user_email`, `client_id`).
  - An existing `session_id` (to restore a saved canvas session).
  - Optional auto text insertion (`text` / `text_delim`) when opening a new session.

Example:

- `...?imageUrl=...&user_id=...&text=Titulo%20||%20Subtitulo%20||%20CTA`

---

## 4. Editor Architecture (ImageEditorStandalone)

Core file: [`app/(studio)/standalone/studio/image-editor-standalone.tsx`](app/(studio)/standalone/studio/image-editor-standalone.tsx)

This is a **client component** that wires together:

- Fabric.js canvas
- Editor state and history
- Tool panels (text, shapes, logo, QR, frames, guides/grid)
- AI integration
- Canvas sessions (save/load)
- Export and embedding behaviors

### 4.1 Main Responsibilities

`ImageEditorStandalone`:

- Applies the initial background image from:
  - `params.imageUrl` query param, or
  - Previously saved `sessionData.background_url`, or
  - User upload (when there is no initial image).
- Initializes **stable refs** for the Fabric canvas and original image metadata.
- Creates and composes all custom hooks:
  - Canvas management
  - History and undo/redo
  - Selection synchronization
  - Tools (text, shape, logo, QR, frame, alignment)
  - Mobile bottom panel behavior
  - Font loading and re‑measurement
- Restores overlays from a saved session when appropriate.
- Provides UI controls for saving, exporting, AI editing, feedback, and navigation back to a parent conversation (if embedded).

### 4.2 Core Hooks

All hooks live under `app/(studio)/standalone/studio/hooks/`. The most important ones are:

- `use-image-editor-canvas`
  - Creates and manages the Fabric canvas instance.
  - Configures canvas dimensions and header offsets.
  - Handles right‑click suppression (`preventContextMenu`).
  - Provides `replaceBackgroundImage` and references to original image dimensions.
  - Emits events for rotation tooltips, selection context menu position, and guides/grid overlays.
- `use-image-editor-history`
  - Manages undo/redo stacks with debounced persistence (`HISTORY` constants).
  - Stores serialized overlay JSON + metadata for each history entry.
  - Exposes `saveState`, `undo`, `redo`, and helpers to restore overlays/metadata.
- `use-image-editor-selection`
  - Keeps React state in sync with the currently selected Fabric object.
  - Propagates changes from selection into tool panels (e.g. text size, colors).
  - Supports both single objects and `ActiveSelection` for multi‑select.
- `use-text-tools`
  - Adds text boxes using defaults from `TEXT_DEFAULTS` and `TEXT_RANGES`.
  - Manages text styling: font family, weight, alignment, spacing, colors.
  - Applies updates to the selected textbox and triggers history saves.
- `use-shape-tools`
  - Adds shapes (rectangles, circles, stars, etc.) using `SHAPE_DEFAULTS`.
  - Controls stroke color, width, opacity and shape detection (`isShapeSelected`).
- `use-logo-tools`
  - Manages Tectonica logo variants and custom logos.
  - Tracks logo size, opacity, style; handles logo file uploads.
- `use-qr-tools`
  - Creates QR overlays from URLs or uploaded images.
  - Tracks QR size and opacity; updates overlays when control state changes.
- `use-frame-tools`
  - Manages decorative frames around the canvas content.
  - Applies frame assets to match the canvas aspect ratio.
- `use-alignment-tools`
  - Provides alignment operations (center horizontally, vertically, align to canvas edges, etc.) for selected objects.
- `use-mobile-panel`
  - Controls the behavior of the bottom sheet‑like panel on mobile.
  - Manages active tab, drag gestures and visibility.
- `use-editor-fonts`
  - Loads additional fonts used by the editor and ensures text is re‑measured once fonts are ready.

The hooks communicate through shared refs/state (especially the Fabric canvas ref and history references) to keep canvas and React UI synchronized.

### 4.3 Constants and Feature Flags

File: [`app/(studio)/standalone/studio/constants/editor-constants.ts`](app/(studio)/standalone/studio/constants/editor-constants.ts)

This file centralizes configuration:

- **Canvas and controls:**
  - `CANVAS`, `CANVAS_CONTROLS`, `SELECTION_MENU`, `TIMING`.
- **Text / QR / logo / frame / shape defaults and ranges:**
  - `TEXT_DEFAULTS`, `TEXT_RANGES`
  - `QR_DEFAULTS`, `QR_RANGES`
  - `LOGO_DEFAULTS`, `LOGO_RANGES`
  - `FRAME_DEFAULTS`, `FRAME_RANGES`
  - `SHAPE_DEFAULTS`, `SHAPE_RANGES`
- **Export and disclaimer configuration:**
  - `EXPORT_FORMATS`, `EXPORT`, `DISCLAIMER_POSITIONS`
  - Handles default format, file naming, disclaimer content and styling.
- **Fonts and CSS variables:**
  - `DEFAULT_FONTS`, `BUNDLED_FONT_CSS_VARS`
- **Visual design:**
  - `UI_COLORS` – dark theme colors consistent across the editor.
- **Guides and grids:**
  - `GUIDES` – snap thresholds, grid size, line colors.
- **Feature flags:**

```ts
export const FEATURE_FLAGS = {
  showFeedbackButton: false,
  showSaveCanvas: true,
  showReplaceBackgroundTool: true,
  showTextTools: true,
  showLogoTools: true,
  showQrTools: true,
  showShapeTools: true,
  showFrameTools: true,
  showEditWithAI: true,
  showLayersPanel: true,
  showGuidesAndGrid: true,
} as const;
```

Use these flags to hide or show major pieces of UI without removing code.

### 4.4 UI Composition – Panels and Toolbar

Some notable components (under `components/`):

- `EditorSidebar`
  - Hosts the tool panels (text, shapes, logo, QR, frames, guides/grid, sessions) in a vertical stack.
  - On mobile, integrates with the `use-mobile-panel` hook to behave like a bottom sheet.
- Tool panels:
  - `TextToolsPanel` – text content and styling.
  - `ShapeToolsPanel` – shape insertion and styling controls.
  - `LogoToolsPanel` – branding assets and logo styling.
  - `QrToolsPanel` – QR data and styling.
  - `FrameToolsPanel` – frame selection and opacity.
  - `BackgroundImagePanel` – replace background from URL or file.
  - `GuidesAndGridPanel` – toggles guides and grid overlay.
  - `LayersPanel` – displays canvas layers and supports reordering, locking, visibility toggles.
  - `SessionsListPanel` – lists saved sessions for the current image.
- `EditorToolbar`
  - Exists in mobile and desktop variants.
  - Provides undo/redo, delete, export, save, feedback, and alignment.
  - Renders an `alignmentSlot` which hosts the `AlignmentPopover`.
- Overlays:
  - `CanvasGuidesOverlay` – draws guides and grid on top of the Fabric canvas.
  - Selection context menu – small floating toolbar above the selected object for duplicate, lock/unlock, and delete.

The main component conditionally renders panels based on `FEATURE_FLAGS` and the currently selected object, keeping performance in mind via `useMemo`.

---

## 5. AI Integration

File: [`app/(studio)/standalone/studio/lib/image-edit-service.ts`](app/(studio)/standalone/studio/lib/image-edit-service.ts)

This is a lightweight client for the external AI image edit API:

- Endpoint: `/api/external/flux-2-pro-edit-edit`
- Request body (simplified):

```ts
{
  prompt: string; // required, trimmed
  orgType: string; // defaults to "Tectonica"
  clientInfo: {
    client_id?: string;
    user_email?: string;
    user_id?: string;
  };
  imageUrls?: string[];
  base64Images?: string[];
}
```

`ImageEditorStandalone` uses this through `handleAIEdit`:

- Prepares the payload with either:
  - **Background only** (`getCurrentBackgroundImageForEdit`), or
  - **Full canvas** including overlays (`getFullCanvasImageForEdit`), depending on user choice.
- Calls `editImage(...)`.
- On success:
  - Replaces the background image with the edited image.
  - Optionally clears overlays if the edit includes them.
  - Updates history and user feedback.

Error handling:

- All failures (network, empty images, API errors) are surfaced via `toast` with meaningful messages.

---

## 6. Canvas Sessions and Persistence

The editor supports save/restore of **canvas sessions**, which represent:

- Background image URL
- Fabric overlay JSON (objects, transforms, metadata)
- Thumbnail for gallery display

### 6.1 Saving a Session

In `ImageEditorStandalone`, the `handleSave` function:

1. Reads the current history entry (overlay JSON + metadata).
2. Uses `params.user_id` and the current or original background image URL.
3. Builds a body like:

```ts
{
  ca_user_id: string;
  background_url: string;
  overlay_json: object;
  metadata: object;
  session_id?: string; // present when updating existing session
  name?: string;       // optional session name from modal
}
```

4. Sends a POST request to `/api/studio/canvas-sessions`.
5. On success:
   - Saves the returned session ID in state.
   - Updates the URL query param (`session_id=...`) via `history.replaceState`.
   - Shows a success toast.
6. In the background, it:
   - Generates a smaller JPEG thumbnail from the canvas.
   - POSTs it to `/api/studio/canvas-sessions/thumbnail` with:

```ts
{
  session_id: string;
  ca_user_id: string;
  image_base64: string; // data URL
}
```

7. Refreshes the list of sessions for the current image to keep the sidebar in sync.

### 6.2 Loading a Session

The `SessionsListPanel` displays sessions for the current image/user, and when a session is selected it calls `handleSelectSession`:

1. Fetches `/api/studio/canvas-sessions/:sessionId`.
2. Validates the response and extracts `overlay_json` and `metadata`.
3. Clears all non‑background objects from the canvas.
4. Calls:
   - `history.loadOverlaysFromJSON(canvas, overlayJSON)`
   - `history.applyEntryMetadataToCanvas(...)`
5. Discards the active selection, re‑renders the canvas, and saves a new history state.
6. Updates `sessionId` in component state and the URL query param.

### 6.3 Listing Sessions

The helper `fetchSessionsForImage` is called on mount and when the background image URL or user changes:

- Requires a non‑empty `params.user_id` and a valid background URL.
- Calls:

```ts
GET /api/studio/canvas-sessions?ca_user_id=<user>&background_url=<encoded-url>
```

- Maps the returned list into:
  - `id`
  - `name`
  - `thumbnail_url`
  - `created_at`
  - `updated_at`
- Sets `sessionsInitialFetchDone` once the request completes so the editor can fully render without layout shift.

### 6.4 Admin‑Side Session Management

File: [`app/(studio)/dashboard/actions/canvas-sessions.ts`](app/(studio)/dashboard/actions/canvas-sessions.ts)

The `deleteCanvasSessionAction` server action:

- Enforces admin authorization via `requireAdmin`.
- Validates `clientId` and `sessionId` as UUIDs.
- Uses Supabase (`createAdminClient`) to:
  - Confirm the session exists and belongs to the client.
  - Soft‑delete the session by setting `deleted_at`.
- Calls `revalidatePath("/dashboard/clients/:clientId")` so the client details page re‑fetches its data.

The underlying database table is `client_canvas_sessions` in Supabase.

---

## 7. Data and External Services

### 7.1 Supabase

The admin dashboard uses Supabase to persist entities such as:

- Clients
- Admins
- Canvas sessions (`client_canvas_sessions`)

Key helpers:

- `createAdminClient` – creates a Supabase client with admin privileges.
- `requireAdmin` – guards server actions/routes to ensure only authorized admins access them.

### 7.2 API Routes (Conceptual)

Although the implementations live under `app/api/`, the editor and dashboard depend on several routes:

- `/api/studio/canvas-sessions`
  - `POST` – create or update a canvas session.
  - `GET` – list sessions filtered by `ca_user_id` and `background_url`.
- `/api/studio/canvas-sessions/thumbnail`
  - `POST` – upload a JPEG thumbnail for an existing session.
- `/api/studio/canvas-sessions/:id`
  - `GET` – fetch a single canvas session by ID.
- `/api/studio/return-image`
  - `POST` – receives a base64 image from the editor and uploads it, returning a public URL.
- `/api/studio/image-feedback`
  - `POST` – accepts a base64 image and returns AI feedback text.
- `/api/external/flux-2-pro-edit-edit`
  - `POST` – external AI image edit endpoint used by `editImage`.

You should consult the corresponding route implementations for details when making breaking changes to payloads or response shapes.

---

## 8. Local Development and Embedding

### 8.1 Running the Studio Locally

1. Install dependencies at the repo root:

```bash
npm install
```

2. Start the dev server:

```bash
npm run dev
```

3. Open the following routes:

- Admin dashboard: `http://localhost:3000/dashboard`
  - Immediately redirects to `/dashboard/clients`.
  - Requires valid admin authentication (check Supabase and auth config).
- Standalone Studio editor:
  - `http://localhost:3000/standalone/studio`
  - Optional query parameters:
    - `imageUrl=<public-url>` – initial background image.
    - `user_id=<id>` – identifies the current user for session saving.
    - `session_id=<id>` – preload an existing saved session.

Note: Actual base paths may be wrapped by additional segment layouts (e.g. marketing or auth segments). Always confirm by checking `app/` routing.

### 8.2 Embedding via Iframe

`ImageEditorStandalone` supports being embedded in another application (e.g., ChangeAgent/Open WebUI) via an `<iframe>`:

- It detects if it is in an iframe using:

```ts
const isEmbedded =
  typeof window !== "undefined" &&
  typeof window.self !== "undefined" &&
  window.self !== window.top;
```

- The `handleReturnToConversation` function:
  - Exports the canvas to a high‑resolution JPEG data URL.
  - Uploads it to `/api/studio/return-image` to get a public URL.
  - Calls `window.parent.postMessage(...)` with a payload:

```ts
window.parent.postMessage(
  {
    type: STUDIO_IFRAME_MESSAGE.EDITING_DONE_TYPE, // "tectonica-studio-editing-done"
    imageUrl,                                      // URL returned from the API
  },
  "*"
);
```

- The embedding app is responsible for:
  - Creating the `<iframe src=".../standalone/studio?...">`.
  - Listening for `message` events and filtering on
    `type === "tectonica-studio-editing-done"`.
  - Consuming `imageUrl` (e.g., posting it back into a chat).

When embedding, make sure to pass appropriate query params for `user_id` and `client_id` so sessions and analytics can be recorded correctly.

---

## 9. Extensibility Guidelines

This section explains how to safely extend the Studio without breaking existing behavior.

### 9.1 Adding a New Tool or Panel

Suppose you want to add a new **tool panel** (e.g., stickers):

1. **Create a hook** under `hooks/` to encapsulate state and canvas logic:
   - e.g. `hooks/use-sticker-tools.ts`.
   - Accepts `canvasRef`, `saveStateRef` and any configuration.
   - Exposes:
     - Methods to insert/modify/delete objects on the canvas.
     - Control state (size, opacity, style, etc.).
2. **Create a panel component** under `components/`:
   - e.g. `components/StickerToolsPanel.tsx`.
   - Stateless UI that receives props from the hook (values + setters).
3. **Wire the hook and panel into `ImageEditorStandalone`:**
   - Call your hook near where other tools hooks are initialized, using the stable canvas refs and history where appropriate.
   - Use `useMemo` to create your panel element:

```tsx
const stickerToolsPanel = useMemo(
  () => (
    <StickerToolsPanel
      size={stickerTools.size}
      setSize={stickerTools.setSize}
      // ...
    />
  ),
  [stickerTools]
);
```

4. **Expose the panel in `EditorSidebar`:**
   - Add a new prop (e.g. `stickerToolsPanel`) and pass your memoized element from `ImageEditorStandalone`.
   - Update `EditorSidebar` to render it in the right place.
5. **Integrate with selection (optional):**
   - If your objects need special behavior when selected, update `use-image-editor-selection` or add a dedicated helper to detect your object type (similar to logos, QR, frames, shapes).

Always:

- Call `history.saveState` after mutating the canvas.
- Use `constrainObjectToCanvas` when needed to keep objects in bounds.

### 9.2 Toggling Features via FEATURE_FLAGS

Use [`FEATURE_FLAGS`](app/(studio)/standalone/studio/constants/editor-constants.ts) to enable or disable features at runtime (build‑time constant):

- Hide/show major UI sections (text, logos, QR, frames, guides, layers, AI edit, save button, feedback button).
- Example usage in `ImageEditorStandalone`:

```tsx
<EditorSidebar
  backgroundImagePanel={FEATURE_FLAGS.showReplaceBackgroundTool ? backgroundImagePanel : null}
  textToolsPanel={FEATURE_FLAGS.showTextTools ? textToolsPanel : null}
  // ...
/>;
```

If you introduce a new feature flag:

1. Add it to `FEATURE_FLAGS` with a clear name and default.
2. Guard the relevant UI and effects with the flag.
3. Keep behavior deterministic when the flag is off (no side effects).

### 9.3 Styling and UX

Key styling decisions:

- Dark theme colors come from `UI_COLORS` constants.
- Fonts:
  - Loaded in `app/(studio)/layout.tsx` via `next/font`.
  - Canvas text uses `DEFAULT_FONTS` and `BUNDLED_FONT_CSS_VARS`.
- Spacing, typography, and rounding are mostly Tailwind‑based utility classes set in components.

When updating styling:

- Reuse `UI_COLORS` instead of hard‑coding hex values.
- Keep the editor accessible:
  - Maintain sufficient contrast for overlays and toolbars.
  - Ensure buttons and icons have `aria-label`/`role` where appropriate.

---

## 10. Architecture Diagram (Mermaid)

The following diagram summarizes the main flows between routing, editor, hooks, panels, and persistence:

```mermaid
flowchart TD
  studioLayout[StudioLayout]

  subgraph studioRoutes[Studio Routes]
    dashboardRoute[Dashboard /dashboard]
    standaloneStudioRoute[Standalone /standalone/studio]
  end

  studioLayout --> studioRoutes
  dashboardRoute --> adminShell[AdminShell]

  standaloneStudioRoute --> studioEditorLoader[StudioEditorLoader]
  studioEditorLoader --> imageEditorStandalone[ImageEditorStandalone]

  subgraph editorCore[Editor Core]
    canvasHook[useImageEditorCanvas]
    historyHook[useImageEditorHistory]
    selectionHook[useImageEditorSelection]
    toolsHooks[Text/QR/Logo/Frame/Shape Hooks]
    mobilePanelHook[useMobilePanel]
  end

  imageEditorStandalone --> editorCore

  subgraph editorUI[Editor UI]
    editorSidebar[EditorSidebar + Panels]
    editorToolbar[EditorToolbar]
    overlays[Guides/Grid/ContextMenu]
  end

  imageEditorStandalone --> editorUI

  subgraph persistence[Persistence & Services]
    supabase[Supabase client_canvas_sessions]
    studioApi[API /api/studio/*]
    aiEditApi[/api/external/flux-2-pro-edit-edit]
    parentApp[Embedding Parent App]
  end

  imageEditorStandalone --> studioApi
  studioApi --> supabase
  imageEditorStandalone --> aiEditApi
  imageEditorStandalone --> parentApp
```

---

## 11. Tips for New Contributors

- Start by exploring:
  - `image-editor-standalone.tsx` to understand how the editor is wired.
  - `editor-constants.ts` to see configuration and feature flags.
  - `dashboard/clients` and `dashboard/admins` pages to understand the admin flows.
- When introducing a new feature:
  - Prefer encapsulating canvas logic in a dedicated hook.
  - Keep React state and Fabric objects in sync through existing patterns.
  - Add tests or story‑like examples where practical.
- When in doubt about behavior (especially persistence and AI calls), search for usages of:
  - `handleSave`
  - `handleSelectSession`
  - `handleAIEdit`
  - `/api/studio/` routes

This README should give you a solid starting point to reason about the Studio. From here you can drill into individual files to understand specific behavior in more detail.

