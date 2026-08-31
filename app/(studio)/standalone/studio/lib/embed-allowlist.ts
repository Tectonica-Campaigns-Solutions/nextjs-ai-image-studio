export const ALLOWED_EMBED_ORIGINS = [
  "https://tectonica.thechange.ai",
  "https://tectonica-ai-v2-production.up.railway.app",
  "https://tectonica.up.railway.app",
  "https://web-staging-tectonica.up.railway.app",
  "https://allout.tectonica.ai",
  "https://handinhand.tectonica.ai",
  "https://demo.tectonica.ai",
  "https://staging.tectonica.ai",
  "http://localhost:3001",
  "http://localhost:3000",
] as const;

export function isAllowedEmbedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  return (ALLOWED_EMBED_ORIGINS as readonly string[]).includes(origin);
}

function originFromUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

/** Parent origin from iframe query params (ChangeAgent / Open WebUI). */
export function getHintedParentOrigin(): string | null {
  if (typeof window === "undefined") return null;
  const sp = new URLSearchParams(window.location.search);
  return originFromUrl(
    sp.get("parentOrigin") || sp.get("owui_base_url") || sp.get("host"),
  );
}

function getAncestorOrigins(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const ao = (
      window.location as unknown as { ancestorOrigins?: ArrayLike<string> }
    ).ancestorOrigins;
    if (!ao) return [];
    return Array.from(ao).filter((o) => o && o !== "null");
  } catch {
    return [];
  }
}

/** Immediate parent origin via referrer or ancestorOrigins. */
export function getDetectedParentOrigin(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const fromReferrer = originFromUrl(document.referrer);
    if (fromReferrer) return fromReferrer;
  } catch {
    // ignore
  }
  const ancestors = getAncestorOrigins();
  return ancestors[ancestors.length - 1] ?? null;
}

/** Top-most embedder origin (ChangeAgent), when ancestorOrigins is available. */
export function getDetectedTopOrigin(): string | null {
  return getAncestorOrigins()[0] ?? null;
}

/**
 * Origin to use as postMessage targetOrigin.
 * Prefers the real host over a stale `owui_base_url` (production URL while
 * embedded on staging would otherwise drop the message silently).
 */
export function getHostPostMessageOrigin(): string {
  const top = getDetectedTopOrigin();
  const parent = getDetectedParentOrigin();
  const hinted = getHintedParentOrigin();

  if (top && isAllowedEmbedOrigin(top)) return top;
  if (parent && isAllowedEmbedOrigin(parent)) return parent;
  if (hinted && isAllowedEmbedOrigin(hinted)) return hinted;
  return parent ?? top ?? hinted ?? "*";
}

export function isTrustedMessageOrigin(origin: string): boolean {
  if (isAllowedEmbedOrigin(origin)) return true;
  const hinted = getHintedParentOrigin();
  if (hinted && hinted === origin) return true;
  const top = getDetectedTopOrigin();
  if (top && top === origin) return true;
  const parent = getDetectedParentOrigin();
  return !!parent && parent === origin;
}
