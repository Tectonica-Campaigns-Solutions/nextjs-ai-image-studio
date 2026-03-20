"use client";

import Image from "next/image";
import { SortableItem } from "./sortable-item";
import type { ClientAsset } from "@/app/(studio)/dashboard/utils/types";

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
  editLabel?: string;
  onSetPrimary: () => void;
  onDelete: () => void;
  disableActions?: boolean;
  sortable?: boolean;
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
  editLabel = "Edit",
  onSetPrimary,
  onDelete,
  disableActions = false,
  sortable = true,
}: FrameCardProps) {
  const label = frame.display_name || frame.name;

  const media = (
    <div className="group relative">
      <div
        className="relative aspect-square rounded-xl bg-surface-container-low overflow-hidden cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
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
        <div className="absolute inset-0" style={CHECKERED_STYLE} />
        <Image
          src={frame.file_url}
          alt={label}
          fill
          className="object-contain group-hover:scale-[1.03] transition-transform duration-500"
          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3">
          <div className="absolute top-3 right-3 flex items-center gap-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              disabled={disableActions}
              className="text-[10px] font-semibold px-2 py-1 rounded bg-white/90 text-slate-700 hover:bg-white"
            >
              {editLabel}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSetPrimary();
              }}
              disabled={disableActions || frame.is_primary}
              className="text-[10px] font-semibold px-2 py-1 rounded bg-amber-100/95 text-amber-900 hover:bg-amber-100 disabled:opacity-50"
            >
              {frame.is_primary ? "Primary" : "Set Primary"}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              disabled={disableActions}
              className="text-[10px] font-semibold px-2 py-1 rounded bg-red-500/90 text-white hover:bg-red-500 disabled:opacity-50"
            >
              Delete
            </button>
          </div>

          <div className="absolute bottom-3 left-3 right-3">
            <p className="text-white text-xs font-bold truncate">{label}</p>
            <p className="text-white/75 text-[10px] truncate">File • {frame.mime_type ?? "—"}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {variantBadges.map((badge) => (
                <span
                  key={`${frame.id}-${badge}`}
                  className="bg-white/90 text-slate-700 px-2 py-0.5 rounded text-[10px] font-semibold"
                >
                  {badge}
                </span>
              ))}
              {frame.is_primary ? (
                <span className="text-[10px] font-semibold px-2 py-1 rounded bg-white/90 text-slate-700">
                  Primary
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (!sortable) return media;

  return <SortableItem id={frame.id} className="group relative">{media}</SortableItem>;
}
