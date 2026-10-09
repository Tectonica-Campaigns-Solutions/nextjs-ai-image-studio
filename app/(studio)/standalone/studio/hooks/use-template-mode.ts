"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Canvas } from "fabric";
import {
  BRAND_DEFAULT_BACKGROUND,
  getBrandFormat,
  pickDefaultFormat,
  type BrandFormatPreset,
} from "@/lib/brand-templates/formats";
import type {
  BrandFormatKey,
  BrandTemplateVariant,
  BrandTemplateWithFormats,
} from "@/lib/brand-templates/types";
import {
  createBackgroundObject,
  fitBackgroundToCanvas,
  type BlankCanvasSource,
} from "../lib/canvas-background";
import { layoutToDisplayOverlayJSON } from "../lib/template-layout";
import { studioToast } from "../utils/studio-toast";

interface TemplateSelection {
  template: BrandTemplateWithFormats;
  formatKey: BrandFormatKey;
  /** Variant the canvas was built with; later switches only swap object 0. */
  initialVariantId: string | null;
}

function blankSourceFor(
  template: BrandTemplateWithFormats,
  format: BrandFormatPreset,
  variant: BrandTemplateVariant | null,
): BlankCanvasSource {
  const fallbackColor =
    template.variants.find((v) => v.kind === "color")?.value ?? BRAND_DEFAULT_BACKGROUND;
  return {
    kind: "blank",
    width: format.width,
    height: format.height,
    backgroundColor: variant?.kind === "color" ? variant.value : fallbackColor,
    backgroundImageUrl: variant?.kind === "image" ? variant.value : null,
  };
}

/**
 * Branding template mode, part 1 (before the canvas exists): which template,
 * format and background variant are selected, and the canvas source for them.
 */
export function useTemplateSelection(templates: BrandTemplateWithFormats[] | null) {
  const [selection, setSelection] = useState<TemplateSelection | null>(null);
  const [variantId, setVariantId] = useState<string | null>(null);
  /** Set by useTemplateCanvas so a switch never loads onto the outgoing canvas. */
  const outgoingCanvasRef = useRef<Canvas | null>(null);
  const latestCanvasRef = useRef<Canvas | null>(null);

  const format = selection ? getBrandFormat(selection.formatKey) : null;
  const variant =
    selection?.template.variants.find((v) => v.id === variantId) ??
    selection?.template.variants[0] ??
    null;

  // Rebuild the canvas only when the template or format changes.
  const canvasSource = useMemo<BlankCanvasSource | null>(() => {
    if (!selection) return null;
    const initial =
      selection.template.variants.find((v) => v.id === selection.initialVariantId) ?? null;
    return blankSourceFor(selection.template, getBrandFormat(selection.formatKey), initial);
  }, [selection]);

  /** What undo/redo should rebuild as the background (the current variant). */
  const currentBackground = useMemo<BlankCanvasSource | null>(
    () => (selection && format ? blankSourceFor(selection.template, format, variant) : null),
    [selection, format, variant],
  );

  const selectTemplate = useCallback((template: BrandTemplateWithFormats) => {
    const formatKey = pickDefaultFormat(template.formats);
    if (!formatKey) return;
    const firstVariant = template.variants[0]?.id ?? null;
    outgoingCanvasRef.current = latestCanvasRef.current;
    setVariantId(firstVariant);
    setSelection({ template, formatKey, initialVariantId: firstVariant });
  }, []);

  return {
    isTemplateMode: templates != null,
    templates: templates ?? [],
    selection,
    format,
    variant,
    setVariantId,
    canvasSource,
    currentBackground,
    selectTemplate,
    outgoingCanvasRef,
    latestCanvasRef,
  };
}

export type TemplateSelectionState = ReturnType<typeof useTemplateSelection>;

/**
 * Branding template mode, part 2 (after the canvas exists): loads the selected
 * layout onto each newly built canvas and swaps background variants.
 */
export function useTemplateCanvas({
  state,
  canvas,
  loadOverlaysFromJSON,
  saveState,
}: {
  state: TemplateSelectionState;
  canvas: Canvas | null;
  loadOverlaysFromJSON: (canvas: Canvas, overlayJSON: string) => Promise<void>;
  saveState: (immediate?: boolean, force?: boolean) => void;
}) {
  const { selection, format, variant, setVariantId, outgoingCanvasRef, latestCanvasRef } = state;
  const [isApplyingVariant, setIsApplyingVariant] = useState(false);
  latestCanvasRef.current = canvas;

  // A new canvas instance only appears once its background is on it, so this
  // is the moment to add the selected layout on top.
  useEffect(() => {
    if (!selection || !canvas || outgoingCanvasRef.current === canvas) return;
    outgoingCanvasRef.current = canvas;
    const layout = selection.template.formats.find((f) => f.format_key === selection.formatKey)
      ?.fabric_json;
    if (!layout?.objects.length) return;

    void (async () => {
      try {
        await loadOverlaysFromJSON(
          canvas,
          layoutToDisplayOverlayJSON(layout, canvas, getBrandFormat(selection.formatKey).width),
        );
        canvas.renderAll();
        saveState(true);
      } catch (err) {
        console.error("[template-mode] failed to load layout:", err);
        studioToast.error({ title: "Could not load this template" });
      }
    })();
  }, [selection, canvas, loadOverlaysFromJSON, saveState, outgoingCanvasRef]);

  const applyVariant = useCallback(
    async (next: BrandTemplateVariant) => {
      if (!canvas || !selection || !format || next.id === variant?.id) return;
      setIsApplyingVariant(true);
      try {
        const { object } = await createBackgroundObject(
          blankSourceFor(selection.template, format, next),
        );
        fitBackgroundToCanvas(object, canvas.width, canvas.height);
        const current = canvas.getObjects()[0];
        if (current && (current as { isBackground?: boolean }).isBackground) canvas.remove(current);
        canvas.insertAt(0, object);
        canvas.backgroundColor = blankSourceFor(selection.template, format, next).backgroundColor;
        canvas.requestRenderAll();
        setVariantId(next.id);
      } finally {
        setIsApplyingVariant(false);
      }
    },
    [canvas, selection, format, variant?.id, setVariantId],
  );

  return { applyVariant, isApplyingVariant };
}
