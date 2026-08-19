"use client";

import { CheckCircle2, X } from "lucide-react";
import { UI_COLORS } from "../constants/editor-constants";

export function StudioSaveToast({
  onViewVersions,
  onClose,
  className,
}: {
  onViewVersions: () => void;
  onClose: () => void;
  className?: string;
}) {
  return (
    <div
      className={`vs-pop absolute bottom-[18px] left-3 right-3 z-[10] mx-auto flex w-max max-w-[calc(100%-24px)] items-center gap-2.5 rounded-xl border border-white/[0.17] bg-[#211E30] px-3 py-2.5 shadow-[0_24px_48px_-18px_rgba(0,0,0,0.75)] md:bottom-[18px] ${className ?? ""}`}
      role="status"
    >
      <CheckCircle2 className="size-[18px] shrink-0 text-[#54B978]" strokeWidth={2.2} aria-hidden />
      <span className="whitespace-nowrap text-[13.5px] font-bold text-[#F5F4FB]">Project saved</span>
      <button
        type="button"
        onClick={onViewVersions}
        className="ml-0.5 inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-[#8069FF] bg-transparent px-[11px] py-[5px] text-[12.5px] font-bold text-[#8069FF] transition-colors hover:bg-[rgba(128,105,255,0.14)]"
      >
        View saved versions
      </button>
      <button
        type="button"
        onClick={onClose}
        title="Dismiss"
        aria-label="Dismiss"
        className="ml-auto inline-flex size-[26px] shrink-0 items-center justify-center rounded-lg text-[#ADAAC0] transition-colors hover:text-[#F5F4FB]"
      >
        <X className="size-[15px]" strokeWidth={2} />
      </button>
    </div>
  );
}
