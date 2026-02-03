"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import type { HistoryState } from "../types/image-editor-types";

export interface EditorToolbarProps {
  undo: () => void;
  redo: () => void;
  deleteSelected: () => void;
  handleExportClick: () => void;
  isExporting: boolean;
  historyState: HistoryState;
  selectedObject: any;
  /** When true, show mobile layout (inline buttons with labels); when false, desktop (icon-only column) */
  variant: "mobile" | "desktop";
}

const UndoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M1.62115 11.25C2.63914 14.4439 5.55463 16.75 8.99242 16.75C13.2768 16.75 16.75 13.1683 16.75 8.75C16.75 4.33172 13.2768 0.75 8.99242 0.75C6.12103 0.75 3.61399 2.35879 2.27267 4.75M4.62879 5.75H0.75V1.75" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const RedoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M15.8788 11.25C14.8609 14.4439 11.9454 16.75 8.50758 16.75C4.22318 16.75 0.75 13.1683 0.75 8.75C0.75 4.33172 4.22318 0.75 8.50758 0.75C11.379 0.75 13.886 2.35879 15.2273 4.75M12.8712 5.75H16.75V1.75" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const DeleteIcon = ({ size = 22 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 22 22" fill="none">
    <path d="M3.6665 5.66176H18.3332M9.1665 15.3676V9.54412M12.8332 15.3676V9.54412M14.6665 19.25H7.33317C6.32065 19.25 5.49984 18.3809 5.49984 17.3088V6.63235C5.49984 6.09631 5.91024 5.66176 6.4165 5.66176H15.5832C16.0894 5.66176 16.4998 6.09631 16.4998 6.63235V17.3088C16.4998 18.3809 15.679 19.25 14.6665 19.25ZM9.1665 5.66176H12.8332C13.3394 5.66176 13.7498 5.22722 13.7498 4.69118V3.72059C13.7498 3.18455 13.3394 2.75 12.8332 2.75H9.1665C8.66024 2.75 8.24984 3.18455 8.24984 3.72059V4.69118C8.24984 5.22722 8.66024 5.66176 9.1665 5.66176Z" stroke="#FF0022" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export function EditorToolbar({
  undo,
  redo,
  deleteSelected,
  handleExportClick,
  isExporting,
  historyState,
  selectedObject,
  variant,
}: EditorToolbarProps) {
  const undoDisabled = historyState.currentIndex <= 0;
  const redoDisabled =
    historyState.currentIndex >= historyState.entries.length - 1;

  if (variant === "mobile") {
    return (
      <div className="flex items-center justify-center flex-wrap gap-[10px] mb-20 py-[15px] px-[20px] bg-[#191919] rounded-[10px] md:max-w-fit max-w-[270px] mx-auto transition-all hover:bg-[#1F1F1F] md:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={undo}
          disabled={undoDisabled}
          className="h-[44px] md:w-auto w-[54px] px-[15px] py-[10px] flex items-center justify-center gap-[5px] rounded-[10px] border-0 bg-[#ffffff1a] text-white text-[15px]! font-semibold leading-[160%] font-(family-name:--font-manrope) cursor-pointer disabled:cursor-not-allowed flex-1 md:flex-none transition-all hover:bg-[#ffffff2a] disabled:hover:bg-[#ffffff1a] disabled:hover:scale-100"
        >
          <UndoIcon />
          <span className="md:inline-block hidden">Undo</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={redo}
          disabled={redoDisabled}
          className="h-[44px] md:w-auto w-[54px] px-[15px] py-[10px] flex items-center justify-center gap-[5px] rounded-[10px] border-0 bg-[#ffffff1a] text-white text-[15px]! font-semibold leading-[160%] font-(family-name:--font-manrope) cursor-pointer disabled:cursor-not-allowed flex-1 md:flex-none transition-all hover:bg-[#ffffff2a] disabled:hover:bg-[#ffffff1a] disabled:hover:scale-100"
        >
          <RedoIcon />
          <span className="md:inline-block hidden">Redo</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={deleteSelected}
          disabled={!selectedObject}
          className="h-[44px] w-[54px] px-[15px] py-[10px] flex items-center justify-center gap-[5px] rounded-[10px] border-0 bg-[#FFC9D3] text-white text-[15px]! font-semibold leading-[160%] font-(family-name:--font-manrope) cursor-pointer disabled:cursor-not-allowed flex-1 md:flex-none transition-all hover:bg-[#FFC9D3]/80 disabled:hover:bg-[#FFC9D3] disabled:hover:scale-100"
        >
          <DeleteIcon size={22} />
        </Button>
        <Button
          onClick={handleExportClick}
          disabled={isExporting}
          className="bg-[#5C38F3] text-white shadow-md cursor-pointer text-[15px] leading-[160%] font-semibold font-(family-name:--font-manrope) border-none rounded-[10px] h-[44px] flex items-center justify-center gap-[5px] basis-full md:basis-auto transition-all hover:bg-[#4A2DD1] hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#5C38F3] disabled:hover:scale-100"
        >
          <Download className="w-4 h-4" />
          {isExporting ? "Exporting..." : "Download"}
        </Button>
      </div>
    );
  }

  return (
    <div className="hidden md:flex flex-col gap-[10px] shrink-0 md:self-start">
      <Button
        variant="outline"
        size="sm"
        onClick={undo}
        disabled={undoDisabled}
        className="h-[44px] w-[54px] px-[15px] py-[10px] flex items-center justify-center gap-[5px] rounded-[10px] border-0 bg-[#ffffff1a] text-white text-[15px]! font-semibold leading-[160%] font-(family-name:--font-manrope) cursor-pointer disabled:cursor-not-allowed transition-all hover:bg-[#ffffff2a] disabled:hover:bg-[#ffffff1a] disabled:hover:scale-100"
      >
        <UndoIcon />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={redo}
        disabled={redoDisabled}
        className="h-[44px] w-[54px] px-[15px] py-[10px] flex items-center justify-center gap-[5px] rounded-[10px] border-0 bg-[#ffffff1a] text-white text-[15px]! font-semibold leading-[160%] font-(family-name:--font-manrope) cursor-pointer disabled:cursor-not-allowed transition-all hover:bg-[#ffffff2a] disabled:hover:bg-[#ffffff1a] disabled:hover:scale-100"
      >
        <RedoIcon />
      </Button>
      <Button
        onClick={handleExportClick}
        disabled={isExporting}
        className="bg-[#5C38F3] text-white shadow-md cursor-pointer text-[15px] leading-[160%] font-semibold font-(family-name:--font-manrope) border-none rounded-[10px] flex items-center justify-center gap-[5px] transition-all hover:bg-[#4A2DD1] hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#5C38F3] disabled:hover:scale-100 h-[44px] w-[54px] px-[15px] py-[10px]"
      >
        <Download className="w-4 h-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={deleteSelected}
        disabled={!selectedObject}
        className="h-[44px] w-[54px] px-[15px] py-[10px] flex items-center justify-center gap-[5px] rounded-[10px] border-0 bg-[#FFC9D3] text-white text-[15px]! font-semibold leading-[160%] font-(family-name:--font-manrope) cursor-pointer disabled:cursor-not-allowed transition-all hover:bg-[#FFC9D3]/80 disabled:hover:bg-[#FFC9D3] disabled:hover:scale-100"
      >
        <DeleteIcon size={17} />
      </Button>
    </div>
  );
}
