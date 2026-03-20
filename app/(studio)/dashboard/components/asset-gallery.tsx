"use client";

import { useMemo, useState } from "react";
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
import { AssetUpload } from "./asset-upload";
import { AssetCard } from "./asset-card";
import type { ClientAsset } from "@/app/(studio)/dashboard/utils/types";
import {
  deleteAssetAction,
  setPrimaryAssetAction,
} from "@/app/(studio)/dashboard/features/assets/actions/assets";

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

  // items is the optimistically-updated order (updates instantly on drag).
  const { sensors, handleDragEnd, items } = useGallerySort(assets, clientId, onRefresh);

  // Group assets by variant. Memoized so it only recomputes when items change.
  const groupedAssets = useMemo(
    () =>
      items.reduce((acc, asset) => {
        const key = asset.variant || "No variant";
        if (!acc[key]) acc[key] = [];
        acc[key].push(asset);
        return acc;
      }, {} as Record<string, ClientAsset[]>),
    [items]
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

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete asset"
        description="Are you sure you want to delete this asset? This action cannot be undone."
        actionLabel="Delete"
        onConfirm={handleConfirmDelete}
      />

      <GalleryLightbox
        asset={lightboxAsset}
        onClose={() => setLightboxAsset(null)}
        description="Full-size image preview"
      />

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

        {items.length === 0 ? (
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
              {Object.entries(groupedAssets).map(([variant, variantAssets]) => (
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
                        <AssetCard
                          key={asset.id}
                          asset={asset}
                          variantBadge={asset.variant || variant}
                          onView={() => setLightboxAsset(asset)}
                          onSetPrimary={() => void handleSetPrimary(asset.id)}
                          onDelete={() => setDeleteTarget(asset.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </div>
              ))}
            </div>
          </DndContext>
        )}
      </div>
    </>
  );
}
