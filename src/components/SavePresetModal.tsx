import React, { useState } from 'react';
import { X, Sparkles, Check } from 'lucide-react';
import { Adjustments, Preset } from '../types';
import { soundFx } from '../utils/audio';

interface SavePresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  adjustments: Adjustments;
  onSavePreset: (newPreset: Preset) => void;
}

const COLOR_SWATCHES = [
  '#DDA15E', '#BC6C25', '#E76F51', '#2A9D8F', '#E9C46A',
  '#F4A261', '#94D2BD', '#264653', '#A56644', '#495057'
];

export const SavePresetModal: React.FC<SavePresetModalProps> = ({
  isOpen,
  onClose,
  adjustments,
  onSavePreset,
}) => {
  const [name, setName] = useState('');
  const [badge, setBadge] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_SWATCHES[0]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newPreset: Preset = {
      id: `custom-${Date.now()}`,
      name: name.trim().toUpperCase(),
      category: 'Custom',
      description: 'Custom recipe created in LRStudio.',
      badge: badge.trim() || undefined,
      isCustom: true,
      thumbnailColor: selectedColor,
      adjustments: {
        ...adjustments,
        presetId: `custom-${Date.now()}`,
      },
    };

    onSavePreset(newPreset);
    soundFx.playHapticTick();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-white border border-[#E6E2D3] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#F0EEE6] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#2A2723]" />
            <span className="font-editorial text-base font-bold tracking-wider text-[#2A2723]">
              SAVE CUSTOM PRESET
            </span>
          </div>
          <button
            onClick={() => { onClose(); soundFx.playHapticTick(); }}
            className="p-1.5 rounded-lg text-[#7E7365] hover:text-[#2A2723] hover:bg-[#FAF9F6] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="p-5 flex flex-col gap-4">
          {/* Preset Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#2A2723]">
              Preset Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. TUSCANY 70s"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-[#FAF9F6] border border-[#E6E2D3] rounded-xl px-3.5 py-2.5 text-sm text-[#2A2723] placeholder-[#A69E91] focus:outline-none focus:border-[#2A2723]"
            />
          </div>

          {/* Badge Tag */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#2A2723]">
              Badge / Subtitle (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Golden, Film, Mood"
              value={badge}
              onChange={(e) => setBadge(e.target.value)}
              className="bg-[#FAF9F6] border border-[#E6E2D3] rounded-xl px-3.5 py-2 text-xs text-[#2A2723] placeholder-[#A69E91] focus:outline-none focus:border-[#2A2723]"
            />
          </div>

          {/* Swatch Color Accent */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-[#2A2723]">
              Preset Cover Swatch
            </label>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              {COLOR_SWATCHES.map((color) => (
                <button
                  type="button"
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  style={{ backgroundColor: color }}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform ${
                    selectedColor === color ? 'ring-2 ring-[#2A2723] scale-110' : 'opacity-80 hover:opacity-100'
                  }`}
                >
                  {selectedColor === color && <Check className="w-3.5 h-3.5 text-white drop-shadow" />}
                </button>
              ))}
            </div>
          </div>

          {/* Recipe Overview Summary */}
          <div className="bg-[#FAF9F6] p-3 rounded-xl border border-[#E6E2D3] text-[11px] text-[#7E7365] flex flex-col gap-1">
            <span className="font-semibold text-[#2A2723]">Recipe Settings Included:</span>
            <span>Exposure ({adjustments.exposure}), Contrast ({adjustments.contrast}), Warmth ({adjustments.temperature}), Grain ({Math.round(adjustments.grainAmount * 100)}%), Light Leaks, HSL Color Grading & Tone Curves.</span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F0EEE6]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full text-xs text-[#7E7365] hover:text-[#2A2723] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-5 py-2 rounded-full bg-[#2A2723] text-white font-medium text-xs disabled:opacity-50 shadow-xs hover:bg-black active:scale-95 transition-all"
            >
              Save Preset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
