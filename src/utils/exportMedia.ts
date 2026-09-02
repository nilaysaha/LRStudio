import { Adjustments, MediaItem, CollageTemplate, TemplateSlot, Project } from '../types';
import { WebGLFilterEngine } from '../webgl/webglEngine';
import { renderCameraOverlayOnCanvas, renderDateStampOnCanvas } from './cameraOverlayRenderer';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';

export interface ExportOptions {
  format: 'image/jpeg' | 'image/png' | 'image/webp' | 'video/webm' | 'video/mp4';
  quality: number; // 0.1 to 1.0
  scale: number; // 1 = 100%, 2 = 200%
  filename?: string;
  onProgress?: (progress: number) => void;
}

/**
 * Renders high-resolution image with WebGL filters and optional Frame borders
 */
export async function exportPhoto(
  media: MediaItem,
  adjustments: Adjustments,
  options: ExportOptions
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const targetW = Math.round(img.naturalWidth * options.scale);
        const targetH = Math.round(img.naturalHeight * options.scale);

        // 1. Render through WebGL Filter Engine
        const webglCanvas = document.createElement('canvas');
        webglCanvas.width = targetW;
        webglCanvas.height = targetH;

        const engine = new WebGLFilterEngine(webglCanvas);
        engine.setSource(img);
        engine.uploadTexture();
        engine.render(adjustments, 'none', 0.5, 1.0);

        // 2. If frame or crop is applied, composit onto 2D canvas
        let finalCanvas = webglCanvas;

        if (adjustments.frameType !== 'none' || adjustments.cropAspect !== 'free') {
          finalCanvas = applyFramesAndCrop(webglCanvas, adjustments, targetW, targetH);
        }

        const dataUrl = finalCanvas.toDataURL(options.format, options.quality);
        engine.destroy();
        resolve(dataUrl);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load source image for export.'));
    };

    img.src = media.url;
  });
}

/**
 * Composite frame borders and aspect ratio / box / circular crops on final canvas
 */
function applyFramesAndCrop(
  sourceCanvas: HTMLCanvasElement,
  adj: Adjustments,
  width: number,
  height: number
): HTMLCanvasElement {
  const isCircular = adj.cropShape === 'circle' || adj.cropAspect === 'circle';
  const isSquare = adj.cropShape === 'square' || adj.cropAspect === '1:1';

  // Determine Source Slicing Coordinates
  let sx = 0;
  let sy = 0;
  let cropW = width;
  let cropH = height;

  if (adj.cropBox && (adj.cropBox.width < 0.999 || adj.cropBox.height < 0.999 || adj.cropBox.x > 0.001 || adj.cropBox.y > 0.001)) {
    sx = Math.max(0, Math.round(adj.cropBox.x * width));
    sy = Math.max(0, Math.round(adj.cropBox.y * height));
    cropW = Math.min(width - sx, Math.round(adj.cropBox.width * width));
    cropH = Math.min(height - sy, Math.round(adj.cropBox.height * height));
  } else if (adj.cropAspect !== 'free' || isCircular || isSquare) {
    let targetRatio = 1.0;
    if (isCircular || isSquare) targetRatio = 1.0;
    else if (adj.cropAspect === '4:5') targetRatio = 4 / 5;
    else if (adj.cropAspect === '9:16') targetRatio = 9 / 16;
    else if (adj.cropAspect === '16:9') targetRatio = 16 / 9;
    else if (adj.cropAspect === '3:4') targetRatio = 3 / 4;
    else if (adj.cropAspect === '2:3') targetRatio = 2 / 3;

    const curRatio = width / height;
    if (curRatio > targetRatio) {
      cropW = Math.round(height * targetRatio);
      cropH = height;
    } else {
      cropW = width;
      cropH = Math.round(width / targetRatio);
    }
    sx = Math.round((width - cropW) / 2);
    sy = Math.round((height - cropH) / 2);
  }

  // If circular crop, normalize to 1:1 square bounding box
  if (isCircular) {
    const diam = Math.min(cropW, cropH);
    sx = Math.round(sx + (cropW - diam) / 2);
    sy = Math.round(sy + (cropH - diam) / 2);
    cropW = diam;
    cropH = diam;
  }

  const outputCanvas = document.createElement('canvas');
  const ctx = outputCanvas.getContext('2d');
  if (!ctx) return sourceCanvas;

  if (adj.frameType === 'none') {
    outputCanvas.width = cropW;
    outputCanvas.height = cropH;

    if (isCircular) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cropW / 2, cropH / 2, cropW / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(sourceCanvas, sx, sy, cropW, cropH, 0, 0, cropW, cropH);
      ctx.restore();
    } else {
      ctx.drawImage(sourceCanvas, sx, sy, cropW, cropH, 0, 0, cropW, cropH);
    }
    return outputCanvas;
  }

  // Handle Frames
  const frameThickness = Math.round(Math.min(cropW, cropH) * adj.frameWidth);

  if (adj.frameType === 'film-35mm') {
    // 35mm film border with sprocket holes
    const borderTopBottom = frameThickness * 1.5;
    const borderSides = frameThickness;
    outputCanvas.width = cropW + borderSides * 2;
    outputCanvas.height = cropH + borderTopBottom * 2;

    // Black frame background
    ctx.fillStyle = '#0D0D0D';
    ctx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);

    // Draw image inside
    if (isCircular) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(borderSides + cropW / 2, borderTopBottom + cropH / 2, cropW / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(sourceCanvas, sx, sy, cropW, cropH, borderSides, borderTopBottom, cropW, cropH);
      ctx.restore();
    } else {
      ctx.drawImage(sourceCanvas, sx, sy, cropW, cropH, borderSides, borderTopBottom, cropW, cropH);
    }

    // Draw Sprocket holes along top and bottom
    const holeW = Math.round(borderTopBottom * 0.45);
    const holeH = Math.round(borderTopBottom * 0.35);
    const holeSpacing = holeW * 1.8;
    const numHoles = Math.floor(outputCanvas.width / holeSpacing);

    ctx.fillStyle = '#E5E5E5';
    for (let i = 0; i < numHoles; i++) {
      const hx = i * holeSpacing + holeW * 0.4;
      // Top sprocket
      ctx.beginPath();
      ctx.roundRect(hx, borderTopBottom * 0.25, holeW, holeH, 4);
      ctx.fill();
      // Bottom sprocket
      ctx.beginPath();
      ctx.roundRect(hx, outputCanvas.height - borderTopBottom * 0.6, holeW, holeH, 4);
      ctx.fill();
    }

    // Editorial text along frame edge
    ctx.font = `600 ${Math.max(12, Math.round(borderTopBottom * 0.22))}px monospace`;
    ctx.fillStyle = '#D4A373';
    ctx.fillText('LUMENLAB 400 FILM  •  24 EXP', borderSides + 10, outputCanvas.height - borderTopBottom * 0.15);
    ctx.fillText('SAFETY FILM 5063', outputCanvas.width - borderSides - 200, outputCanvas.height - borderTopBottom * 0.15);

  } else if (adj.frameType === 'polaroid') {
    // Vintage Polaroid frame
    const padSide = frameThickness;
    const padTop = frameThickness;
    const padBottom = frameThickness * 3.2; // deep bottom chin

    outputCanvas.width = cropW + padSide * 2;
    outputCanvas.height = cropH + padTop + padBottom;

    ctx.fillStyle = '#FAF7F2';
    ctx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);

    if (isCircular) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(padSide + cropW / 2, padTop + cropH / 2, cropW / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(sourceCanvas, sx, sy, cropW, cropH, padSide, padTop, cropW, cropH);
      ctx.restore();
    } else {
      ctx.drawImage(sourceCanvas, sx, sy, cropW, cropH, padSide, padTop, cropW, cropH);
    }

    // Subtle drop shadow inside image box
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 2;
    ctx.strokeRect(padSide, padTop, cropW, cropH);

  } else if (adj.frameType === 'gallery-white' || adj.frameType === 'gallery-cream') {
    const pad = frameThickness;
    outputCanvas.width = cropW + pad * 2;
    outputCanvas.height = cropH + pad * 2;

    ctx.fillStyle = adj.frameType === 'gallery-cream' ? '#F4EDE2' : '#FFFFFF';
    ctx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);

    if (isCircular) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(pad + cropW / 2, pad + cropH / 2, cropW / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(sourceCanvas, sx, sy, cropW, cropH, pad, pad, cropW, cropH);
      ctx.restore();
    } else {
      ctx.drawImage(sourceCanvas, sx, sy, cropW, cropH, pad, pad, cropW, cropH);
    }

  } else if (adj.frameType === 'slide-120') {
    // 120mm medium format slide mount
    const pad = frameThickness * 1.2;
    outputCanvas.width = cropW + pad * 2;
    outputCanvas.height = cropH + pad * 2;

    ctx.fillStyle = '#1A1A1A';
    ctx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);

    if (isCircular) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(pad + cropW / 2, pad + cropH / 2, cropW / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(sourceCanvas, sx, sy, cropW, cropH, pad, pad, cropW, cropH);
      ctx.restore();
    } else {
      ctx.drawImage(sourceCanvas, sx, sy, cropW, cropH, pad, pad, cropW, cropH);
    }

    ctx.font = `600 ${Math.max(11, Math.round(pad * 0.22))}px sans-serif`;
    ctx.fillStyle = '#888888';
    ctx.fillText('120 SLIDE MOUNT', pad, pad * 0.6);
  } else if (adj.frameType === 'retro-tv') {
    // Retro curved TV frame
    const pad = frameThickness;
    outputCanvas.width = cropW + pad * 2;
    outputCanvas.height = cropH + pad * 2;

    ctx.fillStyle = '#222222';
    ctx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(pad, pad, cropW, cropH, Math.min(30, pad * 0.8));
    ctx.clip();

    if (isCircular) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(pad + cropW / 2, pad + cropH / 2, cropW / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(sourceCanvas, sx, sy, cropW, cropH, pad, pad, cropW, cropH);
      ctx.restore();
    } else {
      ctx.drawImage(sourceCanvas, sx, sy, cropW, cropH, pad, pad, cropW, cropH);
    }
    ctx.restore();
  }

  // Burn in authentic camera overlay features if cameraType is active
  if (adj.cameraType && adj.cameraType !== 'none') {
    renderCameraOverlayOnCanvas(ctx, adj.cameraType, outputCanvas.width, outputCanvas.height);
  }

  // Superimpose Date / Time Stamp if enabled
  if (adj.dateStamp?.enabled) {
    renderDateStampOnCanvas(ctx, adj.dateStamp, outputCanvas.width, outputCanvas.height);
  }

  return outputCanvas;
}

/**
 * Export Video with WebGL filters using MediaRecorder
 */
export async function exportVideo(
  videoElement: HTMLVideoElement,
  adjustments: Adjustments,
  options: ExportOptions
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth || 1280;
      canvas.height = videoElement.videoHeight || 720;

      const engine = new WebGLFilterEngine(canvas);
      engine.setSource(videoElement);

      const stream = canvas.captureStream(30);

      // Preferred mime types
      let mimeType = 'video/webm;codecs=vp9';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = '';
      }

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        engine.destroy();
        const blob = new Blob(chunks, { type: mimeType || 'video/webm' });
        resolve(blob);
      };

      const duration = videoElement.duration || 10;
      videoElement.currentTime = 0;
      videoElement.muted = true;

      let isRecording = true;

      const renderLoop = () => {
        if (!isRecording) return;

        engine.uploadTexture();
        engine.render(adjustments, 'none', 0.5, videoElement.currentTime);

        const progress = Math.min(100, Math.round((videoElement.currentTime / duration) * 100));
        if (options.onProgress) options.onProgress(progress);

        if (videoElement.ended || videoElement.currentTime >= duration - 0.1) {
          isRecording = false;
          videoElement.pause();
          setTimeout(() => {
            recorder.stop();
          }, 300);
          return;
        }

        requestAnimationFrame(renderLoop);
      };

      recorder.start(100);
      videoElement.play().then(() => {
        renderLoop();
      }).catch(reject);

    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Render high-resolution collage template with all slots, textures, text, and analog overlays
 */
export async function exportTemplate(
  template: CollageTemplate,
  globalAdjustments: Adjustments,
  options: ExportOptions
): Promise<string> {
  const baseWidth = 1080;
  const baseHeight = Math.round(baseWidth / (template.aspectRatio || 1));
  const targetW = Math.round(baseWidth * options.scale);
  const targetH = Math.round(baseHeight * options.scale);

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2d context for template export');

  // 1. Draw Background Color & Paper Texture
  ctx.fillStyle = template.overlays?.backgroundColor || '#FAF9F6';
  ctx.fillRect(0, 0, targetW, targetH);

  const texture = template.overlays?.paperTexture;
  if (texture === 'warm-ivory') {
    ctx.fillStyle = 'rgba(247, 244, 236, 0.9)';
    ctx.fillRect(0, 0, targetW, targetH);
  } else if (texture === 'kraft-paper') {
    ctx.fillStyle = '#D9C7AC';
    ctx.fillRect(0, 0, targetW, targetH);
  } else if (texture === 'charcoal-dark') {
    ctx.fillStyle = '#1E1D1B';
    ctx.fillRect(0, 0, targetW, targetH);
  } else if (texture === 'split-duotone') {
    const grad = ctx.createLinearGradient(0, 0, 0, targetH);
    grad.addColorStop(0, '#F2EDE4');
    grad.addColorStop(1, '#E5DEC9');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, targetW, targetH);
  }

  // 2. Pre-load all slot images
  const loadedImages: { [slotId: string]: HTMLImageElement } = {};
  const imagePromises = template.slots.map((slot) => {
    return new Promise<void>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        loadedImages[slot.id] = img;
        resolve();
      };
      img.onerror = () => {
        resolve(); // Continue even if one image fails to load
      };
      img.src = slot.media.url;
    });
  });

  await Promise.all(imagePromises);

  // 3. Render Binder Rings if any
  if (template.overlays?.binderRings === 'left-spiral') {
    const numSpirals = 14;
    const holeRadius = Math.round(targetW * 0.015);
    const spiralW = Math.round(targetW * 0.05);
    const spiralH = Math.round(targetH * 0.012);

    for (let i = 0; i < numSpirals; i++) {
      const cy = Math.round((targetH / (numSpirals + 1)) * (i + 1));
      const cx = Math.round(targetW * 0.03);

      // Hole Punch
      ctx.fillStyle = '#22201D';
      ctx.beginPath();
      ctx.arc(cx, cy, holeRadius, 0, Math.PI * 2);
      ctx.fill();

      // Metallic Loop
      ctx.save();
      ctx.translate(cx + spiralW / 2, cy);
      ctx.rotate(-0.2);
      const loopGrad = ctx.createLinearGradient(-spiralW / 2, 0, spiralW / 2, 0);
      loopGrad.addColorStop(0, '#A0A0A0');
      loopGrad.addColorStop(0.5, '#FFFFFF');
      loopGrad.addColorStop(1, '#707070');
      ctx.fillStyle = loopGrad;
      ctx.beginPath();
      ctx.roundRect(-spiralW / 2, -spiralH / 2, spiralW, spiralH, spiralH / 2);
      ctx.fill();
      ctx.restore();
    }
  } else if (template.overlays?.binderRings === 'middle-spiral') {
    const numSpirals = 12;
    const holeRadius = Math.round(targetW * 0.014);
    const spiralW = Math.round(targetW * 0.015);
    const spiralH = Math.round(targetH * 0.035);
    const cy = Math.round(targetH / 2);

    for (let i = 0; i < numSpirals; i++) {
      const cx = Math.round((targetW / (numSpirals + 1)) * (i + 1));

      // Hole Punch
      ctx.fillStyle = '#22201D';
      ctx.beginPath();
      ctx.arc(cx, cy, holeRadius, 0, Math.PI * 2);
      ctx.fill();

      // Spiral Ring
      ctx.save();
      ctx.translate(cx, cy);
      ctx.fillStyle = '#C0C0C0';
      ctx.beginPath();
      ctx.roundRect(-spiralW / 2, -spiralH / 2, spiralW, spiralH, spiralW / 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // 4. Render Slots sorted by zIndex
  const sortedSlots = [...template.slots].sort((a, b) => (a.zIndex || 1) - (b.zIndex || 1));

  for (const slot of sortedSlots) {
    const slotX = (slot.x / 100) * targetW;
    const slotY = (slot.y / 100) * targetH;
    const slotW = (slot.width / 100) * targetW;
    const slotH = (slot.height / 100) * targetH;
    const rot = ((slot.rotation || 0) * Math.PI) / 180;
    const bRad = (slot.borderRadius || 8) * (targetW / 440);

    ctx.save();
    ctx.translate(slotX + slotW / 2, slotY + slotH / 2);
    ctx.rotate(rot);

    // Apply Drop Shadow
    if (slot.shadow === 'card' || slot.shadow === 'deep' || slot.shadow === 'polaroid' || slot.shadow === 'polaroid-deep' || slot.shadow === 'subtle') {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.22)';
      ctx.shadowBlur = slot.shadow === 'deep' || slot.shadow === 'polaroid-deep' ? 24 : 14;
      ctx.shadowOffsetY = slot.shadow === 'deep' || slot.shadow === 'polaroid-deep' ? 10 : 5;
    }

    const img = loadedImages[slot.id];

    if (slot.borderStyle === 'polaroid') {
      // Polaroid Border Frame
      const pSide = slotW * 0.06;
      const pTop = slotW * 0.06;
      const pBottom = slotH * 0.22;
      const outerW = slotW + pSide * 2;
      const outerH = slotH + pTop + pBottom;

      ctx.fillStyle = '#FAF7F2';
      ctx.beginPath();
      ctx.roundRect(-outerW / 2, -outerH / 2, outerW, outerH, Math.max(4, bRad));
      ctx.fill();

      // Reset shadow for content
      ctx.shadowColor = 'transparent';

      if (img) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(-slotW / 2, -outerH / 2 + pTop, slotW, slotH);
        ctx.clip();
        drawCoverImage(ctx, img, -slotW / 2, -outerH / 2 + pTop, slotW, slotH);
        ctx.restore();
      }

      // Polaroid handwritten slot text if provided
      if (slot.label && slot.label !== 'Photo' && !slot.label.startsWith('Media Slot')) {
        ctx.font = `600 ${Math.round(slotW * 0.08)}px 'Caveat', 'Playfair Display', cursive, serif`;
        ctx.fillStyle = '#2A2723';
        ctx.textAlign = 'center';
        ctx.fillText(slot.label, 0, outerH / 2 - pBottom * 0.35);
      }
    } else if (slot.borderStyle === 'film-35mm') {
      // 35mm Film Border
      const fSide = slotW * 0.05;
      const fTopBottom = slotH * 0.16;
      const outerW = slotW + fSide * 2;
      const outerH = slotH + fTopBottom * 2;

      ctx.fillStyle = '#0D0D0D';
      ctx.beginPath();
      ctx.roundRect(-outerW / 2, -outerH / 2, outerW, outerH, 4);
      ctx.fill();

      ctx.shadowColor = 'transparent';

      // Draw sprocket holes
      const holeW = fSide * 1.5;
      const holeH = fTopBottom * 0.38;
      const numHoles = Math.floor(outerW / (holeW * 2));
      ctx.fillStyle = '#E5E5E5';
      for (let i = 0; i < numHoles; i++) {
        const hx = -outerW / 2 + (i + 0.5) * (outerW / numHoles);
        ctx.beginPath();
        ctx.roundRect(hx - holeW / 2, -outerH / 2 + fTopBottom * 0.25, holeW, holeH, 2);
        ctx.fill();
        ctx.beginPath();
        ctx.roundRect(hx - holeW / 2, outerH / 2 - fTopBottom * 0.65, holeW, holeH, 2);
        ctx.fill();
      }

      if (img) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(-slotW / 2, -slotH / 2, slotW, slotH);
        ctx.clip();
        drawCoverImage(ctx, img, -slotW / 2, -slotH / 2, slotW, slotH);
        ctx.restore();
      }
    } else {
      // Standard / Clean Frame
      ctx.fillStyle = '#FAF9F6';
      ctx.beginPath();
      ctx.roundRect(-slotW / 2, -slotH / 2, slotW, slotH, bRad);
      ctx.fill();

      ctx.shadowColor = 'transparent';

      if (img) {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(-slotW / 2, -slotH / 2, slotW, slotH, bRad);
        ctx.clip();
        drawCoverImage(ctx, img, -slotW / 2, -slotH / 2, slotW, slotH);
        ctx.restore();
      }

      // Subtle border line
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(-slotW / 2, -slotH / 2, slotW, slotH, bRad);
      ctx.stroke();
    }

    // Tape decoration on top of slot
    if (slot.tape && slot.tape !== 'none') {
      const tapeW = slotW * 0.35;
      const tapeH = slotH * 0.08;
      ctx.save();
      ctx.translate(0, -slotH / 2);
      ctx.fillStyle = 'rgba(235, 225, 205, 0.75)';
      ctx.fillRect(-tapeW / 2, -tapeH / 2, tapeW, tapeH);
      ctx.strokeStyle = 'rgba(210, 195, 170, 0.6)';
      ctx.strokeRect(-tapeW / 2, -tapeH / 2, tapeW, tapeH);
      ctx.restore();
    }

    ctx.restore();
  }

  // 5. Draw AirDrop Card Overlay if enabled
  if (template.overlays?.airdropCard && template.overlays.airdropCard.enabled) {
    const cardW = targetW * 0.75;
    const cardH = targetH * 0.16;
    const cardX = (targetW - cardW) / 2;
    const cardY = targetH * 0.42;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 12;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 20);
    ctx.fill();

    ctx.shadowColor = 'transparent';

    // AirDrop Header Icon & Title
    ctx.fillStyle = '#007AFF';
    ctx.beginPath();
    ctx.arc(cardX + cardW * 0.12, cardY + cardH * 0.38, cardH * 0.22, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1D1D1F';
    ctx.font = `bold ${Math.round(cardH * 0.18)}px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText('AirDrop', cardX + cardW * 0.24, cardY + cardH * 0.32);

    ctx.fillStyle = '#86868B';
    ctx.font = `500 ${Math.round(cardH * 0.13)}px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif`;
    ctx.fillText(`${template.overlays.airdropCard.senderName || template.overlays.airdropCard.deviceName || 'iPhone User'} wants to share`, cardX + cardW * 0.24, cardY + cardH * 0.48);

    // Accept / Decline Buttons
    const btnW = cardW * 0.42;
    const btnH = cardH * 0.28;
    const btnY = cardY + cardH * 0.62;

    // Decline button
    ctx.fillStyle = '#F2F2F7';
    ctx.beginPath();
    ctx.roundRect(cardX + cardW * 0.05, btnY, btnW, btnH, 12);
    ctx.fill();
    ctx.fillStyle = '#007AFF';
    ctx.font = `600 ${Math.round(btnH * 0.45)}px -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('Decline', cardX + cardW * 0.05 + btnW / 2, btnY + btnH * 0.68);

    // Accept button
    ctx.fillStyle = '#007AFF';
    ctx.beginPath();
    ctx.roundRect(cardX + cardW * 0.53, btnY, btnW, btnH, 12);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('Accept', cardX + cardW * 0.53 + btnW / 2, btnY + btnH * 0.68);

    ctx.restore();
  }

  // 6. Draw Text & Quote Elements
  for (const txt of template.textElements) {
    if (!txt.text) continue;

    const tx = (txt.x / 100) * targetW;
    const ty = (txt.y / 100) * targetH;
    const rot = ((txt.rotation || 0) * Math.PI) / 180;
    const fSize = Math.round((txt.fontSize || 1.2) * (targetW / 440) * 16);

    let fontFam = "'Playfair Display', Georgia, serif";
    if (txt.fontFamily === 'typewriter' || txt.fontFamily === 'monospaced') fontFam = "'Courier New', monospace";
    else if (txt.fontFamily === 'modern-sans') fontFam = "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
    else if (txt.fontFamily === 'handwritten') fontFam = "'Caveat', 'Dancing Script', cursive";
    else if (txt.fontFamily === 'display-syne') fontFam = "'Syne', sans-serif";

    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(rot);

    ctx.font = `600 ${fSize}px ${fontFam}`;
    ctx.textAlign = txt.align || 'left';
    ctx.textBaseline = 'top';

    const lines = (txt.text || '').split('\n');
    const lineHeights = fSize * 1.35;
    const padX = fSize * 0.45;
    const padY = fSize * 0.3;
    let maxLineWidth = 0;
    lines.forEach((line) => {
      const w = ctx.measureText(line).width;
      if (w > maxLineWidth) maxLineWidth = w;
    });
    const totalBoxHeight = lines.length * lineHeights + padY * 2;
    const totalBoxWidth = maxLineWidth + padX * 2;

    let boxX = -padX;
    if (txt.align === 'center') boxX = -maxLineWidth / 2 - padX;
    else if (txt.align === 'right') boxX = -maxLineWidth - padX;
    const boxY = -padY;

    // Draw background style or custom background color if specified
    if (
      txt.backgroundColor &&
      txt.backgroundColor !== 'transparent' &&
      txt.backgroundColor !== 'none'
    ) {
      ctx.save();
      if (txt.backgroundOpacity !== undefined) {
        ctx.globalAlpha = txt.backgroundOpacity;
      }
      ctx.fillStyle = txt.backgroundColor;
      if (typeof ctx.roundRect === 'function') {
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, totalBoxWidth, totalBoxHeight, 6);
        ctx.fill();
      } else {
        ctx.fillRect(boxX, boxY, totalBoxWidth, totalBoxHeight);
      }
      ctx.restore();
    } else if (txt.style === 'callout-box' || txt.style === 'modern-box') {
      ctx.fillStyle = 'rgba(20, 20, 20, 0.9)';
      ctx.fillRect(boxX, boxY, totalBoxWidth, totalBoxHeight);
    } else if (txt.style === 'memo-card') {
      ctx.fillStyle = '#FAF6EE';
      ctx.fillRect(boxX, boxY, totalBoxWidth, totalBoxHeight);
    } else if (txt.style === 'typewriter-strip') {
      ctx.fillStyle = '#2A2723';
      ctx.fillRect(boxX, boxY, totalBoxWidth, totalBoxHeight);
    }

    ctx.fillStyle = txt.color || '#2A2723';
    lines.forEach((line, idx) => {
      ctx.fillText(line, 0, idx * lineHeights);
    });

    ctx.restore();
  }

  // 7. Subtle Analog Film Grain / Texture on Top
  if (globalAdjustments.grainAmount > 0 || globalAdjustments.dustAmount > 0) {
    const grainCanvas = document.createElement('canvas');
    grainCanvas.width = 256;
    grainCanvas.height = 256;
    const gCtx = grainCanvas.getContext('2d');
    if (gCtx) {
      const gImg = gCtx.createImageData(256, 256);
      for (let i = 0; i < gImg.data.length; i += 4) {
        const val = Math.random() * 255;
        gImg.data[i] = val;
        gImg.data[i + 1] = val;
        gImg.data[i + 2] = val;
        gImg.data[i + 3] = Math.round(globalAdjustments.grainAmount * 35);
      }
      gCtx.putImageData(gImg, 0, 0);
      const pattern = ctx.createPattern(grainCanvas, 'repeat');
      if (pattern) {
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, targetW, targetH);
      }
    }
  }

  return canvas.toDataURL(options.format, options.quality);
}

/**
 * Helper to draw image using object-fit: cover inside bounding box
 */
function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const imgRatio = img.naturalWidth / (img.naturalHeight || 1);
  const targetRatio = w / h;

  let sx = 0;
  let sy = 0;
  let sWidth = img.naturalWidth;
  let sHeight = img.naturalHeight;

  if (imgRatio > targetRatio) {
    sWidth = Math.round(img.naturalHeight * targetRatio);
    sx = Math.round((img.naturalWidth - sWidth) / 2);
  } else {
    sHeight = Math.round(img.naturalWidth / targetRatio);
    sy = Math.round((img.naturalHeight - sHeight) / 2);
  }

  ctx.drawImage(img, sx, sy, sWidth, sHeight, x, y, w, h);
}

/**
 * Trigger file download helper
 */
export function downloadDataUrl(url: string, filename: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  downloadDataUrl(url, filename);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Renders all slides in a project into a single multi-page PDF document
 */
export async function exportProjectToPdf(
  project: Project,
  fallbackAdjustments: Adjustments,
  options: ExportOptions,
  onProgress?: (current: number, total: number) => void
): Promise<Blob> {
  const slides = project.collages && project.collages.length > 0
    ? project.collages
    : project.activeCollage
    ? [project.activeCollage]
    : [];

  if (slides.length === 0) {
    throw new Error('No slides found in project to export');
  }

  const total = slides.length;
  let pdfDoc: jsPDF | null = null;

  for (let i = 0; i < total; i++) {
    const slide = slides[i];
    if (onProgress) onProgress(i + 1, total);

    const slideAdj = slide.adjustments || fallbackAdjustments;
    const dataUrl = await exportTemplate(slide, slideAdj, {
      format: 'image/jpeg',
      quality: options.quality,
      scale: options.scale,
    });

    const aspect = slide.aspectRatio || 1;
    // Standard PDF page dimensions in points (72 pt per inch)
    const basePt = 720;
    const pageW = aspect >= 1 ? basePt : Math.round(basePt * aspect);
    const pageH = aspect >= 1 ? Math.round(basePt / aspect) : basePt;
    const orientation = aspect >= 1 ? 'landscape' : 'portrait';

    if (i === 0) {
      pdfDoc = new jsPDF({
        orientation,
        unit: 'pt',
        format: [pageW, pageH],
      });
      pdfDoc.addImage(dataUrl, 'JPEG', 0, 0, pageW, pageH);
    } else if (pdfDoc) {
      pdfDoc.addPage([pageW, pageH], orientation);
      pdfDoc.addImage(dataUrl, 'JPEG', 0, 0, pageW, pageH);
    }
  }

  if (!pdfDoc) {
    throw new Error('Failed to generate PDF document');
  }

  return pdfDoc.output('blob');
}

/**
 * Combines all slides in a project into a single wide/tall stitched panoramic strip image
 */
export async function exportProjectToSeamlessStrip(
  project: Project,
  fallbackAdjustments: Adjustments,
  options: ExportOptions,
  layout: 'horizontal-strip' | 'vertical-scroll' = 'horizontal-strip',
  onProgress?: (current: number, total: number) => void
): Promise<string> {
  const slides = project.collages && project.collages.length > 0
    ? project.collages
    : project.activeCollage
    ? [project.activeCollage]
    : [];

  if (slides.length === 0) {
    throw new Error('No slides found in project to export');
  }

  const total = slides.length;
  const renderedImages: HTMLImageElement[] = [];

  for (let i = 0; i < total; i++) {
    const slide = slides[i];
    if (onProgress) onProgress(i + 1, total);

    const slideAdj = slide.adjustments || fallbackAdjustments;
    const dataUrl = await exportTemplate(slide, slideAdj, {
      format: options.format,
      quality: options.quality,
      scale: options.scale,
    });

    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error(`Failed loading rendered slide ${i + 1}`));
      img.src = dataUrl;
    });

    renderedImages.push(img);
  }

  // Calculate target combined canvas dimensions
  let totalWidth = 0;
  let totalHeight = 0;

  if (layout === 'horizontal-strip') {
    // Horizontal carousel panorama
    totalHeight = Math.max(...renderedImages.map((img) => img.naturalHeight));
    totalWidth = renderedImages.reduce((sum, img) => sum + img.naturalWidth, 0);
  } else {
    // Vertical story scroll
    totalWidth = Math.max(...renderedImages.map((img) => img.naturalWidth));
    totalHeight = renderedImages.reduce((sum, img) => sum + img.naturalHeight, 0);
  }

  const canvas = document.createElement('canvas');
  canvas.width = totalWidth;
  canvas.height = totalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas 2d context for strip export');

  // Background
  ctx.fillStyle = '#0E0D0C';
  ctx.fillRect(0, 0, totalWidth, totalHeight);

  let currentOffset = 0;
  for (const img of renderedImages) {
    if (layout === 'horizontal-strip') {
      ctx.drawImage(img, currentOffset, 0, img.naturalWidth, img.naturalHeight);
      currentOffset += img.naturalWidth;
    } else {
      ctx.drawImage(img, 0, currentOffset, img.naturalWidth, img.naturalHeight);
      currentOffset += img.naturalHeight;
    }
  }

  return canvas.toDataURL(options.format, options.quality);
}

/**
 * Packages all rendered slides in a project into a single .zip archive file
 */
export async function exportProjectToZip(
  project: Project,
  fallbackAdjustments: Adjustments,
  options: ExportOptions,
  onProgress?: (current: number, total: number) => void
): Promise<Blob> {
  const slides = project.collages && project.collages.length > 0
    ? project.collages
    : project.activeCollage
    ? [project.activeCollage]
    : [];

  if (slides.length === 0) {
    throw new Error('No slides found in project to export');
  }

  const zip = new JSZip();
  const total = slides.length;
  const cleanProjectName = (project.name || 'project').toLowerCase().replace(/[^a-z0-9]/g, '_');
  const ext = options.format === 'image/png' ? 'png' : options.format === 'image/webp' ? 'webp' : 'jpg';

  for (let i = 0; i < total; i++) {
    const slide = slides[i];
    if (onProgress) onProgress(i + 1, total);

    const slideAdj = slide.adjustments || fallbackAdjustments;
    const dataUrl = await exportTemplate(slide, slideAdj, {
      format: options.format,
      quality: options.quality,
      scale: options.scale,
    });

    const base64Data = dataUrl.split(',')[1];
    const cleanSlideName = (slide.name || `slide_${i + 1}`).toLowerCase().replace(/[^a-z0-9]/g, '_');
    const filename = `${String(i + 1).padStart(2, '0')}_${cleanSlideName}.${ext}`;

    zip.file(filename, base64Data, { base64: true });
  }

  // Add project summary info text file
  const infoContent = `LUMENLAB PROJECT EXPORT\n=======================\nProject: ${project.name}\nSlides: ${total}\nExport Date: ${new Date().toISOString()}\nCreated with LumenLab Analog Studio`;
  zip.file('README_PROJECT.txt', infoContent);

  return zip.generateAsync({ type: 'blob' });
}


