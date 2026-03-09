"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

export interface SessionSummary {
  id: string;
  name: string | null;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface SessionsListPanelProps {
  sessions: SessionSummary[];
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  isLoading: boolean;
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateStr));
}

function useScrollState(ref: React.RefObject<HTMLDivElement | null>) {
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, [ref]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [ref, update]);

  return { canScrollLeft, canScrollRight };
}

export function SessionsListPanel({
  sessions,
  currentSessionId,
  onSelectSession,
  isLoading,
}: SessionsListPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { canScrollLeft, canScrollRight } = useScrollState(scrollRef);

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "right" ? 120 : -120, behavior: "smooth" });
  };

  if (isLoading) {
    return (
      <div className="text-[#929292] text-[13px] font-(family-name:--font-manrope) py-4">
        Loading…
      </div>
    );
  }

  if (!sessions.length) {
    return (
      <p className="text-[#929292] text-[13px] font-(family-name:--font-manrope)">
        No saved versions for this image.
      </p>
    );
  }

  return (
    <div>
      <div className="relative">
        {/* Left fade + arrow */}
        <div
          className={cn(
            "absolute left-0 top-0 bottom-0 z-10 flex items-center pointer-events-none transition-opacity duration-200",
            canScrollLeft ? "opacity-100" : "opacity-0"
          )}
        >
          <div className="w-8 h-full bg-gradient-to-r from-[#191919] to-transparent" />
          <button
            type="button"
            onClick={() => scroll("left")}
            className="pointer-events-auto absolute left-0 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-[#2A2A2A] border border-[#3D3D3D] text-[#5C38F3] hover:bg-[#333] transition-colors cursor-pointer"
            aria-label="Scroll left"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M6.5 2L3.5 5L6.5 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Scrollable row (carousel) */}
        <div
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto scroll-smooth pb-1"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          role="list"
        >
          {sessions.map((session) => {
            const isCurrent = session.id === currentSessionId;
            return (
              <button
                key={session.id}
                type="button"
                onClick={() => onSelectSession(session.id)}
                role="listitem"
                className={cn(
                  "flex flex-col items-center justify-start gap-1.5 py-2 px-2 rounded-[10px] border transition-all cursor-pointer flex-shrink-0 text-left",
                  "bg-[#1F1F1F] border-[#2D2D2D]",
                  "hover:border-[#444] hover:bg-[#252525]",
                  "active:scale-[0.98]",
                  "w-[96px]",
                  isCurrent && "border-[#5C38F3] bg-[#5C38F3]/10 ring-1 ring-[#5C38F3]"
                )}
                aria-pressed={isCurrent}
              >
                <div className="w-full aspect-[4/3] rounded-[6px] bg-[#0D0D0D] border border-[#2D2D2D] overflow-hidden flex items-center justify-center">
                  {session.thumbnail_url ? (
                    <img
                      src={session.thumbnail_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-[#666] text-[10px]">—</span>
                  )}
                </div>
                <p className="text-white text-[11px] font-(family-name:--font-manrope) font-medium truncate w-full text-center">
                  {session.name?.trim() || "Untitled"}
                </p>
                <p className="text-[#929292] text-[10px] font-(family-name:--font-manrope) leading-none">
                  {formatDate(session.updated_at)}
                </p>
              </button>
            );
          })}
        </div>

        {/* Right fade + arrow */}
        <div
          className={cn(
            "absolute right-0 top-0 bottom-0 z-10 flex items-center pointer-events-none transition-opacity duration-200",
            canScrollRight ? "opacity-100" : "opacity-0"
          )}
        >
          <div className="w-8 h-full bg-gradient-to-l from-[#191919] to-transparent" />
          <button
            type="button"
            onClick={() => scroll("right")}
            className="pointer-events-auto absolute right-0 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-[#2A2A2A] border border-[#3D3D3D] text-[#5C38F3] hover:bg-[#333] transition-colors cursor-pointer"
            aria-label="Scroll right"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M3.5 2L6.5 5L3.5 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
