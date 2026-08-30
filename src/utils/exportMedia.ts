import { Adjustments, MediaItem } from '../types';
import { WebGLFilterEngine } from '../webgl/webglEngine';

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
    ctx.fillText('LRSTUDIO 400 FILM  •  24 EXP', borderSides + 10, outputCanvas.height - borderTopBottom * 0.15);
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
