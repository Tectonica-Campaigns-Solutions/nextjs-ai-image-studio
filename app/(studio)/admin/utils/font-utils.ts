import { createClient } from "@/lib/supabase/server";

const BUCKET_NAME = "client-assets"; // Reuse the assets bucket
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = [
  "font/ttf",
  "font/woff",
  "font/woff2",
  "font/otf",
  "application/font-woff",
  "application/font-woff2",
  "application/x-font-ttf",
  "application/x-font-opentype",
];

export interface UploadFontResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

/**
 * Validate a font file before uploading it
 */
export function validateFontFile(file: File): {
  valid: boolean;
  error?: string;
} {
  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `File type not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(
        ", "
      )}`,
    };
  }

  // Validate file extension
  const fileExt = file.name.split(".").pop()?.toLowerCase();
  const allowedExtensions = ["ttf", "woff", "woff2", "otf"];
  if (!fileExt || !allowedExtensions.includes(fileExt)) {
    return {
      valid: false,
      error: `File extension not allowed. Allowed extensions: ${allowedExtensions.join(
        ", "
      )}`,
    };
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }

  return { valid: true };
}

/**
 * Upload a font file to Supabase Storage
 */
export async function uploadFontFile(
  file: File,
  clientId: string,
  fontFamily: string
): Promise<UploadFontResult> {
  try {
    // Validate file
    const fileValidation = validateFontFile(file);
    if (!fileValidation.valid) {
      return {
        success: false,
        error: fileValidation.error,
      };
    }

    const supabase = await createClient();

    // Generate unique filename for the file
    const fileExt = file.name.split(".").pop();
    const sanitizedFontFamily = fontFamily.replace(/[^a-zA-Z0-9]/g, "_");
    const fileName = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(7)}.${fileExt}`;
    const filePath = `clients/${clientId}/fonts/${sanitizedFontFamily}/${fileName}`;

    // Convert File to ArrayBuffer to upload
    const arrayBuffer = await file.arrayBuffer();
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error("Error uploading font file:", error);
      return {
        success: false,
        error: error.message || "Error uploading font file",
      };
    }

    // Get public URL
    const publicUrl = getPublicUrl(filePath);

    return {
      success: true,
      url: publicUrl,
      path: filePath,
    };
  } catch (error) {
    console.error("Error in uploadFontFile:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Delete a font file from Supabase Storage
 */
export async function deleteFontFile(
  storagePath: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([storagePath]);

    if (error) {
      console.error("Error deleting font file:", error);
      return {
        success: false,
        error: error.message || "Error deleting font file",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Error in deleteFontFile:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get the public URL of a font file
 */
export function getPublicUrl(storagePath: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL_ADMIN_V2;
  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL_ADMIN_V2 is not set");
  }
  return `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${storagePath}`;
}
