"use client";

import React from "react";
import { Loader2, WandSparkles } from "lucide-react";
import { StudioCheckboxRow, studioForm } from "./studio-ui";

export interface AIEditPanelProps {
  onEdit: (prompt: string, includeLayers?: boolean) => Promise<void>;
  isLoading: boolean;
}

export const AIEditPanel = React.memo(function AIEditPanel({
  onEdit,
  isLoading,
}: AIEditPanelProps) {
  const [prompt, setPrompt] = React.useState("");
  const [includeLayers, setIncludeLayers] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed || isLoading) return;
    await onEdit(trimmed, includeLayers);
  };

  return (
    <form onSubmit={handleSubmit} className={studioForm.section}>
      <textarea
        id="ai-edit-prompt"
        rows={5}
        placeholder="Enter prompt to edit image (e.g. Change the background to a bright outdoor park scene)"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        disabled={isLoading}
        className={`${studioForm.input} min-h-[120px] resize-y py-3 leading-normal`}
      />
      <StudioCheckboxRow
        checked={includeLayers}
        onChange={setIncludeLayers}
        label="Include layers (text, QR, frames, etc.) in the image sent for editing"
      />
      <button
        type="submit"
        disabled={!prompt.trim() || isLoading}
        className={studioForm.primaryButton}
      >
        {isLoading ? (
          <>
            <Loader2 className="size-[19px] animate-spin" aria-hidden />
            Editing…
          </>
        ) : (
          <>
            <WandSparkles className="size-[19px]" strokeWidth={2.2} aria-hidden />
            Edit with AI
          </>
        )}
      </button>
    </form>
  );
});
