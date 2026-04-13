"use client";

import { DashboardEmptyState } from "@/app/(studio)/dashboard/components/dashboard-empty-state";
import { GeneratedImageCard, type GeneratedImageCardItem } from "./GeneratedImageCard";
import { cn } from "@/lib/utils";

export type GeneratedImagesGridProps = Readonly<{
  items: GeneratedImageCardItem[];
  onView: (item: GeneratedImageCardItem) => void;
  onDownload: (item: GeneratedImageCardItem) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}>;

export function GeneratedImagesGrid({
  items,
  onView,
  onDownload,
  emptyTitle = "No generated images",
  emptyDescription = "Generated images will appear here after running Black Forest Labs generation.",
  className,
}: GeneratedImagesGridProps) {
  if (!items || items.length === 0) {
    return (
      <div className="bg-surface-container-lowest rounded-xl">
        <DashboardEmptyState
          icon="image"
          title={emptyTitle}
          description={emptyDescription}
        />
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-5 gap-y-10", className)}>
      {items.map((item) => (
        <GeneratedImageCard
          key={item.id}
          item={item}
          onView={onView}
          onDownload={onDownload}
        />
      ))}
    </div>
  );
}

