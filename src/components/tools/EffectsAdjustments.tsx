import React from 'react';
import { Adjustments, DustType, LightLeakType } from '../../types';
import { Sparkles, Sun, Flame, Aperture, Eye, Tv, RotateCcw } from 'lucide-react';
import { soundFx } from '../../utils/audio';

interface EffectsAdjustmentsProps {
  adjustments: Adjustments;
  onChange: (newAdj: Adjustments) => void;
}

export const EffectsAdjustments: React.FC<EffectsAdjustmentsProps> = ({
  adjustments,
  onChange,
}) => {
  const updateField = (field: keyof Adjustments, val: any) => {
    onChange({
      ...adjustments,
      [field]: val,
    });
  };

  const dustOptions: { id: DustType; label: string }[] = [
    { id: 'none', label: 'None' },
    { id: 'fine-specks', label: 'Fine Specks' },
    { id: 'film-scratches', label: 'Scratches' },
    { id: 'vintage-dust', label: 'Vintage 35mm' },
    { id: 'heavy-grunge', label: 'Grunge' },
  ];

  const leakOptions: { id: LightLeakType; label: string }[] = [
    { id: 'none', label: 'None' },
    { id: 'sunset', label: 'Sunset Top' },
    { id: 'side-flare', label: 'Side Flare' },
    { id: 'prism-beam', label: 'Prism Beam' },
    { id: 'corner-burn', label: 'Corner Burn' },
    { id: 'retro-streak', label: 'Retro Streak' },
  ];

  return (
    <div className="flex flex-col gap-4 max-h-[300px] overflow-y-auto px-1 pr-2 no-scrollbar">
      {/* Header */}
      <div className="flex items-center justify-between pb-1 border-b border-[#F0EEE6] text-xs">
        <span className="text-[#7E7365] font-medium tracking-wider uppercase text-[10px]">
          Editorial Film Textures & Vintage Effects
        </span>
        <button
          onClick={() => {
            soundFx.playHapticTick();
            onChange({
              ...adjustments,
              grainAmount: 0,
              dustType: 'none',
              dustAmount: 0,
              lightLeakType: 'none',
              lightLeakAmount: 0,
              glowAmount: 0,
              prismAmount: 0,
              vignetteAmount: 0,
              blurMode: 'none',
              blurAmount: 0,
              vhsAmount: 0,
            });
          }}
          className="text-[11px] text-[#7E7365] hover:text-[#2A2723] transition-colors"
        >
          Reset Effects
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* 1. Film Grain */}
        <div className="bg-[#FAF9F6] p-3 rounded-xl border border-[#E6E2D3] flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-xs text-[#2A2723]">
            <span className="flex items-center gap-1.5 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-[#2A2723]" />
              Film Grain
            </span>
            <span className="font-mono text-[11px] text-[#2A2723] font-semibold">
              {Math.round(adjustments.grainAmount * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={adjustments.grainAmount}
            onChange={(e) => updateField('grainAmount', parseFloat(e.target.value))}
            className="w-full accent-[#2A2723]"
          />

          {adjustments.grainAmount > 0.05 && (
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#F0EEE6]">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-[#7E7365]">Size</span>
                <input
                  type="range"
                  min={0.6}
                  max={2.5}
                  step={0.1}
                  value={adjustments.grainSize}
                  onChange={(e) => updateField('grainSize', parseFloat(e.target.value))}
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-[#7E7365]">Roughness</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={adjustments.grainRoughness}
                  onChange={(e) => updateField('grainRoughness', parseFloat(e.target.value))}
                />
              </div>
            </div>
          )}
        </div>

        {/* 2. Dust & Scratches */}
        <div className="bg-[#FAF9F6] p-3 rounded-xl border border-[#E6E2D3] flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-xs text-[#2A2723]">
            <span className="font-medium">Dust & Scratches</span>
            <span className="font-mono text-[11px] text-[#2A2723] font-semibold">
              {Math.round(adjustments.dustAmount * 100)}%
            </span>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1">
            {dustOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => {
                  updateField('dustType', opt.id);
                  if (adjustments.dustAmount === 0 && opt.id !== 'none') {
                    updateField('dustAmount', 0.35);
                  }
                  soundFx.playHapticTick();
                }}
                className={`px-2.5 py-1 rounded-full text-[11px] whitespace-nowrap transition-colors ${
                  adjustments.dustType === opt.id
                    ? 'bg-[#2A2723] text-white font-medium shadow-xs'
                    : 'bg-white text-[#7E7365] hover:text-[#2A2723] border border-[#E6E2D3]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {adjustments.dustType !== 'none' && (
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={adjustments.dustAmount}
              onChange={(e) => updateField('dustAmount', parseFloat(e.target.value))}
              className="w-full accent-[#2A2723]"
            />
          )}
        </div>

        {/* 3. Light Leaks & Sun Flares */}
        <div className="bg-[#FAF9F6] p-3 rounded-xl border border-[#E6E2D3] flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-xs text-[#2A2723]">
            <span className="flex items-center gap-1.5 font-medium">
              <Flame className="w-3.5 h-3.5 text-[#2A2723]" />
              Light Leaks & Flares
            </span>
            <span className="font-mono text-[11px] text-[#2A2723] font-semibold">
              {Math.round(adjustments.lightLeakAmount * 100)}%
            </span>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1">
            {leakOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => {
                  updateField('lightLeakType', opt.id);
                  if (adjustments.lightLeakAmount === 0 && opt.id !== 'none') {
                    updateField('lightLeakAmount', 0.4);
                  }
                  soundFx.playHapticTick();
                }}
                className={`px-2.5 py-1 rounded-full text-[11px] whitespace-nowrap transition-colors ${
                  adjustments.lightLeakType === opt.id
                    ? 'bg-[#2A2723] text-white font-medium shadow-xs'
                    : 'bg-white text-[#7E7365] hover:text-[#2A2723] border border-[#E6E2D3]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {adjustments.lightLeakType !== 'none' && (
            <div className="flex flex-col gap-1.5">
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={adjustments.lightLeakAmount}
                onChange={(e) => updateField('lightLeakAmount', parseFloat(e.target.value))}
                className="w-full accent-[#2A2723]"
              />
              <div className="flex items-center justify-between text-[10px] text-[#7E7365]">
                <span>Leak Warmth</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={adjustments.lightLeakWarmth}
                  onChange={(e) => updateField('lightLeakWarmth', parseFloat(e.target.value))}
                  className="w-32"
                />
              </div>
            </div>
          )}
        </div>

        {/* 4. Dreamy Glow / Halation Bloom */}
        <div className="bg-[#FAF9F6] p-3 rounded-xl border border-[#E6E2D3] flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-xs text-[#2A2723]">
            <span className="flex items-center gap-1.5 font-medium">
              <Sun className="w-3.5 h-3.5 text-[#2A2723]" />
              Dreamy Glow / Halation
            </span>
            <span className="font-mono text-[11px] text-[#2A2723] font-semibold">
              {Math.round(adjustments.glowAmount * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={adjustments.glowAmount}
            onChange={(e) => updateField('glowAmount', parseFloat(e.target.value))}
            className="w-full accent-[#2A2723]"
          />
        </div>

        {/* 5. Chromatic Aberration / Prism */}
        <div className="bg-[#FAF9F6] p-3 rounded-xl border border-[#E6E2D3] flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-xs text-[#2A2723]">
            <span className="flex items-center gap-1.5 font-medium">
              <Aperture className="w-3.5 h-3.5 text-[#2A2723]" />
              Prism / Dispersion
            </span>
            <span className="font-mono text-[11px] text-[#2A2723] font-semibold">
              {Math.round(adjustments.prismAmount * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={adjustments.prismAmount}
            onChange={(e) => updateField('prismAmount', parseFloat(e.target.value))}
            className="w-full accent-[#2A2723]"
          />
        </div>

        {/* 6. Vignette */}
        <div className="bg-[#FAF9F6] p-3 rounded-xl border border-[#E6E2D3] flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-xs text-[#2A2723]">
            <span className="flex items-center gap-1.5 font-medium">
              <Eye className="w-3.5 h-3.5 text-[#2A2723]" />
              Vignette Falloff
            </span>
            <span className="font-mono text-[11px] text-[#2A2723] font-semibold">
              {Math.round(adjustments.vignetteAmount * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={-1}
            max={1}
            step={0.01}
            value={adjustments.vignetteAmount}
            onChange={(e) => updateField('vignetteAmount', parseFloat(e.target.value))}
            className="w-full accent-[#2A2723]"
          />
        </div>

        {/* 7. Blur / Tilt-Shift */}
        <div className="bg-[#FAF9F6] p-3 rounded-xl border border-[#E6E2D3] flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-xs text-[#2A2723]">
            <span className="font-medium">Tilt-Shift / Soft Focus</span>
            <span className="font-mono text-[11px] text-[#2A2723] font-semibold">
              {Math.round(adjustments.blurAmount * 100)}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            {(['none', 'radial', 'linear'] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  updateField('blurMode', m);
                  if (m !== 'none' && adjustments.blurAmount === 0) updateField('blurAmount', 0.4);
                  soundFx.playHapticTick();
                }}
                className={`px-3 py-1 rounded-full text-xs capitalize transition-colors ${
                  adjustments.blurMode === m
                    ? 'bg-[#2A2723] text-white font-medium shadow-xs'
                    : 'bg-white text-[#7E7365] border border-[#E6E2D3]'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          {adjustments.blurMode !== 'none' && (
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={adjustments.blurAmount}
              onChange={(e) => updateField('blurAmount', parseFloat(e.target.value))}
              className="w-full accent-[#2A2723]"
            />
          )}
        </div>

        {/* 8. VHS & Retro Glitch */}
        <div className="bg-[#FAF9F6] p-3 rounded-xl border border-[#E6E2D3] flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-xs text-[#2A2723]">
            <span className="flex items-center gap-1.5 font-medium">
              <Tv className="w-3.5 h-3.5 text-[#2A2723]" />
              VHS Scanlines
            </span>
            <span className="font-mono text-[11px] text-[#2A2723] font-semibold">
              {Math.round(adjustments.vhsAmount * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={adjustments.vhsAmount}
            onChange={(e) => updateField('vhsAmount', parseFloat(e.target.value))}
            className="w-full accent-[#2A2723]"
          />
        </div>
      </div>
    </div>
  );
};
