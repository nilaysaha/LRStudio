import React, { useState } from 'react';
import { X, Download, Share2, Sparkles, CheckCircle2, Film, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Adjustments, MediaItem } from '../types';
import { exportPhoto, exportVideo, downloadDataUrl, downloadBlob } from '../utils/exportMedia';
import { soundFx } from '../utils/audio';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  media: MediaItem | null;
  adjustments: Adjustments;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  media,
  adjustments,
}) => {
  const [photoFormat, setPhotoFormat] = useState<'image/jpeg' | 'image/png' | 'image/webp'>('image/jpeg');
  const [quality, setQuality] = useState(0.95);
  const [scale, setScale] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [exportComplete, setExportComplete] = useState(false);
  const [exportedUrl, setExportedUrl] = useState<string | null>(null);

  if (!isOpen || !media) return null;

  const isVideo = media.type === 'video';

  const handleExport = async () => {
    setIsExporting(true);
    setProgress(0);
    setExportComplete(false);

    try {
      if (!isVideo) {
        // High-res photo export
        const dataUrl = await exportPhoto(media, adjustments, {
          format: photoFormat,
          quality: quality,
          scale: scale,
        });

        setExportedUrl(dataUrl);
        setIsExporting(false);
        setExportComplete(true);
        soundFx.playHapticTick();

        // Trigger automatic download
        const ext = photoFormat === 'image/png' ? 'png' : photoFormat === 'image/webp' ? 'webp' : 'jpg';
        const filename = `lumenlab_${Date.now()}.${ext}`;
        downloadDataUrl(dataUrl, filename);
      } else {
        // Video export
        const videoElement = document.querySelector('video') as HTMLVideoElement | null;
        if (!videoElement) {
          throw new Error('Video element not found');
        }

        const blob = await exportVideo(videoElement, adjustments, {
          format: 'video/webm',
          quality: 0.9,
          scale: 1,
          onProgress: (p) => setProgress(p),
        });

        setIsExporting(false);
        setExportComplete(true);
        soundFx.playHapticTick();

        const filename = `lumenlab_video_${Date.now()}.webm`;
        downloadBlob(blob, filename);
      }
    } catch (err) {
      console.error('Export failed:', err);
      setIsExporting(false);
      alert('Export failed. Please try again or adjust resolution.');
    }
  };

  const handleNativeShare = async () => {
    if (exportedUrl && navigator.share) {
      try {
        const res = await fetch(exportedUrl);
        const blob = await res.blob();
        const file = new File([blob], `lumenlab_${Date.now()}.jpg`, { type: blob.type });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'Edited with LumenLab',
            files: [file],
          });
        }
      } catch (err) {
        console.warn('Share cancelled or not supported:', err);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-white border border-[#E6E2D3] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#F0EEE6] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-[#2A2723]" />
            <span className="font-editorial text-base font-bold tracking-wider text-[#2A2723]">
              EXPORT {isVideo ? 'VIDEO' : 'IMAGE'}
            </span>
          </div>
          <button
            onClick={() => { onClose(); soundFx.playHapticTick(); }}
            className="p-1.5 rounded-lg text-[#7E7365] hover:text-[#2A2723] hover:bg-[#FAF9F6] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {!isVideo ? (
            <>
              {/* Photo Format Selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#2A2723]">
                  Output Format
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'image/jpeg', label: 'JPEG' },
                    { id: 'image/png', label: 'PNG' },
                    { id: 'image/webp', label: 'WebP' },
                  ].map((fmt) => (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => setPhotoFormat(fmt.id as any)}
                      className={`p-2.5 rounded-xl border text-center text-xs font-medium transition-all ${
                        photoFormat === fmt.id
                          ? 'bg-[#2A2723] border-[#2A2723] text-white shadow-xs'
                          : 'bg-[#FAF9F6] border-[#E6E2D3] text-[#7E7365] hover:text-[#2A2723]'
                      }`}
                    >
                      {fmt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Resolution Multiplier */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#2A2723]">
                  Resolution Multiplier
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setScale(1)}
                    className={`p-2.5 rounded-xl border text-xs font-medium transition-all ${
                      scale === 1
                        ? 'bg-[#2A2723] border-[#2A2723] text-white shadow-xs'
                        : 'bg-[#FAF9F6] border-[#E6E2D3] text-[#7E7365] hover:text-[#2A2723]'
                    }`}
                  >
                    1x Native Dimensions
                  </button>
                  <button
                    type="button"
                    onClick={() => setScale(1.5)}
                    className={`p-2.5 rounded-xl border text-xs font-medium transition-all ${
                      scale === 1.5
                        ? 'bg-[#2A2723] border-[#2A2723] text-white shadow-xs'
                        : 'bg-[#FAF9F6] border-[#E6E2D3] text-[#7E7365] hover:text-[#2A2723]'
                    }`}
                  >
                    1.5x Ultra HD
                  </button>
                </div>
              </div>

              {/* Quality Slider */}
              {photoFormat !== 'image/png' && (
                <div className="flex flex-col gap-1.5 bg-[#FAF9F6] p-3 rounded-xl border border-[#E6E2D3]">
                  <div className="flex items-center justify-between text-xs text-[#2A2723]">
                    <span>Image Quality</span>
                    <span className="font-mono text-[#2A2723] font-semibold">
                      {Math.round(quality * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.7}
                    max={1.0}
                    step={0.05}
                    value={quality}
                    onChange={(e) => setQuality(parseFloat(e.target.value))}
                    className="w-full accent-[#2A2723]"
                  />
                </div>
              )}
            </>
          ) : (
            <div className="bg-[#FAF9F6] p-4 rounded-xl border border-[#E6E2D3] flex flex-col gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#2A2723]">
                <Film className="w-4 h-4 text-[#2A2723]" />
                <span>Real-Time WebGL Video Processing</span>
              </div>
              <p className="text-xs text-[#7E7365]">
                Bakes active film presets, realistic grain, dust, and color grading across every video frame smoothly.
              </p>
            </div>
          )}

          {/* Progress / Status Bar */}
          {isExporting && (
            <div className="bg-[#FAF9F6] p-4 rounded-xl border border-[#E6E2D3] flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs text-[#2A2723]">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#2A2723]" />
                  Processing WebGL Shaders...
                </span>
                {isVideo && <span className="font-mono text-[#2A2723] font-bold">{progress}%</span>}
              </div>
              {isVideo && (
                <div className="w-full bg-[#E6E2D3] h-2 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${progress}%` }}
                    className="bg-[#2A2723] h-full transition-all duration-150"
                  />
                </div>
              )}
            </div>
          )}

          {exportComplete && (
            <div className="bg-[#F0FDF4] p-3 rounded-xl border border-[#BBF7D0] flex items-center justify-between text-xs text-green-800">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                Export complete & downloaded!
              </span>
              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <button
                  onClick={handleNativeShare}
                  className="flex items-center gap-1 text-[#2A2723] bg-white border border-[#BBF7D0] px-2.5 py-1 rounded-full font-medium"
                >
                  <Share2 className="w-3 h-3" />
                  <span>Share</span>
                </button>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F0EEE6]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full text-xs text-[#7E7365] hover:text-[#2A2723] transition-colors"
            >
              {exportComplete ? 'Done' : 'Cancel'}
            </button>

            <button
              type="button"
              disabled={isExporting}
              onClick={handleExport}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#2A2723] text-white font-medium text-xs disabled:opacity-50 shadow-xs hover:bg-black active:scale-95 transition-all"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 stroke-[2.2]" />
                  <span>{exportComplete ? 'Download Again' : 'Save & Download'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
