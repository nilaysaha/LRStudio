import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Adjustments, CurvePoint, ToneCurves } from '../../types';
import { RotateCcw, Trash2, Sparkles } from 'lucide-react';
import { soundFx } from '../../utils/audio';
import { evaluateSpline } from '../../utils/curveUtils';

interface CurvesAdjustmentsProps {
  adjustments: Adjustments;
  onChange: (newAdj: Adjustments) => void;
}

type CurveChannel = 'master' | 'red' | 'green' | 'blue';

interface QuickCurvePreset {
  name: string;
  points: CurvePoint[];
}

const QUICK_PRESETS: Record<string, QuickCurvePreset[]> = {
  master: [
    {
      name: 'Linear',
      points: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
    },
    {
      name: 'Film S-Curve',
      points: [{ x: 0, y: 0 }, { x: 0.25, y: 0.18 }, { x: 0.75, y: 0.82 }, { x: 1, y: 1 }],
    },
    {
      name: 'Matte Fade',
      points: [{ x: 0, y: 0.12 }, { x: 0.35, y: 0.3 }, { x: 0.8, y: 0.82 }, { x: 1, y: 0.95 }],
    },
    {
      name: 'High Contrast',
      points: [{ x: 0, y: 0 }, { x: 0.2, y: 0.08 }, { x: 0.8, y: 0.92 }, { x: 1, y: 1 }],
    },
  ],
  red: [
    {
      name: 'Reset',
      points: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
    },
    {
      name: 'Warm Punch',
      points: [{ x: 0, y: 0.04 }, { x: 0.5, y: 0.54 }, { x: 1, y: 1 }],
    },
    {
      name: 'Cool Cyan Shadow',
      points: [{ x: 0, y: 0 }, { x: 0.35, y: 0.28 }, { x: 0.75, y: 0.8 }, { x: 1, y: 1 }],
    },
  ],
  green: [
    {
      name: 'Reset',
      points: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
    },
    {
      name: 'Emerald Fade',
      points: [{ x: 0, y: 0.05 }, { x: 0.5, y: 0.52 }, { x: 1, y: 0.98 }],
    },
    {
      name: 'Magenta Tint',
      points: [{ x: 0, y: 0 }, { x: 0.5, y: 0.46 }, { x: 1, y: 1 }],
    },
  ],
  blue: [
    {
      name: 'Reset',
      points: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
    },
    {
      name: 'Golden Shadows',
      points: [{ x: 0, y: 0 }, { x: 0.4, y: 0.34 }, { x: 0.8, y: 0.85 }, { x: 1, y: 1 }],
    },
    {
      name: 'Teal & Orange',
      points: [{ x: 0, y: 0.08 }, { x: 0.35, y: 0.4 }, { x: 0.7, y: 0.65 }, { x: 1, y: 0.9 }],
    },
  ],
};

export const CurvesAdjustments: React.FC<CurvesAdjustmentsProps> = ({
  adjustments,
  onChange,
}) => {
  const [activeChannel, setActiveChannel] = useState<CurveChannel>('master');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [hoveredPos, setHoveredPos] = useState<{ inVal: number; outVal: number } | null>(null);
  const lastTapRef = useRef<{ time: number; index: number }>({ time: 0, index: -1 });

  const currentPoints = adjustments.curves[activeChannel] || [
    { x: 0, y: 0 },
    { x: 1, y: 1 },
  ];

  // Helper to trigger state change
  const updateChannelPoints = useCallback((newPoints: CurvePoint[]) => {
    // Keep points strictly sorted by x
    const sorted = [...newPoints].sort((a, b) => a.x - b.x);
    onChange({
      ...adjustments,
      curves: {
        ...adjustments.curves,
        [activeChannel]: sorted,
      },
    });
  }, [adjustments, activeChannel, onChange]);

  // Draw Tone Curve Graph onto Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // 1. Subtle Paper Background & Grid Lines
    ctx.fillStyle = '#FAF9F6';
    ctx.fillRect(0, 0, w, h);

    // Draw 4x4 zone grid lines
    ctx.strokeStyle = '#EAE6D9';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      // Horizontal grid
      ctx.beginPath();
      ctx.moveTo(0, (h / 4) * i);
      ctx.lineTo(w, (h / 4) * i);
      ctx.stroke();

      // Vertical grid
      ctx.beginPath();
      ctx.moveTo((w / 4) * i, 0);
      ctx.lineTo((w / 4) * i, h);
      ctx.stroke();
    }

    // Diagonal identity reference dashed line
    ctx.strokeStyle = '#D8D2C2';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(w, 0);
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. Render other channels faintly in background for visual context
    const allChannels: CurveChannel[] = ['master', 'red', 'green', 'blue'];
    allChannels.forEach((ch) => {
      if (ch === activeChannel) return;
      const otherPts = adjustments.curves[ch] || [{ x: 0, y: 0 }, { x: 1, y: 1 }];
      
      let faintColor = 'rgba(160, 150, 135, 0.25)';
      if (ch === 'red') faintColor = 'rgba(239, 68, 68, 0.22)';
      if (ch === 'green') faintColor = 'rgba(34, 197, 94, 0.22)';
      if (ch === 'blue') faintColor = 'rgba(59, 130, 246, 0.22)';

      ctx.strokeStyle = faintColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i <= w; i += 3) {
        const xNorm = i / w;
        const yNorm = evaluateSpline(otherPts, xNorm);
        const cy = h - yNorm * h;
        if (i === 0) ctx.moveTo(i, cy);
        else ctx.lineTo(i, cy);
      }
      ctx.stroke();
    });

    // 3. Render Active Channel Curve
    let strokeColor = '#2A2723';
    let fillColor = 'rgba(42, 39, 35, 0.06)';
    if (activeChannel === 'red') {
      strokeColor = '#EF4444';
      fillColor = 'rgba(239, 68, 68, 0.08)';
    } else if (activeChannel === 'green') {
      strokeColor = '#16A34A';
      fillColor = 'rgba(22, 163, 74, 0.08)';
    } else if (activeChannel === 'blue') {
      strokeColor = '#2563EB';
      fillColor = 'rgba(37, 99, 235, 0.08)';
    }

    // Under-curve gradient fill
    ctx.fillStyle = fillColor;
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let i = 0; i <= w; i += 2) {
      const xNorm = i / w;
      const yNorm = evaluateSpline(currentPoints, xNorm);
      const cy = h - yNorm * h;
      ctx.lineTo(i, cy);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();

    // Solid curve path
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i <= w; i += 2) {
      const xNorm = i / w;
      const yNorm = evaluateSpline(currentPoints, xNorm);
      const cy = h - yNorm * h;
      if (i === 0) ctx.moveTo(i, cy);
      else ctx.lineTo(i, cy);
    }
    ctx.stroke();

    // 4. Render Interactive Control Points
    currentPoints.forEach((pt, idx) => {
      const cx = pt.x * w;
      const cy = h - pt.y * h;

      const isDragging = dragIndex === idx;

      // Outer glow / touch target
      if (isDragging) {
        ctx.fillStyle = fillColor;
        ctx.beginPath();
        ctx.arc(cx, cy, 14, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = strokeColor;
      ctx.beginPath();
      ctx.arc(cx, cy, isDragging ? 7 : 5.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  }, [currentPoints, activeChannel, dragIndex, adjustments.curves]);

  const getCanvasCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { xNorm: 0, yNorm: 0, pxX: 0, pxY: 0 };
    const rect = canvas.getBoundingClientRect();
    const xNorm = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const yNorm = Math.max(0, Math.min(1, 1 - (clientY - rect.top) / rect.height));
    const pxX = (clientX - rect.left) * (canvas.width / rect.width);
    const pxY = (clientY - rect.top) * (canvas.height / rect.height);
    return { xNorm, yNorm, pxX, pxY };
  };

  // Pointer Down (Mouse or Touch)
  const handlePointerDown = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { xNorm, yNorm } = getCanvasCoords(clientX, clientY);

    const w = canvas.width;
    const h = canvas.height;

    // Check if clicked close to an existing control point
    let foundIndex = -1;
    let minDist = 24; // in canvas pixels

    currentPoints.forEach((pt, idx) => {
      const ptPxX = pt.x * w;
      const ptPxY = h - pt.y * h;
      const curPxX = xNorm * w;
      const curPxY = h - yNorm * h;
      const d = Math.hypot(ptPxX - curPxX, ptPxY - curPxY);
      if (d < minDist) {
        minDist = d;
        foundIndex = idx;
      }
    });

    const now = performance.now();

    // Check for double click / double tap to delete point (if not endpoints)
    if (
      foundIndex > 0 &&
      foundIndex < currentPoints.length - 1 &&
      lastTapRef.current.index === foundIndex &&
      now - lastTapRef.current.time < 350
    ) {
      // Remove point
      const filtered = currentPoints.filter((_, i) => i !== foundIndex);
      updateChannelPoints(filtered);
      soundFx.playHapticTick();
      lastTapRef.current = { time: 0, index: -1 };
      setDragIndex(null);
      return;
    }

    lastTapRef.current = { time: now, index: foundIndex };

    if (foundIndex !== -1) {
      setDragIndex(foundIndex);
      setHoveredPos({ inVal: Math.round(currentPoints[foundIndex].x * 100), outVal: Math.round(currentPoints[foundIndex].y * 100) });
      soundFx.playHapticTick();
    } else {
      // Add new point if under limit
      if (currentPoints.length < 8) {
        const newPt = { x: xNorm, y: yNorm };
        const newPoints = [...currentPoints, newPt].sort((a, b) => a.x - b.x);
        updateChannelPoints(newPoints);
        const newIdx = newPoints.findIndex((p) => Math.abs(p.x - xNorm) < 0.001);
        setDragIndex(newIdx);
        setHoveredPos({ inVal: Math.round(xNorm * 100), outVal: Math.round(yNorm * 100) });
        soundFx.playHapticTick();
      }
    }
  };

  // Window-level dragging listener so pointer doesn't get lost outside canvas box
  useEffect(() => {
    if (dragIndex === null) return;

    const handleGlobalMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches?.[0]?.clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches?.[0]?.clientY : (e as MouseEvent).clientY;
      if (clientX === undefined || clientY === undefined) return;

      const { xNorm, yNorm } = getCanvasCoords(clientX, clientY);

      const pts = [...currentPoints];
      if (dragIndex === 0) {
        // Start endpoint: x is locked to 0
        pts[0] = { x: 0, y: yNorm };
      } else if (dragIndex === pts.length - 1) {
        // End endpoint: x is locked to 1
        pts[pts.length - 1] = { x: 1, y: yNorm };
      } else {
        // Middle point: clamp x strictly between neighboring points to prevent inversion
        const minX = (pts[dragIndex - 1]?.x ?? 0) + 0.02;
        const maxX = (pts[dragIndex + 1]?.x ?? 1) - 0.02;
        const clampedX = Math.max(minX, Math.min(maxX, xNorm));
        pts[dragIndex] = { x: clampedX, y: yNorm };
      }

      setHoveredPos({ inVal: Math.round(pts[dragIndex].x * 100), outVal: Math.round(pts[dragIndex].y * 100) });
      updateChannelPoints(pts);
    };

    const handleGlobalUp = () => {
      setDragIndex(null);
    };

    window.addEventListener('mousemove', handleGlobalMove);
    window.addEventListener('mouseup', handleGlobalUp);
    window.addEventListener('touchmove', handleGlobalMove);
    window.addEventListener('touchend', handleGlobalUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMove);
      window.removeEventListener('mouseup', handleGlobalUp);
      window.removeEventListener('touchmove', handleGlobalMove);
      window.removeEventListener('touchend', handleGlobalUp);
    };
  }, [dragIndex, currentPoints, updateChannelPoints]);

  const resetCurrentCurve = () => {
    soundFx.playHapticTick();
    updateChannelPoints([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ]);
  };

  const applyPreset = (pts: CurvePoint[]) => {
    soundFx.playHapticTick();
    updateChannelPoints(pts);
  };

  return (
    <div className="flex flex-col gap-3 max-h-[38vh] sm:max-h-[320px] overflow-y-auto px-1 pr-2 no-scrollbar">
      {/* Channel Switcher */}
      <div className="flex items-center justify-between pb-1 border-b border-[#F0EEE6] text-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {(['master', 'red', 'green', 'blue'] as const).map((ch) => (
            <button
              key={ch}
              onClick={() => {
                setActiveChannel(ch);
                setDragIndex(null);
                soundFx.playHapticTick();
              }}
              className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                activeChannel === ch
                  ? ch === 'master'
                    ? 'bg-[#2A2723] text-white shadow-xs'
                    : ch === 'red'
                    ? 'bg-red-500 text-white'
                    : ch === 'green'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-blue-600 text-white'
                  : 'bg-[#FAF9F6] text-[#7E7365] hover:text-[#2A2723] border border-[#E6E2D3]'
              }`}
            >
              {ch}
            </button>
          ))}
        </div>

        <button
          onClick={resetCurrentCurve}
          className="flex items-center gap-1 text-[11px] text-[#7E7365] hover:text-[#2A2723] transition-colors cursor-pointer flex-shrink-0"
          title="Reset this channel's curve"
        >
          <RotateCcw className="w-2.5 h-2.5" />
          <span>Reset</span>
        </button>
      </div>

      {/* Interactive Canvas Area with Coordinate HUD */}
      <div className="relative flex flex-col items-center justify-center bg-[#FAF9F6] p-2.5 sm:p-3 rounded-2xl border border-[#E6E2D3] touch-none select-none">
        <canvas
          ref={canvasRef}
          width={300}
          height={180}
          onMouseDown={(e) => handlePointerDown(e.clientX, e.clientY)}
          onTouchStart={(e) => {
            if (e.touches?.[0]) handlePointerDown(e.touches[0].clientX, e.touches[0].clientY);
          }}
          className="rounded-lg cursor-crosshair shadow-inner border border-[#E6E2D3] max-w-full touch-none"
        />

        {/* Live Coordinate Overlay Badge */}
        {hoveredPos && dragIndex !== null && (
          <div className="absolute top-4 right-4 bg-[#2A2723]/90 backdrop-blur-xs text-white text-[10px] font-mono px-2 py-0.5 rounded shadow-sm pointer-events-none">
            In: {hoveredPos.inVal}% · Out: {hoveredPos.outVal}%
          </div>
        )}
      </div>

      {/* Quick Curve Presets for fast editing */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        <span className="text-[10px] uppercase font-bold text-[#A89F91] tracking-wider flex items-center gap-1 flex-shrink-0">
          <Sparkles className="w-2.5 h-2.5" /> Recipes:
        </span>
        {(QUICK_PRESETS[activeChannel] || []).map((preset) => (
          <button
            key={preset.name}
            onClick={() => applyPreset(preset.points)}
            className="text-[11px] px-2.5 py-1 rounded-md bg-[#FAF9F6] hover:bg-[#F2EFE9] text-[#4A453E] border border-[#E6E2D3] whitespace-nowrap cursor-pointer transition-colors"
          >
            {preset.name}
          </button>
        ))}
      </div>

      <p className="text-[10px] sm:text-[11px] text-center text-[#7E7365]">
        Click/tap curve to add control points (up to 8). Drag to shape tones. Double-click points to remove.
      </p>
    </div>
  );
};
