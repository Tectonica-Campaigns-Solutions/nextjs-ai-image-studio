"use client";

import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface LightboxAsset {
  file_url: string;
  name: string;
  display_name: string | null;
}

interface GalleryLightboxProps {
  asset: LightboxAsset | null;
  onClose: () => void;
  /** sr-only description for screen readers. Defaults to "Full-size image preview". */
  description?: string;
}

/**
 * Full-screen image lightbox dialog shared by AssetGallery and FrameGallery.
 */
export function GalleryLightbox({
  asset,
  onClose,
  description = "Full-size image preview",
}: GalleryLightboxProps) {
  const label = asset?.display_name || asset?.name;

  return (
    <Dialog open={!!asset} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl h-[90dvh] p-0 gap-0 bg-black/95 border-none [&>button]:text-white [&>button]:hover:bg-white/20">
        <DialogHeader className="sr-only">
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {asset && (
          <div className="relative w-full h-full">
            <Image
              src={asset.file_url}
              alt={label ?? ""}
              fill
              className="object-contain"
              sizes="100vw"
              priority
            />
            <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-white/80 truncate max-w-full px-4">
              {label}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
