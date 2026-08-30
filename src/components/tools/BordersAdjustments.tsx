import React from 'react';
import { Adjustments, FrameType } from '../../types';
import { soundFx } from '../../utils/audio';

interface BordersAdjustmentsProps {
  adjustments: Adjustments;
  onChange: (newAdj: Adjustments) => void;
}

const FRAME_OPTIONS: { id: FrameType; label: string; desc: string; previewClass: string }[] = [
  { id: 'none', label: 'No Frame', desc: 'Frameless full bleed', previewClass: 'bg-transparent border border-[#333]' },
  { id: 'film-35mm', label: '35mm Sprocket', desc: 'Analog 35mm film border with sprocket holes', previewClass: 'bg-black text-[#D4A373]' },
  { id: 'polaroid', label: 'Polaroid Instant', desc: 'Vintage classic white instant film with bottom chin', previewClass: 'bg-[#FAF7F2] text-[#444]' },
  { id: 'gallery-white', label: 'Editorial White', desc: 'Clean high-fashion white matting', previewClass: 'bg-white text-black' },
  { id: 'gallery-cream', label: 'Warm Linen Cream', desc: 'Subtle warm aesthetic linen gallery border', previewClass: 'bg-[#F4EDE2] text-[#666]' },
  { id: 'slide-120', label: '120mm Slide', desc: 'Medium format analog slide mount', previewClass: 'bg-[#181818] text-[#888]' },
  { id: 'retro-tv', label: 'Retro TV Curvature', desc: 'Vintage curved tube screen framing', previewClass: 'bg-[#252525] rounded-lg text-white' },
];

export const BordersAdjustments: React.FC<BordersAdjustmentsProps> = ({
  adjustments,
  onChange,
}) => {
  const updateField = (field: keyof Adjustments, val: any) => {
    onChange({
      ...adjustments,
      [field]: val,
    });
  };

  return (
    <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto px-1 pr-2 no-scrollbar">
      <div className="flex items-center justify-between pb-1 border-b border-[#F0EEE6] text-xs">
        <span className="text-[#7E7365] font-medium tracking-wider uppercase text-[10px]">
          Editorial Frames & Film Borders
        </span>
        {adjustments.frameType !== 'none' && (
          <button
            onClick={() => {
              soundFx.playHapticTick();
              updateField('frameType', 'none');
            }}
            className="text-[11px] text-[#7E7365] hover:text-[#2A2723] transition-colors"
          >
            Remove Frame
          </button>
        )}
      </div>

      {/* Frame cards grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
        {FRAME_OPTIONS.map((f) => {
          const isSelected = adjustments.frameType === f.id;
          return (
            <button
              key={f.id}
              onClick={() => {
                updateField('frameType', f.id);
                soundFx.playHapticTick();
              }}
              className={`flex flex-col items-center p-3 rounded-xl border text-center transition-all ${
                isSelected
                  ? 'bg-white border-[#2A2723] shadow-xs ring-1 ring-[#2A2723]'
                  : 'bg-[#FAF9F6] border-[#E6E2D3] hover:border-[#C5BDB2]'
              }`}
            >
              <div
                className={`w-12 h-10 mb-2 rounded flex items-center justify-center text-[9px] font-mono shadow-inner border border-[#E6E2D3] ${f.previewClass}`}
              >
                {f.id === 'film-35mm' ? '35MM' : f.id === 'polaroid' ? 'INSTANT' : ''}
              </div>
              <span className="text-xs font-semibold text-[#2A2723]">{f.label}</span>
              <span className="text-[10px] text-[#7E7365] line-clamp-1 mt-0.5">{f.desc}</span>
            </button>
          );
        })}
      </div>

      {/* Frame Thickness slider */}
      {adjustments.frameType !== 'none' && (
        <div className="bg-[#FAF9F6] p-3 rounded-xl border border-[#E6E2D3] flex flex-col gap-1.5 mt-1">
          <div className="flex items-center justify-between text-xs text-[#2A2723]">
            <span>Frame Thickness</span>
            <span className="font-mono text-[11px] text-[#2A2723] font-semibold">
              {Math.round(adjustments.frameWidth * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0.02}
            max={0.15}
            step={0.005}
            value={adjustments.frameWidth}
            onChange={(e) => updateField('frameWidth', parseFloat(e.target.value))}
            className="w-full accent-[#2A2723]"
          />
        </div>
      )}
    </div>
  );
};
