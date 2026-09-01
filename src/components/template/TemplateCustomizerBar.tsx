import React, { useState } from 'react';
import {
  Layers, Type, Sliders, Palette, Sparkles, Upload,
  Volume2, VolumeX, RotateCw, Trash2, Eye, Check, Frame,
  Plus, Edit3, Grid, Paperclip, BookOpen, Sun, Flame, Video, Camera, FolderPlus,
  ChevronDown, ChevronUp, Share2, Download, Film,
  Move, Copy, ArrowUp, ArrowDown, AlignCenter, Maximize2, Minimize2
} from 'lucide-react';
import {
  CollageTemplate, TemplateSlot, TemplateTextElement,
  BinderRingType, PaperTextureType, TemplateTapeStyle,
  TemplatePaperClipStyle, TemplateSlotBorderStyle, TextFontFamily,
  Preset, Project
} from '../../types';
import { soundFx } from '../../utils/audio';
import { ProjectFilmstrip } from './ProjectFilmstrip';

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
  // Multi-Slide Project props
  project?: Project | null;
  onSelectProjectSlide?: (index: number) => void;
  onDuplicateProjectSlide?: (index: number) => void;
  onDeleteProjectSlide?: (index: number) => void;
  onReorderProjectSlides?: (fromIndex: number, toIndex: number) => void;
  onAddNewSlide?: () => void;
  isSidebarMode?: boolean;
}

type CustomizerTab = 'filmstrip' | 'slots' | 'text' | 'decorations' | 'paper' | 'presets';

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
  project,
  onSelectProjectSlide,
  onDuplicateProjectSlide,
  onDeleteProjectSlide,
  onReorderProjectSlides,
  onAddNewSlide,
  isSidebarMode = false,
}) => {
  const slideCount = project?.collages?.length || 1;
  const [activeTab, setActiveTab] = useState<CustomizerTab>(
    slideCount > 1 ? 'filmstrip' : 'slots'
  );

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

  if (isSidebarMode) {
    return (
      <div className="flex flex-col h-full bg-white">
        {/* Sidebar Tab Header Grid */}
        <div className="p-3 border-b border-[#F0EEE6] bg-[#FAF9F6]/60 flex-shrink-0">
          <div className="grid grid-cols-3 gap-1.5">
            {[
              {
                id: 'filmstrip',
                label: `Filmstrip (${slideCount})`,
                icon: <Film className="w-3.5 h-3.5 text-amber-500" />,
              },
              { id: 'slots', label: 'Frames', icon: <Layers className="w-3.5 h-3.5" /> },
              { id: 'text', label: 'Text', icon: <Type className="w-3.5 h-3.5" /> },
              { id: 'decorations', label: 'Tape/Clips', icon: <Paperclip className="w-3.5 h-3.5" /> },
              { id: 'paper', label: 'Paper', icon: <Palette className="w-3.5 h-3.5" /> },
              { id: 'presets', label: 'Film Stock', icon: <Sparkles className="w-3.5 h-3.5" /> },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id as CustomizerTab);
                    soundFx.playHapticTick();
                  }}
                  className={`flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-xl text-[11px] font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#2A2723] text-white shadow-xs font-semibold'
                      : 'bg-white text-[#7E7365] hover:text-[#2A2723] hover:bg-[#F0EEE6] border border-[#E6E2D3]'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span className="truncate max-w-[70px]">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Action row for templates */}
          {onOpenTemplateSelector && (
            <button
              type="button"
              onClick={() => {
                onOpenTemplateSelector();
                soundFx.playHapticTick();
              }}
              className="w-full mt-2 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-white border border-[#E6E2D3] text-xs font-semibold text-[#2A2723] hover:bg-[#F0EEE6] transition-colors"
            >
              <Grid className="w-3.5 h-3.5 text-[#2A2723]" />
              <span>Browse Template Layouts</span>
            </button>
          )}
        </div>

        {/* Sidebar Content Panel */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-3.5">
          {activeTab === 'filmstrip' && (
            <ProjectFilmstrip
              project={project || null}
              activeCollage={template}
              onSelectSlide={(index) => {
                if (onSelectProjectSlide) onSelectProjectSlide(index);
              }}
              onDuplicateSlide={(index) => {
                if (onDuplicateProjectSlide) onDuplicateProjectSlide(index);
              }}
              onDeleteSlide={(index) => {
                if (onDeleteProjectSlide) onDeleteProjectSlide(index);
              }}
              onReorderSlides={(fromIndex, toIndex) => {
                if (onReorderProjectSlides) onReorderProjectSlides(fromIndex, toIndex);
              }}
              onAddNewSlide={() => {
                if (onAddNewSlide) onAddNewSlide();
              }}
              onOpenTemplateSelector={onOpenTemplateSelector}
            />
          )}

          {activeTab === 'slots' && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2">
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
                  className="w-full px-3 py-2 bg-[#2A2723] text-white hover:bg-black rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  title="Select multiple photos & videos from your device to populate all slots"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>Batch Fill Media ({template.slots.length} Frames)</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddNewSlot}
                  className="w-full px-3 py-1.5 bg-[#FAF9F6] border border-[#E6E2D3] text-[#2A2723] hover:bg-[#F0EEE6] rounded-xl text-xs font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add New Media Frame</span>
                </button>
              </div>

              {/* Slots List */}
              <div className="flex flex-col gap-2">
                <span className="text-[11px] text-[#A69480] uppercase tracking-wider font-semibold">
                  Frames ({template.slots.length})
                </span>
                <div className="grid grid-cols-2 gap-2">
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
                        className={`flex flex-col gap-1.5 p-2 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#FAF8F5] border-[#2A2723] shadow-xs'
                            : 'bg-[#FAF9F6] border-[#E6E2D3] hover:border-[#A69480]'
                        }`}
                      >
                        <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-neutral-200 border border-black/10">
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
                            <span className="absolute bottom-1 right-1 bg-black/75 text-white text-[8px] px-1 rounded-xs font-mono">
                              VID
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-[#2A2723] truncate text-[11px]">
                            {slot.label || `Slot ${index + 1}`}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onTriggerSlotUpload(slot.id);
                              soundFx.playHapticTick();
                            }}
                            className="text-[10px] text-[#0A84FF] hover:underline"
                          >
                            Upload
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Selected Slot Controls */}
              {selectedSlot && (
                <div className="p-3 bg-[#FAF9F6] rounded-xl border border-[#E6E2D3] flex flex-col gap-2.5 mt-2 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#2A2723]">
                      Edit: {selectedSlot.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const filtered = template.slots.filter((s) => s.id !== selectedSlot.id);
                        onChangeTemplate({ ...template, slots: filtered });
                        onSelectSlot(null);
                        soundFx.playHapticTick();
                      }}
                      className="p-1 text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                      title="Delete Frame"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    {onChooseFromLibraryForSlot && (
                      <button
                        type="button"
                        onClick={() => {
                          onChooseFromLibraryForSlot(selectedSlot.id);
                          soundFx.playHapticTick();
                        }}
                        className="py-1.5 px-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1"
                      >
                        <Camera className="w-3 h-3" />
                        <span>Library</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onTriggerSlotUpload(selectedSlot.id)}
                      className="py-1.5 px-2 bg-[#2A2723] hover:bg-black text-white rounded-lg text-[11px] font-medium flex items-center justify-center gap-1"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Upload</span>
                    </button>

                    {onRecordVideoForSlot && (
                      <button
                        type="button"
                        onClick={() => {
                          onRecordVideoForSlot(selectedSlot.id);
                          soundFx.playHapticTick();
                        }}
                        className="py-1.5 px-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-medium flex items-center justify-center gap-1"
                      >
                        <Video className="w-3 h-3" />
                        <span>Record</span>
                      </button>
                    )}

                    {onTakePhotoForSlot && (
                      <button
                        type="button"
                        onClick={() => {
                          onTakePhotoForSlot(selectedSlot.id);
                          soundFx.playHapticTick();
                        }}
                        className="py-1.5 px-2 bg-neutral-800 hover:bg-black text-white rounded-lg text-[11px] font-medium flex items-center justify-center gap-1"
                      >
                        <Camera className="w-3 h-3" />
                        <span>Capture</span>
                      </button>
                    )}
                  </div>

                  {/* Border Style */}
                  <div className="flex flex-col gap-1 mt-1">
                    <span className="text-[10px] text-[#7E7365] uppercase font-semibold">
                      Frame Style
                    </span>
                    <div className="grid grid-cols-4 gap-1">
                      {(['polaroid', 'film-sprocket', 'clean', 'rounded'] as TemplateSlotBorderStyle[]).map(
                        (bStyle) => (
                          <button
                            key={bStyle}
                            type="button"
                            onClick={() => {
                              updateSlot(selectedSlot.id, { borderStyle: bStyle });
                              soundFx.playHapticTick();
                            }}
                            className={`py-1 px-1 rounded-md text-[10px] capitalize font-medium transition-all ${
                              selectedSlot.borderStyle === bStyle
                                ? 'bg-[#2A2723] text-white shadow-xs'
                                : 'bg-white text-[#7E7365] hover:bg-[#F0EEE6] border border-[#E6E2D3]'
                            }`}
                          >
                            {bStyle.replace('-', ' ')}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  {/* Position & Size Adjusters */}
                  <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-[#E6E2D3]">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[#7E7365] uppercase font-semibold flex items-center gap-1">
                        <Move className="w-3 h-3 text-[#2A2723]" />
                        <span>Position & Sizing</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          updateSlot(selectedSlot.id, {
                            x: 50 - selectedSlot.width / 2,
                            y: 50 - selectedSlot.height / 2,
                          });
                          soundFx.playHapticTick();
                        }}
                        className="text-[10px] text-[#0A84FF] font-semibold hover:underline flex items-center gap-0.5"
                      >
                        <AlignCenter className="w-3 h-3" />
                        <span>Center</span>
                      </button>
                    </div>

                    {/* X & Y Sliders */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between text-[10px] text-[#7E7365]">
                          <span>X: {Math.round(selectedSlot.x)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="90"
                          value={Math.round(selectedSlot.x)}
                          onChange={(e) => updateSlot(selectedSlot.id, { x: Number(e.target.value) })}
                          className="w-full h-1.5 bg-[#E6E2D3] rounded-lg appearance-none cursor-pointer accent-[#2A2723]"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between text-[10px] text-[#7E7365]">
                          <span>Y: {Math.round(selectedSlot.y)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="90"
                          value={Math.round(selectedSlot.y)}
                          onChange={(e) => updateSlot(selectedSlot.id, { y: Number(e.target.value) })}
                          className="w-full h-1.5 bg-[#E6E2D3] rounded-lg appearance-none cursor-pointer accent-[#2A2723]"
                        />
                      </div>
                    </div>

                    {/* Width & Height Sliders */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between text-[10px] text-[#7E7365]">
                          <span>Width: {Math.round(selectedSlot.width)}%</span>
                        </div>
                        <input
                          type="range"
                          min="15"
                          max="95"
                          value={Math.round(selectedSlot.width)}
                          onChange={(e) => updateSlot(selectedSlot.id, { width: Number(e.target.value) })}
                          className="w-full h-1.5 bg-[#E6E2D3] rounded-lg appearance-none cursor-pointer accent-[#2A2723]"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between text-[10px] text-[#7E7365]">
                          <span>Height: {Math.round(selectedSlot.height)}%</span>
                        </div>
                        <input
                          type="range"
                          min="15"
                          max="95"
                          value={Math.round(selectedSlot.height)}
                          onChange={(e) => updateSlot(selectedSlot.id, { height: Number(e.target.value) })}
                          className="w-full h-1.5 bg-[#E6E2D3] rounded-lg appearance-none cursor-pointer accent-[#2A2723]"
                        />
                      </div>
                    </div>

                    {/* Rotation Angle */}
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-[10px] text-[#7E7365]">
                        <span className="flex items-center gap-1">
                          <RotateCw className="w-3 h-3" />
                          <span>Rotation: {Math.round(selectedSlot.rotation || 0)}°</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            updateSlot(selectedSlot.id, { rotation: 0 });
                            soundFx.playHapticTick();
                          }}
                          className="text-[9px] text-[#7E7365] hover:text-[#2A2723] underline"
                        >
                          Reset 0°
                        </button>
                      </div>
                      <input
                        type="range"
                        min="-45"
                        max="45"
                        value={Math.round(selectedSlot.rotation || 0)}
                        onChange={(e) => updateSlot(selectedSlot.id, { rotation: Number(e.target.value) })}
                        className="w-full h-1.5 bg-[#E6E2D3] rounded-lg appearance-none cursor-pointer accent-[#2A2723]"
                      />
                    </div>

                    {/* Quick Layer & Action Bar */}
                    <div className="flex items-center justify-between gap-1 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const currentZ = selectedSlot.zIndex || 2;
                          updateSlot(selectedSlot.id, { zIndex: currentZ + 1 });
                          soundFx.playHapticTick();
                        }}
                        className="flex-1 py-1 px-1.5 bg-white hover:bg-[#F0EEE6] border border-[#E6E2D3] rounded-lg text-[10px] font-medium text-[#2A2723] flex items-center justify-center gap-1"
                        title="Bring Forward"
                      >
                        <ArrowUp className="w-3 h-3" />
                        <span>Forward</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const currentZ = selectedSlot.zIndex || 2;
                          updateSlot(selectedSlot.id, { zIndex: Math.max(1, currentZ - 1) });
                          soundFx.playHapticTick();
                        }}
                        className="flex-1 py-1 px-1.5 bg-white hover:bg-[#F0EEE6] border border-[#E6E2D3] rounded-lg text-[10px] font-medium text-[#2A2723] flex items-center justify-center gap-1"
                        title="Send Backward"
                      >
                        <ArrowDown className="w-3 h-3" />
                        <span>Back</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const newSlot: TemplateSlot = {
                            ...selectedSlot,
                            id: `slot-${Date.now()}`,
                            label: `${selectedSlot.label || 'Frame'} Copy`,
                            x: Math.min(70, selectedSlot.x + 5),
                            y: Math.min(70, selectedSlot.y + 5),
                            zIndex: (selectedSlot.zIndex || 2) + 1,
                          };
                          onChangeTemplate({ ...template, slots: [...template.slots, newSlot] });
                          onSelectSlot(newSlot.id);
                          soundFx.playShutter();
                        }}
                        className="flex-1 py-1 px-1.5 bg-white hover:bg-[#F0EEE6] border border-[#E6E2D3] rounded-lg text-[10px] font-medium text-[#2A2723] flex items-center justify-center gap-1"
                        title="Duplicate Frame"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Duplicate</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'text' && (
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => {
                  soundFx.playHapticTick();
                  const newT: TemplateTextElement = {
                    id: `text-${Date.now()}`,
                    label: 'Caption',
                    text: 'NEW CAPTION',
                    x: 30,
                    y: 75,
                    fontFamily: 'editorial-serif',
                    fontSize: 16,
                    color: '#2A2723',
                    align: 'center',
                  };
                  onChangeTemplate({ ...template, textElements: [...template.textElements, newT] });
                  onSelectText(newT.id);
                }}
                className="w-full py-2 bg-[#2A2723] text-white hover:bg-black rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Text Box</span>
              </button>

              <div className="flex flex-col gap-2">
                {template.textElements.map((t, idx) => (
                  <div
                    key={t.id}
                    onClick={() => {
                      onSelectText(t.id);
                      onSelectSlot(null);
                      soundFx.playHapticTick();
                    }}
                    className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      selectedTextId === t.id
                        ? 'bg-[#FAF8F5] border-[#2A2723]'
                        : 'bg-[#FAF9F6] border-[#E6E2D3]'
                    }`}
                  >
                    <span className="text-xs font-medium text-[#2A2723] truncate max-w-[200px]">
                      {t.text || `Text Element ${idx + 1}`}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const filtered = template.textElements.filter((item) => item.id !== t.id);
                        onChangeTemplate({ ...template, textElements: filtered });
                        if (selectedTextId === t.id) onSelectText(null);
                        soundFx.playHapticTick();
                      }}
                      className="p-1 text-rose-600 hover:bg-rose-50 rounded-md"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {selectedText && (
                <div className="p-3 bg-[#FAF9F6] rounded-xl border border-[#E6E2D3] flex flex-col gap-2.5">
                  <span className="text-xs font-bold text-[#2A2723]">Edit Text</span>
                  <input
                    type="text"
                    value={selectedText.text}
                    onChange={(e) => updateText(selectedText.id, { text: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-[#E6E2D3] rounded-lg text-xs"
                    placeholder="Enter text..."
                  />
                  <div className="grid grid-cols-3 gap-1">
                    {(
                      [
                        'editorial-serif',
                        'modern-sans',
                        'typewriter',
                        'handwritten',
                        'monospaced',
                        'display-syne',
                      ] as TextFontFamily[]
                    ).map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => {
                          updateText(selectedText.id, { fontFamily: f });
                          soundFx.playHapticTick();
                        }}
                        className={`py-1 px-1 text-[10px] rounded-md capitalize font-medium truncate ${
                          selectedText.fontFamily === f
                            ? 'bg-[#2A2723] text-white'
                            : 'bg-white text-[#7E7365] border border-[#E6E2D3]'
                        }`}
                      >
                        {f.replace('-', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'decorations' && (
            <div className="flex flex-col gap-3">
              <span className="text-xs font-bold text-[#2A2723]">Washi Tape & Clips</span>
              <div className="grid grid-cols-2 gap-2">
                {(['none', 'top-corners', 'all-corners', 'top-center', 'diagonal-strip'] as TemplateTapeStyle[]).map(
                  (tape) => (
                    <button
                      key={tape}
                      type="button"
                      onClick={() => {
                        if (selectedSlot) {
                          updateSlot(selectedSlot.id, { tape });
                        } else {
                          const updatedSlots = template.slots.map((s) => ({ ...s, tape }));
                          onChangeTemplate({ ...template, slots: updatedSlots });
                        }
                        soundFx.playHapticTick();
                      }}
                      className="p-2 bg-[#FAF9F6] border border-[#E6E2D3] hover:border-[#2A2723] rounded-xl text-xs capitalize text-[#2A2723] font-medium text-left"
                    >
                      {tape.replace('-', ' ')}
                    </button>
                  )
                )}
              </div>
            </div>
          )}

          {activeTab === 'paper' && (
            <div className="flex flex-col gap-3">
              <span className="text-xs font-bold text-[#2A2723]">Paper Canvas Texture</span>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    'linen-white',
                    'warm-ivory',
                    'kraft-paper',
                    'clean-white',
                    'charcoal-dark',
                    'split-duotone',
                  ] as PaperTextureType[]
                ).map((tex) => (
                  <button
                    key={tex}
                    type="button"
                    onClick={() => {
                      onChangeTemplate({
                        ...template,
                        overlays: { ...template.overlays, paperTexture: tex },
                      });
                      soundFx.playHapticTick();
                    }}
                    className={`p-2.5 rounded-xl border text-xs capitalize text-left transition-all ${
                      template.overlays?.paperTexture === tex
                        ? 'bg-[#2A2723] text-white shadow-xs'
                        : 'bg-[#FAF9F6] text-[#2A2723] border-[#E6E2D3] hover:border-[#A69480]'
                    }`}
                  >
                    {tex.replace('-', ' ')}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'presets' && (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-[#2A2723]">Film Recipes</span>
              <div className="grid grid-cols-2 gap-2">
                {presets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      if (onApplyPresetToTemplate) onApplyPresetToTemplate(preset);
                      soundFx.playHapticTick();
                    }}
                    className="flex items-center gap-2 p-2 rounded-xl border border-[#E6E2D3] bg-[#FAF9F6] hover:border-[#2A2723] transition-all text-left"
                  >
                    <div
                      className="w-6 h-6 rounded-lg shadow-xs flex items-center justify-center text-[10px] font-serif text-white font-bold shrink-0"
                      style={{ backgroundColor: preset.thumbnailColor || '#2A2723' }}
                    >
                      {preset.name.charAt(0)}
                    </div>
                    <span className="text-xs font-medium text-[#2A2723] truncate">
                      {preset.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`w-full bg-white/95 backdrop-blur-xl border-t border-[#E6E2D3] transition-all duration-300 ease-in-out shadow-lg z-20 flex flex-col flex-shrink-0 ${
        isCollapsed
          ? 'h-14 p-2 sm:py-2.5 sm:px-4'
          : 'h-[270px] sm:h-[300px] p-3 sm:p-4 gap-2.5 overflow-hidden'
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
          className="w-full flex items-center justify-center -mt-1 pb-1 cursor-pointer focus:outline-hidden group flex-shrink-0"
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
            {
              id: 'filmstrip',
              label: `Filmstrip (${slideCount})`,
              icon: <Film className="w-3.5 h-3.5 text-amber-500" />,
            },
            { id: 'slots', label: 'Media Frames', icon: <Layers className="w-3.5 h-3.5" /> },
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
        <div className="w-full flex-1 overflow-y-auto no-scrollbar transition-opacity duration-200 animate-in fade-in-50">

      {/* ---------------------------------------------------- */}
      {/* 0. 35MM FILMSTRIP & PROJECT SLIDES TAB               */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'filmstrip' && (
        <ProjectFilmstrip
          project={project || null}
          activeCollage={template}
          onSelectSlide={(index) => {
            if (onSelectProjectSlide) onSelectProjectSlide(index);
          }}
          onDuplicateSlide={(index) => {
            if (onDuplicateProjectSlide) onDuplicateProjectSlide(index);
          }}
          onDeleteSlide={(index) => {
            if (onDeleteProjectSlide) onDeleteProjectSlide(index);
          }}
          onReorderSlides={(fromIndex, toIndex) => {
            if (onReorderProjectSlides) onReorderProjectSlides(fromIndex, toIndex);
          }}
          onAddNewSlide={() => {
            if (onAddNewSlide) onAddNewSlide();
          }}
          onOpenTemplateSelector={onOpenTemplateSelector}
        />
      )}

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

              {/* Quick Transform and Position Bar for Bottom Drawer */}
              <div className="w-full flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#E6E2D3]">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[#7E7365] font-medium flex items-center gap-1">
                    <Move className="w-3 h-3 text-[#2A2723]" />
                    <span>Pos:</span>
                  </span>
                  <div className="flex items-center gap-1 text-[11px] text-[#2A2723] font-mono bg-white px-2 py-0.5 rounded border border-[#E6E2D3]">
                    <span>X: {Math.round(selectedSlot.x)}%</span>
                    <span>•</span>
                    <span>Y: {Math.round(selectedSlot.y)}%</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      updateSlot(selectedSlot.id, {
                        x: 50 - selectedSlot.width / 2,
                        y: 50 - selectedSlot.height / 2,
                      });
                      soundFx.playHapticTick();
                    }}
                    className="px-2 py-1 bg-white hover:bg-[#F0EEE6] border border-[#E6E2D3] rounded text-[11px] font-medium text-[#0A84FF] flex items-center gap-1"
                  >
                    <AlignCenter className="w-3 h-3" />
                    <span>Center</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const currentRot = selectedSlot.rotation || 0;
                      updateSlot(selectedSlot.id, { rotation: (currentRot + 15) % 360 });
                      soundFx.playHapticTick();
                    }}
                    className="px-2 py-1 bg-white hover:bg-[#F0EEE6] border border-[#E6E2D3] rounded text-[11px] font-medium text-[#2A2723] flex items-center gap-1"
                    title="Rotate +15°"
                  >
                    <RotateCw className="w-3 h-3" />
                    <span>+15°</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const currentZ = selectedSlot.zIndex || 2;
                      updateSlot(selectedSlot.id, { zIndex: currentZ + 1 });
                      soundFx.playHapticTick();
                    }}
                    className="p-1 bg-white hover:bg-[#F0EEE6] border border-[#E6E2D3] rounded text-[#2A2723]"
                    title="Bring Forward"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const currentZ = selectedSlot.zIndex || 2;
                      updateSlot(selectedSlot.id, { zIndex: Math.max(1, currentZ - 1) });
                      soundFx.playHapticTick();
                    }}
                    className="p-1 bg-white hover:bg-[#F0EEE6] border border-[#E6E2D3] rounded text-[#2A2723]"
                    title="Send Backward"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const newSlot: TemplateSlot = {
                        ...selectedSlot,
                        id: `slot-${Date.now()}`,
                        label: `${selectedSlot.label || 'Frame'} Copy`,
                        x: Math.min(70, selectedSlot.x + 5),
                        y: Math.min(70, selectedSlot.y + 5),
                        zIndex: (selectedSlot.zIndex || 2) + 1,
                      };
                      onChangeTemplate({ ...template, slots: [...template.slots, newSlot] });
                      onSelectSlot(newSlot.id);
                      soundFx.playShutter();
                    }}
                    className="px-2 py-1 bg-white hover:bg-[#F0EEE6] border border-[#E6E2D3] rounded text-[11px] font-medium text-[#2A2723] flex items-center gap-1"
                    title="Duplicate Frame"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Duplicate</span>
                  </button>
                </div>
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
