"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ClientAsset } from "@/app/(studio)/dashboard/utils/types";
import { DashboardMaterialIcon } from "@/app/(studio)/dashboard/components/DashboardMaterialIcon";
import { deleteAssetAction, setPrimaryAssetAction } from "@/app/(studio)/dashboard/features/assets/actions/assets";
import { useServerAction } from "@/app/(studio)/dashboard/hooks/use-server-action";
import { ConfirmDialog } from "@/app/(studio)/dashboard/components/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GalleryLightbox } from "@/app/(studio)/dashboard/components/gallery-lightbox";
import { cx } from "@/app/(studio)/dashboard/utils/cx";
import { AssetCard } from "@/app/(studio)/dashboard/components/asset-card";

export type DashboardAssetsPageScreenProps = Readonly<{
  assets: ClientAsset[];
  totalAssets: number;
  showingCount: number;
  clientNames: Record<string, string>;
}>;

function formatAssetType(mimeType?: string | null, assetType?: string | null) {
  if (!mimeType) return assetType ? assetType.toUpperCase() : "ASSET";
  const v = mimeType.toLowerCase();
  if (v.includes("svg")) return "SVG";
  if (v.includes("video") || v.includes("mp4") || v.includes("quicktime")) return "MP4";
  if (v.includes("png")) return "PNG";
  if (v.includes("jpeg") || v.includes("jpg")) return "JPG";
  if (v.includes("webp")) return "WEBP";
  return v.split("/")[1]?.toUpperCase() ?? "ASSET";
}

export function DashboardAssetsPageScreen({
  assets: initialAssets,
  totalAssets,
  clientNames,
}: DashboardAssetsPageScreenProps) {
  const router = useRouter();
  const [assets, setAssets] = useState<ClientAsset[]>(initialAssets);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [typeFilter, setTypeFilter] = useState<"all" | "images" | "svg" | "video">("all");
  const [uploadDateSort, setUploadDateSort] = useState<"latest" | "oldest">("latest");
  const [query, setQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ClientAsset | null>(null);
  const [lightboxAsset, setLightboxAsset] = useState<ClientAsset | null>(null);
  const deleteAction = useServerAction();
  const primaryAction = useServerAction();

  const filteredAssets = useMemo(() => {
    const filtered = assets.filter((asset) => {
      const type = formatAssetType(asset.mime_type, asset.asset_type);
      const isVideo = type === "MP4";
      const isSvg = type === "SVG";
      const passesType =
        typeFilter === "all"
          ? true
          : typeFilter === "video"
            ? isVideo
            : typeFilter === "svg"
              ? isSvg
              : !isVideo;
      const term = query.trim().toLowerCase();
      const haystack = [
        asset.display_name,
        asset.name,
        asset.variant,
        clientNames[asset.client_id],
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return passesType && (!term || haystack.includes(term));
    });
    return [...filtered].sort((a, b) => {
      const ta = new Date(a.created_at).getTime();
      const tb = new Date(b.created_at).getTime();
      if (uploadDateSort === "oldest") return ta - tb;
      return tb - ta;
    });
  }, [assets, clientNames, query, typeFilter, uploadDateSort]);

  const handleDelete = () => {
    if (!deleteTarget) return;
    void deleteAction.execute(
      deleteTarget.id,
      deleteAssetAction,
      [deleteTarget.client_id, deleteTarget.id],
      "Asset deleted",
      () => {
        setAssets((prev) => prev.filter((item) => item.id !== deleteTarget.id));
        setDeleteTarget(null);
      },
    );
  };

  const handleSetPrimary = (asset: ClientAsset) => {
    if (asset.is_primary) return;
    void primaryAction.execute(
      asset.id,
      setPrimaryAssetAction,
      [asset.client_id, asset.id],
      "Primary asset updated",
      () => {
        setAssets((prev) =>
          prev.map((a) => {
            if (a.client_id !== asset.client_id) return a;
            if (a.asset_type !== asset.asset_type) return a;
            return { ...a, is_primary: a.id === asset.id };
          })
        );
      },
    );
  };

  return (
    <main className="pt-24 px-10 pb-12 min-h-screen bg-surface">
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete asset"
        description="This action cannot be undone."
        actionLabel="Delete"
        busyLabel="Deleting..."
        busy={deleteAction.busyId !== null}
        onConfirm={handleDelete}
      />

      <GalleryLightbox
        asset={lightboxAsset}
        onClose={() => setLightboxAsset(null)}
      />

      <div className="p-0">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <nav className="flex items-center gap-2 text-xs font-medium text-on-surface-variant mb-2 uppercase tracking-widest">
              <Link href="/dashboard" className="hover:text-on-surface transition-colors">
                Dashboard
              </Link>
              <DashboardMaterialIcon icon="chevron_right" className="text-[10px]" />
              <span className="text-dashboard-primary font-bold">Assets</span>
            </nav>
            <h2 className="text-3xl font-bold tracking-tight text-on-surface mb-1">
              Creative Assets
            </h2>
            <p className="text-on-surface-variant text-sm">
              Manage and curate your workspace media library.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-surface-container-low p-1 rounded-lg flex items-center shadow-inner">
              <button
                type="button"
                onClick={() => setView("grid")}
                className={cx(
                  "px-3 py-1.5 rounded-md flex items-center gap-2 text-sm font-medium transition-colors",
                  view === "grid"
                    ? "bg-white text-dashboard-primary shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                )}
              >
                <DashboardMaterialIcon
                  icon="grid_view"
                  className="text-lg"
                />
                Grid
              </button>
              <button
                type="button"
                onClick={() => setView("list")}
                className={cx(
                  "px-3 py-1.5 rounded-md flex items-center gap-2 text-sm font-medium transition-colors",
                  view === "list"
                    ? "bg-white text-dashboard-primary shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                )}
              >
                <DashboardMaterialIcon icon="list" className="text-lg" />
                List
              </button>
            </div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search assets..."
              className="h-10 rounded-xl border border-outline-variant/15 bg-surface-container-low px-3 text-sm outline-none focus:border-dashboard-primary"
            />
          </div>
        </div>

        {/* Filter Strip */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 py-4 border-y border-outline-variant/15">
          <div className="flex items-center gap-6">
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/70">
                Asset Type
              </span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setTypeFilter("all")} className={cx("text-sm px-1", typeFilter === "all" ? "font-semibold text-dashboard-primary" : "font-medium text-on-surface-variant hover:text-on-surface")}>
                  All Assets
                </button>
                <button type="button" onClick={() => setTypeFilter("images")} className={cx("text-sm px-1", typeFilter === "images" ? "font-semibold text-dashboard-primary" : "font-medium text-on-surface-variant hover:text-on-surface")}>
                  Images
                </button>
                <button type="button" onClick={() => setTypeFilter("svg")} className={cx("text-sm px-1", typeFilter === "svg" ? "font-semibold text-dashboard-primary" : "font-medium text-on-surface-variant hover:text-on-surface")}>
                  SVG
                </button>
                <button type="button" onClick={() => setTypeFilter("video")} className={cx("text-sm px-1", typeFilter === "video" ? "font-semibold text-dashboard-primary" : "font-medium text-on-surface-variant hover:text-on-surface")}>
                  Video
                </button>
              </div>
            </div>
            <div className="w-[1px] h-8 bg-outline-variant/20" />
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/70">
                Upload Date
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-2 text-sm font-medium text-on-surface-variant group"
                  >
                    {uploadDateSort === "latest" ? "Latest first" : "Oldest first"}
                    <DashboardMaterialIcon
                      icon="expand_more"
                      className="text-lg group-hover:text-on-surface"
                    />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="bg-surface-container-lowest border border-outline-variant/10 rounded-xl shadow-sm min-w-[180px]"
                >
                  <DropdownMenuItem
                    onSelect={() => setUploadDateSort("latest")}
                    className="cursor-pointer"
                  >
                    Latest first
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => setUploadDateSort("oldest")}
                    className="cursor-pointer"
                  >
                    Oldest first
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <div className="flex items-center gap-4" />
        </div>

        {/* Asset Grid */}
        <div className={view === "grid" ? "grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4" : "space-y-3"}>
          {filteredAssets.map((asset) => {
            const typeLabel = formatAssetType(asset.mime_type, asset.asset_type);

            if (view === "list") {
              return (
                <div key={asset.id} className="group bg-surface-container-lowest rounded-xl p-3 shadow-sm ring-1 ring-outline-variant/10 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setLightboxAsset(asset)}
                    className="relative h-16 w-16 rounded-lg bg-surface-container overflow-hidden shrink-0 cursor-pointer"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img alt={asset.display_name ?? asset.name} className="w-full h-full object-cover" src={asset.file_url} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{asset.display_name ?? asset.name}</p>
                    <p className="text-xs text-on-surface-variant truncate">
                      {clientNames[asset.client_id] ?? "Client"}
                      {asset.variant ? ` • ${asset.variant}` : ""}
                      {asset.is_primary ? " • Primary" : ""}
                    </p>
                  </div>
                  <Link href={`/dashboard/clients/${asset.client_id}`} className="text-xs font-semibold text-dashboard-primary">Manage</Link>
                  <button
                    type="button"
                    onClick={() => void handleSetPrimary(asset)}
                    disabled={asset.is_primary || primaryAction.busyId !== null}
                    className="text-xs font-semibold"
                  >
                    {asset.is_primary ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-bold uppercase tracking-wider">
                        Primary
                      </span>
                    ) : (
                      <span className="text-dashboard-primary">Set Primary</span>
                    )}
                  </button>
                  <button type="button" onClick={() => setDeleteTarget(asset)} className="text-xs font-semibold text-error">Delete</button>
                </div>
              );
            }

            return (
              <AssetCard
                key={asset.id}
                asset={asset}
                sortable={false}
                badges={[typeLabel, ...(asset.variant ? [asset.variant] : [])]}
                onView={() => setLightboxAsset(asset)}
                onManage={() => router.push(`/dashboard/clients/${asset.client_id}`)}
                onSetPrimary={() => void handleSetPrimary(asset)}
                onDelete={() => setDeleteTarget(asset)}
              />
            );
          })}
        </div>
      </div>
    </main>
  );
}
