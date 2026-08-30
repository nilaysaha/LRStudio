import { CameraType, DateStampSettings, DateStampStyle } from '../types';

/**
 * Formats a retro date stamp string based on style and custom settings
 */
export function getFormattedDateStamp(
  format: DateStampStyle | 'none',
  includeTime: boolean = false,
  customDate?: string,
  customTime?: string
) {
  let d = new Date();
  if (customDate) {
    const parsed = new Date(customDate);
    if (!isNaN(parsed.getTime())) {
      d = parsed;
    }
  }

  const yy = String(d.getFullYear()).slice(-2);
  const fullYear = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  
  let hh = String(d.getHours()).padStart(2, '0');
  let min = String(d.getMinutes()).padStart(2, '0');
  let ss = String(d.getSeconds()).padStart(2, '0');

  if (customTime) {
    const parts = customTime.split(':');
    if (parts.length >= 2) {
      hh = parts[0].padStart(2, '0');
      min = parts[1].padStart(2, '0');
      if (parts[2]) ss = parts[2].padStart(2, '0');
    }
  }

  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const monthName = months[d.getMonth()] || 'OCT';

  switch (format) {
    case 'led-orange':
      return includeTime ? `'${yy} ${mm} ${dd}  ${hh}:${min}` : `'${yy} ${mm} ${dd}`;
    case 'led-red':
      return includeTime ? `${dd} ${mm} '${yy}  ${hh}:${min}` : `${dd} ${mm} '${yy}`;
    case 'y2k-yellow':
      return includeTime ? `${fullYear}.${mm}.${dd}  ${hh}:${min}` : `${fullYear}.${mm}.${dd}`;
    case 'camcorder-green':
      return includeTime ? `${monthName} ${dd} ${fullYear}  ${hh}:${min}:${ss}` : `${monthName} ${dd} ${fullYear}`;
    case 'vhs-white':
      return includeTime ? `${dd}.${mm}.${fullYear}  ${hh}:${min}:${ss}` : `${dd}.${mm}.${fullYear}`;
    case 'handicam-white':
      return includeTime ? `REC  ${monthName} ${dd} '${yy}  0:${min}:${ss}` : `REC  ${monthName} ${dd} '${yy}`;
    case 'film-gold':
      return includeTime ? `★ KODAK '${yy} ${mm} ${dd}  ${hh}:${min}` : `★ KODAK '${yy} ${mm} ${dd}`;
    case 'classic-white':
      return includeTime ? `${fullYear}-${mm}-${dd} • ${hh}:${min}` : `${fullYear}-${mm}-${dd}`;
    default:
      return includeTime ? `${fullYear}.${mm}.${dd}  ${hh}:${min}` : `${fullYear}.${mm}.${dd}`;
  }
}

/**
 * Superimpose customizable Date & Time Stamp onto any Canvas 2D context
 */
export function renderDateStampOnCanvas(
  ctx: CanvasRenderingContext2D,
  settings: DateStampSettings,
  width: number,
  height: number
) {
  if (!settings || !settings.enabled) return;

  const baseScale = (Math.min(width, height) / 1000) * (settings.size || 1.0);
  const padX = Math.max(16, Math.round(28 * (Math.min(width, height) / 1000)));
  const padY = Math.max(16, Math.round(28 * (Math.min(width, height) / 1000)));

  const text = getFormattedDateStamp(
    settings.style || 'led-orange',
    settings.includeTime,
    settings.customDate,
    settings.customTime
  );

  ctx.save();
  ctx.globalAlpha = Math.min(1.0, Math.max(0.1, settings.opacity || 0.95));

  const fontSize = Math.max(13, Math.round(26 * baseScale));

  // Style configurations
  switch (settings.style) {
    case 'led-orange':
      ctx.font = `bold ${fontSize}px "Courier New", "Digital-7", monospace`;
      ctx.fillStyle = '#FF7A00';
      ctx.shadowColor = 'rgba(255, 120, 0, 0.85)';
      ctx.shadowBlur = Math.round(8 * baseScale);
      break;

    case 'led-red':
      ctx.font = `bold ${fontSize}px "Courier New", monospace`;
      ctx.fillStyle = '#EF4444';
      ctx.shadowColor = 'rgba(239, 68, 68, 0.85)';
      ctx.shadowBlur = Math.round(8 * baseScale);
      break;

    case 'y2k-yellow':
      ctx.font = `bold ${fontSize}px "Courier New", monospace`;
      ctx.fillStyle = '#FACC15';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
      ctx.shadowBlur = Math.round(4 * baseScale);
      break;

    case 'camcorder-green':
      ctx.font = `bold ${fontSize}px "Courier New", monospace`;
      ctx.fillStyle = '#22C55E';
      ctx.shadowColor = 'rgba(34, 197, 94, 0.8)';
      ctx.shadowBlur = Math.round(6 * baseScale);
      break;

    case 'vhs-white':
      ctx.font = `bold ${fontSize}px "Courier New", monospace`;
      ctx.fillStyle = '#F3F4F6';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = Math.round(5 * baseScale);
      break;

    case 'handicam-white':
      ctx.font = `600 ${fontSize}px "Courier New", monospace`;
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = Math.round(4 * baseScale);
      break;

    case 'film-gold':
      ctx.font = `bold ${fontSize}px "Courier New", monospace`;
      ctx.fillStyle = '#F59E0B';
      ctx.shadowColor = 'rgba(245, 158, 11, 0.8)';
      ctx.shadowBlur = Math.round(6 * baseScale);
      break;

    case 'classic-white':
    default:
      ctx.font = `500 ${fontSize}px "Helvetica Neue", sans-serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
      ctx.shadowBlur = Math.round(3 * baseScale);
      break;
  }

  const textMetrics = ctx.measureText(text);
  const textWidth = textMetrics.width;
  const textHeight = fontSize;

  let x = width - padX - textWidth;
  let y = height - padY;

  switch (settings.position) {
    case 'bottom-left':
      x = padX;
      y = height - padY;
      break;
    case 'top-right':
      x = width - padX - textWidth;
      y = padY + textHeight;
      break;
    case 'top-left':
      x = padX;
      y = padY + textHeight;
      break;
    case 'bottom-right':
    default:
      x = width - padX - textWidth;
      y = height - padY;
      break;
  }

  ctx.fillText(text, x, y);
  ctx.restore();
}

/**
 * Renders authentic on-image features, stamps, HUDs, sprockets and badges for all 39 camera types onto any HTML5 2D Canvas context.
 */
export function renderCameraOverlayOnCanvas(
  ctx: CanvasRenderingContext2D,
  cameraType: CameraType,
  width: number,
  height: number
) {
  if (!cameraType || cameraType === 'none') return;

  const baseScale = Math.min(width, height) / 1000;
  const pad = Math.max(16, Math.round(24 * baseScale));

  ctx.save();

  switch (cameraType) {
    case 'disposable': {
      // 1. 90s Orange LED Date Stamp
      const fontSize = Math.max(14, Math.round(26 * baseScale));
      ctx.font = `bold ${fontSize}px "Courier New", monospace`;
      ctx.fillStyle = '#FF7A00';
      ctx.shadowColor = 'rgba(255, 120, 0, 0.85)';
      ctx.shadowBlur = Math.round(8 * baseScale);
      const dateText = getFormattedDateStamp('led-orange');
      ctx.fillText(dateText, width - pad - ctx.measureText(dateText).width, height - pad);
      
      // Top right disposable film count mark
      ctx.font = `600 ${Math.max(10, Math.round(14 * baseScale))}px monospace`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.shadowBlur = 0;
      ctx.fillText('27 EXP • ISO 400', width - pad - Math.round(110 * baseScale), pad + Math.round(14 * baseScale));
      break;
    }

    case 'fling35': {
      // Top Fling 35 mark
      ctx.font = `700 ${Math.max(11, Math.round(16 * baseScale))}px monospace`;
      ctx.fillStyle = '#EF4444';
      ctx.shadowColor = 'rgba(239, 68, 68, 0.6)';
      ctx.shadowBlur = 4;
      ctx.fillText('FLING 35 - 27 EXP', pad, pad + Math.round(16 * baseScale));

      // Orange frame counter
      ctx.font = `bold ${Math.max(12, Math.round(18 * baseScale))}px monospace`;
      ctx.fillStyle = '#F97316';
      ctx.fillText('[ 18 ] ▲ 18A', width - pad - Math.round(120 * baseScale), height - pad);
      break;
    }

    case 'kodak-gold': {
      // Kodak Gold 200 film edge text
      const fontSize = Math.max(10, Math.round(15 * baseScale));
      ctx.font = `700 ${fontSize}px monospace`;
      ctx.fillStyle = '#F59E0B';
      ctx.shadowColor = 'rgba(245, 158, 11, 0.7)';
      ctx.shadowBlur = 3;
      ctx.fillText('★ KODAK GOLD 200', pad, pad + fontSize);
      ctx.fillText('GB 200-7 • 24A', width - pad - Math.round(130 * baseScale), height - pad);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.fillText('SAFETY FILM', width - pad - Math.round(110 * baseScale), pad + fontSize);
      break;
    }

    case 'klasse': {
      // Sleek titanium badge
      const fontSize = Math.max(10, Math.round(14 * baseScale));
      ctx.font = `600 ${fontSize}px "Helvetica Neue", sans-serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.letterSpacing = '1px';
      ctx.fillText('FUJIFILM KLASSE • 38mm F2.6', pad, height - pad);
      ctx.font = `500 ${Math.max(9, Math.round(12 * baseScale))}px monospace`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.fillText('[ f/2.8  1/250s  ISO 400 ]', width - pad - Math.round(170 * baseScale), height - pad);
      break;
    }

    case 'polaroid': {
      // Classic Polaroid bottom script & rainbow badge
      const fontSize = Math.max(12, Math.round(18 * baseScale));
      ctx.font = `italic 600 ${fontSize}px "Times New Roman", serif`;
      ctx.fillStyle = '#4A453E';
      ctx.fillText('Polaroid Instant • 600', pad + 10, height - pad + 4);

      // Rainbow color stripe indicator
      const stripeW = Math.round(8 * baseScale);
      const stripeH = Math.round(14 * baseScale);
      const startX = width - pad - stripeW * 5 - 10;
      const colors = ['#EF4444', '#F97316', '#FACC15', '#22C55E', '#3B82F6'];
      colors.forEach((col, i) => {
        ctx.fillStyle = col;
        ctx.fillRect(startX + i * stripeW, height - pad - stripeH + 6, stripeW, stripeH);
      });
      break;
    }

    case 'paradiso': {
      ctx.font = `bold ${Math.max(11, Math.round(16 * baseScale))}px sans-serif`;
      ctx.fillStyle = '#06B6D4';
      ctx.shadowColor = 'rgba(6, 182, 212, 0.5)';
      ctx.shadowBlur = 4;
      ctx.fillText('PARADISO 35mm • ISO 400', pad, height - pad);
      ctx.font = `600 ${Math.max(10, Math.round(13 * baseScale))}px monospace`;
      ctx.fillStyle = '#F59E0B';
      ctx.fillText('SUMMER RIVIERA', width - pad - Math.round(120 * baseScale), height - pad);
      break;
    }

    case 'calagold': {
      ctx.font = `800 ${Math.max(11, Math.round(16 * baseScale))}px sans-serif`;
      ctx.fillStyle = '#D97706';
      ctx.shadowColor = 'rgba(217, 119, 6, 0.7)';
      ctx.shadowBlur = 6;
      ctx.fillText('CALIFORNIA GOLD • 35MM', pad, height - pad);
      ctx.font = `600 ${Math.max(9, Math.round(13 * baseScale))}px monospace`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fillText('PACIFIC COAST • GOLDEN HOUR', width - pad - Math.round(200 * baseScale), height - pad);
      break;
    }

    case 'sunshot07': {
      // Bright yellow 2007 Y2K Digital Clock Stamp
      const fontSize = Math.max(13, Math.round(22 * baseScale));
      ctx.font = `bold ${fontSize}px "Courier New", monospace`;
      ctx.fillStyle = '#FACC15';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 4;
      const dateText = getFormattedDateStamp('y2k-yellow');
      ctx.fillText(dateText, width - pad - ctx.measureText(dateText).width, height - pad);

      // Top battery & camera HUD
      ctx.font = `bold ${Math.max(10, Math.round(13 * baseScale))}px monospace`;
      ctx.fillStyle = '#FACC15';
      ctx.fillText('SUNSHOT 07 • 7.1MP', pad, pad + Math.round(14 * baseScale));
      ctx.fillText('BATTERY [███] ⚡', width - pad - Math.round(130 * baseScale), pad + Math.round(14 * baseScale));
      break;
    }

    case 'solare17': {
      ctx.font = `700 ${Math.max(11, Math.round(16 * baseScale))}px sans-serif`;
      ctx.fillStyle = '#EA580C';
      ctx.shadowColor = 'rgba(234, 88, 12, 0.6)';
      ctx.shadowBlur = 4;
      ctx.fillText('☀ SOLARE 17 • ANALOG', pad, height - pad);
      break;
    }

    case 'prima': {
      // 90s Red LED Date Stamp
      const fontSize = Math.max(14, Math.round(24 * baseScale));
      ctx.font = `bold ${fontSize}px "Courier New", monospace`;
      ctx.fillStyle = '#EF4444';
      ctx.shadowColor = 'rgba(239, 68, 68, 0.9)';
      ctx.shadowBlur = Math.round(6 * baseScale);
      const dateText = getFormattedDateStamp('led-red');
      ctx.fillText(dateText, width - pad - ctx.measureText(dateText).width, height - pad);

      ctx.font = `700 ${Math.max(10, Math.round(13 * baseScale))}px sans-serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.shadowBlur = 0;
      ctx.fillText('CANON PRIMA AF • AUTO DATE', pad, height - pad);
      break;
    }

    case 'novagold': {
      ctx.font = `800 ${Math.max(11, Math.round(16 * baseScale))}px sans-serif`;
      ctx.fillStyle = '#FBBF24';
      ctx.shadowColor = 'rgba(251, 191, 36, 0.8)';
      ctx.shadowBlur = 6;
      ctx.fillText('✦ NOVA GOLD 400 ✦', pad, height - pad);
      ctx.font = `500 ${Math.max(9, Math.round(12 * baseScale))}px monospace`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.fillText('CELESTIAL EMULSION', width - pad - Math.round(140 * baseScale), height - pad);
      break;
    }

    case 'moka-v': {
      ctx.font = `700 ${Math.max(11, Math.round(15 * baseScale))}px sans-serif`;
      ctx.fillStyle = '#D97706';
      ctx.fillText('MOKA V • 400', pad, height - pad);
      ctx.font = `500 ${Math.max(9, Math.round(12 * baseScale))}px monospace`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.fillText('DARK ROAST CHROMATIC', width - pad - Math.round(160 * baseScale), height - pad);
      break;
    }

    case '5cam': {
      ctx.font = `800 ${Math.max(11, Math.round(15 * baseScale))}px monospace`;
      ctx.fillStyle = '#A78BFA';
      ctx.shadowColor = 'rgba(167, 139, 250, 0.6)';
      ctx.shadowBlur = 4;
      ctx.fillText('5CAM 3D STEREO [1][2][3][4][5]', pad, height - pad);
      break;
    }

    case 'asteria': {
      ctx.font = `700 ${Math.max(11, Math.round(16 * baseScale))}px sans-serif`;
      ctx.fillStyle = '#C084FC';
      ctx.shadowColor = 'rgba(192, 132, 252, 0.8)';
      ctx.shadowBlur = 6;
      ctx.fillText('✦ ✧ ASTERIA CELESTIAL • 800 ✧ ✦', pad, height - pad);
      break;
    }

    case 'natura': {
      ctx.font = `700 ${Math.max(11, Math.round(15 * baseScale))}px sans-serif`;
      ctx.fillStyle = '#34D399';
      ctx.shadowColor = 'rgba(52, 211, 153, 0.6)';
      ctx.shadowBlur = 4;
      ctx.fillText('FUJIFILM NATURA 1600 • NP', pad, height - pad);
      ctx.font = `500 ${Math.max(9, Math.round(12 * baseScale))}px monospace`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillText('NATURAL AMBIENT LIGHT', width - pad - Math.round(170 * baseScale), height - pad);
      break;
    }

    case 'aurea': {
      ctx.font = `800 ${Math.max(11, Math.round(16 * baseScale))}px sans-serif`;
      ctx.fillStyle = '#F59E0B';
      ctx.shadowColor = 'rgba(245, 158, 11, 0.9)';
      ctx.shadowBlur = 8;
      ctx.fillText('✺ AUREA GLOW • 200', pad, height - pad);
      break;
    }

    case 'fuji400': {
      const fontSize = Math.max(10, Math.round(14 * baseScale));
      ctx.font = `700 ${fontSize}px monospace`;
      ctx.fillStyle = '#10B981';
      ctx.fillText('FUJICOLOR SUPERIA 400', pad, pad + fontSize);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.fillText('PROCESS CN-16 • 36 EXP', width - pad - Math.round(170 * baseScale), height - pad);
      break;
    }

    case 'velour': {
      ctx.font = `italic 700 ${Math.max(12, Math.round(17 * baseScale))}px "Times New Roman", serif`;
      ctx.fillStyle = '#F43F5E';
      ctx.shadowColor = 'rgba(244, 63, 94, 0.6)';
      ctx.shadowBlur = 4;
      ctx.fillText('Velour 100 • Fine Grain', pad, height - pad);
      break;
    }

    case 'lunaria': {
      ctx.font = `700 ${Math.max(11, Math.round(16 * baseScale))}px sans-serif`;
      ctx.fillStyle = '#E2E8F0';
      ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
      ctx.shadowBlur = 4;
      ctx.fillText('☾ LUNARIA 400 • MONOCHROME', pad, height - pad);
      break;
    }

    case 'velvia': {
      ctx.font = `800 ${Math.max(11, Math.round(15 * baseScale))}px sans-serif`;
      ctx.fillStyle = '#3B82F6';
      ctx.fillText('FUJICHROME VELVIA 50 • RVP', pad, height - pad);
      ctx.font = `600 ${Math.max(9, Math.round(12 * baseScale))}px monospace`;
      ctx.fillStyle = '#EF4444';
      ctx.fillText('COLOR REVERSAL FILM', width - pad - Math.round(150 * baseScale), height - pad);
      break;
    }

    case 'ilford': {
      ctx.font = `800 ${Math.max(11, Math.round(15 * baseScale))}px sans-serif`;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('ILFORD HP5 PLUS 400', pad, height - pad);
      ctx.font = `600 ${Math.max(9, Math.round(12 * baseScale))}px monospace`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillText('SAFETY FILM • ILFORD ENGLAND', width - pad - Math.round(200 * baseScale), height - pad);
      break;
    }

    case 'curva': {
      // Widescreen 2.39:1 crop bar mark
      ctx.font = `700 ${Math.max(10, Math.round(14 * baseScale))}px monospace`;
      ctx.fillStyle = '#38BDF8';
      ctx.shadowColor = 'rgba(56, 189, 248, 0.7)';
      ctx.shadowBlur = 4;
      ctx.fillText('CURVA ANAMORPHIC • 2.39:1', pad, height - pad);
      break;
    }

    case 'camcorder': {
      // 90s Hi8 Video Camcorder HUD
      const fontSize = Math.max(12, Math.round(18 * baseScale));
      ctx.font = `bold ${fontSize}px monospace`;
      
      // Top REC in Red
      ctx.fillStyle = '#EF4444';
      ctx.shadowColor = 'rgba(239, 68, 68, 0.8)';
      ctx.shadowBlur = 4;
      ctx.fillText('● REC', pad, pad + fontSize);

      // SP & Battery in Green
      ctx.fillStyle = '#22C55E';
      ctx.shadowColor = 'rgba(34, 197, 94, 0.8)';
      ctx.shadowBlur = 3;
      ctx.fillText('SP', pad + Math.round(80 * baseScale), pad + fontSize);
      ctx.fillText('BATTERY [|||]', width - pad - Math.round(140 * baseScale), pad + fontSize);

      // Bottom Tape counter & Date stamp
      const tapeText = 'TAPE 0:24:18';
      ctx.fillText(tapeText, pad, height - pad);
      const timeStamp = getFormattedDateStamp('camcorder-green');
      ctx.fillText(timeStamp, width - pad - ctx.measureText(timeStamp).width, height - pad);
      break;
    }

    case 'handicam': {
      // 2000s Handycam HUD
      const fontSize = Math.max(11, Math.round(16 * baseScale));
      ctx.font = `bold ${fontSize}px monospace`;
      ctx.fillStyle = '#38BDF8';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 3;

      ctx.fillText('STBY', pad, pad + fontSize);
      ctx.fillText('D.ZOOM 10x', pad + Math.round(80 * baseScale), pad + fontSize);
      ctx.fillText('HQ 60i', width - pad - Math.round(80 * baseScale), pad + fontSize);

      // Optical Center Crosshairs
      const cx = width / 2;
      const cy = height / 2;
      const chSize = Math.round(18 * baseScale);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      // center crosshair
      ctx.moveTo(cx - chSize, cy); ctx.lineTo(cx + chSize, cy);
      ctx.moveTo(cx, cy - chSize); ctx.lineTo(cx, cy + chSize);
      ctx.stroke();

      // Bottom Time
      const timeText = getFormattedDateStamp('handicam-white');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(timeText, width - pad - ctx.measureText(timeText).width, height - pad);
      break;
    }

    case 'digiscan': {
      const fontSize = Math.max(10, Math.round(14 * baseScale));
      ctx.font = `700 ${fontSize}px monospace`;
      ctx.fillStyle = '#94A3B8';
      ctx.fillText('DIGISCAN CCD-700 • 3.2 MEGAPIXELS', pad, height - pad);
      break;
    }

    case 'pinky': {
      ctx.font = `800 ${Math.max(12, Math.round(18 * baseScale))}px sans-serif`;
      ctx.fillStyle = '#F472B6';
      ctx.shadowColor = 'rgba(244, 114, 182, 0.8)';
      ctx.shadowBlur = 5;
      ctx.fillText('♥ PINKY POP ★ TOY CAM ♥', pad, height - pad);
      break;
    }

    case 'lomo': {
      ctx.font = `800 ${Math.max(11, Math.round(16 * baseScale))}px sans-serif`;
      ctx.fillStyle = '#F59E0B';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 4;
      ctx.fillText('LOMOGRAPHY LC-A • 32mm', pad, height - pad);
      ctx.font = `italic 600 ${Math.max(9, Math.round(12 * baseScale))}px sans-serif`;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('"DON\'T THINK, JUST SHOOT!"', width - pad - Math.round(170 * baseScale), height - pad);
      break;
    }

    case 'lumina': {
      ctx.font = `800 ${Math.max(11, Math.round(16 * baseScale))}px sans-serif`;
      ctx.fillStyle = '#F8FAFC';
      ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
      ctx.shadowBlur = 6;
      ctx.fillText('LUMINA HIGH-KEY • GLOW', pad, height - pad);
      break;
    }

    case 'ultragold': {
      ctx.font = `800 ${Math.max(12, Math.round(17 * baseScale))}px sans-serif`;
      ctx.fillStyle = '#FBBF24';
      ctx.shadowColor = 'rgba(251, 191, 36, 0.9)';
      ctx.shadowBlur = 6;
      ctx.fillText('👑 ULTRAGOLD 24K • LUXE', pad, height - pad);
      ctx.font = `600 ${Math.max(9, Math.round(12 * baseScale))}px monospace`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fillText('24 KARAT GOLD GRADE', width - pad - Math.round(160 * baseScale), height - pad);
      break;
    }

    case 'retra': {
      ctx.font = `700 ${Math.max(11, Math.round(16 * baseScale))}px "Times New Roman", serif`;
      ctx.fillStyle = '#D97706';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 3;
      ctx.fillText('RETRA 1974 • VINTAGE FILM', pad, height - pad);
      break;
    }

    case 'vhs': {
      // Authentic VHS HUD
      const fontSize = Math.max(13, Math.round(20 * baseScale));
      ctx.font = `bold ${fontSize}px monospace`;
      ctx.fillStyle = '#06B6D4';
      ctx.shadowColor = 'rgba(6, 182, 212, 0.8)';
      ctx.shadowBlur = 4;
      ctx.fillText('PLAY ▶', pad, pad + fontSize);
      ctx.fillText('SP  0:00:12', pad + Math.round(110 * baseScale), pad + fontSize);
      ctx.fillText('CH 03', width - pad - Math.round(70 * baseScale), pad + fontSize);

      const timeText = getFormattedDateStamp('vhs-white');
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.fillText(timeText, pad, height - pad - Math.round(8 * baseScale));

      // VHS rainbow tracking noise line at bottom
      const trackH = Math.max(3, Math.round(5 * baseScale));
      const grad = ctx.createLinearGradient(0, 0, width, 0);
      grad.addColorStop(0, '#EF4444');
      grad.addColorStop(0.2, '#F59E0B');
      grad.addColorStop(0.4, '#10B981');
      grad.addColorStop(0.6, '#3B82F6');
      grad.addColorStop(0.8, '#8B5CF6');
      grad.addColorStop(1, '#EC4899');
      ctx.fillStyle = grad;
      ctx.fillRect(0, height - trackH, width, trackH);
      break;
    }

    case 'tzachrome': {
      ctx.font = `800 ${Math.max(11, Math.round(15 * baseScale))}px sans-serif`;
      ctx.fillStyle = '#EF4444';
      ctx.shadowColor = 'rgba(239, 68, 68, 0.6)';
      ctx.shadowBlur = 4;
      ctx.fillText('TZACHROME COLOR SLIDE • ISO 64', pad, height - pad);
      ctx.font = `600 ${Math.max(9, Math.round(12 * baseScale))}px monospace`;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('PROCESS K-14', width - pad - Math.round(110 * baseScale), height - pad);
      break;
    }

    case 'lofi': {
      ctx.font = `700 ${Math.max(11, Math.round(16 * baseScale))}px monospace`;
      ctx.fillStyle = '#EAB308';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 3;
      ctx.fillText('[ ◉ ◉ ] LO-FI CASSETTE 90', pad, height - pad);
      ctx.font = `500 ${Math.max(9, Math.round(12 * baseScale))}px monospace`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillText('STEREO CH A', width - pad - Math.round(110 * baseScale), height - pad);
      break;
    }

    case 'photobooth': {
      ctx.font = `800 ${Math.max(11, Math.round(16 * baseScale))}px sans-serif`;
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 4;
      ctx.fillText('PHOTO BOOTH • NYC', pad, height - pad);
      ctx.font = `600 ${Math.max(9, Math.round(13 * baseScale))}px monospace`;
      ctx.fillText('4 POSES • 25¢  [03 / 04]', width - pad - Math.round(190 * baseScale), height - pad);
      break;
    }

    case 'cinestil': {
      // CineStill 800T tungsten stamp with red halation glow dot
      const fontSize = Math.max(11, Math.round(16 * baseScale));
      ctx.font = `800 ${fontSize}px sans-serif`;
      ctx.fillStyle = '#EF4444';
      ctx.shadowColor = 'rgba(239, 68, 68, 0.95)';
      ctx.shadowBlur = 8;
      ctx.fillText('● CINESTILL 800T • TUNGSTEN', pad, height - pad);

      ctx.font = `600 ${Math.max(9, Math.round(12 * baseScale))}px monospace`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.shadowBlur = 0;
      ctx.fillText('EI 800/30° • REMJET OFF', width - pad - Math.round(180 * baseScale), height - pad);
      break;
    }

    case '8mm': {
      ctx.font = `700 ${Math.max(11, Math.round(16 * baseScale))}px monospace`;
      ctx.fillStyle = '#F59E0B';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 4;
      ctx.fillText('8MM HOME MOVIE • 1965', pad, height - pad);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillText('KODACHROME II', width - pad - Math.round(130 * baseScale), height - pad);
      break;
    }

    case '16mm': {
      const fontSize = Math.max(10, Math.round(15 * baseScale));
      ctx.font = `700 ${fontSize}px monospace`;
      ctx.fillStyle = '#38BDF8';
      ctx.fillText('16MM KODAK VISION3 250D', pad, pad + fontSize);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.fillText('EASTMAN 7207 • 16MM', width - pad - Math.round(170 * baseScale), height - pad);
      break;
    }

    case 'super8': {
      ctx.font = `800 ${Math.max(11, Math.round(16 * baseScale))}px sans-serif`;
      ctx.fillStyle = '#F97316';
      ctx.shadowColor = 'rgba(249, 115, 22, 0.7)';
      ctx.shadowBlur = 4;
      ctx.fillText('SUPER 8 KODACHROME 40', pad, height - pad);
      ctx.font = `600 ${Math.max(9, Math.round(12 * baseScale))}px monospace`;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('SOUND • 18 FPS', width - pad - Math.round(130 * baseScale), height - pad);
      break;
    }

    case 'super16': {
      ctx.font = `800 ${Math.max(11, Math.round(15 * baseScale))}px monospace`;
      ctx.fillStyle = '#14B8A6';
      ctx.shadowColor = 'rgba(20, 184, 166, 0.6)';
      ctx.shadowBlur = 4;
      ctx.fillText('SUPER 16MM CINEMA • 500T', pad, height - pad);

      // Center crosshair
      const cx = width / 2;
      const cy = height / 2;
      const size = Math.round(12 * baseScale);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - size, cy); ctx.lineTo(cx + size, cy);
      ctx.moveTo(cx, cy - size); ctx.lineTo(cx, cy + size);
      ctx.stroke();
      break;
    }

    default:
      break;
  }

  ctx.restore();
}
