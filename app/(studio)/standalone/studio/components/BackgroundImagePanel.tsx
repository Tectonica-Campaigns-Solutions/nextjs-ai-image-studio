"use client";

import React, { useState } from "react";
import { Upload } from "lucide-react";
import { StudioOrDivider, studioForm } from "./studio-ui";

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
    <div className={studioForm.section}>
      <div className="flex gap-2">
        <input
          type="url"
          placeholder="Enter image URL"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          disabled={isLoading}
          className={studioForm.input}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleLoadFromUrl();
          }}
        />
        <button
          type="button"
          onClick={handleLoadFromUrl}
          disabled={!urlInput.trim() || isLoading}
          className={studioForm.inlinePrimaryButton}
        >
          Load
        </button>
      </div>

      <StudioOrDivider />

      <button
        type="button"
        onClick={() => document.getElementById("backgroundImageFileInput")?.click()}
        disabled={isLoading}
        className={studioForm.primaryButton}
      >
        <Upload className="size-[19px]" strokeWidth={2.2} aria-hidden />
        Upload image
      </button>
      <input
        id="backgroundImageFileInput"
        type="file"
        accept="image/*"
        onChange={onReplaceFromFile}
        className="sr-only"
      />
    </div>
  );
});
