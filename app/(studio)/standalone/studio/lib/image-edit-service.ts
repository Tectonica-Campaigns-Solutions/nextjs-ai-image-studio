const EDIT_IMAGE_API_URL = "/api/studio/edit-with-ia";

export interface EditImageClientInfo {
  client_id?: string;
  user_email?: string;
  user_id?: string;
}

export interface EditImageOptions {
  prompt: string;
  imageUrls?: string[];
  base64Images?: string[];
  orgType?: string;
  clientInfo?: EditImageClientInfo;
}

export interface EditImageResultImage {
  url: string;
  width?: number;
  height?: number;
}

export interface EditImageSuccess {
  success: true;
  images: EditImageResultImage[];
}

export interface EditImageError {
  success: false;
  error?: string;
  details?: string;
}

export type EditImageResponse = EditImageSuccess | EditImageError;

export async function editImage(
  options: EditImageOptions,
): Promise<EditImageResponse> {
  const { prompt, imageUrls, base64Images, orgType, clientInfo = {} } = options;

  const body = {
    prompt: prompt.trim(),
    disclaimer: false,
    orgType,
    clientInfo: {
      client_id: clientInfo.user_id ?? "",
      user_email: clientInfo.user_email ?? "",
      user_id: clientInfo.user_id ?? "",
    },
    ...(imageUrls?.length ? { imageUrls } : {}),
    ...(base64Images?.length ? { base64Images } : {}),
  };

  const res = await fetch(EDIT_IMAGE_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    return {
      success: false,
      error: data.error ?? "Request failed",
      details: data.details,
    };
  }

  if (data.error) {
    return {
      success: false,
      error: data.error,
      details: data.details,
    };
  }

  if (!data.images || !Array.isArray(data.images) || data.images.length === 0) {
    return {
      success: false,
      error: "No images returned",
      details: data.details,
    };
  }

  return {
    success: true,
    images: data.images.map(
      (img: { url: string; width?: number; height?: number }) => ({
        url: img.url,
        width: img.width,
        height: img.height,
      }),
    ),
  };
}
