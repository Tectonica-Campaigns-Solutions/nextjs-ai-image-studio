import type { ZodError } from "zod";

/**
 * Extracts the first field-level error message from a ZodError.
 * Falls back to the provided fallback string (default: "Validation failed").
 */
export function firstZodError(
  error: ZodError,
  fallback = "Validation failed"
): string {
  return Object.values(error.flatten().fieldErrors)[0]?.[0] ?? fallback;
}
