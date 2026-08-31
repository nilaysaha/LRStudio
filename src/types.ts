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

export type CameraType =
  | 'none'
  | 'disposable'
  | 'fling35'
  | 'kodak-gold'
  | 'klasse'
  | 'polaroid'
  | 'paradiso'
  | 'calagold'
  | 'sunshot07'
  | 'solare17'
  | 'prima'
  | 'novagold'
  | 'moka-v'
  | '5cam'
  | 'asteria'
  | 'natura'
  | 'aurea'
  | 'fuji400'
  | 'velour'
  | 'lunaria'
  | 'velvia'
  | 'ilford'
  | 'curva'
  | 'camcorder'
  | 'handicam'
  | 'digiscan'
  | 'pinky'
  | 'lomo'
  | 'lumina'
  | 'ultragold'
  | 'retra'
  | 'vhs'
  | 'tzachrome'
  | 'lofi'
  | 'photobooth'
  | 'cinestil'
  | '8mm'
  | '16mm'
  | 'super8'
  | 'super16';

export type DateStampStyle =
  | 'led-orange'     // Classic 90s Amber LED ('98 08 30)
  | 'led-red'        // Red Quartz LED (30 08 '98)
  | 'y2k-yellow'     // 2000s Digicam Yellow (2007.08.30 14:32)
  | 'camcorder-green'// Retro Camcorder Green (AUG 30 1996 14:32:00)
  | 'vhs-white'      // VHS OSD White (30.08.1998 14:32:00)
  | 'handicam-white' // Sony DCR White (REC 0:14:32)
  | 'film-gold'      // Kodak Film Gold (★ KODAK '98 08 30)
  | 'classic-white'; // Minimalist White Clean

export type DateStampPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

export interface DateStampSettings {
  enabled: boolean;
  style: DateStampStyle;
  position: DateStampPosition;
  includeTime: boolean;
  customDate?: string; // e.g. "1998-08-30" or "'98 08 30"
  customTime?: string; // e.g. "14:32:00"
  size: number; // 0.6 to 2.0 (default 1.0)
  opacity: number; // 0.3 to 1.0 (default 0.95)
}

export interface CameraProfile {
  id: CameraType;
  name: string;
  subtitle: string;
  tagline: string;
  iconName?: string;
  accentColor: string;
  dateStampFormat?: 'led-orange' | 'led-red' | 'y2k-yellow' | 'camcorder-green' | 'vhs-white' | 'handicam-white' | 'none';
  featuresDescription: string[];
  adjustments: Adjustments;
}

export interface Adjustments {
  // Preset Info
  presetId: string;
  presetStrength: number; // 0 to 1 (default 1)

  // Camera Type Overlay & Profile
  cameraType: CameraType;

  // Date / Time Stamp Superimpose
  dateStamp: DateStampSettings;

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
  category: 'LumenLab Signature' | 'Analog Cameras' | 'Editorial' | 'Vintage Film' | 'Golden & Warm' | 'Moody & B&W' | 'Custom';
  description: string;
  isCustom?: boolean;
  isFavorite?: boolean;
  badge?: string;
  adjustments: Adjustments;
  thumbnailColor?: string;
}

export type ActiveTab = 'templates' | 'presets' | 'adjust' | 'hsl' | 'effects' | 'curves' | 'frames' | 'crop';

export type ProjectTemplateTag =
  | 'clean'
  | 'souveniers'
  | 'sunbath'
  | 'love letters'
  | 'film classic'
  | 'film white'
  | 'editorial'
  | 'sketch'
  | 'cyber'
  | 'pride'
  | 'airdrop'
  | 'notebook'
  | 'scrapbook'
  | 'polaroid'
  | 'bento';

export type TemplateSlotBorderStyle =
  | 'none'
  | 'polaroid'
  | 'film-35mm'
  | 'thin-black'
  | 'thin-white'
  | 'rounded-modern';

export type TemplateTapeStyle =
  | 'none'
  | 'top-corners'
  | 'all-corners'
  | 'top-center'
  | 'diagonal-strip'
  | 'bottom-corners';

export type TemplatePaperClipStyle =
  | 'none'
  | 'top-left'
  | 'top-right'
  | 'left'
  | 'bottom-left'
  | 'top-center';

export interface TemplateSlot {
  id: string;
  label: string;
  media: MediaItem;
  // Position & Dimensions in percentage (0 to 100)
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number; // degrees e.g. -4, +3
  zIndex?: number;
  borderRadius?: number;
  borderStyle?: TemplateSlotBorderStyle;
  filmBorderText?: string;
  shadow?: 'none' | 'subtle' | 'card' | 'polaroid' | 'polaroid-deep' | 'deep';
  tape?: TemplateTapeStyle;
  paperClip?: TemplatePaperClipStyle;
  heartBadge?: boolean;
  likeCount?: string;
  tagBadge?: string;
  zoom?: number; // 1.0 to 3.0
  pan?: { x: number; y: number }; // -50 to +50
  fit?: 'cover' | 'contain';
  isMuted?: boolean;
  filterPresetId?: string;
}

export type TextFontFamily =
  | 'handwritten'
  | 'typewriter'
  | 'editorial-serif'
  | 'modern-sans'
  | 'monospaced'
  | 'display-syne';

export type TextStyleMode =
  | 'plain'
  | 'memo-card'
  | 'typewriter-strip'
  | 'callout-box'
  | 'manifesto'
  | 'doodle-circled'
  | 'airdrop-title'
  | 'price-tag'
  | 'modern-box';

export interface TemplateTextElement {
  id: string;
  label: string;
  text: string;
  fontFamily: TextFontFamily;
  fontSize: number; // relative base size
  color: string;
  align: 'left' | 'center' | 'right';
  x: number; // percentage 0 to 100
  y: number; // percentage 0 to 100
  width?: number; // percentage width
  style?: TextStyleMode;
  rotation?: number;
  uppercase?: boolean;
  letterSpacing?: string;
  opacity?: number;
}

export type BinderRingType =
  | 'none'
  | 'left-spiral'
  | 'top-spiral'
  | 'middle-spiral'
  | 'left-4ring'
  | 'right-4ring'
  | 'top-4ring'
  | 'hole-punches-left'
  | 'hole-punches-right';

export type PaperTextureType =
  | 'linen-white'
  | 'warm-ivory'
  | 'charcoal-dark'
  | 'kraft-paper'
  | 'clean-white'
  | 'split-duotone'
  | 'none';

export interface TemplateAirDropConfig {
  enabled: boolean;
  senderName: string;
  deviceName: string;
  title: string;
  declineLabel: string;
  acceptLabel: string;
  accepted?: boolean;
}

export interface TemplateDoodle {
  id: string;
  type: 'circle-arrow' | 'star' | 'heart' | 'underline' | 'cross' | 'custom-sketch';
  x: number;
  y: number;
  label?: string;
  color?: string;
  rotation?: number;
  scale?: number;
}

export interface TemplateOverlayConfig {
  binderRings?: BinderRingType;
  airdropCard?: TemplateAirDropConfig;
  paperTexture?: PaperTextureType;
  backgroundColor?: string;
  doodles?: TemplateDoodle[];
  saleBadge?: {
    enabled: boolean;
    text: string;
    subtext?: string;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  };
  customHeader?: {
    enabled: boolean;
    studioName?: string;
    website?: string;
    tagline?: string;
  };
}

export interface CollageTemplate {
  id: string;
  name: string;
  category: 'airdrop' | 'notebook' | 'scrapbook' | 'film-strip' | 'polaroid-stack' | 'editorial-grid' | 'handwritten-story';
  categoryLabel: string;
  categoryIcon?: string;
  description: string;
  subtitle: string;
  aspectRatio: number; // e.g. 9/16, 4/5, 1/1, 3/4
  aspectLabel: string;
  badge?: string;
  previewThumbnail: string;
  slots: TemplateSlot[];
  textElements: TemplateTextElement[];
  overlays: TemplateOverlayConfig;
  adjustments: Adjustments;
  moodKeywords: string[];
}

export interface ProjectTemplate {
  id: string;
  name: string;
  tag: ProjectTemplateTag;
  tagLabel: string;
  tagColor: string;
  tagBgColor: string;
  description: string;
  subtitle: string;
  aspectRatio: number; // e.g. 4/5, 9/16, 1/1, 3/4
  aspectLabel: string;
  adjustments: Adjustments;
  sampleMedia: MediaItem;
  previewThumbnail: string;
  moodKeywords: string[];
  badge?: string;
  // Optional collage template representation
  collageData?: CollageTemplate;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  templateId?: string;
  templateTag?: ProjectTemplateTag | 'custom';
  createdAt: number;
  updatedAt: number;
  coverUrl?: string;
  thumbnailUrl?: string;
  media: MediaItem;
  mediaList?: MediaItem[];
  adjustments: Adjustments;
  aspectRatio?: number;
  // Customized collage data if using a template
  activeCollage?: CollageTemplate;
}

