import React, { useRef, useState } from 'react';
import {
  Undo2, Redo2, Copy, Check, Camera, Image as ImageIcon,
  Download, Eye, SplitSquareVertical, Sparkles, Upload,
  MoreHorizontal, RotateCcw, X
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
    <header className="w-full bg-white/90 backdrop-blur-md border-b border-[#E6E2D3] px-2 sm:px-4 md:px-6 py-2 z-30 select-none relative">
      {/* Hidden Native File Input for direct photo/video import */}
      <input
        ref={mediaFileInputRef}
        type="file"
        accept="image/*,video/*,.heic,.heif,.jpg,.jpeg,.png,.webp,.gif,.mp4,.mov,.webm"
        onChange={handleMediaFileChange}
        className="hidden"
      />

      {/* Main Bar */}
      <div className="w-full flex items-center justify-between gap-1.5 sm:gap-3">
        {/* Brand & Media Badge */}
        <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
          <div
            className="flex items-center gap-1.5 cursor-pointer py-1"
            onClick={onOpenMediaLibrary}
          >
            <span className="font-editorial text-base sm:text-lg md:text-xl tracking-[0.15em] sm:tracking-[0.2em] font-bold text-[#2A2723] hover:text-black transition-colors">
              LRSTUDIO
            </span>
            <span className="text-[8px] sm:text-[9px] tracking-wider text-[#7E7365] font-bold uppercase px-1.5 py-0.5 rounded-full bg-[#FAF9F6] border border-[#E6E2D3]">
              PRO
            </span>
          </div>

          {currentMedia && (
            <button
              onClick={onOpenMediaLibrary}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FAF9F6] hover:bg-[#F0EEE6] border border-[#E6E2D3] text-xs text-[#4A453E] transition-colors max-w-[160px]"
              title="Switch or browse media library"
            >
              <ImageIcon className="w-3.5 h-3.5 text-[#2A2723] flex-shrink-0" />
              <span className="truncate">{currentMedia.name}</span>
            </button>
          )}
        </div>

        {/* Center / Quick Tool Actions (Undo, Redo, Compare, Recipe) - Responsive */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Undo Button */}
          <button
            onClick={() => { onUndo(); soundFx.playHapticTick(); }}
            disabled={!canUndo}
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-colors ${
              canUndo ? 'text-[#2A2723] hover:bg-[#F0EEE6] active:scale-95' : 'text-[#C5BDB2] opacity-50 cursor-not-allowed'
            }`}
            title="Undo"
          >
            <Undo2 className="w-4 h-4" />
          </button>

          {/* Redo Button */}
          <button
            onClick={() => { onRedo(); soundFx.playHapticTick(); }}
            disabled={!canRedo}
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-colors ${
              canRedo ? 'text-[#2A2723] hover:bg-[#F0EEE6] active:scale-95' : 'text-[#C5BDB2] opacity-50 cursor-not-allowed'
            }`}
            title="Redo"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          <div className="h-4 w-[1px] bg-[#E6E2D3] mx-0.5" />

          {/* Split Screen Compare Toggle */}
          <button
            onClick={() => { onToggleCompareSplit(); soundFx.playHapticTick(); }}
            className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              compareMode === 'split'
                ? 'bg-[#2A2723] text-white shadow-xs'
                : 'text-[#4A453E] hover:bg-[#F0EEE6] border border-[#E6E2D3]'
            }`}
            title="Toggle Split Compare"
          >
            <SplitSquareVertical className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Split</span>
          </button>

          {/* Hold to Compare (Original) */}
          <button
            onMouseDown={onHoldCompareStart}
            onMouseUp={onHoldCompareEnd}
            onMouseLeave={onHoldCompareEnd}
            onTouchStart={onHoldCompareStart}
            onTouchEnd={onHoldCompareEnd}
            className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-full text-xs font-semibold border border-[#E6E2D3] transition-all select-none ${
              compareMode === 'hold'
                ? 'bg-[#2A2723] text-white ring-2 ring-[#2A2723]'
                : 'text-[#4A453E] hover:bg-[#F0EEE6]'
            }`}
            title="Hold to see original"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Hold</span>
          </button>

          {/* Desktop-only Copy Recipe button */}
          <button
            onClick={handleCopy}
            className="hidden md:flex items-center gap-1 p-2 rounded-full text-[#7E7365] hover:text-[#2A2723] hover:bg-[#F0EEE6] transition-colors"
            title="Copy Recipe"
          >
            {copiedNotification ? <Check className="w-4 h-4 text-[#437A47]" /> : <Copy className="w-4 h-4" />}
          </button>

          {hasCopiedRecipe && (
            <button
              onClick={() => { onPasteRecipe(); soundFx.playHapticTick(); }}
              className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FAF9F6] hover:bg-[#F0EEE6] text-xs text-[#2A2723] border border-[#E6E2D3] transition-colors"
              title="Paste Copied Recipe"
            >
              <Sparkles className="w-3 h-3 text-[#2A2723]" />
              <span className="text-[11px] font-medium">Paste</span>
            </button>
          )}
        </div>

        {/* Right Side Primary Actions (Import, Camera, Library, Save, More) */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {/* Direct Import Button */}
          <button
            onClick={() => {
              if (mediaFileInputRef.current) {
                mediaFileInputRef.current.click();
                soundFx.playHapticTick();
              }
            }}
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-full bg-white hover:bg-[#FAF9F6] border border-[#2A2723]/30 text-xs font-semibold text-[#2A2723] shadow-xs active:scale-95 transition-all"
            title="Import Photo or Video"
          >
            <Upload className="w-3.5 h-3.5 text-[#2A2723]" />
            <span className="hidden xs:inline">Import</span>
          </button>

          {/* WebGL Camera Button */}
          <button
            onClick={() => { onOpenCamera(); soundFx.playHapticTick(); }}
            className="p-1.5 sm:px-3 sm:py-1.5 rounded-full bg-white hover:bg-[#FAF9F6] border border-[#E6E2D3] text-xs font-medium text-[#2A2723] shadow-xs active:scale-95 transition-all flex items-center gap-1"
            title="Open Live Camera"
          >
            <Camera className="w-3.5 h-3.5 text-[#2A2723]" />
            <span className="hidden sm:inline">Camera</span>
          </button>

          {/* Curated Media Library Button */}
          <button
            onClick={() => { onOpenMediaLibrary(); soundFx.playHapticTick(); }}
            className="hidden sm:flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-full bg-white hover:bg-[#FAF9F6] border border-[#E6E2D3] text-xs font-medium text-[#2A2723] shadow-xs active:scale-95 transition-all"
            title="Open Media Library"
          >
            <ImageIcon className="w-3.5 h-3.5 text-[#2A2723]" />
            <span className="hidden md:inline">Library</span>
          </button>

          {/* Primary Save / Export Button */}
          <button
            onClick={() => { onOpenExport(); soundFx.playHapticTick(); }}
            className="flex items-center gap-1 px-3 sm:px-4 py-1.5 rounded-full bg-[#2A2723] hover:bg-black text-white font-semibold text-xs tracking-wider shadow-sm transition-all active:scale-95 cursor-pointer"
            title="Save and Export Image/Video"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.4]" />
            <span>Save</span>
          </button>

          {/* Mobile More Options Dropdown Toggle */}
          <button
            onClick={() => {
              setIsMobileMenuOpen(!isMobileMenuOpen);
              soundFx.playHapticTick();
            }}
            className={`md:hidden p-1.5 rounded-full transition-colors ${
              isMobileMenuOpen ? 'bg-[#2A2723] text-white' : 'text-[#7E7365] hover:bg-[#F0EEE6]'
            }`}
            title="More Options"
          >
            {isMobileMenuOpen ? <X className="w-4 h-4" /> : <MoreHorizontal className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer / Dropdown Menu for secondary tools */}
      {isMobileMenuOpen && (
        <div className="md:hidden mt-2 pt-2 pb-1 border-t border-[#E6E2D3] flex flex-wrap items-center justify-between gap-2 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Media Library */}
            <button
              onClick={() => {
                onOpenMediaLibrary();
                setIsMobileMenuOpen(false);
                soundFx.playHapticTick();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FAF9F6] border border-[#E6E2D3] text-xs text-[#2A2723] font-medium"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Library</span>
            </button>

            {/* Copy Recipe */}
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FAF9F6] border border-[#E6E2D3] text-xs text-[#2A2723] font-medium"
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
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#2A2723] text-white text-xs font-medium"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Paste Recipe</span>
              </button>
            )}

            {/* Reset All */}
            <button
              onClick={() => {
                onReset();
                setIsMobileMenuOpen(false);
                soundFx.playHapticTick();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FAF9F6] border border-[#E6E2D3] text-xs text-[#7E7365] hover:text-[#2A2723]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Edits</span>
            </button>
          </div>

          {currentMedia && (
            <span className="text-[10px] text-[#7E7365] font-mono truncate max-w-[120px]">
              {currentMedia.name}
            </span>
          )}
        </div>
      )}
    </header>
  );
};
