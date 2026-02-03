import { z } from "zod";

const uuidSchema = z.string().uuid("Invalid ID format");

export const createAdminSchema = z
  .object({
    email: z
      .string()
      .min(1, "email is required")
      .email("email must be a valid email address")
      .transform((s) => s.trim()),
    expires_at: z.string().optional().nullable(),
  })
  .refine(
    (data) => {
      if (!data.expires_at || data.expires_at === "") return true;
      const d = new Date(data.expires_at);
      return !isNaN(d.getTime()) && d > new Date();
    },
    { message: "expires_at must be a valid future date", path: ["expires_at"] }
  )
  .transform((data) => ({
    ...data,
    expires_at: data.expires_at?.trim() ? data.expires_at.trim() : null,
  }));

export const updateAdminSchema = z.object({
  is_active: z.boolean().optional(),
  expires_at: z
    .string()
    .optional()
    .nullable()
    .transform((s) => (s === "" || s == null ? null : s))
    .refine(
      (val) => val === null || new Date(val) > new Date(),
      "expires_at must be in the future"
    ),
});

export const adminIdParamSchema = z.object({ id: uuidSchema });
export type CreateAdminInput = z.infer<typeof createAdminSchema>;
export type UpdateAdminInput = z.infer<typeof updateAdminSchema>;
