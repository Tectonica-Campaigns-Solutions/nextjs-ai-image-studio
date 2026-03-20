import React from "react";

function cx(...classes: Array<string | undefined | null | false>) {
  return classes.filter(Boolean).join(" ");
}

export type DashboardMaterialIconProps = Readonly<{
  icon: string;
  className?: string;
  filled?: boolean;
}>;

export function DashboardMaterialIcon({
  icon,
  className,
  filled,
}: DashboardMaterialIconProps) {
  return (
    <span
      className={cx("material-symbols-outlined", className)}
      style={
        filled
          ? { fontVariationSettings: "'FILL' 1" }
          : undefined
      }
    >
      {icon}
    </span>
  );
}

