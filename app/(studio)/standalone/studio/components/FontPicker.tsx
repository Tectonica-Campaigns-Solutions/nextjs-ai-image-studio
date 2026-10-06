"use client";

import React from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FontAsset } from "../types/image-editor-types";
import { buildFontPickerGroups } from "../utils/font-picker-groups";
import { normalizeFontCatalogKey } from "../utils/build-google-font-css2-url";
import { getPreviewFontFamily, useFontPreviews } from "../hooks/use-font-previews";
import { studioForm } from "./studio-ui";

const GROUP_HEADING_CLASS =
  "[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-[#726F86]";

export interface FontPickerProps {
  fontAssets: FontAsset[];
  fontFamily: string;
  setFontFamily: (family: string) => void;
  disabled?: boolean;
  side?: "top" | "bottom";
  triggerClassName?: string;
}

export function FontPicker({
  fontAssets,
  fontFamily,
  setFontFamily,
  disabled = false,
  side = "bottom",
  triggerClassName,
}: FontPickerProps) {
  const [open, setOpen] = React.useState(false);
  useFontPreviews(open);

  const groups = React.useMemo(() => buildFontPickerGroups(fontAssets), [fontAssets]);
  const selectedKey = normalizeFontCatalogKey(fontFamily);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-expanded={open}
          aria-haspopup="listbox"
          className={cn(
            studioForm.selectTrigger,
            "flex w-full items-center justify-between gap-2 text-left",
            disabled && "opacity-50 pointer-events-none",
            triggerClassName,
          )}
        >
          <span className="truncate">{fontFamily}</span>
          <ChevronDown
            className={cn("size-4 shrink-0 opacity-80 transition-transform", open && "rotate-180")}
            aria-hidden
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side={side}
        collisionPadding={8}
        className="flex max-h-[var(--radix-popover-content-available-height)] w-[min(100vw-1.5rem,22rem)] flex-col overflow-hidden rounded-[10px] border border-white/[0.17] bg-[#211E30] p-0 text-[#F5F4FB] shadow-[0_18px_40px_-16px_rgba(0,0,0,0.7)]"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command
          className="min-h-0 bg-[#211E30] text-[#F5F4FB] [&_[cmdk-input-wrapper]]:border-white/[0.09] [&_[cmdk-input-wrapper]]:border-b"
          filter={(value, search) => {
            if (!search.trim()) return 1;
            return value.toLowerCase().includes(search.toLowerCase().trim()) ? 1 : 0;
          }}
        >
          <CommandInput
            placeholder="Search fonts…"
            className="h-10 border-0 bg-transparent text-[13.5px] text-[#F5F4FB] placeholder:text-[#726F86]"
          />
          <CommandList className="max-h-[min(60vh,360px)] min-h-0 flex-1">
            <CommandEmpty className="py-6 text-[13px] text-[#ADAAC0]">No fonts match.</CommandEmpty>
            {groups.map((group) => (
              <CommandGroup key={group.id} heading={group.label} className={GROUP_HEADING_CLASS}>
                {group.options.map((option) => {
                  const previewFamily = option.isOrg
                    ? `"${option.family}", system-ui, sans-serif`
                    : getPreviewFontFamily(option.family);
                  const isSelected = normalizeFontCatalogKey(option.family) === selectedKey;
                  return (
                    <CommandItem
                      key={`${group.id}-${option.family}`}
                      value={`${option.family} ${group.label}`}
                      onSelect={() => {
                        setFontFamily(option.family);
                        setOpen(false);
                      }}
                      className="flex items-center gap-2 text-[16px] text-[#F5F4FB] aria-selected:bg-[rgba(128,105,255,0.16)] data-[selected=true]:bg-[rgba(128,105,255,0.16)]"
                    >
                      <Check
                        className={cn("size-4 shrink-0 text-[#8069FF]", !isSelected && "invisible")}
                        aria-hidden
                      />
                      {option.sample ? (
                        <>
                          <span className="truncate text-[13.5px]">{option.family}</span>
                          <span
                            className="ml-auto shrink-0 text-[#ADAAC0]"
                            style={{ fontFamily: previewFamily }}
                            aria-hidden
                          >
                            {option.sample}
                          </span>
                        </>
                      ) : (
                        <span className="truncate" style={{ fontFamily: previewFamily }}>
                          {option.family}
                        </span>
                      )}
                      {option.isPrimary ? (
                        <span className="ml-auto shrink-0 rounded-full bg-[rgba(128,105,255,0.22)] px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-[#C9BFFF]">
                          Primary
                        </span>
                      ) : null}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
