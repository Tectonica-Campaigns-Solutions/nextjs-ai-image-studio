import React from "react";

function cx(...classes: Array<string | undefined | null | false>) {
  return classes.filter(Boolean).join(" ");
}

export type StitchMaterialIconProps = Readonly<{
  icon: string;
  className?: string;
  filled?: boolean;
}>;

export function StitchMaterialIcon({
  icon,
  className,
  filled,
}: StitchMaterialIconProps) {
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

