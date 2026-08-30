import React, { useRef, useState } from 'react';
import {
  Undo2, Redo2, Copy, Check, Camera, Image as ImageIcon,
  Download, Eye, SplitSquareVertical, Sparkles, Upload,
  RotateCcw, Menu, X, ChevronRight, Sliders, Info
} from 'lucide-react';
import { MediaItem } from '../types';
import { soundFx } from '../utils/audio';

interface EditorHeaderProps {
  currentMedia: MediaItem | null;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onReset: () => void;
  compareMode: 'none' | 'split' | 'hold';
  onToggleCompareSplit: () => void;
  onHoldCompareStart: () => void;
  onHoldCompareEnd: () => void;
  onCopyRecipe: () => void;
  onPasteRecipe: () => void;
  hasCopiedRecipe: boolean;
  onOpenMediaLibrary: () => void;
  onOpenCamera: () => void;
  onOpenExport: () => void;
  onImportMediaFile?: (file: File) => void;
}

export const EditorHeader: React.FC<EditorHeaderProps> = ({
  currentMedia,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onReset,
  compareMode,
  onToggleCompareSplit,
  onHoldCompareStart,
  onHoldCompareEnd,
  onCopyRecipe,
  onPasteRecipe,
  hasCopiedRecipe,
  onOpenMediaLibrary,
  onOpenCamera,
  onOpenExport,
  onImportMediaFile,
}) => {
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [isHamburgerOpen, setIsHamburgerOpen] = useState(false);
  const mediaFileInputRef = useRef<HTMLInputElement>(null);

  const handleCopy = () => {
    onCopyRecipe();
    soundFx.playHapticTick();
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  const handleMediaFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && onImportMediaFile) {
      onImportMediaFile(e.target.files[0]);
    }
    e.target.value = '';
    setIsHamburgerOpen(false);
  };

  const closeHamburger = () => {
    setIsHamburgerOpen(false);
  };

  return (
    <>
      {/* Hidden Native File Input for direct photo/video import */}
      <input
        ref={mediaFileInputRef}
        type="file"
        accept="image/*,video/*,.heic,.heif,.jpg,.jpeg,.png,.webp,.gif,.mp4,.mov,.webm"
        onChange={handleMediaFileChange}
        className="hidden"
      />

      <header className="w-full bg-white/95 backdrop-blur-md border-b border-[#E6E2D3] px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 z-30 select-none relative shadow-xs">
        {/* ========================================================= */}
        {/* 1. DESKTOP & TABLET TOP BAR (md:flex, hidden on mobile) */}
        {/* ========================================================= */}
        <div className="hidden md:flex items-center justify-between gap-3">
          {/* Brand & Media Badge */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div
              className="flex items-center gap-2 cursor-pointer py-1 group"
              onClick={onOpenMediaLibrary}
            >
              <span className="font-editorial text-lg lg:text-xl tracking-[0.2em] font-bold text-[#2A2723] group-hover:text-black transition-colors">
                LRSTUDIO
              </span>
              <span className="text-[9px] tracking-wider text-[#7E7365] font-bold uppercase px-1.5 py-0.5 rounded-full bg-[#FAF9F6] border border-[#E6E2D3]">
                PRO
              </span>
            </div>

            {currentMedia && (
              <button
                onClick={onOpenMediaLibrary}
                className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#FAF9F6] hover:bg-[#F0EEE6] border border-[#E6E2D3] text-xs text-[#4A453E] transition-colors max-w-[170px]"
                title="Switch or browse media library"
              >
                <ImageIcon className="w-3.5 h-3.5 text-[#2A2723] flex-shrink-0" />
                <span className="truncate">{currentMedia.name}</span>
              </button>
            )}
          </div>

          {/* Center Quick Tool Actions (Undo, Redo, Compare, Recipe) */}
          <div className="flex items-center gap-1.5">
            {/* Undo */}
            <button
              onClick={() => { onUndo(); soundFx.playHapticTick(); }}
              disabled={!canUndo}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                canUndo ? 'text-[#2A2723] hover:bg-[#F0EEE6] active:scale-95' : 'text-[#C5BDB2] opacity-40 cursor-not-allowed'
              }`}
              title="Undo"
            >
              <Undo2 className="w-4 h-4" />
            </button>

            {/* Redo */}
            <button
              onClick={() => { onRedo(); soundFx.playHapticTick(); }}
              disabled={!canRedo}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                canRedo ? 'text-[#2A2723] hover:bg-[#F0EEE6] active:scale-95' : 'text-[#C5BDB2] opacity-40 cursor-not-allowed'
              }`}
              title="Redo"
            >
              <Redo2 className="w-4 h-4" />
            </button>

            <div className="h-4 w-[1px] bg-[#E6E2D3] mx-1" />

            {/* Split Screen Compare */}
            <button
              onClick={() => { onToggleCompareSplit(); soundFx.playHapticTick(); }}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                compareMode === 'split'
                  ? 'bg-[#2A2723] text-white shadow-xs'
                  : 'text-[#4A453E] hover:bg-[#F0EEE6] border border-[#E6E2D3]'
              }`}
              title="Toggle Split Compare"
            >
              <SplitSquareVertical className="w-3.5 h-3.5" />
              <span>Split</span>
            </button>

            {/* Hold Compare */}
            <button
              onMouseDown={onHoldCompareStart}
              onMouseUp={onHoldCompareEnd}
              onMouseLeave={onHoldCompareEnd}
              onTouchStart={onHoldCompareStart}
              onTouchEnd={onHoldCompareEnd}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border border-[#E6E2D3] transition-all select-none ${
                compareMode === 'hold'
                  ? 'bg-[#2A2723] text-white ring-2 ring-[#2A2723]'
                  : 'text-[#4A453E] hover:bg-[#F0EEE6]'
              }`}
              title="Hold to see original unedited image"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Hold</span>
            </button>

            {/* Copy Recipe */}
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 p-2 rounded-full text-[#7E7365] hover:text-[#2A2723] hover:bg-[#F0EEE6] transition-colors"
              title="Copy Recipe"
            >
              {copiedNotification ? <Check className="w-4 h-4 text-[#437A47]" /> : <Copy className="w-4 h-4" />}
            </button>

            {/* Paste Recipe */}
            {hasCopiedRecipe && (
              <button
                onClick={() => { onPasteRecipe(); soundFx.playHapticTick(); }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FAF9F6] hover:bg-[#F0EEE6] text-xs text-[#2A2723] border border-[#E6E2D3] transition-colors"
                title="Paste Copied Recipe"
              >
                <Sparkles className="w-3 h-3 text-[#2A2723]" />
                <span className="text-[11px] font-medium">Paste</span>
              </button>
            )}
          </div>

          {/* Right Primary Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Import Media */}
            <button
              onClick={() => {
                if (mediaFileInputRef.current) {
                  mediaFileInputRef.current.click();
                  soundFx.playHapticTick();
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-[#FAF9F6] border border-[#2A2723]/30 text-xs font-semibold text-[#2A2723] shadow-xs active:scale-95 transition-all"
              title="Import Photo or Video from device"
            >
              <Upload className="w-3.5 h-3.5 text-[#2A2723]" />
              <span>Import</span>
            </button>

            {/* Camera */}
            <button
              onClick={() => { onOpenCamera(); soundFx.playHapticTick(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-[#FAF9F6] border border-[#E6E2D3] text-xs font-medium text-[#2A2723] shadow-xs active:scale-95 transition-all"
              title="Open Live WebGL Camera"
            >
              <Camera className="w-3.5 h-3.5 text-[#2A2723]" />
              <span>Camera</span>
            </button>

            {/* Library */}
            <button
              onClick={() => { onOpenMediaLibrary(); soundFx.playHapticTick(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-[#FAF9F6] border border-[#E6E2D3] text-xs font-medium text-[#2A2723] shadow-xs active:scale-95 transition-all"
              title="Open Curated Media Library"
            >
              <ImageIcon className="w-3.5 h-3.5 text-[#2A2723]" />
              <span>Library</span>
            </button>

            {/* Save / Export */}
            <button
              onClick={() => { onOpenExport(); soundFx.playHapticTick(); }}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#2A2723] hover:bg-black text-white font-semibold text-xs tracking-wider shadow-sm transition-all active:scale-95 cursor-pointer"
              title="Save and Export Image/Video"
            >
              <Download className="w-3.5 h-3.5 stroke-[2.4]" />
              <span>Save</span>
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 2. COLLAPSED MOBILE TOP BAR WITH HAMBURGER MENU (md:hidden) */}
        {/* ========================================================= */}
        <div className="flex md:hidden items-center justify-between gap-2">
          {/* Left: Compact Brand + Media badge */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsHamburgerOpen(true);
                soundFx.playHapticTick();
              }}
              className="flex items-center gap-1.5 text-left focus:outline-none"
            >
              <span className="font-editorial text-base tracking-[0.16em] font-bold text-[#2A2723]">
                LRSTUDIO
              </span>
              <span className="text-[8px] tracking-wider text-[#7E7365] font-bold uppercase px-1.5 py-0.5 rounded-full bg-[#FAF9F6] border border-[#E6E2D3]">
                PRO
              </span>
            </button>

            {currentMedia && (
              <button
                onClick={() => {
                  onOpenMediaLibrary();
                  soundFx.playHapticTick();
                }}
                className="hidden xs:flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FAF9F6] border border-[#E6E2D3] text-[10px] text-[#4A453E] max-w-[100px] truncate"
                title="Current Media"
              >
                <ImageIcon className="w-2.5 h-2.5 flex-shrink-0 text-[#7E7365]" />
                <span className="truncate">{currentMedia.name}</span>
              </button>
            )}
          </div>

          {/* Center/Right: Quick Undo/Redo & Save + Collapsed Hamburger Button */}
          <div className="flex items-center gap-1.5">
            {/* Compact Undo / Redo */}
            <div className="flex items-center bg-[#FAF9F6] rounded-full border border-[#E6E2D3] p-0.5">
              <button
                onClick={() => { onUndo(); soundFx.playHapticTick(); }}
                disabled={!canUndo}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                  canUndo ? 'text-[#2A2723] active:bg-[#E6E2D3]' : 'text-[#C5BDB2] opacity-40'
                }`}
                title="Undo"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => { onRedo(); soundFx.playHapticTick(); }}
                disabled={!canRedo}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                  canRedo ? 'text-[#2A2723] active:bg-[#E6E2D3]' : 'text-[#C5BDB2] opacity-40'
                }`}
                title="Redo"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Export/Save */}
            <button
              onClick={() => { onOpenExport(); soundFx.playHapticTick(); }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[#2A2723] hover:bg-black text-white font-semibold text-xs shadow-xs active:scale-95 transition-transform"
              title="Save Image"
            >
              <Download className="w-3.5 h-3.5 stroke-[2.2]" />
              <span className="text-[11px]">Save</span>
            </button>

            {/* Collapsed Hamburger Menu Trigger */}
            <button
              onClick={() => {
                setIsHamburgerOpen(!isHamburgerOpen);
                soundFx.playHapticTick();
              }}
              className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all ${
                isHamburgerOpen
                  ? 'bg-[#2A2723] text-white border-[#2A2723] shadow-sm'
                  : 'bg-white hover:bg-[#FAF9F6] text-[#2A2723] border-[#E6E2D3] shadow-xs active:scale-95'
              }`}
              aria-label="Toggle Navigation Menu"
              title={isHamburgerOpen ? 'Close Menu' : 'Open Menu'}
            >
              {isHamburgerOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 3. COLLAPSED MOBILE HAMBURGER MENU DRAWER / SLIDE-OVER */}
      {/* ========================================================= */}
      {isHamburgerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop Blur Overlay */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={closeHamburger}
          />

          {/* Drawer Container (Top-Down Slide) */}
          <div className="relative bg-white border-b border-[#E6E2D3] shadow-2xl w-full max-h-[85vh] overflow-y-auto z-10 animate-in slide-in-from-top-4 duration-200 flex flex-col p-4 gap-4">
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#F0EEE6]">
              <div className="flex items-center gap-2">
                <span className="font-editorial text-lg tracking-[0.18em] font-bold text-[#2A2723]">
                  LRSTUDIO
                </span>
                <span className="text-[9px] tracking-wider text-[#7E7365] font-bold uppercase px-1.5 py-0.5 rounded-full bg-[#FAF9F6] border border-[#E6E2D3]">
                  PRO MENU
                </span>
              </div>

              <button
                onClick={() => {
                  closeHamburger();
                  soundFx.playHapticTick();
                }}
                className="w-8 h-8 rounded-full bg-[#FAF9F6] border border-[#E6E2D3] text-[#2A2723] flex items-center justify-center hover:bg-[#F0EEE6] active:scale-95"
                aria-label="Close Hamburger Menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Active Media Card */}
            {currentMedia && (
              <div className="flex items-center justify-between p-2.5 bg-[#FAF9F6] rounded-xl border border-[#E6E2D3]">
                <div className="flex items-center gap-2.5 truncate">
                  <div className="w-8 h-8 rounded-lg bg-white border border-[#E6E2D3] flex items-center justify-center flex-shrink-0">
                    <ImageIcon className="w-4 h-4 text-[#2A2723]" />
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-semibold text-[#2A2723] truncate">
                      {currentMedia.name}
                    </div>
                    <div className="text-[10px] text-[#7E7365]">
                      {currentMedia.type === 'video' ? 'Video asset' : 'Photo asset'} • {currentMedia.aspectRatio.toFixed(2)} ratio
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    onOpenMediaLibrary();
                    closeHamburger();
                    soundFx.playHapticTick();
                  }}
                  className="text-[11px] font-medium text-[#2A2723] bg-white px-2.5 py-1 rounded-lg border border-[#E6E2D3] hover:bg-[#F0EEE6] flex-shrink-0"
                >
                  Change
                </button>
              </div>
            )}

            {/* Section 1: Media Inputs & Camera */}
            <div>
              <div className="text-[10px] font-bold tracking-wider text-[#7E7365] uppercase mb-2">
                Media & Import
              </div>
              <div className="grid grid-cols-3 gap-2">
                {/* Import File */}
                <button
                  onClick={() => {
                    if (mediaFileInputRef.current) {
                      mediaFileInputRef.current.click();
                      soundFx.playHapticTick();
                    }
                  }}
                  className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#FAF9F6] hover:bg-white border border-[#E6E2D3] active:scale-95 transition-all text-center gap-1.5"
                >
                  <div className="w-7 h-7 rounded-full bg-white border border-[#E6E2D3] flex items-center justify-center">
                    <Upload className="w-3.5 h-3.5 text-[#2A2723]" />
                  </div>
                  <span className="text-xs font-semibold text-[#2A2723]">Import File</span>
                  <span className="text-[9px] text-[#7E7365]">From Device</span>
                </button>

                {/* Open WebGL Camera */}
                <button
                  onClick={() => {
                    onOpenCamera();
                    closeHamburger();
                    soundFx.playHapticTick();
                  }}
                  className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#FAF9F6] hover:bg-white border border-[#E6E2D3] active:scale-95 transition-all text-center gap-1.5"
                >
                  <div className="w-7 h-7 rounded-full bg-white border border-[#E6E2D3] flex items-center justify-center">
                    <Camera className="w-3.5 h-3.5 text-[#2A2723]" />
                  </div>
                  <span className="text-xs font-semibold text-[#2A2723]">Live Camera</span>
                  <span className="text-[9px] text-[#7E7365]">WebGL View</span>
                </button>

                {/* Media Library */}
                <button
                  onClick={() => {
                    onOpenMediaLibrary();
                    closeHamburger();
                    soundFx.playHapticTick();
                  }}
                  className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#FAF9F6] hover:bg-white border border-[#E6E2D3] active:scale-95 transition-all text-center gap-1.5"
                >
                  <div className="w-7 h-7 rounded-full bg-white border border-[#E6E2D3] flex items-center justify-center">
                    <ImageIcon className="w-3.5 h-3.5 text-[#2A2723]" />
                  </div>
                  <span className="text-xs font-semibold text-[#2A2723]">Media Library</span>
                  <span className="text-[9px] text-[#7E7365]">Curated Gallery</span>
                </button>
              </div>
            </div>

            {/* Section 2: Compare & View Tools */}
            <div>
              <div className="text-[10px] font-bold tracking-wider text-[#7E7365] uppercase mb-2">
                Canvas Inspection & Compare
              </div>
              <div className="grid grid-cols-2 gap-2">
                {/* Split Screen Toggle */}
                <button
                  onClick={() => {
                    onToggleCompareSplit();
                    soundFx.playHapticTick();
                  }}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                    compareMode === 'split'
                      ? 'bg-[#2A2723] text-white border-[#2A2723]'
                      : 'bg-[#FAF9F6] hover:bg-white text-[#2A2723] border-[#E6E2D3]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <SplitSquareVertical className="w-4 h-4" />
                    <div className="text-left">
                      <div className="text-xs font-semibold">Split Screen</div>
                      <div className={`text-[10px] ${compareMode === 'split' ? 'text-neutral-300' : 'text-[#7E7365]'}`}>
                        Before / After
                      </div>
                    </div>
                  </div>
                  <div className={`w-2.5 h-2.5 rounded-full ${compareMode === 'split' ? 'bg-white' : 'border border-[#7E7365]'}`} />
                </button>

                {/* Hold to View Original */}
                <button
                  onMouseDown={onHoldCompareStart}
                  onMouseUp={onHoldCompareEnd}
                  onMouseLeave={onHoldCompareEnd}
                  onTouchStart={onHoldCompareStart}
                  onTouchEnd={onHoldCompareEnd}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all select-none ${
                    compareMode === 'hold'
                      ? 'bg-[#2A2723] text-white border-[#2A2723]'
                      : 'bg-[#FAF9F6] hover:bg-white text-[#2A2723] border-[#E6E2D3]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Eye className="w-4 h-4" />
                    <div className="text-left">
                      <div className="text-xs font-semibold">Hold Original</div>
                      <div className={`text-[10px] ${compareMode === 'hold' ? 'text-neutral-300' : 'text-[#7E7365]'}`}>
                        Press to preview
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Section 3: Recipes & State Management */}
            <div>
              <div className="text-[10px] font-bold tracking-wider text-[#7E7365] uppercase mb-2">
                Preset Recipes & Edits
              </div>
              <div className="grid grid-cols-2 gap-2">
                {/* Copy Recipe */}
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-[#FAF9F6] hover:bg-white border border-[#E6E2D3] text-xs font-medium text-[#2A2723]"
                >
                  {copiedNotification ? (
                    <>
                      <Check className="w-4 h-4 text-[#437A47]" />
                      <span className="text-[#437A47] font-semibold">Recipe Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-[#7E7365]" />
                      <span>Copy Recipe</span>
                    </>
                  )}
                </button>

                {/* Paste Recipe */}
                <button
                  onClick={() => {
                    if (hasCopiedRecipe) {
                      onPasteRecipe();
                      closeHamburger();
                      soundFx.playHapticTick();
                    }
                  }}
                  disabled={!hasCopiedRecipe}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-colors ${
                    hasCopiedRecipe
                      ? 'bg-[#2A2723] text-white border-[#2A2723]'
                      : 'bg-[#FAF9F6] text-[#C5BDB2] border-[#E6E2D3] opacity-60 cursor-not-allowed'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Paste Recipe</span>
                </button>
              </div>
            </div>

            {/* Footer Primary Buttons */}
            <div className="pt-2 border-t border-[#F0EEE6] flex items-center gap-2">
              <button
                onClick={() => {
                  onReset();
                  closeHamburger();
                  soundFx.playHapticTick();
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#FAF9F6] hover:bg-[#F0EEE6] border border-[#E6E2D3] text-xs font-medium text-[#7E7365] hover:text-[#2A2723] transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset All Adjustments</span>
              </button>

              <button
                onClick={() => {
                  onOpenExport();
                  closeHamburger();
                  soundFx.playHapticTick();
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#2A2723] hover:bg-black text-white text-xs font-semibold tracking-wider shadow-sm active:scale-95 transition-all"
              >
                <Download className="w-3.5 h-3.5 stroke-[2.4]" />
                <span>Export High-Res</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
