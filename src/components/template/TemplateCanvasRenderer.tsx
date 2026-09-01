import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Upload, Sparkles, Volume2, VolumeX, Move, ZoomIn, ZoomOut,
  Trash2, RotateCw, RotateCcw, Heart, Check, X, Eye, Play, Pause, Plus, RefreshCw,
  Video, Camera, Layers, FolderPlus, Download, Share2, Copy, Maximize2, Minimize2,
  ArrowUp, ArrowDown, AlignCenter
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
  onOpenExport?: () => void;
  globalAdjustments?: Adjustments;
}

type TransformMode =
  | 'none'
  | 'move'
  | 'rotate'
  | 'resize-nw'
  | 'resize-ne'
  | 'resize-se'
  | 'resize-sw'
  | 'resize-n'
  | 'resize-s'
  | 'resize-w'
  | 'resize-e'
  | 'move-text';

interface DragSession {
  mode: TransformMode;
  targetId: string;
  pointerStartX: number;
  pointerStartY: number;
  initialSlot?: TemplateSlot;
  initialText?: TemplateTextElement;
  containerRect: DOMRect;
  centerPx?: { x: number; y: number };
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
  onOpenExport,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const batchFileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadSlotId, setActiveUploadSlotId] = useState<string | null>(null);

  // Drag over state for slot media file drag-and-drop
  const [dragOverSlotId, setDragOverSlotId] = useState<string | null>(null);

  // Interactive Drag / Move / Resize / Rotate state
  const [dragSession, setDragSession] = useState<DragSession | null>(null);
  const [snapGuideX, setSnapGuideX] = useState<number | null>(null);
  const [snapGuideY, setSnapGuideY] = useState<number | null>(null);
  const [liveTransformBadge, setLiveTransformBadge] = useState<string | null>(null);

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

  // Global window pointermove and pointerup listeners for butter-smooth dragging & resizing
  useEffect(() => {
    if (!dragSession) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (!containerRef.current) return;
      const { mode, targetId, pointerStartX, pointerStartY, initialSlot, initialText, containerRect } = dragSession;
      if (!containerRect || containerRect.width <= 0 || containerRect.height <= 0) return;

      const deltaX_px = e.clientX - pointerStartX;
      const deltaY_px = e.clientY - pointerStartY;
      const deltaX_pct = (deltaX_px / containerRect.width) * 100;
      const deltaY_pct = (deltaY_px / containerRect.height) * 100;

      if (mode === 'move' && initialSlot) {
        let newX = initialSlot.x + deltaX_pct;
        let newY = initialSlot.y + deltaY_pct;
        let snapX: number | null = null;
        let snapY: number | null = null;

        // Snapping: Horizontal Center (50%)
        const slotCenterX = newX + initialSlot.width / 2;
        if (Math.abs(slotCenterX - 50) < 1.8) {
          newX = 50 - initialSlot.width / 2;
          snapX = 50;
        } else if (Math.abs(newX) < 1.5) {
          newX = 0;
          snapX = 0;
        } else if (Math.abs(newX + initialSlot.width - 100) < 1.5) {
          newX = 100 - initialSlot.width;
          snapX = 100;
        }

        // Snapping: Vertical Center (50%)
        const slotCenterY = newY + initialSlot.height / 2;
        if (Math.abs(slotCenterY - 50) < 1.8) {
          newY = 50 - initialSlot.height / 2;
          snapY = 50;
        } else if (Math.abs(newY) < 1.5) {
          newY = 0;
          snapY = 0;
        } else if (Math.abs(newY + initialSlot.height - 100) < 1.5) {
          newY = 100 - initialSlot.height;
          snapY = 100;
        }

        // Bounds clamping
        newX = Math.max(-40, Math.min(110, newX));
        newY = Math.max(-40, Math.min(110, newY));

        setSnapGuideX(snapX);
        setSnapGuideY(snapY);
        setLiveTransformBadge(`X: ${Math.round(newX)}% • Y: ${Math.round(newY)}%`);

        const updatedSlots = template.slots.map((s) =>
          s.id === targetId ? { ...s, x: Math.round(newX * 10) / 10, y: Math.round(newY * 10) / 10 } : s
        );
        onChangeTemplate({ ...template, slots: updatedSlots });
      } else if (mode === 'rotate' && initialSlot) {
        // Calculate center of slot in screen px
        const slotCenterPxX = containerRect.left + ((initialSlot.x + initialSlot.width / 2) / 100) * containerRect.width;
        const slotCenterPxY = containerRect.top + ((initialSlot.y + initialSlot.height / 2) / 100) * containerRect.height;

        const rad = Math.atan2(e.clientY - slotCenterPxY, e.clientX - slotCenterPxX);
        let deg = Math.round(rad * (180 / Math.PI) + 90);
        if (deg > 180) deg -= 360;
        if (deg < -180) deg += 360;

        // Snapping to common angles: 0°, 90°, -90°, 45°, -45°
        if (Math.abs(deg) < 3) deg = 0;
        else if (Math.abs(deg - 90) < 3) deg = 90;
        else if (Math.abs(deg + 90) < 3) deg = -90;
        else if (Math.abs(deg - 45) < 3) deg = 45;
        else if (Math.abs(deg + 45) < 3) deg = -45;

        setLiveTransformBadge(`Rotation: ${deg}°`);
        const updatedSlots = template.slots.map((s) =>
          s.id === targetId ? { ...s, rotation: deg } : s
        );
        onChangeTemplate({ ...template, slots: updatedSlots });
      } else if (mode.startsWith('resize-') && initialSlot) {
        let newX = initialSlot.x;
        let newY = initialSlot.y;
        let newW = initialSlot.width;
        let newH = initialSlot.height;

        if (mode === 'resize-se') {
          newW = Math.max(6, Math.min(100, initialSlot.width + deltaX_pct));
          newH = Math.max(6, Math.min(100, initialSlot.height + deltaY_pct));
        } else if (mode === 'resize-sw') {
          newW = Math.max(6, initialSlot.width - deltaX_pct);
          newH = Math.max(6, Math.min(100, initialSlot.height + deltaY_pct));
          newX = initialSlot.x + (initialSlot.width - newW);
        } else if (mode === 'resize-ne') {
          newW = Math.max(6, Math.min(100, initialSlot.width + deltaX_pct));
          newH = Math.max(6, initialSlot.height - deltaY_pct);
          newY = initialSlot.y + (initialSlot.height - newH);
        } else if (mode === 'resize-nw') {
          newW = Math.max(6, initialSlot.width - deltaX_pct);
          newH = Math.max(6, initialSlot.height - deltaY_pct);
          newX = initialSlot.x + (initialSlot.width - newW);
          newY = initialSlot.y + (initialSlot.height - newH);
        } else if (mode === 'resize-e') {
          newW = Math.max(6, Math.min(100, initialSlot.width + deltaX_pct));
        } else if (mode === 'resize-w') {
          newW = Math.max(6, initialSlot.width - deltaX_pct);
          newX = initialSlot.x + (initialSlot.width - newW);
        } else if (mode === 'resize-s') {
          newH = Math.max(6, Math.min(100, initialSlot.height + deltaY_pct));
        } else if (mode === 'resize-n') {
          newH = Math.max(6, initialSlot.height - deltaY_pct);
          newY = initialSlot.y + (initialSlot.height - newH);
        }

        setLiveTransformBadge(`W: ${Math.round(newW)}% • H: ${Math.round(newH)}%`);
        const updatedSlots = template.slots.map((s) =>
          s.id === targetId
            ? {
                ...s,
                x: Math.round(newX * 10) / 10,
                y: Math.round(newY * 10) / 10,
                width: Math.round(newW * 10) / 10,
                height: Math.round(newH * 10) / 10,
              }
            : s
        );
        onChangeTemplate({ ...template, slots: updatedSlots });
      } else if (mode === 'move-text' && initialText) {
        let newX = initialText.x + deltaX_pct;
        let newY = initialText.y + deltaY_pct;

        newX = Math.max(0, Math.min(100, newX));
        newY = Math.max(0, Math.min(100, newY));

        setLiveTransformBadge(`Text X: ${Math.round(newX)}% • Y: ${Math.round(newY)}%`);
        const updatedTexts = template.textElements.map((t) =>
          t.id === targetId ? { ...t, x: Math.round(newX * 10) / 10, y: Math.round(newY * 10) / 10 } : t
        );
        onChangeTemplate({ ...template, textElements: updatedTexts });
      }
    };

    const handlePointerUp = () => {
      setDragSession(null);
      setSnapGuideX(null);
      setSnapGuideY(null);
      setLiveTransformBadge(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [dragSession, template, onChangeTemplate]);

  // Start Move Dragging for a Slot
  const handleStartSlotMove = (e: React.PointerEvent, slot: TemplateSlot) => {
    e.stopPropagation();
    if (!containerRef.current) return;
    soundFx.playHapticTick();
    onSelectSlot(slot.id);
    onSelectText(null);

    const containerRect = containerRef.current.getBoundingClientRect();
    setDragSession({
      mode: 'move',
      targetId: slot.id,
      pointerStartX: e.clientX,
      pointerStartY: e.clientY,
      initialSlot: { ...slot },
      containerRect,
    });
  };

  // Start Resize Dragging for a Slot Handle
  const handleStartSlotResize = (e: React.PointerEvent, slot: TemplateSlot, mode: TransformMode) => {
    e.stopPropagation();
    e.preventDefault();
    if (!containerRef.current) return;
    soundFx.playHapticTick();

    const containerRect = containerRef.current.getBoundingClientRect();
    setDragSession({
      mode,
      targetId: slot.id,
      pointerStartX: e.clientX,
      pointerStartY: e.clientY,
      initialSlot: { ...slot },
      containerRect,
    });
  };

  // Start Rotate Dragging for a Slot Handle
  const handleStartSlotRotate = (e: React.PointerEvent, slot: TemplateSlot) => {
    e.stopPropagation();
    e.preventDefault();
    if (!containerRef.current) return;
    soundFx.playHapticTick();

    const containerRect = containerRef.current.getBoundingClientRect();
    setDragSession({
      mode: 'rotate',
      targetId: slot.id,
      pointerStartX: e.clientX,
      pointerStartY: e.clientY,
      initialSlot: { ...slot },
      containerRect,
    });
  };

  // Start Text Move Dragging
  const handleStartTextMove = (e: React.PointerEvent, txt: TemplateTextElement) => {
    e.stopPropagation();
    if (!containerRef.current) return;
    soundFx.playHapticTick();
    onSelectText(txt.id);
    onSelectSlot(null);

    const containerRect = containerRef.current.getBoundingClientRect();
    setDragSession({
      mode: 'move-text',
      targetId: txt.id,
      pointerStartX: e.clientX,
      pointerStartY: e.clientY,
      initialText: { ...txt },
      containerRect,
    });
  };

  // Duplicate a Slot
  const handleDuplicateSlot = (slotId: string) => {
    soundFx.playHapticTick();
    const sourceSlot = template.slots.find((s) => s.id === slotId);
    if (!sourceSlot) return;

    const newSlot: TemplateSlot = {
      ...sourceSlot,
      id: `slot-dup-${Date.now()}`,
      label: `${sourceSlot.label} (Copy)`,
      x: Math.min(70, sourceSlot.x + 6),
      y: Math.min(70, sourceSlot.y + 6),
      zIndex: (sourceSlot.zIndex || 2) + 1,
    };

    onChangeTemplate({ ...template, slots: [...template.slots, newSlot] });
    onSelectSlot(newSlot.id);
  };

  // Change Layer Order (Bring Forward / Send Backward)
  const handleAdjustSlotLayer = (slotId: string, delta: number) => {
    soundFx.playHapticTick();
    const updatedSlots = template.slots.map((s) =>
      s.id === slotId ? { ...s, zIndex: Math.max(1, (s.zIndex || 2) + delta) } : s
    );
    onChangeTemplate({ ...template, slots: updatedSlots });
  };

  // Quick Center Slot
  const handleCenterSlot = (slotId: string) => {
    soundFx.playHapticTick();
    const slot = template.slots.find((s) => s.id === slotId);
    if (!slot) return;
    const newX = Math.round((50 - slot.width / 2) * 10) / 10;
    const newY = Math.round((50 - slot.height / 2) * 10) / 10;
    const updated = template.slots.map((s) => (s.id === slotId ? { ...s, x: newX, y: newY } : s));
    onChangeTemplate({ ...template, slots: updated });
  };

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
          x: col === 0 ? 8 : 52,
          y: Math.min(80, 10 + row * 30),
          width: 40,
          height: 28,
          fit: 'cover',
          borderRadius: 8,
          shadow: 'card',
          zIndex: updatedSlots.length + 2,
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
      label: `Media Frame ${newIndex}`,
      media: {
        id: `media-new-${Date.now()}`,
        name: `Frame ${newIndex}`,
        type: 'image',
        url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=800&auto=format&fit=crop',
        aspectRatio: 1,
        width: 800,
        height: 800,
      },
      x: 20 + (newIndex % 3) * 8,
      y: 25 + (newIndex % 3) * 8,
      width: 46,
      height: 36,
      fit: 'cover',
      borderRadius: 8,
      borderStyle: 'polaroid',
      shadow: 'polaroid-deep',
      tape: 'top-corners',
      zIndex: template.slots.length + 3,
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
      className="relative w-full max-w-[540px] max-h-full mx-auto select-none rounded-xl overflow-hidden shadow-2xl transition-all my-auto"
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

        {onOpenExport && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenExport();
              soundFx.playHapticTick();
            }}
            className="flex items-center gap-1 px-3 py-1 bg-[#D97706] hover:bg-[#B45309] text-white rounded-full text-[11px] font-bold shadow transition-transform active:scale-95 whitespace-nowrap"
            title="Export & Share Collage"
          >
            <Share2 className="w-3 h-3" />
            <span>Export</span>
          </button>
        )}
      </div>

      {/* Paper Texture Backdrop */}
      <div className={`absolute inset-0 pointer-events-none ${getTextureClass()}`} />

      {/* Live Snapping Guide Crosshairs */}
      {snapGuideX !== null && (
        <div
          className="absolute top-0 bottom-0 w-[1.5px] bg-[#0A84FF] z-50 pointer-events-none shadow-[0_0_8px_rgba(10,132,255,0.8)]"
          style={{ left: `${snapGuideX}%` }}
        >
          <div className="absolute top-2 left-1 bg-[#0A84FF] text-white text-[9px] font-mono px-1 py-0.5 rounded shadow">
            {snapGuideX === 50 ? 'Center' : `${snapGuideX}%`}
          </div>
        </div>
      )}
      {snapGuideY !== null && (
        <div
          className="absolute left-0 right-0 h-[1.5px] bg-[#0A84FF] z-50 pointer-events-none shadow-[0_0_8px_rgba(10,132,255,0.8)]"
          style={{ top: `${snapGuideY}%` }}
        >
          <div className="absolute left-2 top-1 bg-[#0A84FF] text-white text-[9px] font-mono px-1 py-0.5 rounded shadow">
            {snapGuideY === 50 ? 'Center' : `${snapGuideY}%`}
          </div>
        </div>
      )}

      {/* Live Transform Coordinate Badge HUD */}
      {liveTransformBadge && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-[#1C1C1E]/90 backdrop-blur-md text-white text-[11px] font-mono px-3 py-1 rounded-full shadow-xl border border-white/20 z-50 pointer-events-none animate-in fade-in zoom-in-95">
          {liveTransformBadge}
        </div>
      )}

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
        const isCurrentlyMoving = dragSession?.targetId === slot.id;

        return (
          <div
            key={slot.id}
            onClick={(e) => {
              e.stopPropagation();
              onSelectSlot(slot.id);
              onSelectText(null);
              soundFx.playHapticTick();
            }}
            onPointerDown={(e) => {
              // If clicking inside the slot body, initiate move drag
              if (e.button === 0) {
                handleStartSlotMove(e, slot);
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverSlotId(slot.id);
            }}
            onDragLeave={() => setDragOverSlotId(null)}
            onDrop={(e) => handleSlotDrop(slot.id, e)}
            className={`absolute select-none cursor-move group touch-none ${
              slot.shadow === 'polaroid' || slot.shadow === 'polaroid-deep'
                ? 'shadow-polaroid-deep'
                : slot.shadow === 'card'
                ? 'shadow-lg'
                : slot.shadow === 'subtle'
                ? 'shadow-md'
                : ''
            } ${
              isSelected
                ? 'ring-2 ring-[#0A84FF] shadow-2xl z-40'
                : 'hover:ring-1 hover:ring-[#2A2723]/50'
            } ${isDraggingThis ? 'ring-4 ring-emerald-500 scale-102 z-40' : ''} ${
              isCurrentlyMoving ? 'opacity-90' : ''
            }`}
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
                <div className="relative w-full flex-1 bg-[#1A1A1A] overflow-hidden rounded-xs pointer-events-none">
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
                <div className="h-3 flex items-center justify-between px-1 text-[7px] text-[#A69480] font-mono select-none pointer-events-none">
                  <span>▶ {slot.filmBorderText || 'LUMENLAB 35MM'}</span>
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1 bg-[#2E2E33] rounded-xs" />
                    <span className="w-1.5 h-1 bg-[#2E2E33] rounded-xs" />
                    <span className="w-1.5 h-1 bg-[#2E2E33] rounded-xs" />
                  </div>
                </div>
                {/* Film Image Area */}
                <div className="relative w-full flex-1 bg-[#0A0A0B] overflow-hidden rounded-xs pointer-events-none">
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
                <div className="h-3 flex items-center justify-between px-1 text-[7px] text-[#A69480] font-mono select-none pointer-events-none">
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
                className={`relative w-full h-full overflow-hidden pointer-events-none ${
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
              <div className="absolute top-1.5 left-1.5 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded-full flex items-center gap-1 z-20 text-[9px] text-white font-medium pointer-events-none">
                <Play className="w-2.5 h-2.5 text-white fill-white" />
                <span>VIDEO</span>
              </div>
            )}

            {/* ==================================================== */}
            {/* ACTIVE SELECTION BOUNDING BOX & INTERACTIVE HANDLES  */}
            {/* ==================================================== */}
            {isSelected && (
              <>
                {/* 1. TOP ROTATION HANDLE STALK */}
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex flex-col items-center z-50 pointer-events-auto">
                  <div
                    onPointerDown={(e) => handleStartSlotRotate(e, slot)}
                    className="w-6 h-6 rounded-full bg-white text-[#0A84FF] border-2 border-[#0A84FF] shadow-lg flex items-center justify-center cursor-grab active:cursor-grabbing hover:scale-110 active:scale-95 transition-transform"
                    title="Drag to Rotate Frame"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </div>
                  <div className="w-[1.5px] h-2 bg-[#0A84FF]" />
                </div>

                {/* 2. CORNER RESIZE HANDLES */}
                {/* NW (Top-Left) */}
                <div
                  onPointerDown={(e) => handleStartSlotResize(e, slot, 'resize-nw')}
                  className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-[#0A84FF] rounded-full shadow-md z-50 cursor-nwse-resize hover:scale-125 transition-transform pointer-events-auto"
                  title="Resize Corner (Top-Left)"
                />
                {/* NE (Top-Right) */}
                <div
                  onPointerDown={(e) => handleStartSlotResize(e, slot, 'resize-ne')}
                  className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-[#0A84FF] rounded-full shadow-md z-50 cursor-nesw-resize hover:scale-125 transition-transform pointer-events-auto"
                  title="Resize Corner (Top-Right)"
                />
                {/* SE (Bottom-Right) */}
                <div
                  onPointerDown={(e) => handleStartSlotResize(e, slot, 'resize-se')}
                  className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-[#0A84FF] rounded-full shadow-md z-50 cursor-nwse-resize hover:scale-125 transition-transform pointer-events-auto"
                  title="Resize Corner (Bottom-Right)"
                />
                {/* SW (Bottom-Left) */}
                <div
                  onPointerDown={(e) => handleStartSlotResize(e, slot, 'resize-sw')}
                  className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-[#0A84FF] rounded-full shadow-md z-50 cursor-nesw-resize hover:scale-125 transition-transform pointer-events-auto"
                  title="Resize Corner (Bottom-Left)"
                />

                {/* 3. EDGE RESIZE HANDLES */}
                {/* N (Top) */}
                <div
                  onPointerDown={(e) => handleStartSlotResize(e, slot, 'resize-n')}
                  className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-2 bg-white border border-[#0A84FF] rounded-xs shadow-xs z-50 cursor-ns-resize hover:scale-110 pointer-events-auto"
                  title="Resize Height (Top)"
                />
                {/* S (Bottom) */}
                <div
                  onPointerDown={(e) => handleStartSlotResize(e, slot, 'resize-s')}
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-2 bg-white border border-[#0A84FF] rounded-xs shadow-xs z-50 cursor-ns-resize hover:scale-110 pointer-events-auto"
                  title="Resize Height (Bottom)"
                />
                {/* W (Left) */}
                <div
                  onPointerDown={(e) => handleStartSlotResize(e, slot, 'resize-w')}
                  className="absolute top-1/2 -translate-y-1/2 -left-1 w-2 h-4 bg-white border border-[#0A84FF] rounded-xs shadow-xs z-50 cursor-ew-resize hover:scale-110 pointer-events-auto"
                  title="Resize Width (Left)"
                />
                {/* E (Right) */}
                <div
                  onPointerDown={(e) => handleStartSlotResize(e, slot, 'resize-e')}
                  className="absolute top-1/2 -translate-y-1/2 -right-1 w-2 h-4 bg-white border border-[#0A84FF] rounded-xs shadow-xs z-50 cursor-ew-resize hover:scale-110 pointer-events-auto"
                  title="Resize Width (Right)"
                />

                {/* 4. FLOATING MINI ACTION HUD TOOLBAR */}
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-[#1C1C1E]/95 backdrop-blur-md px-2 py-1 rounded-full shadow-2xl border border-white/20 z-50 pointer-events-auto animate-in fade-in zoom-in-95 whitespace-nowrap"
                >
                  {/* Drag Move Grip */}
                  <div
                    onPointerDown={(e) => handleStartSlotMove(e, slot)}
                    className="p-1 text-white/80 hover:text-white hover:bg-white/20 rounded-full cursor-grab active:cursor-grabbing transition-colors"
                    title="Click and drag to Move Frame"
                  >
                    <Move className="w-3.5 h-3.5 text-[#0A84FF]" />
                  </div>

                  {/* Center Slot */}
                  <button
                    type="button"
                    onClick={() => handleCenterSlot(slot.id)}
                    className="p-1 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors"
                    title="Center on Canvas"
                  >
                    <AlignCenter className="w-3.5 h-3.5" />
                  </button>

                  {/* Layer Up */}
                  <button
                    type="button"
                    onClick={() => handleAdjustSlotLayer(slot.id, 1)}
                    className="p-1 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors"
                    title="Bring Forward"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>

                  {/* Layer Down */}
                  <button
                    type="button"
                    onClick={() => handleAdjustSlotLayer(slot.id, -1)}
                    className="p-1 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors"
                    title="Send Backward"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>

                  {/* Duplicate */}
                  <button
                    type="button"
                    onClick={() => handleDuplicateSlot(slot.id)}
                    className="p-1 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors"
                    title="Duplicate Frame"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  {/* Upload */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveUploadSlotId(slot.id);
                      if (fileInputRef.current) fileInputRef.current.click();
                      soundFx.playHapticTick();
                    }}
                    className="p-1 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors"
                    title="Upload Photo or Video from device"
                  >
                    <Upload className="w-3.5 h-3.5" />
                  </button>

                  {/* Library */}
                  {onChooseFromLibraryForSlot && (
                    <button
                      type="button"
                      onClick={() => {
                        onChooseFromLibraryForSlot(slot.id);
                        soundFx.playHapticTick();
                      }}
                      className="p-1 text-amber-300 hover:text-amber-200 hover:bg-white/20 rounded-full transition-colors"
                      title="Choose from Curated Library"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playHapticTick();
                      if (template.slots.length > 1) {
                        const updated = template.slots.filter((s) => s.id !== slot.id);
                        onChangeTemplate({ ...template, slots: updated });
                        onSelectSlot(updated[0]?.id || null);
                      }
                    }}
                    className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-full transition-colors"
                    title="Delete Frame"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </>
            )}

            {/* Quick Unselected Hover Overlay */}
            {!isSelected && (
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none rounded">
                <div className="bg-black/80 text-white text-[10px] font-semibold px-2 py-1 rounded-full flex items-center gap-1 shadow">
                  <Move className="w-2.5 h-2.5" />
                  <span>Click to Position</span>
                </div>
              </div>
            )}
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
            onPointerDown={(e) => {
              if (e.button === 0) {
                handleStartTextMove(e, txt);
              }
            }}
            className={`absolute select-none cursor-move transition-all z-35 touch-none group ${
              isSelected ? 'ring-2 ring-[#0A84FF] ring-offset-1 rounded-sm bg-white/20 shadow-md' : 'hover:ring-1 hover:ring-black/30'
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
              <div className="bg-[#FAF6EE] text-[#2A2723] p-3 rounded-xs shadow-md border border-[#E6DEC9] whitespace-pre-line leading-relaxed pointer-events-none">
                <p
                  className={`${fontClass} text-xs font-normal`}
                  style={{ color: txt.color }}
                >
                  {txt.text}
                </p>
              </div>
            ) : txt.style === 'typewriter-strip' ? (
              <div className="bg-[#2A2723] text-white px-2 py-0.5 rounded-xs shadow-sm inline-block pointer-events-none">
                <span
                  className={`${fontClass} text-[11px] tracking-wider`}
                  style={{ color: '#FFFFFF' }}
                >
                  {txt.text}
                </span>
              </div>
            ) : (
              <p
                className={`${fontClass} leading-tight pointer-events-none ${
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

            {isSelected && (
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-[#1C1C1E]/90 text-white text-[9px] font-mono px-2 py-0.5 rounded-full whitespace-nowrap pointer-events-none flex items-center gap-1">
                <Move className="w-2.5 h-2.5 text-[#0A84FF]" />
                <span>Drag to move text</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
