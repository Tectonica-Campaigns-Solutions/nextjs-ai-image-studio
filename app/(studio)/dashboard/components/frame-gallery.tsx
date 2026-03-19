"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { Upload, X, Star, Expand, Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { AssetUpload } from "./asset-upload";
import { SortableItem } from "./sortable-item";
import type { ClientAsset } from "@/app/(studio)/dashboard/types";
import {
  deleteAssetAction,
  setPrimaryAssetAction,
  reorderAssetsAction,
} from "@/app/(studio)/dashboard/actions/assets";
import { COMMON_ASPECT_RATIOS } from "@/lib/aspect-ratios";

interface FrameGalleryProps {
  clientId: string;
  frames: ClientAsset[];
  onRefresh: () => void;
}

export function FrameGallery({ clientId, frames, onRefresh }: FrameGalleryProps) {
  const [showUpload, setShowUpload] = useState(false);
  const [lightboxAsset, setLightboxAsset] = useState<ClientAsset | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = frames.findIndex((f) => f.id === active.id);
      const newIndex = frames.findIndex((f) => f.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = [...frames];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved);

      const result = await reorderAssetsAction(
        clientId,
        reordered.map((f) => f.id)
      );
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Order updated");
      onRefresh();
    },
    [frames, clientId, onRefresh]
  );

  const [editFrame, setEditFrame] = useState<ClientAsset | null>(null);
  const [editVariantAll, setEditVariantAll] = useState(false);
  const [editVariantRatios, setEditVariantRatios] = useState<string[]>([]);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const result = await deleteAssetAction(clientId, deleteTarget);
    if (result.error) {
      toast.error(result.error);
      setDeleteTarget(null);
      return;
    }
    toast.success("Frame deleted");
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

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete frame</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this frame? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={!!lightboxAsset}
        onOpenChange={(open) => !open && setLightboxAsset(null)}
      >
        <DialogContent className="max-w-5xl h-[90dvh] p-0 gap-0 bg-black/95 border-none [&>button]:text-white [&>button]:hover:bg-white/20">
          <DialogHeader className="sr-only">
            <DialogTitle>
              {lightboxAsset?.display_name || lightboxAsset?.name}
            </DialogTitle>
            <DialogDescription>Full-size frame preview</DialogDescription>
          </DialogHeader>
          {lightboxAsset && (
            <div className="relative w-full h-full">
              <Image
                src={lightboxAsset.file_url}
                alt={lightboxAsset.display_name || lightboxAsset.name}
                fill
                className="object-contain"
                sizes="100vw"
                priority
              />
              <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-white/80 truncate max-w-full px-4">
                {lightboxAsset.display_name || lightboxAsset.name}
              </p>
            </div>
          )}
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
            items={frames.map((f) => f.id)}
            strategy={rectSortingStrategy}
          >
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {frames.map((frame) => {
              const variantBadges =
                frame.variant === "*"
                  ? ["All"]
                  : frame.variant
                    ? frame.variant.split(",").map((s) => s.trim()).filter(Boolean)
                    : [];
              return (
                <SortableItem
                  key={frame.id}
                  id={frame.id}
                  className="group flex flex-col border rounded-lg overflow-hidden bg-card"
                >
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
                      onClick={() => setLightboxAsset(frame)}
                      className="relative w-full h-full bg-transparent flex items-center justify-center cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
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

                    {frame.is_primary && (
                      <div className="absolute top-2 right-2 z-10 bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200 px-2 py-1 rounded text-xs font-semibold flex items-center gap-1">
                        <Star className="size-3 fill-current" />
                        Primary
                      </div>
                    )}

                    {variantBadges.length > 0 && (
                      <div className="absolute top-2 left-2 z-10 flex flex-wrap gap-1">
                        {variantBadges.map((v) => (
                          <span
                            key={v}
                            className="bg-muted text-muted-foreground px-2 py-1 rounded text-xs font-medium"
                          >
                            {v}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex-shrink-0 p-2 border-t bg-card flex items-center justify-between gap-1">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {frame.display_name || frame.name}
                      </p>
                      {frame.width && frame.height && (
                        <p className="text-xs text-muted-foreground tabular-nums">
                          {frame.width} x {frame.height}px
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => setLightboxAsset(frame)}
                        title="View full size"
                        aria-label="View full size"
                      >
                        <Expand className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => openEdit(frame)}
                        title="Edit aspect ratios"
                        aria-label="Edit aspect ratios"
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => handleSetPrimary(frame.id)}
                        disabled={frame.is_primary}
                        title={frame.is_primary ? "Already primary" : "Mark as Primary"}
                        aria-label={frame.is_primary ? "Already primary" : "Mark as Primary"}
                      >
                        <Star
                          className={`size-3.5 ${frame.is_primary
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground"
                            }`}
                        />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(frame.id)}
                        title="Delete frame"
                        aria-label="Delete frame"
                      >
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </SortableItem>
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
