"use client";

import Image from "next/image";
import {
  GalleryMediaCard,
  type GalleryOverlayAction,
} from "./gallery-media-card";
import { SortableItem } from "./sortable-item";
import type { ClientAsset } from "@/app/(studio)/dashboard/utils/types";

interface AssetCardProps {
  asset: ClientAsset;
  /**
   * Badge label shown in the bottom overlay.
   * Typically `asset.variant` or the variant-group key (e.g. "No variant").
   */
  variantBadge: string;
  onView: () => void;
  onSetPrimary: () => void;
  onDelete: () => void;
}

/**
 * Sortable gallery card for a single logo/image asset.
 * Renders a zoomable square thumbnail with View / Set Primary / Delete
 * overlay actions. Must be used inside a DnD `SortableContext`.
 */
export function AssetCard({
  asset,
  variantBadge,
  onView,
  onSetPrimary,
  onDelete,
}: AssetCardProps) {
  const label = asset.display_name || asset.name;

  const actions: GalleryOverlayAction[] = [
    { label: "View", onClick: onView, variant: "neutral" },
    {
      label: asset.is_primary ? "Primary" : "Set Primary",
      onClick: onSetPrimary,
      variant: "primary",
      disabled: asset.is_primary,
    },
    { label: "Delete", onClick: onDelete, variant: "destructive" },
  ];

  return (
    <SortableItem
      id={asset.id}
      className="group relative border rounded-lg overflow-hidden bg-card"
    >
      <GalleryMediaCard actions={actions} label={label} badges={[variantBadge]}>
        <button
          type="button"
          onClick={onView}
          className="relative aspect-square bg-muted flex items-center justify-center w-full cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          title="View full size"
        >
          <Image
            src={asset.file_url}
            alt={label}
            fill
            className="object-contain"
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        </button>
      </GalleryMediaCard>
    </SortableItem>
  );
}
