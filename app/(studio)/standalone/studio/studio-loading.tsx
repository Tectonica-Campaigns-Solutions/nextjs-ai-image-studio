import { FEATURE_FLAGS, UI_COLORS } from "./constants/editor-constants";

/**
 * Structural skeleton for the studio page while editor assets and session load.
 * Mirrors the desktop Visual Studio chrome (header, tool dock, canvas mat, action bar).
 */
export function StudioLoading() {
  const mobileTabCount =
    [
      FEATURE_FLAGS.showTextTools,
      FEATURE_FLAGS.showLogoTools,
      FEATURE_FLAGS.showQrTools,
      FEATURE_FLAGS.showEditWithAI,
      FEATURE_FLAGS.showMobileMoreTools,
    ].filter(Boolean).length || 4;

  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden md:min-h-dvh md:h-dvh md:overflow-hidden"
      style={{ backgroundColor: UI_COLORS.PRIMARY_BG }}
      aria-busy="true"
      aria-label="Loading editor"
    >
      <div
        className="hidden h-[63px] shrink-0 items-center gap-3 border-b px-[18px] md:flex"
        style={{ borderColor: UI_COLORS.BORDER }}
      >
        <div className="size-[34px] animate-pulse rounded-[10px] bg-white/10" />
        <div className="space-y-2">
          <div className="h-3.5 w-28 animate-pulse rounded bg-white/10" />
          <div className="h-2.5 w-20 animate-pulse rounded bg-white/10" />
        </div>
      </div>

      <div
        className="flex shrink-0 px-4 pb-1.5 pt-3 md:hidden"
        style={{ background: UI_COLORS.CANVAS_MAT }}
      >
        <div className="space-y-2">
          <div className="h-3.5 w-28 animate-pulse rounded bg-white/10" />
          <div className="h-2.5 w-20 animate-pulse rounded bg-white/10" />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div
          className="hidden w-[176px] shrink-0 flex-col gap-3 border-r p-3.5 md:flex"
          style={{ borderColor: UI_COLORS.BORDER }}
        >
          <div className="h-2.5 w-12 animate-pulse rounded bg-white/10" />
          <div className="h-10 w-full animate-pulse rounded-[11px] bg-white/10" />
          <div className="h-10 w-full animate-pulse rounded-[11px] bg-white/10" />
          <div className="h-10 w-full animate-pulse rounded-[11px] bg-white/10" />
          <div className="h-10 w-full animate-pulse rounded-[11px] bg-white/10" />
        </div>

        <div className="flex min-h-0 flex-1 flex-col" style={{ backgroundColor: UI_COLORS.CANVAS_MAT }}>
          <div className="flex min-h-0 flex-1 items-center justify-center px-4 py-2 md:p-7">
            <div className="aspect-[4/3] w-full max-h-full max-w-3xl animate-pulse rounded-xl bg-white/10" />
          </div>
          <div
            className="grid shrink-0 gap-1 px-2 pb-1.5 pt-2 md:hidden"
            style={{
              gridTemplateColumns: `repeat(${mobileTabCount}, minmax(0, 1fr))`,
              borderTop: `1px solid ${UI_COLORS.BORDER}`,
            }}
          >
            {Array.from({ length: mobileTabCount }).map((_, i) => (
              <div key={i} className="mx-auto size-10 animate-pulse rounded-xl bg-white/10" />
            ))}
          </div>
          <div
            className="shrink-0 px-3 py-2.5 md:hidden"
            style={{ background: UI_COLORS.PRIMARY_BG, borderTop: `1px solid ${UI_COLORS.BORDER}` }}
          >
            <div className="h-11 w-full animate-pulse rounded-xl bg-white/10" />
          </div>
        </div>
      </div>

      <div
        className="hidden h-[72px] shrink-0 items-center gap-2.5 border-t px-[18px] md:flex"
        style={{ borderColor: UI_COLORS.BORDER }}
      >
        <div className="h-11 w-36 animate-pulse rounded-xl bg-white/10" />
        <div className="flex-1" />
        <div className="h-11 w-32 animate-pulse rounded-xl bg-white/10" />
        <div className="h-11 w-28 animate-pulse rounded-xl bg-white/10" />
      </div>
    </div>
  );
}
