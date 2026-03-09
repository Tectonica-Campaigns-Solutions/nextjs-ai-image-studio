"use client";

import { useCallback } from "react";

export type AlignOption =
  | "align-left"
  | "align-center-h"
  | "align-right"
  | "align-top"
  | "align-center-v"
  | "align-bottom"
  | "distribute-h"
  | "distribute-v";

function getBoundingRect(obj: any): { left: number; top: number; width: number; height: number } {
  if (typeof obj.getBoundingRect === "function") {
    return obj.getBoundingRect();
  }
  const coords = obj.getCoords?.();
  if (coords && coords.length >= 4) {
    const xs = coords.map((p: { x: number }) => p.x);
    const ys = coords.map((p: { y: number }) => p.y);
    return {
      left: Math.min(...xs),
      top: Math.min(...ys),
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys),
    };
  }
  const w = (obj.getScaledWidth?.() ?? obj.width ?? 0) * (obj.scaleX ?? 1);
  const h = (obj.getScaledHeight?.() ?? obj.height ?? 0) * (obj.scaleY ?? 1);
  return {
    left: (obj.left ?? 0) - (obj.originX === "center" ? w / 2 : obj.originX === "right" ? w : 0),
    top: (obj.top ?? 0) - (obj.originY === "center" ? h / 2 : obj.originY === "bottom" ? h : 0),
    width: w,
    height: h,
  };
}

export function useAlignmentTools(canvasRef: React.MutableRefObject<any>) {
  const runAlign = useCallback(
    (option: AlignOption) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const active = canvas.getActiveObject();
      if (!active) return;

      const cw = canvas.width ?? 0;
      const ch = canvas.height ?? 0;
      if (cw <= 0 || ch <= 0) return;

      if ((active as any).type === "activeSelection" && typeof (active as any).getObjects === "function") {
        const objects = (active as any).getObjects().filter((o: any) => !o.isBackground);
        if (objects.length === 0) return;
        if (option.startsWith("distribute")) {
          if (objects.length < 3) return;
          objects.forEach((o: any) => o.setCoords?.());
          const items = objects.map((o: any) => ({ o, rect: getBoundingRect(o) }));
          if (option === "distribute-h") {
            const sorted = [...items].sort((a, b) => a.rect.left - b.rect.left);
            const minLeft = sorted[0].rect.left;
            const maxRight = sorted[sorted.length - 1].rect.left + sorted[sorted.length - 1].rect.width;
            const totalWidth = maxRight - minLeft;
            const totalObjWidth = sorted.reduce((s, { rect }) => s + rect.width, 0);
            const gap = (totalWidth - totalObjWidth) / (sorted.length - 1);
            let x = minLeft;
            for (const { o, rect } of sorted) {
              const dx = x - rect.left;
              o.set({ left: (o.left ?? 0) + dx });
              o.setCoords?.();
              x += rect.width + gap;
            }
          } else {
            const sorted = [...items].sort((a, b) => a.rect.top - b.rect.top);
            const minTop = sorted[0].rect.top;
            const maxBottom = sorted[sorted.length - 1].rect.top + sorted[sorted.length - 1].rect.height;
            const totalHeight = maxBottom - minTop;
            const totalObjHeight = sorted.reduce((s, { rect }) => s + rect.height, 0);
            const gap = (totalHeight - totalObjHeight) / (sorted.length - 1);
            let y = minTop;
            for (const { o, rect } of sorted) {
              const dy = y - rect.top;
              o.set({ top: (o.top ?? 0) + dy });
              o.setCoords?.();
              y += rect.height + gap;
            }
          }
        } else {
          const bbox = getBoundingRect(active);
          let deltaX = 0;
          let deltaY = 0;
          switch (option) {
            case "align-left":
              deltaX = 0 - bbox.left;
              break;
            case "align-center-h":
              deltaX = cw / 2 - (bbox.left + bbox.width / 2);
              break;
            case "align-right":
              deltaX = cw - (bbox.left + bbox.width);
              break;
            case "align-top":
              deltaY = 0 - bbox.top;
              break;
            case "align-center-v":
              deltaY = ch / 2 - (bbox.top + bbox.height / 2);
              break;
            case "align-bottom":
              deltaY = ch - (bbox.top + bbox.height);
              break;
            default:
              return;
          }
          active.set({
            left: (active.left ?? 0) + deltaX,
            top: (active.top ?? 0) + deltaY,
          });
          active.setCoords?.();
        }
      } else {
        if ((active as any).isBackground) return;
        active.setCoords?.();
        const bbox = getBoundingRect(active);
        let deltaX = 0;
        let deltaY = 0;
        switch (option) {
          case "align-left":
            deltaX = 0 - bbox.left;
            break;
          case "align-center-h":
            deltaX = cw / 2 - (bbox.left + bbox.width / 2);
            break;
          case "align-right":
            deltaX = cw - (bbox.left + bbox.width);
            break;
          case "align-top":
            deltaY = 0 - bbox.top;
            break;
          case "align-center-v":
            deltaY = ch / 2 - (bbox.top + bbox.height / 2);
            break;
          case "align-bottom":
            deltaY = ch - (bbox.top + bbox.height);
            break;
          case "distribute-h":
          case "distribute-v":
            return;
          default:
            return;
        }
        active.set({
          left: (active.left ?? 0) + deltaX,
          top: (active.top ?? 0) + deltaY,
        });
        active.setCoords?.();
      }
      canvas.requestRenderAll();
    },
    [canvasRef]
  );

  return { runAlign };
}
