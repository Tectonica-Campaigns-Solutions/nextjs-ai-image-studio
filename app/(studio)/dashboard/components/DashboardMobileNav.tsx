"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { DashboardMaterialIcon } from "./DashboardMaterialIcon";
import { DashboardSidebarNav } from "./DashboardSidebarNav";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

export function DashboardMobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant/15 bg-surface-container-lowest text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-colors"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
      >
        <DashboardMaterialIcon icon="menu" className="text-[20px]" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-64 p-0 bg-white dark:bg-slate-900">
          <VisuallyHidden>
            <SheetTitle>Navigation</SheetTitle>
          </VisuallyHidden>
          <div className="flex flex-col h-full py-6 px-4 text-sm">
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

            <div onClick={() => setOpen(false)}>
              <DashboardSidebarNav />
            </div>

            <div className="mt-auto" />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
