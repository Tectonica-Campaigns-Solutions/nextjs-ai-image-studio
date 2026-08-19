/**
 * Image Editor Constants
 *
 * Centralized configuration values for the image editor.
 * These constants control behavior, timing, sizing, and default values.
 */

// Canvas Configuration
export const CANVAS = {
  MIN_SIZE: 100,
  MAX_SIZE: 10000,
  DEFAULT_BG_COLOR: "#f8f9fa",
} as const;

// Canvas object controls (rotate / move icons) – offset from object center
export const CANVAS_CONTROLS = {
  OFFSET_BELOW: 18,
  OFFSET_ABOVE: -65,
  BOTTOM_THRESHOLD: 80,
} as const;

// Selection context menu (Duplicate / Delete) – positioning above/below object
export const SELECTION_MENU = {
  OFFSET_ABOVE: 65,
  OFFSET_ABOVE_NEAR_BOTTOM: 118,
  OFFSET_BELOW: 70,
  EST_HEIGHT: 48,
  EDGE_MARGIN: 20,
  NEAR_TOP_Y: 85,
  NEAR_BOTTOM_OFFSET: 110,
} as const;

// History Configuration
export const HISTORY = {
  MAX_ENTRIES: 50,
  SAVE_DEBOUNCE_MS: 500,
  MOVE_SAVE_DEBOUNCE_MS: 400,
} as const;

// Timing Constants
export const TIMING = {
  CANVAS_INIT_DELAY_MS: 100,
  RESIZE_DEBOUNCE_MS: 150,
} as const;

// Text Tool Defaults
export const TEXT_DEFAULTS = {
  FONT_SIZE: 24,
  LINE_HEIGHT: 1.2,
  LETTER_SPACING: 0,
  COLOR: { r: 0, g: 0, b: 0, a: 1 },
  BG_COLOR: { r: 255, g: 255, b: 255, a: 1 },
  DEFAULT_TEXT: "Double-click to start editing...",
} as const;

// Text Tool Ranges
export const TEXT_RANGES = {
  FONT_SIZE_MIN: 12,
  FONT_SIZE_MAX: 72,
  LINE_HEIGHT_MIN: 0.8,
  LINE_HEIGHT_MAX: 3.0,
  LINE_HEIGHT_STEP: 0.1,
} as const;

// QR Code Defaults
export const QR_DEFAULTS = {
  SIZE: 150,
  OPACITY: 100,
} as const;

// QR Code Ranges
export const QR_RANGES = {
  SIZE_MIN: 50,
  SIZE_MAX: 400,
  SIZE_STEP: 10,
  OPACITY_MIN: 10,
  OPACITY_MAX: 100,
  OPACITY_STEP: 5,
} as const;

// Logo Defaults
export const LOGO_DEFAULTS = {
  SIZE: 150,
  OPACITY: 100,
  STYLE: "none",
} as const;

// Default logo assets (url + display_name; variant is added when mapping to LogoAsset)
export const DEFAULT_LOGO_ASSETS = [
  { url: "/TAI-FullColor.png", display_name: "Tectonica AI Color" },
  { url: "/TAI-White.png", display_name: "Tectonica AI White" },
  { url: "/TAI-Dark.png", display_name: "Tectonica AI Dark" },
] as const;

// Logo Ranges
export const LOGO_RANGES = {
  SIZE_MIN: 50,
  SIZE_MAX: 400,
  SIZE_STEP: 10,
  OPACITY_MIN: 10,
  OPACITY_MAX: 100,
  OPACITY_STEP: 5,
} as const;

// Frame Defaults
export const FRAME_DEFAULTS = {
  OPACITY: 100,
} as const;

// Frame Ranges
export const FRAME_RANGES = {
  OPACITY_MIN: 10,
  OPACITY_MAX: 100,
  OPACITY_STEP: 5,
} as const;

// Shape Defaults
export const SHAPE_DEFAULTS = {
  FILL_COLOR: { r: 255, g: 255, b: 255, a: 1 },
  STROKE_COLOR: { r: 0, g: 0, b: 0, a: 1 },
  STROKE_WIDTH: 2,
  FILL_OPACITY: 100,
  WIDTH: 150,
  HEIGHT: 150,
  RADIUS: 75,
  STAR_OUTER_RADIUS: 75,
  STAR_INNER_RADIUS: 30,
} as const;

// Shape Ranges
export const SHAPE_RANGES = {
  STROKE_WIDTH_MIN: 0,
  STROKE_WIDTH_MAX: 20,
  OPACITY_MIN: 0,
  OPACITY_MAX: 100,
} as const;

// AI Edit ("Edit with AI") Configuration
export const AI_EDIT_RANGES = {
  MAX_ADDED_TEXT_WORDS: 8,
} as const;

// Export/Disclaimer Configuration
export const EXPORT_FORMATS = [
  { value: "png" as const, label: "PNG" },
  { value: "jpeg" as const, label: "JPEG" },
  { value: "webp" as const, label: "WebP" },
];

export const EXPORT = {
  DEFAULT_FORMAT: "png",
  DEFAULT_QUALITY: 1,
  DEFAULT_FILENAME: "edited-image.png",
  DEFAULT_FILENAME_BASE: "edited-image",
  DEFAULT_DISCLAIMER_POSITION: "bottom-right",
  DISCLAIMER_MARGIN_MULTIPLIER: 0.009,
  DISCLAIMER_PADDING_MULTIPLIER: 0.009,
  DISCLAIMER_LINE_GAP_MULTIPLIER: 0.0045,
  DISCLAIMER_FONT_SIZE: 6,
  DISCLAIMER_BG_COLOR: "#000000",
  DISCLAIMER_BG_OPACITY: 0.5,
  DISCLAIMER_TEXT_COLOR: "#FFFFFF",
  DISCLAIMER_TEXT_1: "CREATED BY SUPPORTERS WITH ETHICAL AI.",
  DISCLAIMER_TEXT_2_PREFIX: "MORE AT: ",
  DISCLAIMER_TEXT_2_BRAND: "TECTONICA.AI",
  DISCLAIMER_SHADOW_COLOR: "rgba(0,0,0,0.35)",
  DISCLAIMER_MIN_MARGIN: 6,
  DISCLAIMER_MIN_PADDING: 6,
  DISCLAIMER_MIN_LINE_GAP: 3,
} as const;

// Disclaimer Position Options
export const DISCLAIMER_POSITIONS = [
  "top-right",
  "top-left",
  "bottom-left",
  "bottom-right",
] as const;

// Default Fonts
export const DEFAULT_FONTS = {
  PRIMARY: "Manrope",
  SECONDARY: "Arial",
  FALLBACK: ["Manrope", "IBM Plex Sans"],
} as const;

/** Bundled fonts loaded via next/font; map display name to CSS variable for canvas use */
export const BUNDLED_FONT_CSS_VARS: Record<string, string> = {
  Manrope: "--font-manrope",
  "IBM Plex Sans": "--font-ibm-plex-sans",
};

// Z-Index / Layer Management
export const LAYERS = {
  BACKGROUND_INDEX: 0,
} as const;

// File Upload
export const FILE_UPLOAD = {
  ACCEPTED_IMAGE_TYPES: "image/*",
} as const;

// UI Styling Constants — Visual Studio dark surface (Brand C)
export const UI_COLORS = {
  PRIMARY_BG: "#141220",
  CANVAS_MAT: "#0E0D18",
  SECONDARY_BG: "#211E30",
  SURFACE_HOVER: "#2C2942",
  BORDER: "rgba(255,255,255,0.09)",
  BORDER_HOVER: "rgba(255,255,255,0.17)",
  ACCENT: "#8069FF",
  ACCENT_DEEP: "#6146F2",
  ACCENT_HOVER: "#7457F8",
  ACCENT_SOFT: "rgba(128,105,255,0.16)",
  TEXT_PRIMARY: "#F5F4FB",
  TEXT_SECONDARY: "#ADAAC0",
  TEXT_FAINT: "#726F86",
  SUCCESS: "#54B978",
  DANGER: "#F26B81",
  DANGER_SOFT: "rgba(242,107,129,0.15)",
  GRADIENT: "linear-gradient(120deg,#7C56F6 0%,#B06BE6 52%,#FF9A54 100%)",
} as const;

/** Layout dimensions from visual-studio.jsx design artifact */
export const STUDIO_LAYOUT = {
  DOCK_WIDTH: 176,
  PANEL_WIDTH: 320,
  HEADER_PAD_X: 18,
  HEADER_PAD_Y: 14,
  ACTION_BAR_PAD_X: 18,
  ACTION_BAR_PAD_Y: 14,
  DOCK_PAD: 14,
  PANEL_PAD: 16,
  PANEL_GAP: 14,
  CANVAS_PAD: 28,
  CANVAS_TOOLBAR_INSET: 18,
  ICON_BTN: 40,
  ACTION_BTN_H: 44,
  COMPACT_BREAKPOINT: 1340,
  MOBILE_BREAKPOINT: 880,
  /** Fixed row for undo/redo/align/history/delete — keeps canvas-area height stable. */
  MOBILE_CANVAS_TOOLBAR_H: 48,
  /** Fixed slot for tab bar + session bar OR float controls + Done (whichever is active). */
  MOBILE_BOTTOM_CHROME_H: 142,
} as const;

export const STUDIO_DESKTOP_TOOLS = [
  { id: "text-tools", label: "Text Tools", hint: "Add headlines, captions & labels" },
  { id: "logo-overlay", label: "Logo Overlay", hint: "Place your group or partner logo" },
  { id: "qr-code", label: "QR Code", hint: "Link to a sign-up, RSVP or donate page" },
  { id: "ai-edit", label: "Edit with AI", hint: "Describe a change in plain words" },
  { id: "advanced-options", label: "Advanced", hint: "Crop, filters, export size" },
] as const;

/** Advanced accordion rows — order and labels from design file */
export const STUDIO_ADVANCED_ROWS = [
  { id: "layers", label: "Layers" },
  { id: "background", label: "Background image" },
  { id: "shapes", label: "Shape Tools" },
  { id: "frames", label: "Frames" },
  { id: "guides", label: "Guides & grid" },
  { id: "sessions", label: "Saved versions" },
] as const;

export type StudioDesktopToolId = (typeof STUDIO_DESKTOP_TOOLS)[number]["id"] | "saved-versions";

/** Mobile tab bar — icon-over-label chips (visual-studio-mobile.jsx) */
export const STUDIO_MOBILE_TOOLS = [
  { id: "text-tools", label: "Text Tools", short: "Text" },
  { id: "logo-overlay", label: "Logo Overlay", short: "Logo" },
  { id: "qr-code", label: "QR Code", short: "QR Code" },
  { id: "ai-edit", label: "Edit with AI", short: "AI Edit" },
  { id: "advanced-options", label: "Advanced", short: "More" },
] as const;

export type StudioMobileToolId =
  | (typeof STUDIO_MOBILE_TOOLS)[number]["id"]
  | "saved-versions";

// Mobile Panel
export const MOBILE_PANEL = {
  DISMISS_THRESHOLD: 100, // pixels to drag down to dismiss
} as const;

// Guides and grid
export const GUIDES = {
  SNAP_THRESHOLD: 8,
  DEFAULT_GRID_SIZE: 25,
  GUIDE_COLOR: "rgba(128, 105, 255, 0.6)",
  GUIDE_WIDTH: 1,
  GRID_COLOR: "rgba(255, 255, 255, 1)",
  GRID_WIDTH: 1,
} as const;

// Feature flags — toggle UI without removing code
export const FEATURE_FLAGS = {
  showFeedbackButton: true,
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
  enableDisclaimerCropPreprocess: false,
  enableExportDisclaimer: false,
} as const;

// Iframe communication from Studio → parent (ChangeAgent/Open WebUI)
export const STUDIO_IFRAME_MESSAGE = {
  EDITING_DONE_TYPE: "tectonica-studio-editing-done",
  EXIT_FULLSCREEN_TYPE: "tectonica-studio-exit-fullscreen",
} as const;
