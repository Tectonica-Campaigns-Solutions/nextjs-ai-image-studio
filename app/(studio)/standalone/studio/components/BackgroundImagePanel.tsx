"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload } from "lucide-react";

export interface BackgroundImagePanelProps {
  onReplaceFromUrl: (url: string) => void;
  onReplaceFromFile: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isLoading?: boolean;
}

export const BackgroundImagePanel = React.memo(function BackgroundImagePanel({
  onReplaceFromUrl,
  onReplaceFromFile,
  isLoading = false,
}: BackgroundImagePanelProps) {
  const [urlInput, setUrlInput] = useState("");

  const handleLoadFromUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    onReplaceFromUrl(trimmed);
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="flex gap-[10px]">
          <Input
            type="url"
            placeholder="Enter or paste image URL"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            disabled={isLoading}
            className="flex-1 border-[#2D2D2D] text-[13px] text-white placeholder-white rounded-[10px] px-[16px] py-[10px] h-[44px] transition-all focus:ring-2 focus:ring-[#5C38F3]/20 focus:border-[#5C38F3] disabled:opacity-50"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleLoadFromUrl();
            }}
          />
          <Button
            onClick={handleLoadFromUrl}
            disabled={!urlInput.trim() || isLoading}
            className="bg-[#5C38F3] text-white shadow-md cursor-pointer text-[15px] leading-[160%] font-semibold font-(family-name:--font-manrope) border-none rounded-[10px] h-[44px] transition-all hover:bg-[#4A2DD1] hover:shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#5C38F3] disabled:active:scale-100"
          >
            Load from URL
          </Button>
        </div>
      </div>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[#303030]" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-[#191919] px-2 text-white text-[13px] font-medium leading-[135%] font-(family-name:--font-manrope)">
            OR
          </span>
        </div>
      </div>
      <div>
        <Button
          onClick={() => document.getElementById("backgroundImageFileInput")?.click()}
          disabled={isLoading}
          variant="outline"
          className="bg-[#5C38F3] text-white shadow-md cursor-pointer text-[15px] leading-[160%] font-semibold font-(family-name:--font-manrope) border-none rounded-[10px] w-full h-[44px] transition-all hover:bg-[#4A2DD1] hover:shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Upload className="w-5 h-5 mr-2 text-white" />
          <span className="text-white font-(family-name:--font-manrope) text-[15px] font-medium leading-[160%]">
            Upload image
          </span>
        </Button>
        <Input
          id="backgroundImageFileInput"
          type="file"
          accept="image/*"
          onChange={onReplaceFromFile}
          className="sr-only w-fit"
        />
      </div>
    </div>
  );
});
