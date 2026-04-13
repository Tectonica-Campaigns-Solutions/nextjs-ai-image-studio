"use client";

import { cn } from "@/lib/utils";
import { toast } from "sonner";
import React from "react";

export type GeneratedImageCardItem = {
  id: string;
  image_url: string;
  prompt: string | null;
  cost: number | null;
  created_at: string;
  client_name?: string;
  client_id: string;
};

export type GeneratedImageCardProps = Readonly<{
  item: GeneratedImageCardItem;
  onView: (item: GeneratedImageCardItem) => void;
  onDownload: (item: GeneratedImageCardItem) => void;
  className?: string;
}>;

function formatCost(cost: number | null): string {
  if (cost === null || cost === undefined || Number.isNaN(cost)) return "—";
  return cost.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

export function GeneratedImageCard({ item, onView, onDownload, className }: GeneratedImageCardProps) {
  const prompt = item.prompt?.trim() || "—";
  const subtitle = `Cost • ${formatCost(item.cost)}`;
  const label = item.client_name ? item.client_name : item.client_id;
  const [expanded, setExpanded] = React.useState(false);

  const isExpandable =
    prompt !== "—" &&
    (prompt.length > 140 || prompt.includes("\n"));

  const handleCopyPrompt = async () => {
    const value = item.prompt?.trim();
    if (!value) {
      toast.error("No prompt to copy");
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Prompt copied");
    } catch {
      toast.error("Failed to copy prompt");
    }
  };

  return (
    <div className={cn("group relative", className)}>
      <div
        className="relative aspect-square rounded-xl bg-surface-container-low overflow-hidden w-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        role="button"
        tabIndex={0}
        onClick={() => onView(item)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onView(item);
          }
        }}
        aria-label="Open generated image preview"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.image_url}
          alt={prompt}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-contain group-hover:scale-[1.03] transition-transform duration-500"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3">
          <div className="absolute top-3 right-3 flex items-center gap-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void handleCopyPrompt();
              }}
              className="text-[10px] font-semibold px-2 py-1 rounded bg-white/90 text-slate-700 hover:bg-white"
            >
              Copy prompt
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDownload(item);
              }}
              className="text-[10px] font-semibold px-2 py-1 rounded bg-amber-100/95 text-amber-900 hover:bg-amber-100"
            >
              Download
            </button>
          </div>

          <div className="absolute bottom-3 left-3 right-3">
            <p className="text-white text-xs font-bold truncate">{label}</p>
            <p className="text-white/75 text-[10px] truncate">{subtitle}</p>
          </div>
        </div>
      </div>

      <div className="mt-2 space-y-1">
        <p className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant/70">
          Prompt
        </p>
        <p
          className={cn(
            "text-sm text-on-surface break-words",
            expanded ? "whitespace-pre-wrap" : "line-clamp-3"
          )}
        >
          {prompt}
        </p>
        {isExpandable ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-xs font-semibold text-dashboard-primary hover:underline"
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        ) : null}
      </div>
    </div>
  );
}

