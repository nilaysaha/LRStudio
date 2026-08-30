import React, { useState } from 'react';
import { Adjustments, CameraType, DateStampPosition, DateStampStyle, FrameType } from '../../types';
import { soundFx } from '../../utils/audio';
import { CAMERA_PROFILES } from '../../constants/cameraProfiles';
import { Camera, Calendar, Clock, Sparkles, Check, Sliders, ToggleLeft, ToggleRight } from 'lucide-react';
import { defaultDateStamp } from '../../constants/defaultAdjustments';

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

const DATE_STAMP_STYLES: { id: DateStampStyle; label: string; preview: string; colorClass: string; bgClass: string }[] = [
  { id: 'led-orange', label: '90s Orange LED', preview: "'98 08 30", colorClass: 'text-[#FF7A00]', bgClass: 'bg-black/90' },
  { id: 'led-red', label: 'Red Quartz LED', preview: "30 08 '98", colorClass: 'text-[#EF4444]', bgClass: 'bg-black/90' },
  { id: 'y2k-yellow', label: 'Y2K Digicam', preview: '2007.08.30', colorClass: 'text-[#FACC15]', bgClass: 'bg-black/80' },
  { id: 'camcorder-green', label: 'Camcorder Green', preview: 'AUG 30 1996', colorClass: 'text-[#22C55E]', bgClass: 'bg-black/80' },
  { id: 'vhs-white', label: 'VHS OSD White', preview: '30.08.1998', colorClass: 'text-zinc-100', bgClass: 'bg-blue-950/80' },
  { id: 'handicam-white', label: 'Sony DCR REC', preview: 'REC AUG 30', colorClass: 'text-white', bgClass: 'bg-black/80' },
  { id: 'film-gold', label: 'Kodak Film Gold', preview: "★ '98 08 30", colorClass: 'text-[#F59E0B]', bgClass: 'bg-black/90' },
  { id: 'classic-white', label: 'Minimalist Clean', preview: '2026-08-30', colorClass: 'text-white', bgClass: 'bg-black/60' },
];

const POSITIONS: { id: DateStampPosition; label: string }[] = [
  { id: 'bottom-right', label: 'Bottom Right' },
  { id: 'bottom-left', label: 'Bottom Left' },
  { id: 'top-right', label: 'Top Right' },
  { id: 'top-left', label: 'Top Left' },
];

export const BordersAdjustments: React.FC<BordersAdjustmentsProps> = ({
  adjustments,
  onChange,
}) => {
  const [cameraSearch, setCameraSearch] = useState('');

  const currentStamp = adjustments.dateStamp || { ...defaultDateStamp };

  const updateField = (field: keyof Adjustments, val: any) => {
    onChange({
      ...adjustments,
      [field]: val,
    });
  };

  const updateDateStamp = (partial: Partial<typeof currentStamp>) => {
    soundFx.playHapticTick();
    onChange({
      ...adjustments,
      dateStamp: {
        ...currentStamp,
        ...partial,
      },
    });
  };

  const handleSelectCamera = (camId: CameraType) => {
    soundFx.playHapticTick();
    const profile = CAMERA_PROFILES.find((c) => c.id === camId);
    if (profile) {
      onChange({
        ...profile.adjustments,
        cameraType: camId,
        dateStamp: adjustments.dateStamp || profile.adjustments.dateStamp,
        frameType: adjustments.frameType,
        frameWidth: adjustments.frameWidth,
        cropAspect: adjustments.cropAspect,
        cropBox: adjustments.cropBox,
        cropShape: adjustments.cropShape,
      });
    } else {
      updateField('cameraType', camId);
    }
  };

  return (
    <div className="flex flex-col gap-5 max-h-[380px] overflow-y-auto px-1 pr-2 no-scrollbar">
      {/* 1. Superimpose Date / Time Stamp Section (Explicit User Feature) */}
      <div className="bg-[#FAF9F6] p-3.5 rounded-xl border border-[#E6E2D3] flex flex-col gap-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#2A2723]" />
            <div>
              <h4 className="text-xs font-bold text-[#2A2723] uppercase tracking-wider">
                Superimpose Date & Time Stamp
              </h4>
              <p className="text-[10px] text-[#7E7365]">
                Burn retro LED or digicam date/time stamp onto photos
              </p>
            </div>
          </div>

          {/* Master Toggle Button */}
          <button
            onClick={() => updateDateStamp({ enabled: !currentStamp.enabled })}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              currentStamp.enabled
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-[#EAE6D8] text-[#7E7365] hover:text-[#2A2723]'
            }`}
          >
            <span>{currentStamp.enabled ? 'Enabled' : 'Disabled'}</span>
            {currentStamp.enabled ? (
              <ToggleRight className="w-4 h-4" />
            ) : (
              <ToggleLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Date Stamp Detailed Controls (Visible when enabled) */}
        {currentStamp.enabled && (
          <div className="flex flex-col gap-3 pt-2 border-t border-[#EAE6D8] animate-in fade-in-50 duration-200">
            {/* Style Cards */}
            <div>
              <label className="text-[10px] font-semibold text-[#7E7365] uppercase tracking-wider mb-1.5 block">
                Stamp Typography & LED Color
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {DATE_STAMP_STYLES.map((st) => {
                  const isSelected = (currentStamp.style || 'led-orange') === st.id;
                  return (
                    <button
                      key={st.id}
                      onClick={() => updateDateStamp({ style: st.id })}
                      className={`p-2 rounded-lg border text-left flex flex-col justify-between transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-white border-[#2A2723] ring-1 ring-[#2A2723] shadow-xs'
                          : 'bg-white/60 border-[#E6E2D3] hover:border-[#C5BDB2]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-semibold text-[#2A2723]">{st.label}</span>
                        {isSelected && <Check className="w-3 h-3 text-[#2A2723]" />}
                      </div>
                      <div className={`p-1 rounded text-center text-xs font-mono font-bold tracking-wider ${st.bgClass} ${st.colorClass}`}>
                        {st.preview}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time toggle & Position */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Include Time Toggle */}
              <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-[#E6E2D3]">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#7E7365]" />
                  <span className="text-xs font-medium text-[#2A2723]">Include Live Time</span>
                </div>
                <button
                  onClick={() => updateDateStamp({ includeTime: !currentStamp.includeTime })}
                  className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                    currentStamp.includeTime
                      ? 'bg-[#2A2723] text-white'
                      : 'bg-[#F0EEE6] text-[#7E7365] hover:text-[#2A2723]'
                  }`}
                >
                  {currentStamp.includeTime ? 'Time: ON' : 'Time: OFF'}
                </button>
              </div>

              {/* Position selector */}
              <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-[#E6E2D3]">
                <span className="text-xs font-medium text-[#2A2723]">Position</span>
                <select
                  value={currentStamp.position || 'bottom-right'}
                  onChange={(e) => updateDateStamp({ position: e.target.value as DateStampPosition })}
                  className="bg-[#FAF9F6] border border-[#E6E2D3] rounded px-2 py-1 text-xs text-[#2A2723] font-medium focus:outline-none focus:border-[#2A2723]"
                >
                  {POSITIONS.map((pos) => (
                    <option key={pos.id} value={pos.id}>
                      {pos.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Custom Date Input (Optional retro custom year) */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-white p-2.5 rounded-lg border border-[#E6E2D3]">
              <span className="text-xs font-medium text-[#2A2723] whitespace-nowrap">
                Date Source:
              </span>
              <div className="flex items-center gap-1.5 flex-1 w-full">
                <input
                  type="date"
                  value={currentStamp.customDate || ''}
                  onChange={(e) => updateDateStamp({ customDate: e.target.value })}
                  className="bg-[#FAF9F6] border border-[#E6E2D3] rounded px-2 py-1 text-xs text-[#2A2723] font-medium flex-1 focus:outline-none focus:border-[#2A2723]"
                />
                {currentStamp.customDate && (
                  <button
                    onClick={() => updateDateStamp({ customDate: '' })}
                    className="px-2 py-1 text-[10px] text-[#7E7365] hover:text-[#2A2723] bg-[#F0EEE6] rounded"
                  >
                    Reset to Today
                  </button>
                )}
              </div>
            </div>

            {/* Scale & Opacity Sliders */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-[11px] text-[#7E7365]">
                  <span>Stamp Size</span>
                  <span className="font-mono text-[#2A2723] font-medium">
                    {Math.round((currentStamp.size || 1.0) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0.6}
                  max={1.8}
                  step={0.05}
                  value={currentStamp.size || 1.0}
                  onChange={(e) => updateDateStamp({ size: parseFloat(e.target.value) })}
                  className="w-full accent-[#2A2723]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-[11px] text-[#7E7365]">
                  <span>Stamp Opacity</span>
                  <span className="font-mono text-[#2A2723] font-medium">
                    {Math.round((currentStamp.opacity ?? 0.95) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0.3}
                  max={1.0}
                  step={0.05}
                  value={currentStamp.opacity ?? 0.95}
                  onChange={(e) => updateDateStamp({ opacity: parseFloat(e.target.value) })}
                  className="w-full accent-[#2A2723]"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. 39 Camera Models & Stamps Section */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between pb-1 border-b border-[#F0EEE6] text-xs">
          <div className="flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5 text-[#2A2723]" />
            <span className="text-[#7E7365] font-medium tracking-wider uppercase text-[10px]">
              Camera Models & Film Features (39 Types)
            </span>
          </div>
          {adjustments.cameraType && adjustments.cameraType !== 'none' && (
            <button
              onClick={() => {
                soundFx.playHapticTick();
                updateField('cameraType', 'none');
              }}
              className="text-[11px] text-[#7E7365] hover:text-[#2A2723] transition-colors"
            >
              Clear Camera
            </button>
          )}
        </div>

        {/* Camera Search & Quick Carousel */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => handleSelectCamera('none')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              !adjustments.cameraType || adjustments.cameraType === 'none'
                ? 'bg-[#2A2723] text-white'
                : 'bg-[#FAF9F6] text-[#7E7365] border border-[#E6E2D3] hover:text-[#2A2723]'
            }`}
          >
            None
          </button>
          {CAMERA_PROFILES.map((cam) => {
            const isSelected = adjustments.cameraType === cam.id;
            return (
              <button
                key={cam.id}
                onClick={() => handleSelectCamera(cam.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#2A2723] text-white shadow-xs'
                    : 'bg-[#FAF9F6] text-[#7E7365] border border-[#E6E2D3] hover:text-[#2A2723] hover:border-[#C5BDB2]'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full inline-block"
                  style={{ backgroundColor: cam.accentColor }}
                />
                <span className="capitalize">{cam.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Editorial Frames Section */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between pb-1 border-b border-[#F0EEE6] text-xs">
          <span className="text-[#7E7365] font-medium tracking-wider uppercase text-[10px]">
            Editorial Frames & Borders
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
                className={`flex flex-col items-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
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
    </div>
  );
};
