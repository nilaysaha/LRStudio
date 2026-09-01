import React, { useState, useEffect, useRef } from 'react';
import {
  X, ChevronLeft, ChevronRight, Play, Pause, Maximize2, Minimize2,
  Download, Layers, Sparkles, Check, Film, FileText, Image as ImageIcon,
  Share2, ArrowLeft, RefreshCw, Volume2, VolumeX, FolderOpen
} from 'lucide-react';
import { CollageTemplate, Project, Adjustments } from '../../types';
import { TemplateCanvasRenderer } from './TemplateCanvasRenderer';
import { soundFx } from '../../utils/audio';

interface SlidePresentationPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  activeCollage: CollageTemplate | null;
  adjustments: Adjustments;
  onSelectSlide: (index: number) => void;
  onOpenExportModal: () => void;
  onUpdateActiveCollage: (updated: CollageTemplate | null) => void;
}

export const SlidePresentationPreviewModal: React.FC<SlidePresentationPreviewModalProps> = ({
  isOpen,
  onClose,
  project,
  activeCollage,
  adjustments,
  onSelectSlide,
  onOpenExportModal,
  onUpdateActiveCollage,
}) => {
  const slides: CollageTemplate[] =
    project?.collages && project.collages.length > 0
      ? project.collages
      : activeCollage
      ? [activeCollage]
      : [];

  const [currentIndex, setCurrentIndex] = useState<number>(project?.activeCollageIndex ?? 0);
  const [isPlayingSlideshow, setIsPlayingSlideshow] = useState(false);
  const [slideshowInterval, setSlideshowInterval] = useState(3.5); // seconds
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [slideTransition, setSlideTransition] = useState<'slide' | 'fade'>('fade');
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);

  // Sync index when activeCollage or project changes
  useEffect(() => {
    if (project?.activeCollageIndex !== undefined) {
      setCurrentIndex(Math.max(0, Math.min(project.activeCollageIndex, slides.length - 1)));
    }
  }, [project?.activeCollageIndex, slides.length]);

  // Slideshow auto-advance timer
  useEffect(() => {
    if (isPlayingSlideshow && slides.length > 1) {
      timerRef.current = window.setInterval(() => {
        setCurrentIndex((prev) => {
          const next = (prev + 1) % slides.length;
          onSelectSlide(next);
          soundFx.playHapticTick();
          return next;
        });
      }, slideshowInterval * 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isPlayingSlideshow, slides.length, slideshowInterval, onSelectSlide]);

  // Keyboard navigation (Arrow keys, Spacebar for slideshow, Escape to close)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsPlayingSlideshow((prev) => !prev);
        soundFx.playHapticTick();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (isFullscreen) {
          exitFullscreen();
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isFullscreen, slides.length, currentIndex]);

  if (!isOpen || slides.length === 0) return null;

  const currentSlide = slides[currentIndex] || activeCollage || slides[0];

  const handlePrev = () => {
    const newIdx = (currentIndex - 1 + slides.length) % slides.length;
    setCurrentIndex(newIdx);
    onSelectSlide(newIdx);
    soundFx.playHapticTick();
  };

  const handleNext = () => {
    const newIdx = (currentIndex + 1) % slides.length;
    setCurrentIndex(newIdx);
    onSelectSlide(newIdx);
    soundFx.playHapticTick();
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const exitFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    } else {
      setIsFullscreen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-[#0E0D0C]/95 backdrop-blur-xl flex flex-col justify-between select-none overflow-hidden animate-in fade-in-30 duration-200"
    >
      {/* Top Header Bar */}
      <header className="w-full flex items-center justify-between px-4 py-3 bg-[#171513]/90 border-b border-[#2A2723] z-30">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#2A2723] hover:bg-[#3A3630] text-[#E6E2D3] text-xs font-semibold transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Exit Preview</span>
          </button>

          <div className="flex items-center gap-2 border-l border-[#2D2A26] pl-3">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#221F1C] border border-[#3A3630] text-amber-400 font-mono text-[11px] font-bold">
              <Film className="w-3 h-3 text-amber-400" />
              <span>SLIDE {String(currentIndex + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}</span>
            </div>
            <span className="text-sm font-bold text-white max-w-[200px] sm:max-w-[320px] truncate">
              {project?.name || currentSlide.name}
            </span>
            <span className="text-xs text-[#A69480] hidden md:inline">
              • {currentSlide.name} ({currentSlide.aspectLabel})
            </span>
          </div>
        </div>

        {/* Top Right Controls: Slideshow Play/Pause, Fullscreen, Single File Export */}
        <div className="flex items-center gap-2">
          {slides.length > 1 && (
            <button
              type="button"
              onClick={() => {
                setIsPlayingSlideshow((prev) => !prev);
                soundFx.playHapticTick();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                isPlayingSlideshow
                  ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20'
                  : 'bg-[#2A2723] hover:bg-[#3A3630] text-[#E6E2D3]'
              }`}
              title="Toggle Auto-Play Slideshow (Space)"
            >
              {isPlayingSlideshow ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Auto-Play</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-full bg-[#2A2723] hover:bg-[#3A3630] text-[#E6E2D3] transition-colors"
            title="Toggle Fullscreen (F)"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => {
              onOpenExportModal();
              soundFx.playHapticTick();
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black text-xs font-bold shadow-md transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Export Single File</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-[#2A2723] hover:bg-rose-950/60 text-[#A69480] hover:text-rose-300 transition-colors"
            title="Close Preview (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Slide Presentation Viewport */}
      <main className="flex-1 relative w-full h-full min-h-0 flex items-center justify-center p-3 sm:p-6 overflow-hidden">
        {/* Floating Left `<` Previous Arrow */}
        {slides.length > 1 && (
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-3 sm:left-6 z-40 w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-black/60 hover:bg-black/90 backdrop-blur-md border border-white/20 text-white flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer group"
            title="Previous Slide (← Left Arrow)"
          >
            <ChevronLeft className="w-6 h-6 sm:w-7 sm:h-7 group-hover:-translate-x-0.5 transition-transform" />
          </button>
        )}

        {/* Active Slide Canvas Container */}
        <div className="relative w-full h-full max-w-5xl max-h-[82vh] flex items-center justify-center">
          <div className="w-full h-full flex items-center justify-center animate-in fade-in-50 zoom-in-95 duration-200">
            <TemplateCanvasRenderer
              template={currentSlide}
              onChangeTemplate={(updated) => onUpdateActiveCollage(updated)}
              selectedSlotId={null}
              onSelectSlot={() => {}}
              selectedTextId={null}
              onSelectText={() => {}}
              isPlayingMaster={true}
              onTogglePlayMaster={() => {}}
              onChooseFromLibraryForSlot={() => {}}
              onRecordVideoForSlot={() => {}}
              onTakePhotoForSlot={() => {}}
              onOpenTemplateSelector={() => {}}
              onOpenExport={onOpenExportModal}
              onImportFileForSlot={() => {}}
            />
          </div>
        </div>

        {/* Floating Right `>` Next Arrow */}
        {slides.length > 1 && (
          <button
            type="button"
            onClick={handleNext}
            className="absolute right-3 sm:right-6 z-40 w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-black/60 hover:bg-black/90 backdrop-blur-md border border-white/20 text-white flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer group"
            title="Next Slide (→ Right Arrow)"
          >
            <ChevronRight className="w-6 h-6 sm:w-7 sm:h-7 group-hover:translate-x-0.5 transition-transform" />
          </button>
        )}
      </main>

      {/* Bottom Filmstrip Carousel & Quick Navigation Bar */}
      <footer className="w-full bg-[#171513]/95 border-t border-[#2A2723] px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2 z-30">
        {/* Left: Quick Prev/Next Step controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrev}
            disabled={slides.length <= 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#24211E] hover:bg-[#332F2A] disabled:opacity-40 text-[#E6E2D3] text-xs font-semibold border border-[#3A3630] transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Prev Slide</span>
          </button>

          <span className="text-xs font-mono text-[#A69480] px-2 font-bold">
            {currentIndex + 1} / {slides.length}
          </span>

          <button
            type="button"
            onClick={handleNext}
            disabled={slides.length <= 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#24211E] hover:bg-[#332F2A] disabled:opacity-40 text-[#E6E2D3] text-xs font-semibold border border-[#3A3630] transition-colors cursor-pointer"
          >
            <span>Next Slide</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Center: Interactive Slide Thumbnails Scrubber */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 max-w-full sm:max-w-md">
          {slides.map((slide, idx) => {
            const isSelected = idx === currentIndex;
            const thumbImg = slide.slots[0]?.media?.url || slide.previewThumbnail;
            return (
              <button
                key={slide.id || idx}
                type="button"
                onClick={() => {
                  setCurrentIndex(idx);
                  onSelectSlide(idx);
                  soundFx.playHapticTick();
                }}
                className={`relative flex-shrink-0 w-12 h-14 rounded-md overflow-hidden border-2 transition-all cursor-pointer ${
                  isSelected
                    ? 'border-amber-400 scale-105 shadow-md shadow-amber-400/30'
                    : 'border-white/20 opacity-60 hover:opacity-100 hover:border-white/50'
                }`}
                title={`Jump to Slide ${idx + 1}: ${slide.name}`}
              >
                {thumbImg ? (
                  <img
                    src={thumbImg}
                    alt={slide.name}
                    className="w-full h-full object-cover"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="w-full h-full bg-[#2A2723] flex items-center justify-center text-[10px] font-bold text-white">
                    {idx + 1}
                  </div>
                )}
                <div className="absolute bottom-0 inset-x-0 bg-black/80 text-[8px] font-mono text-center text-white py-0.2">
                  {idx + 1}
                </div>
              </button>
            );
          })}
        </div>

        {/* Right: Slideshow speed & shortcuts reminder */}
        <div className="flex items-center gap-2 text-[11px] text-[#A69480]">
          <span className="hidden lg:inline">Use [←] and [→] to navigate • [Space] to play</span>
          {isPlayingSlideshow && (
            <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-mono text-[10px] font-semibold animate-pulse">
              Looping every {slideshowInterval}s
            </span>
          )}
        </div>
      </footer>
    </div>
  );
};
