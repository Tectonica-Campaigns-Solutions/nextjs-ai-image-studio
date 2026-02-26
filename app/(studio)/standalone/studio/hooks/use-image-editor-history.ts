"use client";

import { useState, useRef, useCallback } from "react";
import { Canvas } from "fabric";
import { loadImageWithCORS } from "../utils/image-editor-utils";
import type {
  HistoryEntry,
  HistoryState,
  ObjectMetadata,
} from "../types/image-editor-types";

export interface UseImageEditorHistoryOptions {
  canvasRef: React.MutableRefObject<Canvas | null>;
  originalImageUrlRef: React.MutableRefObject<string | null>;
  originalImageDimensionsRef: React.MutableRefObject<{
    width: number;
    height: number;
  } | null>;
  setObjectMetadata: React.Dispatch<
    React.SetStateAction<Record<number, ObjectMetadata>>
  >;
  setSelectedObject: (obj: any) => void;
  setQrSize: (n: number) => void;
  setQrOpacity: (n: number) => void;
  setLogoSize: (n: number) => void;
  setLogoOpacity: (n: number) => void;
}

export function useImageEditorHistory(options: UseImageEditorHistoryOptions) {
  const {
    canvasRef,
    originalImageUrlRef,
    originalImageDimensionsRef,
    setObjectMetadata,
    setSelectedObject,
    setQrSize,
    setQrOpacity,
    setLogoSize,
    setLogoOpacity,
  } = options;

  const [historyState, setHistoryState] = useState<HistoryState>({
    entries: [],
    currentIndex: -1,
  });

  const isRestoringState = useRef(false);
  const saveStateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const moveSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const saveState = useCallback(
    (immediate = false) => {
      const canvas = canvasRef.current;
      if (!canvas || isRestoringState.current) return;

      const doSave = () => {
        if (saveStateTimeoutRef.current) {
          clearTimeout(saveStateTimeoutRef.current);
          saveStateTimeoutRef.current = null;
        }

        const objects = canvas.getObjects();
        if (objects.length < 1) return;

        const fullJSON = (canvas as any).toJSON(["src"]) as {
          version?: string;
          objects: any[];
        };
        const overlayDescriptors = fullJSON.objects.slice(1);
        const overlayJSON = JSON.stringify({
          version: fullJSON.version ?? "5.3.0",
          objects: overlayDescriptors,
        });

        const metadataSnapshot: Record<number, ObjectMetadata> = {};
        objects.slice(1).forEach((obj: any, index: number) => {
          metadataSnapshot[index] = {
            isBackground: false,
            isQR: obj.isQR || false,
            isLogo: obj.isLogo || false,
            isEditable: obj.isEditable !== false,
          };
        });

        const newEntry: HistoryEntry = {
          overlayJSON,
          metadata: metadataSnapshot,
        };

        setHistoryState((prev) => {
          const newEntries = prev.entries.slice(0, prev.currentIndex + 1);
          if (
            newEntries.length > 0 &&
            newEntries[newEntries.length - 1].overlayJSON === overlayJSON
          ) {
            return prev;
          }
          newEntries.push(newEntry);
          if (newEntries.length > 50) {
            newEntries.shift();
            return {
              entries: newEntries,
              currentIndex: newEntries.length - 1,
            };
          }
          return {
            entries: newEntries,
            currentIndex: newEntries.length - 1,
          };
        });

        const fullMetadata: Record<number, ObjectMetadata> = {
          0: {
            isBackground: true,
            isQR: false,
            isLogo: false,
            isEditable: false,
          },
        };
        Object.entries(metadataSnapshot).forEach(([i, meta]) => {
          fullMetadata[Number(i) + 1] = meta;
        });
        setObjectMetadata(fullMetadata);
      };

      if (immediate) {
        if (saveStateTimeoutRef.current) {
          clearTimeout(saveStateTimeoutRef.current);
          saveStateTimeoutRef.current = null;
        }
        doSave();
      } else {
        if (saveStateTimeoutRef.current) {
          clearTimeout(saveStateTimeoutRef.current);
        }
        saveStateTimeoutRef.current = setTimeout(doSave, 500);
      }
    },
    [
      canvasRef,
      historyState.currentIndex,
      historyState.entries.length,
      setObjectMetadata,
    ]
  );

  const addBackgroundFromUrl = useCallback(
    async (targetCanvas: Canvas): Promise<void> => {
      const url = originalImageUrlRef.current;
      const dimensions = originalImageDimensionsRef.current;
      if (!url || !dimensions) return;
      const cw = (targetCanvas as any).width as number;
      const ch = (targetCanvas as any).height as number;
      const displayScale = Math.min(
        1,
        cw / dimensions.width,
        ch / dimensions.height
      );
      const img = await loadImageWithCORS(url);
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
      targetCanvas.add(img);
      targetCanvas.sendObjectToBack(img);
    },
    [originalImageUrlRef, originalImageDimensionsRef]
  );

  const loadOverlaysFromJSON = useCallback(
    async (mainCanvas: Canvas, overlayJSON: string): Promise<void> => {
      const parsed = JSON.parse(overlayJSON) as {
        version?: string;
        objects?: any[];
      };
      const objects = parsed.objects ?? [];
      if (objects.length === 0) return;

      const tempCanvas = new Canvas(document.createElement("canvas"), {
        width: 1,
        height: 1,
      });
      await tempCanvas.loadFromJSON(overlayJSON);
      const overlayObjects = tempCanvas.getObjects();
      overlayObjects.forEach((obj) => {
        mainCanvas.add(obj);
      });
      tempCanvas.dispose();
    },
    []
  );

  const applyEntryMetadataToCanvas = useCallback(
    (entry: HistoryEntry) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const objects = canvas.getObjects();
      objects.forEach((obj: any, canvasIndex: number) => {
        if (canvasIndex === 0) {
          obj.isBackground = true;
          obj.set({
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
          canvas.sendObjectToBack(obj);
          return;
        }
        const meta = entry.metadata[canvasIndex - 1];
        if (meta) {
          obj.isBackground = meta.isBackground;
          obj.isQR = meta.isQR;
          obj.isLogo = meta.isLogo;
          obj.isEditable = meta.isEditable;

          if (meta.isQR && obj.type === "image") {
            const scaledWidth = obj.getScaledWidth();
            const scaledHeight = obj.getScaledHeight();
            const maxDimension = Math.max(scaledWidth, scaledHeight);
            setQrSize(Math.round(maxDimension));
            setQrOpacity(Math.round((obj.opacity || 1) * 100));
          } else if (meta.isLogo && obj.type === "image") {
            const scaledWidth = obj.getScaledWidth();
            const scaledHeight = obj.getScaledHeight();
            const maxDimension = Math.max(scaledWidth, scaledHeight);
            setLogoSize(Math.round(maxDimension));
            setLogoOpacity(Math.round((obj.opacity || 1) * 100));
          }
        }
      });
    },
    [canvasRef, setQrSize, setQrOpacity, setLogoSize, setLogoOpacity]
  );

  const undo = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || historyState.currentIndex <= 0) return;

    if (saveStateTimeoutRef.current) {
      clearTimeout(saveStateTimeoutRef.current);
      saveStateTimeoutRef.current = null;
    }
    if (moveSaveTimeoutRef.current) {
      clearTimeout(moveSaveTimeoutRef.current);
      moveSaveTimeoutRef.current = null;
    }

    isRestoringState.current = true;
    const previousEntry = historyState.entries[historyState.currentIndex - 1];
    if (!previousEntry) {
      isRestoringState.current = false;
      return;
    }

    (async () => {
      try {
        canvas.clear();
        await addBackgroundFromUrl(canvas);
        await loadOverlaysFromJSON(canvas, previousEntry.overlayJSON);
        applyEntryMetadataToCanvas(previousEntry);
        canvas.discardActiveObject();
        canvas.renderAll();

        setHistoryState((prev) => ({
          ...prev,
          currentIndex: prev.currentIndex - 1,
        }));
        setSelectedObject(null);
        const fullMetadata: Record<number, ObjectMetadata> = {
          0: {
            isBackground: true,
            isQR: false,
            isLogo: false,
            isEditable: false,
          },
        };
        Object.entries(previousEntry.metadata).forEach(([i, meta]) => {
          fullMetadata[Number(i) + 1] = meta;
        });
        setObjectMetadata(fullMetadata);
      } catch (err) {
        console.error("Undo failed:", err);
      } finally {
        isRestoringState.current = false;
      }
    })();
  }, [
    canvasRef,
    historyState,
    addBackgroundFromUrl,
    loadOverlaysFromJSON,
    applyEntryMetadataToCanvas,
    setSelectedObject,
    setObjectMetadata,
  ]);

  const redo = useCallback(() => {
    const canvas = canvasRef.current;
    if (
      !canvas ||
      historyState.currentIndex >= historyState.entries.length - 1
    ) {
      return;
    }

    if (saveStateTimeoutRef.current) {
      clearTimeout(saveStateTimeoutRef.current);
      saveStateTimeoutRef.current = null;
    }
    if (moveSaveTimeoutRef.current) {
      clearTimeout(moveSaveTimeoutRef.current);
      moveSaveTimeoutRef.current = null;
    }

    isRestoringState.current = true;
    const nextEntry = historyState.entries[historyState.currentIndex + 1];
    if (!nextEntry) {
      isRestoringState.current = false;
      return;
    }

    (async () => {
      try {
        canvas.clear();
        await addBackgroundFromUrl(canvas);
        await loadOverlaysFromJSON(canvas, nextEntry.overlayJSON);
        applyEntryMetadataToCanvas(nextEntry);
        canvas.discardActiveObject();
        canvas.renderAll();

        setHistoryState((prev) => ({
          ...prev,
          currentIndex: prev.currentIndex + 1,
        }));
        setSelectedObject(null);
        const fullMetadata: Record<number, ObjectMetadata> = {
          0: {
            isBackground: true,
            isQR: false,
            isLogo: false,
            isEditable: false,
          },
        };
        Object.entries(nextEntry.metadata).forEach(([i, meta]) => {
          fullMetadata[Number(i) + 1] = meta;
        });
        setObjectMetadata(fullMetadata);
      } catch (err) {
        console.error("Redo failed:", err);
      } finally {
        isRestoringState.current = false;
      }
    })();
  }, [
    canvasRef,
    historyState,
    addBackgroundFromUrl,
    loadOverlaysFromJSON,
    applyEntryMetadataToCanvas,
    setSelectedObject,
    setObjectMetadata,
  ]);

  return {
    historyState,
    setHistoryState,
    saveState,
    undo,
    redo,
    addBackgroundFromUrl,
    loadOverlaysFromJSON,
    applyEntryMetadataToCanvas,
    isRestoringState,
    saveStateTimeoutRef,
    moveSaveTimeoutRef,
  };
}
