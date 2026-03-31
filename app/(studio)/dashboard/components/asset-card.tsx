"use client";

import Image from "next/image";
import { SortableItem } from "./sortable-item";
import type { ClientAsset } from "@/app/(studio)/dashboard/utils/types";

interface AssetCardProps {
  asset: ClientAsset;
  /**
   * Badges shown in the bottom overlay.
   * Typically variant/type labels.
   */
  badges?: string[];
  onView: () => void;
  onSetPrimary: () => void;
  onDelete: () => void;
  onManage?: () => void;
  sortable?: boolean;
}

/**
 * Gallery card for a single image asset.
 * Can be sortable (inside a DnD `SortableContext`) or static.
 */
export function AssetCard({
  asset,
  badges,
  onView,
  onSetPrimary,
  onDelete,
  onManage,
  sortable = true,
}: AssetCardProps) {
  const label = asset.display_name || asset.name;
  const subtitle = badges && badges.length > 0 ? badges.join(" • ") : `File • ${asset.mime_type ?? "—"}`;

  const media = (
    <div
      className="relative aspect-square rounded-xl bg-surface-container-low overflow-hidden w-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      role="button"
      tabIndex={0}
      onClick={onView}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onView();
        }
      }}
    >
      <Image
        src={asset.file_url}
        alt={label}
        fill
        className="object-contain group-hover:scale-[1.03] transition-transform duration-500"
        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3">
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          {onManage ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onManage();
              }}
              className="text-[10px] font-semibold px-2 py-1 rounded bg-white/90 text-slate-700 hover:bg-white"
            >
              Manage
            </button>
          ) : null}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSetPrimary();
            }}
            disabled={asset.is_primary}
            className="text-[10px] font-semibold px-2 py-1 rounded bg-amber-100/95 text-amber-900 hover:bg-amber-100 disabled:opacity-50"
          >
            {asset.is_primary ? "Primary" : "Set Primary"}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete();
            }}
            className="text-[10px] font-semibold px-2 py-1 rounded bg-red-500/90 text-white hover:bg-red-500"
          >
            Delete
          </button>
        </div>

        <div className="absolute bottom-3 left-3 right-3">
          <p className="text-white text-xs font-bold truncate">{label}</p>
          <p className="text-white/75 text-[10px] truncate">{subtitle}</p>
        </div>
      </div>
    </div>
  );

  if (!sortable) {
    return <div className="group relative">{media}</div>;
  }

  return (
    <SortableItem
      id={asset.id}
      className="group relative"
    >
      {media}
    </SortableItem>
  );
}
