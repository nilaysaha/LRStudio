import { TemplateSlot, TemplateTextElement } from '../types';

/**
 * Sort slots by current visual layer order (bottom to top).
 * Uses zIndex if present, falling back to original array order.
 */
export const getSortedSlotsByLayer = (slots: TemplateSlot[]): TemplateSlot[] => {
  return [...slots].sort((a, b) => {
    const za = typeof a.zIndex === 'number' ? a.zIndex : 1;
    const zb = typeof b.zIndex === 'number' ? b.zIndex : 1;
    if (za !== zb) return za - zb;
    return slots.indexOf(a) - slots.indexOf(b);
  });
};

/**
 * Reorder a slot within the layer stack.
 * Guarantees that:
 * 1. The slot physically moves past the adjacent slot (swap) or to the front/back.
 * 2. Every slot receives a distinct, strictly ascending zIndex (2, 4, 6, 8...).
 * 3. The returned array is ordered from bottom layer to top layer for 100% DOM & CSS consistency.
 */
export const reorderSlotLayer = (
  slots: TemplateSlot[],
  targetId: string,
  action: 'forward' | 'backward' | 'front' | 'back'
): TemplateSlot[] => {
  if (!slots || slots.length <= 1) return slots;

  const sorted = getSortedSlotsByLayer(slots);
  const currentIndex = sorted.findIndex((s) => s.id === targetId);
  if (currentIndex === -1) return slots;

  if (action === 'forward') {
    if (currentIndex < sorted.length - 1) {
      // Swap with the slot directly above it
      const temp = sorted[currentIndex];
      sorted[currentIndex] = sorted[currentIndex + 1];
      sorted[currentIndex + 1] = temp;
    }
  } else if (action === 'backward') {
    if (currentIndex > 0) {
      // Swap with the slot directly below it
      const temp = sorted[currentIndex];
      sorted[currentIndex] = sorted[currentIndex - 1];
      sorted[currentIndex - 1] = temp;
    }
  } else if (action === 'front') {
    if (currentIndex < sorted.length - 1) {
      const [item] = sorted.splice(currentIndex, 1);
      sorted.push(item);
    }
  } else if (action === 'back') {
    if (currentIndex > 0) {
      const [item] = sorted.splice(currentIndex, 1);
      sorted.unshift(item);
    }
  }

  // Re-normalize all zIndex values to clean, distinct, ascending numbers (2, 4, 6, 8...)
  return sorted.map((slot, idx) => ({
    ...slot,
    zIndex: (idx + 1) * 2,
  }));
};

/**
 * Get layer information for a specific slot.
 */
export const getSlotLayerInfo = (
  slots: TemplateSlot[],
  targetId: string
): {
  layerNumber: number;
  totalLayers: number;
  canBringForward: boolean;
  canSendBackward: boolean;
} => {
  if (!slots || slots.length === 0) {
    return { layerNumber: 1, totalLayers: 1, canBringForward: false, canSendBackward: false };
  }
  const sorted = getSortedSlotsByLayer(slots);
  const index = sorted.findIndex((s) => s.id === targetId);
  if (index === -1) {
    return { layerNumber: 1, totalLayers: sorted.length, canBringForward: false, canSendBackward: false };
  }
  return {
    layerNumber: index + 1,
    totalLayers: sorted.length,
    canBringForward: index < sorted.length - 1,
    canSendBackward: index > 0,
  };
};

/**
 * Sort text elements by layer order (bottom to top).
 */
export const getSortedTextsByLayer = (texts: TemplateTextElement[]): TemplateTextElement[] => {
  return [...texts].sort((a, b) => {
    const za = typeof a.zIndex === 'number' ? a.zIndex : 30;
    const zb = typeof b.zIndex === 'number' ? b.zIndex : 30;
    if (za !== zb) return za - zb;
    return texts.indexOf(a) - texts.indexOf(b);
  });
};

/**
 * Reorder a text element within the text layer stack.
 */
export const reorderTextLayer = (
  texts: TemplateTextElement[],
  targetId: string,
  action: 'forward' | 'backward' | 'front' | 'back'
): TemplateTextElement[] => {
  if (!texts || texts.length <= 1) return texts;

  const sorted = getSortedTextsByLayer(texts);
  const currentIndex = sorted.findIndex((t) => t.id === targetId);
  if (currentIndex === -1) return texts;

  if (action === 'forward') {
    if (currentIndex < sorted.length - 1) {
      const temp = sorted[currentIndex];
      sorted[currentIndex] = sorted[currentIndex + 1];
      sorted[currentIndex + 1] = temp;
    }
  } else if (action === 'backward') {
    if (currentIndex > 0) {
      const temp = sorted[currentIndex];
      sorted[currentIndex] = sorted[currentIndex - 1];
      sorted[currentIndex - 1] = temp;
    }
  } else if (action === 'front') {
    if (currentIndex < sorted.length - 1) {
      const [item] = sorted.splice(currentIndex, 1);
      sorted.push(item);
    }
  } else if (action === 'back') {
    if (currentIndex > 0) {
      const [item] = sorted.splice(currentIndex, 1);
      sorted.unshift(item);
    }
  }

  return sorted.map((text, idx) => ({
    ...text,
    zIndex: 30 + (idx + 1) * 2,
  }));
};
