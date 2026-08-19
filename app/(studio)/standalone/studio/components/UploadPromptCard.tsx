"use client";

import { Upload, ImageIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { studioForm } from "./studio-ui";
import { StudioStateCard, StudioStateScreen } from "./StudioStateScreen";

export interface UploadPromptCardProps {
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export function UploadPromptCard({ onFileChange }: UploadPromptCardProps) {
  return (
    <StudioStateScreen subtitle="Getting started">
      <StudioStateCard
        icon={<ImageIcon className="size-[22px]" strokeWidth={2} aria-hidden />}
        title="Visual Studio"
        description="Upload an image to start editing"
      >
        <button
          type="button"
          onClick={() => document.getElementById("initialImageUpload")?.click()}
          className={studioForm.primaryButton}
        >
          <Upload className="size-4" strokeWidth={2.2} aria-hidden />
          Upload image
        </button>
        <Input
          id="initialImageUpload"
          type="file"
          accept="image/*"
          onChange={onFileChange}
          className="sr-only"
          aria-label="Upload image"
        />
      </StudioStateCard>
    </StudioStateScreen>
  );
}
