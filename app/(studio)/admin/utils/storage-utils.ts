import { createClient } from "@/lib/supabase/server";

const BUCKET_NAME = "client-assets";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/svg+xml",
  "image/webp",
];

const MAX_IMAGE_DIMENSIONS = {
  width: 5000,
  height: 5000,
};

export interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
  width?: number;
  height?: number;
}

/**
 * Validate a file before uploading it
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `File type not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(
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
 * Get the dimensions of an image (only works in browser)
 * This function is only used in the client, not in server-side
 */
export function getImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("getImageDimensions only works in browser")
    );
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not load image"));
    };

    img.src = url;
  });
}

/**
 * Validate the dimensions of an image (only works in browser)
 * This function is only used in the client, not in server-side
 */
export async function validateImageDimensions(file: File): Promise<{
  valid: boolean;
  error?: string;
  width?: number;
  height?: number;
}> {
  if (!file.type.startsWith("image/")) {
    return { valid: true }; // Not an image, no validate dimensions
  }

  try {
    const { width, height } = await getImageDimensions(file);

    if (
      width > MAX_IMAGE_DIMENSIONS.width ||
      height > MAX_IMAGE_DIMENSIONS.height
    ) {
      return {
        valid: false,
        error: `Dimensions too large. Maximum: ${MAX_IMAGE_DIMENSIONS.width}x${MAX_IMAGE_DIMENSIONS.height}px`,
        width,
        height,
      };
    }

    return { valid: true, width, height };
  } catch (error) {
    return {
      valid: false,
      error: "Could not get image dimensions",
    };
  }
}

/**
 * Upload a file to Supabase Storage
 */
export async function uploadAsset(
  file: File,
  clientId: string,
  assetType: string = "logo"
): Promise<UploadResult> {
  try {
    // Validate file
    const fileValidation = validateFile(file);
    if (!fileValidation.valid) {
      return {
        success: false,
        error: fileValidation.error,
      };
    }

    // Note: The dimension validation is done in the client before calling this function
    // This function is only used in server-side (API routes)

    const supabase = await createClient();

    // Generate unique filename for the file
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(7)}.${fileExt}`;
    const filePath = `clients/${clientId}/${assetType}s/${fileName}`;

    // Convert File to ArrayBuffer to upload
    const arrayBuffer = await file.arrayBuffer();
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error("Error uploading file:", error);
      return {
        success: false,
        error: error.message || "Error uploading file",
      };
    }

    // Get public URL
    const publicUrl = getPublicUrl(filePath);

    return {
      success: true,
      url: publicUrl,
      path: filePath,
      // width and height will be obtained later if needed
    };
  } catch (error) {
    console.error("Error in uploadAsset:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteAsset(
  storagePath: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([storagePath]);

    if (error) {
      console.error("Error deleting file:", error);
      return {
        success: false,
        error: error.message || "Error deleting file",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Error in deleteAsset:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get the public URL of a file
 * No authentication required, build the URL directly
 */
export function getPublicUrl(storagePath: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  }
  return `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${storagePath}`;
}

/**
 * Get a signed URL (temporary) for a private file
 */
export async function getSignedUrl(
  storagePath: string,
  expiresIn: number = 3600
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(storagePath, expiresIn);

    if (error) {
      return {
        success: false,
        error: error.message || "Error generating signed URL",
      };
    }

    return {
      success: true,
      url: data.signedUrl,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
