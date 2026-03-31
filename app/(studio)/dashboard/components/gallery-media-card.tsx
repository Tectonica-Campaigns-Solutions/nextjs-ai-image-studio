"use client";

import { cn } from "@/lib/utils";

// ─── Action button style map ──────────────────────────────────────────────────

const OVERLAY_BTN_CLASSES = {
  neutral:
    "bg-white/90 text-slate-700 hover:bg-white",
  primary:
    "bg-amber-100/95 text-amber-900 hover:bg-amber-100 disabled:opacity-50",
  destructive:
    "bg-red-500/90 text-white hover:bg-red-500",
} as const satisfies Record<string, string>;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GalleryOverlayAction {
  /** Button label text. */
  label: string;
  /**
   * Called after `e.preventDefault()` and `e.stopPropagation()` have been
   * handled internally — no event parameter needed.
   */
  onClick: () => void;
  /** Colour scheme for the overlay pill button. Defaults to `"neutral"`. */
  variant?: keyof typeof OVERLAY_BTN_CLASSES;
  disabled?: boolean;
}

interface GalleryMediaCardProps {
  /**
   * The media content — an image `<button>`, a font preview `<div>`, etc.
   * Must establish the card's intrinsic height (e.g. via `aspect-square`).
   *
   * When all children are `position: absolute` (font preview), pass the
   * aspect ratio via `className` instead so this wrapper has a real height.
   */
  children: React.ReactNode;
  /** Action pills displayed in the top-right corner of the hover overlay. */
  actions: GalleryOverlayAction[];
  /** Bold text shown at the bottom of the overlay. */
  label: string;
  /** Optional tag badges shown below the label. */
  badges?: string[];
  /**
   * Extra classes on the root `<div>`.
   * Use this to add `aspect-square`, border, background, etc. when the
   * children are all absolutely positioned (e.g. FontCard).
   */
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Shared hover-overlay shell used by AssetCard, FrameCard, and FontCard.
 *
 * Renders a `relative` wrapper around the media content and an
 * `absolute inset-0` overlay that fades in on `group-hover`.
 *
 * **Important:** the nearest ancestor carrying the `group` Tailwind class
 * drives `group-hover` (typically a `SortableItem` or a plain wrapping div).
 */
export function GalleryMediaCard({
  children,
  actions,
  label,
  badges,
  className,
}: GalleryMediaCardProps) {
  return (
    <div className={cn("relative", className)}>
      {/* Media content — establishes intrinsic height */}
      {children}

      {/*
       * Hover overlay.
       * `pointer-events-none` on the gradient layer so the media content
       * beneath remains clickable; re-enabled only on the action buttons.
       */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 pointer-events-none">
        {/* Top-right action buttons */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 pointer-events-auto">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                action.onClick();
              }}
              disabled={action.disabled}
              className={cn(
                "text-[10px] font-semibold px-2 py-1 rounded",
                OVERLAY_BTN_CLASSES[action.variant ?? "neutral"]
              )}
            >
              {action.label}
            </button>
          ))}
        </div>

        {/* Bottom label + badge row */}
        <div className="absolute bottom-3 left-3 right-3">
          <p className="text-white text-xs font-bold truncate">{label}</p>
          {badges && badges.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {badges.map((badge) => (
                <span
                  key={badge}
                  className="bg-white/90 text-slate-700 px-2 py-0.5 rounded text-[10px] font-semibold"
                >
                  {badge}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
