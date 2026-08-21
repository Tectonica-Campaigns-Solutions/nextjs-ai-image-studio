"use client";

import { useCallback, useEffect, useState } from "react";
import {
  STUDIO_IFRAME_MESSAGE,
  type StudioGroupQrPayload,
} from "../constants/editor-constants";
import { isAllowedEmbedOrigin } from "../lib/embed-allowlist";

export type GroupQrFromHost = {
  groupPageUrl: string | null;
  label: string | null;
  qrImageUrl: string | null;
};

function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizePayload(raw: StudioGroupQrPayload): GroupQrFromHost | null {
  const groupPageUrl =
    typeof raw.groupPageUrl === "string" && raw.groupPageUrl.trim()
      ? raw.groupPageUrl.trim()
      : null;
  const qrImageUrl =
    typeof raw.qrImageUrl === "string" && raw.qrImageUrl.trim()
      ? raw.qrImageUrl.trim()
      : null;
  const label =
    typeof raw.label === "string" && raw.label.trim() ? raw.label.trim() : null;

  if (groupPageUrl && !isHttpUrl(groupPageUrl)) return null;
  if (qrImageUrl && !isHttpUrl(qrImageUrl)) return null;
  if (!groupPageUrl && !qrImageUrl) {
    // Explicit clear from host
    if (raw.groupPageUrl === null || raw.qrImageUrl === null) {
      return { groupPageUrl: null, label: null, qrImageUrl: null };
    }
    return null;
  }

  return { groupPageUrl, label, qrImageUrl };
}

function getHintedParentOrigin(): string | null {
  if (typeof window === "undefined") return null;
  const sp = new URLSearchParams(window.location.search);
  const hinted =
    sp.get("parentOrigin") || sp.get("owui_base_url") || sp.get("host");
  if (!hinted) return null;
  try {
    return new URL(hinted).origin;
  } catch {
    return null;
  }
}

function isTrustedMessageOrigin(origin: string): boolean {
  if (isAllowedEmbedOrigin(origin)) return true;
  const hinted = getHintedParentOrigin();
  return !!hinted && hinted === origin;
}

function readGroupPageUrlFromQuery(): string | null {
  if (typeof window === "undefined") return null;
  const sp = new URLSearchParams(window.location.search);
  const raw = sp.get("group_page_url") || sp.get("groupPageUrl");
  if (!raw?.trim()) return null;
  const url = raw.trim();
  return isHttpUrl(url) ? url : null;
}

function isEmbedded(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

/**
 * Receives the user's published group / recruitment page QR from the embedding
 * host (ChangeAgent) via postMessage, with an optional query-param fallback for
 * standalone testing (`group_page_url` / `groupPageUrl`).
 */
export function useGroupQrFromHost(): GroupQrFromHost & {
  hasGroupQr: boolean;
  clearGroupQr: () => void;
} {
  const [state, setState] = useState<GroupQrFromHost>(() => {
    const fromQuery = readGroupPageUrlFromQuery();
    return {
      groupPageUrl: fromQuery,
      label: null,
      qrImageUrl: null,
    };
  });

  const applyPayload = useCallback((raw: StudioGroupQrPayload) => {
    const next = normalizePayload(raw);
    if (!next) return;
    setState(next);
  }, []);

  const clearGroupQr = useCallback(() => {
    setState({ groupPageUrl: null, label: null, qrImageUrl: null });
  }, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!isTrustedMessageOrigin(event.origin)) return;
      const data = event.data;
      if (!data || typeof data !== "object") return;

      const msg = data as {
        type?: unknown;
        requestId?: unknown;
      } & StudioGroupQrPayload;

      if (
        msg.type !== STUDIO_IFRAME_MESSAGE.SET_GROUP_QR_TYPE &&
        msg.type !== STUDIO_IFRAME_MESSAGE.GROUP_QR_RESPONSE_TYPE
      ) {
        return;
      }

      applyPayload(msg);
    };

    window.addEventListener("message", onMessage);

    // Handshake: ask host if push was missed (iframe race).
    if (isEmbedded()) {
      const requestId =
        crypto?.randomUUID?.() ??
        `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const requestMsg = {
        type: STUDIO_IFRAME_MESSAGE.GROUP_QR_REQUEST_TYPE,
        requestId,
      };
      try {
        window.parent?.postMessage(requestMsg, "*");
      } catch {
        // ignore
      }
      try {
        if (window.top && window.top !== window.parent) {
          window.top.postMessage(requestMsg, "*");
        }
      } catch {
        // ignore
      }
    }

    return () => window.removeEventListener("message", onMessage);
  }, [applyPayload]);

  return {
    ...state,
    hasGroupQr: !!(state.groupPageUrl || state.qrImageUrl),
    clearGroupQr,
  };
}
