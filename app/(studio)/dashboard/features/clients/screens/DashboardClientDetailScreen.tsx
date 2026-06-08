"use client";

import React, { useEffect, useMemo, useState } from "react";
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
import { GeneratedImagesGrid } from "@/app/(studio)/dashboard/features/generated-images/components/GeneratedImagesGrid";
import { GalleryLightbox } from "@/app/(studio)/dashboard/components/gallery-lightbox";
import type { GeneratedImageCardItem } from "@/app/(studio)/dashboard/features/generated-images/components/GeneratedImageCard";

type TabKey =
  | "assets"
  | "frames"
  | "fonts"
  | "canvas-sessions"
  | "generated-images"
  | "fundraising";

const TACTICS = [
  "peer-to-peer",
  "in-person-ask",
  "call-banking",
  "house-parties",
  "crowdfunding",
  "email-appeals",
  "sms-whatsapp",
  "social-media",
  "local-business",
  "community-events",
  "walk-a-thon",
  "sporting-sub-a",
  "sporting-sub-b",
  "gala",
  "matching-sub-a",
  "matching-sub-b",
  "tribute-memorial",
  "tribute-occasion",
  "raffle",
  "sweepstakes",
  "giving-days",
  "merchandise",
] as const;

type TacticStatus = "encouraged" | "allowed" | "discouraged" | "prohibited";
const TACTIC_STATUSES: TacticStatus[] = ["encouraged", "allowed", "discouraged", "prohibited"];
const TIER_KEYS = ["peer_community", "events", "incentive", "supported"] as const;
type TierKey = (typeof TIER_KEYS)[number];

type DashboardClientDetailScreenProps = Readonly<{
  data: ClientDetailPageData;
}>;

export function DashboardClientDetailScreen({ data }: DashboardClientDetailScreenProps) {
  const router = useRouter();
  const client = data.client;
  const plan = data.plan;
  const quota = data.quota;

  const [activeTab, setActiveTab] = useState<TabKey>("assets");
  const [editOpen, setEditOpen] = useState(false);
  const [lightboxAsset, setLightboxAsset] = useState<ClientAsset | null>(null);
  const [generatedLightbox, setGeneratedLightbox] = useState<{
    file_url: string;
    name: string;
    display_name: string | null;
  } | null>(null);
  const [toggleConfirmOpen, setToggleConfirmOpen] = useState(false);
  const [toggleTargetIsActive, setToggleTargetIsActive] = useState(false);
  const toggleAction = useServerAction();
  const [deleteAssetId, setDeleteAssetId] = useState<string | null>(null);
  const assetAction = useServerAction();
  const [deleteAssetBusy, setDeleteAssetBusy] = useState(false);
  const [deleteAssetError, setDeleteAssetError] = useState<string | null>(null);
  const [editFrame, setEditFrame] = useState<ClientAsset | null>(null);
  const [editVariantAll, setEditVariantAll] = useState(false);
  const [editVariantRatios, setEditVariantRatios] = useState<string[]>([]);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [showUploadAsset, setShowUploadAsset] = useState(false);
  const [showUploadFrame, setShowUploadFrame] = useState(false);
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);
  const [deleteSessionBusy, setDeleteSessionBusy] = useState(false);
  const [deleteSessionError, setDeleteSessionError] = useState<string | null>(null);
  const sessionAction = useServerAction();
  const [generatedPage, setGeneratedPage] = useState(1);

  // Fundraising form state
  const initialFundraising = data.fundraisingData;
  const [fundraisingForm, setFundraisingForm] = useState<{
    org_name: string;
    donation_page_url: string;
    approval_required: boolean;
    approval_turnaround: string;
    user_role_description: string;
    crm_access: boolean;
    crm_tool_note: string;
    cash_handling_process: string;
    org_messaging_notes: string;
    audience_knowledge_members: string;
    audience_knowledge_supporters: string;
    audience_knowledge_public: string;
    consent_forms_url: string;
    leader_experience_default: string;
    story_source_rules: string;
    story_flag_in_brief: boolean;
    legal_structure: string;
    legal_jurisdiction: string;
    p2p_page_support: boolean;
    email_capture_automatic: boolean;
    primary_outreach_channels: string;
    social_platform_registrations: string;
    active_matching_gift: boolean;
    active_matching_gift_details: string;
    strategic_goal: string;
    impact_statement: string;
    relational_goal: string;
    community_terms: string;
    tone_descriptors: string;
  }>({
    org_name: initialFundraising?.org_name ?? "",
    donation_page_url: initialFundraising?.donation_page_url ?? "",
    approval_required: initialFundraising?.approval_required ?? false,
    approval_turnaround: initialFundraising?.approval_turnaround ?? "",
    user_role_description: initialFundraising?.user_role_description ?? "",
    crm_access: initialFundraising?.crm_access ?? false,
    crm_tool_note: initialFundraising?.crm_tool_note ?? "",
    cash_handling_process: initialFundraising?.cash_handling_process ?? "",
    org_messaging_notes: initialFundraising?.org_messaging_notes ?? "",
    audience_knowledge_members: initialFundraising?.audience_knowledge_members ?? "",
    audience_knowledge_supporters: initialFundraising?.audience_knowledge_supporters ?? "",
    audience_knowledge_public: initialFundraising?.audience_knowledge_public ?? "",
    consent_forms_url: initialFundraising?.consent_forms_url ?? "",
    leader_experience_default: initialFundraising?.leader_experience_default ?? "",
    story_source_rules: initialFundraising?.story_source_rules ?? "",
    story_flag_in_brief: initialFundraising?.story_flag_in_brief ?? true,
    legal_structure: initialFundraising?.legal_structure ?? "",
    legal_jurisdiction: initialFundraising?.legal_jurisdiction ?? "",
    p2p_page_support: initialFundraising?.p2p_page_support ?? false,
    email_capture_automatic: initialFundraising?.email_capture_automatic ?? false,
    primary_outreach_channels: initialFundraising?.primary_outreach_channels ?? "",
    social_platform_registrations: initialFundraising?.social_platform_registrations ?? "",
    active_matching_gift: initialFundraising?.active_matching_gift ?? false,
    active_matching_gift_details: initialFundraising?.active_matching_gift_details ?? "",
    strategic_goal: initialFundraising?.strategic_goal ?? "",
    impact_statement: initialFundraising?.impact_statement ?? "",
    relational_goal: initialFundraising?.relational_goal ?? "",
    community_terms: initialFundraising?.community_terms ?? "",
    tone_descriptors: initialFundraising?.tone_descriptors ?? "",
  });
  const [fundraisingSaving, setFundraisingSaving] = useState(false);
  const [fundraisingError, setFundraisingError] = useState<string | null>(null);
  const [fundraisingSuccess, setFundraisingSuccess] = useState(false);
  const [tacticSettings, setTacticSettings] = useState<Record<string, { status: TacticStatus; conditions: string }>>(() => {
    const existing = initialFundraising?.tactic_settings;
    return Object.fromEntries(
      TACTICS.map((t) => [
        t,
        {
          status: (existing?.[t]?.status as TacticStatus | undefined) ?? "allowed",
          conditions: existing?.[t]?.conditions ?? "",
        },
      ])
    );
  });
  const [storyRequirementByTier, setStoryRequirementByTier] = useState<Record<TierKey, "hard_requirement" | "strong_recommendation">>(() => {
    const existing = initialFundraising?.story_requirement_by_tier;
    return {
      peer_community: (existing?.peer_community as "hard_requirement" | "strong_recommendation" | undefined) ?? "strong_recommendation",
      events: (existing?.events as "hard_requirement" | "strong_recommendation" | undefined) ?? "strong_recommendation",
      incentive: (existing?.incentive as "hard_requirement" | "strong_recommendation" | undefined) ?? "strong_recommendation",
      supported: (existing?.supported as "hard_requirement" | "strong_recommendation" | undefined) ?? "strong_recommendation",
    };
  });
  const [guardrails, setGuardrails] = useState<Array<{ id: string; rule: string; reason: string; applies_to: string }>>(() => {
    const existing = initialFundraising?.absolute_guardrails;
    return (existing ?? []).map((g, i) => ({
      id: String(i),
      rule: g.rule ?? "",
      reason: g.reason ?? "",
      applies_to: g.applies_to ?? "both",
    }));
  });

  const handleSaveFundraising = async () => {
    if (!client) return;
    setFundraisingSaving(true);
    setFundraisingError(null);
    setFundraisingSuccess(false);
    const method = data.fundraisingData ? "PATCH" : "POST";
    try {
      const res = await fetch(`/api/dashboard/clients/${client.id}/fundraising`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_name: fundraisingForm.org_name.trim() || null,
          donation_page_url: fundraisingForm.donation_page_url.trim() || null,
          approval_required: fundraisingForm.approval_required,
          approval_turnaround: fundraisingForm.approval_turnaround.trim() || null,
          user_role_description: fundraisingForm.user_role_description.trim() || null,
          crm_access: fundraisingForm.crm_access,
          crm_tool_note: fundraisingForm.crm_tool_note.trim() || null,
          cash_handling_process: fundraisingForm.cash_handling_process.trim() || null,
          org_messaging_notes: fundraisingForm.org_messaging_notes.trim() || null,
          audience_knowledge_members: fundraisingForm.audience_knowledge_members.trim() || null,
          audience_knowledge_supporters: fundraisingForm.audience_knowledge_supporters.trim() || null,
          audience_knowledge_public: fundraisingForm.audience_knowledge_public.trim() || null,
          consent_forms_url: fundraisingForm.consent_forms_url.trim() || null,
          leader_experience_default: fundraisingForm.leader_experience_default || null,
          story_source_rules: fundraisingForm.story_source_rules || null,
          story_flag_in_brief: fundraisingForm.story_flag_in_brief,
          legal_structure: fundraisingForm.legal_structure.trim() || null,
          legal_jurisdiction: fundraisingForm.legal_jurisdiction.trim() || null,
          p2p_page_support: fundraisingForm.p2p_page_support,
          email_capture_automatic: fundraisingForm.email_capture_automatic,
          primary_outreach_channels: fundraisingForm.primary_outreach_channels.trim() || null,
          social_platform_registrations: fundraisingForm.social_platform_registrations.trim() || null,
          active_matching_gift: fundraisingForm.active_matching_gift,
          active_matching_gift_details: fundraisingForm.active_matching_gift_details.trim() || null,
          strategic_goal: fundraisingForm.strategic_goal.trim() || null,
          impact_statement: fundraisingForm.impact_statement.trim() || null,
          relational_goal: fundraisingForm.relational_goal.trim() || null,
          community_terms: fundraisingForm.community_terms.trim() || null,
          tone_descriptors: fundraisingForm.tone_descriptors.trim() || null,
          tactic_settings: Object.fromEntries(
            TACTICS.map((t) => [
              t,
              {
                status: tacticSettings[t]?.status ?? "allowed",
                conditions: tacticSettings[t]?.conditions?.trim() || null,
              },
            ])
          ),
          story_requirement_by_tier: storyRequirementByTier,
          absolute_guardrails: guardrails
            .map((g) => ({ rule: g.rule.trim(), reason: g.reason.trim(), applies_to: g.applies_to }))
            .filter((g) => g.rule || g.reason),
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || "Failed to save fundraising data");
      }
      setFundraisingSuccess(true);
      toast.success("Fundraising data saved");
      router.refresh();
    } catch (err) {
      setFundraisingError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setFundraisingSaving(false);
    }
  };

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

  const generatedItems = useMemo(() => {
    const clientId = client?.ca_user_id ?? client?.id ?? "client";
    return (data.generatedImages ?? []).map(
      (img): GeneratedImageCardItem => ({
        id: img.id,
        client_id: img.client_id,
        client_name: client?.name ?? undefined,
        cost: img.cost,
        prompt: img.prompt,
        created_at: img.created_at,
        image_url: `/api/images/${img.id}`,
      })
    );
  }, [data.generatedImages, client?.ca_user_id, client?.id, client?.name]);

  useEffect(() => {
    if (activeTab === "generated-images") {
      setGeneratedPage(1);
    }
  }, [activeTab]);

  const generatedPageSize = 9;
  const generatedTotalPages = useMemo(() => {
    return Math.max(1, Math.ceil((generatedItems?.length ?? 0) / generatedPageSize));
  }, [generatedItems?.length]);

  const generatedVisibleItems = useMemo(() => {
    const page = Math.min(generatedTotalPages, Math.max(1, generatedPage));
    const start = (page - 1) * generatedPageSize;
    return generatedItems.slice(start, start + generatedPageSize);
  }, [generatedItems, generatedPage, generatedTotalPages]);

  const generatedPaginationButtons = useMemo(() => {
    const totalPages = generatedTotalPages;
    const currentPage = Math.min(totalPages, Math.max(1, generatedPage));
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);

    const pages: (number | "ellipsis")[] = [1];
    const left = Math.max(2, currentPage - 1);
    const right = Math.min(totalPages - 1, currentPage + 1);

    if (left > 2) pages.push("ellipsis");
    for (let i = left; i <= right; i++) pages.push(i);
    if (right < totalPages - 1) pages.push("ellipsis");
    pages.push(totalPages);
    return pages;
  }, [generatedTotalPages, generatedPage]);

  const handleDownloadGenerated = async (item: GeneratedImageCardItem) => {
    try {
      const res = await fetch(item.image_url);
      if (!res.ok) throw new Error(`Download failed (${res.status})`);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      try {
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = `bfl-${item.client_id}-${item.id}.jpg`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
      toast.success("Download started");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to download");
    }
  };

  const handleViewGenerated = (item: GeneratedImageCardItem) => {
    setGeneratedLightbox({
      file_url: item.image_url,
      name: item.id,
      display_name: item.client_name ?? item.client_id,
    });
  };

  const handleEditSave = async (form: {
    ca_user_id: string;
    name: string;
    email: string;
    description?: string;
    plan_id?: string | null;
    is_active: boolean;
    allow_custom_logo: boolean;
  }) => {
    if (!client) return;
    const result = await updateClientAction(client.id, {
      name: form.name,
      email: form.email,
      description: form.description?.trim() || null,
      plan_id: form.plan_id ?? null,
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

  const handleDeleteAsset = async () => {
    if (!client || !deleteAssetId) return;
    setDeleteAssetBusy(true);
    setDeleteAssetError(null);
    const result = await deleteAssetAction(client.id, deleteAssetId);
    if (result.error) {
      setDeleteAssetError(result.error);
      setDeleteAssetBusy(false);
      return;
    }
    toast.success("Asset deleted");
    setDeleteAssetBusy(false);
    setDeleteAssetId(null);
    router.refresh();
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

  const handleDeleteSession = async () => {
    if (!client || !deleteSessionId) return;
    setDeleteSessionBusy(true);
    setDeleteSessionError(null);
    const result = await deleteCanvasSessionAction(client.id, deleteSessionId);
    if (result.error) {
      setDeleteSessionError(result.error);
      setDeleteSessionBusy(false);
      return;
    }
    toast.success("Session deleted");
    setDeleteSessionBusy(false);
    setDeleteSessionId(null);
    router.refresh();
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
      case "generated-images":
        return "Generated Images";
      case "fundraising":
        return "Fundraising";
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
        <GalleryLightbox
          asset={generatedLightbox}
          onClose={() => setGeneratedLightbox(null)}
          description="Generated image preview"
        />
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
                plan_id: client.plan_id ?? null,
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
          onOpenChange={(open) => {
            if (!open) {
              setDeleteSessionId(null);
              setDeleteSessionBusy(false);
              setDeleteSessionError(null);
            }
          }}
          title="Delete canvas session"
          description="Are you sure you want to delete this canvas session? This action cannot be undone."
          actionLabel="Delete"
          busyLabel="Deleting..."
          busy={deleteSessionBusy}
          errorMessage={deleteSessionError}
          onConfirm={handleDeleteSession}
        />

        <ConfirmDialog
          open={!!deleteAssetId}
          onOpenChange={(open) => {
            if (!open) {
              setDeleteAssetId(null);
              setDeleteAssetBusy(false);
              setDeleteAssetError(null);
            }
          }}
          title="Delete asset"
          description="Are you sure you want to delete this asset? This action cannot be undone."
          actionLabel="Delete"
          busyLabel="Deleting..."
          busy={deleteAssetBusy}
          errorMessage={deleteAssetError}
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
          <button
            onClick={() => setActiveTab("generated-images")}
            className={cx(
              "pb-4 text-sm relative",
              activeTab === "generated-images"
                ? "text-blue-700 font-bold border-b-2 border-blue-600"
                : "text-on-surface-variant font-medium hover:text-on-surface transition-colors"
            )}
          >
            Generated Images
          </button>
          <button
            onClick={() => setActiveTab("fundraising")}
            className={cx(
              "pb-4 text-sm relative",
              activeTab === "fundraising"
                ? "text-blue-700 font-bold border-b-2 border-blue-600"
                : "text-on-surface-variant font-medium hover:text-on-surface transition-colors"
            )}
          >
            Fundraising
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

            {activeTab === "generated-images" ? (
              <div className="space-y-10">
                <GeneratedImagesGrid
                  items={generatedVisibleItems}
                  onView={handleViewGenerated}
                  onDownload={(item) => void handleDownloadGenerated(item)}
                  emptyTitle="No generated images"
                  emptyDescription="This client has no generated images yet."
                  className="xl:grid-cols-3"
                />

                {generatedTotalPages > 1 ? (
                  <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/10">
                    <div className="px-6 py-4 bg-white border-t-0 border-surface-container flex items-center justify-between">
                      <button
                        type="button"
                        disabled={generatedPage <= 1}
                        onClick={() => setGeneratedPage((p) => Math.max(1, p - 1))}
                        className="px-3 py-1.5 text-xs font-semibold text-on-surface-variant hover:bg-surface-container-low rounded-lg transition-all flex items-center gap-1 disabled:opacity-50"
                      >
                        <DashboardMaterialIcon icon="chevron_left" className="text-sm" />
                        Previous
                      </button>

                      <div className="flex items-center gap-1">
                        {generatedPaginationButtons.map((p, idx) => {
                          if (p === "ellipsis") {
                            return (
                              <span key={`e-${idx}`} className="px-2 text-on-surface-variant">
                                ...
                              </span>
                            );
                          }

                          const num = p as number;
                          const isCurrent = num === generatedPage;
                          return (
                            <button
                              key={num}
                              type="button"
                              onClick={() => setGeneratedPage(num)}
                              className={cx(
                                "w-8 h-8 flex items-center justify-center text-xs rounded-lg transition-colors",
                                isCurrent
                                  ? "font-bold bg-dashboard-primary text-dashboard-on-primary shadow-md shadow-dashboard-primary/20"
                                  : "font-medium hover:bg-surface-container-low"
                              )}
                            >
                              {num}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        disabled={generatedPage >= generatedTotalPages}
                        onClick={() => setGeneratedPage((p) => Math.min(generatedTotalPages, p + 1))}
                        className="px-3 py-1.5 text-xs font-semibold text-on-surface-variant hover:bg-surface-container-low rounded-lg transition-all flex items-center gap-1 disabled:opacity-50"
                      >
                        Next
                        <DashboardMaterialIcon icon="chevron_right" className="text-sm" />
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {activeTab === "fundraising" ? (
              <div className="space-y-8">
                {/* Organization */}
                <div className="bg-surface-container-low rounded-xl p-6 space-y-5">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Organization</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-on-surface-variant" htmlFor="fr-org-name">Organization Name</label>
                      <input
                        id="fr-org-name"
                        type="text"
                        value={fundraisingForm.org_name}
                        onChange={(e) => setFundraisingForm((f) => ({ ...f, org_name: e.target.value }))}
                        disabled={fundraisingSaving}
                        placeholder="e.g. ACLU"
                        className="w-full rounded-lg border border-outline-variant/20 bg-surface-container-lowest px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-dashboard-primary/30 disabled:opacity-50"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-on-surface-variant" htmlFor="fr-donation-url">Donation Page URL</label>
                      <input
                        id="fr-donation-url"
                        type="url"
                        value={fundraisingForm.donation_page_url}
                        onChange={(e) => setFundraisingForm((f) => ({ ...f, donation_page_url: e.target.value }))}
                        disabled={fundraisingSaving}
                        placeholder="https://"
                        className="w-full rounded-lg border border-outline-variant/20 bg-surface-container-lowest px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-dashboard-primary/30 disabled:opacity-50"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={fundraisingForm.approval_required}
                        onClick={() => setFundraisingForm((f) => ({ ...f, approval_required: !f.approval_required }))}
                        disabled={fundraisingSaving}
                        className={cx(
                          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-dashboard-primary/30 disabled:opacity-50",
                          fundraisingForm.approval_required ? "bg-dashboard-primary" : "bg-outline-variant/40"
                        )}
                      >
                        <span
                          className={cx(
                            "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform",
                            fundraisingForm.approval_required ? "translate-x-4" : "translate-x-0"
                          )}
                        />
                      </button>
                      <span className="text-sm font-medium text-on-surface">Approval Required</span>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-on-surface-variant" htmlFor="fr-approval-turnaround">Approval Turnaround</label>
                      <input
                        id="fr-approval-turnaround"
                        type="text"
                        value={fundraisingForm.approval_turnaround}
                        onChange={(e) => setFundraisingForm((f) => ({ ...f, approval_turnaround: e.target.value }))}
                        disabled={fundraisingSaving || !fundraisingForm.approval_required}
                        placeholder="e.g. 48 hours"
                        className="w-full rounded-lg border border-outline-variant/20 bg-surface-container-lowest px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-dashboard-primary/30 disabled:opacity-50"
                      />
                    </div>
                  </div>
                </div>

                {/* User Context */}
                <div className="bg-surface-container-low rounded-xl p-6 space-y-5">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">User Context</h4>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-on-surface-variant" htmlFor="fr-user-role">User Role Description</label>
                    <textarea
                      id="fr-user-role"
                      rows={3}
                      value={fundraisingForm.user_role_description}
                      onChange={(e) => setFundraisingForm((f) => ({ ...f, user_role_description: e.target.value }))}
                      disabled={fundraisingSaving}
                      placeholder="e.g. A group leader who fundraises regularly for their organization"
                      className="w-full rounded-lg border border-outline-variant/20 bg-surface-container-lowest px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-dashboard-primary/30 disabled:opacity-50 resize-none"
                    />
                  </div>
                </div>

                {/* Campaign */}
                <div className="bg-surface-container-low rounded-xl p-6 space-y-5">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Campaign</h4>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={fundraisingForm.crm_access}
                      onClick={() => setFundraisingForm((f) => ({ ...f, crm_access: !f.crm_access }))}
                      disabled={fundraisingSaving}
                      className={cx(
                        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-dashboard-primary/30 disabled:opacity-50",
                        fundraisingForm.crm_access ? "bg-dashboard-primary" : "bg-outline-variant/40"
                      )}
                    >
                      <span
                        className={cx(
                          "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform",
                          fundraisingForm.crm_access ? "translate-x-4" : "translate-x-0"
                        )}
                      />
                    </button>
                    <span className="text-sm font-medium text-on-surface">CRM Access</span>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-on-surface-variant" htmlFor="fr-crm-note">CRM Tool Note</label>
                    <input
                      id="fr-crm-note"
                      type="text"
                      value={fundraisingForm.crm_tool_note}
                      onChange={(e) => setFundraisingForm((f) => ({ ...f, crm_tool_note: e.target.value }))}
                      disabled={fundraisingSaving}
                      placeholder="e.g. Action Network — manual export for now"
                      className="w-full rounded-lg border border-outline-variant/20 bg-surface-container-lowest px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-dashboard-primary/30 disabled:opacity-50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-on-surface-variant" htmlFor="fr-cash-handling">Cash Handling Process</label>
                    <textarea
                      id="fr-cash-handling"
                      rows={3}
                      value={fundraisingForm.cash_handling_process}
                      onChange={(e) => setFundraisingForm((f) => ({ ...f, cash_handling_process: e.target.value }))}
                      disabled={fundraisingSaving}
                      placeholder="e.g. All cash collected at events must be counted by two people and deposited within 24 hours using Form X"
                      className="w-full rounded-lg border border-outline-variant/20 bg-surface-container-lowest px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-dashboard-primary/30 disabled:opacity-50 resize-none"
                    />
                  </div>
                </div>

                {/* Consent */}
                <div className="bg-surface-container-low rounded-xl p-6 space-y-5">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Consent</h4>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-on-surface-variant" htmlFor="fr-consent-url">Consent Forms URL</label>
                    <input
                      id="fr-consent-url"
                      type="url"
                      value={fundraisingForm.consent_forms_url}
                      onChange={(e) => setFundraisingForm((f) => ({ ...f, consent_forms_url: e.target.value }))}
                      disabled={fundraisingSaving}
                      placeholder="https://"
                      className="w-full rounded-lg border border-outline-variant/20 bg-surface-container-lowest px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-dashboard-primary/30 disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Messaging */}
                <div className="bg-surface-container-low rounded-xl p-6 space-y-5">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Messaging</h4>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-on-surface-variant" htmlFor="fr-messaging-notes">Org Messaging Notes</label>
                    <textarea
                      id="fr-messaging-notes"
                      rows={4}
                      value={fundraisingForm.org_messaging_notes}
                      onChange={(e) => setFundraisingForm((f) => ({ ...f, org_messaging_notes: e.target.value }))}
                      disabled={fundraisingSaving}
                      placeholder="Talking points, key messages, and language the model should incorporate when personalizing scripts"
                      className="w-full rounded-lg border border-outline-variant/20 bg-surface-container-lowest px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-dashboard-primary/30 disabled:opacity-50 resize-none"
                    />
                  </div>
                </div>

                {/* Audience Knowledge */}
                <div className="bg-surface-container-low rounded-xl p-6 space-y-5">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Audience Knowledge</h4>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-on-surface-variant" htmlFor="fr-audience-members">Members</label>
                    <textarea
                      id="fr-audience-members"
                      rows={2}
                      value={fundraisingForm.audience_knowledge_members}
                      onChange={(e) => setFundraisingForm((f) => ({ ...f, audience_knowledge_members: e.target.value }))}
                      disabled={fundraisingSaving}
                      placeholder="e.g. High familiarity with the issue; already engaged volunteers"
                      className="w-full rounded-lg border border-outline-variant/20 bg-surface-container-lowest px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-dashboard-primary/30 disabled:opacity-50 resize-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-on-surface-variant" htmlFor="fr-audience-supporters">Supporters</label>
                    <textarea
                      id="fr-audience-supporters"
                      rows={2}
                      value={fundraisingForm.audience_knowledge_supporters}
                      onChange={(e) => setFundraisingForm((f) => ({ ...f, audience_knowledge_supporters: e.target.value }))}
                      disabled={fundraisingSaving}
                      placeholder="e.g. Moderate familiarity; donated before but not deeply engaged"
                      className="w-full rounded-lg border border-outline-variant/20 bg-surface-container-lowest px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-dashboard-primary/30 disabled:opacity-50 resize-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-on-surface-variant" htmlFor="fr-audience-public">General Public</label>
                    <textarea
                      id="fr-audience-public"
                      rows={2}
                      value={fundraisingForm.audience_knowledge_public}
                      onChange={(e) => setFundraisingForm((f) => ({ ...f, audience_knowledge_public: e.target.value }))}
                      disabled={fundraisingSaving}
                      placeholder="e.g. Low familiarity; needs basic context before the ask"
                      className="w-full rounded-lg border border-outline-variant/20 bg-surface-container-lowest px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-dashboard-primary/30 disabled:opacity-50 resize-none"
                    />
                  </div>
                </div>

                {/* Leader Profile */}
                <div className="bg-surface-container-low rounded-xl p-6 space-y-5">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Leader Profile</h4>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-on-surface-variant" htmlFor="fr-leader-exp">Leader Experience Default</label>
                    <select
                      id="fr-leader-exp"
                      value={fundraisingForm.leader_experience_default}
                      onChange={(e) => setFundraisingForm((f) => ({ ...f, leader_experience_default: e.target.value }))}
                      disabled={fundraisingSaving}
                      className="w-full rounded-lg border border-outline-variant/20 bg-surface-container-lowest px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-dashboard-primary/30 disabled:opacity-50"
                    >
                      <option value="">— not set —</option>
                      <option value="first_timer">First Timer</option>
                      <option value="community_practitioner">Community Practitioner</option>
                      <option value="organised_informal">Organised Informal</option>
                      <option value="experienced">Experienced</option>
                      <option value="mixed">Mixed</option>
                    </select>
                  </div>
                </div>

                {/* Story Settings */}
                <div className="bg-surface-container-low rounded-xl p-6 space-y-5">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Story Settings</h4>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-on-surface-variant" htmlFor="fr-story-source">Story Source Rules</label>
                    <select
                      id="fr-story-source"
                      value={fundraisingForm.story_source_rules}
                      onChange={(e) => setFundraisingForm((f) => ({ ...f, story_source_rules: e.target.value }))}
                      disabled={fundraisingSaving}
                      className="w-full rounded-lg border border-outline-variant/20 bg-surface-container-lowest px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-dashboard-primary/30 disabled:opacity-50"
                    >
                      <option value="">— not set —</option>
                      <option value="cleared_library_only">Cleared Library Only</option>
                      <option value="org_comms_ok">Org Comms OK</option>
                      <option value="personal_only">Personal Only</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={fundraisingForm.story_flag_in_brief}
                      onClick={() => setFundraisingForm((f) => ({ ...f, story_flag_in_brief: !f.story_flag_in_brief }))}
                      disabled={fundraisingSaving}
                      className={cx(
                        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-dashboard-primary/30 disabled:opacity-50",
                        fundraisingForm.story_flag_in_brief ? "bg-dashboard-primary" : "bg-outline-variant/40"
                      )}
                    >
                      <span
                        className={cx(
                          "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform",
                          fundraisingForm.story_flag_in_brief ? "translate-x-4" : "translate-x-0"
                        )}
                      />
                    </button>
                    <span className="text-sm font-medium text-on-surface">Flag Story in Brief</span>
                  </div>
                </div>

                {/* Strategic Foundation */}
                <div className="bg-surface-container-low rounded-xl p-6 space-y-5">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Strategic Foundation</h4>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-on-surface-variant" htmlFor="fr-strategic-goal">Strategic Goal</label>
                    <textarea
                      id="fr-strategic-goal"
                      rows={3}
                      value={fundraisingForm.strategic_goal}
                      onChange={(e) => setFundraisingForm((f) => ({ ...f, strategic_goal: e.target.value }))}
                      disabled={fundraisingSaving}
                      placeholder="What is the org trying to achieve?"
                      className="w-full rounded-lg border border-outline-variant/20 bg-surface-container-lowest px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-dashboard-primary/30 disabled:opacity-50 resize-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-on-surface-variant" htmlFor="fr-impact-statement">Impact Statement</label>
                    <textarea
                      id="fr-impact-statement"
                      rows={3}
                      value={fundraisingForm.impact_statement}
                      onChange={(e) => setFundraisingForm((f) => ({ ...f, impact_statement: e.target.value }))}
                      disabled={fundraisingSaving}
                      placeholder="How does the org describe its impact?"
                      className="w-full rounded-lg border border-outline-variant/20 bg-surface-container-lowest px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-dashboard-primary/30 disabled:opacity-50 resize-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-on-surface-variant" htmlFor="fr-relational-goal">Relational Goal</label>
                    <textarea
                      id="fr-relational-goal"
                      rows={3}
                      value={fundraisingForm.relational_goal}
                      onChange={(e) => setFundraisingForm((f) => ({ ...f, relational_goal: e.target.value }))}
                      disabled={fundraisingSaving}
                      placeholder="What relationship does the org want to build with its community?"
                      className="w-full rounded-lg border border-outline-variant/20 bg-surface-container-lowest px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-dashboard-primary/30 disabled:opacity-50 resize-none"
                    />
                  </div>
                </div>

                {/* Voice & Tone */}
                <div className="bg-surface-container-low rounded-xl p-6 space-y-5">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Voice & Tone</h4>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-on-surface-variant" htmlFor="fr-community-terms">Community Terms</label>
                    <textarea
                      id="fr-community-terms"
                      rows={3}
                      value={fundraisingForm.community_terms}
                      onChange={(e) => setFundraisingForm((f) => ({ ...f, community_terms: e.target.value }))}
                      disabled={fundraisingSaving}
                      placeholder="Preferred terms the org uses for its community members"
                      className="w-full rounded-lg border border-outline-variant/20 bg-surface-container-lowest px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-dashboard-primary/30 disabled:opacity-50 resize-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-on-surface-variant" htmlFor="fr-tone-descriptors">Tone Descriptors</label>
                    <input
                      id="fr-tone-descriptors"
                      type="text"
                      value={fundraisingForm.tone_descriptors}
                      onChange={(e) => setFundraisingForm((f) => ({ ...f, tone_descriptors: e.target.value }))}
                      disabled={fundraisingSaving}
                      placeholder="e.g. warm, direct, hopeful, never doom"
                      className="w-full rounded-lg border border-outline-variant/20 bg-surface-container-lowest px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-dashboard-primary/30 disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Legal & Compliance */}
                <div className="bg-surface-container-low rounded-xl p-6 space-y-5">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Legal & Compliance</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-on-surface-variant" htmlFor="fr-legal-structure">Legal Structure</label>
                      <input
                        id="fr-legal-structure"
                        type="text"
                        value={fundraisingForm.legal_structure}
                        onChange={(e) => setFundraisingForm((f) => ({ ...f, legal_structure: e.target.value }))}
                        disabled={fundraisingSaving}
                        placeholder="e.g. 501(c)(3), registered charity"
                        className="w-full rounded-lg border border-outline-variant/20 bg-surface-container-lowest px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-dashboard-primary/30 disabled:opacity-50"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-on-surface-variant" htmlFor="fr-legal-jurisdiction">Legal Jurisdiction</label>
                      <input
                        id="fr-legal-jurisdiction"
                        type="text"
                        value={fundraisingForm.legal_jurisdiction}
                        onChange={(e) => setFundraisingForm((f) => ({ ...f, legal_jurisdiction: e.target.value }))}
                        disabled={fundraisingSaving}
                        placeholder="e.g. United States, California"
                        className="w-full rounded-lg border border-outline-variant/20 bg-surface-container-lowest px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-dashboard-primary/30 disabled:opacity-50"
                      />
                    </div>
                  </div>
                </div>

                {/* Platform & Infrastructure */}
                <div className="bg-surface-container-low rounded-xl p-6 space-y-5">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Platform & Infrastructure</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-on-surface-variant" htmlFor="fr-outreach-channels">Primary Outreach Channels</label>
                      <input
                        id="fr-outreach-channels"
                        type="text"
                        value={fundraisingForm.primary_outreach_channels}
                        onChange={(e) => setFundraisingForm((f) => ({ ...f, primary_outreach_channels: e.target.value }))}
                        disabled={fundraisingSaving}
                        placeholder="e.g. email, WhatsApp, social media"
                        className="w-full rounded-lg border border-outline-variant/20 bg-surface-container-lowest px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-dashboard-primary/30 disabled:opacity-50"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-on-surface-variant" htmlFor="fr-social-platforms">Social Platform Registrations</label>
                      <input
                        id="fr-social-platforms"
                        type="text"
                        value={fundraisingForm.social_platform_registrations}
                        onChange={(e) => setFundraisingForm((f) => ({ ...f, social_platform_registrations: e.target.value }))}
                        disabled={fundraisingSaving}
                        placeholder="e.g. Meta yes, Instagram yes, YouTube no"
                        className="w-full rounded-lg border border-outline-variant/20 bg-surface-container-lowest px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-dashboard-primary/30 disabled:opacity-50"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={fundraisingForm.p2p_page_support}
                        onClick={() => setFundraisingForm((f) => ({ ...f, p2p_page_support: !f.p2p_page_support }))}
                        disabled={fundraisingSaving}
                        className={cx(
                          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-dashboard-primary/30 disabled:opacity-50",
                          fundraisingForm.p2p_page_support ? "bg-dashboard-primary" : "bg-outline-variant/40"
                        )}
                      >
                        <span
                          className={cx(
                            "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform",
                            fundraisingForm.p2p_page_support ? "translate-x-4" : "translate-x-0"
                          )}
                        />
                      </button>
                      <span className="text-sm font-medium text-on-surface">P2P Page Support</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={fundraisingForm.email_capture_automatic}
                        onClick={() => setFundraisingForm((f) => ({ ...f, email_capture_automatic: !f.email_capture_automatic }))}
                        disabled={fundraisingSaving}
                        className={cx(
                          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-dashboard-primary/30 disabled:opacity-50",
                          fundraisingForm.email_capture_automatic ? "bg-dashboard-primary" : "bg-outline-variant/40"
                        )}
                      >
                        <span
                          className={cx(
                            "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform",
                            fundraisingForm.email_capture_automatic ? "translate-x-4" : "translate-x-0"
                          )}
                        />
                      </button>
                      <span className="text-sm font-medium text-on-surface">Email Capture Automatic</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={fundraisingForm.active_matching_gift}
                        onClick={() => setFundraisingForm((f) => ({ ...f, active_matching_gift: !f.active_matching_gift }))}
                        disabled={fundraisingSaving}
                        className={cx(
                          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-dashboard-primary/30 disabled:opacity-50",
                          fundraisingForm.active_matching_gift ? "bg-dashboard-primary" : "bg-outline-variant/40"
                        )}
                      >
                        <span
                          className={cx(
                            "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform",
                            fundraisingForm.active_matching_gift ? "translate-x-4" : "translate-x-0"
                          )}
                        />
                      </button>
                      <span className="text-sm font-medium text-on-surface">Active Matching Gift</span>
                    </div>
                    {fundraisingForm.active_matching_gift ? (
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-on-surface-variant" htmlFor="fr-matching-gift-details">Matching Gift Details</label>
                        <textarea
                          id="fr-matching-gift-details"
                          rows={2}
                          value={fundraisingForm.active_matching_gift_details}
                          onChange={(e) => setFundraisingForm((f) => ({ ...f, active_matching_gift_details: e.target.value }))}
                          disabled={fundraisingSaving}
                          placeholder="Details about the matching gift program"
                          className="w-full rounded-lg border border-outline-variant/20 bg-surface-container-lowest px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-dashboard-primary/30 disabled:opacity-50 resize-none"
                        />
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Tactic Settings */}
                <div className="bg-surface-container-low rounded-xl p-6 space-y-5">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Tactic Settings</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-outline-variant/10">
                          <th className="text-left pb-2 pr-3 text-xs font-semibold text-on-surface-variant whitespace-nowrap">Tactic</th>
                          <th className="text-left pb-2 pr-3 text-xs font-semibold text-on-surface-variant">Status</th>
                          <th className="text-left pb-2 text-xs font-semibold text-on-surface-variant">Conditions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/10">
                        {TACTICS.map((tactic) => (
                          <tr key={tactic}>
                            <td className="py-2 pr-3 font-medium text-on-surface whitespace-nowrap">{tactic}</td>
                            <td className="py-2 pr-3">
                              <select
                                value={tacticSettings[tactic]?.status ?? "allowed"}
                                onChange={(e) =>
                                  setTacticSettings((prev) => ({
                                    ...prev,
                                    [tactic]: { ...prev[tactic], status: e.target.value as TacticStatus },
                                  }))
                                }
                                disabled={fundraisingSaving}
                                className="rounded-lg border border-outline-variant/20 bg-surface-container-lowest px-2 py-1 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-dashboard-primary/30 disabled:opacity-50"
                              >
                                {TACTIC_STATUSES.map((s) => (
                                  <option key={s} value={s}>{s}</option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2">
                              <input
                                type="text"
                                value={tacticSettings[tactic]?.conditions ?? ""}
                                onChange={(e) =>
                                  setTacticSettings((prev) => ({
                                    ...prev,
                                    [tactic]: { ...prev[tactic], conditions: e.target.value },
                                  }))
                                }
                                disabled={fundraisingSaving}
                                placeholder="conditions..."
                                className="w-full rounded-lg border border-outline-variant/20 bg-surface-container-lowest px-2 py-1 text-xs text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-dashboard-primary/30 disabled:opacity-50"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Story Requirement by Tier */}
                <div className="bg-surface-container-low rounded-xl p-6 space-y-5">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Story Requirement by Tier</h4>
                  <div className="space-y-4">
                    {TIER_KEYS.map((tier) => (
                      <div key={tier} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                        <span className="text-sm font-medium text-on-surface min-w-[160px] capitalize">{tier.replace(/_/g, " ")}</span>
                        <div className="flex items-center gap-6">
                          <label className="flex items-center gap-2 text-sm text-on-surface cursor-pointer">
                            <input
                              type="radio"
                              name={`tier-${tier}`}
                              value="hard_requirement"
                              checked={storyRequirementByTier[tier] === "hard_requirement"}
                              onChange={() => setStoryRequirementByTier((p) => ({ ...p, [tier]: "hard_requirement" as const }))}
                              disabled={fundraisingSaving}
                              className="accent-dashboard-primary"
                            />
                            Hard Requirement
                          </label>
                          <label className="flex items-center gap-2 text-sm text-on-surface cursor-pointer">
                            <input
                              type="radio"
                              name={`tier-${tier}`}
                              value="strong_recommendation"
                              checked={storyRequirementByTier[tier] === "strong_recommendation"}
                              onChange={() => setStoryRequirementByTier((p) => ({ ...p, [tier]: "strong_recommendation" as const }))}
                              disabled={fundraisingSaving}
                              className="accent-dashboard-primary"
                            />
                            Strong Recommendation
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Absolute Guardrails */}
                <div className="bg-surface-container-low rounded-xl p-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Absolute Guardrails</h4>
                    <button
                      type="button"
                      onClick={() =>
                        setGuardrails((g) => [
                          ...g,
                          { id: Date.now().toString(), rule: "", reason: "", applies_to: "both" },
                        ])
                      }
                      disabled={fundraisingSaving}
                      className="text-xs font-semibold text-dashboard-primary hover:underline disabled:opacity-50"
                    >
                      + Add Rule
                    </button>
                  </div>
                  {guardrails.length === 0 ? (
                    <p className="text-sm text-on-surface-variant/50 italic">No guardrails defined.</p>
                  ) : (
                    <div className="space-y-3">
                      {guardrails.map((g) => (
                        <div
                          key={g.id}
                          className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto_auto] gap-2 rounded-lg border border-outline-variant/10 bg-surface-container-lowest p-3"
                        >
                          <input
                            type="text"
                            value={g.rule}
                            onChange={(e) =>
                              setGuardrails((gs) =>
                                gs.map((r) => (r.id === g.id ? { ...r, rule: e.target.value } : r))
                              )
                            }
                            disabled={fundraisingSaving}
                            placeholder="Rule"
                            className="rounded-md border border-outline-variant/20 bg-surface-container-lowest px-2 py-1.5 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-dashboard-primary/30 disabled:opacity-50"
                          />
                          <input
                            type="text"
                            value={g.reason}
                            onChange={(e) =>
                              setGuardrails((gs) =>
                                gs.map((r) => (r.id === g.id ? { ...r, reason: e.target.value } : r))
                              )
                            }
                            disabled={fundraisingSaving}
                            placeholder="Reason"
                            className="rounded-md border border-outline-variant/20 bg-surface-container-lowest px-2 py-1.5 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-dashboard-primary/30 disabled:opacity-50"
                          />
                          <select
                            value={g.applies_to}
                            onChange={(e) =>
                              setGuardrails((gs) =>
                                gs.map((r) => (r.id === g.id ? { ...r, applies_to: e.target.value } : r))
                              )
                            }
                            disabled={fundraisingSaving}
                            className="rounded-md border border-outline-variant/20 bg-surface-container-lowest px-2 py-1.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-dashboard-primary/30 disabled:opacity-50"
                          >
                            <option value="both">Both</option>
                            <option value="supporters">Supporters</option>
                            <option value="groups">Groups</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => setGuardrails((gs) => gs.filter((r) => r.id !== g.id))}
                            disabled={fundraisingSaving}
                            className="flex items-center justify-center rounded-md px-2 py-1.5 text-sm text-error hover:bg-error/10 disabled:opacity-50 transition-colors"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {fundraisingSuccess ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                    Fundraising data saved successfully.
                  </div>
                ) : null}

                {fundraisingError ? (
                  <div className="rounded-xl border border-error/20 bg-error/10 p-3 text-sm text-error">
                    {fundraisingError}
                  </div>
                ) : null}

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => void handleSaveFundraising()}
                    disabled={fundraisingSaving}
                    className="px-5 py-2 rounded-lg bg-dashboard-primary text-dashboard-on-primary text-sm font-semibold hover:opacity-90 disabled:opacity-70 shadow-sm shadow-dashboard-primary/20"
                  >
                    {fundraisingSaving ? "Saving..." : "Save Fundraising Data"}
                  </button>
                </div>
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
                  <span className="text-on-surface-variant/70">CA User ID</span>
                  <span className="font-semibold break-all">{client.ca_user_id ?? "—"}</span>
                </div>

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

                <div className="flex justify-between items-center text-sm">
                  <span className="text-on-surface-variant/70">Plan</span>
                  <span className="font-semibold">
                    {plan?.name ?? "—"}
                  </span>
                </div>

                {quota ? (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-on-surface-variant/70">Images</span>
                    <span className="font-semibold">
                      {quota.imagesLimit === 0
                        ? "Unlimited"
                        : `${quota.imagesUsed} / ${quota.imagesLimit}`}
                    </span>
                  </div>
                ) : null}

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

