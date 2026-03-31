"use client";

import React, { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ClientAsset, ClientFont } from "@/app/(studio)/dashboard/utils/types";
import { DashboardMaterialIcon } from "@/app/(studio)/dashboard/components/DashboardMaterialIcon";
import { deleteAssetAction, setPrimaryAssetAction } from "@/app/(studio)/dashboard/features/assets/actions/assets";
import { deleteFontAction, setPrimaryFontAction } from "@/app/(studio)/dashboard/features/frames-fonts/actions/fonts";
import { toast } from "sonner";
import { useFontLoader } from "@/app/(studio)/dashboard/hooks/use-font-loader";
import { GalleryLightbox } from "@/app/(studio)/dashboard/components/gallery-lightbox";
import { cx } from "@/app/(studio)/dashboard/utils/cx";
import { FrameCard } from "@/app/(studio)/dashboard/components/frame-card";
import { FontCard } from "@/app/(studio)/dashboard/components/font-card";

export type DashboardFramesFontsPageScreenProps = Readonly<{
  frames: ClientAsset[];
  fonts: ClientFont[];
  clientNames: Record<string, string>;
  initialTab?: "frames" | "fonts";
}>;

export function DashboardFramesFontsPageScreen({
  frames: initialFrames,
  fonts: initialFonts,
  clientNames,
  initialTab = "frames",
}: DashboardFramesFontsPageScreenProps) {
  const router = useRouter();
  const [tab, setTab] = useState<"frames" | "fonts">(initialTab);
  const [query, setQuery] = useState("");
  const [frames, setFrames] = useState<ClientAsset[]>(initialFrames);
  const [fonts, setFonts] = useState<ClientFont[]>(initialFonts);
  const [lightboxAsset, setLightboxAsset] = useState<ClientAsset | null>(null);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useFontLoader(fonts);

  const filteredFrames = useMemo(() => {
    const q = query.trim().toLowerCase();
    return frames.filter((frame) => {
      if (!q) return true;
      return `${frame.display_name ?? frame.name} ${clientNames[frame.client_id] ?? ""} ${frame.variant ?? ""}`
        .toLowerCase()
        .includes(q);
    });
  }, [clientNames, frames, query]);

  const filteredFonts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return fonts.filter((font) => {
      if (!q) return true;
      return `${font.font_family} ${font.font_category ?? ""} ${clientNames[font.client_id] ?? ""}`
        .toLowerCase()
        .includes(q);
    });
  }, [clientNames, fonts, query]);

  const handleSetPrimaryFrame = async (frame: ClientAsset) => {
    const result = await setPrimaryAssetAction(frame.client_id, frame.id);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setFrames((prev) =>
      prev.map((f) =>
        f.client_id === frame.client_id ? { ...f, is_primary: f.id === frame.id } : f
      )
    );
    toast.success("Primary frame updated");
  };

  const handleDeleteFrame = async (frame: ClientAsset) => {
    const result = await deleteAssetAction(frame.client_id, frame.id);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setFrames((prev) => prev.filter((f) => f.id !== frame.id));
    toast.success("Frame deleted");
  };

  const handleSetPrimaryFont = async (font: ClientFont) => {
    const result = await setPrimaryFontAction(font.client_id, font.id);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setFonts((prev) =>
      prev.map((f) =>
        f.client_id === font.client_id ? { ...f, is_primary: f.id === font.id } : f
      )
    );
    toast.success("Primary font updated");
  };

  const handleDeleteFont = async (font: ClientFont) => {
    const result = await deleteFontAction(font.client_id, font.id);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setFonts((prev) => prev.filter((f) => f.id !== font.id));
    toast.success("Font deleted");
  };

  return (
    <main className="ml-0 pt-24 px-10 pb-12 min-h-screen bg-surface">
      <GalleryLightbox
        asset={lightboxAsset}
        onClose={() => setLightboxAsset(null)}
        description="Full-size frame preview"
      />
      <div className="p-0">
        <div className="flex items-end justify-between mb-6">
          <div>
            <nav className="flex items-center gap-2 text-xs font-medium text-on-surface-variant mb-2 uppercase tracking-widest">
              <Link href="/dashboard" className="hover:text-on-surface transition-colors">
                Dashboard
              </Link>
              <DashboardMaterialIcon icon="chevron_right" className="text-[10px]" />
              <span className="text-dashboard-primary font-bold">
                {tab === "frames" ? "Frames" : "Fonts"}
              </span>
            </nav>
            <h2 className="text-4xl font-extrabold tracking-tight text-on-surface mb-2">
              Frames &amp; Fonts
            </h2>
            <p className="text-on-surface-variant max-w-2xl">
              Global operational view. Manage assets by client, or jump to client detail for upload/edit flows.
            </p>
          </div>
          <div />
        </div>

        <div className="flex gap-8 border-b border-outline-variant/10 mb-6 overflow-x-auto whitespace-nowrap">
          <button
            type="button"
            onClick={() => setTab("frames")}
            className={cx(
              "pb-4 text-sm relative",
              tab === "frames"
                ? "text-blue-700 font-bold border-b-2 border-blue-600"
                : "text-on-surface-variant font-medium hover:text-on-surface transition-colors"
            )}
          >
            Frames
          </button>
          <button
            type="button"
            onClick={() => setTab("fonts")}
            className={cx(
              "pb-4 text-sm relative",
              tab === "fonts"
                ? "text-blue-700 font-bold border-b-2 border-blue-600"
                : "text-on-surface-variant font-medium hover:text-on-surface transition-colors"
            )}
          >
            Fonts
          </button>
        </div>

        <div className="mb-6">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${tab}...`}
            className="h-10 w-full max-w-md rounded-xl border border-outline-variant/15 bg-surface-container-low px-3 text-sm outline-none focus:border-dashboard-primary"
          />
        </div>

        {tab === "frames" ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredFrames.map((frame) => (
              <FrameCard
                key={frame.id}
                frame={frame}
                sortable={false}
                editLabel="Manage"
                variantBadges={[
                  clientNames[frame.client_id] ?? "Client",
                  ...(frame.variant ? [frame.variant === "*" ? "All" : frame.variant] : []),
                ]}
                onView={() => setLightboxAsset(frame)}
                onEdit={() => router.push(`/dashboard/clients/${frame.client_id}`)}
                onSetPrimary={() => void handleSetPrimaryFrame(frame)}
                onDelete={() => void handleDeleteFrame(frame)}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredFonts.map((font) => (
              <FontCard
                key={font.id}
                font={font}
                editLabel="Manage"
                extraBadges={[clientNames[font.client_id] ?? "Client"]}
                onEdit={() => router.push(`/dashboard/clients/${font.client_id}`)}
                onSetPrimary={() => void handleSetPrimaryFont(font)}
                onDelete={() => void handleDeleteFont(font)}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
