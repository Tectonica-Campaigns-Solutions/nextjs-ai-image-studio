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
  DEFAULT_TEXT: "Double-click to edit this text\nYou can add more lines here",
  INITIAL_LEFT: 100,
  INITIAL_TOP: 100,
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
  { url: "/TAI-FullColor.png", display_name: "Apply Color Version" },
  { url: "/TAI-White.png", display_name: "Apply White Version" },
  { url: "/TAI-Dark.png", display_name: "Apply Dark Version" },
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

// Shape (Rectangle) Defaults
export const SHAPE_DEFAULTS = {
  FILL_COLOR: { r: 0, g: 0, b: 0, a: 0.3 },
  STROKE_COLOR: { r: 0, g: 0, b: 0, a: 1 },
  STROKE_WIDTH: 2,
  SNAP_ENABLED: true,
  SNAP_THRESHOLD: 5,
  WIDTH: 150,
  HEIGHT: 150,
} as const;

// Shape (Rectangle) Ranges
export const SHAPE_RANGES = {
  STROKE_WIDTH_MIN: 0,
  STROKE_WIDTH_MAX: 20,
  SNAP_THRESHOLD_MIN: 1,
  SNAP_THRESHOLD_MAX: 20,
} as const;

// Export/Disclaimer Configuration
export const EXPORT = {
  DEFAULT_FORMAT: "png",
  DEFAULT_QUALITY: 1,
  DEFAULT_FILENAME: "edited-image.png",
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

// Z-Index / Layer Management
export const LAYERS = {
  BACKGROUND_INDEX: 0,
} as const;

// File Upload
export const FILE_UPLOAD = {
  ACCEPTED_IMAGE_TYPES: "image/*",
} as const;

// UI Styling Constants
export const UI_COLORS = {
  PRIMARY_BG: "#0D0D0D",
  SECONDARY_BG: "#191919",
  BORDER: "#2D2D2D",
  BORDER_HOVER: "#444",
  ACCENT: "#5C38F3",
  ACCENT_HOVER: "#4A2DD1",
  TEXT_PRIMARY: "#F4F4F4",
  TEXT_SECONDARY: "#929292",
} as const;

// Mobile Panel
export const MOBILE_PANEL = {
  DISMISS_THRESHOLD: 100, // pixels to drag down to dismiss
} as const;
