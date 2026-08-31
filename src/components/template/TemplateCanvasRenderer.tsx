import React, { useState, useRef, useEffect } from 'react';
import {
  Upload, Sparkles, Volume2, VolumeX, Move, ZoomIn, ZoomOut,
  Trash2, RotateCw, Heart, Check, X, Eye, Play, Pause, Plus, RefreshCw,
  Video, Camera, Layers, FolderPlus
} from 'lucide-react';
import { CollageTemplate, TemplateSlot, TemplateTextElement, MediaItem, Adjustments } from '../../types';
import { soundFx } from '../../utils/audio';

interface TemplateCanvasRendererProps {
  template: CollageTemplate;
  onChangeTemplate: (updated: CollageTemplate) => void;
  selectedSlotId: string | null;
  onSelectSlot: (slotId: string | null) => void;
  selectedTextId: string | null;
  onSelectText: (textId: string | null) => void;
  isPlayingMaster?: boolean;
  onTogglePlayMaster?: () => void;
  onImportFileForSlot?: (slotId: string, file: File) => Promise<void>;
  onChooseFromLibraryForSlot?: (slotId: string) => void;
  onRecordVideoForSlot?: (slotId: string) => void;
  onTakePhotoForSlot?: (slotId: string) => void;
  onOpenTemplateSelector?: () => void;
  globalAdjustments?: Adjustments;
}

export const TemplateCanvasRenderer: React.FC<TemplateCanvasRendererProps> = ({
  template,
  onChangeTemplate,
  selectedSlotId,
  onSelectSlot,
  selectedTextId,
  onSelectText,
  isPlayingMaster = true,
  onTogglePlayMaster,
  onImportFileForSlot,
  onChooseFromLibraryForSlot,
  onRecordVideoForSlot,
  onTakePhotoForSlot,
  onOpenTemplateSelector,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const batchFileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadSlotId, setActiveUploadSlotId] = useState<string | null>(null);

  // Drag over state for slot drag-and-drop
  const [dragOverSlotId, setDragOverSlotId] = useState<string | null>(null);

  // AirDrop Interactive State
  const [airDropAccepted, setAirDropAccepted] = useState<boolean>(
    template.overlays.airdropCard?.accepted || false
  );

  // Sync video elements playback
  const videoRefs = useRef<{ [slotId: string]: HTMLVideoElement | null }>({});

  useEffect(() => {
    (Object.values(videoRefs.current) as (HTMLVideoElement | null)[]).forEach((video) => {
      if (video) {
        if (isPlayingMaster) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      }
    });
  }, [isPlayingMaster, template.slots]);

  // Handle replacing media for a single slot
  const handleSlotFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeUploadSlotId) return;

    soundFx.playShutter();
    if (onImportFileForSlot) {
      await onImportFileForSlot(activeUploadSlotId, file);
    } else {
      const isVideo = file.type.startsWith('video/');
      const url = URL.createObjectURL(file);
      const newMedia: MediaItem = {
        id: `media-${Date.now()}`,
        name: file.name,
        type: isVideo ? 'video' : 'image',
        url,
        file,
        aspectRatio: isVideo ? 16 / 9 : 4 / 5,
        width: 1080,
        height: 1920,
      };

      const updatedSlots = template.slots.map((s) =>
        s.id === activeUploadSlotId ? { ...s, media: newMedia } : s
      );
      onChangeTemplate({ ...template, slots: updatedSlots });
    }

    setActiveUploadSlotId(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Handle batch filling multiple slots with selected pictures & videos
  const handleBatchFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files: File[] = Array.from(e.target.files || []);
    if (files.length === 0) return;

    soundFx.playShutter();
    const updatedSlots = [...template.slots];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isVideo = file.type.startsWith('video/');
      const url = URL.createObjectURL(file);
      const newMedia: MediaItem = {
        id: `media-${Date.now()}-${i}`,
        name: file.name,
        type: isVideo ? 'video' : 'image',
        url,
        file: file,
        aspectRatio: isVideo ? 16 / 9 : 4 / 5,
        width: 1080,
        height: 1920,
      };

      if (i < updatedSlots.length) {
        updatedSlots[i] = {
          ...updatedSlots[i],
          media: newMedia,
        };
      } else {
        // Dynamically append new slot
        const row = Math.floor(i / 2);
        const col = i % 2;
        updatedSlots.push({
          id: `slot-dyn-${Date.now()}-${i}`,
          label: `Media ${i + 1}`,
          media: newMedia,
          x: col === 0 ? 6 : 52,
          y: Math.min(85, 10 + row * 28),
          width: 42,
          height: 25,
          fit: 'cover',
          borderRadius: 8,
          shadow: 'subtle',
          zIndex: 2,
        });
      }
    }

    onChangeTemplate({ ...template, slots: updatedSlots });
    if (batchFileInputRef.current) batchFileInputRef.current.value = '';
  };

  // Dynamically add a new media slot
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

  // Drag and drop handler per slot
  const handleSlotDrop = async (slotId: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverSlotId(null);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    soundFx.playShutter();
    if (onImportFileForSlot) {
      await onImportFileForSlot(slotId, file);
    } else {
      const isVideo = file.type.startsWith('video/');
      const url = URL.createObjectURL(file);
      const newMedia: MediaItem = {
        id: `media-${Date.now()}`,
        name: file.name,
        type: isVideo ? 'video' : 'image',
        url,
        file,
        aspectRatio: isVideo ? 16 / 9 : 4 / 5,
        width: 1080,
        height: 1920,
      };

      const updatedSlots = template.slots.map((s) =>
        s.id === slotId ? { ...s, media: newMedia } : s
      );
      onChangeTemplate({ ...template, slots: updatedSlots });
    }
  };

  const handleUpdateText = (textId: string, newText: string) => {
    const updated = template.textElements.map((t) =>
      t.id === textId ? { ...t, text: newText } : t
    );
    onChangeTemplate({ ...template, textElements: updated });
  };

  // Determine paper texture class
  const getTextureClass = () => {
    switch (template.overlays.paperTexture) {
      case 'linen-white':
        return 'bg-texture-linen';
      case 'warm-ivory':
        return 'bg-texture-ivory';
      case 'charcoal-dark':
        return 'bg-texture-charcoal';
      case 'kraft-paper':
        return 'bg-texture-kraft';
      case 'split-duotone':
        return 'bg-gradient-to-b from-[#F2EDE4] to-[#E5DEC9]';
      case 'clean-white':
        return 'bg-[#FFFFFF]';
      default:
        return '';
    }
  };

  // Determine aspect ratio style
  const aspectPadding = `${(1 / template.aspectRatio) * 100}%`;

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-[440px] mx-auto select-none rounded-xl overflow-hidden shadow-2xl transition-all"
      style={{
        aspectRatio: `${template.aspectRatio}`,
        backgroundColor: template.overlays.backgroundColor || '#FAF9F6',
      }}
      onClick={(e) => {
        if (e.target === containerRef.current) {
          onSelectSlot(null);
          onSelectText(null);
        }
      }}
    >
      {/* Hidden File Input for Single Slot Replacement */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleSlotFileChange}
      />

      {/* Hidden File Input for Batch Multi-Media Population */}
      <input
        ref={batchFileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={handleBatchFilesChange}
      />

      {/* Floating Canvas Quick Collage Toolbar (Top Right) */}
      <div className="absolute top-3 right-3 z-40 flex items-center gap-1.5 bg-black/65 backdrop-blur-md p-1 rounded-full border border-white/15 shadow-xl">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (batchFileInputRef.current) batchFileInputRef.current.click();
            soundFx.playHapticTick();
          }}
          className="flex items-center gap-1.5 px-3 py-1 bg-white text-[#2A2723] rounded-full text-[11px] font-bold shadow hover:bg-[#FAF9F6] transition-transform active:scale-95 whitespace-nowrap"
          title="Select multiple photos and videos at once to fill all collage frames"
        >
          <FolderPlus className="w-3.5 h-3.5 text-[#2A2723]" />
          <span>Batch Fill ({template.slots.length})</span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleAddNewSlot();
          }}
          className="flex items-center gap-1 px-2.5 py-1 bg-white/20 text-white hover:bg-white/30 rounded-full text-[11px] font-medium transition-colors whitespace-nowrap"
          title="Add another photo/video frame to this collage"
        >
          <Plus className="w-3 h-3" />
          <span>Add Slot</span>
        </button>

        {onOpenTemplateSelector && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenTemplateSelector();
              soundFx.playHapticTick();
            }}
            className="flex items-center gap-1 px-2.5 py-1 bg-white/20 text-white hover:bg-white/30 rounded-full text-[11px] font-medium transition-colors whitespace-nowrap"
            title="Choose a different collage format"
          >
            <Layers className="w-3 h-3" />
            <span>Templates</span>
          </button>
        )}
      </div>

      {/* Paper Texture Backdrop */}
      <div className={`absolute inset-0 pointer-events-none ${getTextureClass()}`} />

      {/* ---------------------------------------------------- */}
      {/* 1. OVERLAY DECORATIONS: BINDER RINGS & HOLE PUNCHES  */}
      {/* ---------------------------------------------------- */}
      {template.overlays.binderRings === 'left-spiral' && (
        <div className="absolute left-1 top-0 bottom-0 w-8 flex flex-col justify-around py-4 z-30 pointer-events-none">
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} className="relative flex items-center">
              {/* Hole punch */}
              <div className="w-2.5 h-2.5 rounded-full bg-[#3C3833] shadow-inner -ml-1" />
              {/* Spiral Wire */}
              <div className="w-5 h-2 bg-gradient-to-r from-[#D0D0D0] via-[#FFFFFF] to-[#999999] rounded-full shadow-md border border-[#777777] -ml-1 transform -rotate-12" />
            </div>
          ))}
        </div>
      )}

      {template.overlays.binderRings === 'middle-spiral' && (
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-8 flex justify-around px-4 z-30 pointer-events-none">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="relative flex flex-col items-center">
              {/* Hole punch */}
              <div className="w-2 h-2 rounded-full bg-[#2A2723] shadow-inner -mb-0.5" />
              {/* Spiral Wire */}
              <div className="w-2 h-7 bg-gradient-to-b from-[#EEEEEE] via-[#CCCCCC] to-[#888888] rounded-full shadow-md border border-[#666666]" />
            </div>
          ))}
        </div>
      )}

      {template.overlays.binderRings === 'left-4ring' && (
        <div className="absolute left-1 top-0 bottom-0 w-7 flex flex-col justify-between py-12 z-30 pointer-events-none">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="relative flex items-center">
              {/* Hole punch */}
              <div className="w-3.5 h-3.5 rounded-full bg-[#25221F] shadow-inner -ml-1" />
              {/* Chrome Binder Clip Ring */}
              <div className="w-6 h-3.5 rounded-r-full border-2 border-[#FFFFFF] bg-gradient-to-r from-[#E0E0E0] to-[#A0A0A0] shadow-lg -ml-1.5" />
            </div>
          ))}
        </div>
      )}

      {template.overlays.binderRings === 'top-4ring' && (
        <div className="absolute top-1 left-0 right-0 h-7 flex justify-around px-10 z-30 pointer-events-none">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="relative flex flex-col items-center">
              {/* Hole punch */}
              <div className="w-3.5 h-3.5 rounded-full bg-[#25221F] shadow-inner -mt-1" />
              {/* Chrome Binder Clip Ring */}
              <div className="w-3.5 h-6 rounded-b-full border-2 border-[#FFFFFF] bg-gradient-to-b from-[#E0E0E0] to-[#A0A0A0] shadow-lg -mt-1.5" />
            </div>
          ))}
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 2. TEMPLATE MEDIA SLOTS (Images & Videos)           */}
      {/* ---------------------------------------------------- */}
      {template.slots.map((slot) => {
        const isSelected = selectedSlotId === slot.id;
        const isDraggingThis = dragOverSlotId === slot.id;
        const isVideo = slot.media.type === 'video';

        return (
          <div
            key={slot.id}
            onClick={(e) => {
              e.stopPropagation();
              onSelectSlot(slot.id);
              onSelectText(null);
              soundFx.playHapticTick();
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverSlotId(slot.id);
            }}
            onDragLeave={() => setDragOverSlotId(null)}
            onDrop={(e) => handleSlotDrop(slot.id, e)}
            className={`absolute transition-all cursor-pointer group ${
              slot.shadow === 'polaroid' || slot.shadow === 'polaroid-deep'
                ? 'shadow-polaroid-deep'
                : slot.shadow === 'card'
                ? 'shadow-lg'
                : slot.shadow === 'subtle'
                ? 'shadow-md'
                : ''
            } ${
              isSelected
                ? 'ring-2 ring-[#0A84FF] ring-offset-2 z-40'
                : 'hover:ring-1 hover:ring-[#2A2723]/40'
            } ${isDraggingThis ? 'ring-4 ring-emerald-500 scale-102 z-40' : ''}`}
            style={{
              left: `${slot.x}%`,
              top: `${slot.y}%`,
              width: `${slot.width}%`,
              height: `${slot.height}%`,
              transform: slot.rotation ? `rotate(${slot.rotation}deg)` : undefined,
              zIndex: slot.zIndex || 2,
              borderRadius: slot.borderRadius ? `${slot.borderRadius}px` : undefined,
            }}
          >
            {/* ==================================================== */}
            {/* FRAME & BORDER CONTAINER                             */}
            {/* ==================================================== */}
            {/* A. POLAROID FRAME */}
            {slot.borderStyle === 'polaroid' ? (
              <div className="w-full h-full bg-[#FFFFFF] p-2 pb-6 sm:p-2.5 sm:pb-8 flex flex-col rounded shadow-md border border-[#E5E0D5]">
                <div className="relative w-full flex-1 bg-[#1A1A1A] overflow-hidden rounded-xs">
                  {isVideo ? (
                    <video
                      ref={(el) => { videoRefs.current[slot.id] = el; }}
                      src={slot.media.url}
                      className="w-full h-full object-cover"
                      playsInline
                      loop
                      muted={slot.isMuted !== false}
                      autoPlay={isPlayingMaster}
                    />
                  ) : (
                    <img
                      src={slot.media.url}
                      alt={slot.label}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      crossOrigin="anonymous"
                    />
                  )}
                  {/* Subtle film grain & glow overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                </div>
              </div>
            ) : slot.borderStyle === 'film-35mm' ? (
              /* B. 35MM FILM BORDER */
              <div className="w-full h-full bg-[#121214] p-1.5 sm:p-2 flex flex-col rounded-xs border border-[#2A2A2E] shadow-xl">
                {/* Top Film Sprocket Row */}
                <div className="h-3 flex items-center justify-between px-1 text-[7px] text-[#A69480] font-mono select-none">
                  <span>▶ {slot.filmBorderText || 'LUMENLAB 35MM'}</span>
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1 bg-[#2E2E33] rounded-xs" />
                    <span className="w-1.5 h-1 bg-[#2E2E33] rounded-xs" />
                    <span className="w-1.5 h-1 bg-[#2E2E33] rounded-xs" />
                  </div>
                </div>
                {/* Film Image Area */}
                <div className="relative w-full flex-1 bg-[#0A0A0B] overflow-hidden rounded-xs">
                  {isVideo ? (
                    <video
                      ref={(el) => { videoRefs.current[slot.id] = el; }}
                      src={slot.media.url}
                      className="w-full h-full object-cover"
                      playsInline
                      loop
                      muted={slot.isMuted !== false}
                      autoPlay={isPlayingMaster}
                    />
                  ) : (
                    <img
                      src={slot.media.url}
                      alt={slot.label}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      crossOrigin="anonymous"
                    />
                  )}
                </div>
                {/* Bottom Film Sprocket Row */}
                <div className="h-3 flex items-center justify-between px-1 text-[7px] text-[#A69480] font-mono select-none">
                  <span>ISO 400 • EXP</span>
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1 bg-[#2E2E33] rounded-xs" />
                    <span className="w-1.5 h-1 bg-[#2E2E33] rounded-xs" />
                  </div>
                </div>
              </div>
            ) : (
              /* C. STANDARD MEDIA FRAME */
              <div
                className={`relative w-full h-full overflow-hidden ${
                  slot.borderRadius ? `rounded-[${slot.borderRadius}px]` : ''
                }`}
                style={{ borderRadius: slot.borderRadius ? `${slot.borderRadius}px` : undefined }}
              >
                {isVideo ? (
                  <video
                    ref={(el) => { videoRefs.current[slot.id] = el; }}
                    src={slot.media.url}
                    className="w-full h-full object-cover"
                    playsInline
                    loop
                    muted={slot.isMuted !== false}
                    autoPlay={isPlayingMaster}
                  />
                ) : (
                  <img
                    src={slot.media.url}
                    alt={slot.label}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    crossOrigin="anonymous"
                  />
                )}
              </div>
            )}

            {/* ==================================================== */}
            {/* OVERLAY ACCENTS: WASHI TAPE & PAPER CLIPS           */}
            {/* ==================================================== */}
            {slot.tape === 'top-corners' && (
              <>
                <div className="absolute -top-2.5 -left-3 w-7 h-3.5 bg-[#FFFFFF]/75 backdrop-blur-xs border border-white/40 shadow-xs transform -rotate-30 z-30 pointer-events-none" />
                <div className="absolute -top-2.5 -right-3 w-7 h-3.5 bg-[#FFFFFF]/75 backdrop-blur-xs border border-white/40 shadow-xs transform rotate-30 z-30 pointer-events-none" />
              </>
            )}

            {slot.tape === 'all-corners' && (
              <>
                <div className="absolute -top-2.5 -left-3 w-7 h-3.5 bg-[#F5EEDC]/80 backdrop-blur-xs border border-amber-200/50 shadow-xs transform -rotate-30 z-30 pointer-events-none" />
                <div className="absolute -top-2.5 -right-3 w-7 h-3.5 bg-[#F5EEDC]/80 backdrop-blur-xs border border-amber-200/50 shadow-xs transform rotate-30 z-30 pointer-events-none" />
                <div className="absolute -bottom-2.5 -left-3 w-7 h-3.5 bg-[#F5EEDC]/80 backdrop-blur-xs border border-amber-200/50 shadow-xs transform rotate-30 z-30 pointer-events-none" />
                <div className="absolute -bottom-2.5 -right-3 w-7 h-3.5 bg-[#F5EEDC]/80 backdrop-blur-xs border border-amber-200/50 shadow-xs transform -rotate-30 z-30 pointer-events-none" />
              </>
            )}

            {slot.tape === 'top-center' && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-9 h-4 bg-[#F2EDE4]/85 backdrop-blur-xs border border-amber-100/60 shadow-xs transform -rotate-1 z-30 pointer-events-none" />
            )}

            {slot.tape === 'diagonal-strip' && (
              <div className="absolute -top-2 -right-3 w-8 h-4 bg-[#F5EEDC]/85 backdrop-blur-xs border border-amber-200/50 shadow-xs transform rotate-40 z-30 pointer-events-none" />
            )}

            {slot.paperClip === 'top-left' && (
              <div className="absolute -top-3.5 left-2 w-4 h-9 border-2 border-[#A0A0A0] bg-transparent rounded-full shadow-md z-30 pointer-events-none transform -rotate-12" />
            )}

            {slot.paperClip === 'top-right' && (
              <div className="absolute -top-3.5 right-2 w-4 h-9 border-2 border-[#D4AF37] bg-transparent rounded-full shadow-md z-30 pointer-events-none transform rotate-12" />
            )}

            {/* Like Heart Badge for Instagram Lookbooks */}
            {slot.heartBadge && (
              <div className="absolute bottom-1.5 right-1.5 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded-full flex items-center gap-1 z-20 pointer-events-none">
                <Heart className="w-2.5 h-2.5 text-rose-500 fill-rose-500" />
                {slot.likeCount && (
                  <span className="text-[8px] text-white font-medium">{slot.likeCount}</span>
                )}
              </div>
            )}

            {/* Video Indicator Badge */}
            {isVideo && (
              <div className="absolute top-1.5 left-1.5 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded-full flex items-center gap-1 z-20 text-[9px] text-white font-medium">
                <Play className="w-2.5 h-2.5 text-white fill-white" />
                <span>VIDEO</span>
              </div>
            )}

            {/* ==================================================== */}
            {/* HOVER / ACTIVE ACTION BUTTONS                       */}
            {/* ==================================================== */}
            <div
              className={`absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity flex flex-wrap items-center justify-center gap-1.5 p-2 ${
                isSelected ? 'opacity-100 z-30' : 'opacity-0 group-hover:opacity-100'
              }`}
            >
              {onChooseFromLibraryForSlot && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChooseFromLibraryForSlot(slot.id);
                    soundFx.playHapticTick();
                  }}
                  className="px-2 py-1 bg-amber-400 hover:bg-amber-300 text-[#2A2723] rounded-full text-[11px] font-bold shadow flex items-center gap-1 transition-transform transform active:scale-95 whitespace-nowrap"
                  title="Choose recorded video or camera photo from Media Library"
                >
                  <Camera className="w-3 h-3 text-[#2A2723]" />
                  <span>Library</span>
                </button>
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveUploadSlotId(slot.id);
                  if (fileInputRef.current) fileInputRef.current.click();
                  soundFx.playHapticTick();
                }}
                className="px-2 py-1 bg-white text-[#2A2723] rounded-full text-[11px] font-semibold shadow hover:bg-[#FAF9F6] flex items-center gap-1 transition-transform transform active:scale-95 whitespace-nowrap"
                title="Upload Photo or Video from device"
              >
                <Upload className="w-3 h-3 text-[#2A2723]" />
                <span>Upload</span>
              </button>

              {onRecordVideoForSlot && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRecordVideoForSlot(slot.id);
                    soundFx.playHapticTick();
                  }}
                  className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full text-[11px] font-semibold shadow flex items-center gap-1 transition-transform transform active:scale-95 whitespace-nowrap"
                  title="Record a live video for this frame"
                >
                  <Video className="w-3 h-3" />
                  <span>Record</span>
                </button>
              )}

              {onTakePhotoForSlot && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTakePhotoForSlot(slot.id);
                    soundFx.playHapticTick();
                  }}
                  className="p-1 bg-[#2A2723] hover:bg-black text-white rounded-full shadow transition-transform transform active:scale-95"
                  title="Take a live camera photo for this frame"
                >
                  <Camera className="w-3 h-3" />
                </button>
              )}

              {isVideo && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const updated = template.slots.map((s) =>
                      s.id === slot.id ? { ...s, isMuted: !s.isMuted } : s
                    );
                    onChangeTemplate({ ...template, slots: updated });
                    soundFx.playHapticTick();
                  }}
                  className="p-1 bg-black/70 text-white rounded-full hover:bg-black transition-colors"
                  title={slot.isMuted ? 'Unmute' : 'Mute'}
                >
                  {slot.isMuted ? (
                    <VolumeX className="w-3 h-3" />
                  ) : (
                    <Volume2 className="w-3 h-3" />
                  )}
                </button>
              )}

              {/* Delete / Remove Frame Media Item Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  soundFx.playHapticTick();
                  if (template.slots.length > 1) {
                    const updated = template.slots.filter((s) => s.id !== slot.id);
                    onChangeTemplate({ ...template, slots: updated });
                    if (selectedSlotId === slot.id) {
                      onSelectSlot(updated[0]?.id || null);
                    }
                  } else {
                    const updated = template.slots.map((s) =>
                      s.id === slot.id
                        ? {
                            ...s,
                            media: {
                              id: `empty-slot-${Date.now()}`,
                              name: 'Empty Frame',
                              type: 'image' as const,
                              url: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=1000&auto=format&fit=crop&q=80',
                              width: 1000,
                              height: 1000,
                              aspectRatio: 1,
                            },
                          }
                        : s
                    );
                    onChangeTemplate({ ...template, slots: updated });
                  }
                }}
                className="p-1 bg-red-600/90 hover:bg-red-700 text-white rounded-full shadow transition-transform transform active:scale-95 cursor-pointer"
                title={template.slots.length > 1 ? 'Delete this frame from project' : 'Remove media from frame'}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        );
      })}

      {/* ---------------------------------------------------- */}
      {/* 3. AIRDROP POPUP MODAL OVERLAY (Inspired by IMG_4059) */}
      {/* ---------------------------------------------------- */}
      {template.overlays.airdropCard?.enabled && (
        <div className="absolute inset-0 flex items-center justify-center p-6 z-25 pointer-events-none">
          <div className="w-full max-w-[280px] bg-[#1C1C1E]/85 backdrop-blur-2xl rounded-2xl p-4 flex flex-col items-center shadow-2xl border border-white/10 pointer-events-auto transition-all animate-in zoom-in-95">
            {/* Header */}
            <span className="text-white font-semibold text-sm tracking-wide">
              {template.overlays.airdropCard.title || 'AirDrop'}
            </span>
            <p className="text-[#A1A1A6] text-center text-xs mt-1 leading-snug px-2">
              “{template.overlays.airdropCard.deviceName || 'iPhone de Sophie'}” would like to share 1 item.
            </p>

            {/* Media slot is positioned over this area in the slot map */}
            <div className="w-full h-24 my-2 opacity-0" />

            {/* Action Buttons */}
            <div className="w-full grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  soundFx.playHapticTick();
                  setAirDropAccepted(false);
                }}
                className={`py-2 rounded-xl text-xs font-semibold text-center transition-all ${
                  !airDropAccepted
                    ? 'bg-[#2C2C2E] text-[#FF453A]'
                    : 'text-[#0A84FF] hover:bg-white/5'
                }`}
              >
                {template.overlays.airdropCard.declineLabel || 'Refuser'}
              </button>
              <button
                type="button"
                onClick={() => {
                  soundFx.playShutter();
                  setAirDropAccepted(true);
                }}
                className={`py-2 rounded-xl text-xs font-semibold text-center transition-all ${
                  airDropAccepted
                    ? 'bg-[#0A84FF] text-white shadow-md'
                    : 'text-[#0A84FF] hover:bg-white/5'
                }`}
              >
                {template.overlays.airdropCard.acceptLabel || 'Accepter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 4. EDITABLE TEXT OVERLAYS                           */}
      {/* ---------------------------------------------------- */}
      {template.textElements.map((txt) => {
        const isSelected = selectedTextId === txt.id;

        // Font Class
        const fontClass =
          txt.fontFamily === 'handwritten'
            ? 'font-handwritten'
            : txt.fontFamily === 'typewriter'
            ? 'font-typewriter'
            : txt.fontFamily === 'monospaced'
            ? 'font-mono-film'
            : txt.fontFamily === 'editorial-serif'
            ? 'font-serif-editorial'
            : txt.fontFamily === 'display-syne'
            ? 'font-display'
            : 'font-sans';

        return (
          <div
            key={txt.id}
            onClick={(e) => {
              e.stopPropagation();
              onSelectText(txt.id);
              onSelectSlot(null);
              soundFx.playHapticTick();
            }}
            className={`absolute transition-all cursor-text z-35 ${
              isSelected ? 'ring-2 ring-[#0A84FF] ring-offset-1 rounded-sm bg-white/20' : ''
            }`}
            style={{
              left: `${txt.x}%`,
              top: `${txt.y}%`,
              transform: `translate(${txt.align === 'center' ? '-50%' : txt.align === 'right' ? '-100%' : '0'}, -50%) ${
                txt.rotation ? `rotate(${txt.rotation}deg)` : ''
              }`,
              width: txt.width ? `${txt.width}%` : undefined,
              textAlign: txt.align,
            }}
          >
            {/* Style wrappers */}
            {txt.style === 'memo-card' ? (
              <div className="bg-[#FAF6EE] text-[#2A2723] p-3 rounded-xs shadow-md border border-[#E6DEC9] whitespace-pre-line leading-relaxed">
                <p
                  className={`${fontClass} text-xs font-normal`}
                  style={{ color: txt.color }}
                >
                  {txt.text}
                </p>
              </div>
            ) : txt.style === 'typewriter-strip' ? (
              <div className="bg-[#2A2723] text-white px-2 py-0.5 rounded-xs shadow-sm inline-block">
                <span
                  className={`${fontClass} text-[11px] tracking-wider`}
                  style={{ color: '#FFFFFF' }}
                >
                  {txt.text}
                </span>
              </div>
            ) : (
              <p
                className={`${fontClass} leading-tight ${
                  txt.uppercase ? 'uppercase' : ''
                }`}
                style={{
                  color: txt.color,
                  fontSize: `${txt.fontSize}px`,
                  letterSpacing: txt.letterSpacing,
                }}
              >
                {txt.text}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};
