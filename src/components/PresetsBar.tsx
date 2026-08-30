import React, { useState } from 'react';
import { Preset, Adjustments } from '../types';
import { Plus, Star, MoreVertical, Sliders, Trash2, Download, Upload, Sparkles } from 'lucide-react';
import { soundFx } from '../utils/audio';

interface PresetsBarProps {
  presets: Preset[];
  activePresetId: string;
  presetStrength: number;
  onSelectPreset: (preset: Preset) => void;
  onChangeStrength: (strength: number) => void;
  onOpenSaveModal: () => void;
  onToggleFavorite: (presetId: string) => void;
  onDeleteCustomPreset: (presetId: string) => void;
  onImportPresetJSON: (file: File) => void;
  onExportPresetJSON: (preset: Preset) => void;
}

const CATEGORIES = [
  'All',
  'LumenLab Signature',
  'Editorial',
  'Vintage Film',
  'Golden & Warm',
  'Moody & B&W',
  'Custom',
  'Favorites',
] as const;

export const PresetsBar: React.FC<PresetsBarProps> = ({
  presets,
  activePresetId,
  presetStrength,
  onSelectPreset,
  onChangeStrength,
  onOpenSaveModal,
  onToggleFavorite,
  onDeleteCustomPreset,
  onImportPresetJSON,
  onExportPresetJSON,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const filteredPresets = presets.filter((p) => {
    if (selectedCategory === 'Favorites') return p.isFavorite;
    if (selectedCategory === 'Custom') return p.isCustom;
    if (selectedCategory === 'All') return true;
    return p.category === selectedCategory;
  });

  const handlePresetClick = (preset: Preset) => {
    onSelectPreset(preset);
    soundFx.playHapticTick();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImportPresetJSON(e.target.files[0]);
    }
  };

  return (
    <div className="w-full flex flex-col gap-2.5">
      {/* Category Pills & Preset Actions Bar */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar pb-1 border-b border-[#F0EEE6]">
        <div className="flex items-center gap-1.5 flex-nowrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setSelectedCategory(cat);
                soundFx.playHapticTick();
              }}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-[#2A2723] text-white shadow-xs'
                  : 'bg-[#FAF9F6] text-[#7E7365] hover:text-[#2A2723] border border-[#E6E2D3]'
              }`}
            >
              {cat === 'Favorites' ? '★ Favorites' : cat}
            </button>
          ))}
        </div>

        {/* Action buttons: Save Custom & Import Preset Recipe */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.lrpreset,.lumenlab,.lrstudio"
            onChange={handleImportFile}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 px-3 py-1 rounded-full bg-white hover:bg-[#FAF9F6] border border-[#E6E2D3] text-xs text-[#2A2723] transition-colors"
            title="Import preset recipe JSON file"
          >
            <Upload className="w-3 h-3 text-[#2A2723]" />
            <span className="hidden sm:inline">Import Recipe</span>
          </button>

          <button
            onClick={() => {
              onOpenSaveModal();
              soundFx.playHapticTick();
            }}
            className="flex items-center gap-1 px-3.5 py-1 rounded-full bg-[#2A2723] hover:bg-black text-white text-xs font-medium shadow-xs active:scale-95 transition-all"
            title="Save Current Edits as New Preset"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>Save Preset</span>
          </button>
        </div>
      </div>

      {/* Preset Intensity Slider (Visible when active preset != none) */}
      {activePresetId !== 'none' && (
        <div className="flex items-center justify-between gap-4 bg-[#FAF9F6] px-4 py-2 rounded-xl border border-[#E6E2D3] animate-in fade-in">
          <div className="flex items-center gap-2 text-xs text-[#2A2723] whitespace-nowrap">
            <Sliders className="w-3.5 h-3.5 text-[#2A2723]" />
            <span className="font-semibold">{presets.find((p) => p.id === activePresetId)?.name || 'Preset'}</span>
            <span className="text-[#7E7365]">Strength</span>
          </div>

          <div className="flex items-center gap-3 flex-1 max-w-xs">
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={presetStrength}
              onChange={(e) => onChangeStrength(parseFloat(e.target.value))}
              className="flex-1 accent-[#2A2723]"
            />
            <span className="font-mono text-xs text-[#2A2723] min-w-[36px] text-right font-semibold">
              {Math.round(presetStrength * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* Horizontal Carousel of Presets */}
      <div className="flex items-center gap-3 overflow-x-auto py-2 px-1 no-scrollbar">
        {filteredPresets.map((preset) => {
          const isSelected = activePresetId === preset.id;
          return (
            <div
              key={preset.id}
              className={`group relative flex-shrink-0 w-24 sm:w-28 flex flex-col rounded-xl overflow-hidden border transition-all cursor-pointer select-none ${
                isSelected
                  ? 'border-[#2A2723] ring-2 ring-[#2A2723]/30 shadow-md scale-[1.02] bg-white'
                  : 'border-[#E6E2D3] hover:border-[#A69480] bg-white'
              }`}
              onClick={() => handlePresetClick(preset)}
            >
              {/* Swatch visual preview header */}
              <div
                style={{
                  backgroundColor: preset.thumbnailColor || '#E6E2D3',
                  backgroundImage: preset.id !== 'none'
                    ? `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4), transparent 70%), linear-gradient(135deg, ${preset.thumbnailColor || '#D4A373'}, #2A2723)`
                    : 'none',
                }}
                className="w-full h-14 relative flex items-center justify-center overflow-hidden"
              >
                {/* Badge (e.g. Iconic, Retro) */}
                {preset.badge && (
                  <span className="absolute top-1.5 left-1.5 text-[8px] tracking-wider uppercase font-bold px-1.5 py-0.5 rounded-full bg-white/90 backdrop-blur-sm text-[#2A2723] border border-[#E6E2D3]">
                    {preset.badge}
                  </span>
                )}

                {/* Favorite Star */}
                {preset.id !== 'none' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(preset.id);
                      soundFx.playHapticTick();
                    }}
                    className={`absolute top-1.5 right-1.5 p-1 rounded-full bg-white/80 backdrop-blur-sm transition-colors ${
                      preset.isFavorite ? 'text-[#D4AF37]' : 'text-[#7E7365] hover:text-[#2A2723]'
                    }`}
                  >
                    <Star className={`w-3 h-3 ${preset.isFavorite ? 'fill-[#D4AF37]' : ''}`} />
                  </button>
                )}

                {/* Preset Center Text */}
                <span className="font-editorial text-xs sm:text-sm font-bold tracking-widest text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]">
                  {preset.name}
                </span>
              </div>

              {/* Card Footer Info */}
              <div className="p-2 flex items-center justify-between bg-white border-t border-[#F0EEE6]">
                <div className="flex flex-col">
                  <span className="text-[11px] font-semibold text-[#2A2723] truncate max-w-[70px]">
                    {preset.name}
                  </span>
                  <span className="text-[9px] text-[#7E7365] truncate max-w-[70px]">
                    {preset.category}
                  </span>
                </div>

                {/* Custom preset actions menu */}
                {preset.isCustom && (
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenId(menuOpenId === preset.id ? null : preset.id);
                      }}
                      className="p-1 text-[#7E7365] hover:text-[#2A2723]"
                    >
                      <MoreVertical className="w-3 h-3" />
                    </button>

                    {menuOpenId === preset.id && (
                      <div className="absolute right-0 bottom-full mb-1 w-32 bg-white border border-[#E6E2D3] rounded-lg shadow-xl p-1 z-30 flex flex-col gap-1 text-xs">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onExportPresetJSON(preset);
                            setMenuOpenId(null);
                          }}
                          className="flex items-center gap-1.5 px-2 py-1 hover:bg-[#FAF9F6] rounded text-[#2A2723]"
                        >
                          <Download className="w-3 h-3" />
                          <span>Export File</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteCustomPreset(preset.id);
                            setMenuOpenId(null);
                          }}
                          className="flex items-center gap-1.5 px-2 py-1 hover:bg-red-50 rounded text-red-600"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
