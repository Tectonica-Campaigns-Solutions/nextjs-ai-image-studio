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
    if (!confirm("Are you sure you want to delete this asset?")) return;
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
            <p className="text-muted-foreground mb-4">
              No assets found. Upload the first one to start.
            </p>
            <Button onClick={() => setShowUpload(true)} variant="outline" aria-label="Upload first asset">
              <Upload className="size-4" aria-hidden />
              Upload asset
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Group assets by variant */}
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
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {variantAssets.map((asset) => (
                      <div
                        key={asset.id}
                        className="relative group border rounded-lg overflow-hidden bg-card"
                      >
                        {/* Image Preview - click to open lightbox */}
                        <button
                          type="button"
                          onClick={() => openLightbox(asset)}
                          className="relative aspect-square bg-muted flex items-center justify-center w-full cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-[#5661f6] focus:ring-inset"
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

                        {/* Overlay with actions */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none">
                          <div className="pointer-events-auto flex items-center gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => openLightbox(asset)}
                              title="View full size"
                            >
                              <Expand className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleSetPrimary(asset.id)}
                              disabled={asset.is_primary}
                              title={asset.is_primary ? "Already primary" : "Mark as Primary"}
                            >
                              <Star
                                className={`h-4 w-4 ${asset.is_primary ? "fill-yellow-400 text-yellow-400" : "fill-gray-400 text-gray-400"
                                  }`}
                              />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(asset.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Primary badge */}
                        {asset.is_primary && (
                          <div className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 px-2 py-1 rounded text-xs font-semibold flex items-center gap-1">
                            <Star className="h-3 w-3 fill-current" />
                            Primary Asset
                          </div>
                        )}

                        {/* Variant badge (if not grouped) */}
                        {asset.variant && (
                          <div className="absolute top-2 left-2 bg-blue-500/90 text-white px-2 py-1 rounded text-xs font-medium">
                            {asset.variant}
                          </div>
                        )}

                        {/* Asset info */}
                        <div className="p-2 border-t">
                          <p className="text-sm font-medium truncate">
                            {asset.display_name || asset.name}
                          </p>
                          {asset.width && asset.height && (
                            <p className="text-xs text-muted-foreground">
                              {asset.width} × {asset.height}px
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ));
            })()}
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
            aria-label="Image preview"
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
