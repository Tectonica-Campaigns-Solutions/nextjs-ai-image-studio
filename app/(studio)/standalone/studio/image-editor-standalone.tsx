"use client";

import type React from "react";
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Text, Group, Shadow, Rect } from "fabric";
import { TectonicaLogo } from "./components/editor-icons";
import {
  DisclaimerModal,
  EditorSidebar,
  EditorToolbar,
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
import { DEFAULT_FONTS, EXPORT, UI_COLORS } from "./constants/editor-constants";

// Import custom hooks
import { useImageEditorCanvas } from "./hooks/use-image-editor-canvas";
import { useImageEditorHistory } from "./hooks/use-image-editor-history";
import { useImageEditorSelection } from "./hooks/use-image-editor-selection";
import { useTextTools } from "./hooks/use-text-tools";
import { useQRTools } from "./hooks/use-qr-tools";
import { useLogoTools } from "./hooks/use-logo-tools";
import { useShapeTools } from "./hooks/use-shape-tools";
import { useMobilePanel } from "./hooks/use-mobile-panel";
import { useEditorFonts } from "./hooks/use-editor-fonts";

export default function ImageEditorStandalone({
  params,
  logoAssets,
  fontAssets = [],
}: ImageEditorStandaloneProps) {
  const imageUrlFromParams = params.imageUrl;

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

  // Initialize selection hook first (provides setters needed by other hooks)
  const selection = useImageEditorSelection({
    canvasRef: canvasRefStable,
    setFontSize: () => { },
    setFontFamily: () => { },
    setTextColor: () => { },
    setBackgroundColor: () => { },
    setIsBold: () => { },
    setIsItalic: () => { },
    setIsUnderline: () => { },
    setLineHeight: () => { },
    setLetterSpacing: () => { },
    setRectFillColor: () => { },
    setRectStrokeColor: () => { },
    setRectStrokeWidth: () => { },
    setRectOpacity: () => { },
  });

  // Initialize tools hooks with stable refs
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

  // Update selection hook setters to use tool hooks
  useEffect(() => {
    (selection as any).setFontSize = textTools.setFontSize;
    (selection as any).setFontFamily = textTools.setFontFamily;
    (selection as any).setTextColor = textTools.setTextColor;
    (selection as any).setBackgroundColor = textTools.setBackgroundColor;
    (selection as any).setIsBold = textTools.setIsBold;
    (selection as any).setIsItalic = textTools.setIsItalic;
    (selection as any).setIsUnderline = textTools.setIsUnderline;
    (selection as any).setLineHeight = textTools.setLineHeight;
    (selection as any).setLetterSpacing = textTools.setLetterSpacing;
    (selection as any).setRectFillColor = shapeTools.setRectFillColor;
    (selection as any).setRectStrokeColor = shapeTools.setRectStrokeColor;
    (selection as any).setRectStrokeWidth = shapeTools.setRectStrokeWidth;
    (selection as any).setRectOpacity = shapeTools.setRectOpacity;
  }, []);

  // Initialize history hook with stable refs
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
  });

  // Update saveStateRef whenever history.saveState changes
  useEffect(() => {
    saveStateRef.current = history.saveState;
  }, [history.saveState]);

  // Initialize canvas hook (provides canvas instance)
  const canvasEditor = useImageEditorCanvas(imageUrl, {
    headerRef,
    setHistoryState: history.setHistoryState,
    setObjectMetadata: selection.setObjectMetadata,
    setSelectedObject: selection.setSelectedObject,
    setQrSize: qrTools.setQrSize,
    setLogoSize: logoTools.setLogoSize,
    saveState: history.saveState,
    moveSaveTimeoutRef: history.moveSaveTimeoutRef,
    saveStateTimeoutRef: history.saveStateTimeoutRef,
    preventContextMenu,
  });

  // Mobile panel hook
  const mobilePanel = useMobilePanel();

  // Editor fonts hook
  useEditorFonts(fontAssets);

  // Update stable refs when canvas becomes available
  useEffect(() => {
    if (!canvasEditor.canvas) return;
    canvasRefStable.current = canvasEditor.canvas;
    originalImageUrlRefStable.current = canvasEditor.originalImageUrlRef.current;
    originalImageDimensionsRefStable.current = canvasEditor.originalImageDimensions;
  }, [canvasEditor.canvas, canvasEditor.originalImageUrlRef, canvasEditor.originalImageDimensions]);

  // Update text on style change
  useEffect(() => {
    if (!canvasEditor.canvas || !selection.selectedObject || selection.selectedObject.type !== "i-text") return;
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
  ]);

  // Update rect on style change
  useEffect(() => {
    if (!canvasEditor.canvas || !selection.selectedObject) return;

    const isRectSelected =
      selection.selectedObject.type === "rect" &&
      (selection.selectedObject as any).isRect === true;

    if (!isRectSelected) return;

    shapeTools.updateSelectedRect();
    history.saveState(false);
  }, [
    shapeTools.rectFillColor,
    shapeTools.rectStrokeColor,
    shapeTools.rectStrokeWidth,
    shapeTools.rectOpacity,
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
        textColor={textTools.textColor}
        setTextColor={textTools.setTextColor}
        backgroundColor={textTools.backgroundColor}
        setBackgroundColor={textTools.setBackgroundColor}
      />
    ),
    [selection.selectedObject, fontAssets, textTools]
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

  const isRectSelected =
    selection.selectedObject &&
    selection.selectedObject.type === "rect" &&
    (selection.selectedObject as any).isRect === true;

  const shapeToolsPanel = useMemo(
    () => (
      <ShapeToolsPanel
        isRectSelected={!!isRectSelected}
        addRect={shapeTools.addRect}
        rectFillColor={shapeTools.rectFillColor}
        setRectFillColor={shapeTools.setRectFillColor}
        rectStrokeColor={shapeTools.rectStrokeColor}
        setRectStrokeColor={shapeTools.setRectStrokeColor}
        rectStrokeWidth={shapeTools.rectStrokeWidth}
        setRectStrokeWidth={shapeTools.setRectStrokeWidth}
        rectOpacity={shapeTools.rectOpacity}
        setRectOpacity={shapeTools.setRectOpacity}
      />
    ),
    [isRectSelected, shapeTools]
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
                textToolsPanel={textToolsPanel}
                logoToolsPanel={logoToolsPanel}
                qrToolsPanel={qrToolsPanel}
                shapeToolsPanel={shapeToolsPanel}
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
              <div className="w-full max-w-full overflow-hidden rounded-[3px] flex justify-start">
                <canvas ref={canvasEditor.canvasRef} />
              </div>
            </div>

            {!mobilePanel.activeTab && (
              <EditorToolbar
                undo={history.undo}
                redo={history.redo}
                deleteSelected={deleteSelected}
                handleExportClick={handleExportClick}
                isExporting={isExporting}
                historyState={history.historyState}
                selectedObject={selection.selectedObject}
                variant="mobile"
              />
            )}
          </div>

          <EditorToolbar
            undo={history.undo}
            redo={history.redo}
            deleteSelected={deleteSelected}
            handleExportClick={handleExportClick}
            isExporting={isExporting}
            historyState={history.historyState}
            selectedObject={selection.selectedObject}
            variant="desktop"
          />
        </div>
      </div>

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
