"use client";

import React from "react";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export type BreadcrumbSegment = {
  label: string;
  href?: string;
};

type DashboardBreadcrumbProps = Readonly<{
  segments: BreadcrumbSegment[];
}>;

export function DashboardBreadcrumb({ segments }: DashboardBreadcrumbProps) {
  const allSegments: BreadcrumbSegment[] = [
    { label: "Dashboard", href: "/dashboard" },
    ...segments,
  ];

  return (
    <Breadcrumb className="mb-2">
      <BreadcrumbList className="text-xs font-medium uppercase tracking-widest">
        {allSegments.map((seg, i) => {
          const isLast = i === allSegments.length - 1;
          return (
            <React.Fragment key={`${seg.label}-${i}`}>
              {i > 0 ? (
                <BreadcrumbSeparator className="[&>svg]:size-3 text-on-surface-variant/50" />
              ) : null}
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage className="text-on-surface-variant font-medium">
                    {seg.label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link
                      href={seg.href ?? "/dashboard"}
                      className="text-on-surface-variant hover:text-on-surface transition-colors font-medium"
                    >
                      {seg.label}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
