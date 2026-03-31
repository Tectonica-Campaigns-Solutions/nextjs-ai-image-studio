"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
} from "@dnd-kit/core";
import { useGallerySort } from "@/app/(studio)/dashboard/hooks/use-gallery-sort";
import {
  SortableContext,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GalleryLightbox } from "./gallery-lightbox";
import { ConfirmDialog } from "./confirm-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { AssetUpload } from "./asset-upload";
import { FrameCard } from "./frame-card";
import type { ClientAsset } from "@/app/(studio)/dashboard/utils/types";
import {
  deleteAssetAction,
  setPrimaryAssetAction,
} from "@/app/(studio)/dashboard/features/assets/actions/assets";
import { COMMON_ASPECT_RATIOS } from "@/lib/aspect-ratios";
import { parseFrameVariant, getVariantBadges } from "../utils/frame-variant-utils";

interface FrameGalleryProps {
  clientId: string;
  frames: ClientAsset[];
  onRefresh: () => void;
}

export function FrameGallery({ clientId, frames, onRefresh }: FrameGalleryProps) {
  const [showUpload, setShowUpload] = useState(false);
  const [lightboxAsset, setLightboxAsset] = useState<ClientAsset | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { sensors, handleDragEnd, items: sortedFrames } = useGallerySort(frames, clientId, onRefresh);

  const [editFrame, setEditFrame] = useState<ClientAsset | null>(null);
  const [editVariantAll, setEditVariantAll] = useState(false);
  const [editVariantRatios, setEditVariantRatios] = useState<string[]>([]);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    setDeleteError(null);
    const result = await deleteAssetAction(clientId, deleteTarget);
    if (result.error) {
      setDeleteError(result.error);
      setDeleteBusy(false);
      return;
    }
    toast.success("Frame deleted");
    setDeleteBusy(false);
    setDeleteTarget(null);
    onRefresh();
  };

  const handleSetPrimary = async (assetId: string) => {
    const result = await setPrimaryAssetAction(clientId, assetId);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Primary frame updated");
    onRefresh();
  };

  const openEdit = useCallback((frame: ClientAsset) => {
    setEditFrame(frame);
    setEditError(null);
    const { isAll, ratios } = parseFrameVariant(frame.variant);
    setEditVariantAll(isAll);
    setEditVariantRatios(ratios);
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
              {editSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteBusy(false);
            setDeleteError(null);
          }
        }}
        title="Delete frame"
        description="Are you sure you want to delete this frame? This action cannot be undone."
        actionLabel="Delete"
        busy={deleteBusy}
        busyLabel="Deleting..."
        errorMessage={deleteError}
        onConfirm={handleConfirmDelete}
      />

      <GalleryLightbox
        asset={lightboxAsset}
        onClose={() => setLightboxAsset(null)}
        description="Full-size frame preview"
      />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {sortedFrames.length} frame{sortedFrames.length !== 1 ? "s" : ""} registered
          </p>
          <Button onClick={() => setShowUpload(true)} size="sm" aria-label="Upload new frame">
            <Upload className="size-4" aria-hidden />
            Upload frame
          </Button>
        </div>

        {sortedFrames.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <Upload className="size-8 text-muted-foreground mx-auto mb-3" aria-hidden />
            <p className="text-sm text-muted-foreground mb-2 text-pretty">No frames uploaded yet.</p>
            <p className="text-xs text-muted-foreground mb-4 text-pretty">
              Upload frame images and choose one or more aspect ratios so they appear in the studio for matching canvas formats.
            </p>
            <Button onClick={() => setShowUpload(true)} variant="outline" aria-label="Upload first frame">
              <Upload className="size-4" aria-hidden />
              Upload frame
            </Button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sortedFrames.map((f) => f.id)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {sortedFrames.map((frame) => {
                  const variantBadges = getVariantBadges(frame.variant);
                  return (
                    <FrameCard
                      key={frame.id}
                      frame={frame}
                      variantBadges={variantBadges}
                      onView={() => setLightboxAsset(frame)}
                      onEdit={() => openEdit(frame)}
                      onSetPrimary={() => void handleSetPrimary(frame.id)}
                      onDelete={() => setDeleteTarget(frame.id)}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </>
  );
}
