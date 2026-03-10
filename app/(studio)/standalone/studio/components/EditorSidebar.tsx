"use client";

import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { Sparkles, Grid3X3, Save, ImageIcon } from "lucide-react";
import { TextItem, LogoItem, QRItem, ShapeItem, FrameItem, LayersItem } from "./editor-icons";

export interface EditorSidebarProps {
  layersToolsPanel: ReactNode | null;
  backgroundImagePanel: ReactNode | null;
  textToolsPanel: ReactNode | null;
  aiEditPanel: ReactNode | null;
  logoToolsPanel: ReactNode | null;
  qrToolsPanel: ReactNode | null;
  shapeToolsPanel: ReactNode | null;
  frameToolsPanel: ReactNode | null;
  guidesAndGridPanel: ReactNode | null;
  sessionsListPanel: ReactNode | null;
  activeTab: string | null;
  handleTabClick: (tabId: string) => void;
  isPanelVisible: boolean;
  currentTranslateY: number;
  dragStartY: number;
  panelRef: React.RefObject<HTMLDivElement | null>;
  handleDragStart: (clientY: number) => void;
  handleDragMove: (clientY: number) => void;
  handleDragEnd: () => void;
  setIsPanelVisible: (v: boolean) => void;
  setCurrentTranslateY: (n: number) => void;
  setActiveTab: (tab: string | null) => void;
}

export function EditorSidebar({
  layersToolsPanel,
  backgroundImagePanel,
  textToolsPanel,
  aiEditPanel,
  logoToolsPanel,
  qrToolsPanel,
  shapeToolsPanel,
  frameToolsPanel,
  guidesAndGridPanel,
  sessionsListPanel,
  activeTab,
  handleTabClick,
  isPanelVisible,
  currentTranslateY,
  dragStartY,
  panelRef,
  handleDragStart,
  handleDragMove,
  handleDragEnd,
  setIsPanelVisible,
  setCurrentTranslateY,
  setActiveTab,
}: EditorSidebarProps) {
  return (
    <>
      <Accordion
        type="single"
        collapsible
        className="space-y-[5px] md:block hidden gap-[10px]"
      >
        {layersToolsPanel != null && (
          <AccordionItem value="layers" className="border-0">
            <Card className="border-0 shadow-sm bg-[#191919] p-0 transition-all hover:bg-[#1F1F1F] hover:shadow-lg">
              <CardContent className="p-0 bg-[#191919]">
                <AccordionTrigger className="py-[10px] px-[15px] hover:no-underline cursor-pointer items-center [&>svg]:text-white">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-[15px]">
                      <div className="w-[35px] h-[35px] bg-[#8B9DC3]/30 rounded-[8px] flex items-center justify-center transition-transform hover:scale-110">
                        <LayersItem />
                      </div>
                      <h2 className="font-bold text-white text-[14px] leading-[110%] font-(family-name:--font-manrope)">
                        Layers
                      </h2>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-[15px] pt-[10px] pb-[15px]">
                  {layersToolsPanel}
                </AccordionContent>
              </CardContent>
            </Card>
          </AccordionItem>
        )}

        {textToolsPanel != null && (
          <AccordionItem value="text-tools" className="border-0">
            <Card className="border-0 shadow-sm bg-[#191919] p-0 transition-all hover:bg-[#1F1F1F] hover:shadow-lg">
              <CardContent className="p-0 bg-[#191919]">
                <AccordionTrigger className="py-[10px] px-[15px] hover:no-underline cursor-pointer items-center [&>svg]:text-white">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-[15px]">
                      <div className="w-[35px] h-[35px] bg-[#C1C9FF] rounded-[8px] flex items-center justify-center transition-transform hover:scale-110">
                        <TextItem />
                      </div>
                      <h2 className="font-bold text-white text-[14px] leading-[110%] font-(family-name:--font-manrope)">
                        Text Tools
                      </h2>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-[15px] pt-[10px] pb-[15px]">
                  {textToolsPanel}
                </AccordionContent>
              </CardContent>
            </Card>
          </AccordionItem>
        )}

        {logoToolsPanel != null && (
          <AccordionItem value="logo-tools" className="border-0">
            <Card className="border-0 shadow-sm bg-[#191919] p-0 transition-all hover:bg-[#1F1F1F] hover:shadow-lg">
              <CardContent className="p-0 bg-[#191919]">
                <AccordionTrigger className="py-[10px] px-[15px] hover:no-underline cursor-pointer items-center bg-[#191919] [&>svg]:text-white">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-[15px]">
                      <div className="w-[35px] h-[35px] bg-[#FFCA9B] rounded-[8px] flex items-center justify-center transition-transform hover:scale-110">
                        <LogoItem />
                      </div>
                      <h2 className="font-bold text-white text-[14px] leading-[110%] font-(family-name:--font-manrope)">
                        Logo Overlay
                      </h2>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-[15px] pt-[10px] pb-[15px]">
                  {logoToolsPanel}
                </AccordionContent>
              </CardContent>
            </Card>
          </AccordionItem>
        )}

        {qrToolsPanel != null && (
          <AccordionItem value="qr-tools" className="border-0">
            <Card className="border-0 shadow-sm bg-[#191919] p-0 transition-all hover:bg-[#1F1F1F] hover:shadow-lg">
              <CardContent className="p-0 bg-[#191919]">
                <AccordionTrigger className="py-[10px] px-[15px] hover:no-underline cursor-pointer items-center [&>svg]:text-white">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-[15px]">
                      <div className="w-[35px] h-[35px] bg-[#D5B5FF] rounded-[8px] flex items-center justify-center transition-transform hover:scale-110">
                        <QRItem />
                      </div>
                      <h2 className="font-bold text-white text-[14px] leading-[110%] font-(family-name:--font-manrope)">
                        QR Code
                      </h2>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-[15px] pt-[10px] pb-[15px]">
                  {qrToolsPanel}
                </AccordionContent>
              </CardContent>
            </Card>
          </AccordionItem>
        )}

        {shapeToolsPanel != null && (
          <AccordionItem value="shape-tools" className="border-0">
            <Card className="border-0 shadow-sm bg-[#191919] p-0 transition-all hover:bg-[#1F1F1F] hover:shadow-lg">
              <CardContent className="p-0 bg-[#191919]">
                <AccordionTrigger className="py-[10px] px-[15px] hover:no-underline cursor-pointer items-center [&>svg]:text-white">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-[15px]">
                      <div className="w-[35px] h-[35px] bg-[#9BFFCA] rounded-[8px] flex items-center justify-center transition-transform hover:scale-110">
                        <ShapeItem />
                      </div>
                      <h2 className="font-bold text-white text-[14px] leading-[110%] font-(family-name:--font-manrope)">
                        Shape Tools
                      </h2>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-[15px] pt-[10px] pb-[15px]">
                  {shapeToolsPanel}
                </AccordionContent>
              </CardContent>
            </Card>
          </AccordionItem>
        )}

        {frameToolsPanel != null && (
          <AccordionItem value="frame-tools" className="border-0">
            <Card className="border-0 shadow-sm bg-[#191919] p-0 transition-all hover:bg-[#1F1F1F] hover:shadow-lg">
              <CardContent className="p-0 bg-[#191919]">
                <AccordionTrigger className="py-[10px] px-[15px] hover:no-underline cursor-pointer items-center [&>svg]:text-white">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-[15px]">
                      <div className="w-[35px] h-[35px] bg-[#A8F0D8] rounded-[8px] flex items-center justify-center transition-transform hover:scale-110">
                        <FrameItem />
                      </div>
                      <h2 className="font-bold text-white text-[14px] leading-[110%] font-(family-name:--font-manrope)">
                        Frames
                      </h2>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-[15px] pt-[10px] pb-[15px]">
                  {frameToolsPanel}
                </AccordionContent>
              </CardContent>
            </Card>
          </AccordionItem>
        )}

        {guidesAndGridPanel != null && (
          <AccordionItem value="guides-grid" className="border-0">
            <Card className="border-0 shadow-sm bg-[#191919] p-0 transition-all hover:bg-[#1F1F1F] hover:shadow-lg">
              <CardContent className="p-0 bg-[#191919]">
                <AccordionTrigger className="py-[10px] px-[15px] hover:no-underline cursor-pointer items-center [&>svg]:text-white">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-[15px]">
                      <div className="w-[35px] h-[35px] bg-[#6B7BA6]/40 rounded-[8px] flex items-center justify-center transition-transform hover:scale-110">
                        <Grid3X3 className="w-4 h-4 text-white" />
                      </div>
                      <h2 className="font-bold text-white text-[14px] leading-[110%] font-(family-name:--font-manrope)">
                        Guides &amp; grid
                      </h2>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-[15px] pt-[10px] pb-[15px]">
                  {guidesAndGridPanel}
                </AccordionContent>
              </CardContent>
            </Card>
          </AccordionItem>
        )}

        {sessionsListPanel != null && (
          <AccordionItem value="saved-versions" className="border-0">
            <Card className="border-0 shadow-sm bg-[#191919] p-0 transition-all hover:bg-[#1F1F1F] hover:shadow-lg">
              <CardContent className="p-0 bg-[#191919]">
                <AccordionTrigger className="py-[10px] px-[15px] hover:no-underline cursor-pointer items-center [&>svg]:text-white">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-[15px]">
                      <div className="w-[35px] h-[35px] bg-[#5C38F3]/50 rounded-[8px] flex items-center justify-center transition-transform hover:scale-110">
                        <Save className="w-4 h-4 text-white" />
                      </div>
                      <h2 className="font-bold text-white text-[14px] leading-[110%] font-(family-name:--font-manrope)">
                        Saved versions
                      </h2>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-[15px] pt-[10px] pb-[15px]">
                  {sessionsListPanel}
                </AccordionContent>
              </CardContent>
            </Card>
          </AccordionItem>
        )}

        {backgroundImagePanel != null && (
          <AccordionItem value="background-image" className="border-0">
            <Card className="border-0 shadow-sm bg-[#191919] p-0 transition-all hover:bg-[#1F1F1F] hover:shadow-lg">
              <CardContent className="p-0 bg-[#191919]">
                <AccordionTrigger className="py-[10px] px-[15px] hover:no-underline cursor-pointer items-center [&>svg]:text-white">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-[15px]">
                      <div className="w-[35px] h-[35px] bg-[#7B9FD4]/50 rounded-[8px] flex items-center justify-center transition-transform hover:scale-110">
                        <ImageIcon className="w-4 h-4 text-white" aria-hidden />
                      </div>
                      <h2 className="font-bold text-white text-[14px] leading-[110%] font-(family-name:--font-manrope)">
                        Background image
                      </h2>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-[15px] pt-[10px] pb-[15px]">
                  {backgroundImagePanel}
                </AccordionContent>
              </CardContent>
            </Card>
          </AccordionItem>
        )}

        {aiEditPanel != null && (
          <AccordionItem value="ai-edit" className="border-0">
            <Card className="border-0 shadow-sm bg-[#191919] p-0 transition-all hover:bg-[#1F1F1F] hover:shadow-lg">
              <CardContent className="p-0 bg-[#191919]">
                <AccordionTrigger className="py-[10px] px-[15px] hover:no-underline cursor-pointer items-center [&>svg]:text-white">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-[15px]">
                      <div className="w-[35px] h-[35px] bg-[#B38BF4] rounded-[8px] flex items-center justify-center transition-transform hover:scale-110">
                        <Sparkles className="w-4 h-4 text-[#3302FE]" aria-hidden />
                      </div>
                      <h2 className="font-bold text-white text-[14px] leading-[110%] font-(family-name:--font-manrope)">
                        Edit with AI
                      </h2>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-[15px] pt-[10px] pb-[15px]">
                  {aiEditPanel}
                </AccordionContent>
              </CardContent>
            </Card>
          </AccordionItem>
        )}
      </Accordion>

      {activeTab && (
        <>
          <div
            className={cn(
              "md:hidden fixed inset-0 bg-black/50 transition-opacity duration-300 z-[9]",
              isPanelVisible && currentTranslateY < 100
                ? "opacity-100"
                : "opacity-0 pointer-events-none"
            )}
            onClick={() => {
              setIsPanelVisible(false);
              setCurrentTranslateY(400);
              setActiveTab(null);
            }}
          />

          <aside
            ref={panelRef}
            className="md:hidden fixed bottom-[75px] left-0 w-full max-h-[70vh] transition-transform duration-300 ease-out bg-[#191919] z-10 rounded-[15px_15px_0px_0px] shadow-2xl overflow-hidden border-b border-[#535353]"
            style={{ transform: `translateY(${currentTranslateY}px)` }}
          >
            <div
              className="w-full pt-[12px] pb-[20px] cursor-grab active:cursor-grabbing touch-none"
              onMouseDown={(e) => handleDragStart(e.clientY)}
              onMouseMove={(e) => dragStartY !== 0 && handleDragMove(e.clientY)}
              onMouseUp={handleDragEnd}
              onMouseLeave={handleDragEnd}
              onTouchStart={(e) => handleDragStart(e.touches[0].clientY)}
              onTouchMove={(e) => handleDragMove(e.touches[0].clientY)}
              onTouchEnd={handleDragEnd}
            >
              <div className="w-full flex justify-center mb-[15px]">
                <div className="w-[50px] h-[4px] bg-[#3D3D3D] rounded-full" />
              </div>
            </div>

            <div className="px-[15px] pb-[30px] max-h-[calc(70vh-60px)] overflow-y-auto themed-scrollbar">
              {activeTab === "layers" && layersToolsPanel}
              {activeTab === "background-image" && backgroundImagePanel}
              {activeTab === "text-tools" && textToolsPanel}
              {activeTab === "ai-edit" && aiEditPanel}
              {activeTab === "logo-overlay" && logoToolsPanel}
              {activeTab === "qr-code" && qrToolsPanel}
              {activeTab === "shape-tools" && shapeToolsPanel}
              {activeTab === "frame-tools" && frameToolsPanel}
              {activeTab === "guides-grid" && guidesAndGridPanel}
              {activeTab === "saved-versions" && sessionsListPanel}
            </div>
          </aside>
        </>
      )}

      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-[#0D0D0D] pb-[env(safe-area-inset-bottom)] overflow-x-auto z-10 mobile-nav-scroll">
        <div className="flex items-center px-[10px] py-[10px] gap-[10px]">
          {layersToolsPanel != null && (
            <button
              onClick={() => handleTabClick("layers")}
              className={cn(
                "flex items-center gap-[10px] py-[8px] px-[8px] rounded-[10px] transition-all whitespace-nowrap cursor-pointer border border-[#191919]",
                activeTab === "layers" && isPanelVisible
                  ? "bg-[#383838] border-white"
                  : "bg-[#191919]"
              )}
            >
              <div className="w-[35px] h-[35px] bg-[#8B9DC3]/30 rounded-[8px] flex items-center justify-center flex-shrink-0">
                <LayersItem />
              </div>
              <span className="text-white text-[14px] font-medium leading-[110%] font-(family-name:--font-manrope)">
                Layers
              </span>
            </button>
          )}

          {textToolsPanel != null && (
            <button
              onClick={() => handleTabClick("text-tools")}
              className={cn(
                "flex items-center gap-[10px] py-[8px] px-[8px] rounded-[10px] transition-all whitespace-nowrap cursor-pointer border border-[#191919]",
                activeTab === "text-tools" && isPanelVisible
                  ? "bg-[#383838] border-white"
                  : "bg-[#191919]"
              )}
            >
              <div className="w-[35px] h-[35px] bg-[#C1C9FF] rounded-[8px] flex items-center justify-center flex-shrink-0">
                <TextItem />
              </div>
              <span className="text-white text-[14px] font-medium leading-[110%] font-(family-name:--font-manrope)">
                Text Tools
              </span>
            </button>
          )}

          {logoToolsPanel != null && (
            <button
              onClick={() => handleTabClick("logo-overlay")}
              className={cn(
                "flex items-center gap-[10px] py-[8px] px-[8px] rounded-[10px] transition-all whitespace-nowrap cursor-pointer border border-[#191919]",
                activeTab === "logo-overlay" && isPanelVisible
                  ? "bg-[#383838] border border-white"
                  : "bg-[#191919]"
              )}
            >
              <div className="w-[35px] h-[35px] bg-[#FFCA9B] rounded-[8px] flex items-center justify-center flex-shrink-0">
                <LogoItem />
              </div>
              <span className="text-white text-[14px] font-medium leading-[110%] font-(family-name:--font-manrope)">
                Logo Overlay
              </span>
            </button>
          )}

          {qrToolsPanel != null && (
            <button
              onClick={() => handleTabClick("qr-code")}
              className={cn(
                "flex items-center gap-[10px] py-[8px] px-[8px] rounded-[10px] transition-all whitespace-nowrap cursor-pointer border border-[#191919]",
                activeTab === "qr-code" && isPanelVisible
                  ? "bg-[#383838] border border-white"
                  : "bg-[#191919]"
              )}
            >
              <div className="w-[35px] h-[35px] bg-[#D5B5FF] rounded-[8px] flex items-center justify-center flex-shrink-0">
                <QRItem />
              </div>
              <span className="text-white text-[14px] font-medium leading-[110%] font-(family-name:--font-manrope)">
                QR Code
              </span>
            </button>
          )}

          {shapeToolsPanel != null && (
            <button
              onClick={() => handleTabClick("shape-tools")}
              className={cn(
                "flex items-center gap-[10px] py-[8px] px-[8px] rounded-[10px] transition-all whitespace-nowrap cursor-pointer border border-[#191919]",
                activeTab === "shape-tools" && isPanelVisible
                  ? "bg-[#383838] border border-white"
                  : "bg-[#191919]"
              )}
            >
              <div className="w-[35px] h-[35px] bg-[#9BFFCA] rounded-[8px] flex items-center justify-center flex-shrink-0">
                <ShapeItem />
              </div>
              <span className="text-white text-[14px] font-medium leading-[110%] font-(family-name:--font-manrope)">
                Shape Tools
              </span>
            </button>
          )}

          {frameToolsPanel != null && (
            <button
              onClick={() => handleTabClick("frame-tools")}
              className={cn(
                "flex items-center gap-[10px] py-[8px] px-[8px] rounded-[10px] transition-all whitespace-nowrap cursor-pointer border border-[#191919]",
                activeTab === "frame-tools" && isPanelVisible
                  ? "bg-[#383838] border border-white"
                  : "bg-[#191919]"
              )}
            >
              <div className="w-[35px] h-[35px] bg-[#A8F0D8] rounded-[8px] flex items-center justify-center flex-shrink-0">
                <FrameItem />
              </div>
              <span className="text-white text-[14px] font-medium leading-[110%] font-(family-name:--font-manrope)">
                Frames
              </span>
            </button>
          )}

          {guidesAndGridPanel != null && (
            <button
              onClick={() => handleTabClick("guides-grid")}
              className={cn(
                "flex items-center gap-[10px] py-[8px] px-[8px] rounded-[10px] transition-all whitespace-nowrap cursor-pointer border border-[#191919]",
                activeTab === "guides-grid" && isPanelVisible
                  ? "bg-[#383838] border-white"
                  : "bg-[#191919]"
              )}
            >
              <div className="w-[35px] h-[35px] bg-[#6B7BA6]/40 rounded-[8px] flex items-center justify-center flex-shrink-0">
                <Grid3X3 className="w-4 h-4 text-white" />
              </div>
              <span className="text-white text-[14px] font-medium leading-[110%] font-(family-name:--font-manrope)">
                Guides
              </span>
            </button>
          )}

          {sessionsListPanel != null && (
            <button
              onClick={() => handleTabClick("saved-versions")}
              className={cn(
                "flex items-center gap-[10px] py-[8px] px-[8px] rounded-[10px] transition-all whitespace-nowrap cursor-pointer border border-[#191919]",
                activeTab === "saved-versions" && isPanelVisible
                  ? "bg-[#383838] border-white"
                  : "bg-[#191919]"
              )}
            >
              <div className="w-[35px] h-[35px] bg-[#5C38F3]/50 rounded-[8px] flex items-center justify-center flex-shrink-0">
                <Save className="w-4 h-4 text-white" />
              </div>
              <span className="text-white text-[14px] font-medium leading-[110%] font-(family-name:--font-manrope)">
                Saved versions
              </span>
            </button>
          )}

          {backgroundImagePanel != null && (
            <button
              onClick={() => handleTabClick("background-image")}
              className={cn(
                "flex items-center gap-[10px] py-[8px] px-[8px] rounded-[10px] transition-all whitespace-nowrap cursor-pointer border border-[#191919]",
                activeTab === "background-image" && isPanelVisible
                  ? "bg-[#383838] border-white"
                  : "bg-[#191919]"
              )}
            >
              <div className="w-[35px] h-[35px] bg-[#7B9FD4]/50 rounded-[8px] flex items-center justify-center flex-shrink-0">
                <ImageIcon className="w-4 h-4 text-white" aria-hidden />
              </div>
              <span className="text-white text-[14px] font-medium leading-[110%] font-(family-name:--font-manrope)">
                Background
              </span>
            </button>
          )}

          {aiEditPanel != null && (
            <button
              onClick={() => handleTabClick("ai-edit")}
              className={cn(
                "flex items-center gap-[10px] py-[8px] px-[8px] rounded-[10px] transition-all whitespace-nowrap cursor-pointer border border-[#191919]",
                activeTab === "ai-edit" && isPanelVisible
                  ? "bg-[#383838] border border-white"
                  : "bg-[#191919]"
              )}
            >
              <div className="w-[35px] h-[35px] bg-[#B38BF4] rounded-[8px] flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-[#3302FE]" aria-hidden />
              </div>
              <span className="text-white text-[14px] font-medium leading-[110%] font-(family-name:--font-manrope)">
                Edit with AI
              </span>
            </button>
          )}
        </div>
      </nav>
    </>
  );
}
