"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import type { Canvas, FabricObject } from "fabric";
import { Check, ImagePlus, LayoutGrid, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { BRAND_FORMATS, type BrandFormatPreset } from "@/lib/brand-templates/formats";
import type {
  BrandSlotProps,
  BrandTemplateVariant,
  BrandTemplateWithFormats,
} from "@/lib/brand-templates/types";
import { studioForm, StudioSliderRow } from "./studio-ui";
import type { LogoAsset } from "../types/image-editor-types";
import {
  DEFAULT_SLOT_CROP,
  fillPhotoSlot,
  isFilledPhotoSlot,
  readPhotoFile,
  replaceLogoSlot,
  updatePhotoCrop,
  type SlotObject,
} from "../lib/photo-slots";
import { studioToast } from "../utils/studio-toast";
import { StudioStateScreen } from "./StudioStateScreen";

/* ------------------------------------------------------------------ */
/* Gallery                                                             */
/* ------------------------------------------------------------------ */

function TemplateCard({
  template,
  active,
  onSelect,
  compact,
}: {
  template: BrandTemplateWithFormats;
  active: boolean;
  onSelect: () => void;
  compact?: boolean;
}) {
  const firstColor = template.variants.find((v) => v.kind === "color")?.value;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        "group flex min-w-0 cursor-pointer flex-col overflow-hidden rounded-[14px] border text-left transition-colors",
        active
          ? "border-[#8069FF] bg-[rgba(128,105,255,0.16)]"
          : "border-white/[0.09] bg-[#211E30] hover:border-white/[0.2] hover:bg-[#2C2942]",
      )}
    >
      <span
        className="relative flex aspect-square w-full items-center justify-center overflow-hidden bg-[#16141F]"
        style={!template.thumbnail_url && firstColor ? { backgroundColor: firstColor } : undefined}
      >
        {template.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={template.thumbnail_url}
            alt=""
            className="h-full w-full object-contain transition-transform duration-200 group-hover:scale-[1.02]"
          />
        ) : null}
        {active ? (
          <span className="absolute right-2 top-2 inline-flex size-6 items-center justify-center rounded-full bg-[#6146F2] text-white">
            <Check className="size-3.5" strokeWidth={3} aria-hidden />
          </span>
        ) : null}
      </span>
      <span className={cn("flex min-w-0 flex-col gap-0.5", compact ? "p-2" : "p-3")}>
        <span className={cn("truncate font-bold text-[#F5F4FB]", compact ? "text-[12.5px]" : "text-[14px]")}>
          {template.name}
        </span>
        {template.category ? (
          <span className="truncate text-[11.5px] text-[#ADAAC0]">{template.category}</span>
        ) : null}
      </span>
    </button>
  );
}

export function TemplateGallery({
  templates,
  activeTemplateId,
  onSelect,
  compact = false,
}: {
  templates: BrandTemplateWithFormats[];
  activeTemplateId?: string | null;
  onSelect: (template: BrandTemplateWithFormats) => void;
  compact?: boolean;
}) {
  const categories = Array.from(
    new Set(templates.map((t) => t.category).filter((c): c is string => !!c)),
  );
  const [category, setCategory] = useState<string | null>(null);
  const visible = category ? templates.filter((t) => t.category === category) : templates;

  return (
    <div className="flex flex-col gap-3">
      {categories.length > 1 ? (
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Template categories">
          {[null, ...categories].map((c) => (
            <button
              key={c ?? "__all"}
              type="button"
              role="tab"
              aria-selected={category === c}
              onClick={() => setCategory(c)}
              className={cn(
                "h-8 cursor-pointer rounded-full border px-3 text-[12.5px] font-bold transition-colors",
                category === c
                  ? "border-[#8069FF] bg-[rgba(128,105,255,0.16)] text-[#F5F4FB]"
                  : "border-white/[0.09] bg-[#211E30] text-[#ADAAC0] hover:text-[#F5F4FB]",
              )}
            >
              {c ?? "All"}
            </button>
          ))}
        </div>
      ) : null}
      <div className={cn("grid gap-2.5", compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4")}>
        {visible.map((t) => (
          <TemplateCard
            key={t.id}
            template={t}
            active={t.id === activeTemplateId}
            compact={compact}
            onSelect={() => onSelect(t)}
          />
        ))}
      </div>
    </div>
  );
}

/** First screen in template mode, before a template is on the canvas. */
export function TemplateGalleryScreen({
  templates,
  onSelect,
}: {
  templates: BrandTemplateWithFormats[];
  onSelect: (template: BrandTemplateWithFormats) => void;
}) {
  return (
    <StudioStateScreen subtitle="Templates" showDock={false}>
      <div className="flex h-full w-full max-w-[960px] flex-col gap-5 self-stretch overflow-y-auto">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-[-0.01em] text-[#F5F4FB]">
            Start from a template
          </h1>
          <p className={cn(studioForm.hint, "mt-1")}>
            Pick a design. You can change its colors and texts, and add your own touches.
          </p>
        </div>
        {templates.length > 0 ? (
          <TemplateGallery templates={templates} onSelect={onSelect} />
        ) : (
          <div className="rounded-[14px] border border-dashed border-white/[0.12] p-8 text-center">
            <LayoutGrid className="mx-auto mb-2 size-6 text-[#ADAAC0]" aria-hidden />
            <p className="text-[14px] font-bold text-[#F5F4FB]">No templates available yet</p>
            <p className={cn(studioForm.hint, "mt-1")}>
              Your organization doesn&apos;t have Branding templates set up.
            </p>
          </div>
        )}
      </div>
    </StudioStateScreen>
  );
}

/* ------------------------------------------------------------------ */
/* Panel                                                               */
/* ------------------------------------------------------------------ */

type TextSlotObject = FabricObject & BrandSlotProps & { text?: string };

function getTextSlots(canvas: Canvas | null): TextSlotObject[] {
  if (!canvas) return [];
  return (canvas.getObjects().slice(1) as TextSlotObject[]).filter(
    (o) => o.slotType === "text" && typeof o.text === "string",
  );
}

function VariantSwatch({
  variant,
  active,
  disabled,
  onClick,
}: {
  variant: BrandTemplateVariant;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const label = variant.label || (variant.kind === "color" ? variant.value : "Image");
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "relative size-11 shrink-0 cursor-pointer overflow-hidden rounded-[11px] border-2 transition-transform disabled:cursor-wait",
        active ? "border-[#8069FF]" : "border-white/[0.12] hover:scale-105",
      )}
      style={variant.kind === "color" ? { backgroundColor: variant.value } : undefined}
    >
      {variant.kind === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={variant.value} alt="" className="h-full w-full object-cover" />
      ) : null}
      {active ? (
        <span className="absolute inset-0 flex items-center justify-center bg-black/25">
          <Check className="size-4 text-white" strokeWidth={3} aria-hidden />
        </span>
      ) : null}
    </button>
  );
}

function getMediaSlots(canvas: Canvas | null): SlotObject[] {
  if (!canvas) return [];
  return (canvas.getObjects().slice(1) as SlotObject[]).filter(
    (o) => !!o.slotId && (o.slotType === "image" || o.slotType === "logo"),
  );
}

function PhotoSlotRow({
  canvas,
  slot,
  selected,
  onPick,
  onChange,
}: {
  canvas: Canvas;
  slot: SlotObject;
  selected: boolean;
  onPick: (slot: SlotObject) => void;
  onChange: () => void;
}) {
  const filled = isFilledPhotoSlot(slot);
  const crop = slot.slotCrop ?? DEFAULT_SLOT_CROP;
  const setCrop = (patch: Partial<typeof crop>) => {
    updatePhotoCrop(canvas, slot, { ...crop, ...patch });
    onChange();
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-2.5 rounded-[12px] border p-2.5",
        selected ? "border-[#8069FF] bg-[rgba(128,105,255,0.08)]" : "border-white/[0.09] bg-[#211E30]",
      )}
    >
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => {
            canvas.setActiveObject(slot);
            canvas.requestRenderAll();
          }}
          className="size-11 shrink-0 cursor-pointer overflow-hidden rounded-[8px] bg-[#16141F]"
          aria-label={`Select ${slot.slotLabel || "photo"}`}
        >
          {filled && slot.getSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={slot.getSrc()} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImagePlus className="m-auto size-4 text-[#ADAAC0]" aria-hidden />
          )}
        </button>
        <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-[#F5F4FB]">
          {slot.slotLabel || "Photo"}
        </span>
        <button
          type="button"
          onClick={() => onPick(slot)}
          className="h-8 shrink-0 cursor-pointer rounded-[9px] border border-white/[0.09] px-2.5 text-[12px] font-bold text-[#F5F4FB] hover:bg-[#2C2942]"
        >
          {filled ? "Replace" : "Add photo"}
        </button>
      </div>
      {filled ? (
        <div className="flex flex-col gap-2">
          <StudioSliderRow
            label="Zoom"
            value={crop.zoom}
            displayValue={`${crop.zoom.toFixed(1)}×`}
            min={1}
            max={4}
            step={0.05}
            onChange={(zoom) => setCrop({ zoom })}
          />
          <StudioSliderRow
            label="Left / right"
            value={Math.round(crop.fx * 100)}
            displayValue={`${Math.round(crop.fx * 100)}%`}
            min={0}
            max={100}
            step={1}
            onChange={(v) => setCrop({ fx: v / 100 })}
          />
          <StudioSliderRow
            label="Up / down"
            value={Math.round(crop.fy * 100)}
            displayValue={`${Math.round(crop.fy * 100)}%`}
            min={0}
            max={100}
            step={1}
            onChange={(v) => setCrop({ fy: v / 100 })}
          />
        </div>
      ) : null}
    </div>
  );
}

function LogoSlotRow({
  canvas,
  slot,
  logoAssets,
  onChange,
}: {
  canvas: Canvas;
  slot: SlotObject;
  logoAssets: LogoAsset[];
  onChange: () => void;
}) {
  const current = slot.getSrc?.();
  return (
    <div className="flex flex-col gap-2 rounded-[12px] border border-white/[0.09] bg-[#211E30] p-2.5">
      <span className="text-[13px] font-bold text-[#F5F4FB]">{slot.slotLabel || "Logo"}</span>
      <div className="flex flex-wrap gap-2">
        {logoAssets.map((logo) => (
          <button
            key={logo.url}
            type="button"
            title={logo.display_name}
            aria-pressed={current === logo.url}
            onClick={async () => {
              try {
                await replaceLogoSlot(canvas, slot, logo.url);
                onChange();
              } catch {
                studioToast.error({ title: "Could not load that logo" });
              }
            }}
            className={cn(
              "flex size-14 cursor-pointer items-center justify-center rounded-[10px] border bg-[#16141F] p-1.5",
              current === logo.url ? "border-[#8069FF]" : "border-white/[0.09] hover:border-white/[0.2]",
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo.url} alt={logo.display_name} className="max-h-full max-w-full object-contain" />
          </button>
        ))}
      </div>
    </div>
  );
}

export interface TemplatesPanelProps {
  canvas: Canvas | null;
  templates: BrandTemplateWithFormats[];
  template: BrandTemplateWithFormats;
  format: BrandFormatPreset;
  variant: BrandTemplateVariant | null;
  isApplyingVariant: boolean;
  onSelectTemplate: (template: BrandTemplateWithFormats) => void;
  onSelectFormat: (format: BrandFormatPreset) => void;
  onSelectVariant: (variant: BrandTemplateVariant) => void;
  /** Called (debounced by history) after a slot's text changes. */
  onTextChange: () => void;
  /** Called after a photo/logo slot changes (history snapshot). */
  onMediaChange: (immediate: boolean) => void;
  selectedObject: FabricObject | null;
  logoAssets: LogoAsset[];
}

export function TemplatesPanel({
  canvas,
  templates,
  template,
  format,
  variant,
  isApplyingVariant,
  onSelectTemplate,
  onSelectFormat,
  onSelectVariant,
  onTextChange,
  onMediaChange,
  selectedObject,
  logoAssets,
}: TemplatesPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingSlotRef = useRef<SlotObject | null>(null);
  const [isLoadingPhoto, setIsLoadingPhoto] = useState(false);
  const [browsing, setBrowsing] = useState(false);
  const [, rerender] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    if (!canvas) return;
    const events = ["object:added", "object:removed", "object:modified", "text:changed"] as const;
    events.forEach((e) => canvas.on(e, rerender));
    return () => events.forEach((e) => canvas.off(e, rerender));
  }, [canvas]);

  const textSlots = getTextSlots(canvas);
  const mediaSlots = getMediaSlots(canvas);
  const photoSlots = mediaSlots.filter((o) => o.slotType === "image");
  const logoSlots = logoAssets.length > 0 ? mediaSlots.filter((o) => o.slotType === "logo") : [];

  const pickPhoto = (slot: SlotObject) => {
    pendingSlotRef.current = slot;
    fileInputRef.current?.click();
  };

  const handlePhotoFile = async (file: File | undefined) => {
    const slot = pendingSlotRef.current;
    pendingSlotRef.current = null;
    if (!file || !slot || !canvas) return;
    if (!file.type.startsWith("image/")) {
      studioToast.error({ title: "Choose an image file" });
      return;
    }
    setIsLoadingPhoto(true);
    try {
      const dataUrl = await readPhotoFile(file);
      await fillPhotoSlot(canvas, slot, dataUrl);
      rerender();
      onMediaChange(true);
    } catch (err) {
      console.error("[templates] photo slot failed:", err);
      studioToast.error({ title: "Could not add that photo" });
    } finally {
      setIsLoadingPhoto(false);
    }
  };
  const savedKeys = new Set(template.formats.map((f) => f.format_key));
  const availableFormats = BRAND_FORMATS.filter((f) => savedKeys.has(f.key));

  const updateText = (obj: TextSlotObject, text: string) => {
    if (!canvas) return;
    obj.set({ text } as never);
    obj.setCoords();
    canvas.requestRenderAll();
    rerender();
    onTextChange();
  };

  if (browsing) {
    return (
      <div className={studioForm.section}>
        <div className="flex items-center justify-between gap-2">
          <span className={studioForm.label}>Choose a template</span>
          <button
            type="button"
            onClick={() => setBrowsing(false)}
            className="cursor-pointer text-[12.5px] font-bold text-[#8069FF] hover:text-[#A594FF]"
          >
            Cancel
          </button>
        </div>
        <p className={studioForm.hint}>Switching templates replaces your current design.</p>
        <TemplateGallery
          templates={templates}
          activeTemplateId={template.id}
          compact
          onSelect={(t) => {
            setBrowsing(false);
            if (t.id !== template.id) onSelectTemplate(t);
          }}
        />
      </div>
    );
  }

  return (
    <div className={studioForm.section}>
      <div className="flex items-center gap-3 rounded-[12px] border border-white/[0.09] bg-[#211E30] p-2.5">
        <div
          className="size-12 shrink-0 overflow-hidden rounded-[8px] bg-[#16141F]"
          style={!template.thumbnail_url && variant?.kind === "color" ? { backgroundColor: variant.value } : undefined}
        >
          {template.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={template.thumbnail_url} alt="" className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-bold text-[#F5F4FB]">{template.name}</p>
          <p className="text-[11.5px] text-[#ADAAC0]">
            {format.label} · {format.width}×{format.height}
          </p>
        </div>
        {templates.length > 1 ? (
          <button
            type="button"
            onClick={() => setBrowsing(true)}
            className="h-8 shrink-0 cursor-pointer rounded-[9px] border border-white/[0.09] px-2.5 text-[12px] font-bold text-[#F5F4FB] hover:bg-[#2C2942]"
          >
            Change
          </button>
        ) : null}
      </div>

      {availableFormats.length > 1 ? (
        <div className="flex flex-col gap-2">
          <span className={studioForm.label}>Size</span>
          <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Format">
            {availableFormats.map((f) => {
              const active = f.key === format.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  title={`${f.label} · ${f.width}×${f.height} · ${f.hint}`}
                  onClick={() => !active && onSelectFormat(f)}
                  className={cn(
                    "flex h-14 cursor-pointer flex-col items-center justify-center gap-1 rounded-[10px] border text-[12px] font-bold transition-colors",
                    active
                      ? "border-[#8069FF] bg-[rgba(128,105,255,0.16)] text-[#F5F4FB]"
                      : "border-white/[0.09] bg-[#211E30] text-[#ADAAC0] hover:bg-[#2C2942] hover:text-[#F5F4FB]",
                  )}
                >
                  <span
                    aria-hidden
                    className="rounded-[2px] border-[1.5px] border-current"
                    style={{
                      width: f.width >= f.height ? 18 : (18 * f.width) / f.height,
                      height: f.height >= f.width ? 18 : (18 * f.height) / f.width,
                    }}
                  />
                  {f.ratio}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {template.variants.length > 1 ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className={studioForm.label}>Background</span>
            {isApplyingVariant ? <Loader2 className="size-3.5 animate-spin text-[#ADAAC0]" /> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {template.variants.map((v) => (
              <VariantSwatch
                key={v.id}
                variant={v}
                active={v.id === variant?.id}
                disabled={isApplyingVariant}
                onClick={() => onSelectVariant(v)}
              />
            ))}
          </div>
        </div>
      ) : null}

      {photoSlots.length > 0 || logoSlots.length > 0 ? (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <span className={studioForm.label}>Photos & logos</span>
            {isLoadingPhoto ? <Loader2 className="size-3.5 animate-spin text-[#ADAAC0]" /> : null}
          </div>
          {canvas
            ? photoSlots.map((slot, i) => (
                <PhotoSlotRow
                  key={`${slot.slotId}-${i}`}
                  canvas={canvas}
                  slot={slot}
                  selected={selectedObject === slot}
                  onPick={pickPhoto}
                  onChange={() => {
                    rerender();
                    onMediaChange(false);
                  }}
                />
              ))
            : null}
          {canvas
            ? logoSlots.map((slot, i) => (
                <LogoSlotRow
                  key={`${slot.slotId}-${i}`}
                  canvas={canvas}
                  slot={slot}
                  logoAssets={logoAssets}
                  onChange={() => {
                    rerender();
                    onMediaChange(true);
                  }}
                />
              ))
            : null}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              void handlePhotoFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
      ) : null}

      {textSlots.length > 0 ? (
        <div className="flex flex-col gap-2.5">
          <span className={studioForm.label}>Texts</span>
          {textSlots.map((obj, index) => (
            <label key={obj.slotId ?? index} className="flex flex-col gap-1.5">
              <span className="text-[12px] font-semibold text-[#ADAAC0]">
                {obj.slotLabel || `Text ${index + 1}`}
              </span>
              <textarea
                value={obj.text ?? ""}
                rows={Math.min(4, Math.max(2, (obj.text ?? "").split("\n").length))}
                onChange={(e) => updateText(obj, e.target.value)}
                onFocus={() => {
                  if (!canvas || !obj.selectable) return;
                  canvas.setActiveObject(obj);
                  canvas.requestRenderAll();
                }}
                className={cn(studioForm.input, "h-auto resize-none py-2.5 leading-[1.4]")}
              />
            </label>
          ))}
          <p className="text-[11.5px] text-[#726F86]">
            Use Text Tools to change fonts, colors and sizes.
          </p>
        </div>
      ) : null}
    </div>
  );
}
