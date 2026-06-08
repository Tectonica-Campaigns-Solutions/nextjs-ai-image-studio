import { z } from "zod";

const optionalText = z
  .string()
  .optional()
  .nullable()
  .transform((s) => (s?.trim() ? s.trim() : null));

export const createFundraisingSchema = z.object({
  // Organization variables
  org_name: optionalText,
  donation_page_url: optionalText,
  approval_required: z.boolean().optional().default(false),
  approval_turnaround: optionalText,
  // User context variables
  user_role_description: optionalText,
  // Campaign variables
  crm_access: z.boolean().optional().default(false),
  crm_tool_note: optionalText,
  // Operations
  cash_handling_process: optionalText,
  // Messaging
  org_messaging_notes: optionalText,
  // Audience knowledge
  audience_knowledge_members: optionalText,
  audience_knowledge_supporters: optionalText,
  audience_knowledge_public: optionalText,
  consent_forms_url: optionalText,
  // Leader profile
  leader_experience_default: optionalText,
  // Story settings
  story_source_rules: optionalText,
  story_flag_in_brief: z.boolean().optional().nullable(),
  // Strategic foundation
  strategic_goal: optionalText,
  impact_statement: optionalText,
  relational_goal: optionalText,
  // Voice & tone
  community_terms: optionalText,
  tone_descriptors: optionalText,
  // Legal & compliance
  legal_structure: optionalText,
  legal_jurisdiction: optionalText,
  // Platform & infrastructure
  p2p_page_support: z.boolean().optional().nullable(),
  email_capture_automatic: z.boolean().optional().nullable(),
  primary_outreach_channels: optionalText,
  social_platform_registrations: optionalText,
  active_matching_gift: z.boolean().optional().nullable(),
  active_matching_gift_details: optionalText,
  // JSONB
  tactic_settings: z.unknown().optional().nullable(),
  story_requirement_by_tier: z.unknown().optional().nullable(),
  absolute_guardrails: z.unknown().optional().nullable(),
});

export const updateFundraisingSchema = z.object({
  org_name: optionalText,
  donation_page_url: optionalText,
  approval_required: z.boolean().optional(),
  approval_turnaround: optionalText,
  user_role_description: optionalText,
  crm_access: z.boolean().optional(),
  crm_tool_note: optionalText,
  cash_handling_process: optionalText,
  org_messaging_notes: optionalText,
  audience_knowledge_members: optionalText,
  audience_knowledge_supporters: optionalText,
  audience_knowledge_public: optionalText,
  consent_forms_url: optionalText,
  // Leader profile
  leader_experience_default: optionalText,
  // Story settings
  story_source_rules: optionalText,
  story_flag_in_brief: z.boolean().optional().nullable(),
  // Strategic foundation
  strategic_goal: optionalText,
  impact_statement: optionalText,
  relational_goal: optionalText,
  // Voice & tone
  community_terms: optionalText,
  tone_descriptors: optionalText,
  // Legal & compliance
  legal_structure: optionalText,
  legal_jurisdiction: optionalText,
  // Platform & infrastructure
  p2p_page_support: z.boolean().optional().nullable(),
  email_capture_automatic: z.boolean().optional().nullable(),
  primary_outreach_channels: optionalText,
  social_platform_registrations: optionalText,
  active_matching_gift: z.boolean().optional().nullable(),
  active_matching_gift_details: optionalText,
  // JSONB
  tactic_settings: z.unknown().optional().nullable(),
  story_requirement_by_tier: z.unknown().optional().nullable(),
  absolute_guardrails: z.unknown().optional().nullable(),
});

export type CreateFundraisingInput = z.infer<typeof createFundraisingSchema>;
export type UpdateFundraisingInput = z.infer<typeof updateFundraisingSchema>;
