"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { DashboardMaterialIcon } from "./DashboardMaterialIcon";

export function DashboardThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant/15 bg-surface-container-lowest" />
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant/15 bg-surface-container-lowest text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-colors"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
    >
      <DashboardMaterialIcon
        icon={isDark ? "light_mode" : "dark_mode"}
        className="text-[18px]"
      />
    </button>
  );
}
