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
});

export const updateFundraisingSchema = z.object({
  org_name: optionalText,
  donation_page_url: optionalText,
  approval_required: z.boolean().optional(),
  approval_turnaround: optionalText,
  user_role_description: optionalText,
  crm_access: z.boolean().optional(),
  crm_tool_note: optionalText,
});

export type CreateFundraisingInput = z.infer<typeof createFundraisingSchema>;
export type UpdateFundraisingInput = z.infer<typeof updateFundraisingSchema>;
