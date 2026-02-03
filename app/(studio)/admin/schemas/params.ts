import { z } from "zod";

/** Use in API routes to validate [id] and [assetId]/[fontId] params */
const uuidSchema = z.string().uuid("Invalid ID format");

export const clientIdParamSchema = z.object({ id: uuidSchema });
export const assetIdParamSchema = z.object({
  id: uuidSchema,
  assetId: uuidSchema,
});
export const fontIdParamSchema = z.object({
  id: uuidSchema,
  fontId: uuidSchema,
});

export function isValidUUID(value: string): boolean {
  return uuidSchema.safeParse(value).success;
}
