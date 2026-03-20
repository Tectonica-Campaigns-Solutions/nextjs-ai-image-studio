"use client";

import Image from "next/image";
import {
  GalleryMediaCard,
  type GalleryOverlayAction,
} from "./gallery-media-card";
import { SortableItem } from "./sortable-item";
import type { ClientAsset } from "@/app/(studio)/dashboard/types";

// Stable reference — defined once at module level to avoid object recreation.
const CHECKERED_STYLE: React.CSSProperties = {
  backgroundImage:
    "linear-gradient(45deg, #e5e5e5 25%, transparent 25%), " +
    "linear-gradient(-45deg, #e5e5e5 25%, transparent 25%), " +
    "linear-gradient(45deg, transparent 75%, #e5e5e5 75%), " +
    "linear-gradient(-45deg, transparent 75%, #e5e5e5 75%)",
  backgroundSize: "10px 10px",
  backgroundPosition: "0 0, 0 5px, 5px -5px, -5px 0px",
};

interface FrameCardProps {
  frame: ClientAsset;
  /**
   * Badge labels shown in the bottom overlay.
   * Pass `["All"]` for `variant === "*"`, or the split ratio strings
   * (e.g. `["16:9", "1:1"]`), or `[]` when there is no variant.
   */
  variantBadges: string[];
  onView: () => void;
  onEdit: () => void;
  onSetPrimary: () => void;
  onDelete: () => void;
}

/**
 * Sortable gallery card for a single frame asset.
 *
 * Differs from `AssetCard` in two ways:
 * 1. The thumbnail has a checkered transparency background.
 * 2. An `Edit` action is included (opens the aspect-ratio editor dialog).
 *
 * Must be used inside a DnD `SortableContext`.
 */
export function FrameCard({
  frame,
  variantBadges,
  onView,
  onEdit,
  onSetPrimary,
  onDelete,
}: FrameCardProps) {
  const label = frame.display_name || frame.name;

  const actions: GalleryOverlayAction[] = [
    { label: "View", onClick: onView, variant: "neutral" },
    { label: "Edit", onClick: onEdit, variant: "neutral" },
    {
      label: frame.is_primary ? "Primary" : "Set Primary",
      onClick: onSetPrimary,
      variant: "primary",
      disabled: frame.is_primary,
    },
    { label: "Delete", onClick: onDelete, variant: "destructive" },
  ];

  return (
    <SortableItem
      id={frame.id}
      className="group relative border rounded-lg overflow-hidden bg-card"
    >
      <GalleryMediaCard
        actions={actions}
        label={label}
        badges={variantBadges}
      >
        {/* Checkered background (transparency indicator) + image */}
        <div className="relative w-full aspect-square overflow-hidden">
          <div className="absolute inset-0" style={CHECKERED_STYLE} />
          <button
            type="button"
            onClick={onView}
            className="relative w-full h-full bg-transparent flex items-center justify-center cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            title="View full size"
          >
            <Image
              src={frame.file_url}
              alt={label}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          </button>
        </div>
      </GalleryMediaCard>
    </SortableItem>
  );
}
