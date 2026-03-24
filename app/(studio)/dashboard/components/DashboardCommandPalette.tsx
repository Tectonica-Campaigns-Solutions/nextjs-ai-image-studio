"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import { DashboardMaterialIcon } from "./DashboardMaterialIcon";

const NAV_COMMANDS = [
  { label: "Overview", icon: "dashboard", href: "/dashboard" },
  { label: "Clients", icon: "group", href: "/dashboard/clients" },
  { label: "Admins", icon: "shield", href: "/dashboard/admins" },
  { label: "Assets", icon: "folder_open", href: "/dashboard/assets" },
  { label: "Frames", icon: "frame_person", href: "/dashboard/frames-fonts?tab=frames" },
  { label: "Fonts", icon: "font_download", href: "/dashboard/frames-fonts?tab=fonts" },
  { label: "Canvas Sessions", icon: "draw", href: "/dashboard/canvas-sessions" },
  { label: "Audit Log", icon: "history", href: "/dashboard/audit" },
];

const ACTION_COMMANDS = [
  { label: "Create Client", icon: "person_add", action: "create-client" },
  { label: "Create Admin", icon: "shield", action: "create-admin" },
];

export function DashboardCommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const navigate = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  const handleAction = useCallback(
    (action: string) => {
      setOpen(false);
      switch (action) {
        case "create-client":
          router.push("/dashboard/clients");
          break;
        case "create-admin":
          router.push("/dashboard/admins");
          break;
      }
    },
    [router],
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden lg:inline-flex items-center gap-2 px-3 h-9 rounded-lg border border-outline-variant/15 bg-surface-container-lowest text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-colors text-xs"
      >
        <DashboardMaterialIcon icon="search" className="text-[16px]" />
        <span className="font-medium">Search...</span>
        <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border border-outline-variant/20 bg-surface-container-low px-1.5 font-mono text-[10px] font-medium text-on-surface-variant">
          <span className="text-[11px]">&#8984;</span>K
        </kbd>
      </button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search Dashboard"
        description="Navigate to pages or trigger actions"
        className="max-w-2xl border border-outline-variant/20 bg-surface-container-lowest text-on-surface shadow-2xl p-0 [&>button]:text-on-surface-variant [&>button]:hover:text-on-surface"
      >
        <CommandInput
          placeholder="Search pages, actions..."
          className="text-sm placeholder:text-on-surface-variant/80"
        />
        <CommandList className="max-h-[420px] p-2">
          <CommandEmpty className="py-10 text-sm text-on-surface-variant">
            No results found.
          </CommandEmpty>
          <CommandGroup
            heading="Navigate"
            className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-on-surface-variant"
          >
            {NAV_COMMANDS.map((cmd) => (
              <CommandItem
                key={cmd.href}
                onSelect={() => navigate(cmd.href)}
                className="cursor-pointer rounded-lg px-3 py-2 text-sm text-on-surface data-[selected=true]:bg-surface-container-high data-[selected=true]:text-on-surface"
              >
                <DashboardMaterialIcon icon={cmd.icon} className="text-[18px] mr-2 text-on-surface-variant" />
                <span>{cmd.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator className="my-2 bg-outline-variant/15" />
          <CommandGroup
            heading="Actions"
            className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-on-surface-variant"
          >
            {ACTION_COMMANDS.map((cmd) => (
              <CommandItem
                key={cmd.action}
                onSelect={() => handleAction(cmd.action)}
                className="cursor-pointer rounded-lg px-3 py-2 text-sm text-on-surface data-[selected=true]:bg-surface-container-high data-[selected=true]:text-on-surface"
              >
                <DashboardMaterialIcon icon={cmd.icon} className="text-[18px] mr-2 text-on-surface-variant" />
                <span>{cmd.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
