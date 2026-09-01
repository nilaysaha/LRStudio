import React from 'react';
import { ActiveTab, Adjustments, Preset } from '../types';
import {
  Sparkles, Sliders, Palette, Flame, Activity, Frame,
  Crop as CropIcon, ChevronDown, ChevronUp, Maximize2, Minimize2
} from 'lucide-react';
import { PresetsBar } from './PresetsBar';
import { BasicAdjustments } from './tools/BasicAdjustments';
import { HslAdjustments } from './tools/HslAdjustments';
import { EffectsAdjustments } from './tools/EffectsAdjustments';
import { CurvesAdjustments } from './tools/CurvesAdjustments';
import { BordersAdjustments } from './tools/BordersAdjustments';
import { CropAdjustments } from './tools/CropAdjustments';
import { soundFx } from '../utils/audio';

interface AdjustmentsBarProps {
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
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const TABS: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
  { id: 'presets', label: 'Presets', icon: <Sparkles className="w-3.5 h-3.5" /> },
  { id: 'adjust', label: 'Tones', icon: <Sliders className="w-3.5 h-3.5" /> },
  { id: 'hsl', label: 'HSL Color', icon: <Palette className="w-3.5 h-3.5" /> },
  { id: 'effects', label: 'Film & Effects', icon: <Flame className="w-3.5 h-3.5" /> },
  { id: 'curves', label: 'Curves', icon: <Activity className="w-3.5 h-3.5" /> },
  { id: 'frames', label: 'Frames', icon: <Frame className="w-3.5 h-3.5" /> },
  { id: 'crop', label: 'Crop / Rotate', icon: <CropIcon className="w-3.5 h-3.5" /> },
];

export const AdjustmentsBar: React.FC<AdjustmentsBarProps> = ({
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
  isCollapsed = false,
  onToggleCollapse,
}) => {
  return (
    <div
      className={`w-full bg-white/95 backdrop-blur-xl border-t border-[#E6E2D3] transition-all duration-300 ease-in-out shadow-lg z-20 flex flex-col ${
        isCollapsed
          ? 'p-2 sm:py-2.5 sm:px-4'
          : 'p-3 sm:p-4 gap-2.5 sm:gap-3 max-h-[52vh] sm:max-h-[46vh] md:max-h-none overflow-y-auto'
      }`}
    >
      {/* Mobile Drawer Pull Notch */}
      {onToggleCollapse && (
        <button
          type="button"
          onClick={() => {
            onToggleCollapse();
            soundFx.playHapticTick();
          }}
          className="w-full flex items-center justify-center -mt-1 pb-1 cursor-pointer focus:outline-hidden group"
          title={isCollapsed ? 'Expand Controls Drawer' : 'Collapse Drawer to maximize canvas'}
          aria-label={isCollapsed ? 'Expand Controls' : 'Collapse Controls'}
        >
          <div className="w-12 h-1 rounded-full bg-[#D6D0C2] group-hover:bg-[#2A2723] transition-colors" />
        </button>
      )}

      {/* Main Navigation Tabs & Collapse Toggle Header */}
      <div className="flex items-center justify-between gap-1.5 sm:gap-2 pb-1 border-b border-[#F0EEE6]/80 flex-shrink-0">
        <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar py-0.5 flex-1 min-w-0">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  if (isCollapsed && onToggleCollapse) {
                    onToggleCollapse();
                  }
                  soundFx.playHapticTick();
                }}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-medium tracking-wide whitespace-nowrap transition-all cursor-pointer min-h-[36px] sm:min-h-[32px] ${
                  isActive
                    ? 'bg-[#2A2723] text-white shadow-xs'
                    : 'text-[#7E7365] hover:text-[#2A2723] hover:bg-[#F0EEE6]'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Collapse / Expand Toggle Button */}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={() => {
              onToggleCollapse();
              soundFx.playHapticTick();
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[#F5F2EB] hover:bg-[#EBE6DC] text-[#2A2723] text-xs font-semibold border border-[#E6E2D3] transition-all active:scale-95 cursor-pointer flex-shrink-0 min-h-[36px] sm:min-h-[32px]"
            title={isCollapsed ? 'Expand Controls Drawer' : 'Collapse Drawer (Maximize Viewport)'}
          >
            {isCollapsed ? (
              <>
                <ChevronUp className="w-3.5 h-3.5 stroke-[2.2]" />
                <span className="hidden sm:inline text-[11px]">Expand</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5 stroke-[2.2]" />
                <span className="hidden sm:inline text-[11px]">Hide</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Tab Panels Content (Visible when NOT collapsed) */}
      {!isCollapsed && (
        <div className="w-full transition-opacity duration-200 animate-in fade-in-50">
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
      )}
    </div>
  );
};
