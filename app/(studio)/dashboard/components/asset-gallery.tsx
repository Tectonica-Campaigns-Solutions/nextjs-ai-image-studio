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
import { Upload, X, Star, Expand } from "lucide-react";
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
import { AssetUpload } from "./asset-upload";
import { SortableItem } from "./sortable-item";
import type { ClientAsset } from "@/app/(studio)/dashboard/types";
import {
  deleteAssetAction,
  setPrimaryAssetAction,
  reorderAssetsAction,
} from "@/app/(studio)/dashboard/actions/assets";

interface AssetGalleryProps {
  clientId: string;
  assets: ClientAsset[];
  variants: string[];
  onRefresh: () => void;
}

export function AssetGallery({
  clientId,
  assets,
  variants,
  onRefresh,
}: AssetGalleryProps) {
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
      const oldIndex = assets.findIndex((a) => a.id === active.id);
      const newIndex = assets.findIndex((a) => a.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = [...assets];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved);

      const result = await reorderAssetsAction(
        clientId,
        reordered.map((a) => a.id)
      );
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Order updated");
      onRefresh();
    },
    [assets, clientId, onRefresh]
  );

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const result = await deleteAssetAction(clientId, deleteTarget);
    if (result.error) {
      toast.error(result.error);
      setDeleteTarget(null);
      return;
    }
    toast.success("Asset deleted");
    setDeleteTarget(null);
    onRefresh();
  };

  const handleSetPrimary = async (assetId: string) => {
    const result = await setPrimaryAssetAction(clientId, assetId);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Primary asset updated");
    onRefresh();
  };

  return (
    <>
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="sm:max-w-lg" showCloseButton>
          <DialogHeader>
            <DialogTitle>Upload asset</DialogTitle>
            <DialogDescription>
              Upload an image (PNG, JPEG, SVG, WebP). You can set a name, variant, and mark it as primary.
            </DialogDescription>
          </DialogHeader>
          <AssetUpload
            clientId={clientId}
            variants={variants}
            onUploadComplete={() => {
              setShowUpload(false);
              onRefresh();
            }}
            onCancel={() => setShowUpload(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete asset</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this asset? This action cannot be undone.
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
            <DialogDescription>Full-size image preview</DialogDescription>
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
          <div>
            <p className="text-sm text-muted-foreground">
              {assets.length} asset{assets.length !== 1 ? "s" : ""} registered
            </p>
          </div>
          <Button onClick={() => setShowUpload(true)} size="sm" aria-label="Upload new asset">
            <Upload className="size-4" aria-hidden />
            Upload asset
          </Button>
        </div>

        {assets.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <Upload className="size-8 text-muted-foreground mx-auto mb-3" aria-hidden />
            <p className="text-sm text-muted-foreground mb-4 text-pretty">
              No assets found. Upload the first one to start.
            </p>
            <Button onClick={() => setShowUpload(true)} variant="outline" aria-label="Upload first asset">
              <Upload className="size-4" aria-hidden />
              Upload asset
            </Button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
          <div className="space-y-6">
            {(() => {
              const groupedAssets = assets.reduce((acc, asset) => {
                const variantKey = asset.variant || "No variant";
                if (!acc[variantKey]) {
                  acc[variantKey] = [];
                }
                acc[variantKey].push(asset);
                return acc;
              }, {} as Record<string, typeof assets>);

              return Object.entries(groupedAssets).map(([variant, variantAssets]) => (
                <div key={variant} className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-muted text-xs font-medium">
                      {variant}
                    </span>
                    <span className="text-muted-foreground font-normal">
                      ({variantAssets.length} asset{variantAssets.length !== 1 ? "s" : ""})
                    </span>
                  </h3>
                  <SortableContext
                    items={variantAssets.map((a) => a.id)}
                    strategy={rectSortingStrategy}
                  >
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {variantAssets.map((asset) => (
                      <SortableItem
                        key={asset.id}
                        id={asset.id}
                        className="group relative border rounded-lg overflow-hidden bg-card"
                      >
                        <button
                          type="button"
                          onClick={() => setLightboxAsset(asset)}
                          className="relative aspect-square bg-muted flex items-center justify-center w-full cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                          title="View full size"
                        >
                          <Image
                            src={asset.file_url}
                            alt={asset.display_name || asset.name}
                            fill
                            className="object-contain"
                            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                          />
                        </button>

                        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 pointer-events-none">
                          <div className="absolute top-3 right-3 flex items-center gap-1.5 pointer-events-auto">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setLightboxAsset(asset);
                              }}
                              className="text-[10px] font-semibold px-2 py-1 rounded bg-white/90 text-slate-700 hover:bg-white"
                            >
                              View
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                void handleSetPrimary(asset.id);
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
                                setDeleteTarget(asset.id);
                              }}
                              className="text-[10px] font-semibold px-2 py-1 rounded bg-red-500/90 text-white hover:bg-red-500"
                            >
                              Delete
                            </button>
                          </div>

                          <div className="absolute bottom-3 left-3 right-3">
                            <p className="text-white text-xs font-bold truncate">
                              {asset.display_name || asset.name}
                            </p>

                            <div className="mt-2 flex flex-wrap gap-1">
                              <span className="bg-white/90 text-slate-700 px-2 py-0.5 rounded text-[10px] font-semibold">
                                {asset.variant || variant}
                              </span>
                            </div>
                          </div>
                        </div>
                      </SortableItem>
                    ))}
                  </div>
                  </SortableContext>
                </div>
              ));
            })()}
          </div>
          </DndContext>
        )}
      </div>
    </>
  );
}
