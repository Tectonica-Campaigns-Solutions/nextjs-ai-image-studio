import React from "react";
import { DashboardBreadcrumb, type BreadcrumbSegment } from "./dashboard-breadcrumb";

export type DashboardPageHeaderProps = Readonly<{
  segments: BreadcrumbSegment[];
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  titleClassName?: string;
  containerClassName?: string;
  descriptionClassName?: string;
}>;

export function DashboardPageHeader({
  segments,
  title,
  description,
  actions,
  titleClassName = "text-4xl font-extrabold tracking-tight text-on-surface",
  containerClassName = "flex items-end justify-between gap-6",
  descriptionClassName = "text-on-surface-variant mt-2 text-sm",
}: DashboardPageHeaderProps) {
  return (
    <div className={containerClassName}>
      <div>
        <DashboardBreadcrumb segments={segments} />
        <h2 className={titleClassName}>{title}</h2>
        {description ? <p className={descriptionClassName}>{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

