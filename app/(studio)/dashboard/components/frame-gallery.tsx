"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Upload, X, Star, Expand, Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { AssetUpload } from "./asset-upload";
import type { ClientAsset } from "@/app/(studio)/dashboard/types";
import { deleteAssetAction, setPrimaryAssetAction } from "@/app/(studio)/dashboard/actions/assets";
import { COMMON_ASPECT_RATIOS } from "@/lib/aspect-ratios";

interface FrameGalleryProps {
  clientId: string;
  frames: ClientAsset[];
  onRefresh: () => void;
}

export function FrameGallery({ clientId, frames, onRefresh }: FrameGalleryProps) {
  const [showUpload, setShowUpload] = useState(false);
  const [lightboxAsset, setLightboxAsset] = useState<ClientAsset | null>(null);
  const [editFrame, setEditFrame] = useState<ClientAsset | null>(null);
  const [editVariantAll, setEditVariantAll] = useState(false);
  const [editVariantRatios, setEditVariantRatios] = useState<string[]>([]);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

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

  const openEdit = useCallback((frame: ClientAsset) => {
    setEditFrame(frame);
    setEditError(null);
    if (frame.variant === "*") {
      setEditVariantAll(true);
      setEditVariantRatios([]);
    } else if (frame.variant) {
      setEditVariantAll(false);
      setEditVariantRatios(
        frame.variant.split(",").map((s) => s.trim()).filter(Boolean)
      );
    } else {
      setEditVariantAll(false);
      setEditVariantRatios([]);
    }
  }, []);

  const closeEdit = useCallback(() => {
    setEditFrame(null);
    setEditVariantAll(false);
    setEditVariantRatios([]);
    setEditError(null);
  }, []);

  const handleSaveEdit = async () => {
    if (!editFrame) return;
    const variantValue = editVariantAll ? "*" : editVariantRatios.join(",");
    if (!variantValue) {
      setEditError("Select at least one aspect ratio or \"All aspect ratios\"");
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      const res = await fetch(
        `/api/dashboard/clients/${clientId}/assets/${editFrame.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ variant: variantValue }),
        }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update frame");
      }
      closeEdit();
      onRefresh();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update frame");
    } finally {
      setEditSaving(false);
    }
  };

  // Collect existing aspect ratio variants for autocomplete in upload
  const existingVariants = Array.from(
    new Set(
      frames.flatMap((f) =>
        f.variant && f.variant !== "*"
          ? f.variant.split(",").map((s) => s.trim()).filter(Boolean)
          : []
      )
    )
  ).sort();

  return (
    <>
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col" showCloseButton>
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Upload frame</DialogTitle>
            <DialogDescription>
              Upload a frame image (PNG, SVG, WebP). Choose one or more aspect ratios (or &quot;All&quot;) so the frame appears in the studio for the matching canvas formats.
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

      {/* Edit aspect ratios modal */}
      <Dialog open={!!editFrame} onOpenChange={(open) => !open && closeEdit()}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col" showCloseButton>
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Edit aspect ratios</DialogTitle>
            <DialogDescription>
              {editFrame ? (
                <>Change which canvas formats can use frame &quot;{editFrame.display_name || editFrame.name}&quot;.</>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 pr-1 space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Aspect ratio(s)</p>
              <div className="rounded-md border bg-muted/30 p-3 space-y-3 max-h-[220px] overflow-y-auto">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={editVariantAll}
                    onCheckedChange={(checked) => {
                      setEditVariantAll(!!checked);
                      if (checked) setEditVariantRatios([]);
                    }}
                    disabled={editSaving}
                  />
                  <span className="text-sm font-medium">All aspect ratios</span>
                </label>
                {!editVariantAll &&
                  COMMON_ASPECT_RATIOS.map(({ value, label }) => (
                    <label key={value} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={editVariantRatios.includes(value)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setEditVariantRatios((prev) =>
                              prev.includes(value) ? prev : [...prev, value]
                            );
                          } else {
                            setEditVariantRatios((prev) => prev.filter((r) => r !== value));
                          }
                        }}
                        disabled={editSaving}
                      />
                      <span className="text-sm">{label}</span>
                    </label>
                  ))}
              </div>
            </div>
            {editError && (
              <p className="text-sm text-destructive">{editError}</p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t flex-shrink-0">
            <Button variant="outline" onClick={closeEdit} disabled={editSaving}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={editSaving || (!editVariantAll && editVariantRatios.length === 0)}
            >
              {editSaving ? "Saving…" : "Save"}
            </Button>
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
              Upload frame images and choose one or more aspect ratios so they appear in the studio for matching canvas formats.
            </p>
            <Button onClick={() => setShowUpload(true)} variant="outline" aria-label="Upload first frame">
              <Upload className="size-4" aria-hidden />
              Upload frame
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {frames.map((frame) => {
              const variantBadges =
                frame.variant === "*"
                  ? ["All"]
                  : frame.variant
                    ? frame.variant.split(",").map((s) => s.trim()).filter(Boolean)
                    : [];
              return (
                <div
                  key={frame.id}
                  className="relative group flex flex-col border rounded-lg overflow-hidden bg-card"
                >
                  {/* Image area: fixed aspect, never overlaps title */}
                  <div className="relative w-full flex-shrink-0 min-h-0 aspect-square overflow-hidden">
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
                      className="relative w-full h-full bg-transparent flex items-center justify-center cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-[#5661f6] focus:ring-inset"
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
                      <div className="pointer-events-auto flex items-center gap-2 flex-wrap justify-center">
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
                          onClick={() => openEdit(frame)}
                          title="Edit aspect ratios"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleSetPrimary(frame.id)}
                          disabled={frame.is_primary}
                          title={frame.is_primary ? "Already primary" : "Mark as Primary"}
                        >
                          <Star
                            className={`h-4 w-4 ${frame.is_primary
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
                      <div className="absolute top-2 right-2 z-10 bg-yellow-400 text-yellow-900 px-2 py-1 rounded text-xs font-semibold flex items-center gap-1">
                        <Star className="h-3 w-3 fill-current" />
                        Primary
                      </div>
                    )}

                    {/* Aspect ratio badges */}
                    {variantBadges.length > 0 && (
                      <div className="absolute top-2 left-2 z-10 flex flex-wrap gap-1">
                        {variantBadges.map((v) => (
                          <span
                            key={v}
                            className="bg-emerald-600/90 text-white px-2 py-1 rounded text-xs font-medium"
                          >
                            {v}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Frame info: always below image, never overlapped */}
                  <div className="flex-shrink-0 p-2 border-t bg-card">
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
              );
            })}
          </div>
        )}

        {/* Lightbox */}
        {lightboxAsset && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 !mt-0"
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
