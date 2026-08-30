import React, { useRef } from 'react';
import {
  Undo2, Redo2, Copy, Check, Camera, Image as ImageIcon,
  Download, SlidersHorizontal, Eye, SplitSquareVertical,
  RotateCcw, Sparkles, Upload
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
  const [copiedNotification, setCopiedNotification] = React.useState(false);
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
  };

  return (
    <header className="w-full bg-white/80 backdrop-blur-md border-b border-[#E6E2D3] px-3 sm:px-6 py-2.5 flex items-center justify-between z-30 select-none">
      {/* Hidden File Input for direct photo/video import */}
      <input
        ref={mediaFileInputRef}
        type="file"
        accept="image/*,video/*,.heic,.heif,.jpg,.jpeg,.png,.webp,.gif"
        onChange={handleMediaFileChange}
        className="hidden"
      />

      {/* Brand & Media Badge */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 cursor-pointer" onClick={onOpenMediaLibrary}>
          <span className="font-editorial text-lg sm:text-xl tracking-[0.2em] font-semibold text-[#2A2723] hover:text-black transition-colors">
            LRSTUDIO
          </span>
          <span className="text-[9px] tracking-widest text-[#7E7365] font-semibold uppercase px-2 py-0.5 rounded-full bg-[#FAF9F6] border border-[#E6E2D3]">
            PRO
          </span>
        </div>

        {currentMedia && (
          <button
            onClick={onOpenMediaLibrary}
            className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-[#FAF9F6] hover:bg-[#F0EEE6] border border-[#E6E2D3] text-xs text-[#4A453E] transition-colors"
            title="Switch or browse media library"
          >
            <ImageIcon className="w-3.5 h-3.5 text-[#2A2723]" />
            <span className="max-w-[140px] truncate">{currentMedia.name}</span>
            {currentMedia.type === 'video' && (
              <span className="text-[9px] bg-[#2A2723] text-white font-semibold px-1.5 py-0.2 rounded-full">VIDEO</span>
            )}
          </button>
        )}
      </div>

      {/* Center Tool Actions (Undo, Redo, Compare, Copy/Paste) */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Undo / Redo */}
        <button
          onClick={() => { onUndo(); soundFx.playHapticTick(); }}
          disabled={!canUndo}
          className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
            canUndo ? 'text-[#2A2723] hover:bg-[#F0EEE6]' : 'text-[#C5BDB2] cursor-not-allowed'
          }`}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4" />
        </button>

        <button
          onClick={() => { onRedo(); soundFx.playHapticTick(); }}
          disabled={!canRedo}
          className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
            canRedo ? 'text-[#2A2723] hover:bg-[#F0EEE6]' : 'text-[#C5BDB2] cursor-not-allowed'
          }`}
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="w-4 h-4" />
        </button>

        <div className="h-4 w-[1px] bg-[#E6E2D3] mx-1 hidden sm:block" />

        {/* Copy Recipe / Paste Recipe */}
        <button
          onClick={handleCopy}
          className="p-1.5 sm:p-2 rounded-lg text-[#7E7365] hover:text-[#2A2723] hover:bg-[#F0EEE6] transition-colors relative"
          title="Copy Recipe Adjustments"
        >
          {copiedNotification ? (
            <Check className="w-4 h-4 text-[#437A47]" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>

        {hasCopiedRecipe && (
          <button
            onClick={() => { onPasteRecipe(); soundFx.playHapticTick(); }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FAF9F6] hover:bg-[#F0EEE6] text-xs text-[#2A2723] border border-[#E6E2D3] transition-colors shadow-xs"
            title="Paste Copied Recipe"
          >
            <Sparkles className="w-3 h-3 text-[#2A2723]" />
            <span className="hidden sm:inline text-[11px] font-medium">Paste Recipe</span>
          </button>
        )}

        <div className="h-4 w-[1px] bg-[#E6E2D3] mx-1" />

        {/* Split Screen Compare Toggle */}
        <button
          onClick={() => { onToggleCompareSplit(); soundFx.playHapticTick(); }}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all ${
            compareMode === 'split'
              ? 'bg-[#2A2723] text-white shadow-xs'
              : 'text-[#4A453E] hover:bg-[#F0EEE6] border border-[#E6E2D3]'
          }`}
          title="Toggle Split-Screen Compare"
        >
          <SplitSquareVertical className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Split</span>
        </button>

        {/* Hold to Compare Button */}
        <button
          onMouseDown={onHoldCompareStart}
          onMouseUp={onHoldCompareEnd}
          onMouseLeave={onHoldCompareEnd}
          onTouchStart={onHoldCompareStart}
          onTouchEnd={onHoldCompareEnd}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium border border-[#E6E2D3] transition-all select-none ${
            compareMode === 'hold'
              ? 'bg-[#2A2723] text-white ring-2 ring-[#2A2723]'
              : 'text-[#4A453E] hover:bg-[#F0EEE6]'
          }`}
          title="Press & hold to see original image"
        >
          <Eye className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Hold Original</span>
        </button>
      </div>

      {/* Right Side (Import, Camera, Media Gallery, Export) */}
      <div className="flex items-center gap-2">
        {/* Direct Import Image/Video Button */}
        <button
          onClick={() => {
            if (mediaFileInputRef.current) {
              mediaFileInputRef.current.click();
              soundFx.playHapticTick();
            }
          }}
          className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-full bg-white hover:bg-[#FAF9F6] border border-[#2A2723]/30 text-xs font-medium text-[#2A2723] shadow-xs transition-colors"
          title="Import photo or video from device"
        >
          <Upload className="w-3.5 h-3.5 text-[#2A2723]" />
          <span className="font-semibold">Import</span>
        </button>

        <button
          onClick={() => { onOpenCamera(); soundFx.playHapticTick(); }}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-white hover:bg-[#FAF9F6] border border-[#E6E2D3] text-xs font-medium text-[#2A2723] shadow-xs transition-colors"
          title="Open WebGL Live Camera"
        >
          <Camera className="w-3.5 h-3.5 text-[#2A2723]" />
          <span className="hidden sm:inline">Camera</span>
        </button>

        <button
          onClick={() => { onOpenMediaLibrary(); soundFx.playHapticTick(); }}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-white hover:bg-[#FAF9F6] border border-[#E6E2D3] text-xs font-medium text-[#2A2723] shadow-xs transition-colors"
          title="Open Curated Gallery & Uploads"
        >
          <ImageIcon className="w-3.5 h-3.5 text-[#2A2723]" />
          <span className="hidden sm:inline">Library</span>
        </button>

        <button
          onClick={() => { onOpenExport(); soundFx.playHapticTick(); }}
          className="flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 rounded-full bg-[#2A2723] hover:bg-black text-white font-medium text-xs tracking-wider shadow-sm transition-all active:scale-95"
          title="Export high-res photo or video"
        >
          <Download className="w-3.5 h-3.5 stroke-[2.2]" />
          <span>Save</span>
        </button>
      </div>
    </header>
  );
};
