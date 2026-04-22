"use client";

import { useEffect, useState } from "react";

type EmbedSource = {
  url: string | null;
  origin: string | null;
  isIframe: boolean | null;
  method: "referrer" | "ancestorOrigins" | null;
};

type DebugSnapshot = Record<string, unknown>;

function safe<T>(fn: () => T): T | null {
  try {
    return fn();
  } catch {
    return null;
  }
}

function getBestAncestorOrigin(): string | null {
  if (typeof window === "undefined") return null;

  const origins = safe(() => {
    const ao = (window.location as unknown as { ancestorOrigins?: string[] })
      .ancestorOrigins;
    if (!ao) return null;
    return Array.from(ao);
  });
  if (!origins || origins.length === 0) return null;

  // Chrome can include "null" (e.g. about:blank/opaque origins) as a string entry.
  // We take the most-specific (last) non-null origin.
  for (let i = origins.length - 1; i >= 0; i -= 1) {
    const o = origins[i];
    if (!o || o === "null") continue;
    return o;
  }

  return null;
}

function buildEmbedDebugSnapshot(isIframe: boolean): DebugSnapshot {
  if (typeof window === "undefined" || typeof document === "undefined")
    return {};

  const frameEl = safe(() => window.frameElement) as
    | (HTMLElement & {
        sandbox?: string;
        allow?: string;
        referrerPolicy?: string;
      })
    | null;

  const navEntry = safe(
    () =>
      performance.getEntriesByType("navigation")[0] as
        | PerformanceNavigationTiming
        | undefined,
  );

  const ancestorOrigins = safe(() => {
    const ao = (window.location as unknown as { ancestorOrigins?: string[] })
      .ancestorOrigins;
    if (!ao) return null;
    return Array.from(ao);
  });

  const topAccess = {
    selfEqTop: safe(() => window.self === window.top),
    topIsNull: safe(() => window.top == null),
    // Do NOT try to read top.location.href (cross-origin). We only record if access throws.
    canAccessTopLocation: safe(() => {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      window.top?.location;
      return true;
    }),
  };

  const parentAccess = {
    parentIsNull: safe(() => window.parent == null),
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    canAccessParentLocation: safe(() => {
      window.parent?.location;
      return true;
    }),
  };

  return {
    ts: new Date().toISOString(),
    userAgent: safe(() => navigator.userAgent),
    isIframe,
    document: {
      referrer: safe(() => document.referrer),
      referrerPolicy: safe(
        () =>
          (document as unknown as { referrerPolicy?: string }).referrerPolicy,
      ),
      visibilityState: safe(() => document.visibilityState),
    },
    location: {
      href: safe(() => window.location.href),
      origin: safe(() => window.location.origin),
      pathname: safe(() => window.location.pathname),
      search: safe(() => window.location.search),
      hash: safe(() => window.location.hash),
    },
    windowRelationships: {
      top: topAccess,
      parent: parentAccess,
      openerIsNull: safe(() => window.opener == null),
      ancestorOrigins,
    },
    frameElement: frameEl
      ? {
          tagName: safe(() => frameEl.tagName),
          id: safe(() => frameEl.id),
          className: safe(() => frameEl.className),
          sandbox: safe(() =>
            (frameEl as unknown as HTMLIFrameElement).sandbox?.toString?.(),
          ),
          allow: safe(() => (frameEl as unknown as HTMLIFrameElement).allow),
          referrerPolicy: safe(
            () => (frameEl as unknown as HTMLIFrameElement).referrerPolicy,
          ),
        }
      : null,
    navigation: navEntry
      ? {
          type: navEntry.type,
          redirectCount: navEntry.redirectCount,
          // These can help spot server-side redirects and cross-origin navigations.
          nextHopProtocol: navEntry.nextHopProtocol,
          transferSize: navEntry.transferSize,
        }
      : null,
  };
}

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

    // If referrer is stripped, fall back to ancestorOrigins when available.
    if (!next.origin) {
      const ao = getBestAncestorOrigin();
      if (ao) {
        next = {
          url: null,
          origin: ao,
          isIframe,
          method: "ancestorOrigins",
        };
      }
    }

    setState(next);

    console.log("[useEmbedSource] detected:", next);
    const snapshot = buildEmbedDebugSnapshot(isIframe);
    console.log("[useEmbedSource] snapshot:", snapshot);

    // If not embedded, avoid spamming postMessage traffic.
    if (!isIframe) return;

    // Optional handshake: allows the embedding page to reply with extra info.
    // The parent can listen for this message and respond with the same requestId:
    // { type: "studio:embed:debug:response", requestId, payload: { ... } }
    const requestId =
      crypto?.randomUUID?.() ??
      `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const requestMsg = {
      type: "studio:embed:debug:request",
      requestId,
      href: safe(() => window.location.href),
      // Include the best-known parent URL (may be null if referrer stripped).
      embedSource: next,
    };

    const onMessage = (event: MessageEvent) => {
      const data = event.data as unknown;
      if (!data || typeof data !== "object") return;
      const maybe = data as { type?: unknown; requestId?: unknown };
      if (maybe.type !== "studio:embed:debug:response") return;
      if (maybe.requestId !== requestId) return;

      console.log("[useEmbedSource] debug response from parent:", {
        eventOrigin: event.origin,
        eventSourceIsNull: event.source == null,
        data,
      });
    };

    window.addEventListener("message", onMessage);
    console.log(
      "[useEmbedSource] sending embed debug request to parent/top:",
      requestMsg,
    );
    safe(() => window.parent?.postMessage(requestMsg, "*"));
    safe(() => window.top?.postMessage(requestMsg, "*"));

    return () => {
      window.removeEventListener("message", onMessage);
    };
  }, []);

  return state;
}
