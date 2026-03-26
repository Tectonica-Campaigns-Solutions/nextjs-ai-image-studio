"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DashboardMaterialIcon } from "@/app/(studio)/dashboard/components/DashboardMaterialIcon";
import { DashboardBreadcrumb } from "@/app/(studio)/dashboard/components/dashboard-breadcrumb";
import type { ClientDetailPageData } from "../data/clients";
import type { ClientAsset } from "@/app/(studio)/dashboard/utils/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/app/(studio)/dashboard/components/confirm-dialog";
import { useServerAction } from "@/app/(studio)/dashboard/hooks/use-server-action";
import { ClientForm } from "@/app/(studio)/dashboard/components/client-form";
import { updateClientAction } from "../actions/clients";
import Image from "next/image";
import { FontGallery } from "@/app/(studio)/dashboard/components/font-gallery";
import { deleteAssetAction, setPrimaryAssetAction } from "@/app/(studio)/dashboard/features/assets/actions/assets";
import { deleteCanvasSessionAction } from "@/app/(studio)/dashboard/features/canvas-sessions/actions/canvas-sessions";
import { COMMON_ASPECT_RATIOS } from "@/lib/aspect-ratios";
import { AssetUpload } from "@/app/(studio)/dashboard/components/asset-upload";
import { cx } from "@/app/(studio)/dashboard/utils/cx";
import { formatRelativeFromNow } from "@/app/(studio)/dashboard/utils/date-formatters";
import { FrameCard } from "@/app/(studio)/dashboard/components/frame-card";
import { CanvasSessionCard } from "@/app/(studio)/dashboard/components/canvas-session-card";

type TabKey = "assets" | "frames" | "fonts" | "canvas-sessions";

type DashboardClientDetailScreenProps = Readonly<{
  data: ClientDetailPageData;
}>;

export function DashboardClientDetailScreen({ data }: DashboardClientDetailScreenProps) {
  const router = useRouter();
  const client = data.client;

  const [activeTab, setActiveTab] = useState<TabKey>("assets");
  const [editOpen, setEditOpen] = useState(false);
  const [lightboxAsset, setLightboxAsset] = useState<ClientAsset | null>(null);
  const [toggleConfirmOpen, setToggleConfirmOpen] = useState(false);
  const [toggleTargetIsActive, setToggleTargetIsActive] = useState(false);
  const toggleAction = useServerAction();
  const [deleteAssetId, setDeleteAssetId] = useState<string | null>(null);
  const assetAction = useServerAction();
  const [editFrame, setEditFrame] = useState<ClientAsset | null>(null);
  const [editVariantAll, setEditVariantAll] = useState(false);
  const [editVariantRatios, setEditVariantRatios] = useState<string[]>([]);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [showUploadAsset, setShowUploadAsset] = useState(false);
  const [showUploadFrame, setShowUploadFrame] = useState(false);
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);
  const sessionAction = useServerAction();

  const logoAsset = useMemo(() => {
    return (data.assets ?? []).find((a) => a.is_primary) ?? (data.assets ?? [])[0] ?? null;
  }, [data.assets]);

  const visibleAssetsOrFrames = useMemo(() => {
    return activeTab === "frames" ? data.frames ?? [] : data.assets ?? [];
  }, [activeTab, data.assets, data.frames]);

  const groupedAssets = useMemo(() => {
    if (activeTab !== "assets") return [];
    const groups = (data.assets ?? []).reduce(
      (acc, asset) => {
        const key = asset.variant?.trim() || "No variant";
        if (!acc[key]) acc[key] = [];
        acc[key].push(asset);
        return acc;
      },
      {} as Record<string, ClientAsset[]>
    );
    return Object.entries(groups);
  }, [activeTab, data.assets]);

  const visibleSessions = useMemo(() => {
    return (data.canvasSessions ?? []).slice(0, 6);
  }, [data.canvasSessions]);

  const handleEditSave = async (form: {
    ca_user_id: string;
    name: string;
    email: string;
    description?: string;
    is_active: boolean;
    allow_custom_logo: boolean;
  }) => {
    if (!client) return;
    const result = await updateClientAction(client.id, {
      name: form.name,
      email: form.email,
      description: form.description?.trim() || null,
      is_active: form.is_active,
      allow_custom_logo: form.allow_custom_logo,
    });
    if (result.error) throw new Error(result.error);
    toast.success("Changes saved");
    setEditOpen(false);
    router.refresh();
  };

  const handleToggleActive = async () => {
    if (!client) return;
    setToggleTargetIsActive(!client.is_active);
    setToggleConfirmOpen(true);
  };

  const handleConfirmToggleActive = () => {
    if (!client) return;
    void toggleAction.execute(
      client.id,
      updateClientAction,
      [client.id, { is_active: toggleTargetIsActive }],
      toggleTargetIsActive ? "Client activated" : "Client deactivated",
      () => {
        router.refresh();
        setToggleConfirmOpen(false);
      },
    );
  };

  const openEditFrame = (frame: ClientAsset) => {
    setEditFrame(frame);
    setEditError(null);
    if (frame.variant === "*") {
      setEditVariantAll(true);
      setEditVariantRatios([]);
      return;
    }
    if (frame.variant) {
      setEditVariantAll(false);
      setEditVariantRatios(
        frame.variant.split(",").map((s) => s.trim()).filter(Boolean)
      );
      return;
    }
    setEditVariantAll(false);
    setEditVariantRatios([]);
  };

  const closeEditFrame = () => {
    setEditFrame(null);
    setEditVariantAll(false);
    setEditVariantRatios([]);
    setEditError(null);
    setEditSaving(false);
  };

  const handleSaveEditFrame = async () => {
    if (!client || !editFrame) return;
    const variantValue = editVariantAll ? "*" : editVariantRatios.join(",");
    if (!variantValue) {
      setEditError('Select at least one aspect ratio or "All aspect ratios"');
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      const res = await fetch(
        `/api/dashboard/clients/${client.id}/assets/${editFrame.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ variant: variantValue }),
        }
      );
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || "Failed to update frame");
      }
      toast.success("Frame updated");
      closeEditFrame();
      router.refresh();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update frame");
      setEditSaving(false);
    }
  };

  const handleDeleteAsset = () => {
    if (!client || !deleteAssetId) return;
    void assetAction.execute(
      deleteAssetId,
      deleteAssetAction,
      [client.id, deleteAssetId],
      "Asset deleted",
      () => { setDeleteAssetId(null); router.refresh(); },
    );
  };

  const handleSetPrimaryFrame = (frameId: string) => {
    if (!client) return;
    void assetAction.execute(
      frameId,
      setPrimaryAssetAction,
      [client.id, frameId],
      "Primary frame updated",
      () => router.refresh(),
    );
  };

  const handleDeleteSession = () => {
    if (!client || !deleteSessionId) return;
    void sessionAction.execute(
      deleteSessionId,
      deleteCanvasSessionAction,
      [client.id, deleteSessionId],
      "Session deleted",
      () => { setDeleteSessionId(null); router.refresh(); },
    );
  };

  const tabLabel = (() => {
    switch (activeTab) {
      case "assets":
        return "Assets";
      case "frames":
        return "Frames";
      case "fonts":
        return "Fonts";
      case "canvas-sessions":
        return "Canvas Sessions";
      default:
        return "Assets";
    }
  })();

  if (!client) {
    return (
      <div className="pt-16 min-h-screen bg-surface">
        <div className="p-8 text-on-surface">
          <h2 className="text-2xl font-bold">Client not found</h2>
        </div>
      </div>
    );
  }

  const statusLabel = client.is_active ? "Active" : "Inactive";

  const clientDescription = client.description?.trim() || "—";

  return (
    <div className="pt-16 min-h-screen bg-surface">
      <div className="p-8 w-full space-y-8">
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent
            className="sm:max-w-lg bg-surface-container-lowest/95 backdrop-blur-md border border-outline-variant/10 rounded-2xl shadow-sm shadow-on-surface/5 max-h-[90dvh] overflow-y-auto"
            showCloseButton
          >
            <DialogHeader className="mb-4 pb-4 border-b border-outline-variant/10">
              <DialogTitle className="text-2xl font-extrabold tracking-tight text-on-surface">
                Edit Client
              </DialogTitle>
              <DialogDescription className="text-on-surface-variant">
                Update client details, activate/deactivate and description.
              </DialogDescription>
            </DialogHeader>
            <ClientForm
              clientId={client.id}
              initialData={{
                ca_user_id: client.ca_user_id,
                name: client.name,
                email: client.email ?? "",
                description: client.description ?? undefined,
                is_active: client.is_active,
                allow_custom_logo: client.allow_custom_logo,
              }}
              onSave={handleEditSave}
              onCancel={() => setEditOpen(false)}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={showUploadAsset} onOpenChange={setShowUploadAsset}>
          <DialogContent
            className="sm:max-w-lg bg-surface-container-lowest/95 backdrop-blur-md border border-outline-variant/10 rounded-2xl shadow-sm shadow-on-surface/5 max-h-[90dvh] overflow-y-auto"
            showCloseButton
          >
            <DialogHeader className="mb-4 pb-4 border-b border-outline-variant/10">
              <DialogTitle className="text-2xl font-extrabold tracking-tight text-on-surface">
                New Asset
              </DialogTitle>
              <DialogDescription className="text-on-surface-variant">
                Upload one or more assets for this client.
              </DialogDescription>
            </DialogHeader>
            {client ? (
              <AssetUpload
                clientId={client.id}
                variants={Array.from(
                  new Set(
                    (data.assets ?? [])
                      .map((a) => a.variant)
                      .filter((v): v is string => Boolean(v && v.trim()))
                  )
                )}
                assetType="logo"
                variantPlaceholder="e.g. C3, C4, etc."
                onUploadComplete={() => {
                  setShowUploadAsset(false);
                  router.refresh();
                }}
                onCancel={() => setShowUploadAsset(false)}
              />
            ) : null}
          </DialogContent>
        </Dialog>

        <Dialog open={showUploadFrame} onOpenChange={setShowUploadFrame}>
          <DialogContent
            className="sm:max-w-lg bg-surface-container-lowest/95 backdrop-blur-md border border-outline-variant/10 rounded-2xl shadow-sm shadow-on-surface/5 max-h-[90dvh] overflow-y-auto"
            showCloseButton
          >
            <DialogHeader className="mb-4 pb-4 border-b border-outline-variant/10">
              <DialogTitle className="text-2xl font-extrabold tracking-tight text-on-surface">
                New Frame
              </DialogTitle>
              <DialogDescription className="text-on-surface-variant">
                Upload frame images and assign aspect ratios.
              </DialogDescription>
            </DialogHeader>
            {client ? (
              <AssetUpload
                clientId={client.id}
                variants={Array.from(
                  new Set(
                    (data.frames ?? []).flatMap((f) =>
                      f.variant && f.variant !== "*"
                        ? f.variant.split(",").map((s) => s.trim()).filter(Boolean)
                        : []
                    )
                  )
                )}
                assetType="frame"
                variantPlaceholder="e.g. 16:9, 1:1, 4:3"
                onUploadComplete={() => {
                  setShowUploadFrame(false);
                  router.refresh();
                }}
                onCancel={() => setShowUploadFrame(false)}
              />
            ) : null}
          </DialogContent>
        </Dialog>

        <ConfirmDialog
          open={toggleConfirmOpen}
          onOpenChange={setToggleConfirmOpen}
          title={toggleTargetIsActive ? "Activate client" : "Deactivate client"}
          description={
            toggleTargetIsActive
              ? `Activate "${client.name}"? This will make the client available again in the studio so their assets, fonts and sessions can be used. You can deactivate the client later at any time.`
              : `Deactivate "${client.name}"? This will remove the client from the studio so their assets, fonts and sessions can’t be used. You can reactivate the client later at any time.`
          }
          actionLabel={toggleTargetIsActive ? "Activate" : "Deactivate"}
          busyLabel={toggleTargetIsActive ? "Activating..." : "Deactivating..."}
          busy={toggleAction.busyId !== null}
          onConfirm={handleConfirmToggleActive}
          variant="primary"
          dismissOnOutsidePointerDown
        />

        <ConfirmDialog
          open={!!deleteSessionId}
          onOpenChange={(open) => { if (!open) setDeleteSessionId(null); }}
          title="Delete canvas session"
          description="Are you sure you want to delete this canvas session? This action cannot be undone."
          actionLabel="Delete"
          busyLabel="Deleting..."
          busy={sessionAction.busyId !== null}
          onConfirm={handleDeleteSession}
        />

        <ConfirmDialog
          open={!!deleteAssetId}
          onOpenChange={(open) => { if (!open) setDeleteAssetId(null); }}
          title="Delete asset"
          description="Are you sure you want to delete this asset? This action cannot be undone."
          actionLabel="Delete"
          busyLabel="Deleting..."
          busy={assetAction.busyId !== null}
          onConfirm={handleDeleteAsset}
        />

        <Dialog open={!!editFrame} onOpenChange={(open) => !open && closeEditFrame()}>
          <DialogContent
            className="sm:max-w-lg bg-surface-container-lowest/95 backdrop-blur-md border border-outline-variant/10 rounded-2xl shadow-sm shadow-on-surface/5 max-h-[90dvh] overflow-y-auto"
            showCloseButton
          >
            <DialogHeader className="mb-4 pb-4 border-b border-outline-variant/10">
              <DialogTitle className="text-2xl font-extrabold tracking-tight text-on-surface">
                Edit frame
              </DialogTitle>
              <DialogDescription className="text-on-surface-variant">
                {editFrame
                  ? `Change aspect ratios for "${editFrame.display_name || editFrame.name}".`
                  : "Change aspect ratios for this frame."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-on-surface">Aspect ratio(s)</p>
                <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low p-3 space-y-3 max-h-[240px] overflow-y-auto">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editVariantAll}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setEditVariantAll(checked);
                        if (checked) setEditVariantRatios([]);
                      }}
                      disabled={editSaving}
                      className="size-4"
                    />
                    <span className="text-sm font-medium">All aspect ratios</span>
                  </label>

                  {!editVariantAll &&
                    COMMON_ASPECT_RATIOS.map(({ value, label }) => (
                      <label key={value} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editVariantRatios.includes(value)}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setEditVariantRatios((prev) => {
                              if (checked) return prev.includes(value) ? prev : [...prev, value];
                              return prev.filter((r) => r !== value);
                            });
                          }}
                          disabled={editSaving}
                          className="size-4"
                        />
                        <span className="text-sm">{label}</span>
                      </label>
                    ))}
                </div>
              </div>

              {editError ? (
                <div className="rounded-xl border border-error/20 bg-error/10 p-3 text-sm text-error">
                  {editError}
                </div>
              ) : null}

              <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/10">
                <button
                  type="button"
                  onClick={closeEditFrame}
                  disabled={editSaving}
                  className="px-4 py-2 rounded-lg bg-surface-container-lowest border border-outline-variant/10 hover:bg-surface-container-high text-sm font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleSaveEditFrame()}
                  disabled={editSaving || (!editVariantAll && editVariantRatios.length === 0)}
                  className="px-4 py-2 rounded-lg bg-dashboard-primary text-dashboard-on-primary text-sm font-semibold hover:opacity-90 disabled:opacity-70 shadow-sm shadow-dashboard-primary/20"
                >
                  {editSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog
          open={!!lightboxAsset}
          onOpenChange={(open) => {
            if (!open) setLightboxAsset(null);
          }}
        >
          <DialogContent className="max-w-5xl h-[90dvh] p-0 gap-0 bg-black/95 border-none [&>button]:text-white [&>button]:hover:bg-white/20">
            <DialogHeader className="sr-only">
              <DialogTitle>
                {lightboxAsset?.display_name || lightboxAsset?.name}
              </DialogTitle>
              <DialogDescription>Full-size image preview</DialogDescription>
            </DialogHeader>
            {lightboxAsset ? (
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
            ) : null}
          </DialogContent>
        </Dialog>

        {/* Client Hero Header */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <DashboardBreadcrumb segments={[
              { label: "Clients", href: "/dashboard/clients" },
              { label: client.name },
            ]} />
            <h2 className="text-4xl font-extrabold tracking-tight text-on-surface">
              Client Detail
            </h2>
          </div>
        </div>

        <section className="relative bg-surface-container-lowest rounded-xl p-8 overflow-hidden">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-dashboard-primary-container/20 to-transparent pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-surface-container flex items-center justify-center rounded-xl overflow-hidden shadow-sm">
                {logoAsset?.file_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt={`${client.name} logo`}
                    className="w-14 h-14 object-contain"
                    src={logoAsset.file_url}
                  />
                ) : (
                  <div className="text-2xl font-bold text-on-surface flex items-center justify-center w-full h-full">
                    {client.name.trim().charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-3xl font-extrabold tracking-tight text-on-surface">
                    {client.name}
                  </h2>
                  <span className="bg-dashboard-primary/10 text-dashboard-primary text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {statusLabel}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-surface-container-low text-on-surface-variant font-semibold rounded-lg hover:bg-surface-container-high transition-colors text-sm"
              >
                <DashboardMaterialIcon icon="edit" className="text-lg" />
                Edit Client
              </button>
              <button
                type="button"
                onClick={handleToggleActive}
                className={cx(
                  "flex items-center gap-2 px-4 py-2 font-semibold rounded-lg hover:opacity-90 transition-colors text-sm",
                  client.is_active
                    ? "bg-error-container text-on-error-container"
                    : "bg-emerald-100 text-emerald-800"
                )}
              >
                <DashboardMaterialIcon
                  icon={client.is_active ? "block" : "check_circle"}
                  className="text-lg"
                />
                {client.is_active ? "Deactivate" : "Activate"}
              </button>
            </div>
          </div>
        </section>

        {/* Navigation Tabs */}
        <div className="flex gap-8 border-b border-outline-variant/10 px-2 overflow-x-auto whitespace-nowrap">
          <button
            onClick={() => setActiveTab("assets")}
            className={cx(
              "pb-4 text-sm relative",
              activeTab === "assets"
                ? "text-blue-700 font-bold border-b-2 border-blue-600"
                : "text-on-surface-variant font-medium hover:text-on-surface transition-colors"
            )}
          >
            Assets
          </button>
          <button
            onClick={() => setActiveTab("frames")}
            className={cx(
              "pb-4 text-sm relative",
              activeTab === "frames"
                ? "text-blue-700 font-bold border-b-2 border-blue-600"
                : "text-on-surface-variant font-medium hover:text-on-surface transition-colors"
            )}
          >
            Frames
          </button>
          <button
            onClick={() => setActiveTab("fonts")}
            className={cx(
              "pb-4 text-sm relative",
              activeTab === "fonts"
                ? "text-blue-700 font-bold border-b-2 border-blue-600"
                : "text-on-surface-variant font-medium hover:text-on-surface transition-colors"
            )}
          >
            Fonts
          </button>
          <button
            onClick={() => setActiveTab("canvas-sessions")}
            className={cx(
              "pb-4 text-sm relative",
              activeTab === "canvas-sessions"
                ? "text-blue-700 font-bold border-b-2 border-blue-600"
                : "text-on-surface-variant font-medium hover:text-on-surface transition-colors"
            )}
          >
            Canvas Sessions
          </button>
        </div>

        {/* Tab Content (Assets Preview in Dashboard export) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">{tabLabel}</h3>
            </div>

            {activeTab === "assets" ? (
              <div className="space-y-6">
                {groupedAssets.map(([variantKey, assetsInVariant]) => (
                  <div key={variantKey} className="space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                      {variantKey}
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {assetsInVariant.map((asset) => (
                        <div key={asset.id} className="group relative">
                          <div
                            className="relative aspect-square rounded-xl bg-surface-container-low overflow-hidden cursor-pointer"
                            role="button"
                            tabIndex={0}
                            onClick={() => setLightboxAsset(asset)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") setLightboxAsset(asset);
                            }}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              alt={asset.display_name ?? asset.name}
                              className="w-full h-full object-contain group-hover:scale-[1.03] transition-transform duration-500"
                              src={asset.file_url}
                            />

                            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3">
                              <div className="absolute top-3 right-3 flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void handleSetPrimaryFrame(asset.id);
                                  }}
                                  disabled={assetAction.busyId !== null || asset.is_primary}
                                  className="text-[10px] font-semibold px-2 py-1 rounded bg-amber-100/95 text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                                >
                                  {asset.is_primary ? "Primary" : "Set Primary"}
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteAssetId(asset.id);
                                  }}
                                  disabled={assetAction.busyId !== null}
                                  className="text-[10px] font-semibold px-2 py-1 rounded bg-red-500/90 text-white hover:bg-red-500 disabled:opacity-50"
                                >
                                  Delete
                                </button>
                              </div>

                              <div className="absolute bottom-3 left-3 right-3">
                                <p className="text-white text-xs font-bold truncate">
                                  {asset.display_name ?? asset.name}
                                </p>
                                <p className="text-white/75 text-[10px] truncate">
                                  File • {asset.mime_type ?? "—"}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <button
                    type="button"
                    onClick={() => setShowUploadAsset(true)}
                    className="group relative aspect-square rounded-xl bg-surface-container-low overflow-hidden cursor-pointer border-2 border-dashed border-outline-variant/30 flex flex-col items-center justify-center gap-2 hover:bg-surface-container-high transition-colors"
                  >
                    <DashboardMaterialIcon icon="add_circle" className="text-dashboard-primary" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                      Upload Asset
                    </span>
                  </button>
                </div>
              </div>
            ) : null}

            {activeTab === "frames" ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {visibleAssetsOrFrames.map((asset) => (
                  <FrameCard
                    key={asset.id}
                    frame={asset}
                    sortable={false}
                    disableActions={assetAction.busyId !== null}
                    variantBadges={
                      asset.variant === "*"
                        ? ["All"]
                        : asset.variant
                          ? asset.variant.split(",").map((s) => s.trim()).filter(Boolean)
                          : []
                    }
                    onView={() => setLightboxAsset(asset)}
                    onEdit={() => openEditFrame(asset)}
                    onSetPrimary={() => void handleSetPrimaryFrame(asset.id)}
                    onDelete={() => setDeleteAssetId(asset.id)}
                  />
                ))}

                <button
                  type="button"
                  onClick={() => setShowUploadFrame(true)}
                  className="group relative aspect-square rounded-xl bg-surface-container-low overflow-hidden cursor-pointer border-2 border-dashed border-outline-variant/30 flex flex-col items-center justify-center gap-2 hover:bg-surface-container-high transition-colors"
                >
                  <DashboardMaterialIcon icon="add_circle" className="text-dashboard-primary" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    Upload Frame
                  </span>
                </button>
              </div>
            ) : null}

            {activeTab === "fonts" ? (
              <FontGallery
                clientId={client.id}
                fonts={data.fonts ?? []}
                onRefresh={() => router.refresh()}
              />
            ) : null}

            {activeTab === "canvas-sessions" ? (
              <div className="space-y-3">
                {(visibleSessions ?? []).map((session, idx) => (
                  <CanvasSessionCard
                    key={session.id}
                    session={session}
                    fallbackIcon={idx % 2 === 0 ? "brush" : "history"}
                    createdLabel={formatRelativeFromNow(session.created_at)}
                    deleteDisabled={sessionAction.busyId !== null}
                    onDelete={() => setDeleteSessionId(session.id)}
                  />
                ))}
                {visibleSessions.length === 0 ? (
                  <div className="text-sm text-on-surface-variant/70">
                    No canvas sessions saved for this client yet.
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Details Sidebar */}
          <div className="space-y-6">
            <div className="bg-surface-container-low rounded-xl p-6 space-y-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant">
                Client Details
              </h3>

              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-on-surface-variant/70">Point of Contact</span>
                  <span className="font-semibold">{client.email ?? "—"}</span>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-on-surface-variant/70">Status</span>
                  <span className="font-semibold">{statusLabel}</span>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-on-surface-variant/70">Custom upload logo</span>
                  <span className="font-semibold">
                    {client.allow_custom_logo ? "Enabled" : "Disabled"}
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <span className="text-on-surface-variant/70">Description</span>
                  <p className="font-semibold text-on-surface whitespace-pre-wrap break-words">
                    {clientDescription}
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

