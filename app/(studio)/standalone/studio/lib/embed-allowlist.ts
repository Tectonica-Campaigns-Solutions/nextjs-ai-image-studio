export const ALLOWED_EMBED_ORIGINS = [
  "https://tectonica.thechange.ai",
  "https://tectonica-ai-v2-production.up.railway.app",
  "https://tectonica.up.railway.app",
] as const;

export function isAllowedEmbedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  return (ALLOWED_EMBED_ORIGINS as readonly string[]).includes(origin);
}
