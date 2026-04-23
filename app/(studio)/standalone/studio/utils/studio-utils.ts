import QRCode from "qrcode";
import { DASHBOARD_FEATURE_FLAGS } from "@/app/(studio)/dashboard/config/feature-flags";

// Brand utils
export const GOOGLE_FONTS = [
  { family: "Inter", category: "sans-serif" },
  { family: "Roboto", category: "sans-serif" },
  { family: "Open Sans", category: "sans-serif" },
  { family: "Lato", category: "sans-serif" },
  { family: "Montserrat", category: "sans-serif" },
  { family: "Manrope", category: "sans-serif" },
  { family: "IBM Plex Sans", category: "sans-serif" },
  { family: "Poppins", category: "sans-serif" },
  { family: "Nunito", category: "sans-serif" },
  { family: "Playfair Display", category: "serif" },
  { family: "Merriweather", category: "serif" },
  { family: "Lora", category: "serif" },
  { family: "PT Serif", category: "serif" },
  { family: "Fira Code", category: "monospace" },
  { family: "JetBrains Mono", category: "monospace" },
];

export const FONT_WEIGHTS = [
  { value: "100", label: "Thin" },
  { value: "200", label: "Extra Light" },
  { value: "300", label: "Light" },
  { value: "400", label: "Regular" },
  { value: "500", label: "Medium" },
  { value: "600", label: "Semi Bold" },
  { value: "700", label: "Bold" },
  { value: "800", label: "Extra Bold" },
  { value: "900", label: "Black" },
];

// Font utilities

/**
 * Returns the primary (first) font family from a font-family string that may
 * include fallbacks (e.g. "Custom Font", "Manrope", sans-serif -> "Custom Font").
 * Use when syncing from canvas object to panel so the Select value matches an option.
 */
export function getPrimaryFontFamily(fontFamily: string): string {
  if (!fontFamily?.trim()) return "";
  const first = fontFamily.split(",")[0].trim();
  return first.replace(/^["']|["']$/g, "");
}

/**
 * Returns a font-family string with fallbacks so the canvas renders with a safe
 * fallback (e.g. Manrope) while custom/Google fonts are still loading.
 */
export function getFontFamilyWithFallback(
  fontFamily: string,
  fallback: string = "Manrope",
): string {
  if (!fontFamily?.trim()) return `"${fallback}", sans-serif`;
  const primary = fontFamily.trim().replace(/^["']|["']$/g, "");
  if (primary === fallback) return `"${primary}", sans-serif`;
  return `"${primary}", "${fallback}", sans-serif`;
}

/**
 * Resolves the font family string to use when drawing on the canvas. For bundled
 * fonts (Manrope, IBM Plex Sans) loaded via next/font CSS variables, reads the
 * computed variable so the canvas uses the same font as the UI.
 */
export function getCanvasFontFamily(
  fontFamily: string,
  fallback: string,
  bundledFontCssVars: Record<string, string>,
): string {
  if (typeof document === "undefined") {
    return getFontFamilyWithFallback(fontFamily, fallback);
  }
  const primary = fontFamily?.trim().replace(/^["']|["']$/g, "") || "";
  const cssVar = primary && bundledFontCssVars[primary];
  if (cssVar) {
    const resolved = getComputedStyle(document.documentElement)
      .getPropertyValue(cssVar)
      .trim();
    if (resolved) {
      return getFontFamilyWithFallback(resolved, fallback);
    }
  }
  return getFontFamilyWithFallback(fontFamily, fallback);
}

export function validateFontFamily(fontFamily: string): boolean {
  if (
    !fontFamily ||
    typeof fontFamily !== "string" ||
    fontFamily.trim() === ""
  ) {
    return false;
  }
  // Check if it's a Google Font (basic validation)
  // In production, you might want to fetch the full list from Google Fonts API
  return (
    GOOGLE_FONTS.some((font) => font.family === fontFamily) ||
    fontFamily.trim().length > 0
  );
}

export function getGoogleFontsUrl(
  fonts: { family: string; weights: string[] }[],
): string {
  if (!fonts || fonts.length === 0) {
    return "";
  }

  const families = fonts.map((font) => {
    const familyName = font.family.replace(/\s+/g, "+");
    const weights =
      font.weights && font.weights.length > 0
        ? `:wght@${font.weights.join(";")}`
        : "";
    return `${familyName}${weights}`;
  });

  return `https://fonts.googleapis.com/css2?${families
    .map((f) => `family=${f}`)
    .join("&")}&display=swap`;
}

export function generateFontFaceCSS(
  fontFamily: string,
  fileUrl: string,
  fontWeight: string = "400",
  fontStyle: string = "normal",
): string {
  // Determinar el formato basado en la extensión de la URL
  let format = "woff2";
  if (fileUrl.endsWith(".woff")) format = "woff";
  else if (fileUrl.endsWith(".ttf")) format = "truetype";
  else if (fileUrl.endsWith(".otf")) format = "opentype";

  return `
@font-face {
  font-family: '${fontFamily.replace(/'/g, "\\'")}';
  src: url('${fileUrl}') format('${format}');
  font-weight: ${fontWeight};
  font-style: ${fontStyle};
  font-display: swap;
}`.trim();
}

export function validateFontFile(file: File): {
  valid: boolean;
  error?: string;
} {
  const allowedTypes = [
    "font/ttf",
    "font/woff",
    "font/woff2",
    "font/otf",
    "application/font-woff",
    "application/font-woff2",
    "application/x-font-ttf",
    "application/x-font-opentype",
  ];

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type not allowed. Allowed types: ${allowedTypes.join(", ")}`,
    };
  }

  const fileExt = file.name.split(".").pop()?.toLowerCase();
  const allowedExtensions = ["ttf", "woff", "woff2", "otf"];
  if (!fileExt || !allowedExtensions.includes(fileExt)) {
    return {
      valid: false,
      error: `File extension not allowed. Allowed extensions: ${allowedExtensions.join(
        ", ",
      )}`,
    };
  }

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }

  return { valid: true };
}

// QR Generation
export const generateQR = async (
  url: string,
  color?: { dark?: string | undefined; light?: string | undefined },
) => {
  try {
    return await QRCode.toDataURL(url, {
      margin: 2,
      color,
    });
  } catch (err) {
    console.error(err);
  }
};

// Logs
export const log = (
  level: "info" | "warn" | "error",
  context: string,
  data?: any,
) => {
  const timestamp = new Date().toISOString();
  const message = `[${timestamp}] [${level.toUpperCase()}] [${context}]`;
  if (data) console.log(message, JSON.stringify(data, null, 2));
  else console.log(message);
};

const VISUAL_STUDIO_ACCESS_LOGS_ENABLED: boolean =
  DASHBOARD_FEATURE_FLAGS.visualStudioAccessLogs;

export async function logVisualStudioAccess(params: {
  caUserId: string;
  sessionId: string | null;
}) {
  if (!VISUAL_STUDIO_ACCESS_LOGS_ENABLED) return;
  if (process.env.NODE_ENV !== "production") return;
  if (typeof window === "undefined") return;

  const controller = new AbortController();

  try {
    await fetch("/api/studio/access-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        caUserId: params.caUserId,
        sessionId: params.sessionId,
        path: window.location.pathname + window.location.search,
      }),
      signal: controller.signal,
    });
  } catch {
    // Silent: does not interrupt the user if logging fails.
  }
}

// Iframe connection
const INPUT_PROMPT_SUBMIT_TYPE = "input:prompt:submit";

export function sendToChat(message: string) {
  if (typeof window === "undefined") return;

  const payload = {
    type: INPUT_PROMPT_SUBMIT_TYPE,
    text: message,
  };

  console.log(
    "[sendToChat] Sending message to parent window:",
    JSON.stringify(payload, null, 2),
  );

  try {
    const targetOrigin = "*";

    // ChangeAgent listens on the immediate parent in many sandboxed embeds.
    // Fallback to `top` only if `parent` is unavailable.
    const targetWindow =
      window.parent && window.parent !== window ? window.parent : window.top;

    if (!targetWindow) {
      console.warn("[sendToChat] No parent/top window available.");
      return;
    }

    console.log({ targetWindow });

    targetWindow.postMessage(payload, targetOrigin);
    console.log("[sendToChat] postMessage sent successfully.", {
      target: targetWindow === window.parent ? "parent" : "top",
      targetOrigin,
    });
  } catch (err) {
    console.error("[sendToChat] Failed to send postMessage:", err);
  }
}
