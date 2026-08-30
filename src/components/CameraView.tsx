import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  X, Camera, SwitchCamera, Timer, Grid3X3,
  FlipHorizontal, RefreshCw, AlertCircle
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
  const streamRef = useRef<MediaStream | null>(null);

  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isMirrored, setIsMirrored] = useState(true);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceIndex, setDeviceIndex] = useState<number>(0);

  const [activePreset, setActivePreset] = useState<Preset>(
    presets.find((p) => p.id === 'inso') || presets[0]
  );
  const activePresetRef = useRef<Preset>(activePreset);

  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showGrid, setShowGrid] = useState(false);
  const [isFlashActive, setIsFlashActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isStartingCamera, setIsStartingCamera] = useState(false);

  // Keep active preset ref in sync for WebGL render loop without rebuilding engine
  useEffect(() => {
    activePresetRef.current = activePreset;
  }, [activePreset]);

  // Enumerate cameras
  const refreshDevices = useCallback(async () => {
    try {
      if (navigator.mediaDevices?.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const inputs = devices.filter((d) => d.kind === 'videoinput');
        setVideoDevices(inputs);
      }
    } catch {
      // ignore
    }
  }, []);

  // Stop current camera stream
  const stopCurrentStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Start Camera with robust fallback strategy for mobile & desktop
  const startCamera = useCallback(async (targetFacing: 'user' | 'environment', targetDeviceId?: string) => {
    if (!isOpen) return;

    setIsStartingCamera(true);
    setCameraError(null);
    stopCurrentStream();

    let stream: MediaStream | null = null;

    // Strategy 1: specific deviceId if provided and available
    if (targetDeviceId) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: { exact: targetDeviceId },
            width: { ideal: 1920, min: 640 },
            height: { ideal: 1080, min: 480 },
          },
          audio: false,
        });
      } catch (err) {
        console.warn('Device ID constraint failed, falling back...', err);
      }
    }

    // Strategy 2: exact facingMode (standard for mobile front/rear)
    if (!stream) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { exact: targetFacing },
            width: { ideal: 1920, min: 640 },
            height: { ideal: 1080, min: 480 },
          },
          audio: false,
        });
      } catch (err) {
        console.warn('Exact facingMode failed, trying ideal facingMode...', err);
      }
    }

    // Strategy 3: ideal facingMode
    if (!stream) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: targetFacing },
            width: { ideal: 1920, min: 640 },
            height: { ideal: 1080, min: 480 },
          },
          audio: false,
        });
      } catch (err) {
        console.warn('Ideal facingMode failed, trying basic facingMode...', err);
      }
    }

    // Strategy 4: simple string facingMode
    if (!stream) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: targetFacing },
          audio: false,
        });
      } catch (err) {
        console.warn('Simple facingMode failed, trying standard video...', err);
      }
    }

    // Strategy 5: absolute fallback to any video input
    if (!stream) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      } catch (err) {
        console.error('All camera initialization strategies failed:', err);
        setCameraError('Unable to access camera. Please check browser camera permissions.');
        setIsStartingCamera(false);
        return;
      }
    }

    streamRef.current = stream;

    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      try {
        await videoRef.current.play();
      } catch {
        // Autoplay may need user gesture or is already playing
      }
    }

    setIsStartingCamera(false);
    await refreshDevices();
  }, [isOpen, stopCurrentStream, refreshDevices]);

  // Initialize or restart camera when open or facingMode changes
  useEffect(() => {
    if (!isOpen) {
      stopCurrentStream();
      return;
    }

    const currentDeviceId = videoDevices.length > 1 && videoDevices[deviceIndex]
      ? videoDevices[deviceIndex].deviceId
      : undefined;

    startCamera(facingMode, currentDeviceId);

    return () => {
      stopCurrentStream();
    };
  }, [isOpen, facingMode, deviceIndex, startCamera, stopCurrentStream]);

  // Initialize WebGL Filter Engine ONCE per open session
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const engine = new WebGLFilterEngine(canvas);
    engineRef.current = engine;

    let animId: number;

    const renderLoop = () => {
      const video = videoRef.current;
      if (video && video.readyState >= 2 && canvas && engine) {
        const vw = video.videoWidth || 1280;
        const vh = video.videoHeight || 720;

        if (canvas.width !== vw || canvas.height !== vh) {
          canvas.width = vw;
          canvas.height = vh;
        }

        if (engine.getSource() !== video) {
          engine.setSource(video);
        }

        // Upload new video frame texture
        engine.uploadTexture();

        // Render with active preset adjustments in real time
        const currentAdj = activePresetRef.current.adjustments;
        engine.render(currentAdj, 'none', 0.5);
      }
      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);

    return () => {
      cancelAnimationFrame(animId);
      engine.destroy();
      engineRef.current = null;
    };
  }, [isOpen]);

  // Shutter action with timer
  const handleShutterClick = () => {
    if (countdown !== null || isStartingCamera) return;

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

    setIsFlashActive(true);
    soundFx.playShutter();

    setTimeout(() => {
      setIsFlashActive(false);

      let dataUrl: string;
      if (isMirrored) {
        const offscreen = document.createElement('canvas');
        offscreen.width = canvas.width;
        offscreen.height = canvas.height;
        const ctx = offscreen.getContext('2d');
        if (ctx) {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(canvas, 0, 0);
          dataUrl = offscreen.toDataURL('image/jpeg', 0.95);
        } else {
          dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        }
      } else {
        dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      }

      onCapture(dataUrl);
      onClose();
    }, 150);
  };

  // Toggle/Reverse camera direction (Front <-> Rear)
  const handleToggleFacing = () => {
    soundFx.playHapticTick();
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    // Automatically toggle mirror on for front selfie, off for rear back
    setIsMirrored(nextMode === 'user');

    if (videoDevices.length > 1) {
      setDeviceIndex((prev) => (prev + 1) % videoDevices.length);
    }
  };

  // Toggle Mirror / Flip
  const handleToggleMirror = () => {
    soundFx.playHapticTick();
    setIsMirrored((prev) => !prev);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-between select-none">
      {/* Hidden Video element holding camera MediaStream */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="hidden"
      />

      {/* Shutter White Flash overlay */}
      {isFlashActive && (
        <div className="absolute inset-0 bg-white z-50 animate-out fade-out duration-150 pointer-events-none" />
      )}

      {/* Camera Top Controls Bar */}
      <div className="w-full px-4 py-3 flex items-center justify-between z-30 bg-gradient-to-b from-black/80 to-transparent">
        <button
          onClick={() => {
            onClose();
            soundFx.playHapticTick();
          }}
          className="p-2 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-colors"
          title="Close Camera"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Camera Controls Group */}
        <div className="flex items-center gap-2">
          {/* Switch / Reverse Camera Direction Button */}
          <button
            onClick={handleToggleFacing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/20 hover:bg-white/30 text-white backdrop-blur-md transition-all border border-white/20 active:scale-95 shadow-sm"
            title="Reverse Camera Direction (Front / Rear)"
          >
            <SwitchCamera className="w-3.5 h-3.5" />
            <span>{facingMode === 'user' ? 'Front (Selfie)' : 'Rear (Back)'}</span>
          </button>

          {/* Mirror / Flip Toggle */}
          <button
            onClick={handleToggleMirror}
            className={`p-2 rounded-full backdrop-blur-md transition-colors ${
              isMirrored ? 'bg-white text-black font-semibold' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
            title={isMirrored ? 'Mirror View: On' : 'Mirror View: Off'}
          >
            <FlipHorizontal className="w-4 h-4" />
          </button>

          {/* Timer Toggle */}
          <button
            onClick={() => {
              setTimerSeconds((t) => (t === 0 ? 3 : t === 3 ? 10 : 0));
              soundFx.playHapticTick();
            }}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-md transition-colors ${
              timerSeconds > 0 ? 'bg-white text-black font-semibold' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
            title="Timer"
          >
            <Timer className="w-3.5 h-3.5" />
            <span>{timerSeconds === 0 ? 'Off' : `${timerSeconds}s`}</span>
          </button>

          {/* Grid Toggle */}
          <button
            onClick={() => {
              setShowGrid(!showGrid);
              soundFx.playHapticTick();
            }}
            className={`p-2 rounded-full backdrop-blur-md transition-colors ${
              showGrid ? 'bg-white text-black font-semibold' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
            title="Composition Grid"
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Reverse Camera Icon Button */}
        <button
          onClick={handleToggleFacing}
          className="p-2 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-colors active:rotate-180 duration-300"
          title="Reverse Camera Direction"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Main Viewfinder Canvas Area */}
      <div className="relative flex-1 w-full flex items-center justify-center overflow-hidden bg-black">
        {cameraError ? (
          <div className="p-6 text-center text-[#EFE8DE] max-w-sm flex flex-col items-center gap-3">
            <AlertCircle className="w-12 h-12 text-amber-400 stroke-[1.5]" />
            <p className="text-sm font-medium">{cameraError}</p>
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={() => startCamera(facingMode)}
                className="px-4 py-2 rounded-full bg-white text-black font-medium text-xs hover:bg-neutral-200 transition-colors"
              >
                Retry Camera
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-full bg-white/20 text-white font-medium text-xs hover:bg-white/30 transition-colors"
              >
                Back to Editor
              </button>
            </div>
          </div>
        ) : (
          <>
            <canvas
              ref={canvasRef}
              style={{
                transform: isMirrored ? 'scaleX(-1)' : 'none',
              }}
              className="max-w-full max-h-full object-contain transition-transform duration-200"
            />

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
                <div className="border-r border-b border-white/20" />
                <div className="border-r border-b border-white/20" />
                <div />
              </div>
            )}
          </>
        )}
      </div>

      {/* Camera Bottom Controls: Live Filter Selector & Shutter Button */}
      <div className="w-full pb-8 pt-4 px-4 bg-gradient-to-t from-black via-black/90 to-transparent flex flex-col items-center gap-4 z-30">
        {/* Live Filter Preset Carousel */}
        <div className="flex items-center gap-2 overflow-x-auto w-full max-w-lg no-scrollbar justify-start sm:justify-center px-2">
          {presets.map((p) => {
            const isSelected = activePreset.id === p.id;
            return (
              <button
                key={p.id}
                onClick={() => {
                  setActivePreset(p);
                  soundFx.playHapticTick();
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-white text-black shadow-lg scale-105 ring-2 ring-white/60'
                    : 'bg-white/10 text-neutral-300 hover:text-white border border-white/10 hover:bg-white/20'
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
            disabled={isStartingCamera || !!cameraError}
            className="w-18 h-18 rounded-full border-4 border-white flex items-center justify-center p-1 hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] disabled:opacity-50 cursor-pointer"
            title="Take Photo"
          >
            <div className="w-full h-full rounded-full bg-white hover:bg-neutral-200 transition-colors" />
          </button>
        </div>
      </div>
    </div>
  );
};
