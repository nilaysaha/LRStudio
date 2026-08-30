import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  X, Camera, Video, SwitchCamera, Timer, Grid3X3,
  FlipHorizontal, RefreshCw, AlertCircle, Sparkles,
  SlidersHorizontal, ChevronUp, ChevronDown, Search, Check,
  Calendar, Clock, Square, Pause, Play, Disc
} from 'lucide-react';
import { Adjustments, CameraType, DateStampSettings, Preset } from '../types';
import { WebGLFilterEngine } from '../webgl/webglEngine';
import { soundFx } from '../utils/audio';
import { CAMERA_PROFILES, CAMERA_PROFILES_MAP } from '../constants/cameraProfiles';
import { CameraVisualOverlay } from './CameraVisualOverlay';
import { renderCameraOverlayOnCanvas, renderDateStampOnCanvas } from '../utils/cameraOverlayRenderer';
import { defaultDateStamp } from '../constants/defaultAdjustments';

interface CameraViewProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (capturedUrl: string, capturedAdjustments?: Adjustments, mediaType?: 'image' | 'video') => void;
  presets: Preset[];
}

export const CameraView: React.FC<CameraViewProps> = ({
  isOpen,
  onClose,
  onCapture,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<WebGLFilterEngine | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Capture mode: Photo vs Video
  const [captureMode, setCaptureMode] = useState<'photo' | 'video'>('photo');

  // Video recording states
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingPaused, setIsRecordingPaused] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  // Date / Time Stamp superimposition toggle in camera
  const [dateStamp, setDateStamp] = useState<DateStampSettings>({
    ...defaultDateStamp,
    enabled: true, // Default enabled for authentic retro camera vibe
  });

  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isMirrored, setIsMirrored] = useState(true);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceIndex, setDeviceIndex] = useState<number>(0);

  // Active Camera Type (default: 'disposable')
  const [selectedCameraType, setSelectedCameraType] = useState<CameraType>('disposable');
  const selectedCameraRef = useRef<CameraType>(selectedCameraType);

  // Search & Filter Category for Camera Drawer
  const [cameraDrawerOpen, setCameraDrawerOpen] = useState(false);
  const [cameraSearch, setCameraSearch] = useState('');
  const [cameraCategory, setCameraCategory] = useState<'all' | '35mm' | 'y2k' | 'movie' | 'instant' | 'luxe'>('all');

  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showGrid, setShowGrid] = useState(false);
  const [isFlashActive, setIsFlashActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isStartingCamera, setIsStartingCamera] = useState(false);

  // Keep selected camera ref in sync for WebGL render loop
  useEffect(() => {
    selectedCameraRef.current = selectedCameraType;
  }, [selectedCameraType]);

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

  // Start Camera with fallback strategy
  const startCamera = useCallback(async (targetFacing: 'user' | 'environment', targetDeviceId?: string) => {
    if (!isOpen) return;

    setIsStartingCamera(true);
    setCameraError(null);
    stopCurrentStream();

    let stream: MediaStream | null = null;

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
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: targetFacing,
              width: { ideal: 1280, min: 640 },
              height: { ideal: 720, min: 480 },
            },
            audio: false,
          });
        } catch {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });
          } catch (err: any) {
            console.error('All camera initialization attempts failed:', err);
            setCameraError(
              err.name === 'NotAllowedError'
                ? 'Camera access was denied. Please allow camera permissions in your browser.'
                : 'Unable to access camera. Please check your webcam connections.'
            );
            setIsStartingCamera(false);
            return;
          }
        }
      }
    }

    if (stream && videoRef.current) {
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      videoRef.current.onloadedmetadata = () => {
        if (videoRef.current) {
          videoRef.current.play().catch(console.error);
        }
        setIsStartingCamera(false);
        refreshDevices();
      };
    }
  }, [isOpen, stopCurrentStream, refreshDevices]);

  // Handle open/close lifecycle
  useEffect(() => {
    if (isOpen) {
      startCamera(facingMode);
    } else {
      if (isRecording) {
        stopVideoRecording();
      }
      stopCurrentStream();
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
    }
    return () => {
      stopCurrentStream();
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, [isOpen]);

  // Continuous WebGL Viewfinder Animation Loop
  useEffect(() => {
    if (!isOpen) return;

    let animFrame: number;
    let isSubscribed = true;

    const initEngineAndLoop = () => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video) return;

      if (!engineRef.current) {
        try {
          engineRef.current = new WebGLFilterEngine(canvas);
        } catch (err) {
          console.error('Failed to create WebGL engine for camera:', err);
          return;
        }
      }

      const engine = engineRef.current;

      const renderFrame = (timestamp: number) => {
        if (!isSubscribed) return;

        if (video.readyState >= video.HAVE_CURRENT_DATA) {
          const vw = video.videoWidth || 1280;
          const vh = video.videoHeight || 720;

          if (canvas.width !== vw || canvas.height !== vh) {
            canvas.width = vw;
            canvas.height = vh;
          }

          engine.setSource(video);
          engine.uploadTexture();

          // Get active camera profile adjustments
          const currentCam = selectedCameraRef.current;
          const profile = CAMERA_PROFILES_MAP[currentCam];
          const adjustmentsToUse = profile ? profile.adjustments : CAMERA_PROFILES[0].adjustments;

          // Render with timestamp for film grain and effects
          engine.render(adjustmentsToUse, 'none', 0.5, timestamp / 1000);
        }

        animFrame = requestAnimationFrame(renderFrame);
      };

      animFrame = requestAnimationFrame(renderFrame);
    };

    const timer = setTimeout(initEngineAndLoop, 100);

    return () => {
      isSubscribed = false;
      clearTimeout(timer);
      cancelAnimationFrame(animFrame);
    };
  }, [isOpen]);

  // Shutter / Record Click Handler
  const handleShutterClick = () => {
    if (captureMode === 'video') {
      if (isRecording) {
        stopVideoRecording();
      } else {
        startVideoRecording();
      }
      return;
    }

    // Photo Capture Mode
    if (timerSeconds > 0) {
      setCountdown(timerSeconds);
      soundFx.playHapticTick();

      let rem = timerSeconds;
      const interval = setInterval(() => {
        rem -= 1;
        soundFx.playHapticTick();
        if (rem <= 0) {
          clearInterval(interval);
          setCountdown(null);
          executePhotoCapture();
        } else {
          setCountdown(rem);
        }
      }, 1000);
    } else {
      executePhotoCapture();
    }
  };

  // Execute Photo Capture & Burn In Overlays
  const executePhotoCapture = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsFlashActive(true);
    soundFx.playShutter();

    const currentCamType = selectedCameraType;
    const profile = CAMERA_PROFILES_MAP[currentCamType];

    setTimeout(() => {
      setIsFlashActive(false);

      // Create composite canvas to burn in camera features & date stamp
      const compositeCanvas = document.createElement('canvas');
      compositeCanvas.width = canvas.width;
      compositeCanvas.height = canvas.height;
      const ctx = compositeCanvas.getContext('2d');

      if (ctx) {
        if (isMirrored) {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(canvas, 0, 0);
          ctx.setTransform(1, 0, 0, 1, 0, 0); // reset transform
        } else {
          ctx.drawImage(canvas, 0, 0);
        }

        // Burn in authentic on-image features for the camera type
        renderCameraOverlayOnCanvas(ctx, currentCamType, compositeCanvas.width, compositeCanvas.height);

        // Superimpose Date / Time Stamp if enabled
        if (dateStamp.enabled) {
          renderDateStampOnCanvas(ctx, dateStamp, compositeCanvas.width, compositeCanvas.height);
        }

        const dataUrl = compositeCanvas.toDataURL('image/jpeg', 0.95);
        const finalAdj: Adjustments = profile
          ? { ...profile.adjustments, dateStamp: { ...dateStamp } }
          : { ...CAMERA_PROFILES[0].adjustments, dateStamp: { ...dateStamp } };
        onCapture(dataUrl, finalAdj, 'image');
      } else {
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        onCapture(dataUrl, profile ? profile.adjustments : undefined, 'image');
      }

      onClose();
    }, 150);
  };

  // Start Video Recording with Canvas Stream & Microphone Audio
  const startVideoRecording = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    soundFx.playHapticTick();
    recordedChunksRef.current = [];

    try {
      // 1. Get 30fps canvas stream with WebGL film filters
      const canvasStream = (canvas as any).captureStream ? (canvas as any).captureStream(30) : null;
      if (!canvasStream) {
        throw new Error('Canvas captureStream is not supported in this browser.');
      }

      // 2. Try to capture microphone audio
      let audioStream: MediaStream | null = null;
      try {
        audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err) {
        console.warn('Microphone access unavailable or denied, recording video without sound:', err);
      }

      // 3. Combine audio and video tracks into one stream
      const tracks = [...canvasStream.getVideoTracks()];
      if (audioStream) {
        tracks.push(...audioStream.getAudioTracks());
      }
      const combinedStream = new MediaStream(tracks);

      // 4. Select supported MIME type
      const mimeTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4',
      ];
      let selectedMimeType = '';
      for (const mime of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mime)) {
          selectedMimeType = mime;
          break;
        }
      }

      const recorder = selectedMimeType
        ? new MediaRecorder(combinedStream, { mimeType: selectedMimeType })
        : new MediaRecorder(combinedStream);

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }

        const blob = new Blob(recordedChunksRef.current, {
          type: selectedMimeType || 'video/webm',
        });
        const videoUrl = URL.createObjectURL(blob);

        soundFx.playShutter();

        const currentCamType = selectedCameraType;
        const profile = CAMERA_PROFILES_MAP[currentCamType];
        const finalAdj: Adjustments = profile
          ? { ...profile.adjustments, dateStamp: { ...dateStamp } }
          : { ...CAMERA_PROFILES[0].adjustments, dateStamp: { ...dateStamp } };

        onCapture(videoUrl, finalAdj, 'video');
        onClose();
      };

      recorder.start(200); // 200ms chunk slice
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setIsRecordingPaused(false);
      setRecordingDuration(0);

      // Start duration counter
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);

    } catch (err: any) {
      console.error('Failed to start video recording:', err);
      setCameraError(`Video recording failed: ${err.message || 'MediaRecorder error'}`);
    }
  };

  // Stop Video Recording
  const stopVideoRecording = () => {
    soundFx.playHapticTick();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setIsRecordingPaused(false);
  };

  // Pause / Resume Video Recording
  const togglePauseVideoRecording = () => {
    if (!mediaRecorderRef.current) return;
    soundFx.playHapticTick();

    if (mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsRecordingPaused(true);
    } else if (mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsRecordingPaused(false);
    }
  };

  // Camera switch & adjustments
  const handleToggleFacing = () => {
    soundFx.playHapticTick();
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    setIsMirrored(nextMode === 'user');

    if (videoDevices.length > 1) {
      setDeviceIndex((prev) => (prev + 1) % videoDevices.length);
    }
  };

  const handleToggleMirror = () => {
    soundFx.playHapticTick();
    setIsMirrored((prev) => !prev);
  };

  const handleSelectCamera = (camType: CameraType) => {
    setSelectedCameraType(camType);
    soundFx.playHapticTick();
  };

  // Filtered cameras for drawer
  const filteredCameras = CAMERA_PROFILES.filter((cam) => {
    const matchesSearch =
      cam.name.toLowerCase().includes(cameraSearch.toLowerCase()) ||
      cam.subtitle.toLowerCase().includes(cameraSearch.toLowerCase()) ||
      cam.tagline.toLowerCase().includes(cameraSearch.toLowerCase());

    if (!matchesSearch) return false;

    if (cameraCategory === '35mm') {
      return ['disposable', 'fling35', 'kodak-gold', 'klasse', 'paradiso', 'calagold', 'solare17', 'fuji400', 'velvia', 'ilford', 'tzachrome'].includes(cam.id);
    }
    if (cameraCategory === 'y2k') {
      return ['sunshot07', 'prima', 'camcorder', 'handicam', 'digiscan', 'vhs', 'lofi'].includes(cam.id);
    }
    if (cameraCategory === 'movie') {
      return ['curva', 'cinestil', '8mm', '16mm', 'super8', 'super16'].includes(cam.id);
    }
    if (cameraCategory === 'instant') {
      return ['polaroid', 'photobooth', 'pinky', '5cam', 'lomo'].includes(cam.id);
    }
    if (cameraCategory === 'luxe') {
      return ['novagold', 'moka-v', 'asteria', 'natura', 'aurea', 'velour', 'lunaria', 'lumina', 'ultragold', 'retra'].includes(cam.id);
    }
    return true;
  });

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
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
      <div className="w-full px-4 py-3 flex items-center justify-between z-30 bg-gradient-to-b from-black/90 to-transparent">
        <button
          onClick={() => {
            if (isRecording) stopVideoRecording();
            onClose();
          }}
          className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors cursor-pointer"
          title="Close Camera"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Live Recording HUD Indicator */}
        {isRecording && (
          <div className="flex items-center gap-2 bg-red-600/90 text-white px-3 py-1 rounded-full font-mono text-xs font-bold tracking-wider animate-pulse shadow-lg">
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
            <span>REC {formatDuration(recordingDuration)}</span>
          </div>
        )}

        {/* Top Tools: Date Stamp Toggle, Timer, Grid, Mirror */}
        <div className="flex items-center gap-2">
          {/* Date Stamp Toggle */}
          <button
            onClick={() => {
              soundFx.playHapticTick();
              setDateStamp((prev) => ({ ...prev, enabled: !prev.enabled }));
            }}
            className={`p-2 rounded-full transition-all cursor-pointer flex items-center gap-1 text-xs font-mono font-semibold ${
              dateStamp.enabled
                ? 'bg-amber-500 text-black shadow-md'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
            title="Toggle Date & Time Stamp Superimpose"
          >
            <Calendar className="w-4 h-4" />
            <span className="text-[10px] hidden sm:inline">
              {dateStamp.enabled ? 'DATE ON' : 'DATE OFF'}
            </span>
          </button>

          {/* Self-Timer (Photo mode) */}
          {captureMode === 'photo' && (
            <button
              onClick={() => {
                soundFx.playHapticTick();
                setTimerSeconds((prev) => (prev === 0 ? 3 : prev === 3 ? 10 : 0));
              }}
              className={`p-2 rounded-full transition-colors cursor-pointer text-xs font-semibold ${
                timerSeconds > 0
                  ? 'bg-amber-400 text-black'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
              title="Self Timer"
            >
              {timerSeconds > 0 ? (
                <span className="font-mono">{timerSeconds}s</span>
              ) : (
                <Timer className="w-4 h-4" />
              )}
            </button>
          )}

          {/* Rule of Thirds Grid */}
          <button
            onClick={() => {
              soundFx.playHapticTick();
              setShowGrid((prev) => !prev);
            }}
            className={`p-2 rounded-full transition-colors cursor-pointer ${
              showGrid
                ? 'bg-white text-black'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
            title="Toggle Grid"
          >
            <Grid3X3 className="w-4 h-4" />
          </button>

          {/* Flip / Mirror Viewfinder */}
          <button
            onClick={handleToggleMirror}
            className={`p-2 rounded-full transition-colors cursor-pointer ${
              isMirrored
                ? 'bg-white/30 text-white'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
            title="Mirror Viewfinder"
          >
            <FlipHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Viewfinder Canvas with Authentic Live Camera Features */}
      <div className="relative flex-1 w-full max-w-4xl flex items-center justify-center overflow-hidden my-2 px-2">
        {/* Countdown overlay */}
        {countdown !== null && (
          <div className="absolute inset-0 flex items-center justify-center z-40 bg-black/40 backdrop-blur-xs pointer-events-none">
            <span className="text-8xl font-mono font-bold text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.8)] animate-ping">
              {countdown}
            </span>
          </div>
        )}

        {/* Live Filtered WebGL Canvas */}
        <canvas
          ref={canvasRef}
          className={`max-w-full max-h-full object-contain rounded-2xl shadow-2xl transition-transform duration-300 ${
            isMirrored ? 'scale-x-[-1]' : ''
          }`}
        />

        {/* Authentic On-Screen Feature Overlay & Superimposed Date Stamp */}
        <CameraVisualOverlay
          cameraType={selectedCameraType}
          dateStamp={dateStamp}
          isLive={true}
        />

        {/* Rule of Thirds Grid Lines */}
        {showGrid && (
          <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 z-20">
            <div className="border-r border-b border-white/25" />
            <div className="border-r border-b border-white/25" />
            <div className="border-b border-white/25" />
            <div className="border-r border-b border-white/25" />
            <div className="border-r border-b border-white/25" />
            <div className="border-b border-white/25" />
            <div className="border-r border-white/25" />
            <div className="border-r border-white/25" />
            <div className="" />
          </div>
        )}

        {/* Camera Starting Spinner or Error Alert */}
        {isStartingCamera && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-30 gap-3 text-white">
            <RefreshCw className="w-8 h-8 animate-spin text-amber-400" />
            <p className="text-sm font-medium">Initializing camera sensor...</p>
          </div>
        )}

        {cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-30 p-6 text-center text-white gap-3">
            <AlertCircle className="w-10 h-10 text-red-500" />
            <h3 className="text-lg font-semibold">Camera Access Required</h3>
            <p className="text-sm text-neutral-300 max-w-md">{cameraError}</p>
            <button
              onClick={() => startCamera(facingMode)}
              className="mt-2 px-4 py-2 bg-amber-500 text-black font-semibold rounded-full hover:bg-amber-400 transition-colors"
            >
              Retry Camera
            </button>
          </div>
        )}
      </div>

      {/* Camera Model Drawer (Expanded Selection) */}
      {cameraDrawerOpen && (
        <div className="w-full max-w-3xl bg-neutral-900/95 border-t border-white/15 rounded-t-3xl p-4 z-40 flex flex-col gap-3 shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Select Camera (39 Types)
              </h3>
            </div>
            <button
              onClick={() => setCameraDrawerOpen(false)}
              className="text-xs text-neutral-400 hover:text-white"
            >
              Close
            </button>
          </div>

          {/* Search & Categories */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Search camera type..."
                value={cameraSearch}
                onChange={(e) => setCameraSearch(e.target.value)}
                className="w-full bg-black/40 border border-white/15 rounded-full pl-8 pr-3 py-1 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400"
              />
            </div>
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
              {[
                { id: 'all', label: 'All (39)' },
                { id: '35mm', label: '35mm Film' },
                { id: 'y2k', label: 'Y2K Digicam' },
                { id: 'movie', label: 'Cinema / 8mm' },
                { id: 'instant', label: 'Instant' },
                { id: 'luxe', label: 'Luxe / Gold' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCameraCategory(cat.id as any)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors ${
                    cameraCategory === cat.id
                      ? 'bg-amber-400 text-black font-semibold'
                      : 'bg-white/10 text-neutral-300 hover:bg-white/20'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Camera Grid list */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 overflow-y-auto max-h-[32vh] pr-1">
            {filteredCameras.map((cam) => {
              const isSelected = selectedCameraType === cam.id;
              return (
                <button
                  key={cam.id}
                  onClick={() => {
                    handleSelectCamera(cam.id);
                    setCameraDrawerOpen(false);
                  }}
                  className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/20 border-amber-400 text-white shadow-lg ring-1 ring-amber-400/50'
                      : 'bg-black/40 border-white/10 text-neutral-300 hover:border-white/30 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="font-semibold text-xs text-white capitalize">{cam.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
                  </div>
                  <p className="text-[10px] text-neutral-400 line-clamp-1 mb-1.5">{cam.subtitle}</p>
                  <div className="flex flex-wrap gap-1">
                    {cam.featuresDescription.slice(0, 2).map((feat, i) => (
                      <span
                        key={i}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-neutral-300 font-mono"
                      >
                        {feat}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Camera Bottom Controls: Mode Selector, Carousel & Shutter Button */}
      <div className="w-full pb-8 pt-2 px-4 bg-gradient-to-t from-black via-black/90 to-transparent flex flex-col items-center gap-3 z-30">
        {/* Photo vs Video Mode Switcher */}
        <div className="flex items-center bg-black/60 border border-white/15 p-1 rounded-full gap-1 shadow-inner">
          <button
            onClick={() => {
              if (isRecording) return;
              soundFx.playHapticTick();
              setCaptureMode('photo');
            }}
            disabled={isRecording}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold tracking-wider transition-all cursor-pointer ${
              captureMode === 'photo'
                ? 'bg-white text-black shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>PHOTO</span>
          </button>

          <button
            onClick={() => {
              soundFx.playHapticTick();
              setCaptureMode('video');
            }}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold tracking-wider transition-all cursor-pointer ${
              captureMode === 'video'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>VIDEO</span>
          </button>
        </div>

        {/* Quick Camera Carousel */}
        {!isRecording && (
          <div className="flex items-center gap-2 overflow-x-auto w-full max-w-xl no-scrollbar justify-start sm:justify-center px-2">
            {CAMERA_PROFILES.map((cam) => {
              const isSelected = selectedCameraType === cam.id;
              return (
                <button
                  key={cam.id}
                  onClick={() => handleSelectCamera(cam.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-amber-400 text-black shadow-lg scale-105 ring-2 ring-amber-400/60 font-bold'
                      : 'bg-white/10 text-neutral-300 hover:text-white border border-white/10 hover:bg-white/20'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full inline-block"
                    style={{ backgroundColor: cam.accentColor }}
                  />
                  <span className="capitalize">{cam.name}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Shutter Button & Camera Drawer Trigger */}
        <div className="flex items-center justify-between w-full max-w-sm px-6">
          {/* Drawer trigger or Pause/Resume video recording */}
          {isRecording ? (
            <button
              onClick={togglePauseVideoRecording}
              className="p-3 rounded-full bg-white/20 text-white hover:bg-white/30 transition-all border border-white/20 active:scale-95 cursor-pointer"
              title={isRecordingPaused ? 'Resume Recording' : 'Pause Recording'}
            >
              {isRecordingPaused ? (
                <Play className="w-5 h-5 text-amber-300" />
              ) : (
                <Pause className="w-5 h-5 text-white" />
              )}
            </button>
          ) : (
            <button
              onClick={() => {
                setCameraDrawerOpen((prev) => !prev);
                soundFx.playHapticTick();
              }}
              className="p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all border border-white/15 active:scale-95 cursor-pointer"
              title="Open All 39 Cameras"
            >
              <SlidersHorizontal className="w-5 h-5 text-amber-300" />
            </button>
          )}

          {/* Primary Action Button (Photo Shutter or Video Record/Stop) */}
          {captureMode === 'photo' ? (
            <button
              onClick={handleShutterClick}
              disabled={isStartingCamera || !!cameraError}
              className="w-18 h-18 rounded-full border-4 border-white flex items-center justify-center p-1 hover:scale-105 active:scale-95 transition-all shadow-[0_0_25px_rgba(255,255,255,0.3)] disabled:opacity-50 cursor-pointer"
              title="Capture Photo"
            >
              <div className="w-full h-full rounded-full bg-white hover:bg-neutral-200 transition-colors" />
            </button>
          ) : (
            <button
              onClick={handleShutterClick}
              disabled={isStartingCamera || !!cameraError}
              className={`w-18 h-18 rounded-full border-4 flex items-center justify-center p-1 hover:scale-105 active:scale-95 transition-all cursor-pointer ${
                isRecording
                  ? 'border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.6)] animate-pulse'
                  : 'border-white shadow-[0_0_25px_rgba(255,255,255,0.3)]'
              }`}
              title={isRecording ? 'Stop Recording' : 'Start Video Recording'}
            >
              {isRecording ? (
                <div className="w-7 h-7 rounded-md bg-red-600 shadow-md" />
              ) : (
                <div className="w-full h-full rounded-full bg-red-600 hover:bg-red-500 transition-colors" />
              )}
            </button>
          )}

          <button
            onClick={handleToggleFacing}
            disabled={isRecording}
            className="p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all border border-white/15 active:scale-95 cursor-pointer disabled:opacity-40"
            title="Switch Camera (Front/Rear)"
          >
            <SwitchCamera className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
