export const ALLOWED_EMBED_ORIGINS = [
  "https://tectonica.thechange.ai",
  "https://tectonica-ai-v2-production.up.railway.app",
  "https://tectonica.up.railway.app",
  "https://allout.tectonica.ai",
  "https://handinhand.tectonica.ai",
  "http://localhost:3001",
  "http://localhost:3000",
] as const;

export function isAllowedEmbedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  return (ALLOWED_EMBED_ORIGINS as readonly string[]).includes(origin);
}
