import React from 'react';
import { Sun, Contrast, CloudSun, Moon, Thermometer, Palette, Sparkles, Wand2, RotateCcw } from 'lucide-react';
import { Adjustments } from '../../types';
import { soundFx } from '../../utils/audio';

interface BasicAdjustmentsProps {
  adjustments: Adjustments;
  onChange: (newAdj: Adjustments) => void;
}

interface SliderControlProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (val: number) => void;
  onReset: () => void;
}

const SliderControl: React.FC<SliderControlProps> = ({
  icon,
  label,
  value,
  min = -1,
  max = 1,
  step = 0.01,
  onChange,
  onReset,
}) => {
  const displayVal = Math.round(value * 100);
  const isChanged = Math.abs(value) > 0.001;

  return (
    <div className="flex flex-col gap-1.5 bg-[#FAF9F6] p-3 rounded-xl border border-[#E6E2D3] hover:border-[#C5BDB2] transition-all">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-[#2A2723]">
          <span className="text-[#2A2723]">{icon}</span>
          <span className="font-medium tracking-wide">{label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`font-mono text-[11px] ${isChanged ? 'text-[#2A2723] font-bold' : 'text-[#8C8275]'}`}>
            {displayVal > 0 ? `+${displayVal}` : displayVal}
          </span>
          {isChanged && (
            <button
              onClick={() => { onReset(); soundFx.playHapticTick(); }}
              className="p-0.5 text-[#8C8275] hover:text-[#2A2723] transition-colors"
              title="Reset value"
            >
              <RotateCcw className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-[#2A2723]"
      />
    </div>
  );
};

export const BasicAdjustments: React.FC<BasicAdjustmentsProps> = ({
  adjustments,
  onChange,
}) => {
  const updateField = (field: keyof Adjustments, val: number) => {
    onChange({
      ...adjustments,
      [field]: val,
    });
  };

  const resetAllBasic = () => {
    soundFx.playHapticTick();
    onChange({
      ...adjustments,
      exposure: 0,
      contrast: 0,
      highlights: 0,
      shadows: 0,
      whites: 0,
      blacks: 0,
      temperature: 0,
      tint: 0,
      saturation: 0,
      vibrance: 0,
      clarity: 0,
    });
  };

  return (
    <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto px-1 pr-2 no-scrollbar">
      {/* Quick Reset All Header */}
      <div className="flex items-center justify-between pb-1 border-b border-[#F0EEE6] text-xs">
        <span className="text-[#7E7365] font-medium tracking-wider uppercase text-[10px]">
          Light & Color Balances
        </span>
        <button
          onClick={resetAllBasic}
          className="text-[11px] text-[#7E7365] hover:text-[#2A2723] transition-colors"
        >
          Reset Basic
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
        <SliderControl
          icon={<Sun className="w-3.5 h-3.5" />}
          label="Exposure"
          value={adjustments.exposure}
          onChange={(v) => updateField('exposure', v)}
          onReset={() => updateField('exposure', 0)}
        />

        <SliderControl
          icon={<Contrast className="w-3.5 h-3.5" />}
          label="Contrast"
          value={adjustments.contrast}
          onChange={(v) => updateField('contrast', v)}
          onReset={() => updateField('contrast', 0)}
        />

        <SliderControl
          icon={<Thermometer className="w-3.5 h-3.5" />}
          label="Warmth / Temp"
          value={adjustments.temperature}
          onChange={(v) => updateField('temperature', v)}
          onReset={() => updateField('temperature', 0)}
        />

        <SliderControl
          icon={<Palette className="w-3.5 h-3.5" />}
          label="Tint"
          value={adjustments.tint}
          onChange={(v) => updateField('tint', v)}
          onReset={() => updateField('tint', 0)}
        />

        <SliderControl
          icon={<CloudSun className="w-3.5 h-3.5" />}
          label="Highlights"
          value={adjustments.highlights}
          onChange={(v) => updateField('highlights', v)}
          onReset={() => updateField('highlights', 0)}
        />

        <SliderControl
          icon={<Moon className="w-3.5 h-3.5" />}
          label="Shadows"
          value={adjustments.shadows}
          onChange={(v) => updateField('shadows', v)}
          onReset={() => updateField('shadows', 0)}
        />

        <SliderControl
          icon={<Sun className="w-3.5 h-3.5" />}
          label="Whites"
          value={adjustments.whites}
          onChange={(v) => updateField('whites', v)}
          onReset={() => updateField('whites', 0)}
        />

        <SliderControl
          icon={<Moon className="w-3.5 h-3.5" />}
          label="Blacks"
          value={adjustments.blacks}
          onChange={(v) => updateField('blacks', v)}
          onReset={() => updateField('blacks', 0)}
        />

        <SliderControl
          icon={<Sparkles className="w-3.5 h-3.5" />}
          label="Saturation"
          value={adjustments.saturation}
          onChange={(v) => updateField('saturation', v)}
          onReset={() => updateField('saturation', 0)}
        />

        <SliderControl
          icon={<Sparkles className="w-3.5 h-3.5" />}
          label="Vibrance"
          value={adjustments.vibrance}
          onChange={(v) => updateField('vibrance', v)}
          onReset={() => updateField('vibrance', 0)}
        />

        <SliderControl
          icon={<Wand2 className="w-3.5 h-3.5" />}
          label="Clarity"
          value={adjustments.clarity}
          onChange={(v) => updateField('clarity', v)}
          onReset={() => updateField('clarity', 0)}
        />
      </div>
    </div>
  );
};
