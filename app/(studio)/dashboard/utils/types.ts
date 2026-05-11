/**
 * Shared types for admin area. Use these in pages, components, actions, and API.
 */

/** CSS numeric font weight values supported by the studio. */
export type FontWeight =
  | "100"
  | "200"
  | "300"
  | "400"
  | "500"
  | "600"
  | "700"
  | "800"
  | "900";

export interface Client {
  id: string;
  ca_user_id: string;
  name: string;
  email: string;
  slug: string | null;
  description: string | null;
  plan_id?: string | null;
  plan?: Plan | null;
  is_active: boolean;
  allow_custom_logo: boolean;
  metadata: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
}

export interface Plan {
  id: string;
  code: string;
  name: string;
  images_limit: number;
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
  font_weights: FontWeight[];
  font_category: string | null;
  file_url: string | null;
  is_primary: boolean;
  is_brand: boolean;
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

export interface ClientFundraisingData {
  id: string;
  client_id: string;
  ca_user_id: string;
  // Organization variables
  org_name: string | null;
  donation_page_url: string | null;
  approval_required: boolean;
  approval_turnaround: string | null;
  // User context variables
  user_role_description: string | null;
  // Campaign variables
  crm_access: boolean;
  crm_tool_note: string | null;
  // Operations
  cash_handling_process: string | null;
  // Messaging
  org_messaging_notes: string | null;
  // Audience knowledge
  audience_knowledge_members: string | null;
  audience_knowledge_supporters: string | null;
  audience_knowledge_public: string | null;
  // Consent
  consent_forms_url: string | null;
  // Audit
  created_at: string;
  updated_at: string;
}

export interface Admin {
  id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  role: string;
  granted_by: string | null;
  granted_by_email: string | null;
  granted_at: string;
  expires_at: string | null;
  is_active: boolean;
}
