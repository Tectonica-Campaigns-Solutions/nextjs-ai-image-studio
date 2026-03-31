"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
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

type NavCommand = {
  label: string;
  icon: string;
  href: string;
  shortcut: string;
};

type ActionCommand = {
  label: string;
  icon: string;
  action: string;
  shortcut: string;
};

const RECENT_COMMANDS_STORAGE_KEY = "dashboard-command-recent";
const MAX_RECENT_COMMANDS = 5;

const NAV_COMMANDS: NavCommand[] = [
  { label: "Overview", icon: "dashboard", href: "/dashboard", shortcut: "G O" },
  { label: "Clients", icon: "group", href: "/dashboard/clients", shortcut: "G C" },
  { label: "Admins", icon: "shield", href: "/dashboard/admins", shortcut: "G A" },
  { label: "Assets", icon: "folder_open", href: "/dashboard/assets", shortcut: "G S" },
  { label: "Frames", icon: "frame_person", href: "/dashboard/frames-fonts?tab=frames", shortcut: "G F" },
  { label: "Fonts", icon: "font_download", href: "/dashboard/frames-fonts?tab=fonts", shortcut: "G N" },
  { label: "Canvas Sessions", icon: "draw", href: "/dashboard/canvas-sessions", shortcut: "G V" },
  { label: "Audit Log", icon: "history", href: "/dashboard/audit", shortcut: "G L" },
];

const BASE_ACTION_COMMANDS: ActionCommand[] = [
  { label: "Create Client", icon: "person_add", action: "create-client", shortcut: "A C" },
  { label: "Create Admin", icon: "shield", action: "create-admin", shortcut: "A A" },
];

const CONTEXT_ACTION_COMMANDS: Array<{
  match: (pathname: string) => boolean;
  command: ActionCommand;
}> = [
    {
      match: (pathname) => pathname.startsWith("/dashboard/clients"),
      command: {
        label: "Go to Clients Filters",
        icon: "filter_alt",
        action: "clients-focus-filters",
        shortcut: "C F",
      },
    },
    {
      match: (pathname) => pathname.startsWith("/dashboard/admins"),
      command: {
        label: "Invite New Admin",
        icon: "person_add",
        action: "create-admin",
        shortcut: "A I",
      },
    },
  ];

export function DashboardCommandPalette() {
  const [open, setOpen] = useState(false);
  const [recentHrefs, setRecentHrefs] = useState<string[]>([]);
  const router = useRouter();
  const pathname = usePathname();

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

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(RECENT_COMMANDS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return;
      const safe = parsed.filter((item): item is string => typeof item === "string");
      setRecentHrefs(safe.slice(0, MAX_RECENT_COMMANDS));
    } catch {
      // Ignore malformed storage.
    }
  }, []);

  const persistRecentHrefs = useCallback((next: string[]) => {
    setRecentHrefs(next);
    try {
      window.localStorage.setItem(RECENT_COMMANDS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore write failures in restricted environments.
    }
  }, []);

  const trackRecentNavigation = useCallback(
    (href: string) => {
      const next = [href, ...recentHrefs.filter((item) => item !== href)].slice(
        0,
        MAX_RECENT_COMMANDS,
      );
      persistRecentHrefs(next);
    },
    [persistRecentHrefs, recentHrefs],
  );

  const contextActionCommands = useMemo(
    () =>
      CONTEXT_ACTION_COMMANDS.filter(({ match }) => match(pathname)).map(
        ({ command }) => command,
      ),
    [pathname],
  );

  const actionCommands = useMemo(() => {
    const merged = [...BASE_ACTION_COMMANDS, ...contextActionCommands];
    return merged.filter(
      (command, index) =>
        merged.findIndex((item) => item.action === command.action) === index,
    );
  }, [contextActionCommands]);

  const recentCommands = useMemo(
    () =>
      recentHrefs
        .map((href) => NAV_COMMANDS.find((command) => command.href === href))
        .filter((command): command is NavCommand => Boolean(command)),
    [recentHrefs],
  );

  const navigate = useCallback(
    (href: string) => {
      setOpen(false);
      trackRecentNavigation(href);
      router.push(href);
    },
    [router, trackRecentNavigation],
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
        case "clients-focus-filters":
          router.push("/dashboard/clients");
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
          {recentCommands.length > 0 ? (
            <>
              <CommandGroup
                heading="Recent"
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-on-surface-variant"
              >
                {recentCommands.map((cmd) => (
                  <CommandItem
                    key={`recent-${cmd.href}`}
                    onSelect={() => navigate(cmd.href)}
                    className="cursor-pointer rounded-lg px-3 py-2 text-sm text-on-surface data-[selected=true]:bg-surface-container-high data-[selected=true]:text-on-surface"
                  >
                    <DashboardMaterialIcon icon="history" className="text-[18px] mr-2 text-on-surface-variant" />
                    <span>{cmd.label}</span>
                    <span className="ml-auto text-[10px] font-mono uppercase tracking-wide text-on-surface-variant/80">
                      {cmd.shortcut}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator className="my-2 bg-outline-variant/15" />
            </>
          ) : null}
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
            heading={contextActionCommands.length > 0 ? "Actions (Contextual)" : "Actions"}
            className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-on-surface-variant"
          >
            {actionCommands.map((cmd) => (
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
