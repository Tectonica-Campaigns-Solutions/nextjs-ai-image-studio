"use client";

import { Loader2, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { BRAND_FORMATS, type BrandFormatPreset } from "@/lib/brand-templates/formats";
import { StudioActionButton } from "./studio-ui";
import { UI_COLORS } from "../constants/editor-constants";

function formatHref(templateId: string, format: BrandFormatPreset): string {
  const params = new URLSearchParams({
    mode: "template-author",
    template_id: templateId,
    format: format.key,
  });
  return `?${params.toString()}`;
}

/** Bottom bar in template-author mode: switch format, save the layout. */
export function TemplateAuthorActionBar({
  templateId,
  currentFormat,
  isDirty,
  isSaving,
  onSave,
}: {
  templateId: string;
  currentFormat: BrandFormatPreset;
  isDirty: boolean;
  isSaving: boolean;
  onSave: () => void;
}) {
  return (
    <div
      className="hidden md:flex shrink-0 items-center gap-2.5 border-t px-[18px] py-[14px]"
      style={{ background: UI_COLORS.PRIMARY_BG, borderColor: UI_COLORS.BORDER }}
    >
      <span className="mr-1 text-[12px] font-bold uppercase tracking-[0.12em]" style={{ color: UI_COLORS.TEXT_FAINT }}>
        Format
      </span>
      <nav className="flex gap-1.5" aria-label="Template formats">
        {BRAND_FORMATS.map((format) => {
          const active = format.key === currentFormat.key;
          return (
            <a
              key={format.key}
              href={formatHref(templateId, format)}
              aria-current={active ? "page" : undefined}
              title={`${format.label} · ${format.width}×${format.height} · ${format.hint}`}
              className={cn(
                "inline-flex h-9 items-center rounded-[10px] border px-3 text-[13px] font-bold transition-colors",
                active
                  ? "border-[#8069FF] bg-[rgba(128,105,255,0.16)] text-[#F5F4FB]"
                  : "border-white/[0.09] bg-[#211E30] text-[#ADAAC0] hover:bg-[#2C2942] hover:text-[#F5F4FB]",
              )}
            >
              {format.ratio}
            </a>
          );
        })}
      </nav>

      <div className="flex-1" />

      <span className="text-[12.5px]" style={{ color: UI_COLORS.TEXT_FAINT }}>
        {isDirty ? "Unsaved changes" : "All changes saved"}
      </span>
      <StudioActionButton
        label="Save layout"
        variant="primary"
        onClick={onSave}
        disabled={isSaving}
        icon={isSaving ? <Loader2 className="size-[18px] animate-spin" /> : <Save className="size-[18px]" strokeWidth={2.2} />}
      >
        {isSaving ? "Saving..." : "Save layout"}
      </StudioActionButton>
    </div>
  );
}
