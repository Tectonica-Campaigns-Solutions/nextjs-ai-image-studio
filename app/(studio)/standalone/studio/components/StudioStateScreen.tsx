"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { UI_COLORS, STUDIO_DESKTOP_TOOLS } from "../constants/editor-constants";
import { StudioHeader } from "./StudioHeader";
import { StudioMobileHeader, StudioMobileHomeSpacer, StudioMobileTabBar } from "./StudioMobileChrome";

export function StudioStateScreen({
  subtitle = "Visual Studio",
  children,
  showDock = true,
}: {
  subtitle?: string;
  children: ReactNode;
  showDock?: boolean;
}) {
  return (
    <div
      className="studio-root flex h-full min-h-0 flex-col overflow-hidden md:min-h-dvh md:h-dvh md:overflow-hidden"
      style={{ backgroundColor: UI_COLORS.PRIMARY_BG, color: UI_COLORS.TEXT_PRIMARY }}
    >
      <div className="hidden md:block">
        <StudioHeader subtitle={subtitle} />
      </div>
      <StudioMobileHeader subtitle={subtitle} />

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {showDock ? (
          <aside
            className="hidden w-[176px] shrink-0 flex-col border-r p-3.5 md:flex"
            style={{ borderColor: UI_COLORS.BORDER }}
            aria-hidden
          >
            <div
              className="mb-3 text-[10px] font-bold uppercase tracking-[0.08em]"
              style={{ color: UI_COLORS.TEXT_FAINT }}
            >
              Tools
            </div>
            <div className="flex flex-col gap-1.5 opacity-40">
              {STUDIO_DESKTOP_TOOLS.map((tool) => (
                <div
                  key={tool.id}
                  className="flex items-center gap-2.5 rounded-[11px] border px-2.5 py-2"
                  style={{
                    borderColor: UI_COLORS.BORDER,
                    backgroundColor: UI_COLORS.SECONDARY_BG,
                  }}
                >
                  <span
                    className="inline-flex size-8 shrink-0 rounded-[8px]"
                    style={{ backgroundColor: UI_COLORS.ACCENT_SOFT }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-bold text-[#F5F4FB]">{tool.label}</span>
                    <span
                      className="block truncate text-[10px] font-semibold leading-tight"
                      style={{ color: UI_COLORS.TEXT_FAINT }}
                    >
                      {tool.hint}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </aside>
        ) : null}

        <div
          className="relative flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center p-6 md:p-7"
          style={{ backgroundColor: UI_COLORS.CANVAS_MAT }}
        >
          {children}
        </div>
      </div>

      <StudioMobileTabBar activeTab={null} onTabClick={() => {}} availableTools={[]} />
      <div
        className="shrink-0 px-3 py-2.5 md:hidden"
        style={{ background: UI_COLORS.PRIMARY_BG, borderTop: `1px solid ${UI_COLORS.BORDER}` }}
      >
        <div className="h-11 w-full rounded-xl opacity-30" style={{ backgroundColor: UI_COLORS.ACCENT_DEEP }} />
      </div>
      <StudioMobileHomeSpacer />

      <div
        className="hidden h-[72px] shrink-0 items-center gap-2.5 border-t px-[18px] md:flex"
        style={{ borderColor: UI_COLORS.BORDER }}
        aria-hidden
      >
        <div className="h-11 w-36 rounded-xl opacity-30" style={{ backgroundColor: UI_COLORS.SECONDARY_BG }} />
        <div className="flex-1" />
        <div className="h-11 w-32 rounded-xl opacity-30" style={{ backgroundColor: UI_COLORS.SECONDARY_BG }} />
        <div className="h-11 w-28 rounded-xl opacity-30" style={{ backgroundColor: UI_COLORS.SECONDARY_BG }} />
      </div>
    </div>
  );
}

export function StudioStateCard({
  icon,
  title,
  description,
  variant = "default",
  children,
  className,
}: {
  icon: ReactNode;
  title: string;
  description?: ReactNode;
  variant?: "default" | "error" | "warning";
  children?: ReactNode;
  className?: string;
}) {
  const iconStyles =
    variant === "error"
      ? { background: "rgba(242,107,129,0.16)", color: UI_COLORS.DANGER }
      : variant === "warning"
        ? { background: "rgba(255,154,84,0.16)", color: "#FF9A54" }
        : { background: UI_COLORS.ACCENT_SOFT, color: UI_COLORS.ACCENT };

  return (
    <div
      className={cn(
        "w-full max-w-[360px] rounded-xl border border-white/[0.09] bg-[#211E30] px-6 py-6 text-center shadow-[0_24px_48px_-20px_rgba(0,0,0,0.65)]",
        className,
      )}
    >
      <div
        className="mx-auto mb-4 inline-flex size-12 items-center justify-center rounded-[10px]"
        style={iconStyles}
      >
        {icon}
      </div>
      <h1 className="text-[15px] font-bold tracking-[-0.01em] text-[#F5F4FB]">{title}</h1>
      {description ? (
        <p className="mt-1.5 text-[12.5px] leading-snug" style={{ color: UI_COLORS.TEXT_SECONDARY }}>
          {description}
        </p>
      ) : null}
      {children ? <div className="mt-5 space-y-3">{children}</div> : null}
    </div>
  );
}

export function StudioAccessDeniedScreen() {
  return (
    <StudioStateScreen subtitle="Access restricted" showDock={false}>
      <StudioStateCard
        variant="error"
        icon={
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12 8v4" strokeLinecap="round" />
            <path d="M12 16h.01" strokeLinecap="round" />
          </svg>
        }
        title="Access denied"
        description="This Studio can only be accessed from an approved host."
      />
    </StudioStateScreen>
  );
}

export function StudioAccountDeactivatedScreen() {
  return (
    <StudioStateScreen subtitle="Account inactive" showDock={false}>
      <StudioStateCard
        variant="warning"
        icon={
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4" strokeLinecap="round" />
            <path d="M12 16h.01" strokeLinecap="round" />
          </svg>
        }
        title="Account deactivated"
        description="Your account is deactivated. Please contact an administrator to gain access to the Studio."
      />
    </StudioStateScreen>
  );
}
