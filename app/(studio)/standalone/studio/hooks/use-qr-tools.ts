"use client";

import { useState, useCallback } from "react";
import { FabricImage } from "fabric";
import {
  fileToBase64,
  loadImageWithCORS,
  urlToBase64,
} from "../utils/image-editor-utils";
import { generateQR } from "../utils/studio-utils";
import { QR_DEFAULTS } from "../constants/editor-constants";

export interface UseQRToolsOptions {
  canvasRef: React.MutableRefObject<any>;
  saveStateRef: React.MutableRefObject<(immediate?: boolean) => void>;
}

export function useQRTools(options: UseQRToolsOptions) {
  const { canvasRef, saveStateRef } = options;

  const [qrSize, setQrSize] = useState<number>(QR_DEFAULTS.SIZE);
  const [qrOpacity, setQrOpacity] = useState<number>(QR_DEFAULTS.OPACITY);
  const [qrUrl, setQrUrl] = useState("");

  const addQRFromUrl = useCallback(async () => {
    const canvas = canvasRef.current;
    const saveState = saveStateRef.current;
    if (!canvas || !qrUrl.trim()) return;

    try {
      const qrApiUrl = await generateQR(qrUrl);
      if (!qrApiUrl) {
        console.error("Failed to generate QR code: No URL returned");
        return;
      }

      const base64Url = await urlToBase64(qrApiUrl);
      const qrImage = await loadImageWithCORS(base64Url);
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const scale = qrSize / Math.max(qrImage.width, qrImage.height);

      const img = new FabricImage(qrImage.getElement(), {
        left: canvasWidth / 2 - (qrImage.width * scale) / 2,
        top: canvasHeight / 2 - (qrImage.height * scale) / 2,
        scaleX: scale,
        scaleY: scale,
        opacity: qrOpacity / 100,
      });
      (img as any).isQR = true;
      (img as any).isEditable = true;
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.renderAll();
      saveState(true);
    } catch (error) {
      console.error("Error adding QR code from URL:", error);
    }
  }, [canvasRef, saveStateRef, qrUrl, qrSize, qrOpacity]);

  const addCustomQR = useCallback(
    async (file: File) => {
      const canvas = canvasRef.current;
      const saveState = saveStateRef.current;
      if (!canvas) return;

      try {
        const base64Url = await fileToBase64(file);
        const qrImage = await loadImageWithCORS(base64Url);
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const scale = qrSize / Math.max(qrImage.width, qrImage.height);

        const img = new FabricImage(qrImage.getElement(), {
          left: canvasWidth / 2 - (qrImage.width * scale) / 2,
          top: canvasHeight / 2 - (qrImage.height * scale) / 2,
          scaleX: scale,
          scaleY: scale,
          opacity: qrOpacity / 100,
        });
        (img as any).isQR = true;
        (img as any).isEditable = true;
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
        saveState(true);
      } catch (error) {
        console.error("Error adding custom QR code:", error);
      }
    },
    [canvasRef, saveStateRef, qrSize, qrOpacity]
  );

  const updateQRCode = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Update the currently selected QR (active object), not the first one
    const active = canvas.getActiveObject();
    if (!active || !(active as any).isQR) return;

    const qrObject = active as any;
    const currentWidth = qrObject.getScaledWidth();
    const currentHeight = qrObject.getScaledHeight();
    const maxDimension = Math.max(currentWidth, currentHeight);
    const scale = qrSize / maxDimension;

    qrObject.set({
      scaleX: (qrObject.scaleX || 1) * scale,
      scaleY: (qrObject.scaleY || 1) * scale,
      opacity: qrOpacity / 100,
    });
    qrObject.setCoords();
    canvas.renderAll();
  }, [canvasRef, qrSize, qrOpacity]);

  const handleQRFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file && file.type.startsWith("image/")) {
        addCustomQR(file);
      }
      event.target.value = "";
    },
    [addCustomQR]
  );

  return {
    qrSize,
    setQrSize,
    qrOpacity,
    setQrOpacity,
    qrUrl,
    setQrUrl,
    addQRFromUrl,
    addCustomQR,
    updateQRCode,
    handleQRFileUpload,
  };
}
