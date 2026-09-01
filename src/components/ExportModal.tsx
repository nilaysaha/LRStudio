import React, { useState } from 'react';
import {
  X, Download, Share2, Sparkles, CheckCircle2, Film, Image as ImageIcon,
  Loader2, Copy, Check, ExternalLink, Send, Instagram, Smartphone, MessageCircle,
  Video, Eye, Heart, Layers, LayoutTemplate
} from 'lucide-react';
import { Adjustments, MediaItem, CollageTemplate, Project } from '../types';
import { exportPhoto, exportVideo, exportTemplate, downloadDataUrl, downloadBlob } from '../utils/exportMedia';
import { soundFx } from '../utils/audio';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  media: MediaItem | null;
  adjustments: Adjustments;
  template?: CollageTemplate | null;
  project?: Project | null;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  media,
  adjustments,
  template,
  project,
}) => {
  const [photoFormat, setPhotoFormat] = useState<'image/jpeg' | 'image/png' | 'image/webp'>('image/jpeg');
  const [quality, setQuality] = useState(0.95);
  const [scale, setScale] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [exportComplete, setExportComplete] = useState(false);
  const [exportedUrl, setExportedUrl] = useState<string | null>(null);
  const [exportedBlob, setExportedBlob] = useState<Blob | null>(null);
  const [exportScope, setExportScope] = useState<'current' | 'all-slides'>('current');
  const [multiSlideProgress, setMultiSlideProgress] = useState<{ current: number; total: number } | null>(null);

  // Social sharing state
  const [isSharing, setIsSharing] = useState(false);
  const [shareToast, setShareToast] = useState<{ msg: string; type: 'success' | 'info' } | null>(null);
  const [captionCopied, setCaptionCopied] = useState(false);
  const [imageCopied, setImageCopied] = useState(false);
  const [showCaptionEditor, setShowCaptionEditor] = useState(false);

  // Default smart caption generated from film recipe or template
  const presetLabel = (adjustments?.presetId && adjustments.presetId !== 'none' && adjustments.presetId !== 'default')
    ? String(adjustments.presetId).replace(/^(film-|cam-|preset-)?/i, '').toUpperCase()
    : 'CUSTOM ANALOG';

  const isVideo = !template && media?.type === 'video';

  const defaultCaption = template
    ? `Created with LumenLab 🎞️ "${template.name}" Collage (${template.slots.length} frames) • ${template.subtitle || 'Film Aesthetic'} 📸 #lumenlab #filmlayout #photocollage #aesthetic #polaroid #editorial #filmwave`
    : `Captured & graded on LumenLab Pro 🎞️ Preset: ${presetLabel} ${isVideo ? '🎬' : '📸'} #lumenlab #analogphotography #35mmfilm #cinematic #filmwave #kodakportra #aesthetic`;

  const [customCaption, setCustomCaption] = useState(defaultCaption);

  React.useEffect(() => {
    if (isOpen) {
      setCustomCaption(defaultCaption);
      setExportedUrl(null);
      setExportedBlob(null);
      setExportComplete(false);
    }
  }, [isOpen, adjustments?.presetId, media?.type, template?.id]);

  if (!isOpen || (!media && !template)) return null;

  const showToast = (msg: string, type: 'success' | 'info' = 'success') => {
    setShareToast({ msg, type });
    setTimeout(() => {
      setShareToast(null);
    }, 4500);
  };

  /**
   * Helper to ensure media or template is rendered to high-res blob before sharing
   */
  const prepareExportedFile = async (): Promise<{ blob: Blob; file: File; dataUrl?: string } | null> => {
    if (exportedBlob) {
      const ext = isVideo ? 'webm' : photoFormat === 'image/png' ? 'png' : photoFormat === 'image/webp' ? 'webp' : 'jpg';
      const mime = isVideo ? 'video/webm' : photoFormat;
      const file = new File([exportedBlob], `lumenlab_${Date.now()}.${ext}`, { type: mime });
      return { blob: exportedBlob, file, dataUrl: exportedUrl || undefined };
    }

    setIsExporting(true);
    setProgress(0);

    try {
      if (template) {
        // Export Full Collage Template
        const dataUrl = await exportTemplate(template, adjustments, {
          format: photoFormat,
          quality: quality,
          scale: scale,
        });

        const res = await fetch(dataUrl);
        const blob = await res.blob();
        setExportedUrl(dataUrl);
        setExportedBlob(blob);
        setExportComplete(true);
        setIsExporting(false);

        const ext = photoFormat === 'image/png' ? 'png' : photoFormat === 'image/webp' ? 'webp' : 'jpg';
        const file = new File([blob], `lumenlab_collage_${Date.now()}.${ext}`, { type: photoFormat });
        return { blob, file, dataUrl };
      } else if (!isVideo && media) {
        const dataUrl = await exportPhoto(media, adjustments, {
          format: photoFormat,
          quality: quality,
          scale: scale,
        });

        const res = await fetch(dataUrl);
        const blob = await res.blob();
        setExportedUrl(dataUrl);
        setExportedBlob(blob);
        setExportComplete(true);
        setIsExporting(false);

        const ext = photoFormat === 'image/png' ? 'png' : photoFormat === 'image/webp' ? 'webp' : 'jpg';
        const file = new File([blob], `lumenlab_${Date.now()}.${ext}`, { type: photoFormat });
        return { blob, file, dataUrl };
      } else {
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

        setExportedBlob(blob);
        setExportComplete(true);
        setIsExporting(false);

        const file = new File([blob], `lumenlab_video_${Date.now()}.webm`, { type: 'video/webm' });
        return { blob, file };
      }
    } catch (err) {
      console.error('Export prep failed:', err);
      setIsExporting(false);
      showToast('Could not process media for sharing. Please retry.', 'info');
      return null;
    }
  };

  /**
   * Main Export & Download handler
   */
  const handleExport = async () => {
    setIsExporting(true);
    setProgress(0);
    setExportComplete(false);

    try {
      if (exportScope === 'all-slides' && project?.collages && project.collages.length > 0) {
        const total = project.collages.length;
        setMultiSlideProgress({ current: 0, total });

        for (let i = 0; i < total; i++) {
          const slide = project.collages[i];
          setMultiSlideProgress({ current: i + 1, total });
          setProgress(Math.round(((i + 1) / total) * 100));

          const slideAdj = slide.adjustments || adjustments;
          const dataUrl = await exportTemplate(slide, slideAdj, {
            format: photoFormat,
            quality: quality,
            scale: scale,
          });

          const ext = photoFormat === 'image/png' ? 'png' : photoFormat === 'image/webp' ? 'webp' : 'jpg';
          const cleanProjectName = (project.name || 'project').toLowerCase().replace(/[^a-z0-9]/g, '_');
          const cleanSlideName = (slide.name || `slide_${i + 1}`).toLowerCase().replace(/[^a-z0-9]/g, '_');
          const filename = `${cleanProjectName}_${i + 1}_${cleanSlideName}.${ext}`;
          downloadDataUrl(dataUrl, filename);

          // Small delay between multiple downloads so browser handles cleanly
          await new Promise((r) => setTimeout(r, 400));
        }

        setIsExporting(false);
        setExportComplete(true);
        setMultiSlideProgress(null);
        soundFx.playHapticTick();
        showToast(`Successfully exported all ${total} slides in "${project.name}"!`);
      } else if (template) {
        // Export filled template collage
        const dataUrl = await exportTemplate(template, adjustments, {
          format: photoFormat,
          quality: quality,
          scale: scale,
        });

        const res = await fetch(dataUrl);
        const blob = await res.blob();

        setExportedUrl(dataUrl);
        setExportedBlob(blob);
        setIsExporting(false);
        setExportComplete(true);
        soundFx.playHapticTick();

        const ext = photoFormat === 'image/png' ? 'png' : photoFormat === 'image/webp' ? 'webp' : 'jpg';
        const filename = `lumenlab_collage_${template.id || 'template'}_${Date.now()}.${ext}`;
        downloadDataUrl(dataUrl, filename);
        showToast('Collage exported and downloaded successfully!');
      } else if (!isVideo && media) {
        const dataUrl = await exportPhoto(media, adjustments, {
          format: photoFormat,
          quality: quality,
          scale: scale,
        });

        const res = await fetch(dataUrl);
        const blob = await res.blob();

        setExportedUrl(dataUrl);
        setExportedBlob(blob);
        setIsExporting(false);
        setExportComplete(true);
        soundFx.playHapticTick();

        // Trigger automatic download
        const ext = photoFormat === 'image/png' ? 'png' : photoFormat === 'image/webp' ? 'webp' : 'jpg';
        const filename = `lumenlab_${Date.now()}.${ext}`;
        downloadDataUrl(dataUrl, filename);
        showToast('Photo exported and downloaded successfully!');
      } else {
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

        setExportedBlob(blob);
        setIsExporting(false);
        setExportComplete(true);
        soundFx.playHapticTick();

        const filename = `lumenlab_video_${Date.now()}.webm`;
        downloadBlob(blob, filename);
        showToast('Video exported and downloaded successfully!');
      }
    } catch (err) {
      console.error('Export failed:', err);
      setIsExporting(false);
      showToast('Export failed. Please try again or reduce resolution scale.', 'info');
    }
  };

  /**
   * Instagram Direct Share API integration
   */
  const handleShareInstagram = async (shareTarget: 'feed' | 'story' = 'feed') => {
    soundFx.playHapticTick();
    setIsSharing(true);

    try {
      const prepared = await prepareExportedFile();
      if (!prepared) {
        setIsSharing(false);
        return;
      }

      // Auto-copy caption to clipboard for effortless pasting in Instagram
      try {
        await navigator.clipboard.writeText(customCaption);
        setCaptionCopied(true);
        setTimeout(() => setCaptionCopied(false), 3000);
      } catch (clipErr) {
        console.warn('Clipboard write text failed:', clipErr);
      }

      // Try native Web Share API with file (Directly opens Instagram on mobile!)
      let sharedViaNative = false;
      if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
        if (navigator.canShare({ files: [prepared.file] })) {
          try {
            await navigator.share({
              title: 'LumenLab Edit',
              text: customCaption,
              files: [prepared.file],
            });
            sharedViaNative = true;
            showToast('Shared to Instagram & caption copied to clipboard!');
          } catch (err: any) {
            if (err.name !== 'AbortError') {
              console.warn('Native share failed, fallbacking:', err);
            }
          }
        }
      }

      // If on desktop or native share wasn't used, copy image & open Instagram Web / app scheme
      if (!sharedViaNative) {
        // Also copy image to clipboard if supported (allows direct paste into Instagram Web / Stories)
        if (!isVideo && typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
          try {
            // PNG format is most broadly supported for clipboard image pasting
            const pngBlob = prepared.blob.type === 'image/png' ? prepared.blob : await (async () => {
              const res = await fetch(prepared.dataUrl || '');
              return await res.blob();
            })();
            if (pngBlob) {
              await navigator.clipboard.write([
                new ClipboardItem({ [pngBlob.type]: pngBlob })
              ]);
              setImageCopied(true);
              setTimeout(() => setImageCopied(false), 3000);
            }
          } catch (clipImgErr) {
            console.warn('Clipboard image write failed:', clipImgErr);
          }
        }

        // Open Instagram in new window/app
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (isMobile) {
          // On mobile, try opening Instagram app camera/story or direct web
          window.open('instagram://camera', '_blank');
          setTimeout(() => {
            window.open('https://www.instagram.com/', '_blank');
          }, 600);
        } else {
          window.open('https://www.instagram.com/', '_blank');
        }

        showToast('Caption copied to clipboard! Opening Instagram to paste & post.', 'success');
      }
    } catch (err) {
      console.error('Instagram share error:', err);
      showToast('Opening Instagram. Make sure to download your photo first.', 'info');
    } finally {
      setIsSharing(false);
    }
  };

  /**
   * TikTok Direct Share API integration
   */
  const handleShareTikTok = async () => {
    soundFx.playHapticTick();
    setIsSharing(true);

    try {
      const prepared = await prepareExportedFile();
      if (!prepared) {
        setIsSharing(false);
        return;
      }

      const tikTokCaption = `${customCaption} #filmtok #cinematic #aesthetic #vlog #lumenlab`;

      // Copy TikTok-optimized hashtags and caption to clipboard
      try {
        await navigator.clipboard.writeText(tikTokCaption);
        setCaptionCopied(true);
        setTimeout(() => setCaptionCopied(false), 3000);
      } catch (clipErr) {
        console.warn('Clipboard write text failed:', clipErr);
      }

      // Try native Web Share API with file (Directly opens TikTok on mobile!)
      let sharedViaNative = false;
      if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
        if (navigator.canShare({ files: [prepared.file] })) {
          try {
            await navigator.share({
              title: 'LumenLab Creation',
              text: tikTokCaption,
              files: [prepared.file],
            });
            sharedViaNative = true;
            showToast('Shared to TikTok! Caption & hashtags copied to clipboard.');
          } catch (err: any) {
            if (err.name !== 'AbortError') {
              console.warn('TikTok native share failed:', err);
            }
          }
        }
      }

      // Fallback: Open TikTok Upload / Studio web portal
      if (!sharedViaNative) {
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (isMobile) {
          window.open('snssdk1128://', '_blank');
          setTimeout(() => {
            window.open('https://www.tiktok.com/upload', '_blank');
          }, 600);
        } else {
          window.open('https://www.tiktok.com/upload', '_blank');
        }

        showToast('Caption copied! Opening TikTok Studio Upload.', 'success');
      }
    } catch (err) {
      console.error('TikTok share error:', err);
      showToast('Opening TikTok. Ensure your creation is saved to upload.', 'info');
    } finally {
      setIsSharing(false);
    }
  };

  /**
   * Native OS Share Sheet (AirDrop, Messages, WhatsApp, Pinterest, etc.)
   */
  const handleNativeShare = async () => {
    soundFx.playHapticTick();
    setIsSharing(true);

    try {
      const prepared = await prepareExportedFile();
      if (!prepared) {
        setIsSharing(false);
        return;
      }

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [prepared.file] })) {
        await navigator.share({
          title: 'Edited with LumenLab',
          text: customCaption,
          files: [prepared.file],
        });
        showToast('Shared successfully!');
      } else if (navigator.share) {
        await navigator.share({
          title: 'Edited with LumenLab',
          text: customCaption,
          url: window.location.href,
        });
        showToast('Share sheet opened!');
      } else {
        // Fallback: copy caption
        await navigator.clipboard.writeText(customCaption);
        showToast('Caption copied to clipboard! Web Share not supported on this browser.', 'info');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('Share error:', err);
      }
    } finally {
      setIsSharing(false);
    }
  };

  /**
   * Copy high-res image directly to clipboard
   */
  const handleCopyImageToClipboard = async () => {
    soundFx.playHapticTick();
    if (isVideo) {
      showToast('Direct clipboard copy is for images. Use Share to TikTok/Instagram for video!', 'info');
      return;
    }

    try {
      const prepared = await prepareExportedFile();
      if (!prepared) return;

      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        const res = await fetch(prepared.dataUrl || '');
        const pngBlob = await res.blob();
        await navigator.clipboard.write([
          new ClipboardItem({ [pngBlob.type]: pngBlob })
        ]);
        setImageCopied(true);
        soundFx.playHapticTick();
        showToast('Image copied to clipboard! Paste directly into messages or social apps.');
        setTimeout(() => setImageCopied(false), 3000);
      } else {
        showToast('Clipboard image copy not supported in this browser. Use Save & Download.', 'info');
      }
    } catch (err) {
      console.warn('Clipboard image write error:', err);
      showToast('Could not copy image to clipboard.', 'info');
    }
  };

  /**
   * Copy caption text
   */
  const handleCopyCaption = async () => {
    try {
      await navigator.clipboard.writeText(customCaption);
      setCaptionCopied(true);
      soundFx.playHapticTick();
      showToast('Caption & hashtags copied to clipboard!');
      setTimeout(() => setCaptionCopied(false), 3000);
    } catch (err) {
      console.warn('Clipboard write text failed:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 select-none overflow-y-auto">
      <div className="bg-white border border-[#E6E2D3] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#F0EEE6] flex items-center justify-between flex-shrink-0 bg-[#FAF9F6]">
          <div className="flex items-center gap-2">
            {template ? (
              <LayoutTemplate className="w-4 h-4 text-[#2A2723]" />
            ) : (
              <Download className="w-4 h-4 text-[#2A2723]" />
            )}
            <span className="font-editorial text-base font-bold tracking-wider text-[#2A2723]">
              {template ? `EXPORT COLLAGE: ${template.name.toUpperCase()}` : `EXPORT & SHARE ${isVideo ? 'VIDEO' : 'IMAGE'}`}
            </span>
          </div>
          <button
            onClick={() => { onClose(); soundFx.playHapticTick(); }}
            className="p-1.5 rounded-lg text-[#7E7365] hover:text-[#2A2723] hover:bg-[#F0EEE6] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div className="p-4 sm:p-5 overflow-y-auto flex flex-col gap-4">
          {/* Toast Notification Banner */}
          {shareToast && (
            <div
              className={`p-3 rounded-xl border text-xs font-medium flex items-center gap-2 transition-all animate-in fade-in ${
                shareToast.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
              <span className="flex-1">{shareToast.msg}</span>
              <button
                type="button"
                onClick={() => setShareToast(null)}
                className="text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Multi-Slide Project Selector (when project contains multiple templates) */}
          {project?.collages && project.collages.length > 1 && (
            <div className="bg-[#FAF9F6] p-3.5 rounded-xl border border-[#E6E2D3] flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#2A2723]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[#2A2723]">
                    Project Slides Export
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-900 text-white">
                  {project.collages.length} Slides
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setExportScope('current');
                    soundFx.playHapticTick();
                  }}
                  className={`p-2.5 rounded-xl border text-left flex flex-col gap-0.5 transition-all ${
                    exportScope === 'current'
                      ? 'bg-[#2A2723] text-white border-[#2A2723] shadow-xs'
                      : 'bg-white text-[#7E7365] border-[#E6E2D3] hover:text-[#2A2723]'
                  }`}
                >
                  <span className="text-xs font-bold">Current Slide Only</span>
                  <span className={`text-[10px] truncate ${exportScope === 'current' ? 'text-white/80' : 'text-[#A69480]'}`}>
                    {template?.name || 'Active template'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setExportScope('all-slides');
                    soundFx.playHapticTick();
                  }}
                  className={`p-2.5 rounded-xl border text-left flex flex-col gap-0.5 transition-all ${
                    exportScope === 'all-slides'
                      ? 'bg-[#2A2723] text-white border-[#2A2723] shadow-xs'
                      : 'bg-white text-[#7E7365] border-[#E6E2D3] hover:text-[#2A2723]'
                  }`}
                >
                  <span className="text-xs font-bold">All {project.collages.length} Slides</span>
                  <span className={`text-[10px] truncate ${exportScope === 'all-slides' ? 'text-white/80' : 'text-[#A69480]'}`}>
                    Batch download zip/files
                  </span>
                </button>
              </div>

              {multiSlideProgress && (
                <div className="mt-1 flex items-center justify-between text-xs font-semibold text-[#2A2723] bg-white p-2 rounded-lg border border-[#E6E2D3]">
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Rendering Slide {multiSlideProgress.current} of {multiSlideProgress.total}...
                  </span>
                  <span className="font-mono">{Math.round((multiSlideProgress.current / multiSlideProgress.total) * 100)}%</span>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* 1. SOCIAL MEDIA DIRECT SHARING BUTTONS                   */}
          {/* ========================================================= */}
          <div className="bg-[#FAF9F6] p-4 rounded-xl border border-[#E6E2D3] flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-[#2A2723]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#2A2723]">
                  Direct Social Media Sharing
                </span>
              </div>
              <span className="text-[10px] text-[#7E7365] font-medium bg-white px-2 py-0.5 rounded-full border border-[#E6E2D3]">
                Share APIs
              </span>
            </div>

            <p className="text-[11px] text-[#7E7365] leading-relaxed">
              Instantly export and send your {template ? 'multi-frame film collage' : isVideo ? 'analog video' : 'film photograph'} directly to Instagram, TikTok, or your mobile share sheet.
            </p>

            {/* Social Share Action Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-2 gap-2.5 pt-1">
              {/* INSTAGRAM DIRECT SHARE */}
              <button
                type="button"
                disabled={isExporting || isSharing}
                onClick={() => handleShareInstagram('feed')}
                className="group relative flex flex-col items-start gap-1.5 p-3 rounded-xl bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#FCAF45] text-white shadow-md hover:shadow-lg active:scale-[0.98] transition-all cursor-pointer text-left overflow-hidden disabled:opacity-50"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="w-7 h-7 rounded-lg bg-white/20 backdrop-blur-xs flex items-center justify-center">
                    <Instagram className="w-4 h-4 text-white stroke-[2.2]" />
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-black/30 backdrop-blur-xs text-white">
                    Feed / Story
                  </span>
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1">
                    <span>Instagram</span>
                    <ExternalLink className="w-3 h-3 opacity-80 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <div className="text-[10px] text-white/80 leading-tight">
                    Share file & auto-copy tags
                  </div>
                </div>
              </button>

              {/* TIKTOK DIRECT SHARE */}
              <button
                type="button"
                disabled={isExporting || isSharing}
                onClick={handleShareTikTok}
                className="group relative flex flex-col items-start gap-1.5 p-3 rounded-xl bg-[#010101] hover:bg-neutral-900 border border-neutral-800 text-white shadow-md hover:shadow-lg active:scale-[0.98] transition-all cursor-pointer text-left overflow-hidden disabled:opacity-50"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="w-7 h-7 rounded-lg bg-neutral-800 flex items-center justify-center relative">
                    <div className="w-3.5 h-3.5 flex items-center justify-center">
                      <Film className="w-4 h-4 text-[#00f2fe] stroke-[2.2]" />
                    </div>
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-[#fe2c55]/20 text-[#fe2c55] border border-[#fe2c55]/40">
                    {isVideo ? 'Reel / Video' : 'Photo Post'}
                  </span>
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1">
                    <span>TikTok</span>
                    <ExternalLink className="w-3 h-3 opacity-80 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <div className="text-[10px] text-neutral-400 leading-tight">
                    Upload & copy #filmtok
                  </div>
                </div>
              </button>
            </div>

            {/* Quick Secondary Share Actions */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              {/* Universal Web Share Sheet */}
              <button
                type="button"
                disabled={isExporting || isSharing}
                onClick={handleNativeShare}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-[#F0EEE6] border border-[#E6E2D3] text-xs font-semibold text-[#2A2723] active:scale-95 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                title="Open system share sheet (AirDrop, Messages, WhatsApp, Pinterest)"
              >
                <Smartphone className="w-3.5 h-3.5 text-[#2A2723]" />
                <span>Device Share Sheet</span>
              </button>

              {/* Copy Image / Video to Clipboard */}
              {!isVideo ? (
                <button
                  type="button"
                  disabled={isExporting || isSharing}
                  onClick={handleCopyImageToClipboard}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-[#F0EEE6] border border-[#E6E2D3] text-xs font-semibold text-[#2A2723] active:scale-95 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                  title="Copy high-res image directly to clipboard"
                >
                  {imageCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Image Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-[#2A2723]" />
                      <span>Copy Image</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCopyCaption}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-[#F0EEE6] border border-[#E6E2D3] text-xs font-semibold text-[#2A2723] active:scale-95 transition-all cursor-pointer shadow-xs"
                  title="Copy film recipe caption & hashtags"
                >
                  {captionCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-[#2A2723]" />
                      <span>Copy Caption</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Caption & Hashtag Preview Accordion */}
            <div className="mt-1 pt-2 border-t border-[#E6E2D3]/60 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-[#2A2723] flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  Social Caption & Film Tags
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCaptionEditor(!showCaptionEditor)}
                    className="text-[10px] text-[#7E7365] hover:text-[#2A2723] underline cursor-pointer"
                  >
                    {showCaptionEditor ? 'Done Editing' : 'Edit Caption'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyCaption}
                    className="flex items-center gap-1 text-[10px] font-semibold text-[#2A2723] bg-white border border-[#E6E2D3] px-2 py-0.5 rounded-md hover:bg-[#F0EEE6] transition-colors cursor-pointer"
                  >
                    {captionCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{captionCopied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {showCaptionEditor ? (
                <textarea
                  value={customCaption}
                  onChange={(e) => setCustomCaption(e.target.value)}
                  rows={2}
                  className="w-full text-[11px] p-2 bg-white border border-[#E6E2D3] rounded-lg text-[#2A2723] focus:outline-hidden focus:ring-1 focus:ring-[#2A2723]"
                />
              ) : (
                <div
                  onClick={() => setShowCaptionEditor(true)}
                  className="text-[10px] text-[#7E7365] bg-white p-2 rounded-lg border border-[#E6E2D3]/70 font-mono truncate cursor-pointer hover:border-[#2A2723] transition-colors"
                  title="Click to customize caption"
                >
                  {customCaption}
                </div>
              )}
            </div>
          </div>

          {/* ========================================================= */}
          {/* 2. EXPORT FORMAT & QUALITY SETTINGS                      */}
          {/* ========================================================= */}
          {!isVideo ? (
            <div className="flex flex-col gap-3">
              {/* Photo Format Selector */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#2A2723]">
                    Output Format
                  </label>
                  <span className="text-[10px] text-[#7E7365]">
                    {photoFormat === 'image/jpeg' ? 'Best for Instagram / TikTok' : photoFormat === 'image/png' ? 'Lossless with transparency' : 'Ultra-compact web'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'image/jpeg', label: 'JPEG (Standard)' },
                    { id: 'image/png', label: 'PNG (Lossless)' },
                    { id: 'image/webp', label: 'WebP (Modern)' },
                  ].map((fmt) => (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => setPhotoFormat(fmt.id as any)}
                      className={`p-2.5 rounded-xl border text-center text-xs font-medium transition-all cursor-pointer ${
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
                  Resolution Scaling
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setScale(1)}
                    className={`p-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
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
                    className={`p-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                      scale === 1.5
                        ? 'bg-[#2A2723] border-[#2A2723] text-white shadow-xs'
                        : 'bg-[#FAF9F6] border-[#E6E2D3] text-[#7E7365] hover:text-[#2A2723]'
                    }`}
                  >
                    1.5x Ultra HD Editorial
                  </button>
                </div>
              </div>

              {/* Quality Slider */}
              {photoFormat !== 'image/png' && (
                <div className="flex flex-col gap-1.5 bg-[#FAF9F6] p-3 rounded-xl border border-[#E6E2D3]">
                  <div className="flex items-center justify-between text-xs text-[#2A2723]">
                    <span>Image Quality Compression</span>
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
                    className="w-full accent-[#2A2723] cursor-pointer"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="bg-[#FAF9F6] p-4 rounded-xl border border-[#E6E2D3] flex flex-col gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#2A2723]">
                <Film className="w-4 h-4 text-[#2A2723]" />
                <span>Real-Time WebGL Video Processing</span>
              </div>
              <p className="text-xs text-[#7E7365] leading-relaxed">
                Bakes analog film grain, halation, dust, and color grade across every video frame smoothly for TikTok, Reels, and YouTube Shorts.
              </p>
            </div>
          )}

          {/* Progress / Status Bar */}
          {isExporting && (
            <div className="bg-[#FAF9F6] p-4 rounded-xl border border-[#E6E2D3] flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs text-[#2A2723]">
                <span className="flex items-center gap-2 font-medium">
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
              <span className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                Render complete & ready!
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleShareInstagram('feed')}
                  className="flex items-center gap-1 text-xs text-white bg-gradient-to-r from-rose-500 to-purple-600 px-2.5 py-1 rounded-full font-medium shadow-xs hover:opacity-90 transition-opacity"
                >
                  <Instagram className="w-3 h-3" />
                  <span>Instagram</span>
                </button>
                <button
                  type="button"
                  onClick={handleShareTikTok}
                  className="flex items-center gap-1 text-xs text-white bg-black px-2.5 py-1 rounded-full font-medium shadow-xs hover:bg-neutral-800 transition-colors"
                >
                  <Film className="w-3 h-3" />
                  <span>TikTok</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Action Buttons */}
        <div className="px-5 py-3 border-t border-[#F0EEE6] bg-[#FAF9F6] flex items-center justify-between flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full text-xs text-[#7E7365] hover:text-[#2A2723] transition-colors cursor-pointer"
          >
            {exportComplete ? 'Close' : 'Cancel'}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isExporting || isSharing}
              onClick={handleExport}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#2A2723] text-white font-semibold text-xs disabled:opacity-50 shadow-xs hover:bg-black active:scale-95 transition-all cursor-pointer"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Rendering...</span>
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

