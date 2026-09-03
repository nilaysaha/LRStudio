import React, { useState } from 'react';
import {
  Move,
  AlignCenter,
  ArrowUp,
  ArrowDown,
  Copy,
  Upload,
  Camera,
  Trash2,
  Maximize2,
  Minimize2,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Layers,
  Sparkles,
  Check
} from 'lucide-react';
import { TemplateSlot } from '../../types';
import { soundFx } from '../../utils/audio';

interface TemplateCanvasSideMenuProps {
  slots: TemplateSlot[];
  selectedSlotId: string | null;
  onSelectSlot: (slotId: string | null) => void;
  onSelectText?: (textId: string | null) => void;
  onStartMoveSlot?: (e: React.PointerEvent, slot: TemplateSlot) => void;
  onCenterSlot: (slotId: string) => void;
  onAdjustSlotLayer: (slotId: string, delta: number) => void;
  onDuplicateSlot: (slotId: string) => void;
  onUploadForSlot: (slotId: string) => void;
  onChooseFromLibraryForSlot?: (slotId: string) => void;
  onDeleteSlot: (slotId: string) => void;
  onToggleFitSlot?: (slotId: string) => void;
  onRotateSlot?: (slotId: string) => void;
  onNudgeSlot?: (slotId: string, dx: number, dy: number) => void;
}

export const TemplateCanvasSideMenu: React.FC<TemplateCanvasSideMenuProps> = ({
  slots,
  selectedSlotId,
  onSelectSlot,
  onSelectText,
  onStartMoveSlot,
  onCenterSlot,
  onAdjustSlotLayer,
  onDuplicateSlot,
  onUploadForSlot,
  onChooseFromLibraryForSlot,
  onDeleteSlot,
  onToggleFitSlot,
  onRotateSlot,
  onNudgeSlot,
}) => {
  // Allow user to dock to right or left side of canvas
  const [dockSide, setDockSide] = useState<'right' | 'left'>('right');
  const [isNudgeOpen, setIsNudgeOpen] = useState(false);

  const selectedSlot = slots.find((s) => s.id === selectedSlotId);
  const activeIndex = selectedSlot ? slots.findIndex((s) => s.id === selectedSlot.id) : -1;

  // Positioning classes based on dockSide
  const positionClasses =
    dockSide === 'right'
      ? 'right-1 sm:right-auto sm:left-[calc(100%+12px)]'
      : 'left-1 sm:left-auto sm:right-[calc(100%+12px)]';

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`absolute top-1/2 -translate-y-1/2 z-40 pointer-events-auto select-none transition-all duration-200 ${positionClasses}`}
      style={{ touchAction: 'none' }}
    >
      <div className="flex flex-col items-center bg-[#1C1C1E]/95 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl p-1.5 gap-1.5 text-white w-11 max-h-[85vh] overflow-y-auto no-scrollbar">
        {/* TOP: Collage Slot Switcher Strip */}
        <div className="flex flex-col items-center gap-1 w-full pb-1.5 border-b border-white/10">
          <div
            className="flex items-center justify-center text-[9px] font-bold text-white/50 uppercase tracking-tighter"
            title={selectedSlot ? `Active Frame ${activeIndex + 1} of ${slots.length}` : 'Select a photo frame'}
          >
            {selectedSlot ? `${activeIndex + 1}/${slots.length}` : 'Frames'}
          </div>

          <div className="flex flex-col gap-1 items-center max-h-[140px] overflow-y-auto no-scrollbar py-0.5">
            {slots.map((slot, index) => {
              const isSlotSelected = selectedSlotId === slot.id;
              const hasMedia = Boolean(slot.media?.url);

              return (
                <button
                  key={slot.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectSlot(slot.id);
                    if (onSelectText) onSelectText(null);
                    soundFx.playHapticTick();
                  }}
                  className={`relative w-8 h-8 rounded-lg overflow-hidden border-2 transition-all flex items-center justify-center cursor-pointer group flex-shrink-0 ${
                    isSlotSelected
                      ? 'border-[#0A84FF] shadow-[0_0_10px_rgba(10,132,255,0.7)] scale-105 ring-1 ring-white/50 bg-[#0A84FF]/20'
                      : 'border-white/25 bg-white/5 opacity-70 hover:opacity-100 hover:border-white/50'
                  }`}
                  title={`Select Frame ${index + 1}${slot.label ? ` (${slot.label})` : ''}`}
                  aria-label={`Select Frame ${index + 1}`}
                >
                  {hasMedia ? (
                    <img
                      src={slot.media.url}
                      alt=""
                      className="w-full h-full object-cover pointer-events-none"
                    />
                  ) : (
                    <span className="text-[11px] font-bold text-white/80">{index + 1}</span>
                  )}

                  {/* Active Indicator Badge */}
                  {isSlotSelected && (
                    <div className="absolute inset-0 bg-[#0A84FF]/25 flex items-center justify-center pointer-events-none">
                      <div className="w-1.5 h-1.5 rounded-full bg-white shadow-xs" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* MIDDLE: Actions for Selected Slot */}
        {selectedSlot ? (
          <div className="flex flex-col items-center gap-1 w-full animate-in fade-in zoom-in-95 duration-150">
            {/* Drag Move Handle */}
            {onStartMoveSlot && (
              <div
                onPointerDown={(e) => onStartMoveSlot(e, selectedSlot)}
                className="w-8 h-8 flex items-center justify-center text-[#0A84FF] hover:text-white hover:bg-white/20 rounded-xl cursor-grab active:cursor-grabbing transition-colors"
                title="Click and drag on canvas to reposition Frame"
              >
                <Move className="w-4 h-4" />
              </div>
            )}

            {/* Precision Nudge D-Pad Toggle */}
            {onNudgeSlot && (
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsNudgeOpen((prev) => !prev);
                    soundFx.playHapticTick();
                  }}
                  className={`w-8 h-8 flex items-center justify-center rounded-xl transition-colors cursor-pointer ${
                    isNudgeOpen
                      ? 'bg-[#0A84FF] text-white shadow-sm'
                      : 'text-white/80 hover:text-white hover:bg-white/20'
                  }`}
                  title="Precision Nudge Arrows"
                >
                  <div className="grid grid-cols-2 gap-0.5 pointer-events-none">
                    <div className="w-1 h-1 bg-current rounded-xs" />
                    <div className="w-1 h-1 bg-current rounded-xs" />
                    <div className="w-1 h-1 bg-current rounded-xs" />
                    <div className="w-1 h-1 bg-current rounded-xs" />
                  </div>
                </button>

                {/* Nudge Flyout */}
                {isNudgeOpen && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className={`absolute top-1/2 -translate-y-1/2 ${
                      dockSide === 'right' ? 'right-full mr-2' : 'left-full ml-2'
                    } bg-[#1C1C1E]/95 backdrop-blur-xl border border-white/20 rounded-xl p-1.5 shadow-2xl flex flex-col items-center gap-1 z-50 animate-in fade-in zoom-in-95`}
                  >
                    <button
                      type="button"
                      onClick={() => onNudgeSlot(selectedSlot.id, 0, -2)}
                      className="w-7 h-7 flex items-center justify-center hover:bg-white/20 rounded-lg text-white/90 hover:text-white cursor-pointer"
                      title="Nudge Up 2%"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onNudgeSlot(selectedSlot.id, -2, 0)}
                        className="w-7 h-7 flex items-center justify-center hover:bg-white/20 rounded-lg text-white/90 hover:text-white cursor-pointer"
                        title="Nudge Left 2%"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onCenterSlot(selectedSlot.id)}
                        className="w-7 h-7 flex items-center justify-center hover:bg-white/20 rounded-lg text-[#0A84FF] hover:text-white cursor-pointer"
                        title="Center Frame"
                      >
                        <AlignCenter className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onNudgeSlot(selectedSlot.id, 2, 0)}
                        className="w-7 h-7 flex items-center justify-center hover:bg-white/20 rounded-lg text-white/90 hover:text-white cursor-pointer"
                        title="Nudge Right 2%"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => onNudgeSlot(selectedSlot.id, 0, 2)}
                      className="w-7 h-7 flex items-center justify-center hover:bg-white/20 rounded-lg text-white/90 hover:text-white cursor-pointer"
                      title="Nudge Down 2%"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Center on Canvas */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCenterSlot(selectedSlot.id);
              }}
              className="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-colors cursor-pointer"
              title="Center Frame on Canvas"
            >
              <AlignCenter className="w-4 h-4" />
            </button>

            {/* Layer Up (Bring Forward) */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAdjustSlotLayer(selectedSlot.id, 1);
              }}
              className="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-colors cursor-pointer"
              title="Bring Forward (Layer Up)"
            >
              <ArrowUp className="w-4 h-4" />
            </button>

            {/* Layer Down (Send Backward) */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAdjustSlotLayer(selectedSlot.id, -1);
              }}
              className="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-colors cursor-pointer"
              title="Send Backward (Layer Down)"
            >
              <ArrowDown className="w-4 h-4" />
            </button>

            {/* Duplicate Frame */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicateSlot(selectedSlot.id);
              }}
              className="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-colors cursor-pointer"
              title="Duplicate Frame"
            >
              <Copy className="w-4 h-4" />
            </button>

            {/* Upload / Replace */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onUploadForSlot(selectedSlot.id);
              }}
              className="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-colors cursor-pointer"
              title="Upload / Replace Photo or Video"
            >
              <Upload className="w-4 h-4" />
            </button>

            {/* Library */}
            {onChooseFromLibraryForSlot && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChooseFromLibraryForSlot(selectedSlot.id);
                  soundFx.playHapticTick();
                }}
                className="w-8 h-8 flex items-center justify-center text-amber-300 hover:text-amber-200 hover:bg-white/20 rounded-xl transition-colors cursor-pointer"
                title="Choose from Curated Library"
              >
                <Camera className="w-4 h-4" />
              </button>
            )}

            {/* Fit / Fill Toggle */}
            {onToggleFitSlot && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFitSlot(selectedSlot.id);
                }}
                className="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-colors cursor-pointer"
                title={
                  selectedSlot.fit === 'contain'
                    ? 'Current: Fit Entire Photo (Click for Fill Crop)'
                    : 'Current: Fill Frame (Click for Fit Entire Photo)'
                }
              >
                {selectedSlot.fit === 'contain' ? (
                  <Maximize2 className="w-4 h-4" />
                ) : (
                  <Minimize2 className="w-4 h-4" />
                )}
              </button>
            )}

            {/* Rotate 90° */}
            {onRotateSlot && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRotateSlot(selectedSlot.id);
                }}
                className="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-colors cursor-pointer"
                title="Rotate 90°"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            )}

            {/* Delete Frame */}
            {slots.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteSlot(selectedSlot.id);
                }}
                className="w-8 h-8 flex items-center justify-center text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-xl transition-colors cursor-pointer mt-0.5"
                title="Delete Frame"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          /* When no slot is selected, clicking prompt or clicking slot 0 */
          <div className="flex flex-col items-center gap-1.5 py-1 text-center w-full">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (slots[0]) onSelectSlot(slots[0].id);
                soundFx.playHapticTick();
              }}
              className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 rounded-xl transition-colors cursor-pointer"
              title="Click to Edit Frame 1"
            >
              <Layers className="w-4 h-4 text-[#0A84FF]" />
            </button>
            <span className="text-[8px] text-white/40 leading-tight font-medium">
              Click frame
            </span>
          </div>
        )}

        {/* BOTTOM: Side Switcher (Toggle left/right dock) */}
        <div className="w-full pt-1 border-t border-white/10 flex justify-center">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDockSide((prev) => (prev === 'right' ? 'left' : 'right'));
              soundFx.playHapticTick();
            }}
            className="w-6 h-6 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title={`Dock Menu to ${dockSide === 'right' ? 'Left' : 'Right'} Side`}
          >
            {dockSide === 'right' ? (
              <ChevronLeft className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
