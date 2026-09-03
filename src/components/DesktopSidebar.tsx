import React from 'react';
import { ActiveTab, Adjustments, Preset, CollageTemplate, Project } from '../types';
import {
  Sparkles, Sliders, Palette, Flame, Activity, Frame,
  Crop as CropIcon, ChevronLeft, ChevronRight, Share2, Grid, Film, Layers, Type, Paperclip,
  Download, RotateCcw
} from 'lucide-react';
import { PresetsBar } from './PresetsBar';
import { BasicAdjustments } from './tools/BasicAdjustments';
import { HslAdjustments } from './tools/HslAdjustments';
import { EffectsAdjustments } from './tools/EffectsAdjustments';
import { CurvesAdjustments } from './tools/CurvesAdjustments';
import { BordersAdjustments } from './tools/BordersAdjustments';
import { CropAdjustments } from './tools/CropAdjustments';
import { TemplateCustomizerBar } from './template/TemplateCustomizerBar';
import { soundFx } from '../utils/audio';

interface DesktopSidebarProps {
  // Single Media / Adjustments Mode
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  adjustments: Adjustments;
  onChangeAdjustments: (newAdj: Adjustments) => void;
  presets: Preset[];
  onSelectPreset: (preset: Preset) => void;
  onOpenSavePresetModal: () => void;
  onToggleFavoritePreset: (presetId: string) => void;
  onDeleteCustomPreset: (presetId: string) => void;
  onImportPresetJSON: (file: File) => void;
  onExportPresetJSON: (preset: Preset) => void;
  // Collage / Multi-Slide Template Mode
  activeCollage: CollageTemplate | null;
  onChangeTemplate: (updated: CollageTemplate) => void;
  selectedSlotId: string | null;
  onSelectSlot: (slotId: string | null) => void;
  selectedTextId: string | null;
  onSelectText: (textId: string | null) => void;
  onTriggerSlotUpload: (slotId: string) => void;
  onChooseFromLibraryForSlot?: (slotId: string) => void;
  onRecordVideoForSlot?: (slotId: string) => void;
  onTakePhotoForSlot?: (slotId: string) => void;
  onBatchUploadMultipleMedia?: () => void;
  onOpenTemplateSelector?: () => void;
  onOpenExport?: () => void;
  // Multi-Slide Project Props
  currentProject?: Project | null;
  onSelectProjectSlide?: (index: number) => void;
  onDuplicateProjectSlide?: (index: number) => void;
  onDeleteProjectSlide?: (index: number) => void;
  onReorderProjectSlides?: (fromIndex: number, toIndex: number) => void;
  onAddNewSlide?: () => void;
  // Collapsible sidebar state
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const ADJUSTMENT_TABS: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
  { id: 'presets', label: 'Presets', icon: <Sparkles className="w-3.5 h-3.5" /> },
  { id: 'adjust', label: 'Tones', icon: <Sliders className="w-3.5 h-3.5" /> },
  { id: 'hsl', label: 'HSL Color', icon: <Palette className="w-3.5 h-3.5" /> },
  { id: 'effects', label: 'Effects', icon: <Flame className="w-3.5 h-3.5" /> },
  { id: 'curves', label: 'Curves', icon: <Activity className="w-3.5 h-3.5" /> },
  { id: 'frames', label: 'Frames', icon: <Frame className="w-3.5 h-3.5" /> },
  { id: 'crop', label: 'Crop', icon: <CropIcon className="w-3.5 h-3.5" /> },
];

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  activeTab,
  setActiveTab,
  adjustments,
  onChangeAdjustments,
  presets,
  onSelectPreset,
  onOpenSavePresetModal,
  onToggleFavoritePreset,
  onDeleteCustomPreset,
  onImportPresetJSON,
  onExportPresetJSON,
  activeCollage,
  onChangeTemplate,
  selectedSlotId,
  onSelectSlot,
  selectedTextId,
  onSelectText,
  onTriggerSlotUpload,
  onChooseFromLibraryForSlot,
  onRecordVideoForSlot,
  onTakePhotoForSlot,
  onBatchUploadMultipleMedia,
  onOpenTemplateSelector,
  onOpenExport,
  currentProject,
  onSelectProjectSlide,
  onDuplicateProjectSlide,
  onDeleteProjectSlide,
  onReorderProjectSlides,
  onAddNewSlide,
  isCollapsed,
  onToggleCollapse,
}) => {
  if (isCollapsed) {
    return (
      <aside
        id="desktop-sidebar-collapsed"
        className="hidden md:flex flex-col items-center justify-between w-14 h-full bg-white/95 backdrop-blur-xl border-l border-[#E6E2D3] py-4 shadow-sm z-20 flex-shrink-0 relative select-none transition-all duration-300 ease-in-out"
      >
        {/* Edge Toggle Handle to Expand */}
        <button
          type="button"
          onClick={() => {
            onToggleCollapse();
            soundFx.playHapticTick();
          }}
          className="absolute -left-3.5 top-1/2 -translate-y-1/2 w-7 h-12 rounded-l-xl bg-white hover:bg-[#FAF9F6] border-y border-l border-[#E6E2D3] shadow-md flex items-center justify-center text-[#7E7365] hover:text-[#2A2723] hover:scale-105 active:scale-95 transition-all z-30 cursor-pointer group"
          title="Expand Right Sidebar (\)"
          aria-label="Expand Sidebar"
        >
          <ChevronLeft className="w-4 h-4 stroke-[2.5] group-hover:-translate-x-0.5 transition-transform" />
        </button>

        {/* Top Expand Button */}
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => {
              onToggleCollapse();
              soundFx.playHapticTick();
            }}
            className="w-9 h-9 rounded-xl bg-[#FAF9F6] hover:bg-[#2A2723] hover:text-white border border-[#E6E2D3] flex items-center justify-center text-[#2A2723] hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-xs group"
            title="Expand Pro Editing Sidebar (\)"
            aria-label="Expand Sidebar"
          >
            <ChevronLeft className="w-4 h-4 stroke-[2.2] group-hover:-translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Quick Vertical Icon Indicators (Click to switch tab and auto-expand) */}
        <div className="flex flex-col items-center gap-2">
          {activeCollage ? (
            <>
              <button
                type="button"
                onClick={() => {
                  onToggleCollapse();
                  soundFx.playHapticTick();
                }}
                className="w-9 h-9 rounded-xl text-[#7E7365] hover:text-[#2A2723] flex items-center justify-center hover:bg-[#FAF9F6] hover:scale-105 transition-all cursor-pointer group relative"
                title="Filmstrip & Slides"
              >
                <Film className="w-4 h-4 text-amber-600" />
              </button>
              <button
                type="button"
                onClick={() => {
                  onToggleCollapse();
                  soundFx.playHapticTick();
                }}
                className="w-9 h-9 rounded-xl text-[#7E7365] hover:text-[#2A2723] flex items-center justify-center hover:bg-[#FAF9F6] hover:scale-105 transition-all cursor-pointer group relative"
                title="Media Frames & Slots"
              >
                <Layers className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  onToggleCollapse();
                  soundFx.playHapticTick();
                }}
                className="w-9 h-9 rounded-xl text-[#7E7365] hover:text-[#2A2723] flex items-center justify-center hover:bg-[#FAF9F6] hover:scale-105 transition-all cursor-pointer group relative"
                title="Typography & Labels"
              >
                <Type className="w-4 h-4" />
              </button>
            </>
          ) : (
            ADJUSTMENT_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setActiveTab(t.id);
                  onToggleCollapse();
                  soundFx.playHapticTick();
                }}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer hover:scale-105 ${
                  activeTab === t.id
                    ? 'bg-[#2A2723] text-white shadow-xs'
                    : 'text-[#7E7365] hover:text-[#2A2723] hover:bg-[#FAF9F6]'
                }`}
                title={`Open ${t.label}`}
              >
                {t.icon}
              </button>
            ))
          )}
        </div>

        {/* Bottom Quick Actions */}
        <div className="flex flex-col items-center gap-2">
          {onOpenExport && (
            <button
              type="button"
              onClick={() => {
                onOpenExport();
                soundFx.playHapticTick();
              }}
              className="w-9 h-9 rounded-xl bg-[#2A2723] hover:bg-black text-white flex items-center justify-center shadow-sm active:scale-95 transition-all cursor-pointer"
              title="Export & Download"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>
    );
  }

  return (
    <aside
      id="desktop-sidebar-expanded"
      className="hidden md:flex flex-col w-[360px] lg:w-[380px] h-full bg-white/95 backdrop-blur-xl border-l border-[#E6E2D3] shadow-md z-20 flex-shrink-0 overflow-hidden relative transition-all duration-300 ease-in-out"
    >
      {/* Edge Toggle Handle to Collapse */}
      <button
        type="button"
        onClick={() => {
          onToggleCollapse();
          soundFx.playHapticTick();
        }}
        className="absolute -left-3.5 top-1/2 -translate-y-1/2 w-7 h-12 rounded-l-xl bg-white hover:bg-[#FAF9F6] border-y border-l border-[#E6E2D3] shadow-md flex items-center justify-center text-[#7E7365] hover:text-[#2A2723] hover:scale-105 active:scale-95 transition-all z-30 cursor-pointer group"
        title="Collapse Sidebar for Full Canvas Mode (\)"
        aria-label="Collapse Sidebar"
      >
        <ChevronRight className="w-4 h-4 stroke-[2.5] group-hover:translate-x-0.5 transition-transform" />
      </button>

      {/* Sidebar Header with Collapse Toggle & Title */}
      <div className="px-4 py-3 border-b border-[#F0EEE6] flex items-center justify-between flex-shrink-0 bg-[#FAF9F6]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#2A2723]" />
          <span className="text-xs font-serif font-bold text-[#2A2723] uppercase tracking-wider">
            {activeCollage ? 'Collage Studio' : 'Pro Laboratory'}
          </span>
          {activeCollage && currentProject && (
            <span className="text-[10px] bg-[#EFECE6] text-[#7E7365] px-2 py-0.5 rounded-md font-mono">
              Slide {(currentProject.activeCollageIndex ?? 0) + 1}/{currentProject.collages.length || 1}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {onOpenExport && (
            <button
              type="button"
              onClick={() => {
                onOpenExport();
                soundFx.playHapticTick();
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#2A2723] hover:bg-black text-white text-[11px] font-semibold transition-all active:scale-95 cursor-pointer shadow-xs"
              title="Export & Share"
            >
              <Share2 className="w-3 h-3" />
              <span>Export</span>
            </button>
          )}

          {/* Explicit Collapse Button */}
          <button
            type="button"
            onClick={() => {
              onToggleCollapse();
              soundFx.playHapticTick();
            }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[#7E7365] hover:text-[#2A2723] hover:bg-[#EBE7DD] transition-all cursor-pointer text-xs font-semibold"
            title="Collapse Sidebar for Max Canvas Space (\)"
            aria-label="Collapse Sidebar"
          >
            <ChevronRight className="w-4 h-4 stroke-[2.2]" />
            <span className="text-[11px] hidden xl:inline">Collapse</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col">
        {activeCollage ? (
          <TemplateCustomizerBar
            template={activeCollage}
            onChangeTemplate={onChangeTemplate}
            selectedSlotId={selectedSlotId}
            onSelectSlot={onSelectSlot}
            selectedTextId={selectedTextId}
            onSelectText={onSelectText}
            onTriggerSlotUpload={onTriggerSlotUpload}
            onChooseFromLibraryForSlot={onChooseFromLibraryForSlot}
            onRecordVideoForSlot={onRecordVideoForSlot}
            onTakePhotoForSlot={onTakePhotoForSlot}
            onBatchUploadMultipleMedia={onBatchUploadMultipleMedia}
            presets={presets}
            onApplyPresetToTemplate={(preset) => {
              onChangeAdjustments({ ...adjustments, ...preset.adjustments });
            }}
            onOpenTemplateSelector={onOpenTemplateSelector}
            onOpenExport={onOpenExport}
            isCollapsed={false}
            project={currentProject}
            onSelectProjectSlide={onSelectProjectSlide}
            onDuplicateProjectSlide={onDuplicateProjectSlide}
            onDeleteProjectSlide={onDeleteProjectSlide}
            onReorderProjectSlides={onReorderProjectSlides}
            onAddNewSlide={onAddNewSlide}
            isSidebarMode={true}
          />
        ) : (
          <div className="flex flex-col h-full">
            {/* Tab navigation pills */}
            <div className="p-3 border-b border-[#F0EEE6] bg-[#FAF9F6]/50">
              <div className="grid grid-cols-4 gap-1.5">
                {ADJUSTMENT_TABS.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(tab.id);
                        soundFx.playHapticTick();
                      }}
                      className={`flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-xl text-[11px] font-medium transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#2A2723] text-white shadow-xs font-semibold'
                          : 'bg-white text-[#7E7365] hover:text-[#2A2723] hover:bg-[#F0EEE6] border border-[#E6E2D3]'
                      }`}
                    >
                      <span>{tab.icon}</span>
                      <span className="truncate max-w-[65px]">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tab Panels */}
            <div className="p-4 flex-1 overflow-y-auto no-scrollbar">
              {activeTab === 'presets' && (
                <PresetsBar
                  presets={presets}
                  activePresetId={adjustments.presetId}
                  presetStrength={adjustments.presetStrength}
                  onSelectPreset={onSelectPreset}
                  onChangeStrength={(strength) =>
                    onChangeAdjustments({ ...adjustments, presetStrength: strength })
                  }
                  onOpenSaveModal={onOpenSavePresetModal}
                  onToggleFavorite={onToggleFavoritePreset}
                  onDeleteCustomPreset={onDeleteCustomPreset}
                  onImportPresetJSON={onImportPresetJSON}
                  onExportPresetJSON={onExportPresetJSON}
                />
              )}

              {activeTab === 'adjust' && (
                <BasicAdjustments
                  adjustments={adjustments}
                  onChange={onChangeAdjustments}
                />
              )}

              {activeTab === 'hsl' && (
                <HslAdjustments
                  adjustments={adjustments}
                  onChange={onChangeAdjustments}
                />
              )}

              {activeTab === 'effects' && (
                <EffectsAdjustments
                  adjustments={adjustments}
                  onChange={onChangeAdjustments}
                />
              )}

              {activeTab === 'curves' && (
                <CurvesAdjustments
                  adjustments={adjustments}
                  onChange={onChangeAdjustments}
                />
              )}

              {activeTab === 'frames' && (
                <BordersAdjustments
                  adjustments={adjustments}
                  onChange={onChangeAdjustments}
                />
              )}

              {activeTab === 'crop' && (
                <CropAdjustments
                  adjustments={adjustments}
                  onChange={onChangeAdjustments}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
