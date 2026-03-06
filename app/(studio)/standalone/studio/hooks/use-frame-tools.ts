"use client";

import { useState, useCallback, useMemo } from "react";
import { FabricImage } from "fabric";
import { loadImageWithCORS, urlToBase64 } from "../utils/image-editor-utils";
import type { FrameAsset } from "../types/image-editor-types";
import { FRAME_DEFAULTS } from "../constants/editor-constants";

export interface UseFrameToolsOptions {
  canvasRef: React.MutableRefObject<any>;
  frameAssets: FrameAsset[];
  aspectRatio: string | null;
  saveStateRef: React.MutableRefObject<(immediate?: boolean) => void>;
}

export function useFrameTools(options: UseFrameToolsOptions) {
  const { canvasRef, frameAssets, aspectRatio, saveStateRef } = options;

  const [frameOpacity, setFrameOpacity] = useState<number>(FRAME_DEFAULTS.OPACITY);

  // Filter assets to only those matching the current canvas aspect ratio
  const filteredFrameAssets = useMemo(() => {
    if (!aspectRatio) return frameAssets;
    return frameAssets.filter((asset) => {
      const v = asset.variant;
      if (!v) return false;
      if (v === "*") return true;
      const ratios = v.split(",").map((s) => s.trim()).filter(Boolean);
      return ratios.includes(aspectRatio);
    });
  }, [frameAssets, aspectRatio]);

  const removeExistingFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const existing = canvas.getObjects().find((obj: any) => obj.isFrame === true);
    if (existing) {
      canvas.remove(existing);
    }
  }, [canvasRef]);

  const insertFrame = useCallback(
    async (url: string) => {
      const canvas = canvasRef.current;
      const saveState = saveStateRef.current;
      if (!canvas) return;

      try {
        const base64Url = await urlToBase64(url);
        const frameImage = await loadImageWithCORS(base64Url);
        const canvasWidth = canvas.width as number;
        const canvasHeight = canvas.height as number;

        // Scale to ~90% of canvas so the frame doesn't fill the entire area:
        // user can then move and resize it easily (controls stay visible).
        const scaleToFit = Math.min(
          canvasWidth / frameImage.width,
          canvasHeight / frameImage.height
        );
        const scale = scaleToFit * 0.9;
        const scaleX = scale;
        const scaleY = scale;
        const scaledW = frameImage.width * scale;
        const scaledH = frameImage.height * scale;
        const left = (canvasWidth - scaledW) / 2;
        const top = (canvasHeight - scaledH) / 2;

        const img = new FabricImage(frameImage.getElement(), {
          left,
          top,
          originX: "left",
          originY: "top",
          scaleX,
          scaleY,
          opacity: frameOpacity / 100,
          selectable: true,
          evented: true,
          lockRotation: true,
          hasControls: true,
          hasBorders: true,
          lockUniScaling: true,
        });
        (img as any).isFrame = true;
        (img as any).isEditable = true;

        // Remove any existing frame before adding the new one
        removeExistingFrame();

        canvas.add(img);
        canvas.bringObjectToFront(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
        saveState(true);
      } catch (error) {
        console.error("Error inserting frame:", error);
      }
    },
    [canvasRef, saveStateRef, frameOpacity, removeExistingFrame]
  );

  const updateFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const active = canvas.getActiveObject();
    if (!active || !(active as any).isFrame) return;

    active.set({ opacity: frameOpacity / 100 });
    active.setCoords();
    canvas.renderAll();
  }, [canvasRef, frameOpacity]);

  const hasFrameAssets = useMemo(
    () => filteredFrameAssets.length > 0,
    [filteredFrameAssets]
  );

  return {
    frameOpacity,
    setFrameOpacity,
    frameAssets,
    filteredFrameAssets,
    hasFrameAssets,
    insertFrame,
    updateFrame,
    removeExistingFrame,
  };
}
