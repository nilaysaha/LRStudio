import React from 'react';
import { Adjustments, CropAspect, CropShape } from '../../types';
import {
  RotateCw, FlipHorizontal, FlipVertical, Crop as CropIcon,
  Circle, Square, RectangleHorizontal, RotateCcw, Crosshair, Sparkles
} from 'lucide-react';
import { soundFx } from '../../utils/audio';

interface CropAdjustmentsProps {
  adjustments: Adjustments;
  onChange: (newAdj: Adjustments) => void;
}

const SHAPE_OPTIONS: { id: CropShape; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: 'rect', label: 'Rectangle', icon: <RectangleHorizontal className="w-4 h-4" />, desc: 'Standard or ratio crop' },
  { id: 'square', label: 'Square (1:1)', icon: <Square className="w-4 h-4" />, desc: 'Instagram / Feed post' },
  { id: 'circle', label: 'Circular', icon: <Circle className="w-4 h-4" />, desc: 'Avatar / Round vignette' },
];

const RATIO_OPTIONS: { id: CropAspect; label: string; desc: string; shape?: CropShape }[] = [
  { id: 'free', label: 'Free-form', desc: 'Drag freely' },
  { id: '1:1', label: '1:1 Square', desc: 'Equal sides' },
  { id: 'circle', label: 'Circle Crop', desc: 'Radial profile' },
  { id: '4:5', label: '4:5 Portrait', desc: 'Instagram Feed' },
  { id: '9:16', label: '9:16 Vertical', desc: 'Reels / TikTok' },
  { id: '16:9', label: '16:9 Cinema', desc: 'Widescreen HD' },
  { id: '3:4', label: '3:4 Classic', desc: 'Editorial Print' },
  { id: '2:3', label: '2:3 35mm', desc: 'Analog Photo' },
];

export const CropAdjustments: React.FC<CropAdjustmentsProps> = ({
  adjustments,
  onChange,
}) => {
  const currentShape = adjustments.cropShape || (adjustments.cropAspect === 'circle' ? 'circle' : adjustments.cropAspect === '1:1' ? 'square' : 'rect');

  const setShape = (shape: CropShape) => {
    soundFx.playHapticTick();
    if (shape === 'circle') {
      onChange({
        ...adjustments,
        cropShape: 'circle',
        cropAspect: 'circle',
      });
    } else if (shape === 'square') {
      onChange({
        ...adjustments,
        cropShape: 'square',
        cropAspect: '1:1',
      });
    } else {
      onChange({
        ...adjustments,
        cropShape: 'rect',
        cropAspect: adjustments.cropAspect === 'circle' ? 'free' : adjustments.cropAspect,
      });
    }
  };

  const setAspect = (aspect: CropAspect) => {
    soundFx.playHapticTick();
    if (aspect === 'circle') {
      onChange({
        ...adjustments,
        cropShape: 'circle',
        cropAspect: 'circle',
      });
    } else if (aspect === '1:1') {
      onChange({
        ...adjustments,
        cropShape: 'square',
        cropAspect: '1:1',
      });
    } else {
      onChange({
        ...adjustments,
        cropShape: 'rect',
        cropAspect: aspect,
      });
    }
  };

  const handleResetCropBox = () => {
    soundFx.playHapticTick();
    onChange({
      ...adjustments,
      cropBox: { x: 0, y: 0, width: 1, height: 1 },
      cropAspect: 'free',
      cropShape: 'rect',
    });
  };

  const handleCenterCrop = () => {
    soundFx.playHapticTick();
    // Center a 70% crop box
    const size = 0.75;
    const offset = (1 - size) / 2;
    onChange({
      ...adjustments,
      cropBox: {
        x: offset,
        y: offset,
        width: size,
        height: size,
      },
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
    <div className="flex flex-col gap-3 max-h-[320px] overflow-y-auto px-1 pr-2 no-scrollbar">
      {/* Top Bar: Interactive Drag Tip & Transform Actions */}
      <div className="flex items-center justify-between pb-1 border-b border-[#F0EEE6] text-xs">
        <div className="flex items-center gap-1.5 text-[#7E7365]">
          <CropIcon className="w-3.5 h-3.5 text-[#2A2723]" />
          <span className="font-semibold text-[#2A2723] uppercase text-[10px] tracking-wider">
            Interactive Crop
          </span>
          <span className="hidden sm:inline text-[10px] text-[#7E7365] bg-[#FAF9F6] px-2 py-0.5 rounded-full border border-[#E6E2D3]">
            Drag handles with cursor / finger
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Center Box */}
          <button
            onClick={handleCenterCrop}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white hover:bg-[#FAF9F6] border border-[#E6E2D3] text-xs text-[#2A2723] transition-colors"
            title="Center Crop Area"
          >
            <Crosshair className="w-3 h-3 text-[#2A2723]" />
            <span className="text-[11px]">Center</span>
          </button>

          {/* Reset Box */}
          <button
            onClick={handleResetCropBox}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white hover:bg-[#FAF9F6] border border-[#E6E2D3] text-xs text-[#2A2723] transition-colors"
            title="Reset Crop to Full Image"
          >
            <RotateCcw className="w-3 h-3 text-[#2A2723]" />
            <span className="text-[11px]">Full</span>
          </button>

          <div className="h-3 w-[1px] bg-[#E6E2D3] mx-0.5" />

          {/* Rotate */}
          <button
            onClick={handleRotate}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white hover:bg-[#FAF9F6] border border-[#E6E2D3] text-xs text-[#2A2723] transition-colors"
            title="Rotate 90°"
          >
            <RotateCw className="w-3.5 h-3.5 text-[#2A2723]" />
            <span>{adjustments.rotation}°</span>
          </button>

          {/* Flip H */}
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

          {/* Flip V */}
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

      {/* 1. Crop Shape Selector (Rectangle vs Square vs Circle) */}
      <div className="flex flex-col gap-1.5">
        <div className="text-[10px] font-bold uppercase tracking-wider text-[#7E7365]">
          Crop Shape
        </div>
        <div className="grid grid-cols-3 gap-2">
          {SHAPE_OPTIONS.map((shape) => {
            const isSelected = currentShape === shape.id;
            return (
              <button
                key={shape.id}
                onClick={() => setShape(shape.id)}
                className={`p-2.5 rounded-xl border flex flex-col items-start gap-1 transition-all ${
                  isSelected
                    ? 'bg-[#2A2723] text-white border-[#2A2723] shadow-xs'
                    : 'bg-[#FAF9F6] text-[#2A2723] border-[#E6E2D3] hover:bg-white'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <div className={`p-1 rounded-md ${isSelected ? 'bg-white/20 text-white' : 'bg-white text-[#2A2723] border border-[#E6E2D3]'}`}>
                    {shape.icon}
                  </div>
                  <span className="text-xs font-semibold">{shape.label}</span>
                </div>
                <span className={`text-[10px] ${isSelected ? 'text-neutral-300' : 'text-[#7E7365]'}`}>
                  {shape.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Aspect Ratio Presets */}
      <div className="flex flex-col gap-1.5">
        <div className="text-[10px] font-bold uppercase tracking-wider text-[#7E7365]">
          Aspect Ratios & Proportions
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {RATIO_OPTIONS.map((r) => {
            const isSelected =
              (r.id === 'circle' && currentShape === 'circle') ||
              (r.id === '1:1' && currentShape === 'square') ||
              (adjustments.cropAspect === r.id && currentShape === 'rect');

            return (
              <button
                key={r.id}
                onClick={() => setAspect(r.id)}
                className={`p-2 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  isSelected
                    ? 'bg-white border-[#2A2723] ring-1 ring-[#2A2723] shadow-xs'
                    : 'bg-[#FAF9F6] border-[#E6E2D3] hover:border-[#C5BDB2]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#2A2723]">{r.label}</span>
                  {r.id === 'circle' && <Circle className="w-3 h-3 text-[#2A2723]" />}
                  {r.id === '1:1' && <Square className="w-3 h-3 text-[#2A2723]" />}
                </div>
                <span className="text-[10px] text-[#7E7365] mt-0.5">{r.desc}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
