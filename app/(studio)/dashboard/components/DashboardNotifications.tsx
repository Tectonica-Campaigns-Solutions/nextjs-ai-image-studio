"use client";

import { useEffect, useState, useRef } from "react";
import { DashboardMaterialIcon } from "./DashboardMaterialIcon";

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  type: "info" | "warning" | "success";
  timestamp: string;
}

const TYPE_STYLES: Record<string, string> = {
  info: "bg-blue-100 text-blue-700",
  warning: "bg-amber-100 text-amber-700",
  success: "bg-green-100 text-green-700",
};

const TYPE_ICONS: Record<string, string> = {
  info: "info",
  warning: "warning",
  success: "check_circle",
};

export function DashboardNotifications() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchNotifications() {
      try {
        const res = await fetch("/api/dashboard/notifications", {
          method: "GET",
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          const items = Array.isArray(data?.notifications)
            ? (data.notifications as NotificationItem[])
            : [];
          setNotifications(items);
        }
      } catch {
        // Silently fail - notifications are non-critical
      }
    }
    fetchNotifications();
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const visibleNotifications = notifications.filter((n) => !dismissed.has(n.id));
  const count = visibleNotifications.length;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant/15 bg-surface-container-lowest text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-colors relative"
        aria-label="Notifications"
        title="Notifications"
      >
        <DashboardMaterialIcon icon="notifications" className="text-[18px]" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-dashboard-primary text-dashboard-on-primary text-[9px] font-bold flex items-center justify-center">
            {count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-surface-container-lowest border border-outline-variant/10 rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-surface-container">
            <h3 className="text-sm font-bold text-on-surface">Notifications</h3>
          </div>
          {visibleNotifications.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <DashboardMaterialIcon icon="notifications_none" className="text-3xl text-on-surface-variant/40 mb-2" />
              <p className="text-sm text-on-surface-variant">All caught up!</p>
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto divide-y divide-surface-container">
              {visibleNotifications.map((n) => (
                <div key={n.id} className="px-4 py-3 flex gap-3 hover:bg-surface-container-highest/50 transition-colors">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${TYPE_STYLES[n.type]}`}>
                    <DashboardMaterialIcon icon={TYPE_ICONS[n.type]} className="text-[14px]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-on-surface">{n.title}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">{n.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDismissed((prev) => new Set([...prev, n.id]))}
                    className="text-on-surface-variant/50 hover:text-on-surface-variant transition-colors shrink-0"
                  >
                    <DashboardMaterialIcon icon="close" className="text-[14px]" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
