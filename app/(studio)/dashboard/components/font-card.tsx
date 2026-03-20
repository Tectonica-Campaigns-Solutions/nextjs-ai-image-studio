"use client";

import {
  GalleryMediaCard,
  type GalleryOverlayAction,
} from "./gallery-media-card";
import type { ClientFont } from "@/app/(studio)/dashboard/utils/types";

interface FontCardProps {
  font: ClientFont;
  onEdit: () => void;
  onSetPrimary: () => void;
  onDelete: () => void;
}

/**
 * Gallery card for a single client font.
 *
 * Unlike asset/frame cards, the media content is a text-based font preview
 * (no image). Because the preview is `absolute inset-0`, the `aspect-square`
         * and border classes are passed to `GalleryMediaCard`'s root via `className`
         * so that the wrapper has an explicit height.
 *
         * The parent must carry the `group` class to trigger hover overlay visibility.
 */
export function FontCard({ font, onEdit, onSetPrimary, onDelete }: FontCardProps) {
  const badges = [
    ...(font.font_category ? [font.font_category] : []),
    font.font_source === "google" ? "Google" : "Custom",
  ];

  const actions: GalleryOverlayAction[] = [
    { label: "Edit", onClick: onEdit, variant: "neutral" },
    {
      label: font.is_primary ? "Primary" : "Set Primary",
      onClick: onSetPrimary,
      variant: "primary",
      disabled: font.is_primary,
    },
    { label: "Delete", onClick: onDelete, variant: "destructive" },
  ];

  return (
    <div className="group relative">
      <GalleryMediaCard
        actions={actions}
        label={font.font_family}
        badges={badges}
        /*
         * The font preview children are all `absolute inset-0`, so we must
         * give the GalleryMediaCard root the aspect ratio and the Dashboard
         * surface styles to establish a real height.
         */
        className="aspect-square rounded-xl bg-surface-container-low overflow-hidden border border-outline-variant/10"
      >
        {/* Font preview — fills the card via absolute positioning */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
          <p
            className="text-on-surface text-2xl font-extrabold leading-none break-words"
            style={{ fontFamily: font.font_family }}
          >
            Lorem ipsum dolor sit amet
          </p>
          <p className="mt-4 text-xs font-semibold text-on-surface-variant/90 truncate w-full">
            {font.font_family}
          </p>
        </div>
      </GalleryMediaCard>
    </div>
  );
}
