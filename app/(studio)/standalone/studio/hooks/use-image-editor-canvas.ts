"use client";

import { useState, useRef, useEffect } from "react";
import { Canvas } from "fabric";
import { loadImageWithCORS } from "../utils/image-editor-utils";
import type { HistoryState, ObjectMetadata } from "../types/image-editor-types";

export interface UseImageEditorCanvasOptions {
  headerRef: React.RefObject<HTMLDivElement | null>;
  setHistoryState: React.Dispatch<React.SetStateAction<HistoryState>>;
  setObjectMetadata: React.Dispatch<
    React.SetStateAction<Record<number, ObjectMetadata>>
  >;
  setSelectedObject: (obj: any) => void;
  setQrSize: (n: number) => void;
  setLogoSize: (n: number) => void;
  setFrameOpacity?: (n: number) => void;
  saveState: (immediate?: boolean) => void;
  moveSaveTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>;
  saveStateTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>;
  preventContextMenu: (e: MouseEvent) => false;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function computeAspectRatio(width: number, height: number): string {
  const divisor = gcd(Math.round(width), Math.round(height));
  return `${Math.round(width) / divisor}:${Math.round(height) / divisor}`;
}

export function useImageEditorCanvas(
  imageUrl: string | null,
  options: UseImageEditorCanvasOptions
) {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const {
    headerRef,
    setHistoryState,
    setObjectMetadata,
    setSelectedObject,
    setQrSize,
    setLogoSize,
    saveState,
    moveSaveTimeoutRef,
    saveStateTimeoutRef,
    preventContextMenu,
  } = options;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalImageUrlRef = useRef<string | null>(null);
  const canvasInstanceRef = useRef<Canvas | null>(null);

  const [canvas, setCanvas] = useState<Canvas | null>(null);
  const [originalImageDimensions, setOriginalImageDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [canvasDimensions, setCanvasDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [aspectRatio, setAspectRatio] = useState<string | null>(null);

  // Resize effect
  useEffect(() => {
    if (!canvas || !originalImageDimensions) return;

    const handleResize = () => {
      const canvasArea = document.getElementById("canvas-area");
      if (!canvasArea) return;

      const containerRect = canvasArea.getBoundingClientRect();
      const availableWidth = containerRect.width;
      const availableHeight = containerRect.height;
      const maxDisplayWidth = availableWidth;
      const maxDisplayHeight = availableHeight;

      const displayScale = Math.min(
        1,
        maxDisplayWidth / originalImageDimensions.width,
        maxDisplayHeight / originalImageDimensions.height
      );

      const newDisplayWidth = originalImageDimensions.width * displayScale;
      const newDisplayHeight = originalImageDimensions.height * displayScale;

      if (
        Math.abs(newDisplayWidth - canvas.width) > 1 ||
        Math.abs(newDisplayHeight - canvas.height) > 1
      ) {
        const oldWidth = canvas.width;
        const scale = newDisplayWidth / oldWidth;

        canvas.setDimensions({
          width: newDisplayWidth,
          height: newDisplayHeight,
        });

        const canvasContainer = canvas.getElement().parentElement;
        if (canvasContainer) {
          canvasContainer.style.width = `${newDisplayWidth}px`;
          canvasContainer.style.height = `${newDisplayHeight}px`;
          canvasContainer.style.maxWidth = `${newDisplayWidth}px`;
          canvasContainer.style.maxHeight = `${newDisplayHeight}px`;
        }

        const objects = canvas.getObjects();
        objects.forEach((obj) => {
          const left = obj.left || 0;
          const top = obj.top || 0;
          const objScaleX = obj.scaleX || 1;
          const objScaleY = obj.scaleY || 1;
          obj.set({
            left: left * scale,
            top: top * scale,
            scaleX: objScaleX * scale,
            scaleY: objScaleY * scale,
          });
          obj.setCoords();
        });

        canvas.renderAll();
        setCanvasDimensions({
          width: newDisplayWidth,
          height: newDisplayHeight,
        });
      }
    };

    let resizeTimeout: NodeJS.Timeout;
    const debouncedResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(handleResize, 150);
    };

    window.addEventListener("resize", debouncedResize);
    window.addEventListener("orientationchange", debouncedResize);

    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener("resize", debouncedResize);
      window.removeEventListener("orientationchange", debouncedResize);
    };
  }, [canvas, originalImageDimensions]);

  // Init effect - only re-run when imageUrl changes
  useEffect(() => {
    if (!imageUrl) return;

    const initializeCanvas = async () => {
      const opts = optionsRef.current;
      await new Promise((resolve) => requestAnimationFrame(resolve));

      const canvasArea = document.getElementById("canvas-area");
      if (!canvasArea || !canvasRef.current) {
        console.error("Canvas area not found");
        return;
      }

      const containerRect = canvasArea.getBoundingClientRect();
      let availableWidth = containerRect.width;
      let availableHeight = containerRect.height;

      if (availableWidth <= 0 || availableHeight <= 0) {
        const isMobile = window.innerWidth < 767;
        const padding = isMobile ? 20 : 60;
        availableWidth = window.innerWidth - padding;
        const headerHeight = opts.headerRef.current?.offsetHeight || 0;
        const verticalPadding = isMobile ? 36 : 40;
        const headerMarginBottom = isMobile ? 18 : 25;
        const headerTotalHeight = headerHeight + headerMarginBottom;
        const safetyMargin = 10;
        availableHeight = Math.max(
          100,
          window.innerHeight -
            verticalPadding -
            headerTotalHeight -
            safetyMargin
        );
      }

      const maxDisplayWidth = Math.max(100, availableWidth);
      const maxDisplayHeight = Math.max(100, availableHeight);

      const fabricCanvas = new Canvas(canvasRef.current, {
        width: maxDisplayWidth,
        height: maxDisplayHeight,
        backgroundColor: "#f8f9fa",
        preserveObjectStacking: true,
      });

      const canvasElement = fabricCanvas.getElement();
      const canvasWrapper = canvasElement.parentElement;
      canvasElement.addEventListener("contextmenu", opts.preventContextMenu);
      if (canvasWrapper) {
        canvasWrapper.addEventListener("contextmenu", opts.preventContextMenu);
      }

      try {
        originalImageUrlRef.current = imageUrl;
        const img = await loadImageWithCORS(imageUrl);
        const originalWidth = img.width;
        const originalHeight = img.height;

        setOriginalImageDimensions({
          width: originalWidth,
          height: originalHeight,
        });
        setAspectRatio(computeAspectRatio(originalWidth, originalHeight));

        const displayScale = Math.min(
          1,
          maxDisplayWidth / originalWidth,
          maxDisplayHeight / originalHeight
        );
        const displayWidth = originalWidth * displayScale;
        const displayHeight = originalHeight * displayScale;

        fabricCanvas.setDimensions({
          width: displayWidth,
          height: displayHeight,
        });

        const canvasContainer = fabricCanvas.getElement().parentElement;
        if (canvasContainer) {
          canvasContainer.style.width = `${displayWidth}px`;
          canvasContainer.style.height = `${displayHeight}px`;
          canvasContainer.style.maxWidth = `${displayWidth}px`;
          canvasContainer.style.maxHeight = `${displayHeight}px`;
        }

        img.set({
          left: 0,
          top: 0,
          selectable: false,
          evented: false,
          lockMovementX: true,
          lockMovementY: true,
          lockRotation: true,
          lockScalingX: true,
          lockScalingY: true,
          hasControls: false,
          hasBorders: false,
          scaleX: displayScale,
          scaleY: displayScale,
        });
        (img as any).isBackground = true;
        (img as any).isEditable = false;

        fabricCanvas.add(img);
        fabricCanvas.renderAll();

        setTimeout(() => {
          const fullJSON = (fabricCanvas as any).toJSON(["src"]) as {
            version?: string;
            objects?: any[];
          };
          const initialOverlayJSON = JSON.stringify({
            version: fullJSON.version ?? "5.3.0",
            objects: [],
          });
          opts.setHistoryState({
            entries: [{ overlayJSON: initialOverlayJSON, metadata: {} }],
            currentIndex: 0,
          });
          opts.setObjectMetadata({
            0: {
              isBackground: true,
              isQR: false,
              isLogo: false,
              isEditable: false,
            },
          });
        }, 100);
      } catch (error) {
        console.error("Error loading image:", error);
      }

      fabricCanvas.on("selection:created", (e) => {
        const selected = e.selected?.[0];
        if (selected && (selected as any).isBackground) {
          fabricCanvas.discardActiveObject();
          fabricCanvas.renderAll();
          opts.setSelectedObject(null);
          return;
        }
        opts.setSelectedObject(selected || null);
      });

      fabricCanvas.on("selection:updated", (e) => {
        const selected = e.selected?.[0];
        if (selected && (selected as any).isBackground) {
          fabricCanvas.discardActiveObject();
          fabricCanvas.renderAll();
          opts.setSelectedObject(null);
          return;
        }
        opts.setSelectedObject(selected || null);
      });

      fabricCanvas.on("selection:cleared", () => {
        opts.setSelectedObject(null);
      });

      fabricCanvas.on("mouse:down", (e: any) => {
        const target = e.target;
        if (target && (target as any).isBackground) {
          fabricCanvas.discardActiveObject();
          fabricCanvas.renderAll();
          e.e.preventDefault();
          e.e.stopPropagation();
          return false;
        }
      });

      fabricCanvas.on("object:modified", (e) => {
        const obj = e.target;
        if (obj && obj.type === "image") {
          if ((obj as any).isQR) {
            const scaledWidth = obj.getScaledWidth();
            const scaledHeight = obj.getScaledHeight();
            const maxDimension = Math.max(scaledWidth, scaledHeight);
            opts.setQrSize(Math.round(maxDimension));
          } else if ((obj as any).isLogo) {
            const scaledWidth = obj.getScaledWidth();
            const scaledHeight = obj.getScaledHeight();
            const maxDimension = Math.max(scaledWidth, scaledHeight);
            opts.setLogoSize(Math.round(maxDimension));
          } else if ((obj as any).isFrame && opts.setFrameOpacity) {
            const op = (obj as any).opacity;
            if (typeof op === "number") {
              opts.setFrameOpacity(Math.round(op * 100));
            }
          }
        }
        if (opts.moveSaveTimeoutRef.current) {
          clearTimeout(opts.moveSaveTimeoutRef.current);
          opts.moveSaveTimeoutRef.current = null;
        }
        opts.saveState(true);
      });

      fabricCanvas.on("object:moving", () => {
        if (opts.moveSaveTimeoutRef.current) {
          clearTimeout(opts.moveSaveTimeoutRef.current);
        }
        opts.moveSaveTimeoutRef.current = setTimeout(() => {
          opts.moveSaveTimeoutRef.current = null;
          opts.saveState(true);
        }, 400);
      });

      fabricCanvas.on("text:editing:exited", () => {
        opts.saveState(true);
      });

      fabricCanvas.on("text:changed", () => {
        opts.saveState(false);
      });

      canvasInstanceRef.current = fabricCanvas;
      setCanvas(fabricCanvas);
    };

    const timeoutId = setTimeout(initializeCanvas, 100);

    return () => {
      clearTimeout(timeoutId);
      const opts = optionsRef.current;
      if (opts.saveStateTimeoutRef.current) {
        clearTimeout(opts.saveStateTimeoutRef.current);
        opts.saveStateTimeoutRef.current = null;
      }
      if (opts.moveSaveTimeoutRef.current) {
        clearTimeout(opts.moveSaveTimeoutRef.current);
        opts.moveSaveTimeoutRef.current = null;
      }
      const instance = canvasInstanceRef.current;
      if (instance) {
        canvasInstanceRef.current = null;
        setCanvas(null);
        const canvasElement = instance.getElement();
        const canvasWrapper = canvasElement.parentElement;
        canvasElement.removeEventListener(
          "contextmenu",
          opts.preventContextMenu
        );
        if (canvasWrapper) {
          canvasWrapper.removeEventListener(
            "contextmenu",
            opts.preventContextMenu
          );
        }
        instance.dispose();
      }
    };
  }, [imageUrl]);

  return {
    canvas,
    setCanvas,
    canvasRef,
    originalImageDimensions,
    setOriginalImageDimensions,
    canvasDimensions,
    setCanvasDimensions,
    originalImageUrlRef,
    aspectRatio,
  };
}
