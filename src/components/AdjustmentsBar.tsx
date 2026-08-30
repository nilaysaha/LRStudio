import React from 'react';
import { ActiveTab, Adjustments, Preset } from '../types';
import { Sparkles, Sliders, Palette, Flame, Activity, Frame, Crop as CropIcon } from 'lucide-react';
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
}) => {
  return (
    <div className="w-full bg-white/90 backdrop-blur-xl border-t border-[#E6E2D3] p-3 sm:p-4 flex flex-col gap-3 shadow-lg z-20">
      {/* Top Main Navigation Tabs */}
      <div className="flex items-center justify-between overflow-x-auto no-scrollbar gap-1 sm:gap-2 pb-1 border-b border-[#F0EEE6]">
        <div className="flex items-center gap-1 sm:gap-1.5 flex-nowrap">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  soundFx.playHapticTick();
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium tracking-wide whitespace-nowrap transition-all ${
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
      </div>

      {/* Tab Panels Content */}
      <div className="w-full">
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
  );
};
