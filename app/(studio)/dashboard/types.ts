/**
 * Shared types for admin area. Use these in pages, components, actions, and API.
 */

export interface Client {
  id: string;
  ca_user_id: string;
  name: string;
  email: string;
  slug: string | null;
  description: string | null;
  is_active: boolean;
  metadata: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
}

export interface ClientAsset {
  id: string;
  client_id: string;
  name: string;
  display_name: string | null;
  file_url: string;
  asset_type: string;
  is_primary: boolean;
  sort_order: number;
  width: number | null;
  height: number | null;
  mime_type: string;
  created_at: string;
  variant: string | null;
}

export interface ClientFont {
  id: string;
  client_id: string;
  font_source: "google" | "custom";
  font_family: string;
  font_weights: string[];
  font_category: string | null;
  file_url: string | null;
  is_primary: boolean;
  sort_order: number;
  created_at: string;
}

export interface CanvasSessionSummary {
  id: string;
  client_id: string;
  ca_user_id: string;
  name: string | null;
  thumbnail_url: string | null;
  background_url: string;
  created_at: string;
  updated_at: string;
}

export interface Admin {
  id: string;
  user_id: string;
  email: string;
  role: string;
  granted_by: string | null;
  granted_by_email: string | null;
  granted_at: string;
  expires_at: string | null;
  is_active: boolean;
}
