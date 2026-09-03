import { Adjustments, DateStampSettings, HSLAdjustments, ToneCurves } from '../types';
import { safeClone } from '../utils/safeClone';

export const defaultHSL: HSLAdjustments = {
  red: { hue: 0, saturation: 0, luminance: 0 },
  orange: { hue: 0, saturation: 0, luminance: 0 },
  yellow: { hue: 0, saturation: 0, luminance: 0 },
  green: { hue: 0, saturation: 0, luminance: 0 },
  cyan: { hue: 0, saturation: 0, luminance: 0 },
  blue: { hue: 0, saturation: 0, luminance: 0 },
  purple: { hue: 0, saturation: 0, luminance: 0 },
  magenta: { hue: 0, saturation: 0, luminance: 0 },
};

export const defaultCurves: ToneCurves = {
  master: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
  red: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
  green: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
  blue: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
};

export const defaultCropBox = {
  x: 0,
  y: 0,
  width: 1,
  height: 1,
};

export const defaultDateStamp: DateStampSettings = {
  enabled: false,
  style: 'led-orange',
  position: 'bottom-right',
  includeTime: false,
  customDate: '',
  customTime: '',
  size: 1.0,
  opacity: 0.95,
};

export const defaultAdjustments: Adjustments = {
  presetId: 'none',
  presetStrength: 1.0,
  cameraType: 'none',
  dateStamp: { ...defaultDateStamp },

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

  hsl: defaultHSL,
  curves: defaultCurves,

  grainAmount: 0,
  grainSize: 1.0,
  grainRoughness: 0.5,

  dustType: 'none',
  dustAmount: 0,

  lightLeakType: 'none',
  lightLeakAmount: 0,
  lightLeakWarmth: 0.8,

  glowAmount: 0,
  glowRadius: 0.5,

  prismAmount: 0,
  vignetteAmount: 0,
  vignetteRoundness: 0.8,

  blurAmount: 0,
  blurMode: 'none',
  blurCenter: [0.5, 0.5],

  vhsAmount: 0,

  frameType: 'none',
  frameWidth: 0.05,
  frameColor: '#FFFFFF',

  cropAspect: 'free',
  cropShape: 'rect',
  cropBox: { ...defaultCropBox },
  rotation: 0,
  flipH: false,
  flipV: false,
};

export const createAdjustmentsCopy = (adj?: Adjustments | null): Adjustments => {
  if (!adj) return safeClone(defaultAdjustments);
  const cloned = safeClone({
    ...defaultAdjustments,
    ...adj,
    cropBox: { ...defaultCropBox, ...(adj.cropBox || {}) },
    hsl: safeClone(adj.hsl || defaultAdjustments.hsl),
    curves: safeClone(adj.curves || defaultAdjustments.curves),
    blurCenter: (Array.isArray(adj.blurCenter) && adj.blurCenter.length >= 2
      ? [adj.blurCenter[0], adj.blurCenter[1]]
      : [0.5, 0.5]) as [number, number],
  });
  return cloned;
};
