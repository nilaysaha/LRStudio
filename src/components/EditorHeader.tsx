import React, { useRef, useState } from 'react';
import {
  Undo2, Redo2, Copy, Check, Camera, Image as ImageIcon,
  Download, Eye, SplitSquareVertical, Sparkles, Upload,
  RotateCcw, Menu, X, SlidersHorizontal, ArrowRight, Layers
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="w-full bg-white/95 backdrop-blur-md border-b border-[#E6E2D3] px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 z-30 select-none relative shadow-xs">
      {/* Hidden Native File Input for direct photo/video import */}
      <input
        ref={mediaFileInputRef}
        type="file"
        accept="image/*,video/*,.heic,.heif,.jpg,.jpeg,.png,.webp,.gif,.mp4,.mov,.webm"
        onChange={handleMediaFileChange}
        className="hidden"
      />

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
      {/* 2. COMPRESSED MOBILE TOP BAR (md:hidden, for mobile screens) */}
      {/* ========================================================= */}
      <div className="flex md:hidden items-center justify-between gap-2">
        {/* Left: Compact Brand & Current Media badge */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div
            className="flex items-center gap-1.5 cursor-pointer"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <span className="font-editorial text-base tracking-[0.16em] font-bold text-[#2A2723]">
              LRSTUDIO
            </span>
            <span className="text-[8px] tracking-wider text-[#7E7365] font-bold uppercase px-1 py-0.2 rounded-full bg-[#FAF9F6] border border-[#E6E2D3]">
              PRO
            </span>
          </div>
        </div>

        {/* Center: Essential Undo / Redo */}
        <div className="flex items-center gap-1 bg-[#FAF9F6] px-1.5 py-0.5 rounded-full border border-[#E6E2D3]">
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

        {/* Right: Quick Save + Compressed Menu Button */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => { onOpenExport(); soundFx.playHapticTick(); }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#2A2723] hover:bg-black text-white font-semibold text-xs tracking-wider shadow-xs active:scale-95"
            title="Save Image/Video"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>Save</span>
          </button>

          {/* Compressed Menu Toggle Button */}
          <button
            onClick={() => {
              setIsMobileMenuOpen(!isMobileMenuOpen);
              soundFx.playHapticTick();
            }}
            className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all ${
              isMobileMenuOpen
                ? 'bg-[#2A2723] text-white border-[#2A2723] shadow-sm'
                : 'bg-white hover:bg-[#FAF9F6] text-[#2A2723] border-[#E6E2D3]'
            }`}
            title={isMobileMenuOpen ? 'Close Menu' : 'Open Mobile Menu'}
          >
            {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. COMPRESSED MOBILE MENU DRAWER / ACTION SHEET */}
      {/* ========================================================= */}
      {isMobileMenuOpen && (
        <div className="md:hidden mt-2 pt-3 pb-2 border-t border-[#E6E2D3] animate-in fade-in slide-in-from-top-2 duration-200 flex flex-col gap-3">
          {/* Active File Banner */}
          {currentMedia && (
            <div className="flex items-center justify-between px-3 py-2 bg-[#FAF9F6] rounded-xl border border-[#E6E2D3]">
              <div className="flex items-center gap-2 truncate">
                <ImageIcon className="w-3.5 h-3.5 text-[#2A2723] flex-shrink-0" />
                <span className="text-xs font-medium text-[#2A2723] truncate">
                  {currentMedia.name}
                </span>
              </div>
              <span className="text-[10px] text-[#7E7365] uppercase font-mono px-1.5 py-0.5 rounded bg-white border border-[#E6E2D3]">
                {currentMedia.type}
              </span>
            </div>
          )}

          {/* Category 1: Media Capture & Import */}
          <div>
            <div className="text-[10px] font-bold tracking-wider text-[#7E7365] uppercase px-1 mb-1.5">
              Media & Input
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {/* Import from device */}
              <button
                onClick={() => {
                  if (mediaFileInputRef.current) {
                    mediaFileInputRef.current.click();
                    soundFx.playHapticTick();
                  }
                }}
                className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-white border border-[#E6E2D3] hover:bg-[#FAF9F6] active:scale-95 transition-all text-center gap-1"
              >
                <Upload className="w-4 h-4 text-[#2A2723]" />
                <span className="text-[11px] font-semibold text-[#2A2723]">Import</span>
                <span className="text-[9px] text-[#7E7365]">Device File</span>
              </button>

              {/* Open Camera */}
              <button
                onClick={() => {
                  onOpenCamera();
                  setIsMobileMenuOpen(false);
                  soundFx.playHapticTick();
                }}
                className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-white border border-[#E6E2D3] hover:bg-[#FAF9F6] active:scale-95 transition-all text-center gap-1"
              >
                <Camera className="w-4 h-4 text-[#2A2723]" />
                <span className="text-[11px] font-semibold text-[#2A2723]">Camera</span>
                <span className="text-[9px] text-[#7E7365]">Live WebGL</span>
              </button>

              {/* Media Library */}
              <button
                onClick={() => {
                  onOpenMediaLibrary();
                  setIsMobileMenuOpen(false);
                  soundFx.playHapticTick();
                }}
                className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-white border border-[#E6E2D3] hover:bg-[#FAF9F6] active:scale-95 transition-all text-center gap-1"
              >
                <ImageIcon className="w-4 h-4 text-[#2A2723]" />
                <span className="text-[11px] font-semibold text-[#2A2723]">Library</span>
                <span className="text-[9px] text-[#7E7365]">Curated Media</span>
              </button>
            </div>
          </div>

          {/* Category 2: Canvas Compare & Inspection */}
          <div>
            <div className="text-[10px] font-bold tracking-wider text-[#7E7365] uppercase px-1 mb-1.5">
              View & Compare
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {/* Split Screen Compare */}
              <button
                onClick={() => {
                  onToggleCompareSplit();
                  soundFx.playHapticTick();
                }}
                className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                  compareMode === 'split'
                    ? 'bg-[#2A2723] text-white border-[#2A2723]'
                    : 'bg-white text-[#2A2723] border-[#E6E2D3] hover:bg-[#FAF9F6]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <SplitSquareVertical className="w-4 h-4" />
                  <div className="text-left">
                    <div className="text-xs font-semibold">Split View</div>
                    <div className={`text-[9px] ${compareMode === 'split' ? 'text-neutral-300' : 'text-[#7E7365]'}`}>
                      Before & After Slider
                    </div>
                  </div>
                </div>
                <div className={`w-2 h-2 rounded-full ${compareMode === 'split' ? 'bg-white' : 'bg-transparent border border-[#7E7365]'}`} />
              </button>

              {/* Hold to Compare */}
              <button
                onMouseDown={onHoldCompareStart}
                onMouseUp={onHoldCompareEnd}
                onMouseLeave={onHoldCompareEnd}
                onTouchStart={onHoldCompareStart}
                onTouchEnd={onHoldCompareEnd}
                className={`flex items-center justify-between p-2.5 rounded-xl border transition-all select-none ${
                  compareMode === 'hold'
                    ? 'bg-[#2A2723] text-white border-[#2A2723]'
                    : 'bg-white text-[#2A2723] border-[#E6E2D3] hover:bg-[#FAF9F6]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  <div className="text-left">
                    <div className="text-xs font-semibold">Hold Original</div>
                    <div className={`text-[9px] ${compareMode === 'hold' ? 'text-neutral-300' : 'text-[#7E7365]'}`}>
                      Press to inspect
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Category 3: Recipes & Management */}
          <div>
            <div className="text-[10px] font-bold tracking-wider text-[#7E7365] uppercase px-1 mb-1.5">
              Preset Recipes & Reset
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Copy Recipe */}
              <button
                onClick={handleCopy}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#E6E2D3] hover:bg-[#FAF9F6] text-xs font-medium text-[#2A2723]"
              >
                {copiedNotification ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#437A47]" />
                    <span className="text-[#437A47] font-semibold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Recipe</span>
                  </>
                )}
              </button>

              {/* Paste Recipe */}
              {hasCopiedRecipe && (
                <button
                  onClick={() => {
                    onPasteRecipe();
                    setIsMobileMenuOpen(false);
                    soundFx.playHapticTick();
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#2A2723] text-white text-xs font-medium"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Paste Recipe</span>
                </button>
              )}

              {/* Reset Edits */}
              <button
                onClick={() => {
                  onReset();
                  setIsMobileMenuOpen(false);
                  soundFx.playHapticTick();
                }}
                className="flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-[#FAF9F6] border border-[#E6E2D3] text-xs text-[#7E7365] hover:text-[#2A2723]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset All</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
