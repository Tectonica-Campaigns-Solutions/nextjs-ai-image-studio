"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Eye, EyeOff, Lock, Unlock, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActiveSelection } from "fabric";

type FabricObject = {
  visible?: boolean;
  lockMovementX?: boolean;
  lockMovementY?: boolean;
  hasControls?: boolean;
  hasBorders?: boolean;
  selectable?: boolean;
  evented?: boolean;
  set: (opts: Record<string, unknown>) => void;
  toString: () => string;
} & Record<string, unknown>;

function getLayerDisplayName(obj: FabricObject): string {
  if (obj.isQR) return "QR Code";
  if (obj.isLogo) return "Logo";
  if (obj.isFrame) return "Frame";
  if (obj.isShape) return "Shape";
  if (obj.type === "textbox") return "Text";
  return "Image";
}

export interface LayersPanelProps {
  canvasRef: React.MutableRefObject<any>;
  selectedObject: any;
  onSelectLayer: (obj: any) => void;
  onSaveState: (immediate?: boolean) => void;
}

export const LayersPanel = React.memo(function LayersPanel({
  canvasRef,
  selectedObject,
  onSelectLayer,
  onSaveState,
}: LayersPanelProps) {
  const [layerVersion, setLayerVersion] = useState(0);
  const canvas = canvasRef.current;

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const bump = () => setLayerVersion((v) => v + 1);
    c.on("object:added", bump);
    c.on("object:removed", bump);
    c.on("object:modified", bump);
    c.on("selection:created", bump);
    c.on("selection:updated", bump);
    c.on("selection:cleared", bump);
    return () => {
      c.off("object:added", bump);
      c.off("object:removed", bump);
      c.off("object:modified", bump);
      c.off("selection:created", bump);
      c.off("selection:updated", bump);
      c.off("selection:cleared", bump);
    };
  }, [canvasRef]);

  const objects = canvas
    ? canvas.getObjects().filter((obj: any) => !obj.isBackground)
    : [];
  const layers = [...objects].reverse();

  const isSelected = useCallback(
    (obj: any) => {
      if (!selectedObject) return false;
      const active = canvas?.getActiveObject();
      if (active && (active as any).type === "activeSelection") {
        return (active as ActiveSelection).getObjects().includes(obj);
      }
      return selectedObject === obj;
    },
    [canvas, selectedObject]
  );

  const handleVisibilityToggle = useCallback(
    (obj: any) => {
      const c = canvasRef.current;
      if (!c) return;
      const next = !obj.visible;
      obj.set("visible", next);
      c.renderAll();
      onSaveState(false);
      setLayerVersion((v) => v + 1);
    },
    [canvasRef, onSaveState]
  );

  const handleLockToggle = useCallback(
    (obj: any) => {
      const c = canvasRef.current;
      if (!c) return;
      // Use explicit lock flag so state survives Fabric's text:editing:exited (which can reset selectable/evented)
      const locked = (obj as any).__layerLocked === true ||
        !!(obj.lockMovementX && obj.lockMovementY) ||
        obj.selectable === false ||
        obj.evented === false;
      const nextLocked = !locked;
      (obj as any).__layerLocked = nextLocked;

      // If locking while text is in edit mode: exit editing first (blur hidden input, call exitEditing, then deselect)
      if (nextLocked) {
        const active = c.getActiveObject();
        const isActive =
          active === obj ||
          (active && (active as any).type === "activeSelection" && (active as any).getObjects?.().includes(obj));
        if (isActive) {
          if (obj.hiddenTextarea && typeof obj.hiddenTextarea.blur === "function") {
            obj.hiddenTextarea.blur();
          }
          if (obj.isEditing && typeof obj.exitEditing === "function") {
            obj.exitEditing();
          }
          c.discardActiveObject();
        }
      }

      const lockProps: Record<string, boolean> = {
        lockMovementX: nextLocked,
        lockMovementY: nextLocked,
        hasControls: !nextLocked,
        hasBorders: !nextLocked,
        selectable: !nextLocked,
        evented: !nextLocked,
      };
      if (obj.type === "textbox" || (obj as any).type === "i-text") {
        lockProps.editable = !nextLocked;
      }
      obj.set(lockProps);
      c.renderAll();
      onSaveState(false);
      setLayerVersion((v) => v + 1);
    },
    [canvasRef, onSaveState]
  );

  const handleBringToFront = useCallback(
    (obj: any) => {
      const c = canvasRef.current;
      if (!c) return;
      c.bringObjectToFront(obj);
      c.renderAll();
      onSaveState(true);
      setLayerVersion((v) => v + 1);
    },
    [canvasRef, onSaveState]
  );

  const handleSendToBack = useCallback(
    (obj: any) => {
      const c = canvasRef.current;
      if (!c) return;
      while (c.getObjects().indexOf(obj) > 1) {
        c.sendObjectBackwards(obj);
      }
      c.renderAll();
      onSaveState(true);
      setLayerVersion((v) => v + 1);
    },
    [canvasRef, onSaveState]
  );

  if (!canvas) return null;

  return (
    <div className="space-y-2" data-layer-version={layerVersion}>
      <p className="text-[13px] text-white/70 font-(family-name:--font-manrope) mb-2">
        Click a layer to select. Use buttons to reorder, show/hide, or lock.
      </p>
      {layers.length === 0 ? (
        <p className="text-[13px] text-white/50 font-(family-name:--font-manrope) py-4">
          No layers yet. Add text, logos, shapes, or frames.
        </p>
      ) : (
        <ul className="space-y-1">
          {layers.map((obj) => {
            const selected = isSelected(obj);
            const visible = obj.visible !== false;
            const locked =
              (obj as any).__layerLocked === true ||
              !!(obj.lockMovementX && obj.lockMovementY) ||
              obj.selectable === false ||
              obj.evented === false;
            const name = getLayerDisplayName(obj);
            return (
              <li
                key={(obj as any).__objectId ?? obj.toString()}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors",
                  selected
                    ? "border-[#5C38F3] bg-[#5C38F3]/20"
                    : "border-[#2D2D2D] bg-[#1F1F1F] hover:bg-[#252525]"
                )}
              >
                <button
                  type="button"
                  className="flex-1 flex items-center gap-2 min-w-0 text-left"
                  onClick={() => {
                    canvasRef.current?.setActiveObject(obj);
                    canvasRef.current?.renderAll();
                    onSelectLayer(obj);
                  }}
                  aria-label={`Select ${name}`}
                >
                  <span className="text-[13px] font-medium text-white truncate font-(family-name:--font-manrope)">
                    {name}
                  </span>
                </button>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleVisibilityToggle(obj);
                    }}
                    className="p-1.5 rounded text-white/70 hover:text-white hover:bg-white/10"
                    aria-label={visible ? "Hide layer" : "Show layer"}
                    title={visible ? "Hide" : "Show"}
                  >
                    {visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLockToggle(obj);
                    }}
                    className={cn(
                      "p-1.5 rounded hover:bg-white/10",
                      locked ? "text-amber-400" : "text-white/70 hover:text-white"
                    )}
                    aria-label={locked ? "Unlock layer" : "Lock layer"}
                    title={locked ? "Unlock" : "Lock"}
                  >
                    {locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBringToFront(obj);
                    }}
                    className="p-1.5 rounded text-white/70 hover:text-white hover:bg-white/10"
                    aria-label="Bring to front"
                    title="Bring to front"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSendToBack(obj);
                    }}
                    className="p-1.5 rounded text-white/70 hover:text-white hover:bg-white/10"
                    aria-label="Send to back"
                    title="Send to back"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
});
