"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Star } from "lucide-react";
import { AssetUpload } from "./asset-upload";
import type { ClientAsset } from "@/app/(studio)/admin/types";
import { deleteAssetAction, setPrimaryAssetAction } from "@/app/(studio)/admin/actions/assets";

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

  if (showUpload) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Upload New Asset</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowUpload(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <AssetUpload
          clientId={clientId}
          variants={variants}
          onUploadComplete={() => {
            setShowUpload(false);
            onRefresh();
          }}
          onCancel={() => setShowUpload(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {assets.length} asset{assets.length !== 1 ? "s" : ""} registrado
            {assets.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => setShowUpload(true)} size="sm">
          <Upload className="h-4 w-4 mr-2" />
          Upload Asset
        </Button>
      </div>

      {assets.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground mb-4">
            No assets found. Upload the first one to start.
          </p>
          <Button onClick={() => setShowUpload(true)} variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Upload Asset
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
                      {/* Image Preview */}
                      <div className="aspect-square bg-muted flex items-center justify-center">
                        <img
                          src={asset.file_url}
                          alt={asset.display_name || asset.name}
                          className="w-full h-full object-contain"
                        />
                      </div>

                      {/* Overlay with actions */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
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
    </div>
  );
}
