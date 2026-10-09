"use client";

import { useEffect, useReducer } from "react";
import type { Canvas, FabricObject } from "fabric";
import { Image as ImageIcon, LayoutTemplate, Shapes, Type } from "lucide-react";
import { cn } from "@/lib/utils";
import { BRAND_SLOT_TYPES } from "@/lib/brand-templates/formats";
import type { BrandFormatPreset } from "@/lib/brand-templates/formats";
import type { BrandSlotProps, BrandSlotType } from "@/lib/brand-templates/types";
import { studioForm } from "./studio-ui";

type SlotObject = FabricObject & BrandSlotProps & { text?: string };

/** Which slot types make sense for each fabric object type. */
function allowedSlotTypes(obj: SlotObject): BrandSlotType[] {
  if (obj.type === "textbox" || obj.type === "i-text" || obj.type === "text") return ["text"];
  if (obj.type === "image") return ["image", "logo"];
  // Shapes act as photo frames: the user's image fills them.
  return ["image"];
}

function describeObject(obj: SlotObject): { label: string; icon: React.ReactNode } {
  if (typeof obj.text === "string") {
    return {
      label: obj.text.trim().slice(0, 40) || "Empty text",
      icon: <Type className="size-4" aria-hidden />,
    };
  }
  if (obj.type === "image") return { label: "Image", icon: <ImageIcon className="size-4" aria-hidden /> };
  return { label: `Shape (${obj.type})`, icon: <Shapes className="size-4" aria-hidden /> };
}

export function slugifySlotId(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

/** Slot ids that appear more than once (the layout can't be saved with duplicates). */
export function findDuplicateSlotIds(canvas: Canvas | null): string[] {
  if (!canvas) return [];
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const obj of canvas.getObjects().slice(1) as SlotObject[]) {
    if (!obj.slotId) continue;
    if (seen.has(obj.slotId)) dupes.add(obj.slotId);
    seen.add(obj.slotId);
  }
  return [...dupes];
}

export interface TemplateSlotsPanelProps {
  canvas: Canvas | null;
  selectedObject: FabricObject | null;
  /** Called after slot props change so history can snapshot them. */
  onSlotsChange: () => void;
  /** Saved layouts of other formats; shown while this format is still empty. */
  startFromFormats: BrandFormatPreset[];
  onStartFrom: (format: BrandFormatPreset) => void;
}

export function TemplateSlotsPanel({
  canvas,
  selectedObject,
  onSlotsChange,
  startFromFormats,
  onStartFrom,
}: TemplateSlotsPanelProps) {
  const [, rerender] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    if (!canvas) return;
    const events = ["object:added", "object:removed", "object:modified", "text:changed"] as const;
    events.forEach((e) => canvas.on(e, rerender));
    return () => events.forEach((e) => canvas.off(e, rerender));
  }, [canvas]);

  const objects = canvas ? ([...canvas.getObjects().slice(1)].reverse() as SlotObject[]) : [];
  const duplicates = new Set(findDuplicateSlotIds(canvas));

  const updateSlot = (obj: SlotObject, patch: Partial<BrandSlotProps>) => {
    const slotType = "slotType" in patch ? patch.slotType : obj.slotType;
    if (slotType && !allowedSlotTypes(obj).includes(slotType)) return;
    if (!slotType) {
      obj.set({ slotId: undefined, slotType: undefined, slotLabel: undefined } as never);
    } else {
      const label = patch.slotLabel ?? obj.slotLabel ?? "";
      obj.set({
        slotType,
        slotLabel: label,
        slotId: slugifySlotId(label) || undefined,
      } as never);
    }
    rerender();
    onSlotsChange();
  };

  const select = (obj: SlotObject) => {
    if (!canvas || !obj.selectable) return;
    canvas.setActiveObject(obj);
    canvas.requestRenderAll();
  };

  return (
    <div className={studioForm.section}>
      <p className={studioForm.hint}>
        Mark the elements users can change. Slots with the same name are linked across formats, so a
        headline written once appears in every size.
      </p>

      {objects.length === 0 && startFromFormats.length > 0 ? (
        <div className="flex flex-col gap-2">
          <span className={studioForm.label}>Start from another format</span>
          {startFromFormats.map((format) => (
            <button
              key={format.key}
              type="button"
              onClick={() => onStartFrom(format)}
              className={cn(studioForm.secondaryButton, "w-full justify-start")}
            >
              <LayoutTemplate className="size-4" aria-hidden />
              {format.label} ({format.ratio}) layout
            </button>
          ))}
        </div>
      ) : null}

      {objects.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/[0.12] p-4 text-center text-[13px] text-[#ADAAC0]">
          Add text, logos or shapes with the tools on the left.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {objects.map((obj, index) => {
            const { label, icon } = describeObject(obj);
            const allowed = allowedSlotTypes(obj);
            const isSelected = selectedObject === obj;
            const isDuplicate = !!obj.slotId && duplicates.has(obj.slotId);
            return (
              <li
                key={index}
                className={cn(
                  studioForm.layerItem,
                  "flex-col items-stretch gap-2 py-2.5",
                  isSelected && studioForm.layerItemSelected,
                )}
              >
                <button
                  type="button"
                  onClick={() => select(obj)}
                  className="flex min-w-0 cursor-pointer items-center gap-2 text-left text-[13px] font-semibold text-[#F5F4FB]"
                >
                  <span className="shrink-0 text-[#ADAAC0]">{icon}</span>
                  <span className="truncate">{label}</span>
                </button>
                <div className="flex gap-2">
                  <select
                    aria-label="Slot type"
                    value={obj.slotType ?? ""}
                    onChange={(e) =>
                      updateSlot(obj, {
                        slotType: (e.target.value || undefined) as BrandSlotType | undefined,
                        slotLabel:
                          obj.slotLabel ||
                          (e.target.value === "text" ? "Headline" : e.target.value === "logo" ? "Logo" : "Photo"),
                      })
                    }
                    className={cn(studioForm.selectTrigger, "h-9 w-[110px] shrink-0 text-[12.5px]")}
                  >
                    <option value="">Fixed</option>
                    {BRAND_SLOT_TYPES.filter((t) => allowed.includes(t.value)).map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label} slot
                      </option>
                    ))}
                  </select>
                  {obj.slotType ? (
                    <input
                      aria-label="Slot name"
                      value={obj.slotLabel ?? ""}
                      placeholder="Slot name"
                      maxLength={60}
                      onChange={(e) => updateSlot(obj, { slotLabel: e.target.value })}
                      className={cn(
                        studioForm.input,
                        "h-9 text-[12.5px]",
                        isDuplicate && "border-[#E5484D] focus:border-[#E5484D]",
                      )}
                    />
                  ) : null}
                </div>
                {isDuplicate ? (
                  <span className="text-[11.5px] text-[#FF8A8E]">
                    Another slot already uses this name.
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
