import React, { useState } from 'react';
import { Adjustments, ColorChannel, HSLChannel } from '../../types';
import { RotateCcw } from 'lucide-react';
import { soundFx } from '../../utils/audio';

interface HslAdjustmentsProps {
  adjustments: Adjustments;
  onChange: (newAdj: Adjustments) => void;
}

const CHANNELS: { id: ColorChannel; label: string; color: string; bg: string }[] = [
  { id: 'red', label: 'Red', color: '#EF4444', bg: 'bg-red-500' },
  { id: 'orange', label: 'Orange (Skin)', color: '#F97316', bg: 'bg-orange-500' },
  { id: 'yellow', label: 'Yellow', color: '#EAB308', bg: 'bg-yellow-500' },
  { id: 'green', label: 'Green', color: '#22C55E', bg: 'bg-green-500' },
  { id: 'cyan', label: 'Cyan', color: '#06B6D4', bg: 'bg-cyan-500' },
  { id: 'blue', label: 'Blue', color: '#3B82F6', bg: 'bg-blue-500' },
  { id: 'purple', label: 'Purple', color: '#A855F7', bg: 'bg-purple-500' },
  { id: 'magenta', label: 'Magenta', color: '#EC4899', bg: 'bg-pink-500' },
];

export const HslAdjustments: React.FC<HslAdjustmentsProps> = ({
  adjustments,
  onChange,
}) => {
  const [activeChannel, setActiveChannel] = useState<ColorChannel>('orange');

  const currentChannelData = adjustments.hsl[activeChannel];

  const updateChannelValue = (field: keyof HSLChannel, val: number) => {
    onChange({
      ...adjustments,
      hsl: {
        ...adjustments.hsl,
        [activeChannel]: {
          ...adjustments.hsl[activeChannel],
          [field]: val,
        },
      },
    });
  };

  const resetCurrentChannel = () => {
    soundFx.playHapticTick();
    onChange({
      ...adjustments,
      hsl: {
        ...adjustments.hsl,
        [activeChannel]: { hue: 0, saturation: 0, luminance: 0 },
      },
    });
  };

  const resetAllHsl = () => {
    soundFx.playHapticTick();
    const cleanHsl = Object.keys(adjustments.hsl).reduce((acc, key) => {
      acc[key as ColorChannel] = { hue: 0, saturation: 0, luminance: 0 };
      return acc;
    }, {} as typeof adjustments.hsl);

    onChange({
      ...adjustments,
      hsl: cleanHsl,
    });
  };

  return (
    <div className="flex flex-col gap-4 max-h-[300px] overflow-y-auto px-1 pr-2 no-scrollbar">
      {/* Channel Selector Header */}
      <div className="flex items-center justify-between pb-1 border-b border-[#F0EEE6] text-xs">
        <span className="text-[#7E7365] font-medium tracking-wider uppercase text-[10px]">
          Selective Color Grading (HSL)
        </span>
        <button
          onClick={resetAllHsl}
          className="text-[11px] text-[#7E7365] hover:text-[#2A2723] transition-colors"
        >
          Reset All Colors
        </button>
      </div>

      {/* Color Dots Carousel */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        {CHANNELS.map((ch) => {
          const isSelected = activeChannel === ch.id;
          const isModified =
            Math.abs(adjustments.hsl[ch.id].hue) > 0.01 ||
            Math.abs(adjustments.hsl[ch.id].saturation) > 0.01 ||
            Math.abs(adjustments.hsl[ch.id].luminance) > 0.01;

          return (
            <button
              key={ch.id}
              onClick={() => {
                setActiveChannel(ch.id);
                soundFx.playHapticTick();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                isSelected
                  ? 'bg-white text-[#2A2723] ring-1 ring-[#2A2723] shadow-xs'
                  : 'bg-[#FAF9F6] text-[#7E7365] hover:text-[#2A2723] border border-[#E6E2D3]'
              }`}
            >
              <span
                style={{ backgroundColor: ch.color }}
                className="w-3 h-3 rounded-full shadow-inner inline-block relative"
              >
                {isModified && (
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#2A2723] ring-1 ring-white" />
                )}
              </span>
              <span>{ch.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Channel Sliders */}
      <div className="bg-[#FAF9F6] p-4 rounded-xl border border-[#E6E2D3] flex flex-col gap-3.5">
        <div className="flex items-center justify-between text-xs pb-1 border-b border-[#F0EEE6]">
          <span className="font-semibold text-[#2A2723] flex items-center gap-2">
            <span
              style={{
                backgroundColor: CHANNELS.find((c) => c.id === activeChannel)?.color,
              }}
              className="w-2.5 h-2.5 rounded-full"
            />
            {CHANNELS.find((c) => c.id === activeChannel)?.label} Adjustments
          </span>
          <button
            onClick={resetCurrentChannel}
            className="flex items-center gap-1 text-[11px] text-[#7E7365] hover:text-[#2A2723] transition-colors"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            Reset {CHANNELS.find((c) => c.id === activeChannel)?.label}
          </button>
        </div>

        {/* Hue Slider */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs text-[#2A2723]">
            <span>Hue Shift</span>
            <span className="font-mono text-[11px] text-[#2A2723] font-semibold">
              {Math.round(currentChannelData.hue * 180)}°
            </span>
          </div>
          <input
            type="range"
            min={-1}
            max={1}
            step={0.01}
            value={currentChannelData.hue}
            onChange={(e) => updateChannelValue('hue', parseFloat(e.target.value))}
            className="w-full accent-[#2A2723]"
          />
        </div>

        {/* Saturation Slider */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs text-[#2A2723]">
            <span>Saturation</span>
            <span className="font-mono text-[11px] text-[#2A2723] font-semibold">
              {Math.round(currentChannelData.saturation * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={-1}
            max={1}
            step={0.01}
            value={currentChannelData.saturation}
            onChange={(e) => updateChannelValue('saturation', parseFloat(e.target.value))}
            className="w-full accent-[#2A2723]"
          />
        </div>

        {/* Luminance Slider */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs text-[#2A2723]">
            <span>Luminance / Brightness</span>
            <span className="font-mono text-[11px] text-[#2A2723] font-semibold">
              {Math.round(currentChannelData.luminance * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={-1}
            max={1}
            step={0.01}
            value={currentChannelData.luminance}
            onChange={(e) => updateChannelValue('luminance', parseFloat(e.target.value))}
            className="w-full accent-[#2A2723]"
          />
        </div>
      </div>
    </div>
  );
};
