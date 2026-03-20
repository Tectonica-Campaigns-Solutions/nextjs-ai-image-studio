import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardMaterialIcon } from "./DashboardMaterialIcon";
import { createClient } from "@/lib/supabase/server";

export type DashboardNavKey =
  | "overview"
  | "clients"
  | "admins"
  | "assets"
  | "frames"
  | "fonts"
  | "canvas-sessions";

export type DashboardDashboardShellProps = Readonly<{
  activeNav: DashboardNavKey;
  children: React.ReactNode;
}>;

function initialsFromUser(
  fullName?: string | null,
  email?: string | null
): string {
  const source = fullName?.trim() || email?.trim() || "";
  if (!source) return "U";
  if (source.includes("@")) {
    const local = source.split("@")[0] ?? "";
    const cleaned = local.replace(/[^a-zA-Z0-9 ]+/g, " ").trim();
    if (!cleaned) return "U";
    const parts = cleaned.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

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

export async function DashboardDashboardShell({
  activeNav,
  children,
}: DashboardDashboardShellProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const fullName =
    typeof user?.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : null;
  const userInitials = initialsFromUser(fullName, user?.email ?? null);

  async function handleSignOut() {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/dashboard/login");
  }

  return (
    <div
      className="dashboard-dashboard bg-surface text-on-surface antialiased overflow-x-hidden"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <style>{`
        .material-symbols-outlined {
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
          vertical-align: middle;
        }
      `}</style>

      <aside className="h-screen w-64 fixed left-0 top-0 border-r-0 bg-slate-50 dark:bg-slate-900 antialiased text-sm flex flex-col py-6 px-4 z-50">
        <div className="mb-10 px-2 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-dashboard-primary flex items-center justify-center text-dashboard-on-primary">
            <DashboardMaterialIcon icon="dashboard" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Tectonica.ai
            </h1>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
              Visual Studio
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          <Link className={navItemClass(activeNav === "overview")} href="/dashboard">
            <DashboardMaterialIcon
              icon="dashboard"
              className="text-blue-700 dark:text-blue-400"
            />
            <span>Overview</span>
          </Link>

          <Link
            className={navItemClass(activeNav === "clients")}
            href="/dashboard/clients"
          >
            <DashboardMaterialIcon icon="group" />
            <span>Clients</span>
          </Link>

          <Link
            className={navItemClass(activeNav === "admins")}
            href="/dashboard/admins"
          >
            <DashboardMaterialIcon icon="shield" />
            <span>Admins</span>
          </Link>

          <Link
            className={navItemClass(activeNav === "assets")}
            href="/dashboard/assets"
          >
            <DashboardMaterialIcon icon="folder_open" />
            <span>Assets</span>
          </Link>

          <Link
            className={navItemClass(activeNav === "frames")}
            href="/dashboard/frames-fonts?tab=frames"
          >
            <DashboardMaterialIcon icon="frame_person" />
            <span>Frames</span>
          </Link>

          <Link
            className={navItemClass(activeNav === "fonts")}
            href="/dashboard/frames-fonts?tab=fonts"
          >
            <DashboardMaterialIcon icon="font_download" />
            <span>Fonts</span>
          </Link>

          <Link
            className={navItemClass(activeNav === "canvas-sessions")}
            href="/dashboard/canvas-sessions"
          >
            <DashboardMaterialIcon icon="draw" />
            <span>Canvas Sessions</span>
          </Link>
        </nav>

        <div className="mt-auto" />
      </aside>

      <main className="ml-64 min-h-screen">
        <header className="fixed top-0 right-0 w-[calc(100%-16rem)] h-16 z-40 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md flex items-center justify-end px-8 border-none">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-dashboard-primary/10 text-dashboard-primary border border-dashboard-primary/20 flex items-center justify-center text-xs font-bold uppercase tracking-wide">
              {userInitials}
            </div>
            <form action={handleSignOut}>
              <button
                type="submit"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant/15 bg-surface-container-lowest text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-colors"
                aria-label="Cerrar sesión"
                title="Cerrar sesión"
              >
                <DashboardMaterialIcon icon="logout" className="text-[18px]" />
              </button>
            </form>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}

