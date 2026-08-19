"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { StudioSliderRow, studioForm } from "./studio-ui";

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
  isLogoSelected?: boolean;
  allowCustomLogo?: boolean;
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
  allowCustomLogo = true,
}: LogoToolsPanelProps) {
  return (
    <div className={studioForm.section}>
      {availableVariants.length > 0 && (
        <div className="flex flex-col gap-3">
          <Label className={studioForm.label}>Select a variant</Label>
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
                <RadioGroupItem
                  value={variant}
                  id={`variant-${variant}`}
                  className="border-white/[0.17] bg-[#211E30] text-[#8069FF]"
                />
                <Label htmlFor={`variant-${variant}`} className={cn(studioForm.hint, "cursor-pointer")}>
                  {variant}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      )}

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
          }
        }}
        disabled={availableVariants.length > 0 && !selectedVariant}
      >
        <SelectTrigger className={studioForm.selectTriggerLarge}>
          <SelectValue
            placeholder={
              availableVariants.length > 0 && !selectedVariant
                ? "Select a variant first"
                : "Select Logo"
            }
          />
        </SelectTrigger>
        <SelectContent className={studioForm.selectContent}>
          <SelectItem value="none" disabled className={studioForm.selectItem}>
            Select Logo
          </SelectItem>
          {filteredLogoAssets.map((asset) => (
            <SelectItem
              key={`${asset.url}-${asset.display_name}`}
              value={`asset:${encodeURIComponent(asset.url)}`}
              className={studioForm.selectItem}
            >
              {asset.display_name}
            </SelectItem>
          ))}
          {allowCustomLogo !== false && (
            <SelectItem value="custom" className={studioForm.selectItem}>
              Upload Custom Logo
            </SelectItem>
          )}
        </SelectContent>
      </Select>

      {availableVariants.length > 0 && !selectedVariant && (
        <p className={studioForm.hint}>Please select a variant to see the available logos</p>
      )}

      <Input
        id="logoFileInput"
        type="file"
        accept="image/*"
        onChange={handleLogoFileUpload}
        className="sr-only"
      />

      <div className={cn(!isLogoSelected && "pointer-events-none opacity-50")}>
        <StudioSliderRow
          label="Size"
          value={logoSize}
          displayValue={`${logoSize}px`}
          min={50}
          max={400}
          step={10}
          onChange={setLogoSize}
          disabled={!isLogoSelected}
        />
      </div>
      <div className={cn(!isLogoSelected && "pointer-events-none opacity-50")}>
        <StudioSliderRow
          label="Opacity"
          value={logoOpacity}
          displayValue={`${logoOpacity}%`}
          min={10}
          max={100}
          step={5}
          onChange={setLogoOpacity}
          disabled={!isLogoSelected}
        />
      </div>
    </div>
  );
});
