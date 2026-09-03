import React, { useState, useRef } from 'react';
import {
  Film, Plus, Copy, Trash2, GripVertical, ChevronLeft, ChevronRight,
  Layers, Check, Sparkles, LayoutTemplate, MoveHorizontal, ArrowLeftRight
} from 'lucide-react';
import { CollageTemplate, Project } from '../../types';
import { soundFx } from '../../utils/audio';

interface ProjectFilmstripProps {
  project: Project | null;
  activeCollage: CollageTemplate | null;
  onSelectSlide: (index: number) => void;
  onDuplicateSlide: (index: number) => void;
  onDeleteSlide: (index: number) => void;
  onReorderSlides: (fromIndex: number, toIndex: number) => void;
  onAddNewSlide: () => void;
  onOpenTemplateSelector?: () => void;
}

export const ProjectFilmstrip: React.FC<ProjectFilmstripProps> = ({
  project,
  activeCollage,
  onSelectSlide,
  onDuplicateSlide,
  onDeleteSlide,
  onReorderSlides,
  onAddNewSlide,
  onOpenTemplateSelector,
}) => {
  // Ensure we have a valid list of slides to display
  const slides: CollageTemplate[] =
    project?.collages && project.collages.length > 0
      ? project.collages
      : activeCollage
      ? [activeCollage]
      : [];

  const activeIndex = project?.activeCollageIndex ?? 0;

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragPosition, setDragPosition] = useState<'left' | 'right' | null>(null);
  const filmstripScrollRef = useRef<HTMLDivElement>(null);

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
    soundFx.playHapticTick();
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (draggedIndex === null || draggedIndex === index) {
      setDragOverIndex(null);
      setDragPosition(null);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const midpoint = rect.left + rect.width / 2;
    const pos = e.clientX < midpoint ? 'left' : 'right';

    setDragOverIndex(index);
    setDragPosition(pos);
  };

  const handleDragLeave = (_e: React.DragEvent, index: number) => {
    if (dragOverIndex === index) {
      setDragOverIndex(null);
      setDragPosition(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      setDragPosition(null);
      return;
    }

    let finalIndex = targetIndex;
    if (dragPosition === 'right' && draggedIndex > targetIndex) {
      finalIndex = targetIndex + 1;
    } else if (dragPosition === 'left' && draggedIndex < targetIndex) {
      finalIndex = Math.max(0, targetIndex - 1);
    }

    if (draggedIndex !== finalIndex) {
      onReorderSlides(draggedIndex, finalIndex);
      soundFx.playShutter();
    }

    setDraggedIndex(null);
    setDragOverIndex(null);
    setDragPosition(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    setDragPosition(null);
  };

  // One-click nudge left / right (for mobile & quick accessibility)
  const handleMoveSlide = (currentIndex: number, direction: 'left' | 'right') => {
    const targetIdx = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
    if (targetIdx >= 0 && targetIdx < slides.length) {
      onReorderSlides(currentIndex, targetIdx);
      soundFx.playHapticTick();
    }
  };

  return (
    <div className="w-full flex flex-col gap-2">
      {/* Filmstrip Header Bar */}
      <div className="flex items-center justify-between px-1 text-xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#1C1917] text-amber-400 font-mono text-[11px] font-bold shadow-xs">
            <Film className="w-3.5 h-3.5 text-amber-400" />
            <span>35MM SLIDE ROLL</span>
          </div>
          <span className="text-[#7E7365] font-semibold text-[11px] hidden sm:inline">
            {slides.length} {slides.length === 1 ? 'Slide' : 'Sequential Slides'}
          </span>
          <span className="text-[10px] text-[#A69480] flex items-center gap-1">
            <ArrowLeftRight className="w-3 h-3 text-[#A69480]" />
            <span>Drag frames to reorder</span>
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              if (onOpenTemplateSelector) {
                onOpenTemplateSelector();
              } else {
                onAddNewSlide();
              }
              soundFx.playHapticTick();
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#2A2723] hover:bg-black text-white text-[11px] font-semibold shadow-xs transition-colors cursor-pointer"
            title="Browse template library to add a new slide"
          >
            <Plus className="w-3 h-3 text-amber-300" />
            <span>+ Add Template Slide</span>
          </button>
        </div>
      </div>

      {/* 35mm Analog Filmstrip Container */}
      <div className="relative w-full rounded-2xl bg-[#141210] border border-[#2D2A26] p-2.5 sm:p-3 overflow-hidden shadow-inner">
        {/* Top 35mm Sprocket Holes Film Border */}
        <div className="w-full flex items-center justify-between gap-2.5 pb-2 border-b border-[#262320]/80 overflow-hidden pointer-events-none opacity-80">
          <div className="flex items-center gap-3 overflow-hidden">
            {Array.from({ length: 24 }).map((_, i) => (
              <div
                key={`sprocket-top-${i}`}
                className="w-2.5 h-1.5 rounded-[2px] bg-[#0A0908] border border-white/10 shrink-0 shadow-inner"
              />
            ))}
          </div>
          <div className="text-[9px] font-mono text-amber-500/70 tracking-widest uppercase font-bold shrink-0 hidden md:block">
            LUMENLAB · 35MM · ISO 400 · EXP {slides.length}
          </div>
        </div>

        {/* Filmstrip Slides Horizontal Scroll Track */}
        <div
          ref={filmstripScrollRef}
          className="flex items-stretch gap-3.5 py-2.5 overflow-x-auto no-scrollbar scroll-smooth"
        >
          {slides.map((slide, index) => {
            const isActive = index === activeIndex;
            const isBeingDragged = draggedIndex === index;
            const isDropTarget = dragOverIndex === index;
            const previewImg =
              slide.slots?.[0]?.media?.url ||
              slide.previewThumbnail ||
              'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=600&auto=format&fit=crop';
            const frameCount = slide.slots?.length || 1;

            return (
              <div
                key={slide.id || `slide-${index}`}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={(e) => handleDragLeave(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                onClick={() => {
                  onSelectSlide(index);
                  soundFx.playHapticTick();
                }}
                className={`relative group flex flex-col shrink-0 w-[145px] sm:w-[165px] rounded-xl overflow-hidden cursor-grab active:cursor-grabbing transition-all duration-200 select-none ${
                  isBeingDragged
                    ? 'opacity-40 scale-95 ring-2 ring-amber-400/80 bg-neutral-900'
                    : isActive
                    ? 'bg-[#221F1C] ring-2 ring-amber-400 shadow-lg shadow-amber-500/10'
                    : 'bg-[#1C1A17] hover:bg-[#25221E] ring-1 ring-[#3A3630]'
                }`}
              >
                {/* Visual Drop Indicator Lines */}
                {isDropTarget && dragPosition === 'left' && (
                  <div className="absolute left-0 inset-y-0 w-1.5 bg-amber-400 rounded-r-full z-30 shadow-[0_0_8px_#F59E0B] animate-pulse" />
                )}
                {isDropTarget && dragPosition === 'right' && (
                  <div className="absolute right-0 inset-y-0 w-1.5 bg-amber-400 rounded-l-full z-30 shadow-[0_0_8px_#F59E0B] animate-pulse" />
                )}

                {/* Card Top Metadata & Drag Grip */}
                <div className="flex items-center justify-between px-2 py-1.5 bg-[#171513] border-b border-[#2D2A26] text-[10px]">
                  <div className="flex items-center gap-1 font-mono">
                    <span
                      className={`font-bold px-1 rounded ${
                        isActive
                          ? 'bg-amber-400 text-black font-extrabold'
                          : 'bg-[#2D2A26] text-amber-400/90'
                      }`}
                    >
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="text-[#A69480] text-[9px] truncate max-w-[65px]">
                      {slide.aspectLabel || '4:5'}
                    </span>
                  </div>

                  <div className="flex items-center gap-0.5 text-[#A69480]">
                    <span className="text-[9px] font-mono opacity-80">{frameCount}F</span>
                    <GripVertical className="w-3.5 h-3.5 text-[#7E7365] group-hover:text-amber-300 transition-colors" />
                  </div>
                </div>

                {/* Frame Visual Thumbnail Preview */}
                <div className="relative aspect-[4/5] w-full bg-[#0E0D0C] overflow-hidden flex items-center justify-center p-1.5">
                  {/* Multi-slot mini visual layout representation */}
                  {slide.slots && slide.slots.length > 1 ? (
                    <div className="relative w-full h-full rounded-md overflow-hidden bg-black/40 border border-white/10">
                      {slide.slots.slice(0, 4).map((slot, sIdx) => {
                        const slotImg = slot.media?.url || previewImg;
                        return (
                          <div
                            key={slot.id || sIdx}
                            className="absolute overflow-hidden border border-black/30 rounded-xs shadow-xs"
                            style={{
                              left: `${slot.x}%`,
                              top: `${slot.y}%`,
                              width: `${slot.width}%`,
                              height: `${slot.height}%`,
                              zIndex: slot.zIndex || sIdx + 1,
                            }}
                          >
                            <img
                              src={slotImg}
                              alt={slot.label}
                              className="w-full h-full object-cover"
                              crossOrigin="anonymous"
                              loading="lazy"
                            />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="w-full h-full rounded-md overflow-hidden border border-white/10 relative">
                      <img
                        src={previewImg}
                        alt={slide.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        crossOrigin="anonymous"
                        loading="lazy"
                      />
                    </div>
                  )}

                  {/* Active Badge Overlay */}
                  {isActive && (
                    <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded-full bg-amber-400 text-black text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-md">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                      <span>Active</span>
                    </div>
                  )}

                  {/* Quick Drag / Reorder Hover Controls */}
                  <div className="absolute top-2 inset-x-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 backdrop-blur-xs p-1 rounded-md">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveSlide(index, 'left');
                      }}
                      className="p-1 rounded bg-white/20 hover:bg-white/40 disabled:opacity-30 text-white transition-colors cursor-pointer"
                      title="Move Left (Earlier in sequence)"
                    >
                      <ChevronLeft className="w-3 h-3" />
                    </button>

                    <span className="text-[9px] font-mono text-white/90 font-bold">
                      {index + 1} / {slides.length}
                    </span>

                    <button
                      type="button"
                      disabled={index === slides.length - 1}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveSlide(index, 'right');
                      }}
                      className="p-1 rounded bg-white/20 hover:bg-white/40 disabled:opacity-30 text-white transition-colors cursor-pointer"
                      title="Move Right (Later in sequence)"
                    >
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Card Bottom: Title & Slide Actions */}
                <div className="p-2 flex flex-col gap-1 bg-[#1A1815] border-t border-[#2D2A26]">
                  <span className="text-[11px] font-bold text-[#E6E2D3] truncate leading-tight">
                    {slide.name}
                  </span>

                  <div className="flex items-center justify-between pt-0.5">
                    <span className="text-[9px] text-[#A69480] truncate max-w-[70px]">
                      {slide.categoryLabel || 'Collage'}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDuplicateSlide(index);
                        }}
                        className="p-1 rounded-md text-[#A69480] hover:text-white hover:bg-white/10 transition-colors"
                        title="Duplicate this slide"
                      >
                        <Copy className="w-3 h-3" />
                      </button>

                      {slides.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteSlide(index);
                          }}
                          className="p-1 rounded-md text-[#A69480] hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                          title="Delete slide"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Quick Add Slide Frame Card at end of Filmstrip */}
          <div
            onClick={() => {
              if (onOpenTemplateSelector) {
                onOpenTemplateSelector();
              } else {
                onAddNewSlide();
              }
              soundFx.playHapticTick();
            }}
            className="flex flex-col items-center justify-center shrink-0 w-[120px] sm:w-[135px] rounded-xl border-2 border-dashed border-[#3A3630] hover:border-amber-400 bg-[#171513]/60 hover:bg-[#1F1C18] transition-all cursor-pointer group p-3 text-center gap-2"
          >
            <div className="w-9 h-9 rounded-full bg-[#2A2723] group-hover:bg-amber-400 flex items-center justify-center text-amber-300 group-hover:text-black transition-all shadow-xs">
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-[#E6E2D3] group-hover:text-amber-300 transition-colors">
                Add Slide
              </span>
              <span className="text-[9px] text-[#7E7365]">
                Pick template or collage
              </span>
            </div>
          </div>
        </div>

        {/* Bottom 35mm Sprocket Holes Film Border */}
        <div className="w-full flex items-center justify-between gap-2.5 pt-2 border-t border-[#262320]/80 overflow-hidden pointer-events-none opacity-80">
          <div className="flex items-center gap-3 overflow-hidden">
            {Array.from({ length: 24 }).map((_, i) => (
              <div
                key={`sprocket-bottom-${i}`}
                className="w-2.5 h-1.5 rounded-[2px] bg-[#0A0908] border border-white/10 shrink-0 shadow-inner"
              />
            ))}
          </div>
          <div className="text-[9px] font-mono text-amber-500/70 tracking-widest uppercase font-bold shrink-0 hidden md:block">
            SAFETY FILM · FRAME 01-{String(slides.length).padStart(2, '0')}
          </div>
        </div>
      </div>
    </div>
  );
};
