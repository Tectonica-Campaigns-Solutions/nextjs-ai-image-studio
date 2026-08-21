"use client";

import type React from "react";
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Text, Group, Shadow, Rect, ActiveSelection } from "fabric";
import {
  BackgroundImagePanel,
  DisclaimerModal,
  EditorSidebar,
  EditorToolbar,
  AIEditPanel,
  CanvasGuidesOverlay,
  FrameToolsPanel,
  FrameMobilePicker,
  GuidesAndGridPanel,
  LayersPanel,
  LogoToolsPanel,
  QrToolsPanel,
  SaveSessionModal,
  SessionsListPanel,
  ShapeToolsPanel,
  ShapeMobilePicker,
  TextToolsPanel,
  UploadPromptCard,
  EyedropperMagnifier,
  FeedbackPanelContent,
  FeedbackSparklesIcon,
  StudioAccessDeniedScreen,
  StudioHeader,
  StudioActionBar,
  StudioDesktopToolPanel,
  AdvancedOptionsPanel,
  StudioSaveToast,
} from "./components";
import {
  AdvancedOptionsMobilePanel,
} from "./components/AdvancedOptionsMobilePanel";
import {
  StudioMobileCanvasControls,
  StudioMobileHeader,
  StudioMobileSessionBar,
  StudioMobileTabBar,
  StudioMobileToolSheet,
} from "./components/StudioMobileChrome";
import {
  StudioMobileDoneBar,
  StudioMobileFloatControls,
  QrMobileSheetPanel,
  getMobileFloatTargetFromObject,
  isMobileFloatToolTab,
  type MobileFloatTarget,
} from "./components/StudioMobileFloatControls";
import type { SessionSummary } from "./components/SessionsListPanel";
import type {
  ExportConfig,
  ImageEditorStandaloneProps,
  ShapeType,
} from "./types/image-editor-types";
import type { GoogleFontCatalogEntry } from "./types/google-font-catalog";
import type { DisclaimerPosition } from "./types/image-editor-types";
import type { StudioDesktopToolId, StudioMobileToolId } from "./constants/editor-constants";
import { studioToast } from "./utils/studio-toast";
import {
  BUNDLED_FONT_CSS_VARS,
  DEFAULT_FONTS,
  EXPORT,
  FEATURE_FLAGS,
  SELECTION_MENU,
  TEXT_DEFAULTS,
  UI_COLORS,
  STUDIO_IFRAME_MESSAGE,
  STUDIO_LAYOUT,
} from "./constants/editor-constants";

// Import custom hooks
import { useImageEditorCanvas, constrainObjectToCanvas } from "./hooks/use-image-editor-canvas";
import { useImageEditorHistory } from "./hooks/use-image-editor-history";
import { useImageEditorSelection } from "./hooks/use-image-editor-selection";
import { useTextTools } from "./hooks/use-text-tools";
import { useQRTools } from "./hooks/use-qr-tools";
import { useLogoTools } from "./hooks/use-logo-tools";
import { useFrameTools } from "./hooks/use-frame-tools";
import { useShapeTools } from "./hooks/use-shape-tools";
import { useAlignmentTools } from "./hooks/use-alignment-tools";
import { useEyedropper } from "./hooks/use-eyedropper";
import type { EyedropperTarget } from "./hooks/use-eyedropper";
import { useMobilePanel } from "./hooks/use-mobile-panel";
import { useMobileStudioViewport } from "./hooks/use-mobile-studio-viewport";
import { useEditorFonts } from "./hooks/use-editor-fonts";
import { useDynamicGoogleFont } from "./hooks/use-dynamic-google-font";
import { editImage } from "./lib/image-edit-service";
import { StudioLoading } from "./studio-loading";
import { getCurrentBackgroundImageForEdit, getFullCanvasImageForEdit, rgbaToString, remeasureTextboxes } from "./utils/image-editor-utils";
import { Copy, Lock, Trash2, Unlock } from "lucide-react";
import { getCanvasFontFamily, logVisualStudioAccess, requestExitFullscreen, sendToChat } from "./utils/studio-utils";
import { normalizeFontCatalogKey } from "./utils/build-google-font-css2-url";
import { useEmbedSource } from "./hooks/use-embed-source";
import { isAllowedEmbedOrigin } from "./lib/embed-allowlist";
import { DEFAULT_TEXT_BLOCK_DELIMITER, insertAutoTextBlocks, parseTextBlocks } from "./utils/text-blocks";

export default function ImageEditorStandalone({
  ...props
}: ImageEditorStandaloneProps) {
  const searchParams = useSearchParams();
  const debugParam = searchParams?.get("debug")?.toLowerCase() ?? null;
  const debugEnabled = debugParam === "true" || debugParam === "1";
  const isDev = process.env.NODE_ENV === "development";

  const embedSource = useEmbedSource();

  const allowedByEmbedOrigin =
    isAllowedEmbedOrigin(embedSource.origin);

  // This route is intended to run embedded in an iframe. If it's not in an iframe,
  // deny by default (unless dev/debug).
  const isInIframe = embedSource.isIframe === true;

  const allowed = isDev || debugEnabled || (isInIframe && allowedByEmbedOrigin);

  // Avoid flicker while the client-only embed detection initializes.
  if (!allowed && embedSource.isIframe === null && !isDev && !debugEnabled) {
    return <StudioLoading />;
  }

  if (!allowed) {
    return <StudioAccessDeniedScreen />;
  }

  return <ImageEditorStandaloneInner {...props} />;
}

function ImageEditorStandaloneInner({
  params,
  logoAssets,
  frameAssets = [],
  fontAssets = [],
  sessionData = null,
  allowCustomLogo = true,
}: ImageEditorStandaloneProps) {
  const imageUrlFromParams = params.imageUrl ?? sessionData?.background_url;
  const didAutoInsertTextRef = useRef(false);

  // Track each access to the Visual Studio for audit/logs in the dashboard.
  const hasLoggedAccessRef = useRef(false);
  useEffect(() => {
    if (!params.user_id) return;
    if (hasLoggedAccessRef.current) return;
    hasLoggedAccessRef.current = true;

    void logVisualStudioAccess({
      caUserId: params.user_id,
      sessionId: sessionData?.id ?? null,
    });
  }, [params.user_id, sessionData?.id]);

  // Header ref
  const headerRef = useRef<HTMLDivElement>(null);

  // Upload state
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [showUploadPrompt, setShowUploadPrompt] = useState<boolean>(
    !imageUrlFromParams
  );

  // Preprocess input image URLs (remove disclaimer if present) so editing is clean.
  const [preprocessedImageUrl, setPreprocessedImageUrl] = useState<string | null>(null);
  const [isPreprocessingImage, setIsPreprocessingImage] = useState<boolean>(false);
  const preprocessAbortRef = useRef<AbortController | null>(null);

  // Export states
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [showDisclaimerModal, setShowDisclaimerModal] = useState<boolean>(false);
  const [disclaimerPosition, setDisclaimerPosition] = useState<DisclaimerPosition>(EXPORT.DEFAULT_DISCLAIMER_POSITION);

  // Iframe send-url-to-chat state
  const [isSendingUrlToChat, setIsSendingUrlToChat] = useState<boolean>(false);

  // Save state
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [sessionId, setSessionId] = useState<string | null>(sessionData?.id ?? null);
  const [showSaveModal, setShowSaveModal] = useState<boolean>(false);

  // Sessions list for current image (saved versions)
  const [sessionsForImage, setSessionsForImage] = useState<SessionSummary[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState<boolean>(false);
  /** True once the initial sessions fetch has completed (or was skipped). Used to avoid layout shift. */
  const [sessionsInitialFetchDone, setSessionsInitialFetchDone] = useState<boolean>(false);

  // Feedback state
  const [isFetchingFeedback, setIsFetchingFeedback] = useState<boolean>(false);
  const [feedbackText, setFeedbackText] = useState<string | null>(null);
  const [feedbackIssues, setFeedbackIssues] = useState<
    Array<{ id: string; title: string; severity: string; suggestion: string }>
  >([]);
  const [feedbackEditPlan, setFeedbackEditPlan] = useState<{ prompt?: string } | null>(null);
  const [isApplyingCleanup, setIsApplyingCleanup] = useState<boolean>(false);

  // AI image edit state
  const [isEditingWithAI, setIsEditingWithAI] = useState<boolean>(false);

  // Replace background image state
  const [isReplacingBackground, setIsReplacingBackground] = useState<boolean>(false);
  const [desktopTool, setDesktopTool] = useState<StudioDesktopToolId | null>(null);
  const [isCompactChrome, setIsCompactChrome] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [mobileQrPlaced, setMobileQrPlaced] = useState(false);
  const [mobileQrSheetOpen, setMobileQrSheetOpen] = useState(false);
  const [mobileShapeEditingActive, setMobileShapeEditingActive] = useState(false);
  const [mobileFrameEditingActive, setMobileFrameEditingActive] = useState(false);
  const [mobileFeedbackOpen, setMobileFeedbackOpen] = useState(false);

  // Rotation tooltip (degrees) shown near element while rotating or briefly after
  const [rotationTooltip, setRotationTooltip] = useState<{
    angle: number;
    left: number;
    top: number;
  } | null>(null);

  // Context menu position when a layer is selected (above or below the selection to avoid clipping at canvas edges)
  const [selectionContextMenuPosition, setSelectionContextMenuPosition] = useState<{
    left: number;
    top: number;
  } | null>(null);

  const [googleFontCatalog, setGoogleFontCatalog] = useState<GoogleFontCatalogEntry[]>([]);
  const [googleCatalogLoading, setGoogleCatalogLoading] = useState(true);
  const [googleCatalogError, setGoogleCatalogError] = useState(false);

  // Guides and grid
  const [showGrid, setShowGrid] = useState(false);
  const [guidePositions, setGuidePositions] = useState<{ v: number[]; h: number[] }>({ v: [], h: [] });
  const guidePositionsRef = useRef<{ v: number[]; h: number[] } | null>(null);
  useEffect(() => {
    guidePositionsRef.current = guidePositions;
  }, [guidePositions]);

  // Determine image URL
  const rawImageUrl = imageUrlFromParams || uploadedImageUrl;
  const requiresPreprocess =
    FEATURE_FLAGS.enableDisclaimerCropPreprocess &&
    !!rawImageUrl &&
    /^https:\/\//i.test(rawImageUrl) &&
    !rawImageUrl.startsWith("blob:") &&
    !rawImageUrl.startsWith("data:");

  // Important: while preprocessing, keep imageUrl null so the canvas doesn't
  // briefly render the original (with disclaimer).
  const imageUrl = requiresPreprocess
    ? (isPreprocessingImage ? null : (preprocessedImageUrl ?? null))
    : rawImageUrl;

  const preprocessImageUrl = useCallback(async (url: string): Promise<string> => {
    // Skip preprocessing for local object URLs and already-inlined data URLs.
    if (url.startsWith("blob:") || url.startsWith("data:")) return url;
    // Only preprocess absolute https URLs.
    if (!/^https:\/\//i.test(url)) return url;

    try {
      const ctrl = new AbortController();
      preprocessAbortRef.current?.abort();
      preprocessAbortRef.current = ctrl;

      const resp = await fetch(
        `/api/studio/preprocess-image?force=1&imageUrl=${encodeURIComponent(url)}`,
        { signal: ctrl.signal },
      );
      const json = await resp.json().catch(() => null);
      if (!resp.ok || !json?.image_url) return url;
      return String(json.image_url);
    } catch (e: any) {
      if (e?.name === "AbortError") return url;
      return url;
    }
  }, []);

  // Preprocess initial param/session background once per raw URL change.
  useEffect(() => {
    if (!rawImageUrl) {
      setPreprocessedImageUrl(null);
      setIsPreprocessingImage(false);
      return;
    }
    if (!requiresPreprocess) {
      preprocessAbortRef.current?.abort();
      setPreprocessedImageUrl(null);
      setIsPreprocessingImage(false);
      return;
    }
    let cancelled = false;
    setIsPreprocessingImage(true);
    setPreprocessedImageUrl(null);
    (async () => {
      const cleaned = await preprocessImageUrl(rawImageUrl);
      if (cancelled) return;
      setPreprocessedImageUrl(cleaned);
      setIsPreprocessingImage(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [rawImageUrl, requiresPreprocess, preprocessImageUrl]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/fonts/google-catalog")
      .then(async (r) => {
        const data = (await r.json().catch(() => ({}))) as {
          fonts?: GoogleFontCatalogEntry[];
          error?: string;
        };
        if (cancelled) return;
        setGoogleFontCatalog(Array.isArray(data.fonts) ? data.fonts : []);
        if (!r.ok || data.error) setGoogleCatalogError(true);
      })
      .catch(() => {
        if (!cancelled) setGoogleCatalogError(true);
      })
      .finally(() => {
        if (!cancelled) setGoogleCatalogLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Prevent context menu
  const preventContextMenu = useCallback((e: MouseEvent) => {
    e.preventDefault();
    return false;
  }, []);

  // Create stable refs that will be passed to hooks
  const canvasRefStable = useRef<any>(null);
  const originalImageUrlRefStable = useRef<string | null>(null);
  const originalImageDimensionsRefStable = useRef<{ width: number; height: number } | null>(null);
  const saveStateRef = useRef<(immediate?: boolean) => void>(() => { });
  const setFrameOpacityRef = useRef<(n: number) => void>(() => { });
  const currentBackgroundUrlRef = useRef<string | null>(null);

  // Ref to track when shape state is being synced from a canvas selection change
  // (as opposed to a user interaction). Used to prevent updateSelectedShape from
  // overwriting the newly-selected shape with stale panel values.
  const shapeSyncingRef = useRef(false);

  const textTools = useTextTools({
    canvasRef: canvasRefStable,
    saveStateRef,
    defaultFontFamily: fontAssets[0]?.font_family || DEFAULT_FONTS.PRIMARY,
  });

  const qrTools = useQRTools({
    canvasRef: canvasRefStable,
    saveStateRef,
  });

  const logoTools = useLogoTools({
    canvasRef: canvasRefStable,
    logoAssets,
    saveStateRef,
  });

  const shapeTools = useShapeTools({
    canvasRef: canvasRefStable,
    saveStateRef,
  });

  // Eyedropper: route picked color to the correct setter
  const handleEyedropperPick = useCallback(
    (color: import("./types/image-editor-types").RgbaColor, target: EyedropperTarget) => {
      switch (target) {
        case "textColor":
          textTools.setTextColor(color);
          break;
        case "backgroundColor":
          textTools.setBackgroundColor(color);
          break;
        case "shapeFill":
          shapeTools.setShapeFillColor(color);
          break;
        case "shapeStroke":
          shapeTools.setShapeStrokeColor(color);
          break;
      }
    },
    [textTools.setTextColor, textTools.setBackgroundColor, shapeTools.setShapeFillColor, shapeTools.setShapeStrokeColor],
  );

  const eyedropper = useEyedropper({
    canvasRef: canvasRefStable,
    onPickColor: handleEyedropperPick,
  });

  // Initialize selection hook with real setters wired directly
  const selection = useImageEditorSelection({
    canvasRef: canvasRefStable,
    setFontSize: textTools.setFontSize,
    setFontFamily: textTools.setFontFamily,
    setTextColor: textTools.setTextColor,
    setBackgroundColor: textTools.setBackgroundColor,
    setIsBold: textTools.setIsBold,
    setIsItalic: textTools.setIsItalic,
    setIsUnderline: textTools.setIsUnderline,
    setLineHeight: textTools.setLineHeight,
    setLetterSpacing: textTools.setLetterSpacing,
    setTextAlign: textTools.setTextAlign,
    setShapeFillColor: shapeTools.setShapeFillColor,
    setShapeStrokeColor: shapeTools.setShapeStrokeColor,
    setShapeStrokeWidth: shapeTools.setShapeStrokeWidth,
    setShapeOpacity: shapeTools.setShapeOpacity,
    onShapeSyncStart: () => { shapeSyncingRef.current = true; },
    onShapeSyncEnd: () => { shapeSyncingRef.current = false; },
  });

  // Ref used by onRestoreBackgroundUrl so undo/redo can update the canvas's background URL ref
  const canvasOriginalImageUrlRefRef = useRef<React.MutableRefObject<string | null> | null>(null);

  // Initialize history hook with stable refs and restore callback so undo/redo shows correct background
  const history = useImageEditorHistory({
    canvasRef: canvasRefStable,
    originalImageUrlRef: originalImageUrlRefStable,
    originalImageDimensionsRef: originalImageDimensionsRefStable,
    setObjectMetadata: selection.setObjectMetadata,
    setSelectedObject: selection.setSelectedObject,
    setQrSize: qrTools.setQrSize,
    setQrOpacity: qrTools.setQrOpacity,
    setLogoSize: logoTools.setLogoSize,
    setLogoOpacity: logoTools.setLogoOpacity,
    onRestoreBackgroundUrl: (url) => {
      if (canvasOriginalImageUrlRefRef.current) canvasOriginalImageUrlRefRef.current.current = url;
      currentBackgroundUrlRef.current = url;
    },
  });

  // Update saveStateRef whenever history.saveState changes
  useEffect(() => {
    saveStateRef.current = history.saveState;
  }, [history.saveState]);

  // Context menu position: above/below object depending on space (used by canvas hook move control and by effects)
  const computeMenuPosition = useCallback(
    (obj: any, canvas: { viewportTransform?: number[]; height?: number }) => {
      const center = obj.getCenterPoint();
      const vpt = canvas.viewportTransform;
      if (!vpt) return null;
      const centerScreenX = center.x * vpt[0] + center.y * vpt[2] + vpt[4];
      const centerScreenY = center.x * vpt[1] + center.y * vpt[3] + vpt[5];
      const ch = canvas.height ?? 0;
      const menuAboveTop = centerScreenY - SELECTION_MENU.OFFSET_ABOVE;
      const menuAboveTopNearBottom = centerScreenY - SELECTION_MENU.OFFSET_ABOVE_NEAR_BOTTOM;
      const menuBelowTop = centerScreenY + SELECTION_MENU.OFFSET_BELOW;
      const menuBelowBottom = menuBelowTop + SELECTION_MENU.EST_HEIGHT;
      const nearTop = centerScreenY < SELECTION_MENU.NEAR_TOP_Y;
      const nearBottom = centerScreenY > ch - SELECTION_MENU.NEAR_BOTTOM_OFFSET;
      const belowFits = menuBelowBottom <= ch - SELECTION_MENU.EDGE_MARGIN;
      let top: number;
      if (nearTop && belowFits) {
        top = menuBelowTop;
      } else if (nearBottom) {
        top = menuAboveTopNearBottom;
      } else {
        top = menuAboveTop;
      }
      return { left: centerScreenX, top };
    },
    [],
  );

  // Initialize canvas hook (provides canvas instance)
  const canvasEditor = useImageEditorCanvas(imageUrl, {
    headerRef,
    setHistoryState: history.setHistoryState,
    setObjectMetadata: selection.setObjectMetadata,
    setSelectedObject: selection.setSelectedObject,
    setQrSize: qrTools.setQrSize,
    setLogoSize: logoTools.setLogoSize,
    setFrameOpacity: (n: number) => setFrameOpacityRef.current(n),
    saveState: history.saveState,
    moveSaveTimeoutRef: history.moveSaveTimeoutRef,
    saveStateTimeoutRef: history.saveStateTimeoutRef,
    preventContextMenu,
    onBackgroundReplaced: (newUrl) => {
      currentBackgroundUrlRef.current = newUrl;
      originalImageUrlRefStable.current = newUrl;
    },
    onRotationTooltip: setRotationTooltip,
    onSelectionContextMenuPosition: (obj, canvas) => {
      if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
        return;
      }
      const pos = computeMenuPosition(obj, canvas);
      if (pos) setSelectionContextMenuPosition(pos);
    },
    guidePositionsRef,
  });

  const frameTools = useFrameTools({
    canvasRef: canvasRefStable,
    frameAssets,
    aspectRatio: canvasEditor.aspectRatio,
    saveStateRef,
  });

  const alignmentTools = useAlignmentTools(canvasRefStable);

  // Keep setFrameOpacityRef in sync so the canvas hook can call it
  useEffect(() => {
    setFrameOpacityRef.current = frameTools.setFrameOpacity;
  }, [frameTools.setFrameOpacity]);

  // Mobile panel hook
  const mobilePanel = useMobilePanel();
  const isMobileStudio = useMobileStudioViewport();
  const canvasWrapperRef = useRef<HTMLDivElement>(null);

  const isQrSelected =
    !!selection.selectedObject && !!(selection.selectedObject as any).isQR;

  const mobileTextLogoMode =
    isMobileStudio && isMobileFloatToolTab(mobilePanel.activeTab);

  const mobileQrEditingMode =
    isMobileStudio &&
    mobilePanel.activeTab === "qr-code" &&
    mobileQrPlaced &&
    !mobileQrSheetOpen;

  const mobileShapeEditingMode =
    isMobileStudio &&
    mobilePanel.activeTab === "advanced-options" &&
    mobileShapeEditingActive &&
    !mobilePanel.isPanelVisible;

  const mobileFrameEditingMode =
    isMobileStudio &&
    mobilePanel.activeTab === "advanced-options" &&
    mobileFrameEditingActive &&
    !mobilePanel.isPanelVisible;

  const mobileFloatSelectionTarget = getMobileFloatTargetFromObject(
    selection.selectedObject,
  );

  const mobileSelectionFloatMode =
    isMobileStudio &&
    !mobilePanel.activeTab &&
    !mobilePanel.isPanelVisible &&
    !mobileFeedbackOpen &&
    !mobileQrSheetOpen &&
    !!mobileFloatSelectionTarget;

  const mobileFloatChromeMode =
    mobileTextLogoMode ||
    mobileQrEditingMode ||
    mobileShapeEditingMode ||
    mobileFrameEditingMode ||
    mobileSelectionFloatMode;

  const mobileAdvancedFloatTarget: MobileFloatTarget | null =
    mobilePanel.activeTab === "advanced-options"
      ? mobileFrameEditingActive
        ? "frame"
        : mobileShapeEditingActive
          ? "shape"
          : null
      : null;

  const mobileFloatTabTarget: MobileFloatTarget | null =
    mobilePanel.activeTab === "text-tools"
      ? "text"
      : mobilePanel.activeTab === "logo-overlay"
        ? "logo"
        : mobilePanel.activeTab === "qr-code"
          ? "qr"
          : mobileAdvancedFloatTarget;

  const mobileFloatToolMode: MobileFloatTarget =
    mobileFloatSelectionTarget ?? mobileFloatTabTarget ?? "text";

  const mobileFloatHasSelection = !!mobileFloatSelectionTarget;

  const closeMobileQrSheet = useCallback(() => {
    setMobileQrSheetOpen(false);
    mobilePanel.setIsPanelVisible(false);
    mobilePanel.setCurrentTranslateY(400);
  }, [mobilePanel]);

  const handleMobileQrEditLink = useCallback(() => {
    setMobileQrSheetOpen(true);
    mobilePanel.setActiveTab("qr-code");
    mobilePanel.setIsPanelVisible(true);
    mobilePanel.setCurrentTranslateY(0);
  }, [mobilePanel]);

  const handleMobileQrGenerate = useCallback(async () => {
    if (mobileQrPlaced && isQrSelected) {
      await qrTools.replaceSelectedQRFromUrl();
      closeMobileQrSheet();
      return;
    }
    if (!qrTools.qrUrl.trim()) return;
    await qrTools.addQRFromUrl();
    setMobileQrPlaced(true);
    closeMobileQrSheet();
  }, [mobileQrPlaced, isQrSelected, qrTools, closeMobileQrSheet]);

  const handleMobileQrFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file || !file.type.startsWith("image/")) return;
      await qrTools.addCustomQR(file);
      setMobileQrPlaced(true);
      closeMobileQrSheet();
    },
    [qrTools, closeMobileQrSheet],
  );

  const handleMobileAddShape = useCallback(
    (type: ShapeType) => {
      shapeTools.addShape(type);
      setMobileFrameEditingActive(false);
      setMobileShapeEditingActive(true);
      mobilePanel.setIsPanelVisible(false);
      mobilePanel.setCurrentTranslateY(400);
    },
    [shapeTools, mobilePanel],
  );

  const handleMobileInsertFrame = useCallback(
    (url: string) => {
      void frameTools.insertFrame(url);
      setMobileShapeEditingActive(false);
      setMobileFrameEditingActive(true);
      mobilePanel.setIsPanelVisible(false);
      mobilePanel.setCurrentTranslateY(400);
    },
    [frameTools, mobilePanel],
  );

  const handleMobileTabClick = useCallback(
    (tabId: string) => {
      setMobileFeedbackOpen(false);
      if (isMobileFloatToolTab(tabId)) {
        if (mobilePanel.activeTab === tabId) {
          mobilePanel.closePanel();
        } else {
          mobilePanel.setActiveTab(tabId);
          mobilePanel.setIsPanelVisible(false);
          mobilePanel.setCurrentTranslateY(400);
        }
        return;
      }
      if (tabId === "qr-code") {
        if (mobilePanel.activeTab === tabId) {
          mobilePanel.closePanel();
          setMobileQrSheetOpen(false);
        } else {
          mobilePanel.setActiveTab(tabId);
          if (mobileQrPlaced) {
            mobilePanel.setIsPanelVisible(false);
            mobilePanel.setCurrentTranslateY(400);
            setMobileQrSheetOpen(false);
          } else {
            mobilePanel.setIsPanelVisible(true);
            mobilePanel.setCurrentTranslateY(0);
            setMobileQrSheetOpen(true);
          }
        }
        return;
      }
      if (tabId === "advanced-options") {
        if (mobilePanel.activeTab === tabId) {
          setMobileShapeEditingActive(false);
          setMobileFrameEditingActive(false);
          mobilePanel.closePanel();
        } else {
          mobilePanel.setActiveTab(tabId);
          mobilePanel.setIsPanelVisible(true);
          mobilePanel.setCurrentTranslateY(0);
        }
        return;
      }
      mobilePanel.handleTabClick(tabId);
    },
    [mobilePanel, mobileQrPlaced],
  );

  useEffect(() => {
    if (!isMobileStudio || !canvasEditor.canvas) return;
    const hasQr = canvasEditor.canvas
      .getObjects()
      .some((obj) => (obj as { isQR?: boolean }).isQR);
    if (hasQr) setMobileQrPlaced(true);
  }, [isMobileStudio, canvasEditor.canvas, history.historyState]);

  useEffect(() => {
    if (!mobileQrEditingMode || !canvasEditor.canvas) return;
    const active = canvasEditor.canvas.getActiveObject();
    if (active) return;
    const qrObject = canvasEditor.canvas
      .getObjects()
      .find((obj) => (obj as { isQR?: boolean }).isQR);
    if (!qrObject) return;
    canvasEditor.canvas.setActiveObject(qrObject);
    canvasEditor.canvas.renderAll();
    selection.setSelectedObject(qrObject);
  }, [mobileQrEditingMode, canvasEditor.canvas, selection.setSelectedObject]);

  const onFontsLoaded = useCallback(() => {
    remeasureTextboxes(canvasRefStable.current);
  }, []);

  const { fontsReady } = useEditorFonts(fontAssets, { onFontsLoaded });

  const googleCatalogByFamily = useMemo(() => {
    const m = new Map<string, GoogleFontCatalogEntry>();
    for (const f of googleFontCatalog) {
      m.set(normalizeFontCatalogKey(f.family), f);
    }
    return m;
  }, [googleFontCatalog]);

  const onDynamicFontSettled = useCallback(() => {
    remeasureTextboxes(canvasRefStable.current);
  }, []);

  useDynamicGoogleFont({
    fontFamily: textTools.fontFamily,
    isBold: textTools.isBold,
    isItalic: textTools.isItalic,
    fontAssets,
    catalogByFamily: googleCatalogByFamily,
    onFontSettled: onDynamicFontSettled,
  });

  // Re-measure textboxes whenever *any* font finishes loading (covers bundled
  // next/font fonts like Manrope that aren't tracked by useEditorFonts).
  useEffect(() => {
    if (typeof document?.fonts?.addEventListener !== "function") return;
    const handler = () => remeasureTextboxes(canvasRefStable.current);
    document.fonts.addEventListener("loadingdone", handler);
    return () => document.fonts.removeEventListener("loadingdone", handler);
  }, []);

  useEffect(() => {
    if (isMobileStudio) {
      setSelectionContextMenuPosition(null);
      return;
    }
    const canvas = canvasEditor.canvas;
    const obj = selection.selectedObject;
    if (!canvas || !obj || (obj as any).isBackground) {
      setSelectionContextMenuPosition(null);
      return;
    }
    const pos = computeMenuPosition(obj, canvas);
    if (pos) setSelectionContextMenuPosition(pos);
  }, [isMobileStudio, canvasEditor.canvas, selection.selectedObject, computeMenuPosition]);

  // Update context menu position while moving the layer so the bar follows the selection
  useEffect(() => {
    if (isMobileStudio) return;
    const canvas = canvasEditor.canvas;
    if (!canvas) return;
    const onMoveOrModify = (e: any) => {
      const obj = e.target;
      if (!obj || (obj as any).isBackground) {
        setSelectionContextMenuPosition(null);
        return;
      }
      const pos = computeMenuPosition(obj, canvas);
      if (pos) setSelectionContextMenuPosition(pos);
    };
    canvas.on("object:moving", onMoveOrModify);
    canvas.on("object:modified", onMoveOrModify);
    return () => {
      canvas.off("object:moving", onMoveOrModify);
      canvas.off("object:modified", onMoveOrModify);
    };
  }, [isMobileStudio, canvasEditor.canvas, computeMenuPosition]);

  // Update stable refs when canvas becomes available (so undo/redo can update the canvas's background URL ref)
  useEffect(() => {
    if (!canvasEditor.canvas) return;
    canvasRefStable.current = canvasEditor.canvas;
    originalImageUrlRefStable.current = canvasEditor.originalImageUrlRef.current;
    originalImageDimensionsRefStable.current = canvasEditor.originalImageDimensions;
    canvasOriginalImageUrlRefRef.current = canvasEditor.originalImageUrlRef;
    if (currentBackgroundUrlRef.current === null && canvasEditor.originalImageUrlRef.current) {
      currentBackgroundUrlRef.current = canvasEditor.originalImageUrlRef.current;
    }
  }, [canvasEditor.canvas, canvasEditor.originalImageUrlRef, canvasEditor.originalImageDimensions]);

  // Restore session overlays once the canvas and background image are ready.
  // originalImageDimensions is set only after the background image finishes loading,
  // making it a reliable reactive trigger.
  const sessionRestoredRef = useRef(false);
  useEffect(() => {
    if (!sessionData || sessionRestoredRef.current) return;
    if (!canvasEditor.canvas || !canvasEditor.originalImageDimensions) return;

    sessionRestoredRef.current = true;

    const overlayJSON = JSON.stringify(sessionData.overlay_json);
    const fakeEntry = {
      overlayJSON,
      metadata: sessionData.metadata,
    };

    (async () => {
      try {
        await history.loadOverlaysFromJSON(canvasEditor.canvas!, overlayJSON);
        history.applyEntryMetadataToCanvas(fakeEntry as any);
        canvasEditor.canvas!.renderAll();
        history.saveState(true);
      } catch (err) {
        console.error("[session-restore] failed:", err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasEditor.canvas, canvasEditor.originalImageDimensions]);

  // Auto-insert text blocks from query param when opening the editor.
  // Per requirement: ignore `text` if a session is being loaded.
  useEffect(() => {
    if (didAutoInsertTextRef.current) return;
    if (!params?.text?.trim()) return;
    if (params.session_id || sessionData?.id) return;
    if (!canvasEditor.canvas || !canvasEditor.originalImageDimensions) return;

    didAutoInsertTextRef.current = true;

    const blocks = parseTextBlocks(params.text, params.text_delim ?? DEFAULT_TEXT_BLOCK_DELIMITER);
    if (blocks.length === 0) return;

    const canvas = canvasEditor.canvas;
    const defaultFontFamily = fontAssets[0]?.font_family || DEFAULT_FONTS.PRIMARY;
    const resolvedFontFamily = getCanvasFontFamily(
      defaultFontFamily,
      DEFAULT_FONTS.PRIMARY,
      BUNDLED_FONT_CSS_VARS,
    );

    // Snapshot current state so user can Undo the insertion.
    history.saveState(true);

    const created = insertAutoTextBlocks(canvas, blocks, {
      initialFontSize: TEXT_DEFAULTS.FONT_SIZE,
      minFontSize: 12,
      textAlign: "center",
      textboxOptions: {
        fontFamily: resolvedFontFamily,
        fill: rgbaToString(TEXT_DEFAULTS.COLOR),
        backgroundColor: rgbaToString(TEXT_DEFAULTS.BG_COLOR),
        lineHeight: TEXT_DEFAULTS.LINE_HEIGHT,
        charSpacing: TEXT_DEFAULTS.LETTER_SPACING,
        editable: true,
        selectable: true,
      },
    });

    if (created.length > 0) {
      canvas.setActiveObject(created[0]);
      canvas.renderAll();
      // Stabilize dimensions if fonts are still loading.
      remeasureTextboxes(canvas);
      history.saveState(true);
    }
  }, [
    params.text,
    params.text_delim,
    params.session_id,
    sessionData?.id,
    canvasEditor.canvas,
    canvasEditor.originalImageDimensions,
    fontAssets,
    history.saveState,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleViewportChange = () => {
      setIsCompactChrome(window.innerWidth < STUDIO_LAYOUT.COMPACT_BREAKPOINT);
      if (window.innerWidth < 768) {
        setDesktopTool(null);
      }
    };
    handleViewportChange();
    window.addEventListener("resize", handleViewportChange);
    return () => window.removeEventListener("resize", handleViewportChange);
  }, []);

  useEffect(() => {
    if (!showSaveToast) return;
    const timer = window.setTimeout(() => setShowSaveToast(false), 6000);
    return () => window.clearTimeout(timer);
  }, [showSaveToast]);

  // Update text on style change
  useEffect(() => {
    if (!canvasEditor.canvas || !selection.selectedObject || selection.selectedObject.type !== "textbox") return;
    textTools.updateSelectedText();
    history.saveState(false);
  }, [
    textTools.fontSize,
    textTools.fontFamily,
    textTools.textColor,
    textTools.backgroundColor,
    textTools.isBold,
    textTools.isItalic,
    textTools.isUnderline,
    textTools.lineHeight,
    textTools.letterSpacing,
    textTools.textAlign,
  ]);

  // Update shape on style change — skip when the change came from a selection sync
  useEffect(() => {
    if (shapeSyncingRef.current) return;
    if (!canvasEditor.canvas || !selection.selectedObject) return;
    if (!shapeTools.isShapeSelected(selection.selectedObject)) return;

    shapeTools.updateSelectedShape();
    history.saveState(false);
  }, [
    shapeTools.shapeFillColor,
    shapeTools.shapeStrokeColor,
    shapeTools.shapeStrokeWidth,
    shapeTools.shapeOpacity,
  ]);

  // Update QR on size/opacity change
  useEffect(() => {
    if (!canvasEditor.canvas) return;
    qrTools.updateQRCode();
    history.saveState(false);
  }, [qrTools.qrSize, qrTools.qrOpacity]);

  // Update logo on size/opacity change
  useEffect(() => {
    if (!canvasEditor.canvas) return;
    logoTools.updateLogo();
    history.saveState(false);
  }, [logoTools.logoSize, logoTools.logoOpacity]);

  // Update frame on opacity change
  useEffect(() => {
    if (!canvasEditor.canvas) return;
    frameTools.updateFrame();
    history.saveState(false);
  }, [frameTools.frameOpacity]);

  // Sync frame panel (opacity) when user selects a frame overlay
  useEffect(() => {
    const obj = selection.selectedObject;
    if (!obj || !(obj as any).isFrame) return;
    const frameObj = obj as any;
    const op = frameObj.opacity;
    if (typeof op === "number") frameTools.setFrameOpacity(Math.round(op * 100));
  }, [selection.selectedObject]);

  // Sync logo panel (size/opacity) when user selects a different logo overlay
  useEffect(() => {
    const obj = selection.selectedObject;
    if (!obj || !(obj as any).isLogo) return;
    const logoObj = obj as any;
    const w = logoObj.getScaledWidth?.() ?? 0;
    const h = logoObj.getScaledHeight?.() ?? 0;
    const maxDim = Math.max(w, h);
    if (maxDim > 0) logoTools.setLogoSize(Math.round(maxDim));
    const op = logoObj.opacity;
    if (typeof op === "number") logoTools.setLogoOpacity(Math.round(op * 100));
  }, [selection.selectedObject]);

  // Sync QR panel (size/opacity) when user selects a different QR overlay
  useEffect(() => {
    const obj = selection.selectedObject;
    if (!obj || !(obj as any).isQR) return;
    const qrObj = obj as any;
    const w = qrObj.getScaledWidth?.() ?? 0;
    const h = qrObj.getScaledHeight?.() ?? 0;
    const maxDim = Math.max(w, h);
    if (maxDim > 0) qrTools.setQrSize(Math.round(maxDim));
    const op = qrObj.opacity;
    if (typeof op === "number") qrTools.setQrOpacity(Math.round(op * 100));
  }, [selection.selectedObject]);

  // Handle image upload
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setUploadedImageUrl(url);
      setPreprocessedImageUrl(null);
      setIsPreprocessingImage(false);
      setShowUploadPrompt(false);
    }
    event.target.value = "";
  };

  // Replace background image (from URL or file object URL)
  const handleReplaceBackground = useCallback(
    async (newUrl: string) => {
      if (!canvasEditor.replaceBackgroundImage) return;
      setIsReplacingBackground(true);
      try {
        const cleanedUrl = await preprocessImageUrl(newUrl);
        originalImageUrlRefStable.current = cleanedUrl;
        setPreprocessedImageUrl(cleanedUrl);
        await canvasEditor.replaceBackgroundImage(cleanedUrl);
        history.saveState(true);
        studioToast.success({
          title: "Background updated",
          description: "The background image has been replaced.",
        });
      } catch {
        studioToast.error({
          title: "Error",
          description: "Could not load the image.",
        });
      } finally {
        setIsReplacingBackground(false);
      }
    },
    [canvasEditor.replaceBackgroundImage, history.saveState, preprocessImageUrl]
  );

  const handleReplaceBackgroundFromFile = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file && file.type.startsWith("image/")) {
        const url = URL.createObjectURL(file);
        handleReplaceBackground(url);
      }
      event.target.value = "";
    },
    [handleReplaceBackground]
  );

  // Select layer from Layers panel (sync canvas active object and selection state)
  // Declared here so hooks order is stable; only render path changes below.
  const handleSelectLayer = useCallback(
    (obj: any) => {
      const c = canvasRefStable.current;
      if (!c) return;
      c.setActiveObject(obj);
      c.renderAll();
      selection.setSelectedObject(obj);
    },
    [selection.setSelectedObject]
  );

  // Handle export click
  const handleExportClick = () => {
    if (!FEATURE_FLAGS.enableExportDisclaimer) {
      // Disclaimer temporarily disabled — export directly with defaults, skip the modal.
      void exportImage({
        position: disclaimerPosition,
        format: EXPORT.DEFAULT_FORMAT,
        filename: EXPORT.DEFAULT_FILENAME_BASE,
      });
      return;
    }
    setShowDisclaimerModal(true);
  };

  // Detect if editor is running inside an iframe (embedded in ChangeAgent/Open WebUI)
  const isEmbedded = true;// typeof window !== "undefined" && typeof window.self !== "undefined" && window.self !== window.top;

  // Debug helper: enable with `?debugPostMessage=1`
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const debugPostMessage =
      (sp.get("debugPostMessage") ?? "").toLowerCase() === "1" ||
      (sp.get("debugPostMessage") ?? "").toLowerCase() === "true";
    // if (!debugPostMessage) return;

    const info = {
      href: window.location.href,
      isEmbedded: window.self !== window.top,
      hasParent: !!window.parent,
      hasTop: !!window.top,
      referrer: document.referrer,
      origin: window.location.origin,
    };

    console.log("[embed] postMessage debug enabled", info);

    const onMessage = (event: MessageEvent) => {
      // Keep this intentionally permissive for debugging; don't rely on it for security.
      console.log("[embed] received message", {
        origin: event.origin,
        data: event.data,
      });
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // Export current canvas, upload it, send only URL to chat, then signal parent to close Studio.
  const handleSendUrlToChatAndClose = async () => {
    if (!isEmbedded || !canvasEditor.canvas || !canvasEditor.originalImageDimensions) return;

    try {
      setIsSendingUrlToChat(true);

      const caUserId = params.user_id?.trim();

      const currentWidth = canvasEditor.canvas.width;
      const multiplier =
        currentWidth > 0
          ? canvasEditor.originalImageDimensions.width / currentWidth
          : 1;

      const dataURL = canvasEditor.canvas.toDataURL({
        format: "jpeg",
        quality: 1,
        multiplier,
      } as Parameters<typeof canvasEditor.canvas.toDataURL>[0]);

      if (!dataURL || !caUserId) {
        studioToast.error({
          title: "Could not export image",
          description: "Try again before sending it to the conversation.",
        });
        return;
      }

      const uploadResponse = await fetch("/api/studio/upload-edited-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_base64: dataURL,
          ca_user_id: caUserId,
        }),
      });

      const uploadJson = await uploadResponse.json().catch(() => null);
      const imageUrl = uploadJson?.image_url ? String(uploadJson.image_url) : "";

      if (!uploadResponse.ok || !imageUrl) {
        console.error("Failed to upload edited image for URL send:", uploadJson);
        studioToast.error({
          title: "Could not upload image",
          description: uploadJson?.error ?? "Try again before sending it to the conversation.",
        });
        return;
      }

      sendToChat(imageUrl);
      console.log("Sent to chat:", imageUrl);
      // Exit full screen so the user can see the image landed in the conversation —
      // same action as the host's "Cerrar" (Exit full screen) button.
      requestExitFullscreen();

      studioToast.success({
        title: "Sent to conversation",
        description: "Posted the image URL to the conversation.",
      });
    } catch (error) {
      console.error("Failed to send image URL to chat:", error);
      studioToast.error({
        title: "Error sending to chat",
        description: "Something went wrong sending the URL back to the conversation.",
      });
    } finally {
      setIsSendingUrlToChat(false);
    }
  };

  // Normalize export filename: strip extension, sanitize, then add extension for format
  const getExportFilename = (filename: string, format: ExportConfig["format"]): string => {
    const invalidChars = /[/\\:*?"<>|]/g;
    const base = filename.replace(/\.[^.]+$/, "").trim().replace(invalidChars, "") || EXPORT.DEFAULT_FILENAME_BASE;
    const ext = format === "jpeg" ? ".jpeg" : format === "webp" ? ".webp" : ".png";
    return base + ext;
  };

  // Export image with disclaimer
  const exportImage = async (config: ExportConfig) => {
    if (!canvasEditor.canvas || !canvasEditor.originalImageDimensions) return;
    setIsExporting(true);
    setShowDisclaimerModal(false);

    const { position, format, filename } = config;
    let disclaimerGroup: Group | null = null;
    try {
      // Add temporary disclaimer before export
      if (FEATURE_FLAGS.enableExportDisclaimer) {
        const margin = Math.max(
          EXPORT.DISCLAIMER_MIN_MARGIN,
          Math.round(canvasEditor.canvas.width * EXPORT.DISCLAIMER_MARGIN_MULTIPLIER)
        );
        const padding = Math.max(
          EXPORT.DISCLAIMER_MIN_PADDING,
          Math.round(canvasEditor.canvas.width * EXPORT.DISCLAIMER_PADDING_MULTIPLIER)
        );
        const lineGap = Math.max(
          EXPORT.DISCLAIMER_MIN_LINE_GAP,
          Math.round(canvasEditor.canvas.width * EXPORT.DISCLAIMER_LINE_GAP_MULTIPLIER)
        );
        const fontSize = EXPORT.DISCLAIMER_FONT_SIZE;

        const textFill = EXPORT.DISCLAIMER_TEXT_COLOR;
        const textShadow = new Shadow({
          color: EXPORT.DISCLAIMER_SHADOW_COLOR,
          blur: 2,
          offsetX: 1,
          offsetY: 1,
        });

        const line1 = new Text(EXPORT.DISCLAIMER_TEXT_1, {
          left: padding,
          top: padding,
          fontSize,
          fontFamily: DEFAULT_FONTS.SECONDARY,
          fill: textFill,
          shadow: textShadow,
          selectable: false,
          evented: false,
        });

        const line2Prefix = new Text(EXPORT.DISCLAIMER_TEXT_2_PREFIX, {
          left: padding,
          top: padding + (line1.height ?? fontSize) + lineGap,
          fontSize,
          fontFamily: DEFAULT_FONTS.SECONDARY,
          fill: textFill,
          shadow: textShadow,
          selectable: false,
          evented: false,
        });

        const line2Brand = new Text(EXPORT.DISCLAIMER_TEXT_2_BRAND, {
          left: padding + (line2Prefix.width ?? 0),
          top: padding + (line1.height ?? fontSize) + lineGap,
          fontSize,
          fontFamily: DEFAULT_FONTS.SECONDARY,
          fill: textFill,
          shadow: textShadow,
          underline: true,
          selectable: false,
          evented: false,
        });

        const contentWidth = Math.max(
          line1.width ?? 0,
          (line2Prefix.width ?? 0) + (line2Brand.width ?? 0)
        );
        const line2Height = Math.max(
          line2Prefix.height ?? fontSize,
          line2Brand.height ?? fontSize
        );
        const contentHeight = (line1.height ?? fontSize) + lineGap + line2Height;

        const bg = new Rect({
          left: 0,
          top: 0,
          width: contentWidth + padding * 2,
          height: contentHeight + padding * 2,
          fill: EXPORT.DISCLAIMER_BG_COLOR,
          opacity: EXPORT.DISCLAIMER_BG_OPACITY,
          selectable: false,
          evented: false,
        });

        // Calculate position based on selected option
        let groupLeft = 0;
        let groupTop = 0;

        switch (position) {
          case "top-right":
            groupLeft = canvasEditor.canvas.width - margin - (bg.width ?? 0);
            groupTop = margin;
            break;
          case "top-left":
            groupLeft = margin;
            groupTop = margin;
            break;
          case "bottom-left":
            groupLeft = margin;
            groupTop = canvasEditor.canvas.height - margin - (bg.height ?? 0);
            break;
          case "bottom-right":
          default:
            groupLeft = canvasEditor.canvas.width - margin - (bg.width ?? 0);
            groupTop = canvasEditor.canvas.height - margin - (bg.height ?? 0);
            break;
        }

        disclaimerGroup = new Group([bg, line1, line2Prefix, line2Brand], {
          left: groupLeft,
          top: groupTop,
          selectable: false,
          evented: false,
        });
        canvasEditor.canvas.add(disclaimerGroup);
        canvasEditor.canvas.renderAll();
      }

      const currentWidth = canvasEditor.canvas.width;
      const multiplier = canvasEditor.originalImageDimensions.width / currentWidth;

      const dataURL = canvasEditor.canvas.toDataURL({
        format: format as "png" | "jpeg" | "webp",
        quality: format === "png" ? 1 : EXPORT.DEFAULT_QUALITY,
        multiplier: multiplier,
      } as Parameters<typeof canvasEditor.canvas.toDataURL>[0]);

      const link = document.createElement("a");
      link.download = getExportFilename(filename, format);
      link.href = dataURL;
      link.click();
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      if (disclaimerGroup && canvasEditor.canvas) {
        canvasEditor.canvas.remove(disclaimerGroup);
        canvasEditor.canvas.renderAll();
      }
    }

    setIsExporting(false);
  };

  // Get objects from current selection (single object or ActiveSelection)
  const getSelectedObjects = useCallback(() => {
    const canvas = canvasEditor.canvas;
    if (!canvas) return [];
    const active = canvas.getActiveObject();
    if (!active) return [];
    if ((active as any).type === "activeselection" && typeof (active as any).getObjects === "function") {
      return (active as any).getObjects().filter((o: any) => !o.isBackground);
    }
    if ((active as any).isBackground) return [];
    return [active];
  }, [canvasEditor.canvas]);

  // Delete selected object(s)
  const deleteSelected = () => {
    const canvas = canvasEditor.canvas;
    const objects = getSelectedObjects();
    if (!canvas || objects.length === 0) return;
    objects.forEach((obj: any) => canvas.remove(obj));
    canvas.discardActiveObject();
    canvas.renderAll();
    selection.setSelectedObject(null);
    history.saveState(true);
  };

  // Duplicate selected object(s) (offset so visible)
  const duplicateSelected = useCallback(async () => {
    const canvas = canvasEditor.canvas;
    const objects = getSelectedObjects();
    if (!canvas || objects.length === 0) return;
    try {
      if (objects.length === 1) {
        const obj = objects[0];
        const clone = await (obj as any).clone();
        const left = (obj.left ?? 0) + 20;
        const top = (obj.top ?? 0) + 20;
        clone.set({ left, top });
        clone.setCoords();
        constrainObjectToCanvas(clone, canvas);
        canvas.add(clone);
        canvas.setActiveObject(clone);
        canvas.renderAll();
        selection.setSelectedObject(clone);
      } else {
        const clones: any[] = [];
        const offset = 20;
        for (const obj of objects as any[]) {
          const clone = await (obj as any).clone();
          clone.set({
            left: (obj.left ?? 0) + offset,
            top: (obj.top ?? 0) + offset,
          });
          clone.setCoords();
          constrainObjectToCanvas(clone, canvas);
          canvas.add(clone);
          clones.push(clone);
        }
        const newSelection = new ActiveSelection(clones, { canvas });
        canvas.setActiveObject(newSelection);
        canvas.renderAll();
        selection.setSelectedObject(newSelection);
      }
      history.saveState(true);
    } catch (err) {
      console.error("[duplicateSelected]", err);
    }
  }, [canvasEditor.canvas, getSelectedObjects, selection.setSelectedObject, history.saveState]);

  // Lock/unlock selected object(s) — mirrors LayersPanel.handleLockToggle logic
  const toggleLockSelected = useCallback(() => {
    const canvas = canvasEditor.canvas;
    const objects = getSelectedObjects();
    if (!canvas || objects.length === 0) return;

    for (const obj of objects) {
      const locked =
        (obj as any).__layerLocked === true ||
        !!(obj.lockMovementX && obj.lockMovementY) ||
        obj.selectable === false ||
        obj.evented === false;
      const nextLocked = !locked;
      (obj as any).__layerLocked = nextLocked;

      if (nextLocked) {
        if (obj.hiddenTextarea && typeof obj.hiddenTextarea.blur === "function") {
          obj.hiddenTextarea.blur();
        }
        if (obj.isEditing && typeof obj.exitEditing === "function") {
          obj.exitEditing();
        }
      }

      const lockProps: Record<string, boolean> = {
        lockMovementX: nextLocked,
        lockMovementY: nextLocked,
        hasControls: !nextLocked,
        hasBorders: !nextLocked,
        selectable: !nextLocked,
        evented: !nextLocked,
      };
      if (obj.type === "textbox" || (obj as any).type === "i-text") {
        lockProps.editable = !nextLocked;
      }
      obj.set(lockProps);
    }

    canvas.discardActiveObject();
    canvas.renderAll();
    selection.setSelectedObject(null);
    history.saveState(true);
  }, [canvasEditor.canvas, getSelectedObjects, selection.setSelectedObject, history.saveState]);

  // Save canvas session to database (optionalName from SaveSessionModal when saving via modal)
  const handleSave = async (optionalName?: string) => {
    if (!canvasEditor.canvas || !imageUrl) return;
    setIsSaving(true);

    try {
      const currentEntry = history.historyState.entries[history.historyState.currentIndex];
      const overlayJson = currentEntry
        ? JSON.parse(currentEntry.overlayJSON)
        : { version: "5.3.0", objects: [] };

      const metadataToSave = currentEntry ? currentEntry.metadata : {};

      const caUserId = params.user_id ?? "";
      const backgroundUrlForSave = currentBackgroundUrlRef.current ?? imageUrl;

      const body: Record<string, unknown> = {
        ca_user_id: caUserId,
        background_url: backgroundUrlForSave,
        overlay_json: overlayJson,
        metadata: metadataToSave,
      };
      if (sessionId) body.session_id = sessionId;
      const nameTrimmed = optionalName?.trim();
      if (nameTrimmed) body.name = nameTrimmed;

      const res = await fetch("/api/studio/canvas-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        studioToast.error({
          title: "Save failed",
          description: data.error ?? "Could not save the session.",
        });
        return;
      }

      const newSessionId: string = data.id;
      setSessionId(newSessionId);

      // Update URL with session_id so the user can reload and resume
      const url = new URL(window.location.href);
      url.searchParams.set("session_id", newSessionId);
      window.history.replaceState({}, "", url.toString());

      setShowSaveToast(true);
      setShowSaveModal(false);

      // Upload thumbnail to Supabase Storage in the background (non-blocking)
      const caUserIdForThumb = params.user_id ?? "";
      const currentWidth = canvasEditor.canvas.width;
      const thumbMultiplier = Math.min(1, 300 / currentWidth);
      const thumbnailBase64 = canvasEditor.canvas.toDataURL({
        format: "jpeg",
        quality: 0.6,
        multiplier: thumbMultiplier,
      });
      fetch("/api/studio/canvas-sessions/thumbnail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: newSessionId,
          ca_user_id: caUserIdForThumb,
          image_base64: thumbnailBase64,
        }),
      }).catch((err) => {
        console.warn("[handleSave] thumbnail upload failed (non-critical):", err);
      });

      // Refresh saved versions list after successful save
      const bgUrl = currentBackgroundUrlRef.current ?? imageUrl;
      if (caUserIdForThumb && bgUrl) {
        try {
          const listRes = await fetch(
            `/api/studio/canvas-sessions?ca_user_id=${encodeURIComponent(caUserIdForThumb)}&background_url=${encodeURIComponent(bgUrl)}`
          );
          const listData = await listRes.json();
          if (listRes.ok && Array.isArray(listData.sessions)) {
            setSessionsForImage(
              listData.sessions.map((s: { id: string; name: string | null; thumbnail_url: string | null; created_at: string; updated_at: string }) => ({
                id: s.id,
                name: s.name,
                thumbnail_url: s.thumbnail_url,
                created_at: s.created_at,
                updated_at: s.updated_at,
              }))
            );
          }
        } catch {
          // non-blocking
        }
      }
    } catch (err) {
      console.error("[handleSave] error:", err);
      studioToast.error({
        title: "Save failed",
        description: "An unexpected error occurred.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Fetch sessions for current image (saved versions panel)
  const fetchSessionsForImage = useCallback(async () => {
    const caUserId = params.user_id?.trim();
    const bgUrl = currentBackgroundUrlRef.current ?? imageUrl;
    if (!caUserId || !bgUrl) {
      setSessionsForImage([]);
      setSessionsInitialFetchDone(true);
      return;
    }
    setSessionsLoading(true);
    try {
      const res = await fetch(
        `/api/studio/canvas-sessions?ca_user_id=${encodeURIComponent(caUserId)}&background_url=${encodeURIComponent(bgUrl)}`
      );
      const data = await res.json();
      if (res.ok && Array.isArray(data.sessions)) {
        setSessionsForImage(
          data.sessions.map((s: { id: string; name: string | null; thumbnail_url: string | null; created_at: string; updated_at: string }) => ({
            id: s.id,
            name: s.name,
            thumbnail_url: s.thumbnail_url,
            created_at: s.created_at,
            updated_at: s.updated_at,
          }))
        );
      } else {
        setSessionsForImage([]);
      }
    } catch {
      setSessionsForImage([]);
    } finally {
      setSessionsLoading(false);
      setSessionsInitialFetchDone(true);
    }
  }, [params.user_id, imageUrl]);

  useEffect(() => {
    fetchSessionsForImage();
  }, [fetchSessionsForImage]);

  // When there is no user or no image, we don't fetch sessions; mark as done so we don't block editor ready.
  useEffect(() => {
    if (!params.user_id?.trim() || !imageUrl) {
      setSessionsInitialFetchDone(true);
    }
  }, [params.user_id, imageUrl]);

  // Load a saved session into the canvas (from Saved versions panel)
  const handleSelectSession = useCallback(
    async (sessionIdToLoad: string) => {
      const canvas = canvasEditor.canvas;
      if (!canvas) return;
      try {
        const res = await fetch(`/api/studio/canvas-sessions/${sessionIdToLoad}`);
        const session = await res.json();
        if (!res.ok || session.error) {
          studioToast.error({
            title: "Could not load session",
            description: session.error ?? "Session not found.",
          });
          return;
        }
        const overlayJSON = JSON.stringify(session.overlay_json ?? { version: "5.3.0", objects: [] });
        const objects = canvas.getObjects();
        for (let i = objects.length - 1; i >= 1; i--) {
          canvas.remove(objects[i]);
        }
        await history.loadOverlaysFromJSON(canvas, overlayJSON);
        history.applyEntryMetadataToCanvas({
          overlayJSON,
          metadata: session.metadata ?? {},
        } as any);
        canvas.discardActiveObject();
        canvas.renderAll();
        history.saveState(true);
        setSessionId(sessionIdToLoad);
        selection.setSelectedObject(null);
        const url = new URL(window.location.href);
        url.searchParams.set("session_id", sessionIdToLoad);
        window.history.replaceState({}, "", url.toString());
      } catch (err) {
        console.error("[handleSelectSession]", err);
        studioToast.error({
          title: "Could not load session",
          description: "An unexpected error occurred.",
        });
      }
    },
    [canvasEditor.canvas, history, selection.setSelectedObject]
  );

  // Edit background with AI
  const handleAIEdit = useCallback(
    async (prompt: string, includeLayers?: boolean) => {
      if (!canvasEditor.canvas || !canvasEditor.replaceBackgroundImage) return;
      const payload = includeLayers
        ? getFullCanvasImageForEdit(canvasEditor.canvas)
        : getCurrentBackgroundImageForEdit(canvasEditor.canvas);
      if (!payload || (!payload.imageUrls?.length && !payload.base64Images?.length)) {
        studioToast.error({
          title: "Edit failed",
          description: "Could not get the current image to edit.",
        });
        return;
      }
      setIsEditingWithAI(true);
      try {
        const result = await editImage({
          prompt,
          ...payload,
          orgType: params.client_id ?? params.user_id ?? "",
          clientInfo: {
            client_id: params.client_id ?? params.user_id ?? "",
            user_id: params.user_id ?? "",
            user_email: params.user_email ?? "",
          },
        });
        if (!result.success || !result.images?.length) {
          const errMsg = !result.success
            ? [
              result.error,
              typeof result.details === "string"
                ? result.details.replace(/^BFL:\s*/i, "")
                : result.details,
            ]
              .filter(Boolean)
              .join(" — ")
            : "No image returned.";
          studioToast.error({
            title: "Edit failed",
            description: errMsg ?? "No image returned.",
          });
          return;
        }
        const editedUrl = result.images[0].url;
        await canvasEditor.replaceBackgroundImage(editedUrl);
        if (includeLayers) {
          const objects = canvasEditor.canvas.getObjects();
          for (let i = objects.length - 1; i >= 1; i--) {
            canvasEditor.canvas.remove(objects[i]);
          }
          canvasEditor.canvas.renderAll();
        }
        // Sync stable ref so saveState captures the edited URL (useEffect runs after render)
        originalImageUrlRefStable.current = editedUrl;
        history.saveState(true);
        studioToast.success({
          title: "Image updated",
          description: includeLayers
            ? "The image has been edited. Canvas now shows the result."
            : "The background has been edited. Overlays are preserved.",
        });
      } catch (err) {
        console.error("[handleAIEdit] error:", err);
        studioToast.error({
          title: "Edit failed",
          description: err instanceof Error ? err.message : "An unexpected error occurred.",
        });
      } finally {
        setIsEditingWithAI(false);
      }
    },
    [
      canvasEditor.canvas,
      canvasEditor.replaceBackgroundImage,
      history.saveState,
      params.client_id,
      params.user_id,
      params.user_email,
    ]
  );

  // Get AI feedback on the current canvas
  const handleGetFeedback = async () => {
    if (!canvasEditor.canvas) return;
    setIsFetchingFeedback(true);
    setFeedbackText(null);
    setFeedbackIssues([]);
    setFeedbackEditPlan(null);

    try {
      const imageBase64 = canvasEditor.canvas.toDataURL({
        format: "jpeg",
        quality: 0.8,
        multiplier: 1,
      });

      const res = await fetch("/api/studio/image-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_base64: imageBase64 }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        studioToast.error({
          title: "Feedback failed",
          description: data.error ?? "Could not get feedback.",
        });
        return;
      }

      setFeedbackText(typeof data.feedback === "string" ? data.feedback : null);
      setFeedbackIssues(Array.isArray(data.issues) ? data.issues : []);
      // Do not surface model/tool identifiers in the UI.
      setFeedbackEditPlan(data.edit_plan?.prompt ? { prompt: data.edit_plan.prompt } : null);
    } catch (err) {
      console.error("[handleGetFeedback] error:", err);
      studioToast.error({
        title: "Feedback failed",
        description: "An unexpected error occurred.",
      });
    } finally {
      setIsFetchingFeedback(false);
    }
  };

  const handleMobileFeedbackPress = useCallback(() => {
    if (mobileFeedbackOpen) {
      setMobileFeedbackOpen(false);
      return;
    }
    mobilePanel.closePanel();
    setMobileFeedbackOpen(true);
    if (!feedbackText && !isFetchingFeedback) {
      void handleGetFeedback();
    }
  }, [mobilePanel, mobileFeedbackOpen, feedbackText, isFetchingFeedback, handleGetFeedback]);

  const closeMobileFeedbackSheet = useCallback(() => {
    setMobileFeedbackOpen(false);
  }, []);

  const handleApplyCleanup = async () => {
    if (!canvasEditor.canvas) return;
    if (!canvasEditor.replaceBackgroundImage) return;
    if (isApplyingCleanup) return;

    setIsApplyingCleanup(true);

    try {
      // Snapshot current state so user can Undo the cleanup.
      history.saveState(true);

      const imageBase64 = canvasEditor.canvas.toDataURL({
        format: "jpeg",
        quality: 0.9,
        multiplier: 1,
      });

      const res = await fetch("/api/studio/review-and-cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_base64: imageBase64,
          // keep it simple: backend reviews + applies; we don't force goal here yet
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        studioToast.error({
          title: "Cleanup failed",
          description: data.details ?? data.error ?? "Could not apply cleanup.",
        });
        return;
      }

      const improved = data.image as string | null | undefined;
      if (!improved || typeof improved !== "string") {
        studioToast.error({
          title: "Cleanup failed",
          description: "No image returned from the cleanup endpoint.",
        });
        return;
      }

      // Replace the background with the improved (flattened) image and remove overlays to avoid duplication.
      const canvas = canvasEditor.canvas;
      canvas.discardActiveObject();
      // Keep the background object in place — replaceBackgroundImage expects it.
      const objs = canvas.getObjects().slice();
      for (const obj of objs) {
        const isBg = Boolean((obj as any)?.isBackground);
        if (!isBg) canvas.remove(obj);
      }
      selection.setSelectedObject(null);

      await canvasEditor.replaceBackgroundImage(improved);
      canvas.renderAll();
      // Sync stable ref so the post-cleanup history entry stores the new background URL.
      originalImageUrlRefStable.current = improved;
      history.saveState(true, true);

      // Update feedback panel with the applied plan, so the user sees what happened.
      if (typeof data.feedback === "string") setFeedbackText(data.feedback);
      if (Array.isArray(data.issues)) setFeedbackIssues(data.issues);
      if (data.applied_plan?.prompt) setFeedbackEditPlan({ prompt: data.applied_plan.prompt });

      studioToast.success({
        title: "Cleanup applied",
        description: "Canvas updated with the improved image.",
      });
    } catch (err) {
      console.error("[handleApplyCleanup] error:", err);
      studioToast.error({
        title: "Cleanup failed",
        description: err instanceof Error ? err.message : "An unexpected error occurred.",
      });
    } finally {
      setIsApplyingCleanup(false);
    }
  };

  // Render panels with memoization (all hooks must run every render; conditional return is at the end)
  const layersToolsPanel = useMemo(
    () =>
      FEATURE_FLAGS.showLayersPanel && canvasEditor.canvas ? (
        <LayersPanel
          canvasRef={canvasRefStable}
          selectedObject={selection.selectedObject}
          onSelectLayer={handleSelectLayer}
          onSaveState={history.saveState}
        />
      ) : null,
    [
      canvasEditor.canvas,
      selection.selectedObject,
      handleSelectLayer,
      history.saveState,
    ]
  );

  const textToolsPanel = useMemo(
    () => (
      <TextToolsPanel
        selectedObject={selection.selectedObject}
        fontAssets={fontAssets}
        googleCatalogFonts={googleFontCatalog}
        googleCatalogLoading={googleCatalogLoading}
        googleCatalogError={googleCatalogError}
        fontsReady={fontsReady}
        addText={textTools.addText}
        fontSize={textTools.fontSize}
        setFontSize={textTools.setFontSize}
        fontFamily={textTools.fontFamily}
        setFontFamily={textTools.setFontFamily}
        isBold={textTools.isBold}
        setIsBold={textTools.setIsBold}
        isItalic={textTools.isItalic}
        setIsItalic={textTools.setIsItalic}
        isUnderline={textTools.isUnderline}
        setIsUnderline={textTools.setIsUnderline}
        lineHeight={textTools.lineHeight}
        setLineHeight={textTools.setLineHeight}
        letterSpacing={textTools.letterSpacing}
        setLetterSpacing={textTools.setLetterSpacing}
        textAlign={textTools.textAlign}
        setTextAlign={textTools.setTextAlign}
        textColor={textTools.textColor}
        setTextColor={textTools.setTextColor}
        backgroundColor={textTools.backgroundColor}
        setBackgroundColor={textTools.setBackgroundColor}
        eyedropperTarget={eyedropper.activeTarget}
        onStartEyedropper={eyedropper.startEyedropper}
      />
    ),
    [selection.selectedObject, fontAssets, fontsReady, googleFontCatalog, googleCatalogLoading, googleCatalogError, textTools, eyedropper.activeTarget, eyedropper.startEyedropper]
  );

  const aiEditPanel = useMemo(
    () => (
      <AIEditPanel
        onEdit={handleAIEdit}
        isLoading={isEditingWithAI}
      />
    ),
    [handleAIEdit, isEditingWithAI]
  );

  const backgroundImagePanel = useMemo(
    () => (
      <BackgroundImagePanel
        onReplaceFromUrl={handleReplaceBackground}
        onReplaceFromFile={handleReplaceBackgroundFromFile}
        isLoading={isReplacingBackground}
      />
    ),
    [handleReplaceBackground, handleReplaceBackgroundFromFile, isReplacingBackground]
  );

  const isLogoSelected =
    !!selection.selectedObject && !!(selection.selectedObject as any).isLogo;

  const selectedLogoUrl =
    isLogoSelected && (selection.selectedObject as { logoAssetUrl?: string }).logoAssetUrl
      ? (selection.selectedObject as { logoAssetUrl?: string }).logoAssetUrl!
      : null;

  const logoToolsPanel = useMemo(
    () => (
      <LogoToolsPanel
        logoStyle={logoTools.logoStyle}
        setLogoStyle={logoTools.setLogoStyle}
        selectedVariant={logoTools.selectedVariant}
        setSelectedVariant={logoTools.setSelectedVariant}
        availableVariants={logoTools.availableVariants}
        filteredLogoAssets={logoTools.filteredLogoAssets}
        logoSize={logoTools.logoSize}
        setLogoSize={logoTools.setLogoSize}
        logoOpacity={logoTools.logoOpacity}
        setLogoOpacity={logoTools.setLogoOpacity}
        handleInsertDefaultLogo={logoTools.handleInsertDefaultLogo}
        handleLogoFileUpload={logoTools.handleLogoFileUpload}
        isLogoSelected={isLogoSelected}
        allowCustomLogo={allowCustomLogo}
      />
    ),
    [logoTools, isLogoSelected, allowCustomLogo]
  );

  const qrToolsPanel = useMemo(
    () => (
      <QrToolsPanel
        qrUrl={qrTools.qrUrl}
        setQrUrl={qrTools.setQrUrl}
        addQRFromUrl={qrTools.addQRFromUrl}
        handleQRFileUpload={qrTools.handleQRFileUpload}
        qrSize={qrTools.qrSize}
        setQrSize={qrTools.setQrSize}
        qrOpacity={qrTools.qrOpacity}
        setQrOpacity={qrTools.setQrOpacity}
        isQrSelected={isQrSelected}
      />
    ),
    [qrTools, isQrSelected]
  );

  const isFrameSelected =
    !!selection.selectedObject && !!(selection.selectedObject as any).isFrame;

  const selectedFrameUrl =
    isFrameSelected && (selection.selectedObject as { frameAssetUrl?: string }).frameAssetUrl
      ? (selection.selectedObject as { frameAssetUrl?: string }).frameAssetUrl!
      : null;

  const frameToolsPanel = useMemo(
    () => (
      <FrameToolsPanel
        frameAssets={frameTools.frameAssets}
        aspectRatio={canvasEditor.aspectRatio}
        frameOpacity={frameTools.frameOpacity}
        setFrameOpacity={frameTools.setFrameOpacity}
        insertFrame={frameTools.insertFrame}
        isFrameSelected={isFrameSelected}
      />
    ),
    [frameTools, canvasEditor.aspectRatio, isFrameSelected]
  );

  const guidesAndGridPanel = useMemo(
    () =>
      FEATURE_FLAGS.showGuidesAndGrid ? (
        <GuidesAndGridPanel
          showGrid={showGrid}
          onShowGridChange={setShowGrid}
        />
      ) : null,
    [
      showGrid,
    ]
  );

  const isShapeSelected = shapeTools.isShapeSelected(selection.selectedObject);

  const handleAlign = useCallback(
    (option: Parameters<typeof alignmentTools.runAlign>[0]) => {
      alignmentTools.runAlign(option);
      history.saveState(true);
    },
    [alignmentTools.runAlign, history.saveState],
  );

  const sessionsListPanel = useMemo(
    () =>
      params.user_id ? (
        <SessionsListPanel
          sessions={sessionsForImage}
          currentSessionId={sessionId}
          onSelectSession={handleSelectSession}
          isLoading={sessionsLoading}
        />
      ) : null,
    [params.user_id, sessionsForImage, sessionId, handleSelectSession, sessionsLoading]
  );

  const shapeToolsPanel = useMemo(
    () => (
      <ShapeToolsPanel
        isShapeSelected={!!isShapeSelected}
        addShape={shapeTools.addShape}
        shapeFillColor={shapeTools.shapeFillColor}
        setShapeFillColor={shapeTools.setShapeFillColor}
        shapeStrokeColor={shapeTools.shapeStrokeColor}
        setShapeStrokeColor={shapeTools.setShapeStrokeColor}
        shapeStrokeWidth={shapeTools.shapeStrokeWidth}
        setShapeStrokeWidth={shapeTools.setShapeStrokeWidth}
        shapeOpacity={shapeTools.shapeOpacity}
        setShapeOpacity={shapeTools.setShapeOpacity}
        eyedropperTarget={eyedropper.activeTarget}
        onStartEyedropper={eyedropper.startEyedropper}
      />
    ),
    [isShapeSelected, shapeTools, eyedropper.activeTarget, eyedropper.startEyedropper]
  );


  const handleMobileHistoryClick = () => {
    if (!params.user_id) return;
    mobilePanel.setActiveTab("saved-versions");
    mobilePanel.setIsPanelVisible(true);
    mobilePanel.setCurrentTranslateY(0);
  };

  const handleMobileDone = () => {
    history.saveState(true);
    canvasEditor.canvas?.discardActiveObject();
    canvasEditor.canvas?.renderAll();
    selection.setSelectedObject(null);
    setMobileQrSheetOpen(false);
    setMobileShapeEditingActive(false);
    setMobileFrameEditingActive(false);
    setMobileFeedbackOpen(false);
    mobilePanel.closePanel();
  };

  if (showUploadPrompt) {
    return <UploadPromptCard onFileChange={handleImageUpload} />;
  }

  // Avoid layout shift: keep loading until canvas and sessions (if needed) are ready.
  const editorReady =
    !!canvasEditor.canvas &&
    (!params.user_id?.trim() || !imageUrl || sessionsInitialFetchDone);

  const currentSessionName = sessionsForImage.find((s) => s.id === sessionId)?.name;
  const studioSubtitle = currentSessionName
    ? `Editing · ${currentSessionName}`
    : "Editing · Draft";

  const advancedOptionsContent = (
    <AdvancedOptionsPanel
      layersToolsPanel={layersToolsPanel}
      backgroundImagePanel={FEATURE_FLAGS.showReplaceBackgroundTool ? backgroundImagePanel : null}
      shapeToolsPanel={FEATURE_FLAGS.showShapeTools ? shapeToolsPanel : null}
      frameToolsPanel={FEATURE_FLAGS.showFrameTools && frameAssets.length > 0 ? frameToolsPanel : null}
      guidesAndGridPanel={guidesAndGridPanel}
      sessionsListPanel={sessionsForImage.length > 0 ? sessionsListPanel : null}
    />
  );

  const overlayLayerCount = canvasEditor.canvas
    ? Math.max(0, canvasEditor.canvas.getObjects().length - 1)
    : 0;

  const shapeMobilePicker = useMemo(
    () => <ShapeMobilePicker onAddShape={handleMobileAddShape} />,
    [handleMobileAddShape],
  );

  const frameMobilePicker = useMemo(
    () => (
      <FrameMobilePicker
        frameAssets={frameTools.frameAssets}
        aspectRatio={canvasEditor.aspectRatio}
        onInsertFrame={handleMobileInsertFrame}
      />
    ),
    [frameTools.frameAssets, canvasEditor.aspectRatio, handleMobileInsertFrame],
  );

  const advancedOptionsMobileContent = (
    <AdvancedOptionsMobilePanel
      layersToolsPanel={layersToolsPanel}
      backgroundImagePanel={FEATURE_FLAGS.showReplaceBackgroundTool ? backgroundImagePanel : null}
      shapeToolsPanel={FEATURE_FLAGS.showShapeTools ? shapeMobilePicker : null}
      frameToolsPanel={
        FEATURE_FLAGS.showFrameTools && frameAssets.length > 0 ? frameMobilePicker : null
      }
      guidesAndGridPanel={guidesAndGridPanel}
      sessionsListPanel={sessionsForImage.length > 0 ? sessionsListPanel : null}
      layerCount={overlayLayerCount}
      showGrid={showGrid}
      onToggleGrid={() => setShowGrid((v) => !v)}
    />
  );

  const mobileAvailableTools = [
    FEATURE_FLAGS.showTextTools ? "text-tools" : null,
    FEATURE_FLAGS.showLogoTools ? "logo-overlay" : null,
    FEATURE_FLAGS.showQrTools ? "qr-code" : null,
    FEATURE_FLAGS.showEditWithAI ? "ai-edit" : null,
    FEATURE_FLAGS.showMobileMoreTools &&
    (layersToolsPanel != null ||
      (FEATURE_FLAGS.showReplaceBackgroundTool && backgroundImagePanel != null) ||
      (FEATURE_FLAGS.showShapeTools && shapeToolsPanel != null) ||
      (FEATURE_FLAGS.showFrameTools && frameAssets.length > 0 && frameToolsPanel != null) ||
      guidesAndGridPanel != null ||
      (sessionsForImage.length > 0 && sessionsListPanel != null))
      ? "advanced-options"
      : null,
  ].filter(Boolean) as string[];

  const sidebarProps = {
    layersToolsPanel,
    backgroundImagePanel: FEATURE_FLAGS.showReplaceBackgroundTool ? backgroundImagePanel : null,
    textToolsPanel: FEATURE_FLAGS.showTextTools ? textToolsPanel : null,
    aiEditPanel: FEATURE_FLAGS.showEditWithAI ? aiEditPanel : null,
    logoToolsPanel: FEATURE_FLAGS.showLogoTools ? logoToolsPanel : null,
    qrToolsPanel: FEATURE_FLAGS.showQrTools ? qrToolsPanel : null,
    shapeToolsPanel: FEATURE_FLAGS.showShapeTools ? shapeToolsPanel : null,
    frameToolsPanel: FEATURE_FLAGS.showFrameTools && frameAssets.length > 0 ? frameToolsPanel : null,
    guidesAndGridPanel,
    sessionsListPanel: sessionsForImage.length > 0 ? sessionsListPanel : null,
    desktopTool,
    onDesktopToolChange: setDesktopTool,
  };

  const mobileToolSheetContent = (() => {
    const tab = mobilePanel.activeTab as StudioMobileToolId | null;
    if (!tab) return null;
    if (tab === "text-tools") return sidebarProps.textToolsPanel;
    if (tab === "logo-overlay") return sidebarProps.logoToolsPanel;
    if (tab === "qr-code") {
      return (
        <QrMobileSheetPanel
          qrUrl={qrTools.qrUrl}
          setQrUrl={qrTools.setQrUrl}
          onGenerate={handleMobileQrGenerate}
          onUpload={handleMobileQrFileUpload}
          editMode={mobileQrPlaced}
        />
      );
    }
    if (tab === "ai-edit") return sidebarProps.aiEditPanel;
    if (tab === "advanced-options") return advancedOptionsMobileContent;
    if (tab === "saved-versions") return sidebarProps.sessionsListPanel;
    return null;
  })();

  return (
    <>
      {!editorReady && (
        <div className="fixed inset-0 z-[100]" style={{ backgroundColor: UI_COLORS.PRIMARY_BG }}>
          <StudioLoading />
        </div>
      )}
      <div className={`flex h-full min-h-0 flex-col ${editorReady ? "" : "invisible"}`}>
        <div
          className="studio-root flex min-h-0 flex-1 flex-col overflow-hidden md:min-h-screen md:h-dvh md:flex-none md:overflow-hidden"
          style={{ backgroundColor: UI_COLORS.PRIMARY_BG, color: UI_COLORS.TEXT_PRIMARY }}
        >
          <div ref={headerRef} className="hidden md:block">
            <StudioHeader subtitle={studioSubtitle} />
          </div>

          <StudioMobileHeader subtitle={studioSubtitle} />

          <div className="flex min-h-0 flex-1 flex-col md:flex-row">
            <EditorSidebar {...sidebarProps} />

            <div
              className="relative flex min-h-0 min-w-0 flex-1 flex-col"
              style={{ backgroundColor: UI_COLORS.CANVAS_MAT }}
            >
              {desktopTool && (
                <StudioDesktopToolPanel
                  tool={desktopTool}
                  onClose={() => setDesktopTool(null)}
                  textToolsPanel={sidebarProps.textToolsPanel}
                  logoToolsPanel={sidebarProps.logoToolsPanel}
                  qrToolsPanel={sidebarProps.qrToolsPanel}
                  aiEditPanel={sidebarProps.aiEditPanel}
                  advancedContent={advancedOptionsContent}
                  sessionsListPanel={sidebarProps.sessionsListPanel}
                />
              )}

              <div className="relative flex min-h-0 flex-1 flex-col">
                {showSaveToast ? (
                  <StudioSaveToast
                    onViewVersions={() => {
                      setShowSaveToast(false);
                      if (typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches) {
                        setDesktopTool("saved-versions");
                      } else {
                        handleMobileHistoryClick();
                      }
                    }}
                    onClose={() => setShowSaveToast(false)}
                    className="bottom-[158px] md:bottom-[18px]"
                  />
                ) : null}

                {isMobileStudio ? (
                  <StudioMobileCanvasControls
                    undo={history.undo}
                    redo={history.redo}
                    deleteSelected={deleteSelected}
                    onAlign={handleAlign}
                    historyState={history.historyState}
                    selectedObject={selection.selectedObject}
                    onHistoryClick={params.user_id ? handleMobileHistoryClick : undefined}
                    historyBadge={sessionsForImage.length > 0}
                  />
                ) : null}

                <div
                  id="canvas-area"
                  className="themed-scrollbar relative z-[1] flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden px-4 py-2 md:overflow-auto md:m-7 md:p-0"
                >
                  <div
                    ref={canvasWrapperRef}
                    className="relative inline-flex max-h-full max-w-full"
                  >
                    <div className="pointer-events-none absolute top-3 right-3 z-[3] hidden md:top-[18px] md:right-[18px] md:block">
                      <div className="pointer-events-auto">
                        <EditorToolbar
                          undo={history.undo}
                          redo={history.redo}
                          deleteSelected={deleteSelected}
                          handleExportClick={handleExportClick}
                          handleSave={handleSave}
                          isExporting={isExporting}
                          isSaving={isSaving}
                          historyState={history.historyState}
                          selectedObject={selection.selectedObject}
                          showSaveButton={FEATURE_FLAGS.showSaveCanvas && !!params.user_id}
                          variant="desktop"
                          onAlign={handleAlign}
                          onSaveClick={() => setShowSaveModal(true)}
                          onSendUrlToChat={handleSendUrlToChatAndClose}
                          isEmbedded={isEmbedded}
                          isSendingUrl={isSendingUrlToChat}
                          onHistoryClick={
                            params.user_id
                              ? () =>
                                  setDesktopTool((current) =>
                                    current === "saved-versions" ? null : "saved-versions",
                                  )
                              : undefined
                          }
                          historyBadge={sessionsForImage.length > 0}
                          historyActive={desktopTool === "saved-versions"}
                        />
                      </div>
                    </div>

                    <div
                      className="relative max-w-full overflow-hidden rounded-xl border shadow-[0_20px_50px_-20px_rgba(0,0,0,0.75)] md:shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)]"
                      style={{ borderColor: UI_COLORS.BORDER }}
                    >
                      <canvas ref={canvasEditor.canvasRef} />
                      {canvasEditor.canvasDimensions && (showGrid || guidePositions.v.length > 0 || guidePositions.h.length > 0) && (
                        <CanvasGuidesOverlay
                          width={canvasEditor.canvasDimensions.width}
                          height={canvasEditor.canvasDimensions.height}
                          showGrid={showGrid}
                          guidePositions={guidePositions}
                        />
                      )}
                      {rotationTooltip !== null && (
                        <div
                          className="pointer-events-none absolute z-10 rounded bg-black/75 px-2 py-1 text-xs font-medium text-white tabular-nums"
                          style={{
                            left: rotationTooltip.left,
                            top: rotationTooltip.top,
                            transform: "translate(-50%, 0)",
                          }}
                          aria-live="polite"
                          role="status"
                        >
                          {rotationTooltip.angle}°
                        </div>
                      )}
                      {selectionContextMenuPosition !== null && !isMobileStudio && (() => {
                        const selObj = selection.selectedObject;
                        const isLocked =
                          !!selObj &&
                          ((selObj as any).__layerLocked === true ||
                            !!(selObj.lockMovementX && selObj.lockMovementY) ||
                            selObj.selectable === false ||
                            selObj.evented === false);
                        return (
                          <div
                            className="absolute z-20 flex items-center gap-0.5 rounded-lg border border-white/20 bg-[#1a1a1a] p-1 shadow-lg"
                            style={{
                              left: selectionContextMenuPosition.left,
                              top: selectionContextMenuPosition.top,
                              transform: "translate(-50%, 0)",
                            }}
                            role="toolbar"
                            aria-label="Layer options"
                            onPointerDown={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={duplicateSelected}
                              className="flex size-8 items-center justify-center rounded-md text-white/90 transition-colors hover:bg-white/15 hover:text-white"
                              aria-label="Duplicate layer"
                              title="Duplicate layer"
                            >
                              <Copy className="size-4" aria-hidden />
                            </button>
                            <button
                              type="button"
                              onClick={toggleLockSelected}
                              className={`flex size-8 items-center justify-center rounded-md transition-colors ${isLocked
                                ? "text-amber-400 hover:bg-amber-500/20 hover:text-amber-300"
                                : "text-white/90 hover:bg-white/15 hover:text-white"
                                }`}
                              aria-label={isLocked ? "Unlock layer" : "Lock layer"}
                              title={isLocked ? "Unlock layer" : "Lock layer"}
                            >
                              {isLocked ? <Lock className="size-4" aria-hidden /> : <Unlock className="size-4" aria-hidden />}
                            </button>
                            <button
                              type="button"
                              onClick={deleteSelected}
                              className="flex size-8 items-center justify-center rounded-md text-red-400 transition-colors hover:bg-red-500/20 hover:text-red-300"
                              aria-label="Delete layer"
                              title="Delete layer"
                            >
                              <Trash2 className="size-4" aria-hidden />
                            </button>
                          </div>
                        );
                      })()}
                    </div>

                  </div>

                  {mobilePanel.isPanelVisible &&
                  mobilePanel.activeTab &&
                  !mobileFloatChromeMode ? (
                    <StudioMobileToolSheet
                      activeTab={mobilePanel.activeTab as StudioMobileToolId}
                      onClose={() => {
                        if (mobilePanel.activeTab === "qr-code") {
                          setMobileQrSheetOpen(false);
                        }
                        mobilePanel.closePanel();
                      }}
                      panelRef={mobilePanel.panelRef}
                      onDragStart={mobilePanel.handleDragStart}
                      onDragMove={mobilePanel.handleDragMove}
                      onDragEnd={mobilePanel.handleDragEnd}
                      currentTranslateY={mobilePanel.currentTranslateY}
                    >
                      {mobileToolSheetContent}
                    </StudioMobileToolSheet>
                  ) : null}

                  {mobileFeedbackOpen && !mobileFloatChromeMode ? (
                    <StudioMobileToolSheet
                      panelTitle="Design feedback"
                      panelSubtitle="AI suggestions for your canvas"
                      panelIcon={
                        <span
                          className="inline-flex size-[17px] items-center justify-center"
                          style={{ color: "#8069FF" }}
                        >
                          <FeedbackSparklesIcon />
                        </span>
                      }
                      onClose={closeMobileFeedbackSheet}
                    >
                      <FeedbackPanelContent
                        variant="sheet"
                        isFetchingFeedback={isFetchingFeedback}
                        feedbackText={feedbackText}
                        feedbackIssues={feedbackIssues}
                        feedbackEditPlan={feedbackEditPlan}
                        handleApplyCleanup={handleApplyCleanup}
                        isApplyingCleanup={isApplyingCleanup}
                        onRefresh={handleGetFeedback}
                      />
                    </StudioMobileToolSheet>
                  ) : null}
                </div>

                {isMobileStudio ? (
                  <div
                    className="relative flex shrink-0 flex-col justify-end overflow-visible md:hidden"
                    style={{ minHeight: STUDIO_LAYOUT.MOBILE_BOTTOM_CHROME_H }}
                  >
                    <div
                      className={`absolute inset-x-0 bottom-0 z-[2] flex flex-col overflow-visible ${
                        mobileFloatChromeMode ? "" : "pointer-events-none invisible"
                      }`}
                      aria-hidden={!mobileFloatChromeMode}
                    >
                      {canvasEditor.canvas ? (
                        <StudioMobileFloatControls
                          toolMode={mobileFloatToolMode}
                          hasSelection={mobileFloatHasSelection}
                          fontAssets={fontAssets}
                          onAddText={textTools.addText}
                          addTextDisabled={!fontsReady}
                          textTools={{
                            fontFamily: textTools.fontFamily,
                            setFontFamily: textTools.setFontFamily,
                            fontSize: textTools.fontSize,
                            setFontSize: textTools.setFontSize,
                            isBold: textTools.isBold,
                            setIsBold: textTools.setIsBold,
                            isItalic: textTools.isItalic,
                            setIsItalic: textTools.setIsItalic,
                            isUnderline: textTools.isUnderline,
                            setIsUnderline: textTools.setIsUnderline,
                            textAlign: textTools.textAlign,
                            setTextAlign: textTools.setTextAlign,
                            textColor: textTools.textColor,
                            setTextColor: textTools.setTextColor,
                            backgroundColor: textTools.backgroundColor,
                            setBackgroundColor: textTools.setBackgroundColor,
                            lineHeight: textTools.lineHeight,
                            setLineHeight: textTools.setLineHeight,
                            googleCatalogFonts: googleFontCatalog,
                            googleCatalogLoading,
                          }}
                          logoTools={{
                            filteredLogoAssets: logoTools.filteredLogoAssets,
                            logoSize: logoTools.logoSize,
                            setLogoSize: logoTools.setLogoSize,
                            logoOpacity: logoTools.logoOpacity,
                            setLogoOpacity: logoTools.setLogoOpacity,
                            onSelectLogo: logoTools.replaceSelectedLogo,
                            onInsertLogo: logoTools.handleInsertDefaultLogo,
                            selectedLogoUrl,
                            allowCustomLogo,
                            onUploadLogo: logoTools.handleLogoFileUpload,
                          }}
                          qrTools={{
                            qrSize: qrTools.qrSize,
                            setQrSize: qrTools.setQrSize,
                            qrOpacity: qrTools.qrOpacity,
                            setQrOpacity: qrTools.setQrOpacity,
                            onEditLink: handleMobileQrEditLink,
                          }}
                          shapeTools={{
                            shapeFillColor: shapeTools.shapeFillColor,
                            setShapeFillColor: shapeTools.setShapeFillColor,
                            shapeStrokeColor: shapeTools.shapeStrokeColor,
                            setShapeStrokeColor: shapeTools.setShapeStrokeColor,
                            shapeStrokeWidth: shapeTools.shapeStrokeWidth,
                            setShapeStrokeWidth: shapeTools.setShapeStrokeWidth,
                            shapeOpacity: shapeTools.shapeOpacity,
                            setShapeOpacity: shapeTools.setShapeOpacity,
                            onAddShape: handleMobileAddShape,
                          }}
                          frameTools={{
                            filteredFrameAssets: frameTools.filteredFrameAssets,
                            frameOpacity: frameTools.frameOpacity,
                            setFrameOpacity: frameTools.setFrameOpacity,
                            onSelectFrame: handleMobileInsertFrame,
                            onInsertFrame: handleMobileInsertFrame,
                            selectedFrameUrl,
                          }}
                        />
                      ) : null}
                      <StudioMobileDoneBar onDone={handleMobileDone} />
                    </div>

                    <div
                      className={`absolute inset-x-0 bottom-0 z-[2] flex flex-col ${
                        mobileFloatChromeMode ? "pointer-events-none invisible" : ""
                      }`}
                      aria-hidden={mobileFloatChromeMode}
                    >
                      <StudioMobileTabBar
                        activeTab={mobilePanel.activeTab}
                        onTabClick={handleMobileTabClick}
                        availableTools={mobileAvailableTools}
                      />

                      <StudioMobileSessionBar
                        handleExportClick={handleExportClick}
                        isExporting={isExporting}
                        showSaveButton={FEATURE_FLAGS.showSaveCanvas && !!params.user_id}
                        onSaveClick={() => setShowSaveModal(true)}
                        isSaving={isSaving}
                        onSendUrlToChat={isEmbedded ? handleSendUrlToChatAndClose : undefined}
                        isSendingUrl={isSendingUrlToChat}
                        onFeedbackPress={
                          FEATURE_FLAGS.showFeedbackButton ? handleMobileFeedbackPress : undefined
                        }
                        isFetchingFeedback={isFetchingFeedback}
                        feedbackOpen={mobileFeedbackOpen}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <StudioActionBar
            compact={isCompactChrome}
            handleExportClick={handleExportClick}
            isExporting={isExporting}
            showSaveButton={FEATURE_FLAGS.showSaveCanvas && !!params.user_id}
            onSaveClick={() => setShowSaveModal(true)}
            isSaving={isSaving}
            onSendUrlToChat={isEmbedded ? handleSendUrlToChatAndClose : undefined}
            isSendingUrl={isSendingUrlToChat}
            handleGetFeedback={
              FEATURE_FLAGS.showFeedbackButton ? handleGetFeedback : undefined
            }
            isFetchingFeedback={isFetchingFeedback}
            feedbackText={feedbackText}
            feedbackIssues={feedbackIssues}
            feedbackEditPlan={feedbackEditPlan}
            handleApplyCleanup={handleApplyCleanup}
            isApplyingCleanup={isApplyingCleanup}
          />

          <SaveSessionModal
            open={showSaveModal}
            onOpenChange={setShowSaveModal}
            onConfirm={(name) => handleSave(name)}
            isSaving={isSaving}
          />

          <DisclaimerModal
            open={showDisclaimerModal}
            onOpenChange={setShowDisclaimerModal}
            disclaimerPosition={disclaimerPosition}
            setDisclaimerPosition={setDisclaimerPosition}
            onConfirm={(exportConfig) => exportImage(exportConfig)}
            isExporting={isExporting}
          />
        </div>
      </div>
      {eyedropper.activeTarget && eyedropper.eyedropperState.magnifierPos && eyedropper.eyedropperState.previewColor && (
        <EyedropperMagnifier
          x={eyedropper.eyedropperState.magnifierPos.x}
          y={eyedropper.eyedropperState.magnifierPos.y}
          previewColor={eyedropper.eyedropperState.previewColor}
          pixels={eyedropper.eyedropperState.magnifierPixels}
          gridSide={eyedropper.magnifierSide}
        />
      )}
    </>
  );
}
