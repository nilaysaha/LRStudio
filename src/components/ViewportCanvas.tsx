import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, RotateCcw, ZoomIn, ZoomOut, Maximize2, Grid3X3 } from 'lucide-react';
import { Adjustments, MediaItem } from '../types';
import { WebGLFilterEngine } from '../webgl/webglEngine';
import { soundFx } from '../utils/audio';

interface ViewportCanvasProps {
  media: MediaItem | null;
  adjustments: Adjustments;
  compareMode: 'none' | 'split' | 'hold';
  onMediaLoaded?: (width: number, height: number) => void;
  showGrid?: boolean;
}

export const ViewportCanvas: React.FC<ViewportCanvasProps> = ({
  media,
  adjustments,
  compareMode,
  onMediaLoaded,
  showGrid = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const engineRef = useRef<WebGLFilterEngine | null>(null);

  const [splitPos, setSplitPos] = useState(0.5);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);

  // Video playback states
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(true);

  // Zoom & Pan
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize WebGL Engine
  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new WebGLFilterEngine(canvasRef.current);
    engineRef.current = engine;

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  // Handle Media Loading & Dimensions
  useEffect(() => {
    setIsLoaded(false);
    if (!media) return;

    if (media.type === 'image') {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        if (!canvasRef.current || !engineRef.current) return;

        // Set canvas internal resolution to match natural media aspect ratio
        const maxDimension = 1920;
        let w = img.naturalWidth || 1200;
        let h = img.naturalHeight || 1200;

        if (w > maxDimension || h > maxDimension) {
          if (w > h) {
            h = Math.round((h * maxDimension) / w);
            w = maxDimension;
          } else {
            w = Math.round((w * maxDimension) / h);
            h = maxDimension;
          }
        }

        canvasRef.current.width = w;
        canvasRef.current.height = h;

        engineRef.current.setSource(img);
        engineRef.current.uploadTexture();
        engineRef.current.render(adjustments, compareMode, splitPos);
        setIsLoaded(true);

        if (onMediaLoaded) onMediaLoaded(w, h);
      };
      img.src = media.url;
      if (imgRef.current) imgRef.current.src = media.url;

    } else if (media.type === 'video') {
      const video = videoRef.current;
      if (!video) return;

      video.src = media.url;
      video.load();

      const onLoadedMetadata = () => {
        if (!canvasRef.current || !engineRef.current) return;
        const w = video.videoWidth || 1280;
        const h = video.videoHeight || 720;

        canvasRef.current.width = w;
        canvasRef.current.height = h;
        setDuration(video.duration || 0);

        engineRef.current.setSource(video);
        engineRef.current.uploadTexture();
        engineRef.current.render(adjustments, compareMode, splitPos);
        setIsLoaded(true);

        if (onMediaLoaded) onMediaLoaded(w, h);
      };

      video.addEventListener('loadedmetadata', onLoadedMetadata);
      return () => {
        video.removeEventListener('loadedmetadata', onLoadedMetadata);
      };
    }
  }, [media?.url, media?.type]);

  // Video Animation Render Loop
  useEffect(() => {
    if (!media || media.type !== 'video') return;
    const video = videoRef.current;
    if (!video) return;

    let animId: number;

    const loop = () => {
      if (engineRef.current && video.readyState >= 2) {
        engineRef.current.uploadTexture();
        engineRef.current.render(adjustments, compareMode, splitPos, video.currentTime);
        setCurrentTime(video.currentTime);
      }
      animId = requestAnimationFrame(loop);
    };

    if (isPlaying) {
      animId = requestAnimationFrame(loop);
    } else {
      // Single frame render
      if (engineRef.current && video.readyState >= 2) {
        engineRef.current.render(adjustments, compareMode, splitPos, video.currentTime);
      }
    }

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isPlaying, adjustments, compareMode, splitPos, media?.type]);

  // Re-render when adjustments or compare mode changes (for static images)
  useEffect(() => {
    if (!media || media.type === 'video' && isPlaying) return;
    if (engineRef.current && isLoaded) {
      engineRef.current.render(adjustments, compareMode, splitPos);
    }
  }, [adjustments, compareMode, splitPos, isLoaded]);

  // Split-Screen Drag Handlers
  const handleSplitDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setIsDraggingSplit(true);
  };

  const handlePointerMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (isDraggingSplit && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const x = (clientX - rect.left) / rect.width;
      const clamped = Math.max(0.01, Math.min(0.99, x));
      setSplitPos(clamped);
    } else if (isPanning) {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const dx = clientX - panStartRef.current.x;
      const dy = clientY - panStartRef.current.y;
      setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      panStartRef.current = { x: clientX, y: clientY };
    }
  }, [isDraggingSplit, isPanning]);

  const handlePointerUp = useCallback(() => {
    setIsDraggingSplit(false);
    setIsPanning(false);
  }, []);

  useEffect(() => {
    if (isDraggingSplit || isPanning) {
      window.addEventListener('mousemove', handlePointerMove);
      window.addEventListener('mouseup', handlePointerUp);
      window.addEventListener('touchmove', handlePointerMove);
      window.addEventListener('touchend', handlePointerUp);
    }
    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [isDraggingSplit, isPanning, handlePointerMove, handlePointerUp]);

  // Pan interaction on canvas container
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && !isDraggingSplit) {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((z) => Math.max(0.5, Math.min(3.0, z + delta)));
  };

  // Video Control Handlers
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
    }
    soundFx.playHapticTick();
  };

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const time = parseFloat(e.target.value);
    video.currentTime = time;
    setCurrentTime(time);
    if (!isPlaying && engineRef.current) {
      engineRef.current.uploadTexture();
      engineRef.current.render(adjustments, compareMode, splitPos, time);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const resetZoomPan = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
    soundFx.playHapticTick();
  };

  // Frame Border Class & Aspect Ratio Styling
  const getAspectRatioStyle = () => {
    const aspect = adjustments.cropAspect;
    if (aspect === '1:1') return 'aspect-square';
    if (aspect === '4:5') return 'aspect-[4/5]';
    if (aspect === '9:16') return 'aspect-[9/16]';
    if (aspect === '16:9') return 'aspect-[16/9]';
    if (aspect === '3:4') return 'aspect-[3/4]';
    if (aspect === '2:3') return 'aspect-[2/3]';
    return '';
  };

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      className="relative w-full h-full flex items-center justify-center bg-[#F0EEE6] overflow-hidden select-none"
    >
      {/* Hidden Video / Image Source Elements */}
      <video
        ref={videoRef}
        crossOrigin="anonymous"
        playsInline
        loop
        muted={isMuted}
        className="hidden"
      />
      <img ref={imgRef} crossOrigin="anonymous" alt="source" className="hidden" />

      {/* Floating Viewport Actions (Zoom / Reset / Grid) */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 bg-white/85 backdrop-blur-md px-3 py-1.5 rounded-full border border-[#E6E2D3] text-xs text-[#2A2723] shadow-sm">
        <button
          onClick={() => setZoom((z) => Math.min(3.0, z + 0.2))}
          className="p-1 hover:text-black transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <span className="text-[11px] font-mono font-medium px-1 text-[#2A2723]">{Math.round(zoom * 100)}%</span>
        <button
          onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))}
          className="p-1 hover:text-black transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        {(zoom !== 1.0 || pan.x !== 0 || pan.y !== 0) && (
          <button
            onClick={resetZoomPan}
            className="p-1 text-[#7E7365] hover:text-black transition-colors ml-1"
            title="Reset View"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Main Canvas Frame Container */}
      <div
        onMouseDown={handleCanvasMouseDown}
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${adjustments.rotation}deg)`,
          transition: isPanning ? 'none' : 'transform 0.15s ease-out',
        }}
        className={`relative max-w-[92%] max-h-[86%] flex items-center justify-center shadow-xl transition-all ${getAspectRatioStyle()} ${
          adjustments.frameType === 'film-35mm'
            ? 'p-6 bg-black rounded-sm ring-1 ring-black/20'
            : adjustments.frameType === 'polaroid'
            ? 'p-4 pb-14 bg-[#FAF7F2] rounded shadow-xl'
            : adjustments.frameType === 'gallery-white'
            ? 'p-6 bg-white shadow-xl'
            : adjustments.frameType === 'gallery-cream'
            ? 'p-6 bg-[#FAF9F6] shadow-xl border border-[#E6E2D3]'
            : adjustments.frameType === 'slide-120'
            ? 'p-8 bg-[#181818] ring-1 ring-[#333]'
            : adjustments.frameType === 'retro-tv'
            ? 'p-5 bg-[#202020] rounded-3xl'
            : ''
        }`}
      >
        {/* WebGL Canvas */}
        <canvas
          ref={canvasRef}
          className={`max-w-full max-h-[72vh] object-contain shadow-md ${
            adjustments.frameType === 'retro-tv' ? 'rounded-2xl' : ''
          }`}
        />

        {/* 35mm Film Frame Sprockets Decorative Overlay */}
        {adjustments.frameType === 'film-35mm' && (
          <>
            <div className="absolute top-1 left-4 right-4 flex justify-between text-[9px] font-mono text-[#D4A373]/90 tracking-widest pointer-events-none">
              <span>★ LRSTUDIO FILM 400</span>
              <span>24A</span>
              <span>KODAK SAFETY</span>
            </div>
            <div className="absolute bottom-1 left-4 right-4 flex justify-between text-[9px] font-mono text-[#D4A373]/90 tracking-widest pointer-events-none">
              <span>EXP • 400 ISO</span>
              <span>25</span>
              <span>MADE IN USA</span>
            </div>
          </>
        )}

        {/* Polaroid Decorative bottom text */}
        {adjustments.frameType === 'polaroid' && (
          <div className="absolute bottom-3 left-6 font-serif-editorial italic text-base text-[#4A453E] opacity-80 tracking-wider pointer-events-none">
            LRStudio Memories • 1984
          </div>
        )}

        {/* Grid Guide Overlay (Rule of thirds) */}
        {showGrid && (
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none border border-black/15">
            <div className="border-r border-b border-black/15" />
            <div className="border-r border-b border-black/15" />
            <div className="border-b border-black/15" />
            <div className="border-r border-b border-black/15" />
            <div className="border-r border-b border-black/15" />
            <div className="border-b border-black/15" />
            <div className="border-r border-white/20" />
            <div className="border-r border-white/20" />
            <div />
          </div>
        )}

        {/* Split-Screen Compare Draggable Divider */}
        {compareMode === 'split' && (
          <div
            onMouseDown={handleSplitDragStart}
            onTouchStart={handleSplitDragStart}
            style={{ left: `${splitPos * 100}%` }}
            className="absolute top-0 bottom-0 w-8 -ml-4 flex items-center justify-center cursor-ew-resize z-20 group select-none"
          >
            {/* White Divider Line */}
            <div className="w-[2px] h-full bg-white shadow-[0_0_8px_rgba(0,0,0,0.6)]" />

            {/* Split Handle Pill */}
            <div className="absolute w-8 h-8 rounded-full bg-white text-[#2A2723] shadow-lg flex items-center justify-center border border-[#E6E2D3] transform active:scale-110 transition-transform">
              <span className="text-[10px] font-black tracking-tighter">◀▶</span>
            </div>

            {/* Left & Right Indicator Tags */}
            <div className="absolute left-[-60px] top-4 bg-white/90 text-[#2A2723] text-[10px] uppercase font-bold px-2 py-0.5 rounded shadow-sm border border-[#E6E2D3] backdrop-blur-sm pointer-events-none">
              Original
            </div>
            <div className="absolute right-[-60px] top-4 bg-[#2A2723] text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded shadow-sm backdrop-blur-sm pointer-events-none">
              LRStudio
            </div>
          </div>
        )}
      </div>

      {/* Video Bottom Playback Controller */}
      {media?.type === 'video' && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[90%] max-w-xl bg-white/90 backdrop-blur-md px-4 py-2.5 rounded-full border border-[#E6E2D3] shadow-xl flex items-center gap-3 z-30">
          {/* Play / Pause */}
          <button
            onClick={togglePlay}
            className="w-8 h-8 rounded-full bg-[#2A2723] text-white flex items-center justify-center hover:bg-black active:scale-95 transition-all shadow-xs"
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
          </button>

          {/* Timestamp */}
          <span className="text-xs font-mono text-[#2A2723] font-medium min-w-[70px]">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          {/* Timeline Scrub Slider */}
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.05}
            value={currentTime}
            onChange={handleScrub}
            className="flex-1 accent-[#2A2723]"
          />

          {/* Mute Button */}
          <button
            onClick={toggleMute}
            className="p-1.5 rounded-full text-[#7E7365] hover:text-[#2A2723] hover:bg-[#FAF9F6] transition-colors"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      )}

      {/* Hold to Compare Floating Notice */}
      {compareMode === 'hold' && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-[#2A2723]/90 backdrop-blur-md px-4 py-1.5 rounded-full border border-black/20 text-white text-xs font-medium tracking-wide shadow-xl z-30 animate-pulse">
          Showing Original (Release to apply)
        </div>
      )}
    </div>
  );
};

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}
