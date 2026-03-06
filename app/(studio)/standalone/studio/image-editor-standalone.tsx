"use client";

import type React from "react";
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Text, Group, Shadow, Rect } from "fabric";
import { TectonicaLogo } from "./components/editor-icons";
import {
  DisclaimerModal,
  EditorSidebar,
  EditorToolbar,
  FeedbackButton,
  AIEditPanel,
  FrameToolsPanel,
  LogoToolsPanel,
  QrToolsPanel,
  ShapeToolsPanel,
  TextToolsPanel,
  UploadPromptCard,
} from "./components";
import type {
  DisclaimerPosition,
  ImageEditorStandaloneProps,
} from "./types/image-editor-types";
import { useToast } from "@/hooks/use-toast";
import { DEFAULT_FONTS, EXPORT, FEATURE_FLAGS, SELECTION_MENU, UI_COLORS } from "./constants/editor-constants";

// Import custom hooks
import { useImageEditorCanvas, constrainObjectToCanvas } from "./hooks/use-image-editor-canvas";
import { useImageEditorHistory } from "./hooks/use-image-editor-history";
import { useImageEditorSelection } from "./hooks/use-image-editor-selection";
import { useTextTools } from "./hooks/use-text-tools";
import { useQRTools } from "./hooks/use-qr-tools";
import { useLogoTools } from "./hooks/use-logo-tools";
import { useFrameTools } from "./hooks/use-frame-tools";
import { useShapeTools } from "./hooks/use-shape-tools";
import { useMobilePanel } from "./hooks/use-mobile-panel";
import { useEditorFonts } from "./hooks/use-editor-fonts";
import { editImage } from "./lib/image-edit-service";
import { getCurrentBackgroundImageForEdit, getFullCanvasImageForEdit, remeasureTextboxes } from "./utils/image-editor-utils";
import { Copy, Trash2 } from "lucide-react";

export default function ImageEditorStandalone({
  params,
  logoAssets,
  frameAssets = [],
  fontAssets = [],
  sessionData = null,
}: ImageEditorStandaloneProps) {
  const imageUrlFromParams = params.imageUrl ?? sessionData?.background_url;

  const { toast } = useToast();

  // Header ref
  const headerRef = useRef<HTMLDivElement>(null);

  // Upload state
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [showUploadPrompt, setShowUploadPrompt] = useState<boolean>(
    !imageUrlFromParams
  );

  // Export states
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [showDisclaimerModal, setShowDisclaimerModal] = useState<boolean>(false);
  const [disclaimerPosition, setDisclaimerPosition] = useState<DisclaimerPosition>(EXPORT.DEFAULT_DISCLAIMER_POSITION);

  // Save state
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [sessionId, setSessionId] = useState<string | null>(sessionData?.id ?? null);

  // Feedback state
  const [isFetchingFeedback, setIsFetchingFeedback] = useState<boolean>(false);
  const [feedbackText, setFeedbackText] = useState<string | null>(null);

  // AI image edit state
  const [isEditingWithAI, setIsEditingWithAI] = useState<boolean>(false);

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

  // Determine image URL
  const imageUrl = imageUrlFromParams || uploadedImageUrl;

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

  // Initialize tools hooks first so their setters can be passed to the selection hook
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
    },
    onRotationTooltip: setRotationTooltip,
    onSelectionContextMenuPosition: (obj, canvas) => {
      const pos = computeMenuPosition(obj, canvas);
      if (pos) setSelectionContextMenuPosition(pos);
    },
  });

  const frameTools = useFrameTools({
    canvasRef: canvasRefStable,
    frameAssets,
    aspectRatio: canvasEditor.aspectRatio,
    saveStateRef,
  });

  // Keep setFrameOpacityRef in sync so the canvas hook can call it
  useEffect(() => {
    setFrameOpacityRef.current = frameTools.setFrameOpacity;
  }, [frameTools.setFrameOpacity]);

  // Mobile panel hook
  const mobilePanel = useMobilePanel();

  const onFontsLoaded = useCallback(() => {
    remeasureTextboxes(canvasRefStable.current);
  }, []);

  // Editor fonts hook
  const { fontsReady } = useEditorFonts(fontAssets, { onFontsLoaded });

  // Re-measure textboxes whenever *any* font finishes loading (covers bundled
  // next/font fonts like Manrope that aren't tracked by useEditorFonts).
  useEffect(() => {
    if (typeof document?.fonts?.addEventListener !== "function") return;
    const handler = () => remeasureTextboxes(canvasRefStable.current);
    document.fonts.addEventListener("loadingdone", handler);
    return () => document.fonts.removeEventListener("loadingdone", handler);
  }, []);

  useEffect(() => {
    const canvas = canvasEditor.canvas;
    const obj = selection.selectedObject;
    if (!canvas || !obj || (obj as any).isBackground) {
      setSelectionContextMenuPosition(null);
      return;
    }
    const pos = computeMenuPosition(obj, canvas);
    if (pos) setSelectionContextMenuPosition(pos);
  }, [canvasEditor.canvas, selection.selectedObject, computeMenuPosition]);

  // Update context menu position while moving the layer so the bar follows the selection
  useEffect(() => {
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
  }, [canvasEditor.canvas, computeMenuPosition]);

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
      setShowUploadPrompt(false);
    }
    event.target.value = "";
  };

  // Handle export click
  const handleExportClick = () => {
    setShowDisclaimerModal(true);
  };

  // Export image with disclaimer
  const exportImage = async (position: DisclaimerPosition) => {
    if (!canvasEditor.canvas || !canvasEditor.originalImageDimensions) return;
    setIsExporting(true);
    setShowDisclaimerModal(false);

    let disclaimerGroup: Group | null = null;
    try {
      // Add temporary disclaimer before export
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

      const currentWidth = canvasEditor.canvas.width;
      const multiplier = canvasEditor.originalImageDimensions.width / currentWidth;

      const dataURL = canvasEditor.canvas.toDataURL({
        format: EXPORT.DEFAULT_FORMAT,
        quality: EXPORT.DEFAULT_QUALITY,
        multiplier: multiplier,
      });

      const link = document.createElement("a");
      link.download = EXPORT.DEFAULT_FILENAME;
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

  // Delete selected object
  const deleteSelected = () => {
    if (!canvasEditor.canvas || !selection.selectedObject) return;
    canvasEditor.canvas.remove(selection.selectedObject);
    canvasEditor.canvas.renderAll();
    history.saveState(true);
  };

  // Duplicate selected object (offset so it's visible)
  const duplicateSelected = useCallback(async () => {
    const canvas = canvasEditor.canvas;
    const obj = selection.selectedObject;
    if (!canvas || !obj || (obj as any).isBackground) return;
    try {
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
      history.saveState(true);
    } catch (err) {
      console.error("[duplicateSelected]", err);
    }
  }, [canvasEditor.canvas, selection.selectedObject, selection.setSelectedObject, history.saveState]);

  // Save canvas session to database
  const handleSave = async () => {
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

      const res = await fetch("/api/studio/canvas-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        toast({
          title: "Save failed",
          description: data.error ?? "Could not save the session.",
          variant: "destructive",
        });
        return;
      }

      const newSessionId: string = data.id;
      setSessionId(newSessionId);

      // Update URL with session_id so the user can reload and resume
      const url = new URL(window.location.href);
      url.searchParams.set("session_id", newSessionId);
      window.history.replaceState({}, "", url.toString());

      toast({
        title: "Saved",
        description: "Session saved successfully.",
        className: "bg-[#1a1a1a] border-[#333] text-white",
      });

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
    } catch (err) {
      console.error("[handleSave] error:", err);
      toast({
        title: "Save failed",
        description: "An unexpected error occurred.",
        variant: "destructive",
        className: "bg-red-600 border-red-700 text-white",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Edit background with AI
  const handleAIEdit = useCallback(
    async (prompt: string, includeLayers?: boolean) => {
      if (!canvasEditor.canvas || !canvasEditor.replaceBackgroundImage) return;
      const payload = includeLayers
        ? getFullCanvasImageForEdit(canvasEditor.canvas)
        : getCurrentBackgroundImageForEdit(canvasEditor.canvas);
      if (!payload || (!payload.imageUrls?.length && !payload.base64Images?.length)) {
        toast({
          title: "Edit failed",
          description: "Could not get the current image to edit.",
          variant: "destructive",
        });
        return;
      }
      setIsEditingWithAI(true);
      try {
        const result = await editImage({
          prompt,
          ...payload,
          orgType: "Tectonica",
          clientInfo: {
            client_id: params.client_id ?? "Tectonica",
            user_id: params.user_id ?? "",
            user_email: params.user_email ?? "",
          },
        });
        if (!result.success || !result.images?.length) {
          const errMsg =
            !result.success && "error" in result
              ? result.error ?? result.details
              : "No image returned.";
          toast({
            title: "Edit failed",
            description: errMsg ?? "No image returned.",
            variant: "destructive",
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
        toast({
          title: "Image updated",
          description: includeLayers
            ? "The image has been edited. Canvas now shows the result."
            : "The background has been edited. Overlays are preserved.",
          className: "bg-[#1a1a1a] border-[#333] text-white",
        });
      } catch (err) {
        console.error("[handleAIEdit] error:", err);
        toast({
          title: "Edit failed",
          description: err instanceof Error ? err.message : "An unexpected error occurred.",
          variant: "destructive",
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
      toast,
    ]
  );

  // Get AI feedback on the current canvas
  const handleGetFeedback = async () => {
    if (!canvasEditor.canvas) return;
    setIsFetchingFeedback(true);
    setFeedbackText(null);

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
        toast({
          title: "Feedback failed",
          description: data.error ?? "Could not get feedback.",
          variant: "destructive",
        });
        return;
      }

      setFeedbackText(data.feedback);
    } catch (err) {
      console.error("[handleGetFeedback] error:", err);
      toast({
        title: "Feedback failed",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsFetchingFeedback(false);
    }
  };

  // Show upload prompt if no image
  if (showUploadPrompt) {
    return <UploadPromptCard onFileChange={handleImageUpload} />;
  }

  // Render panels with memoization
  const textToolsPanel = useMemo(
    () => (
      <TextToolsPanel
        selectedObject={selection.selectedObject}
        fontAssets={fontAssets}
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
      />
    ),
    [selection.selectedObject, fontAssets, fontsReady, textTools]
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

  const isLogoSelected =
    !!selection.selectedObject && !!(selection.selectedObject as any).isLogo;
  const isQrSelected =
    !!selection.selectedObject && !!(selection.selectedObject as any).isQR;

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
      />
    ),
    [logoTools, isLogoSelected]
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

  const frameToolsPanel = useMemo(
    () => {
      if (!frameTools.hasFrameAssets) return null;

      return (
        <FrameToolsPanel
          filteredFrameAssets={frameTools.filteredFrameAssets}
          hasFrameAssets={frameTools.hasFrameAssets}
          aspectRatio={canvasEditor.aspectRatio}
          frameOpacity={frameTools.frameOpacity}
          setFrameOpacity={frameTools.setFrameOpacity}
          insertFrame={frameTools.insertFrame}
          isFrameSelected={isFrameSelected}
        />
      );
    },
    [frameTools, canvasEditor.aspectRatio, isFrameSelected]
  );

  const isShapeSelected = shapeTools.isShapeSelected(selection.selectedObject);

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
      />
    ),
    [isShapeSelected, shapeTools]
  );

  return (
    <div
      className="min-h-screen h-full md:px-[30px] px-[10px] md:py-[20px] py-[18px] flex flex-col md:h-screen md:overflow-hidden"
      style={{ backgroundColor: UI_COLORS.PRIMARY_BG }}
    >
      <div className="flex-1 md:block flex flex-col md:min-h-0">
        <div
          id="sidebar"
          className="flex-1 flex h-full md:flex-row flex-col-reverse OLD_bg-red-500 max-w-[1400px] mx-auto md:min-h-0 gap-10"
        >
          <div className="md:w-[400px] w-full overflow-y-auto themed-scrollbar md:pr-3 md:h-full md:min-h-0 md:self-start  flex flex-col justify-between">
            <div>
              <EditorSidebar
                textToolsPanel={FEATURE_FLAGS.showTextTools ? textToolsPanel : null}
                aiEditPanel={FEATURE_FLAGS.showEditWithAI ? aiEditPanel : null}
                logoToolsPanel={FEATURE_FLAGS.showLogoTools ? logoToolsPanel : null}
                qrToolsPanel={FEATURE_FLAGS.showQrTools ? qrToolsPanel : null}
                shapeToolsPanel={FEATURE_FLAGS.showShapeTools ? shapeToolsPanel : null}
                frameToolsPanel={FEATURE_FLAGS.showFrameTools ? frameToolsPanel : null}
                activeTab={mobilePanel.activeTab}
                handleTabClick={mobilePanel.handleTabClick}
                isPanelVisible={mobilePanel.isPanelVisible}
                currentTranslateY={mobilePanel.currentTranslateY}
                dragStartY={mobilePanel.dragStartY}
                panelRef={mobilePanel.panelRef}
                handleDragStart={mobilePanel.handleDragStart}
                handleDragMove={mobilePanel.handleDragMove}
                handleDragEnd={mobilePanel.handleDragEnd}
                setIsPanelVisible={mobilePanel.setIsPanelVisible}
                setCurrentTranslateY={mobilePanel.setCurrentTranslateY}
                setActiveTab={mobilePanel.setActiveTab}
              />
            </div>

            <div className="opacity-50">
              <TectonicaLogo />
            </div>
          </div>

          <div
            id="canvas-area"
            className="flex-1 min-w-0 OLD_xl:px-20 md:overflow-y-auto themed-scrollbar md:min-h-0 OLD_bg-green-500"
          >
            <div className="mb-5">
              <div className="relative w-full max-w-full overflow-hidden rounded-[3px] flex justify-start">
                <canvas ref={canvasEditor.canvasRef} />
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
                {selectionContextMenuPosition !== null && (
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
                      onClick={deleteSelected}
                      className="flex size-8 items-center justify-center rounded-md text-red-400 transition-colors hover:bg-red-500/20 hover:text-red-300"
                      aria-label="Delete layer"
                      title="Delete layer"
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {!mobilePanel.activeTab && (
              <EditorToolbar
                undo={history.undo}
                redo={history.redo}
                deleteSelected={deleteSelected}
                handleExportClick={handleExportClick}
                handleSave={handleSave}
                handleGetFeedback={
                  FEATURE_FLAGS.showFeedbackButton ? handleGetFeedback : undefined
                }
                isExporting={isExporting}
                isSaving={isSaving}
                isFetchingFeedback={
                  FEATURE_FLAGS.showFeedbackButton ? isFetchingFeedback : undefined
                }
                feedbackText={
                  FEATURE_FLAGS.showFeedbackButton ? feedbackText : undefined
                }
                historyState={history.historyState}
                selectedObject={selection.selectedObject}
                showSaveButton={FEATURE_FLAGS.showSaveCanvas}
                variant="mobile"
              />
            )}
          </div>

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
            showSaveButton={FEATURE_FLAGS.showSaveCanvas}
            variant="desktop"
          />
        </div>
      </div>

      {FEATURE_FLAGS.showFeedbackButton && (
        <FeedbackButton
          handleGetFeedback={handleGetFeedback}
          isFetchingFeedback={isFetchingFeedback}
          feedbackText={feedbackText}
        />
      )}

      <DisclaimerModal
        open={showDisclaimerModal}
        onOpenChange={setShowDisclaimerModal}
        disclaimerPosition={disclaimerPosition}
        setDisclaimerPosition={setDisclaimerPosition}
        onConfirm={() => exportImage(disclaimerPosition)}
        isExporting={isExporting}
      />
    </div>
  );
}
