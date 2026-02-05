"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { LogoAsset } from "../types/image-editor-types";
import { cn } from "@/lib/utils";

export interface LogoToolsPanelProps {
  logoStyle: string;
  setLogoStyle: (s: string) => void;
  selectedVariant: string | null;
  setSelectedVariant: (s: string | null) => void;
  availableVariants: string[];
  filteredLogoAssets: LogoAsset[];
  logoSize: number;
  setLogoSize: (n: number) => void;
  logoOpacity: number;
  setLogoOpacity: (n: number) => void;
  handleInsertDefaultLogo: (path: string) => void;
  handleLogoFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** When false, size and opacity controls are disabled (no logo overlay selected on canvas). */
  isLogoSelected?: boolean;
}

export const LogoToolsPanel = React.memo(function LogoToolsPanel({
  logoStyle,
  setLogoStyle,
  selectedVariant,
  setSelectedVariant,
  availableVariants,
  filteredLogoAssets,
  logoSize,
  setLogoSize,
  logoOpacity,
  setLogoOpacity,
  handleInsertDefaultLogo,
  handleLogoFileUpload,
  isLogoSelected = false,
}: LogoToolsPanelProps) {
  return (
    <div className="space-y-4">
      {availableVariants.length > 0 && (
        <div className="space-y-3">
          <Label className="text-[13px] leading-[110%] font-semibold text-[#F4F4F4] font-(family-name:--font-manrope) block">
            Select a variant
          </Label>
          <RadioGroup
            value={selectedVariant || ""}
            onValueChange={(value) => {
              setSelectedVariant(value);
              setLogoStyle("none");
            }}
            className="space-y-2"
          >
            {availableVariants.map((variant) => (
              <div key={variant} className="flex items-center space-x-2">
                <RadioGroupItem value={variant} id={`variant-${variant}`}
                  // 
                  className="bg-[#0D0D0D] border-[#2D2D2D] [&_svg]:fill-[#5C38F3]"
                // 
                />
                <Label
                  htmlFor={`variant-${variant}`}
                  className="text-[13px] leading-[135%] text-[#F4F4F4] font-(family-name:--font-manrope) cursor-pointer"
                >
                  {variant}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      )}

      <div>
        <Select
          value={logoStyle}
          onValueChange={(value) => {
            const v = value;
            if (v === "none") {
              setLogoStyle("none");
              return;
            }
            if (v === "custom") {
              document.getElementById("logoFileInput")?.click();
              setLogoStyle("none");
              return;
            }
            if (v.startsWith("asset:")) {
              const assetUrl = decodeURIComponent(v.replace("asset:", ""));
              handleInsertDefaultLogo(assetUrl);
              setLogoStyle("none");
              return;
            }
          }}
          disabled={availableVariants.length > 0 && !selectedVariant}
        >
          <SelectTrigger className="w-full bg-[#0D0D0D] py-[10px] px-[16px] border-[#2D2D2D] text-[13px] font-medium leading-[135%] text-white font-(family-name:--font-manrope) h-[44px]! rounded-[10px] transition-all hover:border-[#444] focus:ring-2 focus:ring-[#5C38F3]/20 disabled:opacity-50 disabled:cursor-not-allowed">
            <SelectValue
              placeholder={
                availableVariants.length > 0 && !selectedVariant
                  ? "Select a variant first"
                  : "Select Logo"
              }
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none" disabled>
              Select Logo
            </SelectItem>
            {filteredLogoAssets.length > 0 &&
              filteredLogoAssets.map((asset) => (
                <SelectItem
                  key={`${asset.url}-${asset.display_name}`}
                  value={`asset:${encodeURIComponent(asset.url)}`}
                >
                  {asset.display_name}
                </SelectItem>
              ))}
            <SelectItem value="custom">Upload Custom Logo</SelectItem>
          </SelectContent>
        </Select>
        {availableVariants.length > 0 && !selectedVariant && (
          <p className="text-xs text-[#929292] mt-2">
            Please select a variant to see the available logos
          </p>
        )}
      </div>
      <div>
        <Input
          id="logoFileInput"
          type="file"
          accept="image/*"
          onChange={handleLogoFileUpload}
          className="sr-only w-fit"
        />
      </div>

      <div
        className={cn(
          "grid grid-cols-[auto_1fr_50px] gap-[11px] items-center",
          !isLogoSelected && "opacity-50 pointer-events-none"
        )}
      >
        <Label className="text-[13px] leading-[110%] font-semibold text-[#F4F4F4] font-(family-name:--font-manrope) block">
          Size
        </Label>
        <Slider
          value={[logoSize]}
          onValueChange={([value]) => setLogoSize(value)}
          min={50}
          max={400}
          step={10}
          disabled={!isLogoSelected}
          className={cn(
            "w-full",
            // Parte inactiva
            "[&_[data-slot=slider-track]]:bg-[#303030c4]",
            // Parte activa
            "[&_[data-slot=slider-range]]:bg-[#5C38F3_!important]",
            // Esfera / handle
            "[&_[role=slider]]:bg-[#FFF] [&_[role=slider]]:border-[1px] [&_[role=slider]]:border-[#9094A4]"
          )}
        />
        <div className="p-[5px] rounded-[5px] border border-[#303030] font-(family-name:--font-manrope) text-[13px] font-medium leading-[135%] text-[#929292] text-center transition-colors hover:border-[#444]">
          {logoSize}px
        </div>
      </div>
      <div
        className={cn(
          "grid grid-cols-[auto_1fr_50px] gap-[11px] items-center",
          !isLogoSelected && "opacity-50 pointer-events-none"
        )}
      >
        <Label className="text-[13px] leading-[110%] font-semibold text-[#F4F4F4] font-(family-name:--font-manrope) block">
          Opacity
        </Label>
        <Slider
          value={[logoOpacity]}
          onValueChange={([value]) => setLogoOpacity(value)}
          min={10}
          max={100}
          step={5}
          disabled={!isLogoSelected}
          className={cn(
            "w-full",
            // Parte inactiva
            "[&_[data-slot=slider-track]]:bg-[#303030c4]",
            // Parte activa
            "[&_[data-slot=slider-range]]:bg-[#5C38F3_!important]",
            // Esfera / handle
            "[&_[role=slider]]:bg-[#FFF] [&_[role=slider]]:border-[1px] [&_[role=slider]]:border-[#9094A4]"
          )}
        />
        <div className="p-[5px] rounded-[5px] border border-[#303030] font-(family-name:--font-manrope) text-[13px] font-medium leading-[135%] text-[#929292] text-center transition-colors hover:border-[#444]">
          {logoOpacity}%
        </div>
      </div>
    </div>
  );
});
