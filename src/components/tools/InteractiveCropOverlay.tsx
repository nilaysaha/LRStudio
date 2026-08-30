import React, { useState, useRef, useCallback, useEffect } from 'react';
import { CropBox, CropShape, CropAspect } from '../../types';
import { soundFx } from '../../utils/audio';

interface InteractiveCropOverlayProps {
  cropBox: CropBox;
  cropShape: CropShape;
  cropAspect: CropAspect;
  onChangeCrop: (newBox: CropBox) => void;
  containerWidth: number;
  containerHeight: number;
  imageNaturalWidth?: number;
  imageNaturalHeight?: number;
  isActive?: boolean;
}

type DragHandle = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w' | 'move' | null;

export const InteractiveCropOverlay: React.FC<InteractiveCropOverlayProps> = ({
  cropBox,
  cropShape,
  cropAspect,
  onChangeCrop,
  containerWidth,
  containerHeight,
  imageNaturalWidth = 1200,
  imageNaturalHeight = 1200,
  isActive = true,
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [activeHandle, setActiveHandle] = useState<DragHandle>(null);
  const [isInteracting, setIsInteracting] = useState(false);

  // Drag state tracking
  const dragStartRef = useRef<{
    handle: DragHandle;
    startX: number;
    startY: number;
    initialBox: CropBox;
  }>({
    handle: null,
    startX: 0,
    startY: 0,
    initialBox: { ...cropBox },
  });

  // Calculate pixel aspect ratio of the rendered canvas
  const canvasAspect = containerWidth > 0 && containerHeight > 0
    ? containerWidth / containerHeight
    : imageNaturalWidth / imageNaturalHeight;

  // Determine effective target aspect ratio (width / height)
  const getTargetRatio = useCallback((): number | null => {
    if (cropShape === 'circle' || cropShape === 'square' || cropAspect === '1:1' || cropAspect === 'circle') {
      return 1.0;
    }
    if (cropAspect === '4:5') return 4 / 5;
    if (cropAspect === '9:16') return 9 / 16;
    if (cropAspect === '16:9') return 16 / 9;
    if (cropAspect === '3:4') return 3 / 4;
    if (cropAspect === '2:3') return 2 / 3;
    return null; // free
  }, [cropShape, cropAspect]);

  const isCircular = cropShape === 'circle' || cropAspect === 'circle';

  // Handle pointer down on handles or crop body
  const handlePointerDown = (handle: DragHandle, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // Fallback
    }

    setActiveHandle(handle);
    setIsInteracting(true);
    soundFx.playHapticTick();

    dragStartRef.current = {
      handle,
      startX: e.clientX,
      startY: e.clientY,
      initialBox: { ...cropBox },
    };
  };

  // Process dragging with cursor or finger
  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!dragStartRef.current.handle || !overlayRef.current) return;

      const { handle, startX, startY, initialBox } = dragStartRef.current;
      const rect = overlayRef.current.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      // Delta in normalized 0-1 coordinates
      const dx = (e.clientX - startX) / rect.width;
      const dy = (e.clientY - startY) / rect.height;

      const targetRatio = getTargetRatio();
      const minSize = 0.08; // Minimum 8% size

      let newX = initialBox.x;
      let newY = initialBox.y;
      let newW = initialBox.width;
      let newH = initialBox.height;

      if (handle === 'move') {
        // Move entire box
        newX = Math.max(0, Math.min(1 - initialBox.width, initialBox.x + dx));
        newY = Math.max(0, Math.min(1 - initialBox.height, initialBox.y + dy));
      } else {
        // Resizing via handles
        if (targetRatio !== null) {
          // Locked aspect ratio mode (Square, Circle, 4:5, 9:16, etc.)
          // In normalized coordinates: (w * rect.width) / (h * rect.height) = targetRatio
          // Therefore: h = (w * rect.width) / (targetRatio * rect.height) = w * (canvasAspect / targetRatio)
          const normAspectMultiplier = canvasAspect / targetRatio;

          if (handle === 'se') {
            // Drag bottom-right
            const candidateW = Math.max(minSize, Math.min(1 - initialBox.x, initialBox.width + dx));
            const candidateH = candidateW * normAspectMultiplier;
            if (initialBox.y + candidateH <= 1) {
              newW = candidateW;
              newH = candidateH;
            } else {
              newH = 1 - initialBox.y;
              newW = newH / normAspectMultiplier;
            }
          } else if (handle === 'nw') {
            // Drag top-left
            const candidateW = Math.max(minSize, Math.min(initialBox.x + initialBox.width, initialBox.width - dx));
            const candidateH = candidateW * normAspectMultiplier;
            if (initialBox.y + initialBox.height - candidateH >= 0) {
              newW = candidateW;
              newH = candidateH;
              newX = initialBox.x + initialBox.width - newW;
              newY = initialBox.y + initialBox.height - newH;
            }
          } else if (handle === 'ne') {
            // Drag top-right
            const candidateW = Math.max(minSize, Math.min(1 - initialBox.x, initialBox.width + dx));
            const candidateH = candidateW * normAspectMultiplier;
            if (initialBox.y + initialBox.height - candidateH >= 0) {
              newW = candidateW;
              newH = candidateH;
              newY = initialBox.y + initialBox.height - newH;
            }
          } else if (handle === 'sw') {
            // Drag bottom-left
            const candidateW = Math.max(minSize, Math.min(initialBox.x + initialBox.width, initialBox.width - dx));
            const candidateH = candidateW * normAspectMultiplier;
            if (initialBox.y + candidateH <= 1) {
              newW = candidateW;
              newH = candidateH;
              newX = initialBox.x + initialBox.width - newW;
            }
          } else if (handle === 'e' || handle === 'w') {
            const factor = handle === 'e' ? dx : -dx;
            const candidateW = Math.max(minSize, initialBox.width + factor);
            const candidateH = candidateW * normAspectMultiplier;
            if (initialBox.y + candidateH <= 1 && (handle === 'e' ? initialBox.x + candidateW <= 1 : initialBox.x + initialBox.width - candidateW >= 0)) {
              newW = candidateW;
              newH = candidateH;
              if (handle === 'w') newX = initialBox.x + initialBox.width - newW;
            }
          } else if (handle === 's' || handle === 'n') {
            const factor = handle === 's' ? dy : -dy;
            const candidateH = Math.max(minSize, initialBox.height + factor);
            const candidateW = candidateH / normAspectMultiplier;
            if (initialBox.x + candidateW <= 1 && (handle === 's' ? initialBox.y + candidateH <= 1 : initialBox.y + initialBox.height - candidateH >= 0)) {
              newH = candidateH;
              newW = candidateW;
              if (handle === 'n') newY = initialBox.y + initialBox.height - newH;
            }
          }
        } else {
          // Free-form mode
          if (handle.includes('e')) {
            newW = Math.max(minSize, Math.min(1 - initialBox.x, initialBox.width + dx));
          }
          if (handle.includes('w')) {
            const maxW = initialBox.x + initialBox.width;
            const candidateW = initialBox.width - dx;
            if (candidateW >= minSize && initialBox.x + dx >= 0) {
              newW = candidateW;
              newX = initialBox.x + dx;
            } else if (initialBox.x + dx < 0) {
              newX = 0;
              newW = maxW;
            }
          }
          if (handle.includes('s')) {
            newH = Math.max(minSize, Math.min(1 - initialBox.y, initialBox.height + dy));
          }
          if (handle.includes('n')) {
            const maxH = initialBox.y + initialBox.height;
            const candidateH = initialBox.height - dy;
            if (candidateH >= minSize && initialBox.y + dy >= 0) {
              newH = candidateH;
              newY = initialBox.y + dy;
            } else if (initialBox.y + dy < 0) {
              newY = 0;
              newH = maxH;
            }
          }
        }
      }

      // Clamp to bounds
      newX = Math.max(0, Math.min(1 - minSize, newX));
      newY = Math.max(0, Math.min(1 - minSize, newY));
      newW = Math.max(minSize, Math.min(1 - newX, newW));
      newH = Math.max(minSize, Math.min(1 - newY, newH));

      onChangeCrop({
        x: newX,
        y: newY,
        width: newW,
        height: newH,
      });
    },
    [getTargetRatio, canvasAspect, onChangeCrop]
  );

  const handlePointerUp = useCallback(() => {
    setActiveHandle(null);
    setIsInteracting(false);
    dragStartRef.current.handle = null;
  }, []);

  useEffect(() => {
    if (activeHandle) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointercancel', handlePointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [activeHandle, handlePointerMove, handlePointerUp]);

  if (!isActive) return null;

  // Box positions in percentages
  const leftPct = cropBox.x * 100;
  const topPct = cropBox.y * 100;
  const widthPct = cropBox.width * 100;
  const heightPct = cropBox.height * 100;
  const rightPct = (cropBox.x + cropBox.width) * 100;
  const bottomPct = (cropBox.y + cropBox.height) * 100;

  // Calculated approximate pixel dimensions for user HUD
  const pixelW = Math.round(cropBox.width * imageNaturalWidth);
  const pixelH = Math.round(cropBox.height * imageNaturalHeight);

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 pointer-events-auto select-none z-30 touch-none overflow-hidden"
      style={{ touchAction: 'none' }}
    >
      {/* ========================================================================= */}
      {/* 1. DARK SHADOW MASKS OUTSIDE CROP AREA */}
      {/* ========================================================================= */}
      {!isCircular ? (
        <>
          {/* Top Mask */}
          <div
            style={{ top: 0, left: 0, right: 0, height: `${topPct}%` }}
            className="absolute bg-black/55 backdrop-blur-[0.5px] transition-colors"
          />
          {/* Bottom Mask */}
          <div
            style={{ top: `${bottomPct}%`, left: 0, right: 0, bottom: 0 }}
            className="absolute bg-black/55 backdrop-blur-[0.5px] transition-colors"
          />
          {/* Left Mask */}
          <div
            style={{ top: `${topPct}%`, left: 0, width: `${leftPct}%`, height: `${heightPct}%` }}
            className="absolute bg-black/55 backdrop-blur-[0.5px] transition-colors"
          />
          {/* Right Mask */}
          <div
            style={{ top: `${topPct}%`, left: `${rightPct}%`, right: 0, height: `${heightPct}%` }}
            className="absolute bg-black/55 backdrop-blur-[0.5px] transition-colors"
          />
        </>
      ) : (
        /* Circular SVG Mask Overlay */
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <defs>
            <mask id="circle-crop-mask">
              <rect width="100%" height="100%" fill="white" />
              <ellipse
                cx={`${leftPct + widthPct / 2}%`}
                cy={`${topPct + heightPct / 2}%`}
                rx={`${widthPct / 2}%`}
                ry={`${heightPct / 2}%`}
                fill="black"
              />
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.65)"
            mask="url(#circle-crop-mask)"
          />
        </svg>
      )}

      {/* ========================================================================= */}
      {/* 2. ACTIVE CROP WINDOW CONTAINER */}
      {/* ========================================================================= */}
      <div
        style={{
          left: `${leftPct}%`,
          top: `${topPct}%`,
          width: `${widthPct}%`,
          height: `${heightPct}%`,
        }}
        className={`absolute group cursor-move touch-none ${
          isCircular ? 'rounded-full' : ''
        }`}
        onPointerDown={(e) => handlePointerDown('move', e)}
      >
        {/* Border Frame */}
        <div
          className={`absolute inset-0 border-2 border-white shadow-[0_0_12px_rgba(0,0,0,0.6)] ${
            isCircular ? 'rounded-full' : ''
          }`}
        />

        {/* Rule-of-Thirds Grid Lines */}
        {!isCircular ? (
          <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-70 group-hover:opacity-90 transition-opacity">
            <div className="border-r border-b border-white/50 shadow-[0_0_2px_rgba(0,0,0,0.5)]" />
            <div className="border-r border-b border-white/50 shadow-[0_0_2px_rgba(0,0,0,0.5)]" />
            <div className="border-b border-white/50 shadow-[0_0_2px_rgba(0,0,0,0.5)]" />
            <div className="border-r border-b border-white/50 shadow-[0_0_2px_rgba(0,0,0,0.5)]" />
            <div className="border-r border-b border-white/50 shadow-[0_0_2px_rgba(0,0,0,0.5)]" />
            <div className="border-b border-white/50 shadow-[0_0_2px_rgba(0,0,0,0.5)]" />
            <div className="border-r border-white/50 shadow-[0_0_2px_rgba(0,0,0,0.5)]" />
            <div className="border-r border-white/50 shadow-[0_0_2px_rgba(0,0,0,0.5)]" />
            <div />
          </div>
        ) : (
          /* Circular Crosshair Center Guide */
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-60">
            <div className="w-full h-[1px] bg-white/60 shadow-xs" />
            <div className="h-full w-[1px] bg-white/60 shadow-xs absolute" />
            <div className="w-8 h-8 rounded-full border border-white/50 absolute" />
          </div>
        )}

        {/* Floating Dimension & Aspect Badge */}
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#2A2723]/95 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium text-white shadow-md border border-white/20 whitespace-nowrap pointer-events-none flex items-center gap-1.5 z-40">
          <span>{pixelW} × {pixelH}</span>
          <span className="text-neutral-400 font-sans">
            {isCircular ? '• Circle' : cropAspect === '1:1' ? '• 1:1' : ''}
          </span>
        </div>

        {/* ========================================================================= */}
        {/* 3. RECTANGULAR CORNER BRACKETS & TOUCH HANDLES */}
        {/* ========================================================================= */}
        {!isCircular ? (
          <>
            {/* Top-Left Corner Bracket (NW) */}
            <div
              onPointerDown={(e) => handlePointerDown('nw', e)}
              className="absolute -top-3 -left-3 w-10 h-10 flex items-start justify-start cursor-nwse-resize p-1 z-40 touch-none group/h"
              style={{ touchAction: 'none' }}
              title="Drag top-left handle"
            >
              <div className="w-4 h-4 border-t-3 border-l-3 border-white bg-[#2A2723] rounded-tl shadow-[0_0_6px_rgba(0,0,0,0.8)] group-hover/h:scale-125 transition-transform" />
            </div>

            {/* Top-Right Corner Bracket (NE) */}
            <div
              onPointerDown={(e) => handlePointerDown('ne', e)}
              className="absolute -top-3 -right-3 w-10 h-10 flex items-start justify-end cursor-nesw-resize p-1 z-40 touch-none group/h"
              style={{ touchAction: 'none' }}
              title="Drag top-right handle"
            >
              <div className="w-4 h-4 border-t-3 border-r-3 border-white bg-[#2A2723] rounded-tr shadow-[0_0_6px_rgba(0,0,0,0.8)] group-hover/h:scale-125 transition-transform" />
            </div>

            {/* Bottom-Left Corner Bracket (SW) */}
            <div
              onPointerDown={(e) => handlePointerDown('sw', e)}
              className="absolute -bottom-3 -left-3 w-10 h-10 flex items-end justify-start cursor-nesw-resize p-1 z-40 touch-none group/h"
              style={{ touchAction: 'none' }}
              title="Drag bottom-left handle"
            >
              <div className="w-4 h-4 border-b-3 border-l-3 border-white bg-[#2A2723] rounded-bl shadow-[0_0_6px_rgba(0,0,0,0.8)] group-hover/h:scale-125 transition-transform" />
            </div>

            {/* Bottom-Right Corner Bracket (SE) */}
            <div
              onPointerDown={(e) => handlePointerDown('se', e)}
              className="absolute -bottom-3 -right-3 w-10 h-10 flex items-end justify-end cursor-nwse-resize p-1 z-40 touch-none group/h"
              style={{ touchAction: 'none' }}
              title="Drag bottom-right handle"
            >
              <div className="w-4 h-4 border-b-3 border-r-3 border-white bg-[#2A2723] rounded-br shadow-[0_0_6px_rgba(0,0,0,0.8)] group-hover/h:scale-125 transition-transform" />
            </div>

            {/* Edge Midpoint Bars (Top, Bottom, Left, Right) */}
            <div
              onPointerDown={(e) => handlePointerDown('n', e)}
              className="absolute -top-3 left-1/2 -translate-x-1/2 w-12 h-6 flex items-center justify-center cursor-ns-resize z-40 touch-none group/edge"
              style={{ touchAction: 'none' }}
            >
              <div className="w-6 h-1.5 bg-white rounded-full shadow-[0_0_4px_rgba(0,0,0,0.8)] group-hover/edge:w-8 transition-all" />
            </div>

            <div
              onPointerDown={(e) => handlePointerDown('s', e)}
              className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-12 h-6 flex items-center justify-center cursor-ns-resize z-40 touch-none group/edge"
              style={{ touchAction: 'none' }}
            >
              <div className="w-6 h-1.5 bg-white rounded-full shadow-[0_0_4px_rgba(0,0,0,0.8)] group-hover/edge:w-8 transition-all" />
            </div>

            <div
              onPointerDown={(e) => handlePointerDown('w', e)}
              className="absolute top-1/2 -translate-y-1/2 -left-3 h-12 w-6 flex items-center justify-center cursor-ew-resize z-40 touch-none group/edge"
              style={{ touchAction: 'none' }}
            >
              <div className="h-6 w-1.5 bg-white rounded-full shadow-[0_0_4px_rgba(0,0,0,0.8)] group-hover/edge:h-8 transition-all" />
            </div>

            <div
              onPointerDown={(e) => handlePointerDown('e', e)}
              className="absolute top-1/2 -translate-y-1/2 -right-3 h-12 w-6 flex items-center justify-center cursor-ew-resize z-40 touch-none group/edge"
              style={{ touchAction: 'none' }}
            >
              <div className="h-6 w-1.5 bg-white rounded-full shadow-[0_0_4px_rgba(0,0,0,0.8)] group-hover/edge:h-8 transition-all" />
            </div>
          </>
        ) : (
          /* ========================================================================= */
          /* 4. CIRCULAR QUADRANT DRAG HANDLES */
          /* ========================================================================= */
          <>
            {/* Top-Left Quadrant */}
            <div
              onPointerDown={(e) => handlePointerDown('nw', e)}
              className="absolute top-[14%] left-[14%] -translate-x-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center cursor-nwse-resize z-40 touch-none group/circ"
              style={{ touchAction: 'none' }}
            >
              <div className="w-4 h-4 rounded-full bg-white border-2 border-[#2A2723] shadow-lg group-hover/circ:scale-125 transition-transform" />
            </div>

            {/* Top-Right Quadrant */}
            <div
              onPointerDown={(e) => handlePointerDown('ne', e)}
              className="absolute top-[14%] right-[14%] translate-x-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center cursor-nesw-resize z-40 touch-none group/circ"
              style={{ touchAction: 'none' }}
            >
              <div className="w-4 h-4 rounded-full bg-white border-2 border-[#2A2723] shadow-lg group-hover/circ:scale-125 transition-transform" />
            </div>

            {/* Bottom-Left Quadrant */}
            <div
              onPointerDown={(e) => handlePointerDown('sw', e)}
              className="absolute bottom-[14%] left-[14%] -translate-x-1/2 translate-y-1/2 w-9 h-9 flex items-center justify-center cursor-nesw-resize z-40 touch-none group/circ"
              style={{ touchAction: 'none' }}
            >
              <div className="w-4 h-4 rounded-full bg-white border-2 border-[#2A2723] shadow-lg group-hover/circ:scale-125 transition-transform" />
            </div>

            {/* Bottom-Right Quadrant */}
            <div
              onPointerDown={(e) => handlePointerDown('se', e)}
              className="absolute bottom-[14%] right-[14%] translate-x-1/2 translate-y-1/2 w-9 h-9 flex items-center justify-center cursor-nwse-resize z-40 touch-none group/circ"
              style={{ touchAction: 'none' }}
            >
              <div className="w-4 h-4 rounded-full bg-white border-2 border-[#2A2723] shadow-lg group-hover/circ:scale-125 transition-transform" />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
