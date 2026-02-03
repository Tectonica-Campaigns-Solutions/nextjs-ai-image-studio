"use client";

import { useState, useRef } from "react";

export function useMobilePanel() {
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [isPanelVisible, setIsPanelVisible] = useState<boolean>(true);
  const [dragStartY, setDragStartY] = useState<number>(0);
  const [currentTranslateY, setCurrentTranslateY] = useState<number>(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (clientY: number) => {
    setDragStartY(clientY);
  };

  const handleDragMove = (clientY: number) => {
    if (dragStartY === 0) return;
    const deltaY = clientY - dragStartY;
    if (deltaY > 0) {
      setCurrentTranslateY(Math.min(deltaY, 400));
    }
  };

  const handleDragEnd = () => {
    if (currentTranslateY > 100) {
      setIsPanelVisible(false);
      setCurrentTranslateY(400);
      setActiveTab(null);
    } else {
      setCurrentTranslateY(0);
    }
    setDragStartY(0);
  };

  const handleTabClick = (tabId: string) => {
    if (activeTab === tabId) {
      setIsPanelVisible(!isPanelVisible);
      setCurrentTranslateY(isPanelVisible ? 400 : 0);
      setActiveTab(null);
    } else {
      setActiveTab(tabId);
      if (!isPanelVisible) {
        setIsPanelVisible(true);
        setCurrentTranslateY(0);
      }
    }
  };

  return {
    activeTab,
    setActiveTab,
    isPanelVisible,
    setIsPanelVisible,
    dragStartY,
    currentTranslateY,
    setCurrentTranslateY,
    panelRef,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    handleTabClick,
  };
}
