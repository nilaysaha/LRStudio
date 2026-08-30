import React from 'react';
import { Adjustments } from '../../types';
import { RotateCw, FlipHorizontal, FlipVertical, Crop as CropIcon } from 'lucide-react';
import { soundFx } from '../../utils/audio';

interface CropAdjustmentsProps {
  adjustments: Adjustments;
  onChange: (newAdj: Adjustments) => void;
}

const RATIO_OPTIONS: { id: Adjustments['cropAspect']; label: string; desc: string }[] = [
  { id: 'free', label: 'Free / Original', desc: 'No fixed constraint' },
  { id: '1:1', label: '1:1 Square', desc: 'Instagram Post' },
  { id: '4:5', label: '4:5 Portrait', desc: 'Instagram Feed Standard' },
  { id: '9:16', label: '9:16 Vertical', desc: 'Story & Reels / TikTok' },
  { id: '16:9', label: '16:9 Cinema', desc: 'Widescreen HD' },
  { id: '3:4', label: '3:4 Classic', desc: 'Editorial Print' },
  { id: '2:3', label: '2:3 35mm', desc: 'Analog Photo Standard' },
];

export const CropAdjustments: React.FC<CropAdjustmentsProps> = ({
  adjustments,
  onChange,
}) => {
  const setAspect = (aspect: Adjustments['cropAspect']) => {
    soundFx.playHapticTick();
    onChange({
      ...adjustments,
      cropAspect: aspect,
    });
  };

  const handleRotate = () => {
    soundFx.playHapticTick();
    onChange({
      ...adjustments,
      rotation: (adjustments.rotation + 90) % 360,
    });
  };

  const handleFlipH = () => {
    soundFx.playHapticTick();
    onChange({
      ...adjustments,
      flipH: !adjustments.flipH,
    });
  };

  const handleFlipV = () => {
    soundFx.playHapticTick();
    onChange({
      ...adjustments,
      flipV: !adjustments.flipV,
    });
  };

  return (
    <div className="flex flex-col gap-3.5 max-h-[300px] overflow-y-auto px-1 pr-2 no-scrollbar">
      {/* Header & Transform tools */}
      <div className="flex items-center justify-between pb-1 border-b border-[#F0EEE6] text-xs">
        <span className="text-[#7E7365] font-medium tracking-wider uppercase text-[10px]">
          Aspect Ratios & Orientation
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleRotate}
            className="flex items-center gap-1 px-3 py-1 rounded-full bg-white hover:bg-[#FAF9F6] border border-[#E6E2D3] text-xs text-[#2A2723] transition-colors"
            title="Rotate 90°"
          >
            <RotateCw className="w-3.5 h-3.5 text-[#2A2723]" />
            <span>Rotate {adjustments.rotation}°</span>
          </button>
          <button
            onClick={handleFlipH}
            className={`p-1.5 rounded-full border transition-colors ${
              adjustments.flipH
                ? 'bg-[#2A2723] text-white border-[#2A2723]'
                : 'bg-white text-[#7E7365] border-[#E6E2D3] hover:text-[#2A2723]'
            }`}
            title="Flip Horizontally"
          >
            <FlipHorizontal className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleFlipV}
            className={`p-1.5 rounded-full border transition-colors ${
              adjustments.flipV
                ? 'bg-[#2A2723] text-white border-[#2A2723]'
                : 'bg-white text-[#7E7365] border-[#E6E2D3] hover:text-[#2A2723]'
            }`}
            title="Flip Vertically"
          >
            <FlipVertical className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Aspect Ratio Presets */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {RATIO_OPTIONS.map((r) => {
          const isSelected = adjustments.cropAspect === r.id;
          return (
            <button
              key={r.id}
              onClick={() => setAspect(r.id)}
              className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                isSelected
                  ? 'bg-white border-[#2A2723] ring-1 ring-[#2A2723] shadow-xs'
                  : 'bg-[#FAF9F6] border-[#E6E2D3] hover:border-[#C5BDB2]'
              }`}
            >
              <span className="text-xs font-semibold text-[#2A2723]">{r.label}</span>
              <span className="text-[10px] text-[#7E7365] mt-1">{r.desc}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
