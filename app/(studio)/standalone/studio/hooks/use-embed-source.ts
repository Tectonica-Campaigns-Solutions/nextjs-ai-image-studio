"use client";

import { useEffect, useState } from "react";

type EmbedSource = {
  url: string | null;
  origin: string | null;
  isIframe: boolean | null;
  method: "referrer" | null;
};

/**
 * Detects if the editor is running inside an iframe and, when possible,
 * derives the parent page URL from document.referrer.
 *
 * Limitations:
 * - document.referrer may be empty or stripped by the embedding site's
 *   Referrer-Policy or by browser privacy protections.
 * - There is no safe, standards-compliant way to read window.parent.location
 *   from within a cross-origin iframe, so this hook intentionally does not
 *   attempt that and relies only on referrer.
 */
export function useEmbedSource(): EmbedSource {
  const [state, setState] = useState<EmbedSource>({
    url: null,
    origin: null,
    isIframe: null,
    method: null,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    let isIframe: boolean;
    try {
      // Accessing window.top can throw in some embedded/sandboxed contexts.
      isIframe = window.self !== window.top;
    } catch {
      isIframe = true;
    }

    let next: EmbedSource = {
      url: null,
      origin: null,
      isIframe,
      method: null,
    };

    const ref = typeof document !== "undefined" ? document.referrer : "";

    if (ref) {
      try {
        const url = new URL(ref);
        next = {
          url: url.toString(),
          origin: url.origin,
          isIframe,
          method: "referrer",
        };
      } catch {
        // Ignore malformed referrer values that cannot be parsed as URL.
      }
    }

    setState(next);

    // For now, only log the detected parent URL for debugging/analysis.
    if (next.url) {
      console.log("[useEmbedSource] embed referrer URL:", next);
    } else {
      console.log("[useEmbedSource] no referrer available: ", next);
    }
  }, []);

  return state;
}
