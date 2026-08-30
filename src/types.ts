/**
 * LumenLab Type Definitions
 */

export type MediaType = 'image' | 'video';

export interface MediaItem {
  id: string;
  name: string;
  type: MediaType;
  url: string;
  file?: File;
  aspectRatio: number;
  width: number;
  height: number;
  duration?: number; // for video
}

export interface HSLChannel {
  hue: number; // -1 to 1 (-180 to +180 deg)
  saturation: number; // -1 to 1
  luminance: number; // -1 to 1
}

export interface HSLAdjustments {
  red: HSLChannel;
  orange: HSLChannel; // Skin tones
  yellow: HSLChannel;
  green: HSLChannel;
  cyan: HSLChannel;
  blue: HSLChannel;
  purple: HSLChannel;
  magenta: HSLChannel;
}

export type ColorChannel = 'red' | 'orange' | 'yellow' | 'green' | 'cyan' | 'blue' | 'purple' | 'magenta';

export interface CurvePoint {
  x: number; // 0 to 1
  y: number; // 0 to 1
}

export interface ToneCurves {
  master: CurvePoint[];
  red: CurvePoint[];
  green: CurvePoint[];
  blue: CurvePoint[];
}

export type LightLeakType = 'none' | 'sunset' | 'side-flare' | 'prism-beam' | 'corner-burn' | 'retro-streak';
export type DustType = 'none' | 'fine-specks' | 'film-scratches' | 'vintage-dust' | 'heavy-grunge';
export type FrameType = 'none' | 'film-35mm' | 'polaroid' | 'gallery-white' | 'gallery-cream' | 'slide-120' | 'retro-tv';

export interface Adjustments {
  // Preset Info
  presetId: string;
  presetStrength: number; // 0 to 1 (default 1)

  // Basic Tones
  exposure: number; // -1 to 1 (default 0)
  contrast: number; // -1 to 1 (default 0)
  highlights: number; // -1 to 1 (default 0)
  shadows: number; // -1 to 1 (default 0)
  whites: number; // -1 to 1 (default 0)
  blacks: number; // -1 to 1 (default 0)
  temperature: number; // -1 to 1 (default 0, warm/cool)
  tint: number; // -1 to 1 (default 0, green/magenta)
  saturation: number; // -1 to 1 (default 0)
  vibrance: number; // -1 to 1 (default 0)
  clarity: number; // -1 to 1 (default 0)

  // HSL Color Grading
  hsl: HSLAdjustments;

  // Tone Curves
  curves: ToneCurves;

  // Film Textures & Editorial Effects
  grainAmount: number; // 0 to 1
  grainSize: number; // 0.5 to 2.5
  grainRoughness: number; // 0 to 1

  dustType: DustType;
  dustAmount: number; // 0 to 1

  lightLeakType: LightLeakType;
  lightLeakAmount: number; // 0 to 1
  lightLeakWarmth: number; // 0 to 1

  glowAmount: number; // 0 to 1 (Halation / Dreamy Bloom)
  glowRadius: number; // 0 to 1

  prismAmount: number; // 0 to 1 (Chromatic Aberration)
  vignetteAmount: number; // -1 to 1 (negative = white vignette, positive = dark)
  vignetteRoundness: number; // 0 to 1

  blurAmount: number; // 0 to 1 (Tilt-shift / soft focus)
  blurMode: 'none' | 'radial' | 'linear';
  blurCenter: [number, number]; // [x, y] in 0-1

  vhsAmount: number; // 0 to 1 (scanlines & retro shift)

  // Frames & Borders
  frameType: FrameType;
  frameWidth: number; // 0.02 to 0.2
  frameColor: string; // hex

  // Crop & Transform
  cropBox: CropBox;
  cropShape: CropShape;
  cropAspect: CropAspect;
  rotation: number; // 0, 90, 180, 270
  flipH: boolean;
  flipV: boolean;
}

export interface CropBox {
  x: number; // 0 to 1
  y: number; // 0 to 1
  width: number; // 0 to 1
  height: number; // 0 to 1
}

export type CropShape = 'rect' | 'square' | 'circle';
export type CropAspect = 'free' | '1:1' | 'circle' | '4:5' | '9:16' | '16:9' | '3:4' | '2:3';

export interface Preset {
  id: string;
  name: string;
  category: 'LumenLab Signature' | 'Editorial' | 'Vintage Film' | 'Golden & Warm' | 'Moody & B&W' | 'Custom';
  description: string;
  isCustom?: boolean;
  isFavorite?: boolean;
  badge?: string;
  adjustments: Adjustments;
  thumbnailColor?: string;
}

export type ActiveTab = 'presets' | 'adjust' | 'hsl' | 'effects' | 'curves' | 'frames' | 'crop';
