import type { ComponentType, ReactNode } from "react";
import {
  Grid3X3,
  History,
  ImageIcon,
  Layers,
  QrCode,
  Save,
  Shapes,
  SlidersHorizontal,
  Stamp,
  Type,
  WandSparkles,
} from "lucide-react";
import { FrameItem } from "../components/editor-icons";

/**
 * Single registry for every Studio tool: dock buttons, the Advanced accordion,
 * the mobile tab bar and the desktop tool panel header all derive from here.
 */

/** "image" = editing an uploaded/generated image; "template" = Branding templates. */
export type StudioEditorMode = "image" | "template";

/** Toolbar grouping for the upcoming dock redesign (not rendered yet). */
export type StudioToolGroup = "design" | "add" | "edit" | "arrange";

/** Where the tool lives in the current desktop chrome. */
export type StudioToolPlacement = "dock" | "advanced" | "toolbar";

export type StudioToolIcon = ComponentType<{ className?: string; strokeWidth?: number }>;

export interface StudioToolDef {
  id: string;
  label: string;
  hint: string;
  /** Mobile tab bar label; omit to keep the tool off the mobile tab bar. */
  mobileLabel?: string;
  icon: StudioToolIcon;
  placement: StudioToolPlacement;
  group: StudioToolGroup;
  modes: readonly StudioEditorMode[];
}

const ALL_MODES = ["image", "template"] as const;

export const STUDIO_TOOLS = [
  {
    id: "text-tools",
    label: "Text Tools",
    hint: "Add headlines, captions & labels",
    mobileLabel: "Text",
    icon: Type,
    placement: "dock",
    group: "add",
    modes: ALL_MODES,
  },
  {
    id: "logo-overlay",
    label: "Logo Overlay",
    hint: "Place your group or partner logo",
    mobileLabel: "Logo",
    icon: Stamp,
    placement: "dock",
    group: "add",
    modes: ALL_MODES,
  },
  {
    id: "qr-code",
    label: "QR Code",
    hint: "Link to a sign-up, RSVP or donate page",
    mobileLabel: "QR Code",
    icon: QrCode,
    placement: "dock",
    group: "add",
    modes: ALL_MODES,
  },
  {
    id: "ai-edit",
    label: "Edit with AI",
    hint: "Describe a change in plain words",
    mobileLabel: "AI Edit",
    icon: WandSparkles,
    placement: "dock",
    group: "edit",
    modes: ALL_MODES,
  },
  {
    id: "advanced-options",
    label: "Advanced",
    hint: "Layers, shapes, frames & more",
    mobileLabel: "More",
    icon: SlidersHorizontal,
    placement: "dock",
    group: "arrange",
    modes: ALL_MODES,
  },
  // Advanced accordion rows — order and labels from design file
  {
    id: "layers",
    label: "Layers",
    hint: "Reorder and manage layers",
    icon: Layers,
    placement: "advanced",
    group: "arrange",
    modes: ALL_MODES,
  },
  {
    id: "background",
    label: "Background image",
    hint: "Replace the background image",
    icon: ImageIcon,
    placement: "advanced",
    group: "design",
    modes: ["image"],
  },
  {
    id: "shapes",
    label: "Shape Tools",
    hint: "Add shapes",
    icon: Shapes,
    placement: "advanced",
    group: "add",
    modes: ALL_MODES,
  },
  {
    id: "frames",
    label: "Frames",
    hint: "Add a frame",
    icon: FrameItem,
    placement: "advanced",
    group: "add",
    modes: ALL_MODES,
  },
  {
    id: "guides",
    label: "Guides & grid",
    hint: "Snap to guides and grid",
    icon: Grid3X3,
    placement: "advanced",
    group: "arrange",
    modes: ALL_MODES,
  },
  {
    id: "sessions",
    label: "Saved versions",
    hint: "Restore a saved version",
    icon: Save,
    placement: "advanced",
    group: "arrange",
    modes: ALL_MODES,
  },
  // Opened from the canvas toolbar / save toast, not from the dock
  {
    id: "saved-versions",
    label: "Saved versions",
    hint: "Restore a saved version",
    icon: History,
    placement: "toolbar",
    group: "arrange",
    modes: ALL_MODES,
  },
] as const satisfies readonly StudioToolDef[];

export type StudioToolId = (typeof STUDIO_TOOLS)[number]["id"];

type ToolsWithPlacement<P extends StudioToolPlacement> = Extract<
  (typeof STUDIO_TOOLS)[number],
  { placement: P }
>;

export type StudioDockToolId = ToolsWithPlacement<"dock">["id"];
export type StudioAdvancedRowId = ToolsWithPlacement<"advanced">["id"];
/** Anything that can be open in the desktop slide-over panel. */
export type StudioDesktopToolId = StudioDockToolId | "saved-versions";
export type StudioMobileToolId = StudioDockToolId | "saved-versions";

/** Panel content per tool; `null` hides the tool. */
export type StudioToolPanels = Partial<Record<StudioToolId, ReactNode | null>>;

export function getStudioTool(id: StudioToolId): StudioToolDef {
  return STUDIO_TOOLS.find((t) => t.id === id)!;
}

export function getStudioTools(
  placement: StudioToolPlacement,
  mode: StudioEditorMode = "image",
): readonly StudioToolDef[] {
  return STUDIO_TOOLS.filter(
    (t) => t.placement === placement && (t.modes as readonly StudioEditorMode[]).includes(mode),
  );
}

export const STUDIO_DOCK_TOOLS = getStudioTools("dock") as readonly (StudioToolDef & {
  id: StudioDockToolId;
})[];

export const STUDIO_ADVANCED_ROWS = getStudioTools("advanced") as readonly (StudioToolDef & {
  id: StudioAdvancedRowId;
})[];

export const STUDIO_MOBILE_TOOLS = STUDIO_DOCK_TOOLS.filter(
  (t): t is StudioToolDef & { id: StudioDockToolId; mobileLabel: string } => !!t.mobileLabel,
);

/**
 * A dock tool is visible when its own panel is available; "advanced-options"
 * is visible when any of its accordion rows is.
 */
export function isDockToolAvailable(id: StudioDockToolId, panels: StudioToolPanels): boolean {
  if (id === "advanced-options") {
    return STUDIO_ADVANCED_ROWS.some((row) => panels[row.id] != null);
  }
  return panels[id] != null;
}
