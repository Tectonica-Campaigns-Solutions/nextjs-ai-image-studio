"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Canvas } from "fabric";
import type { BrandFormatPreset } from "@/lib/brand-templates/formats";
import type { TemplateAuthorData } from "../types/image-editor-types";
import {
  getTemplateLayoutFromCanvas,
  getTemplateThumbnailDataUrl,
  layoutToDisplayOverlayJSON,
  remapLayoutToFormat,
} from "../lib/template-layout";
import { findDuplicateSlotIds } from "../components/TemplateSlotsPanel";
import { studioToast } from "../utils/studio-toast";

const CHANGE_EVENTS = ["object:added", "object:removed", "object:modified", "text:changed"] as const;

export interface UseTemplateAuthorOptions {
  templateAuthor: TemplateAuthorData | null;
  canvas: Canvas | null;
  /** Set once the background is on the canvas (safe to add overlays). */
  backgroundReady: boolean;
  loadOverlaysFromJSON: (canvas: Canvas, overlayJSON: string) => Promise<void>;
  saveState: (immediate?: boolean, force?: boolean) => void;
}

/**
 * Template-author mode: loads the saved layout of the format being designed,
 * offers other formats' layouts as a starting point, and saves the layout +
 * thumbnail through the dashboard API (admin session cookies).
 */
export function useTemplateAuthor({
  templateAuthor,
  canvas,
  backgroundReady,
  loadOverlaysFromJSON,
  saveState,
}: UseTemplateAuthorOptions) {
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const loadedRef = useRef(false);
  const suppressDirtyRef = useRef(false);

  const addLayout = useCallback(
    async (overlayJSON: string) => {
      if (!canvas) return;
      suppressDirtyRef.current = true;
      try {
        await loadOverlaysFromJSON(canvas, overlayJSON);
        canvas.renderAll();
        saveState(true);
      } finally {
        suppressDirtyRef.current = false;
      }
    },
    [canvas, loadOverlaysFromJSON, saveState],
  );

  useEffect(() => {
    if (!templateAuthor || !canvas || !backgroundReady || loadedRef.current) return;
    loadedRef.current = true;
    const { layout, format } = templateAuthor;
    if (!layout?.objects.length) return;
    void addLayout(layoutToDisplayOverlayJSON(layout, canvas, format.width)).catch((err) => {
      console.error("[template-author] failed to load layout:", err);
      studioToast.error({ title: "Could not load the saved layout" });
    });
  }, [templateAuthor, canvas, backgroundReady, addLayout]);

  // Track unsaved changes (also covers undo/redo, which re-adds objects).
  useEffect(() => {
    if (!templateAuthor || !canvas) return;
    const markDirty = () => {
      if (!suppressDirtyRef.current && loadedRef.current) setIsDirty(true);
    };
    CHANGE_EVENTS.forEach((e) => canvas.on(e, markDirty));
    return () => CHANGE_EVENTS.forEach((e) => canvas.off(e, markDirty));
  }, [templateAuthor, canvas]);

  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  const startFrom = useCallback(
    async (from: BrandFormatPreset) => {
      if (!templateAuthor || !canvas) return;
      const source = templateAuthor.otherLayouts.find((l) => l.format.key === from.key);
      if (!source) return;
      const remapped = remapLayoutToFormat(source.layout, from, templateAuthor.format);
      await addLayout(layoutToDisplayOverlayJSON(remapped, canvas, templateAuthor.format.width));
      setIsDirty(true);
    },
    [templateAuthor, canvas, addLayout],
  );

  const onSlotsChange = useCallback(() => {
    saveState(true);
    setIsDirty(true);
  }, [saveState]);

  const saveLayout = useCallback(async () => {
    if (!templateAuthor || !canvas) return;
    const duplicates = findDuplicateSlotIds(canvas);
    if (duplicates.length > 0) {
      studioToast.error({
        title: "Slot names must be unique",
        description: `Rename the duplicated slot: ${duplicates.join(", ")}`,
      });
      return;
    }

    setIsSaving(true);
    try {
      const { template, format } = templateAuthor;
      const res = await fetch(
        `/api/dashboard/brand-templates/${template.id}/formats/${format.key}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fabric_json: getTemplateLayoutFromCanvas(canvas, format.width),
            thumbnail_data_url: getTemplateThumbnailDataUrl(canvas),
          }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to save layout");
      setIsDirty(false);
      studioToast.success({ title: `${format.label} layout saved` });
    } catch (err) {
      studioToast.error({
        title: "Could not save the layout",
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsSaving(false);
    }
  }, [templateAuthor, canvas]);

  return {
    isSaving,
    isDirty,
    saveLayout,
    startFrom,
    onSlotsChange,
    startFromFormats: templateAuthor?.otherLayouts.map((l) => l.format) ?? [],
  };
}
