"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

export interface AIEditPanelProps {
  onEdit: (prompt: string) => Promise<void>;
  isLoading: boolean;
}

export const AIEditPanel = React.memo(function AIEditPanel({
  onEdit,
  isLoading,
}: AIEditPanelProps) {
  const [prompt, setPrompt] = React.useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed || isLoading) return;
    await onEdit(trimmed);
  };

  return (
    <div className="space-y-4 w-full">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col gap-[10px]">
          <Textarea
            id="ai-edit-prompt"
            placeholder="Enter prompt to edit image (e.g. Change the background to a bright outdoor park scene)"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isLoading}
            className="min-h-[88px] w-full !border-[#2D2D2D] !bg-[#1F1F1F] text-sm !text-white placeholder-white rounded-[10px] px-[16px] py-[10px] resize-y transition-all focus:ring-2 focus:ring-[#5C38F3]/20 focus:border-[#5C38F3] !font-(family-name:--font-manrope)"
            rows={3}
          />
          <Button
            type="submit"
            disabled={!prompt.trim() || isLoading}
            className="w-full h-[44px] bg-[#5C38F3] text-white shadow-md cursor-pointer text-[15px] leading-[160%] font-semibold font-(family-name:--font-manrope) border-none rounded-[10px] transition-all hover:bg-[#4A2DD1] hover:shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#5C38F3] disabled:active:scale-100"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                Editing…
              </>
            ) : (
              "Edit with AI"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
});
