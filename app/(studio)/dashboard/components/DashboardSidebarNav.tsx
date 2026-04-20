"use client";

import { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { DashboardMaterialIcon } from "./DashboardMaterialIcon";
import { isDashboardFeatureEnabled } from "../config/feature-flags";

type NavItem = {
  key: string;
  label: string;
  icon: string;
  href: string;
};

const NAV_ITEMS: NavItem[] = [
  { key: "overview", label: "Overview", icon: "dashboard", href: "/dashboard" },
  { key: "clients", label: "Clients", icon: "group", href: "/dashboard/clients" },
  { key: "plans", label: "Plans", icon: "sell", href: "/dashboard/plans" },
  { key: "generated-images", label: "Generated Images", icon: "image", href: "/dashboard/generated-images" },
  { key: "admins", label: "Admins", icon: "shield", href: "/dashboard/admins" },
  { key: "assets", label: "Assets", icon: "folder_open", href: "/dashboard/assets" },
  { key: "frames", label: "Frames", icon: "frame_person", href: "/dashboard/frames-fonts?tab=frames" },
  { key: "fonts", label: "Fonts", icon: "font_download", href: "/dashboard/frames-fonts?tab=fonts" },
  { key: "canvas-sessions", label: "Canvas Sessions", icon: "draw", href: "/dashboard/canvas-sessions" },
  { key: "audit", label: "Audit Log", icon: "history", href: "/dashboard/audit" },
  {
    key: "visual-studio-access",
    label: "Visual Studio Logs",
    icon: "draw",
    href: "/dashboard/visual-studio-access",
  },
];

function navItemClass(isActive: boolean) {
  if (isActive) {
    return [
      "group relative flex items-center gap-3 px-3 py-2.5 rounded-lg",
      "text-blue-700 dark:text-blue-400 font-semibold",
      "before:absolute before:left-0 before:w-0.5 before:h-4",
      "before:bg-blue-600 dark:before:bg-blue-400",
      "hover:bg-slate-100 dark:hover:bg-slate-800/50",
      "transition-colors duration-200",
    ].join(" ");
  }

  return [
    "group flex items-center gap-3 px-3 py-2.5 rounded-lg",
    "text-slate-500 dark:text-slate-400",
    "hover:text-slate-900 dark:hover:text-slate-100",
    "hover:bg-slate-100 dark:hover:bg-slate-800/50",
    "transition-colors duration-200",
  ].join(" ");
}

function NavLinks() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function isActive(key: string): boolean {
    switch (key) {
      case "overview":
        return pathname === "/dashboard";
      case "clients":
        return pathname.startsWith("/dashboard/clients");
      case "plans":
        return pathname.startsWith("/dashboard/plans");
      case "admins":
        return pathname.startsWith("/dashboard/admins");
      case "assets":
        return pathname === "/dashboard/assets";
      case "generated-images":
        return pathname.startsWith("/dashboard/generated-images");
      case "frames":
        return pathname === "/dashboard/frames-fonts" && searchParams.get("tab") !== "fonts";
      case "fonts":
        return pathname === "/dashboard/frames-fonts" && searchParams.get("tab") === "fonts";
      case "canvas-sessions":
        return pathname.startsWith("/dashboard/canvas-sessions");
      case "audit":
        return pathname.startsWith("/dashboard/audit");
      case "visual-studio-access":
        return pathname.startsWith("/dashboard/visual-studio-access");
      default:
        return false;
    }
  }

  return (
    <nav className="flex-1 space-y-1">
      {NAV_ITEMS.map((item) => {
        if (
          item.key === "visual-studio-access" &&
          !isDashboardFeatureEnabled("visualStudioAccessLogs")
        ) {
          return null;
        }
        const active = isActive(item.key);
        return (
          <Link key={item.key} className={navItemClass(active)} href={item.href}>
            <DashboardMaterialIcon
              icon={item.icon}
              className={active ? "text-blue-700 dark:text-blue-400" : undefined}
            />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function DashboardSidebarNav() {
  return (
    <Suspense
      fallback={
        <nav className="flex-1 space-y-1">
          {NAV_ITEMS.map((item) => (
            <div key={item.key} className={navItemClass(false)}>
              <DashboardMaterialIcon icon={item.icon} />
              <span>{item.label}</span>
            </div>
          ))}
        </nav>
      }
    >
      <NavLinks />
    </Suspense>
  );
}
