import { Adjustments, CollageTemplate, MediaItem, Project, TemplateSlot } from '../types';
import { createAdjustmentsCopy } from '../constants/defaultAdjustments';

export interface HistorySnapshot {
  adjustments: Adjustments;
  currentMedia: MediaItem | null;
  activeCollage: CollageTemplate | null;
  selectedSlotId: string | null;
  selectedTextId: string | null;
  projectCollages?: CollageTemplate[];
  activeCollageIndex?: number;
  projectId?: string | null;
  actionName?: string;
  timestamp: number;
}

export function cloneMediaItem(media: MediaItem | null): MediaItem | null {
  if (!media) return null;
  return { ...media };
}

export function cloneCollageSlot(slot: TemplateSlot): TemplateSlot {
  return {
    ...slot,
    media: cloneMediaItem(slot.media)!,
    pan: slot.pan ? { ...slot.pan } : undefined,
  };
}

export function cloneCollageTemplate(template: CollageTemplate | null): CollageTemplate | null {
  if (!template) return null;
  return {
    ...template,
    slots: template.slots ? template.slots.map(cloneCollageSlot) : [],
    textElements: template.textElements ? template.textElements.map((t) => ({ ...t })) : [],
    overlays: template.overlays
      ? {
          ...template.overlays,
          airdropCard: template.overlays.airdropCard ? { ...template.overlays.airdropCard } : undefined,
          saleBadge: template.overlays.saleBadge ? { ...template.overlays.saleBadge } : undefined,
          customHeader: template.overlays.customHeader ? { ...template.overlays.customHeader } : undefined,
          doodles: template.overlays.doodles ? template.overlays.doodles.map((d) => ({ ...d })) : undefined,
        }
      : { paperTexture: 'none' },
    adjustments: template.adjustments ? createAdjustmentsCopy(template.adjustments) : undefined,
    moodKeywords: template.moodKeywords ? [...template.moodKeywords] : [],
  };
}

export function createHistorySnapshot(
  adj: Adjustments,
  media: MediaItem | null,
  collage: CollageTemplate | null,
  slotId: string | null = null,
  textId: string | null = null,
  proj: Project | null = null,
  actionName?: string
): HistorySnapshot {
  return {
    adjustments: createAdjustmentsCopy(adj),
    currentMedia: cloneMediaItem(media),
    activeCollage: cloneCollageTemplate(collage),
    selectedSlotId: slotId,
    selectedTextId: textId,
    projectCollages: proj?.collages ? proj.collages.map((c) => cloneCollageTemplate(c)!) : undefined,
    activeCollageIndex: proj?.activeCollageIndex,
    projectId: proj?.id || null,
    actionName: actionName || 'Edit Action',
    timestamp: Date.now(),
  };
}
