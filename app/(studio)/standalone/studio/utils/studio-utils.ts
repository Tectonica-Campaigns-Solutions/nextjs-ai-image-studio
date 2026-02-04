import QRCode from "qrcode";

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
  fonts: { family: string; weights: string[] }[]
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
  fontStyle: string = "normal"
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
      error: `Tipo de archivo no permitido. Tipos permitidos: ${allowedTypes.join(
        ", "
      )}`,
    };
  }

  const fileExt = file.name.split(".").pop()?.toLowerCase();
  const allowedExtensions = ["ttf", "woff", "woff2", "otf"];
  if (!fileExt || !allowedExtensions.includes(fileExt)) {
    return {
      valid: false,
      error: `Extensión de archivo no permitida. Extensiones permitidas: ${allowedExtensions.join(
        ", "
      )}`,
    };
  }

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `Archivo demasiado grande. Tamaño máximo: ${
        MAX_FILE_SIZE / 1024 / 1024
      }MB`,
    };
  }

  return { valid: true };
}

// QR Generation
export const generateQR = async (
  url: string,
  color?: { dark?: string | undefined; light?: string | undefined }
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
  data?: any
) => {
  const timestamp = new Date().toISOString();
  const message = `[${timestamp}] [${level.toUpperCase()}] [${context}]`;
  if (data) console.log(message, JSON.stringify(data, null, 2));
  else console.log(message);
};
