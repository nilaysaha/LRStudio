import React, { useRef, useState, useEffect } from 'react';
import {
  X, Camera, SwitchCamera, Sparkles, Timer, Grid3X3,
  Sun, Check, RefreshCw
} from 'lucide-react';
import { Adjustments, Preset } from '../types';
import { WebGLFilterEngine } from '../webgl/webglEngine';
import { soundFx } from '../utils/audio';

interface CameraViewProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (capturedDataUrl: string) => void;
  presets: Preset[];
}

export const CameraView: React.FC<CameraViewProps> = ({
  isOpen,
  onClose,
  onCapture,
  presets,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<WebGLFilterEngine | null>(null);

  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [activePreset, setActivePreset] = useState<Preset>(
    presets.find((p) => p.id === 'inso') || presets[0]
  );
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showGrid, setShowGrid] = useState(false);
  const [isFlashActive, setIsFlashActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Initialize Camera Stream
  useEffect(() => {
    if (!isOpen) return;

    let stream: MediaStream | null = null;
    setCameraError(null);

    navigator.mediaDevices
      ?.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      })
      .then((s) => {
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play().catch(() => {});
        }
      })
      .catch((err) => {
        console.warn('Camera access denied or unavailable:', err);
        setCameraError(
          'Camera access could not be initialized. Please verify browser camera permissions.'
        );
      });

    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [isOpen, facingMode]);

  // Initialize WebGL Filter Engine for Viewfinder
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;

    const engine = new WebGLFilterEngine(canvasRef.current);
    engineRef.current = engine;

    let animId: number;

    const renderLoop = () => {
      const video = videoRef.current;
      if (video && video.readyState >= 2 && canvasRef.current) {
        if (canvasRef.current.width !== video.videoWidth) {
          canvasRef.current.width = video.videoWidth || 1280;
          canvasRef.current.height = video.videoHeight || 720;
          engine.setSource(video);
        }

        engine.uploadTexture();
        engine.render(activePreset.adjustments, 'none', 0.5);
      }
      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);

    return () => {
      cancelAnimationFrame(animId);
      engine.destroy();
      engineRef.current = null;
    };
  }, [isOpen, activePreset]);

  const handleShutterClick = () => {
    if (countdown !== null) return;

    if (timerSeconds > 0) {
      setCountdown(timerSeconds);
      let rem = timerSeconds;
      const interval = setInterval(() => {
        rem -= 1;
        soundFx.playHapticTick();
        if (rem <= 0) {
          clearInterval(interval);
          setCountdown(null);
          executeCapture();
        } else {
          setCountdown(rem);
        }
      }, 1000);
    } else {
      executeCapture();
    }
  };

  const executeCapture = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Flash visual animation
    setIsFlashActive(true);
    soundFx.playShutter();

    setTimeout(() => {
      setIsFlashActive(false);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      onCapture(dataUrl);
      onClose();
    }, 150);
  };

  const toggleCameraFacing = () => {
    soundFx.playHapticTick();
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-between select-none">
      {/* Hidden Video for Camera Stream */}
      <video ref={videoRef} playsInline muted className="hidden" />

      {/* Shutter White Flash overlay */}
      {isFlashActive && (
        <div className="absolute inset-0 bg-white z-50 animate-out fade-out duration-150 pointer-events-none" />
      )}

      {/* Camera Top Controls */}
      <div className="w-full px-4 py-3 flex items-center justify-between z-30 bg-gradient-to-b from-black/80 to-transparent">
        <button
          onClick={() => { onClose(); soundFx.playHapticTick(); }}
          className="p-2 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          {/* Timer Toggle */}
          <button
            onClick={() => {
              setTimerSeconds((t) => (t === 0 ? 3 : t === 3 ? 10 : 0));
              soundFx.playHapticTick();
            }}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-md transition-colors ${
              timerSeconds > 0 ? 'bg-white text-black font-semibold' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <Timer className="w-3.5 h-3.5" />
            <span>{timerSeconds === 0 ? 'Off' : `${timerSeconds}s`}</span>
          </button>

          {/* Grid Toggle */}
          <button
            onClick={() => { setShowGrid(!showGrid); soundFx.playHapticTick(); }}
            className={`p-2 rounded-full backdrop-blur-md transition-colors ${
              showGrid ? 'bg-white text-black font-semibold' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
        </div>

        {/* Switch Front/Back Camera */}
        <button
          onClick={toggleCameraFacing}
          className="p-2 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-colors"
        >
          <SwitchCamera className="w-5 h-5" />
        </button>
      </div>

      {/* Main Viewfinder Canvas */}
      <div className="relative flex-1 w-full flex items-center justify-center overflow-hidden">
        {cameraError ? (
          <div className="p-6 text-center text-[#EFE8DE] max-w-sm flex flex-col items-center gap-3">
            <Camera className="w-12 h-12 text-white stroke-[1.5]" />
            <p className="text-sm font-medium">{cameraError}</p>
            <p className="text-xs text-neutral-400">
              You can also upload any image or video directly from your library.
            </p>
            <button
              onClick={onClose}
              className="mt-2 px-5 py-2 rounded-full bg-white text-black font-medium text-xs hover:bg-neutral-200 transition-colors"
            >
              Back to Editor
            </button>
          </div>
        ) : (
          <>
            <canvas ref={canvasRef} className="max-w-full max-h-full object-cover" />

            {/* Countdown Overlay */}
            {countdown !== null && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-30">
                <span className="font-editorial text-8xl font-bold text-white animate-ping">
                  {countdown}
                </span>
              </div>
            )}

            {/* Grid Lines */}
            {showGrid && (
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none border border-white/20">
                <div className="border-r border-b border-white/20" />
                <div className="border-r border-b border-white/20" />
                <div className="border-b border-white/20" />
                <div className="border-r border-b border-white/20" />
                <div className="border-r border-b border-white/20" />
                <div className="border-b border-white/20" />
                <div className="border-r border-white/20" />
                <div className="border-r border-white/20" />
                <div />
              </div>
            )}
          </>
        )}
      </div>

      {/* Camera Bottom Controls: Live Filter Selector & Shutter Button */}
      <div className="w-full pb-8 pt-4 px-4 bg-gradient-to-t from-black via-black/90 to-transparent flex flex-col items-center gap-4 z-30">
        {/* Live Filter Preset Carousel */}
        <div className="flex items-center gap-2 overflow-x-auto w-full max-w-md no-scrollbar justify-center">
          {presets.slice(0, 8).map((p) => {
            const isSelected = activePreset.id === p.id;
            return (
              <button
                key={p.id}
                onClick={() => {
                  setActivePreset(p);
                  soundFx.playHapticTick();
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-white text-black shadow-lg scale-105'
                    : 'bg-white/10 text-neutral-300 hover:text-white border border-white/10'
                }`}
              >
                {p.name}
              </button>
            );
          })}
        </div>

        {/* Shutter Button */}
        <div className="flex items-center justify-center w-full">
          <button
            onClick={handleShutterClick}
            className="w-18 h-18 rounded-full border-4 border-white flex items-center justify-center p-1 hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]"
          >
            <div className="w-full h-full rounded-full bg-white hover:bg-neutral-200 transition-colors" />
          </button>
        </div>
      </div>
    </div>
  );
};
