import { z } from "zod";

export const createPlanSchema = z.object({
  code: z
    .string()
    .min(1, "code is required")
    .transform((s) => s.trim().toLowerCase())
    .refine((s) => /^[a-z0-9_]+$/.test(s), {
      message: "code must be lowercase letters, numbers, or underscores",
    }),
  name: z
    .string()
    .min(1, "name is required")
    .transform((s) => s.trim()),
  images_limit: z.coerce
    .number()
    .int("images_limit must be an integer")
    .min(0, "images_limit must be >= 0"),
});

export const updatePlanSchema = createPlanSchema.partial();

export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
