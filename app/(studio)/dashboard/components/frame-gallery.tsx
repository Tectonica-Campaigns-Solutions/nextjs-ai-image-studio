"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Upload, X, Star, Expand } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AssetUpload } from "./asset-upload";
import type { ClientAsset } from "@/app/(studio)/dashboard/types";
import { deleteAssetAction, setPrimaryAssetAction } from "@/app/(studio)/dashboard/actions/assets";

interface FrameGalleryProps {
  clientId: string;
  frames: ClientAsset[];
  onRefresh: () => void;
}

export function FrameGallery({ clientId, frames, onRefresh }: FrameGalleryProps) {
  const [showUpload, setShowUpload] = useState(false);
  const [lightboxAsset, setLightboxAsset] = useState<ClientAsset | null>(null);

  const openLightbox = useCallback((asset: ClientAsset) => {
    setLightboxAsset(asset);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxAsset(null);
  }, []);

  const handleLightboxKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
    },
    [closeLightbox]
  );

  const handleDelete = async (assetId: string) => {
    if (!confirm("Are you sure you want to delete this frame?")) return;
    const result = await deleteAssetAction(clientId, assetId);
    if (result.error) {
      alert(result.error);
      return;
    }
    onRefresh();
  };

  const handleSetPrimary = async (assetId: string) => {
    const result = await setPrimaryAssetAction(clientId, assetId);
    if (result.error) {
      alert(result.error);
      return;
    }
    onRefresh();
  };

  // Collect existing aspect ratio variants for autocomplete
  const existingVariants = Array.from(
    new Set(frames.map((f) => f.variant).filter((v): v is string => v !== null))
  ).sort();

  // Group frames by aspect ratio (variant)
  const groupedFrames = frames.reduce((acc, frame) => {
    const key = frame.variant || "No aspect ratio";
    if (!acc[key]) acc[key] = [];
    acc[key].push(frame);
    return acc;
  }, {} as Record<string, ClientAsset[]>);

  return (
    <>
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col" showCloseButton>
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Upload frame</DialogTitle>
            <DialogDescription>
              Upload a frame image (PNG, SVG, WebP). Set the aspect ratio as variant (e.g. 16:9, 1:1, 4:3) so it appears for the correct canvas proportions.
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 pr-1">
          <AssetUpload
            clientId={clientId}
            variants={existingVariants}
            assetType="frame"
            variantPlaceholder="e.g. 16:9, 1:1, 4:3"
            onUploadComplete={() => {
              setShowUpload(false);
              onRefresh();
            }}
            onCancel={() => setShowUpload(false)}
          />
          </div>
        </DialogContent>
      </Dialog>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {frames.length} frame{frames.length !== 1 ? "s" : ""} registered
          </p>
          <Button onClick={() => setShowUpload(true)} size="sm" aria-label="Upload new frame">
            <Upload className="size-4" aria-hidden />
            Upload frame
          </Button>
        </div>

        {frames.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground mb-2">No frames uploaded yet.</p>
            <p className="text-xs text-muted-foreground mb-4">
              Upload frame images and tag them with an aspect ratio (e.g. <strong>16:9</strong>) so they appear in the studio for matching canvases.
            </p>
            <Button onClick={() => setShowUpload(true)} variant="outline" aria-label="Upload first frame">
              <Upload className="size-4" aria-hidden />
              Upload frame
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedFrames).map(([aspectRatio, aspectFrames]) => (
              <div key={aspectRatio} className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-md bg-muted text-xs font-medium">
                    {aspectRatio}
                  </span>
                  <span className="text-muted-foreground font-normal">
                    ({aspectFrames.length} frame{aspectFrames.length !== 1 ? "s" : ""})
                  </span>
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {aspectFrames.map((frame) => (
                    <div
                      key={frame.id}
                      className="relative group border rounded-lg overflow-hidden bg-card"
                    >
                      {/* Checkerboard to show frame transparency */}
                      <div
                        className="absolute inset-0"
                        style={{
                          backgroundImage:
                            "linear-gradient(45deg, #e5e5e5 25%, transparent 25%), linear-gradient(-45deg, #e5e5e5 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e5e5 75%), linear-gradient(-45deg, transparent 75%, #e5e5e5 75%)",
                          backgroundSize: "10px 10px",
                          backgroundPosition: "0 0, 0 5px, 5px -5px, -5px 0px",
                        }}
                      />

                      <button
                        type="button"
                        onClick={() => openLightbox(frame)}
                        className="relative aspect-square bg-transparent flex items-center justify-center w-full cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-[#5661f6] focus:ring-inset"
                        title="View full size"
                      >
                        <Image
                          src={frame.file_url}
                          alt={frame.display_name || frame.name}
                          fill
                          className="object-contain"
                          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        />
                      </button>

                      {/* Hover overlay with actions */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none">
                        <div className="pointer-events-auto flex items-center gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => openLightbox(frame)}
                            title="View full size"
                          >
                            <Expand className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleSetPrimary(frame.id)}
                            disabled={frame.is_primary}
                            title={frame.is_primary ? "Already primary" : "Mark as Primary"}
                          >
                            <Star
                              className={`h-4 w-4 ${
                                frame.is_primary
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "fill-gray-400 text-gray-400"
                              }`}
                            />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(frame.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Primary badge */}
                      {frame.is_primary && (
                        <div className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 px-2 py-1 rounded text-xs font-semibold flex items-center gap-1">
                          <Star className="h-3 w-3 fill-current" />
                          Primary
                        </div>
                      )}

                      {/* Aspect ratio badge */}
                      {frame.variant && (
                        <div className="absolute top-2 left-2 bg-emerald-600/90 text-white px-2 py-1 rounded text-xs font-medium">
                          {frame.variant}
                        </div>
                      )}

                      {/* Frame info */}
                      <div className="p-2 border-t bg-white/80">
                        <p className="text-sm font-medium truncate">
                          {frame.display_name || frame.name}
                        </p>
                        {frame.width && frame.height && (
                          <p className="text-xs text-muted-foreground">
                            {frame.width} × {frame.height}px
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Lightbox */}
        {lightboxAsset && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
            onClick={closeLightbox}
            onKeyDown={handleLightboxKeyDown}
            role="dialog"
            aria-modal="true"
            aria-label="Frame preview"
            tabIndex={0}
          >
            <button
              type="button"
              onClick={closeLightbox}
              className="absolute top-4 right-4 z-10 rounded-full p-2 text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white"
              aria-label="Close"
            >
              <X className="h-6 w-6" />
            </button>
            <div
              className="relative w-full max-w-5xl h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={lightboxAsset.file_url}
                alt={lightboxAsset.display_name || lightboxAsset.name}
                fill
                className="object-contain"
                sizes="100vw"
                priority
              />
            </div>
            <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-white/80 truncate max-w-full px-4">
              {lightboxAsset.display_name || lightboxAsset.name}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
