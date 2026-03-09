import { UI_COLORS } from "./constants/editor-constants";

/**
 * Structural skeleton for the studio page while editor assets and session load.
 * Mirrors the editor layout (sidebar + canvas area) for a smooth transition.
 */
export function StudioLoading() {
  return (
    <div
      className="min-h-dvh md:h-dvh h-full md:px-[30px] px-[10px] md:py-[20px] py-[18px] flex flex-col md:overflow-hidden"
      style={{ backgroundColor: UI_COLORS.PRIMARY_BG }}
      aria-busy="true"
      aria-label="Loading editor"
    >
      <div className="flex-1 flex flex-col md:min-h-0">
        <div className="flex-1 flex h-full md:flex-row flex-col-reverse max-w-[1400px] mx-auto md:min-h-0 gap-10">
          {/* Sidebar placeholder */}
          <div className="md:w-[400px] w-full md:pr-3 md:h-full md:min-h-0 md:self-start flex flex-col justify-between">
            <div className="space-y-4">
              <div className="h-10 w-32 rounded-md bg-white/10 animate-pulse" />
              <div className="h-24 w-full rounded-md bg-white/10 animate-pulse" />
              <div className="h-24 w-full rounded-md bg-white/10 animate-pulse" />
              <div className="h-16 w-3/4 rounded-md bg-white/10 animate-pulse" />
            </div>
            <div className="h-8 w-24 rounded bg-white/5 animate-pulse opacity-50" />
          </div>

          {/* Canvas area placeholder */}
          <div className="flex-1 min-w-0 md:min-h-0">
            <div className="mb-5">
              <div className="relative w-full max-w-full overflow-hidden rounded-[3px] flex justify-start aspect-[4/3] max-h-[70vh] bg-white/10 animate-pulse" />
            </div>
            <div className="flex items-center gap-2 h-12">
              <div className="h-9 w-20 rounded-md bg-white/10 animate-pulse" />
              <div className="h-9 w-20 rounded-md bg-white/10 animate-pulse" />
              <div className="h-9 w-24 rounded-md bg-white/10 animate-pulse" />
              <div className="flex-1" />
              <div className="h-9 w-28 rounded-md bg-white/10 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
