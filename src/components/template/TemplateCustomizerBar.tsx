import React, { useState } from 'react';
import {
  Layers, Type, Sliders, Palette, Sparkles, Upload,
  Volume2, VolumeX, RotateCw, Trash2, Eye, Check, Frame,
  Plus, Edit3, Grid, Paperclip, BookOpen, Sun, Flame, Video, Camera, FolderPlus,
  ChevronDown, ChevronUp, Share2, Download
} from 'lucide-react';
import {
  CollageTemplate, TemplateSlot, TemplateTextElement,
  BinderRingType, PaperTextureType, TemplateTapeStyle,
  TemplatePaperClipStyle, TemplateSlotBorderStyle, TextFontFamily,
  Preset
} from '../../types';
import { soundFx } from '../../utils/audio';

interface TemplateCustomizerBarProps {
  template: CollageTemplate;
  onChangeTemplate: (updated: CollageTemplate) => void;
  selectedSlotId: string | null;
  onSelectSlot: (slotId: string | null) => void;
  selectedTextId: string | null;
  onSelectText: (textId: string | null) => void;
  onTriggerSlotUpload: (slotId: string) => void;
  onChooseFromLibraryForSlot?: (slotId: string) => void;
  onRecordVideoForSlot?: (slotId: string) => void;
  onTakePhotoForSlot?: (slotId: string) => void;
  onBatchUploadMultipleMedia?: () => void;
  presets: Preset[];
  onApplyPresetToTemplate?: (preset: Preset) => void;
  onOpenTemplateSelector?: () => void;
  onOpenExport?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

type CustomizerTab = 'slots' | 'text' | 'decorations' | 'paper' | 'presets';

export const TemplateCustomizerBar: React.FC<TemplateCustomizerBarProps> = ({
  template,
  onChangeTemplate,
  selectedSlotId,
  onSelectSlot,
  selectedTextId,
  onSelectText,
  onTriggerSlotUpload,
  onChooseFromLibraryForSlot,
  onRecordVideoForSlot,
  onTakePhotoForSlot,
  onBatchUploadMultipleMedia,
  presets,
  onApplyPresetToTemplate,
  onOpenTemplateSelector,
  onOpenExport,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const [activeTab, setActiveTab] = useState<CustomizerTab>('slots');

  const selectedSlot = template.slots.find((s) => s.id === selectedSlotId);
  const selectedText = template.textElements.find((t) => t.id === selectedTextId);

  // Update selected slot helper
  const updateSlot = (slotId: string, updates: Partial<TemplateSlot>) => {
    const updated = template.slots.map((s) =>
      s.id === slotId ? { ...s, ...updates } : s
    );
    onChangeTemplate({ ...template, slots: updated });
  };

  // Update text helper
  const updateText = (textId: string, updates: Partial<TemplateTextElement>) => {
    const updated = template.textElements.map((t) =>
      t.id === textId ? { ...t, ...updates } : t
    );
    onChangeTemplate({ ...template, textElements: updated });
  };

  // Add new media frame helper
  const handleAddNewSlot = () => {
    soundFx.playHapticTick();
    const newIndex = template.slots.length + 1;
    const newSlot: TemplateSlot = {
      id: `slot-user-${Date.now()}`,
      label: `Media Slot ${newIndex}`,
      media: {
        id: `media-new-${Date.now()}`,
        name: `Media ${newIndex}`,
        type: 'image',
        url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=800&auto=format&fit=crop',
        aspectRatio: 1,
        width: 800,
        height: 800,
      },
      x: 20 + (newIndex % 3) * 10,
      y: 30 + (newIndex % 3) * 10,
      width: 40,
      height: 30,
      fit: 'cover',
      borderRadius: 8,
      shadow: 'card',
      zIndex: template.slots.length + 2,
    };

    onChangeTemplate({ ...template, slots: [...template.slots, newSlot] });
    onSelectSlot(newSlot.id);
  };

  return (
    <div
      className={`w-full bg-white/95 backdrop-blur-xl border-t border-[#E6E2D3] transition-all duration-300 ease-in-out shadow-lg z-20 flex flex-col ${
        isCollapsed
          ? 'p-2 sm:py-2.5 sm:px-4'
          : 'p-3 sm:p-4 gap-2.5 sm:gap-3 max-h-[52vh] sm:max-h-[46vh] md:max-h-none overflow-y-auto'
      }`}
    >
      {/* Mobile Drawer Pull Notch */}
      {onToggleCollapse && (
        <button
          type="button"
          onClick={() => {
            onToggleCollapse();
            soundFx.playHapticTick();
          }}
          className="w-full flex items-center justify-center -mt-1 pb-1 cursor-pointer focus:outline-hidden group"
          title={isCollapsed ? 'Expand Controls Drawer' : 'Collapse Drawer to maximize collage canvas'}
          aria-label={isCollapsed ? 'Expand Controls' : 'Collapse Controls'}
        >
          <div className="w-12 h-1 rounded-full bg-[#D6D0C2] group-hover:bg-[#2A2723] transition-colors" />
        </button>
      )}

      {/* Top Header Navigation Tabs */}
      <div className="flex items-center justify-between pb-1.5 border-b border-[#F0EEE6]/80 overflow-x-auto no-scrollbar gap-2 flex-shrink-0">
        <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar py-0.5 flex-1 min-w-0">
          {[
            { id: 'slots', label: 'Media Slots', icon: <Layers className="w-3.5 h-3.5" /> },
            { id: 'text', label: 'Text & Quotes', icon: <Type className="w-3.5 h-3.5" /> },
            { id: 'decorations', label: 'Tape & Clips', icon: <Paperclip className="w-3.5 h-3.5" /> },
            { id: 'paper', label: 'Paper Texture', icon: <Palette className="w-3.5 h-3.5" /> },
            { id: 'presets', label: 'Tones & Film', icon: <Sparkles className="w-3.5 h-3.5" /> },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id as CustomizerTab);
                  if (isCollapsed && onToggleCollapse) {
                    onToggleCollapse();
                  }
                  soundFx.playHapticTick();
                }}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-medium tracking-wide whitespace-nowrap transition-all cursor-pointer min-h-[36px] sm:min-h-[32px] ${
                  isActive
                    ? 'bg-[#2A2723] text-white shadow-xs'
                    : 'text-[#7E7365] hover:text-[#2A2723] hover:bg-[#F0EEE6]'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Action Buttons Right: Export / Template Gallery / Collapse Toggle */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {onOpenExport && (
            <button
              type="button"
              onClick={() => {
                onOpenExport();
                soundFx.playHapticTick();
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#2A2723] text-white hover:bg-black text-xs font-semibold shadow-xs active:scale-95 transition-all cursor-pointer min-h-[36px] sm:min-h-[32px]"
              title="Export & Share Collage to Instagram, TikTok or Download"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Export & Share</span>
            </button>
          )}

          {onOpenTemplateSelector && (
            <button
              type="button"
              onClick={() => {
                onOpenTemplateSelector();
                soundFx.playHapticTick();
              }}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-full bg-[#FAF9F6] border border-[#E6E2D3] text-xs font-semibold text-[#2A2723] hover:bg-[#F0EEE6] transition-colors whitespace-nowrap min-h-[36px] sm:min-h-[32px]"
            >
              <Grid className="w-3.5 h-3.5 text-[#2A2723]" />
              <span className="hidden sm:inline">Templates</span>
            </button>
          )}

          {onToggleCollapse && (
            <button
              type="button"
              onClick={() => {
                onToggleCollapse();
                soundFx.playHapticTick();
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[#F5F2EB] hover:bg-[#EBE6DC] text-[#2A2723] text-xs font-semibold border border-[#E6E2D3] transition-all active:scale-95 cursor-pointer min-h-[36px] sm:min-h-[32px]"
              title={isCollapsed ? 'Expand Controls Drawer' : 'Collapse Controls'}
            >
              {isCollapsed ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5 stroke-[2.2]" />
                  <span className="hidden md:inline text-[11px]">Expand</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5 stroke-[2.2]" />
                  <span className="hidden md:inline text-[11px]">Hide</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Content (Visible when NOT collapsed) */}
      {!isCollapsed && (
        <div className="w-full transition-opacity duration-200 animate-in fade-in-50">

      {/* ---------------------------------------------------- */}
      {/* 1. MEDIA SLOTS TAB                                  */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'slots' && (
        <div className="flex flex-col gap-3">
          {/* Quick Collage Actions Bar */}
          <div className="flex items-center justify-between gap-2 pb-1">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  if (onBatchUploadMultipleMedia) {
                    onBatchUploadMultipleMedia();
                  } else {
                    onTriggerSlotUpload(template.slots[0]?.id || 'slot-1');
                  }
                  soundFx.playHapticTick();
                }}
                className="px-3 py-1.5 bg-[#2A2723] text-white hover:bg-black rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                title="Select multiple photos & videos from your device to populate all slots"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>Batch Fill Media ({template.slots.length} Frames)</span>
              </button>

              <button
                type="button"
                onClick={handleAddNewSlot}
                className="px-2.5 py-1.5 bg-[#FAF9F6] border border-[#E6E2D3] text-[#2A2723] hover:bg-[#F0EEE6] rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Frame</span>
              </button>
            </div>

            <span className="text-[11px] text-[#A69480] font-mono hidden sm:inline">
              Tap any slot to customize
            </span>
          </div>

          {/* Slots List Thumbnails Carousel */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {template.slots.map((slot, index) => {
              const isSelected = selectedSlotId === slot.id;
              const isVideo = slot.media.type === 'video';

              return (
                <div
                  key={slot.id}
                  onClick={() => {
                    onSelectSlot(slot.id);
                    onSelectText(null);
                    soundFx.playHapticTick();
                  }}
                  className={`flex items-center gap-2.5 p-2 rounded-xl border transition-all cursor-pointer min-w-[140px] ${
                    isSelected
                      ? 'bg-[#FAF8F5] border-[#2A2723] shadow-xs'
                      : 'bg-white border-[#E6E2D3] hover:border-[#A69480]'
                  }`}
                >
                  <div className="relative w-11 h-11 rounded-lg overflow-hidden bg-neutral-100 shrink-0 border border-black/10">
                    {isVideo ? (
                      <video
                        src={slot.media.url}
                        className="w-full h-full object-cover"
                        muted
                      />
                    ) : (
                      <img
                        src={slot.media.url}
                        alt={slot.label}
                        className="w-full h-full object-cover"
                        crossOrigin="anonymous"
                      />
                    )}
                    {isVideo && (
                      <span className="absolute bottom-0.5 right-0.5 bg-black/70 text-white text-[7px] px-1 rounded-xs font-mono">
                        VID
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-xs font-semibold text-[#2A2723] truncate">
                      {slot.label || `Slot ${index + 1}`}
                    </span>
                    <div className="flex items-center gap-1.5 mt-1">
                      {onChooseFromLibraryForSlot && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onChooseFromLibraryForSlot(slot.id);
                            soundFx.playHapticTick();
                          }}
                          className="text-[10px] font-medium text-amber-700 hover:underline flex items-center gap-0.5"
                          title="Choose from Media Library"
                        >
                          <Camera className="w-2.5 h-2.5" />
                          <span>Library</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onTriggerSlotUpload(slot.id);
                          soundFx.playHapticTick();
                        }}
                        className="text-[10px] font-medium text-[#0A84FF] hover:underline flex items-center gap-0.5"
                      >
                        <Upload className="w-2.5 h-2.5" />
                        <span>Upload</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Slot Inspector Controls */}
          {selectedSlot && (
            <div className="p-3 bg-[#FAF9F6] rounded-xl border border-[#E6E2D3] flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-[#2A2723]">
                  {selectedSlot.label}:
                </span>
                
                {onChooseFromLibraryForSlot && (
                  <button
                    type="button"
                    onClick={() => {
                      onChooseFromLibraryForSlot(selectedSlot.id);
                      soundFx.playHapticTick();
                    }}
                    className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Camera className="w-3 h-3" />
                    <span>My Library</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onTriggerSlotUpload(selectedSlot.id)}
                  className="px-2.5 py-1 bg-[#2A2723] text-white rounded-lg text-xs font-medium hover:bg-black flex items-center gap-1 transition-colors"
                >
                  <Upload className="w-3 h-3" />
                  <span>Upload File</span>
                </button>

                {onRecordVideoForSlot && (
                  <button
                    type="button"
                    onClick={() => {
                      onRecordVideoForSlot(selectedSlot.id);
                      soundFx.playHapticTick();
                    }}
                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
                  >
                    <Video className="w-3 h-3" />
                    <span>Record Video</span>
                  </button>
                )}

                {onTakePhotoForSlot && (
                  <button
                    type="button"
                    onClick={() => {
                      onTakePhotoForSlot(selectedSlot.id);
                      soundFx.playHapticTick();
                    }}
                    className="px-2.5 py-1 bg-neutral-800 hover:bg-black text-white rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
                  >
                    <Camera className="w-3 h-3" />
                    <span>Take Photo</span>
                  </button>
                )}
              </div>

              {/* Border Style Selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-[#7E7365] font-medium">Border:</span>
                {[
                  { id: 'none', label: 'Clean' },
                  { id: 'polaroid', label: 'Polaroid' },
                  { id: 'film-35mm', label: '35mm Film' },
                ].map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      updateSlot(selectedSlot.id, {
                        borderStyle: b.id as TemplateSlotBorderStyle,
                      });
                      soundFx.playHapticTick();
                    }}
                    className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all ${
                      (selectedSlot.borderStyle || 'none') === b.id
                        ? 'bg-[#2A2723] text-white shadow-xs'
                        : 'bg-white border border-[#E6E2D3] text-[#7E7365] hover:text-[#2A2723]'
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>

              {/* Tape Accents */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-[#7E7365] font-medium">Washi Tape:</span>
                {[
                  { id: 'none', label: 'None' },
                  { id: 'top-corners', label: 'Corners' },
                  { id: 'all-corners', label: '4 Corners' },
                  { id: 'top-center', label: 'Top' },
                  { id: 'diagonal-strip', label: 'Diagonal' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      updateSlot(selectedSlot.id, {
                        tape: t.id as TemplateTapeStyle,
                      });
                      soundFx.playHapticTick();
                    }}
                    className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all ${
                      (selectedSlot.tape || 'none') === t.id
                        ? 'bg-[#2A2723] text-white shadow-xs'
                        : 'bg-white border border-[#E6E2D3] text-[#7E7365] hover:text-[#2A2723]'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 2. TEXT & QUOTES TAB                                */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'text' && (
        <div className="flex flex-col gap-3">
          {template.textElements.length === 0 ? (
            <p className="text-xs text-[#7E7365] py-2">
              This layout does not have predefined text fields. You can customize paper and media slots.
            </p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {template.textElements.map((txt) => {
                const isSelected = selectedTextId === txt.id;

                return (
                  <div
                    key={txt.id}
                    className={`p-3 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-[#FAF8F5] border-[#2A2723]'
                        : 'bg-white border-[#E6E2D3]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-semibold text-[#2A2723]">
                        {txt.label}
                      </span>

                      {/* Font Family Selector */}
                      <div className="flex items-center gap-1">
                        {[
                          { id: 'handwritten', label: 'Handwritten' },
                          { id: 'typewriter', label: 'Typewriter' },
                          { id: 'editorial-serif', label: 'Editorial' },
                          { id: 'modern-sans', label: 'Sans' },
                          { id: 'monospaced', label: 'Mono' },
                        ].map((f) => (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => {
                              updateText(txt.id, { fontFamily: f.id as TextFontFamily });
                              soundFx.playHapticTick();
                            }}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              txt.fontFamily === f.id
                                ? 'bg-[#2A2723] text-white'
                                : 'bg-[#F0EEE6] text-[#7E7365] hover:text-[#2A2723]'
                            }`}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Text Input / Textarea */}
                    <textarea
                      value={txt.text}
                      onChange={(e) => updateText(txt.id, { text: e.target.value })}
                      onFocus={() => {
                        onSelectText(txt.id);
                        onSelectSlot(null);
                      }}
                      rows={txt.text.includes('\n') ? 2 : 1}
                      className="w-full px-3 py-1.5 rounded-lg border border-[#E6E2D3] text-xs text-[#2A2723] bg-white focus:outline-none focus:border-[#2A2723] font-mono resize-none"
                    />

                    {/* Text Color & Size Bar */}
                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-[#F0EEE6]">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-[#7E7365]">Color:</span>
                        {[
                          '#FFFFFF',
                          '#2A2723',
                          '#7E7365',
                          '#D9534F',
                          '#0A84FF',
                          '#E5A93C',
                        ].map((col) => (
                          <button
                            key={col}
                            type="button"
                            onClick={() => updateText(txt.id, { color: col })}
                            className="w-4 h-4 rounded-full border border-black/20 shadow-xs"
                            style={{ backgroundColor: col }}
                          />
                        ))}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[#7E7365]">Size:</span>
                        <input
                          type="range"
                          min={8}
                          max={48}
                          value={txt.fontSize}
                          onChange={(e) =>
                            updateText(txt.id, { fontSize: Number(e.target.value) })
                          }
                          className="w-20"
                        />
                        <span className="text-[10px] font-mono text-[#2A2723]">
                          {txt.fontSize}px
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 3. DECORATIONS: TAPE, CLIPS & BINDER RINGS          */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'decorations' && (
        <div className="flex flex-col gap-3">
          {/* Binder Rings */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#2A2723]">
              Spiral & Ring Binder Accents
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {[
                { id: 'none', label: 'None' },
                { id: 'middle-spiral', label: 'Center Spiral' },
                { id: 'left-spiral', label: 'Left Spiral' },
                { id: 'left-4ring', label: '4-Ring Chrome' },
                { id: 'top-4ring', label: 'Top Binder' },
              ].map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    onChangeTemplate({
                      ...template,
                      overlays: {
                        ...template.overlays,
                        binderRings: r.id as BinderRingType,
                      },
                    });
                    soundFx.playHapticTick();
                  }}
                  className={`p-2 rounded-xl border text-center text-xs font-medium transition-all ${
                    (template.overlays.binderRings || 'none') === r.id
                      ? 'bg-[#2A2723] text-white border-[#2A2723] shadow-xs'
                      : 'bg-white border-[#E6E2D3] text-[#7E7365] hover:text-[#2A2723]'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* AirDrop Card Settings (if enabled) */}
          {template.overlays.airdropCard && (
            <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E6E2D3] flex flex-col gap-2">
              <span className="text-xs font-semibold text-[#2A2723]">
                AirDrop Dialog Settings
              </span>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Device Name (e.g. iPhone de Sophie)"
                  value={template.overlays.airdropCard.deviceName}
                  onChange={(e) =>
                    onChangeTemplate({
                      ...template,
                      overlays: {
                        ...template.overlays,
                        airdropCard: {
                          ...template.overlays.airdropCard!,
                          deviceName: e.target.value,
                        },
                      },
                    })
                  }
                  className="px-3 py-1.5 rounded-lg border border-[#E6E2D3] text-xs bg-white text-[#2A2723]"
                />
                <input
                  type="text"
                  placeholder="Sender Title (e.g. AirDrop)"
                  value={template.overlays.airdropCard.title}
                  onChange={(e) =>
                    onChangeTemplate({
                      ...template,
                      overlays: {
                        ...template.overlays,
                        airdropCard: {
                          ...template.overlays.airdropCard!,
                          title: e.target.value,
                        },
                      },
                    })
                  }
                  className="px-3 py-1.5 rounded-lg border border-[#E6E2D3] text-xs bg-white text-[#2A2723]"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 4. PAPER TEXTURE & CANVAS                           */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'paper' && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {[
              { id: 'linen-white', label: 'Linen Paper', bg: '#F8F6F0' },
              { id: 'warm-ivory', label: 'Warm Ivory', bg: '#F5F1E9' },
              { id: 'charcoal-dark', label: 'Charcoal Dark', bg: '#18181A' },
              { id: 'kraft-paper', label: 'Kraft Paper', bg: '#D9C3A5' },
              { id: 'clean-white', label: 'Clean White', bg: '#FFFFFF' },
              { id: 'split-duotone', label: 'Duotone Split', bg: '#F0ECE1' },
            ].map((tex) => (
              <button
                key={tex.id}
                type="button"
                onClick={() => {
                  onChangeTemplate({
                    ...template,
                    overlays: {
                      ...template.overlays,
                      paperTexture: tex.id as PaperTextureType,
                      backgroundColor: tex.bg,
                    },
                  });
                  soundFx.playHapticTick();
                }}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                  template.overlays.paperTexture === tex.id
                    ? 'border-[#2A2723] ring-2 ring-[#2A2723]/30 shadow-xs'
                    : 'border-[#E6E2D3] hover:border-[#A69480]'
                }`}
                style={{ backgroundColor: tex.bg }}
              >
                <div
                  className="w-5 h-5 rounded-full border border-black/10 shadow-xs"
                  style={{ backgroundColor: tex.bg }}
                />
                <span
                  className={`text-[11px] font-medium ${
                    tex.id === 'charcoal-dark' ? 'text-white' : 'text-[#2A2723]'
                  }`}
                >
                  {tex.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 5. TONES & FILM PRESETS                             */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'presets' && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {presets.slice(0, 10).map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => {
                if (onApplyPresetToTemplate) onApplyPresetToTemplate(preset);
                soundFx.playHapticTick();
              }}
              className="flex flex-col items-center gap-1 p-2 rounded-xl border border-[#E6E2D3] bg-white hover:border-[#2A2723] transition-all min-w-[70px] shrink-0"
            >
              <div
                className="w-8 h-8 rounded-lg shadow-xs border border-black/10 flex items-center justify-center text-xs font-serif text-white font-bold"
                style={{ backgroundColor: preset.thumbnailColor || '#2A2723' }}
              >
                {preset.name.charAt(0)}
              </div>
              <span className="text-[10px] font-medium text-[#2A2723] truncate max-w-[65px]">
                {preset.name}
              </span>
            </button>
          ))}
        </div>
      )}
        </div>
      )}
    </div>
  );
};
