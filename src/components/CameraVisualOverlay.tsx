import React, { useState, useEffect } from 'react';
import { CameraType, DateStampSettings } from '../types';
import { getFormattedDateStamp } from '../utils/cameraOverlayRenderer';

interface CameraVisualOverlayProps {
  cameraType?: CameraType;
  dateStamp?: DateStampSettings;
  width?: number;
  height?: number;
  isLive?: boolean;
}

export const CameraVisualOverlay: React.FC<CameraVisualOverlayProps> = ({
  cameraType = 'none',
  dateStamp,
  isLive = false,
}) => {
  const [timeTick, setTimeTick] = useState(0);

  // Live timer tick for camcorder, handicam, vhs
  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => {
      setTimeTick((t) => (t + 1) % 60);
    }, 1000);
    return () => clearInterval(interval);
  }, [isLive]);

  const hasCamera = cameraType && cameraType !== 'none';
  const hasDateStamp = dateStamp && dateStamp.enabled;

  if (!hasCamera && !hasDateStamp) return null;

  // Custom Date Stamp styles & position classes
  const getDateStampStyleClasses = () => {
    if (!dateStamp) return '';
    switch (dateStamp.style) {
      case 'led-orange':
        return 'font-mono text-[#FF7A00] drop-shadow-[0_0_8px_rgba(255,122,0,0.9)]';
      case 'led-red':
        return 'font-mono text-[#EF4444] drop-shadow-[0_0_8px_rgba(239,68,68,0.9)]';
      case 'y2k-yellow':
        return 'font-mono text-[#FACC15] drop-shadow-[0_0_6px_rgba(0,0,0,0.9)]';
      case 'camcorder-green':
        return 'font-mono text-[#22C55E] drop-shadow-[0_0_8px_rgba(34,197,94,0.9)]';
      case 'vhs-white':
        return 'font-mono text-zinc-100 drop-shadow-[0_0_6px_rgba(0,0,0,0.95)]';
      case 'handicam-white':
        return 'font-mono text-white drop-shadow-[0_0_6px_rgba(0,0,0,0.9)]';
      case 'film-gold':
        return 'font-mono text-[#F59E0B] drop-shadow-[0_0_6px_rgba(245,158,11,0.8)]';
      case 'classic-white':
      default:
        return 'font-sans font-medium text-white/95 drop-shadow-[0_0_4px_rgba(0,0,0,0.8)]';
    }
  };

  const getDateStampPositionClasses = () => {
    if (!dateStamp) return 'bottom-4 right-4';
    switch (dateStamp.position) {
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'top-right':
        return 'top-4 right-4';
      case 'top-left':
        return 'top-4 left-4';
      case 'bottom-right':
      default:
        return 'bottom-4 right-4';
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-20 overflow-hidden font-sans text-xs flex flex-col justify-between p-3 sm:p-4">
      {/* Superimposed Date / Time Stamp Overlay */}
      {hasDateStamp && (
        <div
          className={`absolute ${getDateStampPositionClasses()} pointer-events-none z-30 transition-all`}
          style={{
            opacity: dateStamp.opacity ?? 0.95,
            transform: `scale(${dateStamp.size ?? 1.0})`,
            transformOrigin:
              dateStamp.position === 'bottom-left'
                ? 'bottom left'
                : dateStamp.position === 'top-right'
                ? 'top right'
                : dateStamp.position === 'top-left'
                ? 'top left'
                : 'bottom right',
          }}
        >
          <div
            className={`font-bold tracking-widest text-sm sm:text-base px-2 py-0.5 rounded bg-black/25 backdrop-blur-[2px] ${getDateStampStyleClasses()}`}
          >
            {getFormattedDateStamp(
              dateStamp.style,
              dateStamp.includeTime,
              dateStamp.customDate,
              dateStamp.customTime
            )}
          </div>
        </div>
      )}
      {/* 1. DISPOSABLE */}
      {cameraType === 'disposable' && (
        <>
          <div className="flex justify-between items-start text-[10px] tracking-wider text-amber-200/70 font-mono">
            <span className="bg-black/30 px-1.5 py-0.5 rounded backdrop-blur-[2px]">35MM DISPOSABLE</span>
            <span className="bg-black/30 px-1.5 py-0.5 rounded backdrop-blur-[2px]">27 EXP • ISO 400</span>
          </div>
          <div className="flex justify-end items-end">
            <div className="font-mono text-base sm:text-xl font-bold tracking-widest text-[#FF7A00] drop-shadow-[0_0_8px_rgba(255,122,0,0.9)] bg-black/20 px-2 py-0.5 rounded">
              {getFormattedDateStamp('led-orange')}
            </div>
          </div>
        </>
      )}

      {/* 2. FLING 35 */}
      {cameraType === 'fling35' && (
        <>
          <div className="flex justify-between items-start text-xs font-mono font-bold text-red-500 drop-shadow-[0_0_4px_rgba(239,68,68,0.8)]">
            <span className="bg-black/40 px-2 py-0.5 rounded">FLING 35 - 27 EXP</span>
            <span className="text-orange-400 bg-black/40 px-1.5 py-0.5 rounded">[ 18 ] ▲ 18A</span>
          </div>
          <div className="flex justify-between items-end text-[10px] font-mono text-amber-300/80">
            <span className="bg-black/30 px-1.5 py-0.5 rounded">SUMMER COLOR 400</span>
            <span className="bg-black/30 px-1.5 py-0.5 rounded">DX CODED</span>
          </div>
        </>
      )}

      {/* 3. KODAK GOLD */}
      {cameraType === 'kodak-gold' && (
        <>
          <div className="flex justify-between items-start font-mono text-xs font-bold text-amber-400 drop-shadow-[0_0_6px_rgba(245,158,11,0.7)]">
            <span className="bg-black/40 px-2 py-0.5 rounded">★ KODAK GOLD 200</span>
            <span className="text-white/60 text-[10px] bg-black/30 px-1.5 py-0.5 rounded">SAFETY FILM</span>
          </div>
          <div className="flex justify-between items-end font-mono text-[11px] text-amber-300">
            <span className="bg-black/40 px-1.5 py-0.5 rounded">GB 200-7</span>
            <span className="bg-black/40 px-2 py-0.5 rounded font-bold">24A</span>
          </div>
        </>
      )}

      {/* 4. KLASSE */}
      {cameraType === 'klasse' && (
        <>
          <div className="flex justify-between items-start text-[11px] font-mono text-white/80">
            <span className="bg-black/40 px-2 py-0.5 rounded border border-white/10 tracking-widest font-sans font-semibold">FUJIFILM KLASSE</span>
            <span className="bg-black/40 px-1.5 py-0.5 rounded text-amber-300/90 font-mono">[ f/2.8  1/250s ]</span>
          </div>
          <div className="flex justify-between items-end text-[10px] font-mono text-white/70">
            <span className="bg-black/30 px-1.5 py-0.5 rounded">38mm F2.6 SUPER EBC</span>
            <span className="bg-black/30 px-1.5 py-0.5 rounded">ISO 400</span>
          </div>
        </>
      )}

      {/* 5. POLAROID */}
      {cameraType === 'polaroid' && (
        <>
          <div className="flex justify-between items-start">
            <span className="text-[10px] uppercase font-mono tracking-widest text-zinc-300/80 bg-black/40 px-2 py-0.5 rounded">600 Instant Color</span>
            <div className="flex space-x-0.5 bg-black/40 p-1 rounded">
              <span className="w-2 h-3 bg-red-500 rounded-[1px]" />
              <span className="w-2 h-3 bg-orange-500 rounded-[1px]" />
              <span className="w-2 h-3 bg-yellow-400 rounded-[1px]" />
              <span className="w-2 h-3 bg-green-500 rounded-[1px]" />
              <span className="w-2 h-3 bg-blue-500 rounded-[1px]" />
            </div>
          </div>
          <div className="flex justify-between items-end text-neutral-200 font-serif italic text-sm">
            <span className="bg-black/40 px-2 py-0.5 rounded">Polaroid Instant • 600</span>
          </div>
        </>
      )}

      {/* 6. PARADISO */}
      {cameraType === 'paradiso' && (
        <>
          <div className="flex justify-between items-start text-xs font-bold text-cyan-400 drop-shadow-[0_0_6px_rgba(6,182,212,0.8)]">
            <span className="bg-black/40 px-2 py-0.5 rounded">PARADISO 35mm</span>
            <span className="text-amber-400 bg-black/40 px-1.5 py-0.5 rounded">SUMMER RIVIERA</span>
          </div>
          <div className="flex justify-end items-end text-[10px] font-mono text-cyan-200/80">
            <span className="bg-black/30 px-1.5 py-0.5 rounded">ISO 400 • SUN-DRENCHED</span>
          </div>
        </>
      )}

      {/* 7. CALAGOLD */}
      {cameraType === 'calagold' && (
        <>
          <div className="flex justify-between items-start text-xs font-bold text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]">
            <span className="bg-black/40 px-2 py-0.5 rounded">CALIFORNIA GOLD • 35MM</span>
            <span className="text-amber-200/90 text-[10px] bg-black/40 px-1.5 py-0.5 rounded">GOLDEN HOUR</span>
          </div>
          <div className="flex justify-end items-end text-[10px] font-mono text-amber-300/80">
            <span className="bg-black/30 px-1.5 py-0.5 rounded">PACIFIC COAST EMULSION</span>
          </div>
        </>
      )}

      {/* 8. SUNSHOT07 */}
      {cameraType === 'sunshot07' && (
        <>
          <div className="flex justify-between items-start font-mono text-xs font-bold text-yellow-400 drop-shadow-[0_0_4px_rgba(0,0,0,0.9)]">
            <span className="bg-black/50 px-2 py-0.5 rounded">SUNSHOT 07 • 7.1MP</span>
            <span className="bg-black/50 px-2 py-0.5 rounded">BATTERY [███] ⚡</span>
          </div>
          <div className="flex justify-end items-end">
            <div className="font-mono text-sm sm:text-base font-bold text-yellow-300 bg-black/50 px-2 py-0.5 rounded border border-yellow-400/40 drop-shadow-[0_0_6px_rgba(250,204,21,0.9)]">
              {getFormattedDateStamp('y2k-yellow')}
            </div>
          </div>
        </>
      )}

      {/* 9. SOLARE 17 */}
      {cameraType === 'solare17' && (
        <>
          <div className="flex justify-between items-start text-xs font-bold text-orange-500 drop-shadow-[0_0_6px_rgba(234,88,12,0.8)]">
            <span className="bg-black/40 px-2 py-0.5 rounded">☀ SOLARE 17 • ANALOG</span>
          </div>
          <div className="flex justify-end items-end text-[10px] font-mono text-orange-200/70">
            <span className="bg-black/30 px-1.5 py-0.5 rounded">SOLAR FLARE EMULSION</span>
          </div>
        </>
      )}

      {/* 10. PRIMA */}
      {cameraType === 'prima' && (
        <>
          <div className="flex justify-between items-start text-xs font-bold text-white/80">
            <span className="bg-black/40 px-2 py-0.5 rounded">CANON PRIMA AF</span>
            <span className="text-red-400 bg-black/40 px-1.5 py-0.5 rounded text-[10px]">AUTO DATE</span>
          </div>
          <div className="flex justify-end items-end">
            <div className="font-mono text-sm sm:text-lg font-bold tracking-widest text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.95)] bg-black/30 px-2 py-0.5 rounded">
              {getFormattedDateStamp('led-red')}
            </div>
          </div>
        </>
      )}

      {/* 11. NOVAGOLD */}
      {cameraType === 'novagold' && (
        <>
          <div className="flex justify-between items-start text-xs font-bold text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.9)]">
            <span className="bg-black/40 px-2 py-0.5 rounded">✦ NOVA GOLD 400 ✦</span>
          </div>
          <div className="flex justify-end items-end text-[10px] font-mono text-amber-200/80">
            <span className="bg-black/30 px-1.5 py-0.5 rounded">CELESTIAL EMULSION</span>
          </div>
        </>
      )}

      {/* 12. MOKA V */}
      {cameraType === 'moka-v' && (
        <>
          <div className="flex justify-between items-start text-xs font-bold text-amber-600">
            <span className="bg-black/40 px-2 py-0.5 rounded">MOKA V • 400</span>
          </div>
          <div className="flex justify-end items-end text-[10px] font-mono text-amber-300/70">
            <span className="bg-black/30 px-1.5 py-0.5 rounded">DARK ROAST CHROMATIC</span>
          </div>
        </>
      )}

      {/* 13. 5CAM */}
      {cameraType === '5cam' && (
        <>
          <div className="flex justify-between items-start text-xs font-mono font-bold text-purple-400 drop-shadow-[0_0_6px_rgba(167,139,250,0.8)]">
            <span className="bg-black/40 px-2 py-0.5 rounded">5CAM 3D STEREO</span>
            <span className="bg-black/40 px-2 py-0.5 rounded text-[10px]">[1][2][3][4][5]</span>
          </div>
          <div className="flex justify-end items-end text-[10px] font-mono text-purple-300/80">
            <span className="bg-black/30 px-1.5 py-0.5 rounded">LENTICULAR DISPERSION</span>
          </div>
        </>
      )}

      {/* 14. ASTERIA */}
      {cameraType === 'asteria' && (
        <>
          <div className="flex justify-between items-start text-xs font-bold text-purple-300 drop-shadow-[0_0_8px_rgba(192,132,252,0.9)]">
            <span className="bg-black/40 px-2 py-0.5 rounded">✦ ✧ ASTERIA 800 ✧ ✦</span>
          </div>
          <div className="flex justify-end items-end text-[10px] font-mono text-purple-200/80">
            <span className="bg-black/30 px-1.5 py-0.5 rounded">MIDNIGHT CELESTIAL BLOOM</span>
          </div>
        </>
      )}

      {/* 15. NATURA */}
      {cameraType === 'natura' && (
        <>
          <div className="flex justify-between items-start text-xs font-bold text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.8)]">
            <span className="bg-black/40 px-2 py-0.5 rounded">FUJIFILM NATURA 1600</span>
            <span className="bg-black/40 px-1.5 py-0.5 rounded text-[10px] text-white/80">NP MODE</span>
          </div>
          <div className="flex justify-end items-end text-[10px] font-mono text-emerald-200/80">
            <span className="bg-black/30 px-1.5 py-0.5 rounded">NATURAL AMBIENT LIGHT</span>
          </div>
        </>
      )}

      {/* 16. AUREA */}
      {cameraType === 'aurea' && (
        <>
          <div className="flex justify-between items-start text-xs font-bold text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.9)]">
            <span className="bg-black/40 px-2 py-0.5 rounded">✺ AUREA GLOW • 200</span>
          </div>
          <div className="flex justify-end items-end text-[10px] font-mono text-amber-200/80">
            <span className="bg-black/30 px-1.5 py-0.5 rounded">RADIANT DIFFUSION</span>
          </div>
        </>
      )}

      {/* 17. FUJI400 */}
      {cameraType === 'fuji400' && (
        <>
          <div className="flex justify-between items-start font-mono text-xs font-bold text-emerald-500">
            <span className="bg-black/40 px-2 py-0.5 rounded">FUJICOLOR SUPERIA 400</span>
            <span className="text-white/70 text-[10px] bg-black/30 px-1.5 py-0.5 rounded">36 EXP</span>
          </div>
          <div className="flex justify-end items-end text-[10px] font-mono text-emerald-300/80">
            <span className="bg-black/30 px-1.5 py-0.5 rounded">PROCESS CN-16</span>
          </div>
        </>
      )}

      {/* 18. VELOUR */}
      {cameraType === 'velour' && (
        <>
          <div className="flex justify-between items-start font-serif italic text-sm font-bold text-rose-400 drop-shadow-[0_0_6px_rgba(244,63,94,0.7)]">
            <span className="bg-black/40 px-2 py-0.5 rounded">Velour 100 • Fine Grain</span>
          </div>
          <div className="flex justify-end items-end text-[10px] font-mono text-rose-200/80">
            <span className="bg-black/30 px-1.5 py-0.5 rounded">HAUTE COUTURE EDITION</span>
          </div>
        </>
      )}

      {/* 19. LUNARIA */}
      {cameraType === 'lunaria' && (
        <>
          <div className="flex justify-between items-start text-xs font-bold text-slate-200 drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]">
            <span className="bg-black/40 px-2 py-0.5 rounded">☾ LUNARIA 400</span>
            <span className="text-slate-400 text-[10px] bg-black/40 px-1.5 py-0.5 rounded">MONOCHROME</span>
          </div>
          <div className="flex justify-end items-end text-[10px] font-mono text-slate-300/80">
            <span className="bg-black/30 px-1.5 py-0.5 rounded">SILVER HALIDE EMULSION</span>
          </div>
        </>
      )}

      {/* 20. VELVIA */}
      {cameraType === 'velvia' && (
        <>
          <div className="flex justify-between items-start text-xs font-bold text-blue-400">
            <span className="bg-black/40 px-2 py-0.5 rounded">FUJICHROME VELVIA 50</span>
            <span className="text-red-400 text-[10px] bg-black/40 px-1.5 py-0.5 rounded font-mono">RVP 50</span>
          </div>
          <div className="flex justify-end items-end text-[10px] font-mono text-blue-200/80">
            <span className="bg-black/30 px-1.5 py-0.5 rounded">PROFESSIONAL REVERSAL</span>
          </div>
        </>
      )}

      {/* 21. ILFORD */}
      {cameraType === 'ilford' && (
        <>
          <div className="flex justify-between items-start font-mono text-xs font-bold text-white">
            <span className="bg-black/60 px-2 py-0.5 rounded">ILFORD HP5 PLUS 400</span>
            <span className="text-zinc-400 text-[10px] bg-black/40 px-1.5 py-0.5 rounded">SAFETY FILM</span>
          </div>
          <div className="flex justify-end items-end text-[10px] font-mono text-zinc-300/80">
            <span className="bg-black/40 px-1.5 py-0.5 rounded">MADE IN ENGLAND</span>
          </div>
        </>
      )}

      {/* 22. CURVA */}
      {cameraType === 'curva' && (
        <>
          <div className="flex justify-between items-start text-xs font-mono font-bold text-sky-400 drop-shadow-[0_0_6px_rgba(56,189,248,0.8)]">
            <span className="bg-black/40 px-2 py-0.5 rounded">CURVA ANAMORPHIC</span>
            <span className="bg-black/40 px-1.5 py-0.5 rounded text-[10px]">2.39:1 CROP</span>
          </div>
          <div className="flex justify-end items-end text-[10px] font-mono text-sky-200/80">
            <span className="bg-black/30 px-1.5 py-0.5 rounded">BLUE STREAK FLARE</span>
          </div>
        </>
      )}

      {/* 23. CAMCORDER */}
      {cameraType === 'camcorder' && (
        <>
          <div className="flex justify-between items-start font-mono text-xs font-bold text-emerald-400">
            <div className="flex items-center space-x-2 bg-black/50 px-2 py-0.5 rounded">
              <span className={`text-red-500 ${isLive ? 'animate-pulse' : ''}`}>● REC</span>
              <span className="text-emerald-400">SP</span>
            </div>
            <span className="bg-black/50 px-2 py-0.5 rounded text-emerald-400">BATTERY [|||]</span>
          </div>
          <div className="flex justify-between items-end font-mono text-xs font-bold text-emerald-400">
            <span className="bg-black/50 px-2 py-0.5 rounded">TAPE 0:24:18</span>
            <span className="bg-black/50 px-2 py-0.5 rounded">{getFormattedDateStamp('camcorder-green')}</span>
          </div>
        </>
      )}

      {/* 24. HANDICAM */}
      {cameraType === 'handicam' && (
        <>
          <div className="flex justify-between items-start font-mono text-xs font-bold text-sky-300">
            <div className="flex items-center space-x-2 bg-black/50 px-2 py-0.5 rounded">
              <span className="text-sky-400">STBY</span>
              <span className="text-white/80">D.ZOOM 10x</span>
            </div>
            <span className="bg-black/50 px-2 py-0.5 rounded text-sky-300">HQ 60i</span>
          </div>

          {/* Center focus crosshairs */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-8 h-8 border border-white/40 flex items-center justify-center rounded-sm">
              <span className="text-white/70 font-mono text-xs">+</span>
            </div>
          </div>

          <div className="flex justify-between items-end font-mono text-xs text-white">
            <span className="bg-black/50 px-2 py-0.5 rounded text-sky-300">NIGHTSHOT 0:14:02</span>
            <span className="bg-black/50 px-2 py-0.5 rounded">{getFormattedDateStamp('handicam-white')}</span>
          </div>
        </>
      )}

      {/* 25. DIGISCAN */}
      {cameraType === 'digiscan' && (
        <>
          <div className="flex justify-between items-start font-mono text-xs text-slate-300">
            <span className="bg-black/40 px-2 py-0.5 rounded">DIGISCAN CCD-700</span>
            <span className="bg-black/40 px-1.5 py-0.5 rounded text-[10px]">3.2 MEGAPIXELS</span>
          </div>
          <div className="flex justify-end items-end text-[10px] font-mono text-slate-400">
            <span className="bg-black/30 px-1.5 py-0.5 rounded">CCD SENSOR GRID</span>
          </div>
        </>
      )}

      {/* 26. PINKY */}
      {cameraType === 'pinky' && (
        <>
          <div className="flex justify-between items-start text-xs font-bold text-pink-400 drop-shadow-[0_0_6px_rgba(244,114,182,0.9)]">
            <span className="bg-black/40 px-2 py-0.5 rounded">♥ PINKY POP ★ TOY CAM ♥</span>
          </div>
          <div className="flex justify-end items-end text-[10px] font-mono text-pink-200/80">
            <span className="bg-black/30 px-1.5 py-0.5 rounded">PASTEL DREAM CANDY</span>
          </div>
        </>
      )}

      {/* 27. LOMO */}
      {cameraType === 'lomo' && (
        <>
          <div className="flex justify-between items-start text-xs font-bold text-amber-500 drop-shadow-[0_0_6px_rgba(245,158,11,0.8)]">
            <span className="bg-black/50 px-2 py-0.5 rounded">LOMOGRAPHY LC-A 32mm</span>
          </div>
          <div className="flex justify-end items-end text-[10px] font-sans italic text-white/90">
            <span className="bg-black/50 px-2 py-0.5 rounded">"DON'T THINK, JUST SHOOT!"</span>
          </div>
        </>
      )}

      {/* 28. LUMINA */}
      {cameraType === 'lumina' && (
        <>
          <div className="flex justify-between items-start text-xs font-bold text-slate-100 drop-shadow-[0_0_8px_rgba(255,255,255,0.9)]">
            <span className="bg-black/40 px-2 py-0.5 rounded">LUMINA HIGH-KEY • GLOW</span>
          </div>
          <div className="flex justify-end items-end text-[10px] font-mono text-slate-200/80">
            <span className="bg-black/30 px-1.5 py-0.5 rounded">ETHEREAL DIFFUSION BLOOM</span>
          </div>
        </>
      )}

      {/* 29. ULTRAGOLD */}
      {cameraType === 'ultragold' && (
        <>
          <div className="flex justify-between items-start text-xs font-bold text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.9)]">
            <span className="bg-black/40 px-2 py-0.5 rounded">👑 ULTRAGOLD 24K</span>
            <span className="bg-black/40 px-1.5 py-0.5 rounded text-[10px] text-amber-200">LUXE</span>
          </div>
          <div className="flex justify-end items-end text-[10px] font-mono text-amber-200/80">
            <span className="bg-black/30 px-1.5 py-0.5 rounded">24 KARAT GOLD EMULSION</span>
          </div>
        </>
      )}

      {/* 30. RETRA */}
      {cameraType === 'retra' && (
        <>
          <div className="flex justify-between items-start text-xs font-serif font-bold text-amber-600">
            <span className="bg-black/40 px-2 py-0.5 rounded">RETRA 1974 • VINTAGE FILM</span>
          </div>
          <div className="flex justify-end items-end text-[10px] font-mono text-amber-300/70">
            <span className="bg-black/30 px-1.5 py-0.5 rounded">AGED SEPIA 70S</span>
          </div>
        </>
      )}

      {/* 31. VHS */}
      {cameraType === 'vhs' && (
        <>
          <div className="flex justify-between items-start font-mono text-xs font-bold text-cyan-400 drop-shadow-[0_0_6px_rgba(6,182,212,0.8)]">
            <div className="flex items-center space-x-3 bg-black/60 px-2 py-0.5 rounded">
              <span className="text-cyan-300">PLAY ▶</span>
              <span className="text-white/80">SP  0:00:12</span>
            </div>
            <span className="bg-black/60 px-2 py-0.5 rounded text-cyan-400">CH 03</span>
          </div>

          <div className="flex justify-between items-end font-mono text-xs text-white">
            <span className="bg-black/60 px-2 py-0.5 rounded text-cyan-200">{getFormattedDateStamp('vhs-white')}</span>
            <span className="bg-black/60 px-2 py-0.5 rounded text-cyan-400">HI-FI STEREO</span>
          </div>

          {/* Rainbow bottom tracking stripe */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-amber-400 via-emerald-400 via-blue-500 to-purple-500 opacity-90" />
        </>
      )}

      {/* 32. TZACHROME */}
      {cameraType === 'tzachrome' && (
        <>
          <div className="flex justify-between items-start text-xs font-bold text-red-500 drop-shadow-[0_0_6px_rgba(239,68,68,0.8)]">
            <span className="bg-black/40 px-2 py-0.5 rounded">TZACHROME COLOR SLIDE</span>
            <span className="text-white/80 text-[10px] bg-black/40 px-1.5 py-0.5 rounded font-mono">ISO 64</span>
          </div>
          <div className="flex justify-end items-end text-[10px] font-mono text-white/80">
            <span className="bg-black/30 px-1.5 py-0.5 rounded">PROCESS K-14</span>
          </div>
        </>
      )}

      {/* 33. LO-FI */}
      {cameraType === 'lofi' && (
        <>
          <div className="flex justify-between items-start font-mono text-xs text-yellow-400">
            <span className="bg-black/40 px-2 py-0.5 rounded">[ ◉ ◉ ] LO-FI CASSETTE 90</span>
            <span className="bg-black/40 px-1.5 py-0.5 rounded text-[10px] text-white/70">STEREO CH A</span>
          </div>
          <div className="flex justify-end items-end text-[10px] font-mono text-yellow-200/70">
            <span className="bg-black/30 px-1.5 py-0.5 rounded">MUTED NOSTALGIA</span>
          </div>
        </>
      )}

      {/* 34. PHOTOBOOTH */}
      {cameraType === 'photobooth' && (
        <>
          <div className="flex justify-between items-start text-xs font-bold text-white">
            <span className="bg-black/60 px-2 py-0.5 rounded">PHOTO BOOTH • NYC</span>
            <span className="text-white/80 text-[10px] bg-black/60 px-1.5 py-0.5 rounded font-mono">4 POSES • 25¢</span>
          </div>
          <div className="flex justify-end items-end text-[10px] font-mono text-white/80">
            <span className="bg-black/60 px-2 py-0.5 rounded">[ 03 / 04 ]</span>
          </div>
        </>
      )}

      {/* 35. CINESTIL */}
      {cameraType === 'cinestil' && (
        <>
          <div className="flex justify-between items-start text-xs font-bold text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.95)]">
            <span className="bg-black/50 px-2 py-0.5 rounded flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span>CINESTILL 800T • TUNGSTEN</span>
            </span>
          </div>
          <div className="flex justify-end items-end text-[10px] font-mono text-red-200/80">
            <span className="bg-black/40 px-1.5 py-0.5 rounded">EI 800/30° • REMJET OFF</span>
          </div>
        </>
      )}

      {/* 36. 8MM */}
      {cameraType === '8mm' && (
        <>
          <div className="flex justify-between items-start font-mono text-xs text-amber-500">
            <span className="bg-black/50 px-2 py-0.5 rounded">8MM HOME MOVIE • 1965</span>
            <span className="text-amber-200/70 text-[10px] bg-black/40 px-1.5 py-0.5 rounded">KODACHROME II</span>
          </div>
          <div className="flex justify-end items-end text-[10px] font-mono text-amber-300/70">
            <span className="bg-black/40 px-1.5 py-0.5 rounded">ROUNDED GATE 16 FPS</span>
          </div>
        </>
      )}

      {/* 37. 16MM */}
      {cameraType === '16mm' && (
        <>
          <div className="flex justify-between items-start font-mono text-xs text-sky-400">
            <span className="bg-black/40 px-2 py-0.5 rounded">16MM KODAK VISION3 250D</span>
            <span className="text-white/70 text-[10px] bg-black/40 px-1.5 py-0.5 rounded">EASTMAN 7207</span>
          </div>
          <div className="flex justify-end items-end text-[10px] font-mono text-sky-200/80">
            <span className="bg-black/30 px-1.5 py-0.5 rounded">16MM CINEMA EMULSION</span>
          </div>
        </>
      )}

      {/* 38. SUPER8 */}
      {cameraType === 'super8' && (
        <>
          <div className="flex justify-between items-start text-xs font-bold text-orange-500 drop-shadow-[0_0_6px_rgba(249,115,22,0.8)]">
            <span className="bg-black/40 px-2 py-0.5 rounded">SUPER 8 KODACHROME 40</span>
            <span className="text-white/80 text-[10px] bg-black/40 px-1.5 py-0.5 rounded font-mono">SOUND 18 FPS</span>
          </div>
          <div className="flex justify-end items-end text-[10px] font-mono text-orange-200/80">
            <span className="bg-black/30 px-1.5 py-0.5 rounded">MAGNETIC SOUND STRIPE</span>
          </div>
        </>
      )}

      {/* 39. SUPER16 */}
      {cameraType === 'super16' && (
        <>
          <div className="flex justify-between items-start font-mono text-xs font-bold text-teal-400 drop-shadow-[0_0_6px_rgba(20,184,166,0.8)]">
            <span className="bg-black/40 px-2 py-0.5 rounded">SUPER 16MM CINEMA 500T</span>
            <span className="text-white/70 text-[10px] bg-black/40 px-1.5 py-0.5 rounded">16:9 WIDE</span>
          </div>

          {/* Center Crosshair */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-white/40 font-mono text-sm">+</span>
          </div>

          <div className="flex justify-end items-end text-[10px] font-mono text-teal-200/80">
            <span className="bg-black/30 px-1.5 py-0.5 rounded">TUNGSTEN CINEMA EMULSION</span>
          </div>
        </>
      )}
    </div>
  );
};
