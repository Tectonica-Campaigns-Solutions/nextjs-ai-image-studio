"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { DashboardPageHeader } from "@/app/(studio)/dashboard/components/dashboard-page-header";
import { GeneratedImagesGrid } from "../components/GeneratedImagesGrid";
import type { GeneratedImageCardItem } from "../components/GeneratedImageCard";
import { GalleryLightbox } from "@/app/(studio)/dashboard/components/gallery-lightbox";
import { DashboardMaterialIcon } from "@/app/(studio)/dashboard/components/DashboardMaterialIcon";
import { cx } from "@/app/(studio)/dashboard/utils/cx";

export type DashboardGeneratedImagesScreenProps = Readonly<{
  title?: string;
  description?: React.ReactNode;
  items: GeneratedImageCardItem[];
  page: number;
  pageSize: number;
  total: number;
  search?: string;
}>;

function getPaginationButtons(totalPages: number, currentPage: number) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);

  const pages: (number | "ellipsis")[] = [1];
  const left = Math.max(2, currentPage - 1);
  const right = Math.min(totalPages - 1, currentPage + 1);

  if (left > 2) pages.push("ellipsis");
  for (let i = left; i <= right; i++) pages.push(i);
  if (right < totalPages - 1) pages.push("ellipsis");
  pages.push(totalPages);

  return pages;
}

async function downloadFileFromUrl(url: string, filename: string) {
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function filenameForItem(item: GeneratedImageCardItem): string {
  const dt = new Date(item.created_at);
  const iso = Number.isNaN(dt.getTime()) ? "generated" : dt.toISOString().replace(/[:.]/g, "-");
  return `bfl-${item.client_id}-${iso}-${item.id}.jpg`;
}

export function DashboardGeneratedImagesScreen({
  title = "Generated Images",
  description = "All images generated via Black Forest Labs.",
  items,
  page,
  pageSize,
  total,
  search,
}: DashboardGeneratedImagesScreenProps) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{
    file_url: string;
    name: string;
    display_name: string | null;
  } | null>(null);

  const stableItems = useMemo(() => items ?? [], [items]);
  const totalPages = Math.max(1, Math.ceil(Math.max(0, total) / Math.max(1, pageSize)));
  const paginationButtons = useMemo(() => getPaginationButtons(totalPages, page), [totalPages, page]);

  const buildHref = useMemo(() => {
    return (targetPage: number) => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (targetPage > 1) params.set("page", String(targetPage));
      const qs = params.toString();
      return `/dashboard/generated-images${qs ? `?${qs}` : ""}`;
    };
  }, [search]);

  const handleDownload = async (item: GeneratedImageCardItem) => {
    if (busyId) return;
    setBusyId(item.id);
    try {
      await downloadFileFromUrl(item.image_url, filenameForItem(item));
      toast.success("Download started");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to download");
    } finally {
      setBusyId(null);
    }
  };

  const handleView = (item: GeneratedImageCardItem) => {
    const label = item.client_name ? item.client_name : item.client_id;
    setLightbox({
      file_url: item.image_url,
      name: item.id,
      display_name: label,
    });
  };

  return (
    <main className="pt-24 px-10 pb-12 min-h-screen bg-surface">
      <GalleryLightbox asset={lightbox} onClose={() => setLightbox(null)} description="Generated image preview" />

      <div className="mb-10">
        <DashboardPageHeader
          segments={[{ label: "Generated Images" }]}
          title={title}
          description={description}
          titleClassName="text-3xl font-extrabold tracking-tight text-on-surface mb-2"
          descriptionClassName="text-on-surface-variant max-w-2xl"
          containerClassName="flex justify-between items-end gap-6"
          actions={
            <div className="flex items-center gap-3">
              <div className="text-sm text-on-surface-variant">{total.toLocaleString()} total</div>
              {busyId ? (
                <div className="text-sm text-on-surface-variant">Downloading…</div>
              ) : null}
            </div>
          }
        />
      </div>

      <GeneratedImagesGrid
        items={stableItems}
        onView={handleView}
        onDownload={handleDownload}
      />

      {totalPages > 1 ? (
        <div className="mt-10 bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/10">
          <div className="px-6 py-4 bg-white border-t-0 border-surface-container flex items-center justify-between">
            {page > 1 ? (
              <Link
                href={buildHref(Math.max(1, page - 1))}
                className="px-3 py-1.5 text-xs font-semibold text-on-surface-variant hover:bg-surface-container-low rounded-lg transition-all flex items-center gap-1"
              >
                <DashboardMaterialIcon icon="chevron_left" className="text-sm" />
                Previous
              </Link>
            ) : (
              <span className="px-3 py-1.5 text-xs font-semibold text-on-surface-variant/40 rounded-lg flex items-center gap-1 cursor-not-allowed">
                <DashboardMaterialIcon icon="chevron_left" className="text-sm" />
                Previous
              </span>
            )}

            <div className="flex items-center gap-1">
              {paginationButtons.map((p, idx) => {
                if (p === "ellipsis") {
                  return (
                    <span key={`e-${idx}`} className="px-2 text-on-surface-variant">
                      ...
                    </span>
                  );
                }
                const num = p as number;
                const isCurrent = num === page;
                return (
                  <Link
                    key={num}
                    href={buildHref(num)}
                    className={cx(
                      "w-8 h-8 flex items-center justify-center text-xs rounded-lg transition-colors",
                      isCurrent
                        ? "font-bold bg-dashboard-primary text-dashboard-on-primary shadow-md shadow-dashboard-primary/20"
                        : "font-medium hover:bg-surface-container-low"
                    )}
                  >
                    {num}
                  </Link>
                );
              })}
            </div>

            {page < totalPages ? (
              <Link
                href={buildHref(Math.min(totalPages, page + 1))}
                className="px-3 py-1.5 text-xs font-semibold text-on-surface-variant hover:bg-surface-container-low rounded-lg transition-all flex items-center gap-1"
              >
                Next
                <DashboardMaterialIcon icon="chevron_right" className="text-sm" />
              </Link>
            ) : (
              <span className="px-3 py-1.5 text-xs font-semibold text-on-surface-variant/40 rounded-lg flex items-center gap-1 cursor-not-allowed">
                Next
                <DashboardMaterialIcon icon="chevron_right" className="text-sm" />
              </span>
            )}
          </div>
        </div>
      ) : null}
    </main>
  );
}

