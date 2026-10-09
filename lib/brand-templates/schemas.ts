import { z } from "zod";
import { BRAND_FORMAT_KEYS } from "./formats";

const hexColor = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export const brandTemplateVariantSchema = z
  .object({
    id: z.string().min(1).max(64),
    kind: z.enum(["color", "image"]),
    value: z.string().trim().min(1),
    label: z.string().trim().max(60).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.kind === "color" && !hexColor.test(v.value)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Color must be a hex value like #1D4ED8" });
    }
    if (v.kind === "image" && !/^https:\/\//.test(v.value)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Image must be an https URL" });
    }
  });

const nullableText = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .nullable()
    .transform((s) => (s?.trim() ? s.trim() : null));

export const brandTemplateInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  client_id: z.string().uuid().nullable(),
  category: nullableText(60),
  description: nullableText(500),
  variants: z.array(brandTemplateVariantSchema).max(24),
  is_active: z.boolean(),
});

export type BrandTemplateInput = z.infer<typeof brandTemplateInputSchema>;

export const brandFormatKeySchema = z.enum(BRAND_FORMAT_KEYS as [string, ...string[]]);

const slotObjectSchema = z
  .object({
    type: z.string(),
    slotId: z.string().max(64).optional(),
    slotType: z.enum(["text", "image", "logo"]).optional(),
    slotLabel: z.string().max(60).optional(),
  })
  .passthrough();

export const brandTemplateFabricJsonSchema = z.object({
  version: z.string().optional(),
  objects: z.array(slotObjectSchema).max(200),
});
