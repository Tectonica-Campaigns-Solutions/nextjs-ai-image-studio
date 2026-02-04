import { z } from "zod";

export const setupPasswordSchema = z.object({
  password: z
    .string()
    .min(1, "password is required")
    .min(8, "password must be at least 8 characters")
    .transform((s) => s.trim()),
});

export type SetupPasswordInput = z.infer<typeof setupPasswordSchema>;
