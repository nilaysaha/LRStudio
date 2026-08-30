import React, { useRef, useState, useEffect } from 'react';
import { Adjustments, CurvePoint } from '../../types';
import { RotateCcw } from 'lucide-react';
import { soundFx } from '../../utils/audio';

interface CurvesAdjustmentsProps {
  adjustments: Adjustments;
  onChange: (newAdj: Adjustments) => void;
}

type CurveChannel = 'master' | 'red' | 'green' | 'blue';

export const CurvesAdjustments: React.FC<CurvesAdjustmentsProps> = ({
  adjustments,
  onChange,
}) => {
  const [activeChannel, setActiveChannel] = useState<CurveChannel>('master');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDraggingIndex, setIsDraggingIndex] = useState<number | null>(null);

  const points = adjustments.curves[activeChannel] || [
    { x: 0, y: 0 },
    { x: 1, y: 1 },
  ];

  // Draw Tone Curve Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Background & Grid
    ctx.fillStyle = '#FAF9F6';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#E6E2D3';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      // Horizontal grid lines
      ctx.beginPath();
      ctx.moveTo(0, (h / 4) * i);
      ctx.lineTo(w, (h / 4) * i);
      ctx.stroke();

      // Vertical grid lines
      ctx.beginPath();
      ctx.moveTo((w / 4) * i, 0);
      ctx.lineTo((w / 4) * i, h);
      ctx.stroke();
    }

    // Diagonal reference line
    ctx.strokeStyle = '#D5CFBF';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(w, 0);
    ctx.stroke();
    ctx.setLineDash([]);

    // Curve Line color based on channel
    let strokeColor = '#2A2723';
    if (activeChannel === 'red') strokeColor = '#EF4444';
    if (activeChannel === 'green') strokeColor = '#22C55E';
    if (activeChannel === 'blue') strokeColor = '#3B82F6';

    // Draw spline curve through points
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();

    const sorted = [...points].sort((a, b) => a.x - b.x);

    // Interpolate points smoothly
    for (let i = 0; i <= w; i += 2) {
      const xNorm = i / w;
      const yNorm = evaluateCurve(sorted, xNorm);
      const canvasY = h - yNorm * h;
      if (i === 0) ctx.moveTo(i, canvasY);
      else ctx.lineTo(i, canvasY);
    }
    ctx.stroke();

    // Draw control points
    sorted.forEach((pt, idx) => {
      const cx = pt.x * w;
      const cy = h - pt.y * h;

      ctx.fillStyle = strokeColor;
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
  }, [points, activeChannel]);

  // Point Interaction
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const xNorm = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const yNorm = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));

    // Find if clicked near an existing point (within 0.08)
    const existingIndex = points.findIndex(
      (pt) => Math.hypot(pt.x - xNorm, pt.y - yNorm) < 0.08
    );

    if (existingIndex !== -1) {
      setIsDraggingIndex(existingIndex);
    } else {
      // Add new control point if fewer than 5 points
      if (points.length < 5) {
        const newPoints = [...points, { x: xNorm, y: yNorm }].sort((a, b) => a.x - b.x);
        updateChannelPoints(newPoints);
        const newIndex = newPoints.findIndex((p) => Math.abs(p.x - xNorm) < 0.01);
        setIsDraggingIndex(newIndex);
        soundFx.playHapticTick();
      }
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDraggingIndex === null) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const xNorm = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const yNorm = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));

    const updated = [...points];
    // Keep first point pinned to x=0, last point to x=1
    if (isDraggingIndex === 0) {
      updated[0] = { x: 0, y: yNorm };
    } else if (isDraggingIndex === points.length - 1) {
      updated[points.length - 1] = { x: 1, y: yNorm };
    } else {
      updated[isDraggingIndex] = { x: xNorm, y: yNorm };
    }

    updateChannelPoints(updated);
  };

  const handleCanvasMouseUp = () => {
    setIsDraggingIndex(null);
  };

  const updateChannelPoints = (newPoints: CurvePoint[]) => {
    onChange({
      ...adjustments,
      curves: {
        ...adjustments.curves,
        [activeChannel]: newPoints,
      },
    });
  };

  const resetCurrentCurve = () => {
    soundFx.playHapticTick();
    updateChannelPoints([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ]);
  };

  return (
    <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto px-1 pr-2 no-scrollbar">
      {/* Channel Switcher */}
      <div className="flex items-center justify-between pb-1 border-b border-[#F0EEE6] text-xs">
        <div className="flex items-center gap-1">
          {(['master', 'red', 'green', 'blue'] as const).map((ch) => (
            <button
              key={ch}
              onClick={() => {
                setActiveChannel(ch);
                soundFx.playHapticTick();
              }}
              className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider transition-all ${
                activeChannel === ch
                  ? ch === 'master'
                    ? 'bg-[#2A2723] text-white shadow-xs'
                    : ch === 'red'
                    ? 'bg-red-500 text-white'
                    : ch === 'green'
                    ? 'bg-green-500 text-white'
                    : 'bg-blue-500 text-white'
                  : 'bg-[#FAF9F6] text-[#7E7365] hover:text-[#2A2723] border border-[#E6E2D3]'
              }`}
            >
              {ch}
            </button>
          ))}
        </div>
        <button
          onClick={resetCurrentCurve}
          className="flex items-center gap-1 text-[11px] text-[#7E7365] hover:text-[#2A2723] transition-colors"
        >
          <RotateCcw className="w-2.5 h-2.5" />
          Reset Curve
        </button>
      </div>

      {/* Interactive Canvas Area */}
      <div className="flex items-center justify-center bg-[#FAF9F6] p-3 rounded-2xl border border-[#E6E2D3]">
        <canvas
          ref={canvasRef}
          width={280}
          height={200}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          className="rounded-lg cursor-crosshair shadow-inner border border-[#E6E2D3]"
        />
      </div>
      <p className="text-[11px] text-center text-[#7E7365]">
        Click to place points on the curve. Drag points to adjust highlights, midtones, and shadows.
      </p>
    </div>
  );
};

// Evaluate piecewise linear or Catmull-Rom spline approximation
function evaluateCurve(points: CurvePoint[], x: number): number {
  if (points.length === 0) return x;
  if (x <= points[0].x) return points[0].y;
  if (x >= points[points.length - 1].x) return points[points.length - 1].y;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    if (x >= p0.x && x <= p1.x) {
      const t = (x - p0.x) / (p1.x - p0.x);
      // Smooth Hermite blend
      const smoothT = t * t * (3 - 2 * t);
      return p0.y + smoothT * (p1.y - p0.y);
    }
  }
  return x;
}
