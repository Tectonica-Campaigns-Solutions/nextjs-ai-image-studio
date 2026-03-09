"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Canvas,
  Control,
  FabricObject,
  Textbox,
  type TPointerEvent,
} from "fabric";
import { loadImageWithCORS } from "../utils/image-editor-utils";
import { getCustomControlRenderers } from "../lib/fabric-control-icons";
import type { HistoryState, ObjectMetadata } from "../types/image-editor-types";
import { CANVAS_CONTROLS, GUIDES } from "../constants/editor-constants";

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
  onBackgroundReplaced?: (newUrl: string) => void;
  onRotationTooltip?: (
    payload: {
      angle: number;
      left: number;
      top: number;
    } | null,
  ) => void;
  /** Called when the object is moved via the move control so the context menu bar can follow. */
  onSelectionContextMenuPosition?: (obj: any, canvas: Canvas) => void;
  /** Ref to current guide positions for snap-to-guide during object:moving. */
  guidePositionsRef?: React.MutableRefObject<{ v: number[]; h: number[] } | null>;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function computeAspectRatio(width: number, height: number): string {
  const divisor = gcd(Math.round(width), Math.round(height));
  return `${Math.round(width) / divisor}:${Math.round(height) / divisor}`;
}

/**
 * Constrains an object so its bounding box stays within canvas dimensions.
 * No-op for background objects. Call setCoords() before reading bounds.
 */
export function constrainObjectToCanvas(obj: any, canvas: Canvas): void {
  if (!obj || !canvas || (obj as any).isBackground) return;
  obj.setCoords();
  const cw = canvas.width ?? 0;
  const ch = canvas.height ?? 0;
  if (cw <= 0 || ch <= 0) return;

  let rect: { left: number; top: number; width: number; height: number };
  if (typeof obj.getBoundingRect === "function") {
    rect = obj.getBoundingRect();
  } else {
    const coords = obj.getCoords?.();
    if (!coords || coords.length < 4) return;
    const xs = coords.map((p: { x: number }) => p.x);
    const ys = coords.map((p: { y: number }) => p.y);
    const left = Math.min(...xs);
    const top = Math.min(...ys);
    rect = {
      left,
      top,
      width: Math.max(...xs) - left,
      height: Math.max(...ys) - top,
    };
  }

  const newLeft = Math.max(0, Math.min(rect.left, cw - rect.width));
  const newTop = Math.max(0, Math.min(rect.top, ch - rect.height));
  const dx = newLeft - rect.left;
  const dy = newTop - rect.top;
  if (dx === 0 && dy === 0) return;
  obj.set({
    left: (obj.left ?? 0) + dx,
    top: (obj.top ?? 0) + dy,
  });
  obj.setCoords();
}

const SNAP_THRESHOLD = GUIDES.SNAP_THRESHOLD;

function snapObjectToGuides(obj: any, canvas: Canvas, guides: { v: number[]; h: number[] }): void {
  if ((obj as any).isBackground) return;
  obj.setCoords?.();
  const rect =
    typeof obj.getBoundingRect === "function"
      ? obj.getBoundingRect()
      : { left: obj.left ?? 0, top: obj.top ?? 0, width: 0, height: 0 };
  const left = rect.left;
  const top = rect.top;
  const w = rect.width ?? 0;
  const h = rect.height ?? 0;
  const centerX = left + w / 2;
  const centerY = top + h / 2;
  const right = left + w;
  const bottom = top + h;
  let dx = 0;
  let dy = 0;
  for (const gx of guides.v) {
    const dl = Math.abs(left - gx);
    const dc = Math.abs(centerX - gx);
    const dr = Math.abs(right - gx);
    const min = Math.min(dl, dc, dr);
    if (min <= SNAP_THRESHOLD) {
      if (min === dl) dx = gx - left;
      else if (min === dc) dx = gx - centerX;
      else dx = gx - right;
      break;
    }
  }
  for (const gy of guides.h) {
    const dt = Math.abs(top - gy);
    const dc = Math.abs(centerY - gy);
    const db = Math.abs(bottom - gy);
    const min = Math.min(dt, dc, db);
    if (min <= SNAP_THRESHOLD) {
      if (min === dt) dy = gy - top;
      else if (min === dc) dy = gy - centerY;
      else dy = gy - bottom;
      break;
    }
  }
  if (dx !== 0 || dy !== 0) {
    obj.set({
      left: (obj.left ?? 0) + dx,
      top: (obj.top ?? 0) + dy,
    });
    obj.setCoords?.();
  }
}

/**
 * Updates the rotate/move control positions so they stay visible at canvas edges.
 * Only move controls above when object is near the bottom (no space below). Near the top, keep them below so they stay visible.
 */
function updateControlsPositionForCanvasBounds(obj: any, canvas: Canvas): void {
  if (!obj || !canvas || (obj as any).isBackground) return;
  const ctrls = obj.controls;
  if (!ctrls?.mtr || !ctrls?.moveCtrl) return;
  const center = obj.getCenterPoint();
  const ch = canvas.height ?? 0;
  const nearBottom =
    center.y + CANVAS_CONTROLS.OFFSET_BELOW > ch - CANVAS_CONTROLS.BOTTOM_THRESHOLD;
  const offsetY = nearBottom ? CANVAS_CONTROLS.OFFSET_ABOVE : CANVAS_CONTROLS.OFFSET_BELOW;
  ctrls.mtr.offsetY = offsetY;
  ctrls.moveCtrl.offsetY = offsetY;
  if (ctrls.resizeH) ctrls.resizeH.offsetY = offsetY;
  obj.setCoords();
}

export function useImageEditorCanvas(
  imageUrl: string | null,
  options: UseImageEditorCanvasOptions,
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
    onBackgroundReplaced,
    onRotationTooltip,
    onSelectionContextMenuPosition,
  } = options;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalImageUrlRef = useRef<string | null>(null);
  const canvasInstanceRef = useRef<Canvas | null>(null);
  const rotationTooltipTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

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
        maxDisplayHeight / originalImageDimensions.height,
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
            safetyMargin,
        );
      }

      const maxDisplayWidth = Math.max(100, availableWidth);
      const maxDisplayHeight = Math.max(100, availableHeight);

      // --- Canva-like control styling & custom icons for all Fabric objects ---
      // In Fabric v6 the constructor creates per-instance controls and applies
      // InteractiveFabricObject.ownDefaults via Object.assign, so prototype.set()
      // has no effect. We patch ownDefaults and override the static createControls
      // methods so every future instance gets the right styling + custom renderers.

      const ownDefaults = (FabricObject as any).ownDefaults;
      if (ownDefaults) {
        Object.assign(ownDefaults, {
          transparentCorners: false,
          cornerColor: "#FFFFFF",
          cornerStrokeColor: "transparent",
          cornerSize: 14,
          touchCornerSize: 28,
          borderColor: "#7B61FF",
          borderScaleFactor: 1.5,
          padding: 4,
        });
      }

      const renderers = getCustomControlRenderers();
      const patchControls = (ctrls: Record<string, any>) => {
        for (const [name, renderFn] of Object.entries(renderers)) {
          if (ctrls[name]) ctrls[name].render = renderFn;
        }

        // Hide original mt — we replace it with a custom resizeH control
        if (ctrls.mt) {
          ctrls.mt.visible = false;
        }

        // Position 2 visible controls below the object:
        // rotation (-18) | move (18)
        // v-resize and h-resize are kept but hidden for now
        if (ctrls.mtr) {
          ctrls.mtr.y = 0.5;
          ctrls.mtr.offsetY = CANVAS_CONTROLS.OFFSET_BELOW;
          ctrls.mtr.offsetX = -18;
          ctrls.mtr.withConnection = false;
          ctrls.mtr.cursorStyle = "crosshair";
        }
        if (ctrls.mb) {
          ctrls.mb.visible = false;
        }

        // Delta-based horizontal scaling (Fabric's built-in handler uses
        // absolute mouse position relative to the object edge, which breaks
        // when the control isn't on an edge).
        const horizontalScaleFromCenter = (
          _eventData: TPointerEvent,
          transform: any,
          x: number,
          y: number,
        ): boolean => {
          const target = transform.target;
          if (target.lockScalingX) return false;

          const canvas = target.canvas;
          const zoom = canvas ? canvas.getZoom() : 1;
          const initialWidth = target.width * transform.scaleX * zoom;

          const angle = (target.angle || 0) * (Math.PI / 180);
          const rawDx = x - transform.ex;
          const rawDy = y - transform.ey;
          const dx = rawDx * Math.cos(angle) + rawDy * Math.sin(angle);

          const newScaleX = Math.max(
            0.05,
            transform.scaleX * (1 + (dx * 2) / initialWidth),
          );

          const center = target.getRelativeCenterPoint();
          target.set("scaleX", newScaleX);
          target.setPositionByOrigin(center, "center", "center");

          return true;
        };

        ctrls.resizeH = new Control({
          x: 0,
          y: 0.5,
          offsetY: CANVAS_CONTROLS.OFFSET_BELOW,
          offsetX: 54,
          visible: false,
          cursorStyle: "ew-resize",
          actionHandler: horizontalScaleFromCenter,
          render: renderers.resizeH,
          sizeX: 28,
          sizeY: 28,
        });

        const moveHandler = (
          _eventData: TPointerEvent,
          transform: any,
          x: number,
          y: number,
        ): boolean => {
          const target = transform.target;
          if (target.lockMovementX && target.lockMovementY) return false;

          target.set({
            left: x - transform.offsetX,
            top: y - transform.offsetY,
          });
          target.setCoords();
          const c = target.canvas;
          if (c) constrainObjectToCanvas(target, c);
          optionsRef.current.onSelectionContextMenuPosition?.(target, c);
          return true;
        };

        ctrls.moveCtrl = new Control({
          x: 0,
          y: 0.5,
          offsetY: CANVAS_CONTROLS.OFFSET_BELOW,
          offsetX: 18,
          cursorStyle: "move",
          actionHandler: moveHandler,
          render: renderers.moveCtrl,
          sizeX: 28,
          sizeY: 28,
        });
      };

      const origFOCreate = (FabricObject as any).createControls;
      (FabricObject as any).createControls = function () {
        const result = origFOCreate.call(this);
        if (result.controls) patchControls(result.controls);
        return result;
      };

      const origTBCreate = (Textbox as any).createControls;
      (Textbox as any).createControls = function () {
        const result = origTBCreate.call(this);
        if (result.controls) patchControls(result.controls);
        return result;
      };

      const fabricCanvas = new Canvas(canvasRef.current, {
        width: maxDisplayWidth,
        height: maxDisplayHeight,
        backgroundColor: "#f8f9fa",
        preserveObjectStacking: true,
        selection: true,
        selectionKey: "shiftKey",
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
          maxDisplayHeight / originalHeight,
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
            entries: [
              {
                overlayJSON: initialOverlayJSON,
                metadata: {},
                backgroundUrl: imageUrl,
              },
            ],
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

      const ROTATION_TOOLTIP_OFFSET_TOP = 80;

      /** Normalize angle to Canva-style range: 0..179, then -180..-1 (then back to 0). */
      const normalizeAngleToCanvaRange = (angle: number) => {
        let a = ((angle % 360) + 360) % 360;
        if (a > 180) a -= 360;
        return Math.round(a);
      };

      const isRotatable = (obj: any) =>
        obj && !(obj as any).isBackground && obj.lockRotation !== true;

      const getRotationTooltipPosition = (obj: any) => {
        const center = obj.getCenterPoint();
        const vpt = fabricCanvas.viewportTransform;
        if (!vpt) return { left: 0, top: 0 };
        const left = center.x * vpt[0] + center.y * vpt[2] + vpt[4];
        const top =
          center.x * vpt[1] +
          center.y * vpt[3] +
          vpt[5] +
          ROTATION_TOOLTIP_OFFSET_TOP;
        return { left, top };
      };

      const clearRotationTooltipTimeout = () => {
        if (rotationTooltipTimeoutRef.current) {
          clearTimeout(rotationTooltipTimeoutRef.current);
          rotationTooltipTimeoutRef.current = null;
        }
      };

      const getActiveOrSelected = () => {
        const active = fabricCanvas.getActiveObject();
        if (!active) return null;
        if ((active as any).type === "activeSelection") {
          const objects = (active as any).getObjects?.() ?? [];
          if (objects.some((o: any) => o.isBackground)) {
            fabricCanvas.discardActiveObject();
            fabricCanvas.renderAll();
            return null;
          }
          return active;
        }
        if ((active as any).isBackground) {
          fabricCanvas.discardActiveObject();
          fabricCanvas.renderAll();
          return null;
        }
        return active;
      };

      fabricCanvas.on("selection:created", () => {
        clearRotationTooltipTimeout();
        opts.onRotationTooltip?.(null);
        const selected = getActiveOrSelected();
        if (selected) updateControlsPositionForCanvasBounds(selected, fabricCanvas);
        opts.setSelectedObject(selected);
      });

      fabricCanvas.on("selection:updated", () => {
        clearRotationTooltipTimeout();
        opts.onRotationTooltip?.(null);
        const selected = getActiveOrSelected();
        if (selected) updateControlsPositionForCanvasBounds(selected, fabricCanvas);
        opts.setSelectedObject(selected);
      });

      fabricCanvas.on("selection:cleared", () => {
        clearRotationTooltipTimeout();
        opts.onRotationTooltip?.(null);
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

      fabricCanvas.on("object:rotating", (e) => {
        const target = (e as any).target;
        if (!opts.onRotationTooltip || !isRotatable(target)) return;
        clearRotationTooltipTimeout();
        const angle = normalizeAngleToCanvaRange(Number(target.angle) || 0);
        const { left, top } = getRotationTooltipPosition(target);
        opts.onRotationTooltip({ angle, left, top });
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
        if (isRotatable(obj) && opts.onRotationTooltip) {
          const angle = normalizeAngleToCanvaRange(Number(obj.angle) || 0);
          const { left, top } = getRotationTooltipPosition(obj);
          opts.onRotationTooltip({ angle, left, top });
          clearRotationTooltipTimeout();
          rotationTooltipTimeoutRef.current = setTimeout(() => {
            rotationTooltipTimeoutRef.current = null;
            opts.onRotationTooltip?.(null);
          }, 2000);
        }
        if (opts.moveSaveTimeoutRef.current) {
          clearTimeout(opts.moveSaveTimeoutRef.current);
          opts.moveSaveTimeoutRef.current = null;
        }
        if (obj) {
          constrainObjectToCanvas(obj, fabricCanvas);
          updateControlsPositionForCanvasBounds(obj, fabricCanvas);
        }
        opts.saveState(true);
      });

      fabricCanvas.on("object:moving", (e: any) => {
        const target = e?.target;
        if (target) {
          const guides = opts.guidePositionsRef?.current;
          if (guides && (guides.v.length > 0 || guides.h.length > 0)) {
            snapObjectToGuides(target, fabricCanvas, guides);
          }
          constrainObjectToCanvas(target, fabricCanvas);
          updateControlsPositionForCanvasBounds(target, fabricCanvas);
        }
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
      if (rotationTooltipTimeoutRef.current) {
        clearTimeout(rotationTooltipTimeoutRef.current);
        rotationTooltipTimeoutRef.current = null;
      }
      opts.onRotationTooltip?.(null);
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
          opts.preventContextMenu,
        );
        if (canvasWrapper) {
          canvasWrapper.removeEventListener(
            "contextmenu",
            opts.preventContextMenu,
          );
        }
        instance.dispose();
      }
    };
  }, [imageUrl]);

  const replaceBackgroundImage = useCallback(
    async (newImageUrl: string) => {
      const instance = canvasInstanceRef.current;
      if (!instance) return;
      const objects = instance.getObjects();
      const currentBg = objects[0];
      if (!currentBg || !(currentBg as any).isBackground) return;

      try {
        const newImg = await loadImageWithCORS(newImageUrl);
        const originalWidth = newImg.width;
        const originalHeight = newImg.height;

        originalImageUrlRef.current = newImageUrl;
        setOriginalImageDimensions({
          width: originalWidth,
          height: originalHeight,
        });
        setAspectRatio(computeAspectRatio(originalWidth, originalHeight));

        const canvasArea = document.getElementById("canvas-area");
        let newDisplayWidth = originalWidth;
        let newDisplayHeight = originalHeight;
        if (canvasArea && originalWidth > 0 && originalHeight > 0) {
          const containerRect = canvasArea.getBoundingClientRect();
          const maxDisplayWidth = Math.max(100, containerRect.width);
          const maxDisplayHeight = Math.max(100, containerRect.height);
          const displayScale = Math.min(
            1,
            maxDisplayWidth / originalWidth,
            maxDisplayHeight / originalHeight,
          );
          newDisplayWidth = originalWidth * displayScale;
          newDisplayHeight = originalHeight * displayScale;
          newImg.set({
            left: 0,
            top: 0,
            scaleX: displayScale,
            scaleY: displayScale,
            selectable: false,
            evented: false,
            lockMovementX: true,
            lockMovementY: true,
            lockRotation: true,
            lockScalingX: true,
            lockScalingY: true,
            hasControls: false,
            hasBorders: false,
          });
        } else {
          newImg.set({
            left: 0,
            top: 0,
            scaleX: 1,
            scaleY: 1,
            selectable: false,
            evented: false,
            lockMovementX: true,
            lockMovementY: true,
            lockRotation: true,
            lockScalingX: true,
            lockScalingY: true,
            hasControls: false,
            hasBorders: false,
          });
        }
        (newImg as any).isBackground = true;
        (newImg as any).isEditable = false;

        instance.remove(currentBg);
        instance.add(newImg);
        instance.sendObjectToBack(newImg);

        if (canvasArea && originalWidth > 0 && originalHeight > 0) {
          const oldWidth = instance.width ?? newDisplayWidth;
          const scale = newDisplayWidth / oldWidth;

          instance.setDimensions({
            width: newDisplayWidth,
            height: newDisplayHeight,
          });

          const canvasContainer = instance.getElement().parentElement;
          if (canvasContainer) {
            canvasContainer.style.width = `${newDisplayWidth}px`;
            canvasContainer.style.height = `${newDisplayHeight}px`;
            canvasContainer.style.maxWidth = `${newDisplayWidth}px`;
            canvasContainer.style.maxHeight = `${newDisplayHeight}px`;
          }

          const allObjects = instance.getObjects();
          allObjects.forEach((obj, index) => {
            if (index === 0) {
              const bg = obj;
              bg.set({
                left: 0,
                top: 0,
                scaleX: newDisplayWidth / originalWidth,
                scaleY: newDisplayHeight / originalHeight,
              });
              bg.setCoords();
              return;
            }
            const objLeft = obj.left || 0;
            const objTop = obj.top || 0;
            const objScaleX = obj.scaleX || 1;
            const objScaleY = obj.scaleY || 1;
            obj.set({
              left: objLeft * scale,
              top: objTop * scale,
              scaleX: objScaleX * scale,
              scaleY: objScaleY * scale,
            });
            obj.setCoords();
          });

          setCanvasDimensions({
            width: newDisplayWidth,
            height: newDisplayHeight,
          });
        }

        instance.renderAll();
        onBackgroundReplaced?.(newImageUrl);
      } catch (err) {
        console.error("Error replacing background image:", err);
        throw err;
      }
    },
    [onBackgroundReplaced],
  );

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
    replaceBackgroundImage,
  };
}
