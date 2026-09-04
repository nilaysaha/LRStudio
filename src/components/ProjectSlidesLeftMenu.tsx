import React, { useState } from 'react';
import {
  FolderOpen,
  ChevronLeft,
  ChevronRight,
  Plus,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  PanelLeftClose,
  PanelLeftOpen,
  LayoutTemplate,
  X,
} from 'lucide-react';
import { CollageTemplate, Project } from '../types';
import { soundFx } from '../utils/audio';

interface ProjectSlidesLeftMenuProps {
  project: Project | null;
  activeCollage: CollageTemplate | null;
  onSelectProjectSlide: (index: number) => void;
  onDuplicateProjectSlide: (index?: number) => void;
  onDeleteProjectSlide: (index: number) => void;
  onReorderProjectSlides: (fromIndex: number, toIndex: number) => void;
  onAddNewSlide: () => void;
  onOpenProjectStudio: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const ProjectSlidesLeftMenu: React.FC<ProjectSlidesLeftMenuProps> = ({
  project,
  activeCollage,
  onSelectProjectSlide,
  onDuplicateProjectSlide,
  onDeleteProjectSlide,
  onReorderProjectSlides,
  onAddNewSlide,
  onOpenProjectStudio,
  isCollapsed: controlledCollapsed,
  onToggleCollapse: controlledToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  // Local collapse fallback if not controlled from parent
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;
  const toggleCollapse = controlledToggleCollapse || (() => setInternalCollapsed((prev) => !prev));

  // Determine slide list
  const slides: CollageTemplate[] =
    project?.collages && project.collages.length > 0
      ? project.collages
      : activeCollage
      ? [activeCollage]
      : [];

  const activeIndex = project?.activeCollageIndex ?? 0;

  // Move slide up / down
  const handleMoveUp = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (index > 0) {
      onReorderProjectSlides(index, index - 1);
      soundFx.playHapticTick();
    }
  };

  const handleMoveDown = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (index < slides.length - 1) {
      onReorderProjectSlides(index, index + 1);
      soundFx.playHapticTick();
    }
  };

  // Duplicate slide
  const handleDuplicate = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    onDuplicateProjectSlide(index);
  };

  // Delete slide
  const handleDelete = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteProjectSlide(index);
  };

  // Slides List & Header Content (shared between desktop & mobile drawer)
  const renderContent = (isDrawer = false) => (
    <div className="flex flex-col h-full overflow-hidden select-none">
      {/* 1. Project Title & Management Header */}
      <div className="p-3 border-b border-[#E6E2D3] bg-white flex flex-col gap-2 flex-shrink-0">
        <div className="flex items-center justify-between gap-1.5">
          {/* Project Studio Modal Trigger */}
          <button
            type="button"
            onClick={() => {
              onOpenProjectStudio();
              if (isDrawer && onCloseMobile) onCloseMobile();
              soundFx.playHapticTick();
            }}
            className="flex-1 flex items-center gap-2 p-1.5 -ml-1 rounded-xl hover:bg-[#FAF9F6] active:bg-[#F0EEE6] border border-transparent hover:border-[#E6E2D3] transition-all min-w-0 text-left group cursor-pointer"
            title="Open Project Studio to switch or rename projects"
          >
            <div className="w-7 h-7 rounded-lg bg-[#FAF9F6] group-hover:bg-white border border-[#E6E2D3] flex items-center justify-center flex-shrink-0 transition-colors">
              <FolderOpen className="w-3.5 h-3.5 text-[#A69480] group-hover:text-[#2A2723] transition-colors" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-[#2A2723] truncate leading-tight group-hover:text-amber-800 transition-colors">
                {project?.name || 'Riviera Bronze'}
              </div>
              <div className="text-[10px] text-[#7E7365] font-medium flex items-center gap-1 leading-none mt-0.5">
                <span>{slides.length} {slides.length === 1 ? 'Slide' : 'Slides'}</span>
                <span>•</span>
                <span className="text-amber-700 font-semibold">Switch</span>
              </div>
            </div>
          </button>

          {/* Close button for mobile drawer, or Collapse button for desktop */}
          {isDrawer ? (
            <button
              type="button"
              onClick={onCloseMobile}
              className="p-1.5 rounded-lg text-[#7E7365] hover:text-[#2A2723] hover:bg-[#FAF9F6] border border-transparent hover:border-[#E6E2D3] transition-colors cursor-pointer flex-shrink-0"
              title="Close slides menu"
              aria-label="Close slides menu"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                toggleCollapse();
                soundFx.playHapticTick();
              }}
              className="p-1.5 rounded-lg text-[#7E7365] hover:text-[#2A2723] hover:bg-[#FAF9F6] border border-transparent hover:border-[#E6E2D3] transition-colors cursor-pointer flex-shrink-0"
              title="Collapse slides menu to rail"
              aria-label="Collapse slides menu"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Quick Stepper Bar (< Prev | Slide X of Y | Next >) */}
        <div className="flex items-center justify-between bg-[#FAF9F6] px-2 py-1 rounded-lg border border-[#E6E2D3] text-[11px]">
          <button
            type="button"
            disabled={activeIndex <= 0}
            onClick={() => {
              if (activeIndex > 0) {
                onSelectProjectSlide(activeIndex - 1);
                soundFx.playHapticTick();
              }
            }}
            className="p-1 rounded text-[#7E7365] hover:text-[#2A2723] hover:bg-white disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
            title="Previous Slide"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <span className="font-semibold text-[#2A2723] font-mono text-[11px]">
            Slide {activeIndex + 1} of {slides.length}
          </span>

          <button
            type="button"
            disabled={activeIndex >= slides.length - 1}
            onClick={() => {
              if (activeIndex < slides.length - 1) {
                onSelectProjectSlide(activeIndex + 1);
                soundFx.playHapticTick();
              }
            }}
            className="p-1 rounded text-[#7E7365] hover:text-[#2A2723] hover:bg-white disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
            title="Next Slide"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Scrollable Slides List */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-2.5 flex flex-col gap-2">
        {slides.map((slide, idx) => {
          const isActive = idx === activeIndex;
          const frameCount = slide.slots?.length || 1;
          const firstMedia = slide.slots?.find((s) => s.media?.url)?.media?.url;

          return (
            <div
              key={slide.id || idx}
              onClick={() => {
                onSelectProjectSlide(idx);
                if (isDrawer && onCloseMobile) onCloseMobile();
                soundFx.playHapticTick();
              }}
              className={`group relative rounded-xl p-2.5 transition-all duration-200 cursor-pointer border flex flex-col gap-2 ${
                isActive
                  ? 'bg-white border-[#2A2723] shadow-md ring-2 ring-[#2A2723]/10'
                  : 'bg-white/70 hover:bg-white border-[#E6E2D3] hover:border-[#D0CBB8] shadow-2xs'
              }`}
            >
              {/* Top Row: Index Badge, Slide Name & Aspect Ratio */}
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      isActive
                        ? 'bg-[#2A2723] text-white'
                        : 'bg-[#FAF9F6] text-[#7E7365] border border-[#E6E2D3]'
                    }`}
                  >
                    #{idx + 1}
                  </span>
                  <span className="text-xs font-semibold text-[#2A2723] truncate">
                    {slide.name || `Slide ${idx + 1}`}
                  </span>
                </div>

                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#FAF9F6] text-[#7E7365] border border-[#E6E2D3] flex-shrink-0">
                  {slide.aspectLabel || '4:5'}
                </span>
              </div>

              {/* Middle Row: Visual Layout Representation or Mini Thumbnail */}
              <div className="relative w-full h-16 rounded-lg bg-[#F5F2EB] border border-[#E6E2D3] overflow-hidden flex items-center justify-center">
                {firstMedia ? (
                  <div className="w-full h-full relative">
                    <img
                      src={firstMedia}
                      alt={`Slide ${idx + 1}`}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    {/* Multi-slot overlay badge */}
                    {frameCount > 1 && (
                      <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] font-mono px-1.5 py-0.2 rounded backdrop-blur-xs">
                        {frameCount} Frames
                      </div>
                    )}
                  </div>
                ) : (
                  /* Layout Wireframe Representation */
                  <div className="relative w-12 h-14 bg-white rounded border border-[#D0CBB8] overflow-hidden shadow-2xs flex items-center justify-center">
                    {slide.slots && slide.slots.length > 1 ? (
                      <div className="w-full h-full p-0.5 grid grid-cols-2 gap-0.5">
                        {slide.slots.slice(0, 4).map((_, sIdx) => (
                          <div
                            key={sIdx}
                            className="bg-[#EFECE6] rounded-xs border border-[#D0CBB8]"
                          />
                        ))}
                      </div>
                    ) : (
                      <LayoutTemplate className="w-4 h-4 text-[#A69480]" />
                    )}
                  </div>
                )}

                {/* Active Indicator Tag */}
                {isActive && (
                  <div className="absolute top-1 left-1 bg-[#2A2723] text-white text-[9px] font-bold px-1.5 py-0.2 rounded shadow-xs flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    <span>Active</span>
                  </div>
                )}
              </div>

              {/* Bottom Row: Slide Action Controls (Reorder, Duplicate, Delete) */}
              <div className="flex items-center justify-between pt-1 border-t border-[#F0EEE6] text-[#7E7365]">
                {/* Reorder Up / Down */}
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={(e) => handleMoveUp(idx, e)}
                    className="p-1 rounded hover:bg-[#FAF9F6] hover:text-[#2A2723] disabled:opacity-20 disabled:pointer-events-none transition-colors cursor-pointer"
                    title="Move slide up"
                    aria-label="Move slide up"
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === slides.length - 1}
                    onClick={(e) => handleMoveDown(idx, e)}
                    className="p-1 rounded hover:bg-[#FAF9F6] hover:text-[#2A2723] disabled:opacity-20 disabled:pointer-events-none transition-colors cursor-pointer"
                    title="Move slide down"
                    aria-label="Move slide down"
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>
                </div>

                {/* Duplicate & Delete Actions */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => handleDuplicate(idx, e)}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium hover:bg-[#FAF9F6] hover:text-[#2A2723] border border-transparent hover:border-[#E6E2D3] transition-colors cursor-pointer"
                    title="Duplicate slide"
                  >
                    <Copy className="w-2.5 h-2.5" />
                    <span>Clone</span>
                  </button>

                  {slides.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => handleDelete(idx, e)}
                      className="p-1 rounded text-[#7E7365] hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                      title="Delete slide"
                      aria-label="Delete slide"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Bottom Action Bar: Add New Slide */}
      <div className="p-3 border-t border-[#E6E2D3] bg-white flex flex-col gap-1.5 flex-shrink-0">
        <button
          type="button"
          onClick={() => {
            onAddNewSlide();
            if (isDrawer && onCloseMobile) onCloseMobile();
            soundFx.playHapticTick();
          }}
          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#2A2723] hover:bg-black active:scale-[0.98] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer group"
        >
          <Plus className="w-3.5 h-3.5 text-amber-300 group-hover:rotate-90 transition-transform duration-200" />
          <span>Add New Slide</span>
        </button>

        <div className="flex items-center justify-center text-[10px] text-[#A69480] text-center pt-0.5">
          Select or reorder slides on the left
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* ------------------------------------------------------------- */}
      {/* MOBILE SLIDE-OVER DRAWER (< md screens)                      */}
      {/* ------------------------------------------------------------- */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={onCloseMobile}
          />
          {/* Slide-in drawer */}
          <div className="relative w-72 max-w-[85vw] h-full bg-[#FAF9F6] shadow-2xl border-r border-[#E6E2D3] z-50 flex flex-col animate-in slide-in-from-left duration-200">
            {renderContent(true)}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* DESKTOP VIEW (md+ screens)                                    */}
      {/* ------------------------------------------------------------- */}
      {isCollapsed ? (
        /* Collapsed Rail Mode */
        <aside
          id="project-slides-left-rail"
          className="hidden md:flex flex-col items-center w-14 h-full bg-[#FAF9F6] border-r border-[#E6E2D3] z-20 flex-shrink-0 py-3 gap-3 select-none transition-all duration-300"
          aria-label="Collapsed Project Slides Menu"
        >
          {/* Expand Toggle Button */}
          <button
            type="button"
            onClick={() => {
              toggleCollapse();
              soundFx.playHapticTick();
            }}
            className="w-9 h-9 rounded-xl bg-white hover:bg-[#F0EEE6] border border-[#E6E2D3] shadow-xs flex items-center justify-center text-[#7E7365] hover:text-[#2A2723] transition-colors cursor-pointer group"
            title="Expand Project Slides Menu (Left)"
            aria-label="Expand Project Slides Menu"
          >
            <PanelLeftOpen className="w-4 h-4 group-hover:scale-110 transition-transform" />
          </button>

          {/* Project Studio Shortcut */}
          <button
            type="button"
            onClick={() => {
              onOpenProjectStudio();
              soundFx.playHapticTick();
            }}
            className="w-9 h-9 rounded-xl bg-white hover:bg-[#F0EEE6] border border-[#E6E2D3] shadow-xs flex items-center justify-center text-[#7E7365] hover:text-[#2A2723] transition-colors cursor-pointer"
            title={`Project: ${project?.name || 'Untitled'} - Click to open Project Studio`}
          >
            <FolderOpen className="w-4 h-4 text-[#A69480]" />
          </button>

          <div className="w-6 h-[1px] bg-[#E6E2D3]" />

          {/* Scrollable Mini Slide Numbers */}
          <div className="flex-1 w-full flex flex-col items-center gap-2 overflow-y-auto no-scrollbar py-1">
            {slides.map((slide, idx) => {
              const isActive = idx === activeIndex;
              return (
                <button
                  key={slide.id || idx}
                  type="button"
                  onClick={() => {
                    onSelectProjectSlide(idx);
                    soundFx.playHapticTick();
                  }}
                  className={`relative group w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#2A2723] text-white shadow-md ring-2 ring-[#2A2723]/30 scale-105'
                      : 'bg-white text-[#7E7365] hover:text-[#2A2723] hover:bg-[#F0EEE6] border border-[#E6E2D3]'
                  }`}
                  title={`Slide ${idx + 1}: ${slide.name || 'Custom Slide'} (${slide.aspectLabel || '4:5'})`}
                >
                  <span>{idx + 1}</span>

                  {/* Floating Tooltip on Hover */}
                  <div className="absolute left-full ml-2 hidden group-hover:flex items-center z-50 pointer-events-none">
                    <div className="bg-[#2A2723] text-white text-[11px] font-medium px-2.5 py-1 rounded-lg shadow-xl whitespace-nowrap border border-white/10 flex items-center gap-1.5">
                      <span className="font-semibold">Slide {idx + 1}</span>
                      <span className="text-[#D4A373] text-[10px] font-mono bg-white/10 px-1 py-0.2 rounded">
                        {slide.aspectLabel || '4:5'}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Add Slide Quick Icon */}
          <button
            type="button"
            onClick={() => {
              onAddNewSlide();
              soundFx.playHapticTick();
            }}
            className="w-9 h-9 rounded-xl bg-white hover:bg-amber-50 text-[#2A2723] hover:text-amber-700 border border-dashed border-[#A69480] hover:border-amber-500 shadow-xs flex items-center justify-center transition-all cursor-pointer active:scale-95"
            title="Add Template as New Slide"
          >
            <Plus className="w-4 h-4" />
          </button>
        </aside>
      ) : (
        /* Expanded Left Menu Mode */
        <aside
          id="project-slides-left-menu"
          className="hidden md:flex flex-col w-60 lg:w-64 h-full bg-[#FAF9F6] border-r border-[#E6E2D3] shadow-xs z-20 flex-shrink-0 select-none transition-all duration-300 overflow-hidden"
          aria-label="Project & Slides Left Menu"
        >
          {renderContent(false)}
        </aside>
      )}
    </>
  );
};
