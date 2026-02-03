"use client";

import { useState, useCallback, useMemo } from "react";
import { FabricImage } from "fabric";
import {
  fileToBase64,
  loadImageWithCORS,
  urlToBase64,
} from "../utils/image-editor-utils";
import type { LogoAsset } from "../types/image-editor-types";

export interface UseLogoToolsOptions {
  canvasRef: React.MutableRefObject<any>;
  logoAssets: LogoAsset[];
  saveStateRef: React.MutableRefObject<(immediate?: boolean) => void>;
}

export function useLogoTools(options: UseLogoToolsOptions) {
  const { canvasRef, logoAssets, saveStateRef } = options;

  const [logoSize, setLogoSize] = useState<number>(150);
  const [logoOpacity, setLogoOpacity] = useState<number>(100);
  const [logoStyle, setLogoStyle] = useState<string>("none");
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);

  const availableVariants = useMemo(
    () =>
      Array.from(
        new Set(
          logoAssets
            .map((asset) => asset.variant)
            .filter((v): v is string => v !== null && v !== undefined)
        )
      ).sort(),
    [logoAssets]
  );

  const filteredLogoAssets = useMemo(
    () =>
      selectedVariant
        ? logoAssets.filter((asset) => asset.variant === selectedVariant)
        : availableVariants.length > 0
        ? []
        : logoAssets,
    [logoAssets, selectedVariant, availableVariants.length]
  );

  const addLogoOverlay = useCallback(
    async (file: File) => {
      const canvas = canvasRef.current;
      const saveState = saveStateRef.current;
      if (!canvas) return;

      try {
        const base64Url = await fileToBase64(file);
        const logoImage = await loadImageWithCORS(base64Url);
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const scale = logoSize / Math.max(logoImage.width, logoImage.height);

        const img = new FabricImage(logoImage.getElement(), {
          left: canvasWidth / 2 - (logoImage.width * scale) / 2,
          top: canvasHeight / 2 - (logoImage.height * scale) / 2,
          scaleX: scale,
          scaleY: scale,
          opacity: logoOpacity / 100,
        });
        (img as any).isLogo = true;
        (img as any).isEditable = true;
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
        saveState(true);
      } catch (error) {
        console.error("Error adding logo overlay:", error);
      }
    },
    [canvasRef, saveStateRef, logoSize, logoOpacity]
  );

  const handleInsertDefaultLogo = useCallback(
    async (path: string) => {
      const canvas = canvasRef.current;
      const saveState = saveStateRef.current;
      if (!canvas) return;

      try {
        const base64Url = await urlToBase64(path);
        const logoImage = await loadImageWithCORS(base64Url);
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const scale = logoSize / Math.max(logoImage.width, logoImage.height);

        const img = new FabricImage(logoImage.getElement(), {
          left: canvasWidth / 2 - (logoImage.width * scale) / 2,
          top: canvasHeight / 2 - (logoImage.height * scale) / 2,
          scaleX: scale,
          scaleY: scale,
          opacity: logoOpacity / 100,
        });
        (img as any).isLogo = true;
        (img as any).isEditable = true;
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
        saveState(true);
      } catch (error) {
        console.error("Error inserting default logo:", error);
      }
    },
    [canvasRef, saveStateRef, logoSize, logoOpacity]
  );

  const updateLogo = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const objects = canvas.getObjects();
    const logoObject = objects.find((obj: any) => obj.isLogo === true);
    if (!logoObject) return;

    const currentWidth = logoObject.getScaledWidth();
    const currentHeight = logoObject.getScaledHeight();
    const maxDimension = Math.max(currentWidth, currentHeight);
    const scale = logoSize / maxDimension;

    logoObject.set({
      scaleX: (logoObject.scaleX || 1) * scale,
      scaleY: (logoObject.scaleY || 1) * scale,
      opacity: logoOpacity / 100,
    });
    logoObject.setCoords();
    canvas.renderAll();
  }, [canvasRef, logoSize, logoOpacity]);

  const handleLogoFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file && file.type.startsWith("image/")) {
        addLogoOverlay(file);
      }
      event.target.value = "";
    },
    [addLogoOverlay]
  );

  return {
    logoSize,
    setLogoSize,
    logoOpacity,
    setLogoOpacity,
    logoStyle,
    setLogoStyle,
    selectedVariant,
    setSelectedVariant,
    availableVariants,
    filteredLogoAssets,
    addLogoOverlay,
    handleInsertDefaultLogo,
    handleLogoFileUpload,
    updateLogo,
  };
}
