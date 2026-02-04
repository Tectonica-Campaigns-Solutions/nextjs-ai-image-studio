import { z } from "zod";

export const createClientSchema = z.object({
  ca_user_id: z
    .string()
    .min(1, "ca_user_id is required")
    .transform((s) => s.trim()),
  name: z
    .string()
    .min(1, "name is required")
    .transform((s) => s.trim()),
  email: z
    .string()
    .min(1, "email is required")
    .email("email must be a valid email address")
    .transform((s) => s.trim()),
  slug: z
    .string()
    .optional()
    .transform((s) => (s?.trim() ? s.trim() : undefined)),
  description: z
    .string()
    .optional()
    .nullable()
    .transform((s) => (s?.trim() ? s.trim() : null)),
  is_active: z.boolean().optional().default(true),
  metadata: z.record(z.unknown()).optional().nullable(),
});

export const updateClientSchema = z.object({
  name: z
    .string()
    .min(1, "name must be a non-empty string")
    .transform((s) => s.trim())
    .optional(),
  email: z
    .string()
    .min(1, "email must be a non-empty string")
    .email("email must be a valid email address")
    .transform((s) => s.trim())
    .optional(),
  slug: z
    .string()
    .optional()
    .nullable()
    .transform((s) => (s?.trim() ? s.trim() : null)),
  description: z
    .string()
    .optional()
    .nullable()
    .transform((s) => (s?.trim() ? s.trim() : null)),
  is_active: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional().nullable(),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
